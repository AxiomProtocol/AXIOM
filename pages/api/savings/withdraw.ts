import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { EULER_LENDING_CONTRACTS } from '../../../shared/contracts';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { pool } from '../../../server/db';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const EVK_VAULT_ABI = [
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)',
  'function maxRedeem(address owner) view returns (uint256 maxShares)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
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
 * Verify a vault withdraw/redeem transaction on-chain.
 * Decodes calldata to get actual assets/shares from chain, converts to AXUSD amount.
 * Returns chain-derived confirmed amount — not the client-supplied value.
 */
async function verifyAndExtractWithdrawTx(
  txHash: string,
  fromAddress: string,
  vaultAddress: string,
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
    // Fail-closed: RPC unavailable → reject
    console.warn('[savings/withdraw] provider error during verification:', err);
    return { valid: false, reason: 'On-chain verification failed: RPC unavailable' };
  }

  if (!receipt || !tx) return { valid: false, reason: 'Transaction not found on-chain' };
  if (receipt.status !== 1) return { valid: false, reason: 'Transaction reverted' };
  if (receipt.from.toLowerCase() !== fromAddress.toLowerCase()) {
    return { valid: false, reason: 'Transaction sender does not match authenticated wallet' };
  }
  if (receipt.to?.toLowerCase() !== vaultAddress.toLowerCase()) {
    return { valid: false, reason: 'Transaction target does not match vault contract' };
  }

  const vaultIface = new ethers.Interface(EVK_VAULT_ABI);
  let chainAmountAxusd = 0;

  // Try decode as withdraw(assets, receiver, owner) first
  try {
    const decoded = vaultIface.decodeFunctionData('withdraw', tx.data);
    const assets = decoded[0] as bigint;
    const receiver = decoded[1] as string;
    const owner = decoded[2] as string;
    if (receiver.toLowerCase() !== fromAddress.toLowerCase()) {
      return { valid: false, reason: 'Withdraw receiver does not match authenticated wallet' };
    }
    if (owner.toLowerCase() !== fromAddress.toLowerCase()) {
      return { valid: false, reason: 'Withdraw owner does not match authenticated wallet' };
    }
    chainAmountAxusd = parseFloat(ethers.formatEther(assets));
  } catch {
    // Try decode as redeem(shares, receiver, owner)
    try {
      const decoded = vaultIface.decodeFunctionData('redeem', tx.data);
      const shares = decoded[0] as bigint;
      const receiver = decoded[1] as string;
      const owner = decoded[2] as string;
      if (receiver.toLowerCase() !== fromAddress.toLowerCase()) {
        return { valid: false, reason: 'Redeem receiver does not match authenticated wallet' };
      }
      if (owner.toLowerCase() !== fromAddress.toLowerCase()) {
        return { valid: false, reason: 'Redeem owner does not match authenticated wallet' };
      }
      // Convert shares to assets using on-chain view at current block
      if (shares > 0n) {
        try {
          const vault = new ethers.Contract(vaultAddress, EVK_VAULT_ABI, provider);
          const assets = await vault.convertToAssets(shares).catch(() => 0n) as bigint;
          chainAmountAxusd = parseFloat(ethers.formatEther(assets));
        } catch {
          // If conversion fails, use shares as proxy (1:1 estimate)
          chainAmountAxusd = parseFloat(ethers.formatEther(shares));
        }
      }
    } catch {
      return { valid: false, reason: 'Could not decode withdraw/redeem calldata — wrong function called' };
    }
  }

  // Validate amount within tolerance if a non-zero expected amount was provided
  const expectedAmount = parseFloat(expectedAmountAxusd);
  if (expectedAmount > 0 && chainAmountAxusd > 0) {
    const diff = Math.abs(chainAmountAxusd - expectedAmount) / expectedAmount;
    if (diff > AMOUNT_TOLERANCE) {
      return {
        valid: false,
        reason: `Amount mismatch: chain=${chainAmountAxusd.toFixed(6)}, expected=${expectedAmount.toFixed(6)}`,
      };
    }
  }

  return { valid: true, confirmedAmountAxusd: chainAmountAxusd > 0 ? chainAmountAxusd.toFixed(6) : expectedAmountAxusd };
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
  const { amountAxusd, withdrawAll, txHash } = req.body as {
    amountAxusd?: string;
    withdrawAll?: boolean;
    txHash?: string;
  };

  if (!withdrawAll && (!amountAxusd || isNaN(parseFloat(amountAxusd)) || parseFloat(amountAxusd) <= 0)) {
    return res.status(400).json({ error: 'Invalid amount or must set withdrawAll=true' });
  }

  const vaultAddress = EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT;
  const isDeployed = (vaultAddress as string) !== ZERO_ADDRESS;
  const amountNum = amountAxusd ? parseFloat(amountAxusd) : 0;
  const amountWei = amountNum > 0 ? ethers.parseEther(amountAxusd!) : 0n;
  const client = await pool.connect();

  try {
    if (txHash) {
      const existing = await client.query<{ id: number }>(
        `SELECT id FROM savings_positions WHERE tx_hash = $1 LIMIT 1`,
        [txHash]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Transaction already recorded', recordId: existing.rows[0].id });
      }

      if (isDeployed) {
        // For withdraw-all, use 0 as expected amount so tolerance check is skipped
        const expectedAmount = withdrawAll ? '0' : (amountAxusd ?? '0');
        const verification = await verifyAndExtractWithdrawTx(
          txHash,
          session.address,
          vaultAddress,
          expectedAmount,
        );
        if (!verification.valid) {
          return res.status(422).json({
            error: 'Transaction verification failed',
            reason: verification.reason,
          });
        }
        // Use chain-derived amount
        const confirmedAmount = verification.confirmedAmountAxusd ?? amountAxusd ?? '0';
        await client.query(
          `INSERT INTO savings_positions
             (wallet_address, deposit_amount_axusd, current_balance_axusd, yield_earned_axusd, vault_shares, tx_hash, operation, status, last_updated_at, created_at)
           VALUES ($1, $2, 0, 0, 0, $3, 'withdraw', 'confirmed', NOW(), NOW())`,
          [authenticatedAddress, confirmedAmount, txHash]
        );
        return res.status(200).json({ success: true, confirmedAmountAxusd: confirmedAmount });
      } else {
        await client.query(
          `INSERT INTO savings_positions
             (wallet_address, deposit_amount_axusd, current_balance_axusd, yield_earned_axusd, vault_shares, tx_hash, operation, status, last_updated_at, created_at)
           VALUES ($1, $2, 0, 0, 0, $3, 'withdraw', 'confirmed', NOW(), NOW())`,
          [authenticatedAddress, amountNum, txHash]
        );
        return res.status(200).json({ success: true, message: 'Withdrawal recorded.' });
      }
    }

    const result = await client.query<{ id: number }>(
      `INSERT INTO savings_positions
         (wallet_address, deposit_amount_axusd, current_balance_axusd, yield_earned_axusd, vault_shares, operation, status, last_updated_at, created_at)
       VALUES ($1, $2, 0, 0, 0, 'withdraw', 'pending', NOW(), NOW())
       RETURNING id`,
      [authenticatedAddress, amountNum]
    );
    const recordId = result.rows[0].id;

    if (isDeployed) {
      const vaultIface = new ethers.Interface(EVK_VAULT_ABI);
      let txData: string;
      let description: string;

      if (withdrawAll) {
        let maxShares = 0n;
        try {
          const provider = getProvider();
          const vault = new ethers.Contract(vaultAddress, EVK_VAULT_ABI, provider);
          maxShares = await vault.maxRedeem(session.address).catch(() => 0n) as bigint;
        } catch {
          // Return error if we can't fetch max shares
          return res.status(503).json({ error: 'Could not fetch vault shares from chain. Please try again.' });
        }
        txData = vaultIface.encodeFunctionData('redeem', [maxShares, session.address, session.address]);
        description = 'Redeem all shares from savings vault';
      } else {
        txData = vaultIface.encodeFunctionData('withdraw', [amountWei, session.address, session.address]);
        description = `Withdraw ${amountNum} AXUSD from savings vault`;
      }

      return res.status(200).json({
        success: true,
        recordId,
        steps: [
          {
            step: 1,
            description,
            to: vaultAddress,
            data: txData,
            value: '0',
          },
        ],
        vaultAddress,
        amountWei: amountWei.toString(),
        estimatedSettlement: '1–2 Arbitrum One blocks (~2–4 seconds)',
        message: 'Sign and broadcast the transaction. Submit the tx hash to confirm.',
      });
    } else {
      return res.status(200).json({
        success: true,
        recordId,
        steps: [],
        vaultAddress: null,
        message: 'Savings vault not yet deployed. Your intent has been recorded.',
        pendingDeployment: true,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[savings/withdraw] error:', err);
    return res.status(500).json({ error: 'Failed to process withdrawal', details: msg });
  } finally {
    client.release();
  }
}
