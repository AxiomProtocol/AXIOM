import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { REALESTATE_LENDING_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const DSCR_VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function asset() view returns (address)',
  'function convertToAssets(uint256 shares) view returns (uint256)'
];

const DSCR_MANAGER_ABI = [
  'function loanCount() view returns (uint256)',
  'function totalActiveLoans() view returns (uint256)',
  'function totalLockedCapital() view returns (uint256)'
];

const DSCR_RISK_CONFIG_ABI = [
  'function getProductRisk(uint256 productId) view returns (tuple(uint256 productId, uint256 maxLtvBps, uint256 maxTermDays, uint256 maxLoanSize, uint256 minLoanSize, uint256 originationFeeBps, uint256 interestRateBps, uint256 lateFeePerDayBps, uint256 insuranceReserveBps, uint256 protocolFeeBps, bool active))'
];

const DSCR_TIERS = {
  LOW: { productId: 100, name: 'Conservative', maxLtv: 6500, minDscr: 125, apr: 700 },
  STANDARD: { productId: 101, name: 'Standard', maxLtv: 7000, minDscr: 120, apr: 800 },
  YIELD: { productId: 102, name: 'Yield Optimized', maxLtv: 7500, minDscr: 110, apr: 950 }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);

    const vaultContract = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
      DSCR_VAULT_ABI,
      provider
    );

    const managerContract = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.DSCR_LOAN_MANAGER,
      DSCR_MANAGER_ABI,
      provider
    );

    const riskConfigContract = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.DSCR_RISK_CONFIG,
      DSCR_RISK_CONFIG_ABI,
      provider
    );

    let totalAssets = BigInt(0);
    let totalSupply = BigInt(0);
    let activeLoans = 0;
    let lockedCapital = BigInt(0);
    const tierConfigs: any[] = [];

    try {
      [totalAssets, totalSupply] = await Promise.all([
        vaultContract.totalAssets(),
        vaultContract.totalSupply()
      ]);
    } catch (e) {
      console.log('DSCR Vault data not available yet:', e);
    }

    try {
      const [loanCount, totalActive, locked] = await Promise.all([
        managerContract.loanCount(),
        managerContract.totalActiveLoans(),
        managerContract.totalLockedCapital()
      ]);
      activeLoans = Number(totalActive);
      lockedCapital = locked;
    } catch (e) {
      console.log('DSCR Manager data not available yet:', e);
    }

    for (const [tierKey, tier] of Object.entries(DSCR_TIERS)) {
      try {
        const risk = await riskConfigContract.getProductRisk(tier.productId);
        tierConfigs.push({
          tier: tierKey,
          name: tier.name,
          productId: tier.productId,
          maxLtvBps: Number(risk.maxLtvBps),
          minDscrBps: tier.minDscr * 100,
          interestRateBps: Number(risk.interestRateBps),
          originationFeeBps: Number(risk.originationFeeBps),
          lateFeePerDayBps: Number(risk.lateFeePerDayBps),
          insuranceReserveBps: Number(risk.insuranceReserveBps),
          protocolFeeBps: Number(risk.protocolFeeBps),
          maxTermDays: Number(risk.maxTermDays),
          minLoanSize: ethers.formatUnits(risk.minLoanSize, 18),
          maxLoanSize: ethers.formatUnits(risk.maxLoanSize, 18),
          active: risk.active
        });
      } catch (e) {
        tierConfigs.push({
          tier: tierKey,
          name: tier.name,
          productId: tier.productId,
          maxLtvBps: tier.maxLtv,
          minDscrBps: tier.minDscr * 100,
          interestRateBps: tier.apr,
          originationFeeBps: 150,
          lateFeePerDayBps: 25,
          insuranceReserveBps: 100,
          protocolFeeBps: 100,
          maxTermDays: 10950,
          minLoanSize: '75000',
          maxLoanSize: '1000000',
          active: true
        });
      }
    }

    const totalAssetsUSD = ethers.formatUnits(totalAssets, 18);
    const availableLiquidity = ethers.formatUnits(totalAssets - lockedCapital, 18);
    const lockedInLoans = ethers.formatUnits(lockedCapital, 18);

    let sharePrice = '1.00';
    if (totalSupply > 0n) {
      const priceWei = (totalAssets * BigInt(1e18)) / totalSupply;
      sharePrice = ethers.formatUnits(priceWei, 18);
    }

    const utilizationRate = totalAssets > 0n 
      ? ((Number(lockedCapital) / Number(totalAssets)) * 100).toFixed(2)
      : '0.00';

    return res.status(200).json({
      product: 'DSCR Rental Loans',
      description: '30-year amortizing rental property loans with DSCR underwriting',
      totalAssets: totalAssetsUSD,
      availableLiquidity,
      lockedInLoans,
      activeLoans,
      sharePrice,
      utilizationRate,
      targetApy: '8-10%',
      tiers: tierConfigs,
      contracts: {
        vault: REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
        manager: REALESTATE_LENDING_CONTRACTS.DSCR_LOAN_MANAGER,
        riskConfig: REALESTATE_LENDING_CONTRACTS.DSCR_RISK_CONFIG,
        loanReceipt: REALESTATE_LENDING_CONTRACTS.DSCR_LOAN_RECEIPT_NFT,
        repaymentRouter: REALESTATE_LENDING_CONTRACTS.DSCR_REPAYMENT_ROUTER
      }
    });
  } catch (error: any) {
    console.error('Error fetching DSCR fund stats:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch DSCR fund statistics',
      details: error.message
    });
  }
}
