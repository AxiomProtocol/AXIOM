import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { investorCommitments, dscrApplications, fundSubscriptions, accreditedInvestors } from '../../../../shared/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { ethers } from 'ethers';
import { REALESTATE_LENDING_CONTRACTS, STABLECOIN_CONTRACTS } from '../../../../shared/contracts';

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

    let applications: any[] = [];
    try {
      applications = await db.select({
        status: dscrApplications.status,
        tier: dscrApplications.tier,
        loanAmount: dscrApplications.loanAmountRequested,
        dscrBps: dscrApplications.dscrBps,
        ltvBps: dscrApplications.ltvBps,
        monthlyPayment: dscrApplications.monthlyPayment
      })
        .from(dscrApplications)
        .where(sql`${dscrApplications.status} = 'funded'`);
    } catch (dbError) {
      console.log('No funded applications yet');
    }

    const loanBook = {
      funded: applications.length,
      totalFunded: applications.reduce((sum, a) => sum + parseFloat(a.loanAmount || '0'), 0),
      avgDscr: applications.length > 0 
        ? applications.reduce((sum, a) => sum + (a.dscrBps || 0), 0) / applications.length / 100 
        : 0,
      avgLtv: applications.length > 0 
        ? applications.reduce((sum, a) => sum + (a.ltvBps || 0), 0) / applications.length / 10000 
        : 0,
      monthlyPayments: applications.reduce((sum, a) => sum + parseFloat(a.monthlyPayment || '0'), 0),
      tierDistribution: {
        low: applications.filter(a => a.tier === 'low').length,
        standard: applications.filter(a => a.tier === 'standard').length,
        yield: applications.filter(a => a.tier === 'yield').length
      }
    };

    let commitmentStats: any[] = [{ count: 0, total: 0 }];
    try {
      commitmentStats = await db.select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(cast(commitment_amount as decimal)), 0)`
      })
        .from(investorCommitments)
        .where(sql`${investorCommitments.status} = 'soft_commit'`);
    } catch (dbError) {
      console.log('No commitments yet');
    }

    let investorPosition = null;
    let investorCommitmentHistory = null;

    if (wallet && typeof wallet === 'string') {
      investorPosition = await getInvestorPosition(wallet);
      
      investorCommitmentHistory = await db.select()
        .from(investorCommitments)
        .where(eq(investorCommitments.walletAddress, wallet))
        .orderBy(desc(investorCommitments.createdAt));
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
