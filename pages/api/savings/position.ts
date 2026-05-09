import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { EULER_LENDING_CONTRACTS } from '../../../shared/contracts';
import { pool } from '../../../server/db';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const EVK_VAULT_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
];

interface HistoryRow {
  id: number;
  operation: string;
  deposit_amount_axusd: string;
  tx_hash: string | null;
  status: string;
  created_at: Date;
}

function getProvider(): ethers.JsonRpcProvider {
  const key = process.env.ALCHEMY_API_KEY;
  const url = key
    ? `https://arb-mainnet.g.alchemy.com/v2/${key}`
    : 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(url);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  if (!address || typeof address !== 'string' || !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const normalizedAddress = address.toLowerCase();
  const vaultAddress = EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT;
  const isDeployed = (vaultAddress as string) !== ZERO_ADDRESS;

  let onChainShares = '0';
  let onChainBalanceNum = 0;
  let onChainBalance = '0';

  if (isDeployed) {
    try {
      const provider = getProvider();
      const vault = new ethers.Contract(vaultAddress, EVK_VAULT_ABI, provider);
      const userShares = await vault.balanceOf(address).catch(() => 0n) as bigint;
      const userAssets = userShares > 0n
        ? await vault.convertToAssets(userShares).catch(() => 0n) as bigint
        : 0n;
      onChainShares = ethers.formatEther(userShares);
      onChainBalanceNum = parseFloat(ethers.formatEther(userAssets));
      onChainBalance = onChainBalanceNum.toFixed(6);
    } catch (err) {
      console.error('[savings/position] vault fetch error:', err);
    }
  }

  const client = await pool.connect();
  let depositHistory: Array<{
    id: number;
    operation: string;
    amount: string;
    balance: string;
    yieldEarned: string;
    txHash: string | null;
    status: string;
    date: Date;
  }> = [];
  let totalDeposited = 0;
  let totalWithdrawn = 0;

  try {
    const histResult = await client.query<HistoryRow>(
      `SELECT id, operation, deposit_amount_axusd, tx_hash, status, created_at
       FROM savings_positions
       WHERE wallet_address = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [normalizedAddress]
    );

    // Compute running balance forward (oldest → newest) for history display
    const rows = [...histResult.rows].reverse();
    let runningBalance = 0;
    const balanceMap = new Map<number, number>();
    for (const r of rows) {
      const amt = parseFloat(r.deposit_amount_axusd || '0');
      if (r.status === 'confirmed') {
        if (r.operation === 'deposit') runningBalance += amt;
        else if (r.operation === 'withdraw') runningBalance = Math.max(0, runningBalance - amt);
      }
      balanceMap.set(r.id, runningBalance);
    }

    depositHistory = histResult.rows.map(r => {
      const bal = balanceMap.get(r.id) ?? 0;
      return {
        id: r.id,
        operation: r.operation,
        amount: parseFloat(r.deposit_amount_axusd || '0').toFixed(6),
        balance: bal.toFixed(6),
        yieldEarned: '0.000000',
        txHash: r.tx_hash,
        status: r.status,
        date: r.created_at,
      };
    });

    const aggResult = await client.query<{ total_deposited: string; total_withdrawn: string }>(
      `SELECT
         COALESCE(SUM(CASE WHEN operation = 'deposit' THEN CAST(deposit_amount_axusd AS NUMERIC) ELSE 0 END), 0) AS total_deposited,
         COALESCE(SUM(CASE WHEN operation = 'withdraw' THEN CAST(deposit_amount_axusd AS NUMERIC) ELSE 0 END), 0) AS total_withdrawn
       FROM savings_positions
       WHERE wallet_address = $1 AND status = 'confirmed'`,
      [normalizedAddress]
    );
    const agg = aggResult.rows[0];
    totalDeposited = parseFloat(agg?.total_deposited ?? '0');
    totalWithdrawn = parseFloat(agg?.total_withdrawn ?? '0');
  } finally {
    client.release();
  }

  const netPrincipal = Math.max(0, totalDeposited - totalWithdrawn);
  const currentBalanceNum = isDeployed && onChainBalanceNum > 0
    ? onChainBalanceNum
    : netPrincipal;
  const yieldEarned = isDeployed && onChainBalanceNum > 0
    ? Math.max(0, onChainBalanceNum - netPrincipal)
    : 0;

  return res.status(200).json({
    success: true,
    address,
    currentBalanceAxusd: currentBalanceNum.toFixed(6),
    onChainBalanceAxusd: onChainBalance,
    onChainShares,
    totalDepositedAxusd: totalDeposited.toFixed(6),
    totalWithdrawnAxusd: totalWithdrawn.toFixed(6),
    yieldEarnedAxusd: yieldEarned.toFixed(6),
    hasPosition: currentBalanceNum > 0 || depositHistory.length > 0,
    depositHistory,
    vaultAddress: isDeployed ? vaultAddress : null,
    timestamp: new Date().toISOString(),
  });
}
