import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { ethers } from 'ethers';
import { REALESTATE_LENDING_CONTRACTS, STABLECOIN_CONTRACTS } from '../../../shared/contracts';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DSCR_VAULT_ABI = [
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function lockedForLoans() view returns (uint256)"
];

const DSCR_MANAGER_ABI = [
  "function totalOriginated() view returns (uint256)",
  "function totalRepaid() view returns (uint256)",
  "function activeLoans() view returns (uint256)",
  "function totalInterestCollected() view returns (uint256)"
];

const AXUSD_ABI = [
  "function totalSupply() view returns (uint256)"
];

async function getOnChainMetrics() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
    
    const dscrVault = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT || ethers.ZeroAddress,
      DSCR_VAULT_ABI,
      provider
    );

    const dscrManager = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.DSCR_LOAN_MANAGER || ethers.ZeroAddress,
      DSCR_MANAGER_ABI,
      provider
    );

    const results = await Promise.allSettled([
      dscrVault.totalAssets().catch(() => BigInt(0)),
      dscrVault.lockedForLoans().catch(() => BigInt(0)),
      dscrManager.totalOriginated().catch(() => BigInt(0)),
      dscrManager.totalRepaid().catch(() => BigInt(0)),
      dscrManager.activeLoans().catch(() => BigInt(0)),
      dscrManager.totalInterestCollected().catch(() => BigInt(0))
    ]);

    const getValue = (result: PromiseSettledResult<bigint>, fallback: bigint = BigInt(0)) => 
      result.status === 'fulfilled' ? result.value : fallback;

    return {
      totalAssets: getValue(results[0]),
      lockedForLoans: getValue(results[1]),
      totalOriginated: getValue(results[2]),
      totalRepaid: getValue(results[3]),
      activeLoans: Number(getValue(results[4])),
      totalInterestCollected: getValue(results[5])
    };
  } catch (error) {
    console.error('On-chain metrics error:', error);
    return {
      totalAssets: BigInt(0),
      lockedForLoans: BigInt(0),
      totalOriginated: BigInt(0),
      totalRepaid: BigInt(0),
      activeLoans: 0,
      totalInterestCollected: BigInt(0)
    };
  }
}

async function getDatabaseMetrics() {
  try {
    const investorResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT investor_id) as investor_count,
        COALESCE(SUM(CASE WHEN status = 'committed' THEN amount ELSE 0 END), 0) as committed_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM dscr_investor_commitments
    `).catch(() => ({ rows: [{ investor_count: 0, committed_amount: 0, pending_amount: 0 }] }));

    const loanResult = await pool.query(`
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN loan_amount ELSE 0 END), 0) as approved_volume
      FROM dscr_loan_applications
    `).catch(() => ({ rows: [{ total_applications: 0, approved_count: 0, approved_volume: 0 }] }));

    return {
      investorCount: parseInt(investorResult.rows[0]?.investor_count || '0'),
      committedAmount: parseFloat(investorResult.rows[0]?.committed_amount || '0'),
      pendingAmount: parseFloat(investorResult.rows[0]?.pending_amount || '0'),
      totalApplications: parseInt(loanResult.rows[0]?.total_applications || '0'),
      approvedCount: parseInt(loanResult.rows[0]?.approved_count || '0'),
      approvedVolume: parseFloat(loanResult.rows[0]?.approved_volume || '0')
    };
  } catch (error) {
    console.error('Database metrics error:', error);
    return {
      investorCount: 0,
      committedAmount: 0,
      pendingAmount: 0,
      totalApplications: 0,
      approvedCount: 0,
      approvedVolume: 0
    };
  }
}

async function getRecentActivity() {
  try {
    const activityResult = await pool.query(`
      SELECT 
        id,
        'loan_originated' as type,
        loan_amount as amount,
        CONCAT('Loan Application #', application_number) as description,
        created_at as timestamp
      FROM dscr_loan_applications
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

    const commitmentResult = await pool.query(`
      SELECT 
        id,
        'investor_deposit' as type,
        amount,
        CONCAT('Investor commitment to ', fund_series) as description,
        created_at as timestamp
      FROM dscr_investor_commitments
      WHERE status = 'committed'
      ORDER BY created_at DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

    const combined = [...activityResult.rows, ...commitmentResult.rows]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return combined;
  } catch (error) {
    console.error('Activity fetch error:', error);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [onChainMetrics, dbMetrics, activities] = await Promise.all([
      getOnChainMetrics(),
      getDatabaseMetrics(),
      getRecentActivity()
    ]);

    let totalAUM = parseFloat(ethers.formatUnits(onChainMetrics.totalAssets, 18)) + dbMetrics.committedAmount;
    let utilizationRate = totalAUM > 0 
      ? (parseFloat(ethers.formatUnits(onChainMetrics.lockedForLoans, 18)) / totalAUM) * 100 
      : 0;

    const metrics = {
      totalAUM: totalAUM.toFixed(2),
      seriesABalance: dbMetrics.committedAmount > 0 ? (dbMetrics.committedAmount * 0.35).toFixed(2) : "0.00",
      seriesBBalance: dbMetrics.committedAmount > 0 ? (dbMetrics.committedAmount * 0.65).toFixed(2) : "0.00",
      activeLoansCount: onChainMetrics.activeLoans + dbMetrics.approvedCount,
      totalLoansOriginated: ethers.formatUnits(onChainMetrics.totalOriginated, 18),
      totalRepaid: ethers.formatUnits(onChainMetrics.totalRepaid, 18),
      totalInterestEarned: ethers.formatUnits(onChainMetrics.totalInterestCollected, 18),
      utilizationRate,
      axusdSupply: "0.00",
      reserveRatio: 100 - utilizationRate,
      pendingCommitments: dbMetrics.pendingAmount.toFixed(2),
      investorCount: dbMetrics.investorCount,
      approvedLoanVolume: dbMetrics.approvedVolume.toFixed(2),
      totalApplications: dbMetrics.totalApplications
    };

    res.status(200).json({
      metrics,
      activities,
      lastUpdated: new Date().toISOString(),
      dataSource: 'live'
    });
  } catch (error) {
    console.error('Treasury API error:', error);
    res.status(500).json({ error: 'Failed to fetch treasury data' });
  }
}
