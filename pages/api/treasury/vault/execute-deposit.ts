import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { db } from '../../../../server/db';
import { treasuryVaultEvents } from '../../../../shared/treasuryVaultSchema';
import { readOperatorCookie, isValidOperatorKey } from '../../../../lib/capinfra/operatorAuth';

const USDC_ADDRESS  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXUSD_ADDRESS = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const ACCEPTED_ASSETS = ['USDC', 'AXUSD'] as const;
type AcceptedAsset = typeof ACCEPTED_ASSETS[number];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const VAULT_ABI = [
  'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
  'function depositToken(address asset, uint256 amount) external',
  'function paused() view returns (bool)',
];

export interface ExecuteDepositRequest {
  asset: AcceptedAsset;
  amount: string;
}

export interface ExecuteDepositResponse {
  success: boolean;
  approveTx?: string;
  depositTx?: string;
  deployerAddress?: string;
  amountRaw?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExecuteDepositResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const cookie = readOperatorCookie(req);
  if (!isValidOperatorKey(cookie)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { asset, amount } = req.body as ExecuteDepositRequest;

  if (!ACCEPTED_ASSETS.includes(asset as AcceptedAsset)) {
    return res.status(400).json({ success: false, error: `asset must be one of: ${ACCEPTED_ASSETS.join(', ')}` });
  }

  const amtNum = parseFloat(amount);
  if (!isFinite(amtNum) || amtNum <= 0) {
    return res.status(400).json({ success: false, error: 'amount must be a positive number' });
  }

  const deployerKey  = process.env.DEPLOYER_PRIVATE_KEY;
  const alchemyKey   = process.env.ALCHEMY_API_KEY;
  const vaultAddress = process.env.AXIOM_TREASURY_VAULT_ADDRESS;

  if (!deployerKey) return res.status(500).json({ success: false, error: 'DEPLOYER_PRIVATE_KEY not configured' });
  if (!alchemyKey)  return res.status(500).json({ success: false, error: 'ALCHEMY_API_KEY not configured' });
  if (!vaultAddress) return res.status(500).json({ success: false, error: 'AXIOM_TREASURY_VAULT_ADDRESS not configured' });

  const rpcUrl  = `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet   = new ethers.Wallet(deployerKey, provider);

  const tokenAddress = asset === 'USDC' ? USDC_ADDRESS : AXUSD_ADDRESS;
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, wallet);

  try {
    // ── Check vault paused ──────────────────────────────────────────────────
    const isPaused = await vault.paused().catch(() => false);
    if (isPaused) {
      return res.status(400).json({ success: false, error: 'Vault is currently paused — deposit rejected.' });
    }

    // ── Check deployer balance ──────────────────────────────────────────────
    const decimals: number = await token.decimals();
    const rawAmt   = ethers.parseUnits(amount, decimals);
    const balance  = await token.balanceOf(wallet.address);

    if (balance < rawAmt) {
      const have = ethers.formatUnits(balance, decimals);
      return res.status(400).json({
        success: false,
        error: `Deployer wallet has insufficient ${asset}. Balance: ${have} ${asset}, requested: ${amount} ${asset}`,
      });
    }

    // ── Check ETH for gas ──────────────────────────────────────────────────
    const ethBalance = await provider.getBalance(wallet.address);
    if (ethBalance < ethers.parseEther('0.001')) {
      return res.status(400).json({
        success: false,
        error: `Deployer wallet has insufficient ETH for gas. Balance: ${ethers.formatEther(ethBalance)} ETH`,
      });
    }

    // ── Step 1: Approve ─────────────────────────────────────────────────────
    let approveTxHash: string | undefined;
    const allowance: bigint = await token.allowance(wallet.address, vaultAddress);
    if (allowance < rawAmt) {
      console.log(`[execute-deposit] Approving ${amount} ${asset} for vault…`);
      const approveTx = await token.approve(vaultAddress, rawAmt);
      const approveReceipt = await approveTx.wait(1);
      approveTxHash = approveReceipt?.hash ?? approveTx.hash;
      console.log(`[execute-deposit] Approve confirmed: ${approveTxHash}`);
    } else {
      console.log(`[execute-deposit] Allowance already sufficient — skipping approve`);
    }

    // ── Step 2: Deposit ─────────────────────────────────────────────────────
    let depositTxHash: string;
    if (asset === 'USDC') {
      console.log(`[execute-deposit] Calling vault.deposit(${rawAmt}, ${wallet.address})…`);
      const depositTx = await vault.deposit(rawAmt, wallet.address);
      const depositReceipt = await depositTx.wait(1);
      depositTxHash = depositReceipt?.hash ?? depositTx.hash;
    } else {
      console.log(`[execute-deposit] Calling vault.depositToken(${tokenAddress}, ${rawAmt})…`);
      const depositTx = await vault.depositToken(tokenAddress, rawAmt);
      const depositReceipt = await depositTx.wait(1);
      depositTxHash = depositReceipt?.hash ?? depositTx.hash;
    }
    console.log(`[execute-deposit] Deposit confirmed: ${depositTxHash}`);

    // ── Step 3: Record in audit log ─────────────────────────────────────────
    try {
      await db.insert(treasuryVaultEvents).values({
        eventType:   'deposit',
        strategy:    asset === 'USDC' ? null : asset,
        amountUsd:   String(amtNum.toFixed(6)),
        txHash:      depositTxHash,
        logIndex:    -1,
        blockNumber: null,
      }).onConflictDoNothing();
    } catch (dbErr) {
      console.warn('[execute-deposit] DB record failed (non-fatal):', dbErr);
    }

    return res.status(200).json({
      success: true,
      approveTx: approveTxHash,
      depositTx: depositTxHash,
      deployerAddress: wallet.address,
      amountRaw: rawAmt.toString(),
    });

  } catch (err: unknown) {
    const e = err as { message?: string; reason?: string; code?: string };
    const reason = e?.reason ?? e?.message ?? 'Unknown error';
    console.error('[execute-deposit] Error:', reason);
    return res.status(500).json({ success: false, error: reason });
  }
}
