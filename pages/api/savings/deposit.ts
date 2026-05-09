import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { EULER_LENDING_CONTRACTS } from '../../../shared/contracts';
import { ERC3643_CONTRACTS } from '../../../shared/contracts-3643';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { pool } from '../../../server/db';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
];

const EVK_VAULT_DEPOSIT_ABI = [
  'function deposit(uint256 assets, address receiver) returns (uint256 shares)',
];

// 10% tolerance for amount matching
const AMOUNT_TOLERANCE = 0.10;

function getProvider(): ethers.JsonRpcProvider {
  const key = process.env.ALCHEMY_API_KEY;
  const url = key
    ? `https://arb-mainnet.g.alchemy.com/v2/${key}`
    : 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(url);
}

interface VerifyResult {
  valid: boolean;
  reason?: string;
  confirmedAmountAxusd?: string;
}

/**
 * Verify a deposit-vault transaction on-chain.
 * Decodes calldata to extract actual amount and receiver from the vault deposit() call.
 * Returns the chain-derived confirmed amount — not the client-supplied value.
 */
async function verifyAndExtractDepositTx(
  txHash: string,
  fromAddress: string,
  vaultAddress: string,
  axusdAddress: string,
  expectedAmountAxusd: string,
): Promise<VerifyResult> {
  const provider = getProvider();
  let receipt: ethers.TransactionReceipt | null;
  let tx: ethers.TransactionResponse | null;

  try {
    [receipt, tx] = await Promise.all([
      provider.getTransactionReceipt(txHash),
      provider.getTransaction(txHash),
    ]);
  } catch (err) {
    // Fail-closed: if chain is unreachable, reject
    console.warn('[savings/deposit] provider error during verification:', err);
    return { valid: false, reason: 'On-chain verification failed: RPC unavailable' };
  }

  if (!receipt || !tx) return { valid: false, reason: 'Transaction not found on-chain' };
  if (receipt.status !== 1) return { valid: false, reason: 'Transaction reverted' };
  if (receipt.from.toLowerCase() !== fromAddress.toLowerCase()) {
    return { valid: false, reason: 'Transaction sender does not match authenticated wallet' };
  }

  const to = (receipt.to ?? '').toLowerCase();
  const vaultLower = vaultAddress.toLowerCase();
  const axusdLower = axusdAddress.toLowerCase();

  // Only accept txs to vault (deposit) or token (approve) — and vault tx is required
  if (to !== vaultLower && to !== axusdLower) {
    return { valid: false, reason: 'Transaction target does not match vault or token contract' };
  }

  // For approve txs, we don't record an amount — caller should submit the vault deposit tx
  if (to === axusdLower) {
    return { valid: false, reason: 'Submit the vault deposit transaction (step 2), not the approve' };
  }

  // Decode the vault deposit calldata to get actual amount and receiver
  const vaultIface = new ethers.Interface(EVK_VAULT_DEPOSIT_ABI);
  let decodedAmount: bigint;
  let decodedReceiver: string;
  try {
    const decoded = vaultIface.decodeFunctionData('deposit', tx.data);
    decodedAmount = decoded[0] as bigint;
    decodedReceiver = decoded[1] as string;
  } catch {
    return { valid: false, reason: 'Could not decode deposit calldata — wrong function called' };
  }

  // Receiver must be the authenticated wallet
  if (decodedReceiver.toLowerCase() !== fromAddress.toLowerCase()) {
    return { valid: false, reason: 'Deposit receiver does not match authenticated wallet' };
  }

  const chainAmountAxusd = parseFloat(ethers.formatEther(decodedAmount));
  const expectedAmount = parseFloat(expectedAmountAxusd);

  // Validate amount within tolerance
  if (expectedAmount > 0) {
    const diff = Math.abs(chainAmountAxusd - expectedAmount) / expectedAmount;
    if (diff > AMOUNT_TOLERANCE) {
      return {
        valid: false,
        reason: `Amount mismatch: chain=${chainAmountAxusd.toFixed(6)}, expected=${expectedAmount.toFixed(6)}`,
      };
    }
  }

  return { valid: true, confirmedAmountAxusd: chainAmountAxusd.toFixed(6) };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({
      error: 'Wallet authentication required.',
      code: 'SIWE_AUTH_REQUIRED',
    });
  }

  const authenticatedAddress = session.address.toLowerCase();
  const { amountAxusd, txHash } = req.body as { amountAxusd: string; txHash?: string };

  if (!amountAxusd || isNaN(parseFloat(amountAxusd)) || parseFloat(amountAxusd) <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const vaultAddress = EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT;
  const axusdAddress = ERC3643_CONTRACTS.AXUSD_TOKEN;
  const isDeployed = (vaultAddress as string) !== ZERO_ADDRESS;
  const amountWei = ethers.parseEther(amountAxusd);
  const client = await pool.connect();

  try {
    if (txHash) {
      // Deduplicate first
      const existing = await client.query<{ id: number }>(
        `SELECT id FROM savings_positions WHERE tx_hash = $1 LIMIT 1`,
        [txHash]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Transaction already recorded', recordId: existing.rows[0].id });
      }

      if (isDeployed) {
        const verification = await verifyAndExtractDepositTx(
          txHash,
          session.address,
          vaultAddress,
          axusdAddress,
          amountAxusd,
        );
        if (!verification.valid) {
          return res.status(422).json({
            error: 'Transaction verification failed',
            reason: verification.reason,
          });
        }
        // Use chain-derived amount, not client-supplied
        const confirmedAmount = verification.confirmedAmountAxusd ?? amountAxusd;
        const result = await client.query<{ id: number }>(
          `INSERT INTO savings_positions
             (wallet_address, deposit_amount_axusd, current_balance_axusd, yield_earned_axusd, vault_shares, tx_hash, operation, status, last_updated_at, created_at)
           VALUES ($1, $2, 0, 0, 0, $3, 'deposit', 'confirmed', NOW(), NOW())
           RETURNING id`,
          [authenticatedAddress, confirmedAmount, txHash]
        );
        return res.status(200).json({ success: true, recordId: result.rows[0].id, confirmedAmountAxusd: confirmedAmount });
      } else {
        // Vault not deployed — record at face value (no on-chain to verify)
        const result = await client.query<{ id: number }>(
          `INSERT INTO savings_positions
             (wallet_address, deposit_amount_axusd, current_balance_axusd, yield_earned_axusd, vault_shares, tx_hash, operation, status, last_updated_at, created_at)
           VALUES ($1, $2, 0, 0, 0, $3, 'deposit', 'confirmed', NOW(), NOW())
           RETURNING id`,
          [authenticatedAddress, parseFloat(amountAxusd), txHash]
        );
        return res.status(200).json({ success: true, recordId: result.rows[0].id, message: 'Deposit recorded.' });
      }
    }

    // Record pending intent
    const result = await client.query<{ id: number }>(
      `INSERT INTO savings_positions
         (wallet_address, deposit_amount_axusd, current_balance_axusd, yield_earned_axusd, vault_shares, operation, status, last_updated_at, created_at)
       VALUES ($1, $2, 0, 0, 0, 'deposit', 'pending', NOW(), NOW())
       RETURNING id`,
      [authenticatedAddress, parseFloat(amountAxusd)]
    );
    const recordId = result.rows[0].id;

    if (isDeployed) {
      const erc20Iface = new ethers.Interface(ERC20_ABI);
      const approveTxData = erc20Iface.encodeFunctionData('approve', [vaultAddress, amountWei]);

      const vaultIface = new ethers.Interface(EVK_VAULT_DEPOSIT_ABI);
      const depositTxData = vaultIface.encodeFunctionData('deposit', [amountWei, session.address]);

      return res.status(200).json({
        success: true,
        recordId,
        steps: [
          {
            step: 1,
            description: 'Approve AXUSD for vault',
            to: axusdAddress,
            data: approveTxData,
            value: '0',
          },
          {
            step: 2,
            description: 'Deposit AXUSD into savings vault',
            to: vaultAddress,
            data: depositTxData,
            value: '0',
          },
        ],
        vaultAddress,
        axusdAddress,
        amountWei: amountWei.toString(),
        message: 'Execute both transactions in order. Submit the vault deposit tx hash to confirm.',
      });
    } else {
      return res.status(200).json({
        success: true,
        recordId,
        steps: [],
        vaultAddress: null,
        axusdAddress,
        amountWei: amountWei.toString(),
        message: 'Savings vault not yet deployed. Your intent has been recorded.',
        pendingDeployment: true,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[savings/deposit] error:', err);
    return res.status(500).json({ error: 'Failed to process deposit', details: msg });
  } finally {
    client.release();
  }
}
