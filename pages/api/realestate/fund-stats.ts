import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { REALESTATE_LENDING_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const FIXFLIP_VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function asset() view returns (address)',
  'function convertToAssets(uint256 shares) view returns (uint256)'
];

const FIXFLIP_MANAGER_ABI = [
  'function loanCount() view returns (uint256)',
  'function totalActiveLoans() view returns (uint256)',
  'function totalLockedCapital() view returns (uint256)'
];

const RISK_CONFIG_ABI = [
  'function getProductConfig(bytes32 productId) view returns (uint16 maxLtvBps, uint16 interestRateBps, uint16 originationFeeBps, uint32 maxTermDays, uint256 minLoanSize, uint256 maxLoanSize, bool active)'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);

    const vaultContract = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
      FIXFLIP_VAULT_ABI,
      provider
    );

    const managerContract = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.FIXFLIP_MANAGER,
      FIXFLIP_MANAGER_ABI,
      provider
    );

    const riskConfigContract = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.RISK_CONFIG,
      RISK_CONFIG_ABI,
      provider
    );

    let totalAssets = BigInt(0);
    let totalSupply = BigInt(0);
    let activeLoans = 0;
    let lockedCapital = BigInt(0);
    let riskParams = null;

    try {
      [totalAssets, totalSupply] = await Promise.all([
        vaultContract.totalAssets(),
        vaultContract.totalSupply()
      ]);
    } catch (e) {
      console.log('Vault data not available yet:', e);
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
      console.log('Manager data not available yet:', e);
    }

    try {
      const productId = ethers.id('FIX_FLIP_BRIDGE');
      const config = await riskConfigContract.getProductConfig(productId);
      riskParams = {
        maxLtvBps: Number(config.maxLtvBps),
        interestRateBps: Number(config.interestRateBps),
        originationFeeBps: Number(config.originationFeeBps),
        maxTermDays: Number(config.maxTermDays),
        minLoanSize: ethers.formatUnits(config.minLoanSize, 18),
        maxLoanSize: ethers.formatUnits(config.maxLoanSize, 18),
        active: config.active
      };
    } catch (e) {
      console.log('Risk config not available, using defaults');
      riskParams = {
        maxLtvBps: 7000,
        interestRateBps: 1400,
        originationFeeBps: 300,
        maxTermDays: 365,
        minLoanSize: '50000',
        maxLoanSize: '500000',
        active: true
      };
    }

    const totalAssetsUSD = ethers.formatUnits(totalAssets, 18);
    const availableLiquidity = ethers.formatUnits(totalAssets - lockedCapital, 18);
    const lockedInLoans = ethers.formatUnits(lockedCapital, 18);

    let sharePrice = '1.00';
    if (totalSupply > 0n) {
      const priceWei = (totalAssets * BigInt(1e6)) / totalSupply;
      sharePrice = ethers.formatUnits(priceWei, 6);
    }

    const stats = {
      totalAssets: totalAssetsUSD,
      availableLiquidity,
      lockedInLoans,
      activeLoans,
      sharePrice,
      apy: '10-14%',
      riskParams,
      contractAddresses: {
        vault: REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
        manager: REALESTATE_LENDING_CONTRACTS.FIXFLIP_MANAGER,
        riskConfig: REALESTATE_LENDING_CONTRACTS.RISK_CONFIG
      },
      lastUpdated: new Date().toISOString()
    };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(stats);

  } catch (error) {
    console.error('Error fetching fund stats:', error);
    
    return res.status(200).json({
      totalAssets: '0',
      availableLiquidity: '0',
      lockedInLoans: '0',
      activeLoans: 0,
      sharePrice: '1.00',
      apy: '10-14%',
      riskParams: {
        maxLtvBps: 7000,
        interestRateBps: 1400,
        originationFeeBps: 200,
        maxTermDays: 365,
        minLoanSize: '50000',
        maxLoanSize: '500000',
        active: true
      },
      contractAddresses: {
        vault: REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
        manager: REALESTATE_LENDING_CONTRACTS.FIXFLIP_MANAGER,
        riskConfig: REALESTATE_LENDING_CONTRACTS.RISK_CONFIG
      },
      lastUpdated: new Date().toISOString(),
      error: 'Using fallback data - blockchain connection unavailable'
    });
  }
}
