import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { ethers } from 'ethers';
import { REALESTATE_LENDING_CONTRACTS, STABLECOIN_CONTRACTS } from '../../../../shared/contracts';

// Direct pool connection to bypass schema import issues
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DSCR_VAULT_ABI = [
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function lockedForLoans() view returns (uint256)"
];

const DSCR_MANAGER_ABI = [
  "function totalOriginated() view returns (uint256)",
  "function totalRepaid() view returns (uint256)",
  "function activeLoans() view returns (uint256)",
  "function totalInterestCollected() view returns (uint256)"
];

async function getOnChainMetrics() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
    
    const vault = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
      DSCR_VAULT_ABI,
      provider
    );

    const manager = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.DSCR_LOAN_MANAGER,
      DSCR_MANAGER_ABI,
      provider
    );

    const [
      totalAssets,
      totalSupply,
      lockedForLoans,
      totalOriginated,
      totalRepaid,
      activeLoans,
      totalInterestCollected
    ] = await Promise.all([
      vault.totalAssets(),
      vault.totalSupply(),
      vault.lockedForLoans().catch(() => BigInt(0)),
      manager.totalOriginated(),
      manager.totalRepaid(),
      manager.activeLoans(),
      manager.totalInterestCollected()
    ]);

    const availableLiquidity = totalAssets - lockedForLoans;

    return {
      vault: {
        totalAssets: ethers.formatUnits(totalAssets, 18),
        totalSupply: ethers.formatUnits(totalSupply, 18),
        lockedForLoans: ethers.formatUnits(lockedForLoans, 18),
        availableLiquidity: ethers.formatUnits(availableLiquidity, 18),
        utilizationRate: totalAssets > 0 
          ? Number(lockedForLoans * BigInt(10000) / totalAssets) / 100 
          : 0
      },
      portfolio: {
        totalOriginated: ethers.formatUnits(totalOriginated, 18),
        totalRepaid: ethers.formatUnits(totalRepaid, 18),
        activeLoans: Number(activeLoans),
        totalInterestCollected: ethers.formatUnits(totalInterestCollected, 18)
      }
    };
  } catch (error) {
    console.error('On-chain metrics error:', error);
    return {
      vault: {
        totalAssets: '0',
        totalSupply: '0',
        lockedForLoans: '0',
        availableLiquidity: '0',
        utilizationRate: 0
      },
      portfolio: {
        totalOriginated: '0',
        totalRepaid: '0',
        activeLoans: 0,
        totalInterestCollected: '0'
      }
    };
  }
}

async function getInvestorPosition(walletAddress: string) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
    
    const vault = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
      DSCR_VAULT_ABI,
      provider
    );

    const shares = await vault.balanceOf(walletAddress);
    const assets = await vault.convertToAssets(shares);
    const totalSupply = await vault.totalSupply();

    const ownershipPct = totalSupply > 0 
      ? Number(shares * BigInt(10000) / totalSupply) / 100 
      : 0;

    return {
      shares: ethers.formatUnits(shares, 18),
      assets: ethers.formatUnits(assets, 18),
      ownershipPct
    };
  } catch (error) {
    console.error('Investor position error:', error);
    return { shares: '0', assets: '0', ownershipPct: 0 };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet } = req.query;

    const onChainMetrics = await getOnChainMetrics();

    // Use raw SQL queries instead of Drizzle ORM to avoid schema import issues
    const applicationsResult = await pool.query(`
      SELECT status, tier, loan_amount_requested, dscr_bps, ltv_bps, monthly_payment
      FROM dscr_applications
      WHERE status = 'funded'
    `);
    const applications = applicationsResult.rows;

    const loanBook = {
      funded: applications.length,
      totalFunded: applications.reduce((sum: number, a: any) => sum + parseFloat(a.loan_amount_requested || '0'), 0),
      avgDscr: applications.length > 0 
        ? applications.reduce((sum: number, a: any) => sum + (a.dscr_bps || 0), 0) / applications.length / 100 
        : 0,
      avgLtv: applications.length > 0 
        ? applications.reduce((sum: number, a: any) => sum + (a.ltv_bps || 0), 0) / applications.length / 10000 
        : 0,
      monthlyPayments: applications.reduce((sum: number, a: any) => sum + parseFloat(a.monthly_payment || '0'), 0),
      tierDistribution: {
        low: applications.filter((a: any) => a.tier === 'low').length,
        standard: applications.filter((a: any) => a.tier === 'standard').length,
        yield: applications.filter((a: any) => a.tier === 'yield').length
      }
    };

    const commitmentResult = await pool.query(`
      SELECT count(*) as count, coalesce(sum(commitment_amount::decimal), 0) as total
      FROM investor_commitments
      WHERE status = 'soft_commit'
    `);
    const commitmentStats = commitmentResult.rows;

    let investorPosition = null;
    let investorCommitmentHistory = null;

    if (wallet && typeof wallet === 'string') {
      investorPosition = await getInvestorPosition(wallet);
      
      const historyResult = await pool.query(`
        SELECT * FROM investor_commitments
        WHERE wallet_address = $1
        ORDER BY created_at DESC
      `, [wallet]);
      // Map snake_case columns to camelCase for frontend compatibility
      investorCommitmentHistory = historyResult.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        walletAddress: row.wallet_address,
        isAccredited: row.is_accredited,
        commitmentAmount: row.commitment_amount,
        tierPreference: row.tier_preference,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at
      }));
    }

    const realizedCashflows = {
      interestCollected: parseFloat(onChainMetrics.portfolio.totalInterestCollected),
      principalRepaid: parseFloat(onChainMetrics.portfolio.totalRepaid),
      netIncome: parseFloat(onChainMetrics.portfolio.totalInterestCollected),
      note: 'Realized returns from actual loan performance. No projected or promised yields.'
    };

    const riskMetrics = {
      portfolioLtv: loanBook.avgLtv,
      portfolioDscr: loanBook.avgDscr,
      concentrationByTier: loanBook.tierDistribution,
      utilizationRate: onChainMetrics.vault.utilizationRate
    };

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      onChain: onChainMetrics,
      loanBook,
      cashflows: realizedCashflows,
      risk: riskMetrics,
      pipeline: {
        softCommitments: Number(commitmentStats[0]?.count || 0),
        totalCommitted: Number(commitmentStats[0]?.total || 0)
      },
      investorPosition,
      investorCommitments: investorCommitmentHistory,
      contracts: {
        vault: REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
        manager: REALESTATE_LENDING_CONTRACTS.DSCR_LOAN_MANAGER,
        network: 'Arbitrum One',
        chainId: 42161
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard data' });
  }
}
