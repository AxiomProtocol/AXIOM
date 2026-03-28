import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

import { ACTIVE_CONTRACTS, EULER_AXUSD, ACTIVE_AXUSD, ACTIVE_PSM, EULER_PSM } from '../../../src/config/activeContracts.generated';
import { AXUSD_ORACLE_ADAPTER, LEGACY_ORACLE, isOracleDeployed } from '../../../src/config/oracleConfig';

const EULER_LENDING_CONFIG = {
  AXUSD_VAULT: ACTIVE_CONTRACTS.eulerVaultDeprecated,
  VAULT_GOVERNOR: '0xE742Ee9b946043ecc75bFc71B47216C1f8248316',
  PRICE_ORACLE: isOracleDeployed() ? AXUSD_ORACLE_ADAPTER : LEGACY_ORACLE.PRICE_ORACLE,
  AXUSD_TOKEN: EULER_AXUSD,
  REVENUE_ROUTER: ACTIVE_CONTRACTS.revenueRouter,
  TREASURY_HUB: ACTIVE_CONTRACTS.treasuryHub,
  COLLATERAL_VAULTS: {
    USDC: { address: '0x0a1eCC5Fe8C9be3C809844fcBe615B46A869b899', borrowLTV: 90, liqLTV: 95 },
    USDT: { address: '0x37512F45B4ba8808910632323b73783Ca938CD51', borrowLTV: 90, liqLTV: 95 },
    WETH: { address: '0x78E3E051D32157AACD550fBB78458762d8f7edFF', borrowLTV: 80, liqLTV: 85 },
    ARB: { address: '0x7eD866D2D66c3149FaFE854C30C68a8BA7ceE8B9', borrowLTV: 70, liqLTV: 75 }
  }
};

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function interestRate() view returns (uint256)',
  'function caps() view returns (uint16 supplyCap, uint16 borrowCap)',
  'function asset() view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function feeReceiver() view returns (address)',
  'function interestFee() view returns (uint16)',
  'function creator() view returns (address)',
  'function governorAdmin() view returns (address)'
];

function decodeAmountCap(encoded: number): string {
  if (encoded === 0) return '0';
  const exponent = encoded & 0x3F;  // Lower 6 bits
  const mantissa = encoded >> 6;     // Upper bits
  // Decode: mantissa * 10^exponent gives raw value with 18 decimals
  // To get human-readable, divide by 10^18
  const rawValue = BigInt(mantissa) * (10n ** BigInt(exponent));
  const humanValue = rawValue / (10n ** 18n);
  return humanValue.toLocaleString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const vault = new ethers.Contract(EULER_LENDING_CONFIG.AXUSD_VAULT, VAULT_ABI, provider);

    const warnings: string[] = [];
    
    const [totalAssets, totalBorrows, totalShareSupply, interestRate, caps, name, symbol, feeReceiver, interestFee, creator, governorAdmin] = await Promise.all([
      vault.totalAssets(),
      vault.totalBorrows(),
      vault.totalSupply().catch(() => { warnings.push('totalSupply fetch failed'); return BigInt(0); }),
      vault.interestRate().catch(() => { warnings.push('interestRate fetch failed'); return BigInt(0); }),
      vault.caps(),
      vault.name(),
      vault.symbol(),
      vault.feeReceiver().catch(() => { warnings.push('feeReceiver fetch failed'); return ethers.ZeroAddress; }),
      vault.interestFee().catch(() => { warnings.push('interestFee fetch failed'); return 0; }),
      vault.creator().catch(() => { warnings.push('creator fetch failed'); return ethers.ZeroAddress; }),
      vault.governorAdmin().catch(() => { warnings.push('governorAdmin fetch failed'); return ethers.ZeroAddress; })
    ]);

    const totalAssetsNum = parseFloat(ethers.formatEther(totalAssets));
    const totalBorrowsNum = parseFloat(ethers.formatEther(totalBorrows));
    const utilization = totalAssetsNum > 0 ? (totalBorrowsNum / totalAssetsNum) * 100 : 0;
    
    // interestRate() returns a per-second rate as a 1e27 ray.
    // Annualize: multiply by seconds per year (linear APR approximation).
    const SECONDS_PER_YEAR = 31_536_000;
    const interestRateNum = Number(interestRate);
    const perSecondRate = interestRateNum / 1e27;
    const borrowAPY = interestRateNum > 0 ? perSecondRate * SECONDS_PER_YEAR * 100 : 0;
    // Supply APY = borrow APY × utilization × (1 − interest fee)
    const interestFeeRatio = Number(interestFee) / 10000; // interestFee is uint16, 10000 = 100%
    const supplyAPY = interestRateNum > 0 ? borrowAPY * (utilization / 100) * (1 - interestFeeRatio) : 0;

    const supplyCap = decodeAmountCap(Number(caps[0]));
    const borrowCap = decodeAmountCap(Number(caps[1]));

    const collateralList = Object.entries(EULER_LENDING_CONFIG.COLLATERAL_VAULTS).map(([symbol, config]) => ({
      symbol,
      vaultAddress: config.address,
      borrowLTV: config.borrowLTV,
      liquidationLTV: config.liqLTV
    }));

    const interestFeePercent = Number(interestFee) / 100;
    const feeReceiverAddress = feeReceiver.toString();
    const isRevenueRouterSet = feeReceiverAddress.toLowerCase() === EULER_LENDING_CONFIG.REVENUE_ROUTER.toLowerCase();
    const isTreasurySet = feeReceiverAddress.toLowerCase() === EULER_LENDING_CONFIG.TREASURY_HUB.toLowerCase();
    const isFeeRecipientConfigured = feeReceiverAddress !== ethers.ZeroAddress && (isRevenueRouterSet || isTreasurySet);
    
    const hasFeeDataWarnings = warnings.some(w => w.includes('feeReceiver') || w.includes('interestFee'));
    
    const feeConfiguration = {
      feeReceiver: feeReceiverAddress,
      interestFeePercent: interestFeePercent.toFixed(2),
      interestFeeRaw: Number(interestFee),
      creator: creator.toString(),
      governorAdmin: governorAdmin.toString(),
      dataQuality: hasFeeDataWarnings ? 'PARTIAL_DATA' : 'COMPLETE',
      status: {
        isFeeRecipientConfigured,
        isRevenueRouterSet,
        isTreasurySet,
        expectedRevenueRouter: EULER_LENDING_CONFIG.REVENUE_ROUTER,
        expectedTreasuryHub: EULER_LENDING_CONFIG.TREASURY_HUB,
        feeRoutingStatus: hasFeeDataWarnings 
          ? 'DATA_FETCH_ERROR'
          : (isFeeRecipientConfigured 
              ? (isRevenueRouterSet ? 'CONFIGURED_REVENUE_ROUTER' : 'CONFIGURED_TREASURY')
              : (feeReceiverAddress === ethers.ZeroAddress ? 'NOT_SET' : 'UNKNOWN_RECIPIENT')),
        actionRequired: hasFeeDataWarnings
          ? 'RPC data fetch error - fee status may be inaccurate'
          : (!isFeeRecipientConfigured 
              ? 'Governance action needed to set fee recipient to Revenue Router or Treasury'
              : null)
      }
    };

    const userAddress = req.query.address as string | undefined;
    let userPosition = null;

    if (userAddress && ethers.isAddress(userAddress)) {
      try {
        const userShares = await vault.balanceOf(userAddress);
        const userAssets = await vault.convertToAssets(userShares);
        userPosition = {
          shares: ethers.formatEther(userShares),
          assets: ethers.formatEther(userAssets),
          assetsUSD: parseFloat(ethers.formatEther(userAssets))
        };
      } catch (e) {
        userPosition = null;
      }
    }

    const totalSharesNum = parseFloat(ethers.formatEther(totalShareSupply));
    const sharePrice = totalSharesNum > 0 ? totalAssetsNum / totalSharesNum : 1.0;
    const shareMathHealthy = totalSharesNum > 0 && sharePrice > 0.95 && sharePrice < 1.10;

    const guardRail3 = {
      name: 'Guard Rail #3: ERC4626 Share Math Edge Case',
      status: shareMathHealthy ? 'PASS' : (totalSharesNum === 0 ? 'NO_DEPOSITS' : 'WARNING'),
      totalShares: totalSharesNum.toFixed(6),
      totalAssets: totalAssetsNum.toFixed(6),
      sharePrice: sharePrice.toFixed(6),
      rule: 'On every deposit, assert minSharesOut > 0. First depositor gets 1:1 shares.',
      detail: totalSharesNum === 0
        ? 'No deposits yet — first depositor will get 1:1 shares'
        : shareMathHealthy
          ? `Share price ${sharePrice.toFixed(4)} is within safe range (0.95–1.10)`
          : `Share price ${sharePrice.toFixed(4)} is outside safe range — investigate before depositing`,
    };

    return res.status(200).json({
      success: true,
      vault: {
        address: EULER_LENDING_CONFIG.AXUSD_VAULT,
        name,
        symbol,
        asset: EULER_LENDING_CONFIG.AXUSD_TOKEN,
        assetSymbol: 'AXUSD',
        totalSupply: totalAssetsNum.toFixed(2),
        totalBorrows: totalBorrowsNum.toFixed(2),
        availableLiquidity: (totalAssetsNum - totalBorrowsNum).toFixed(2),
        utilization: utilization.toFixed(2),
        supplyAPY: supplyAPY.toFixed(2),
        borrowAPY: borrowAPY.toFixed(2),
        supplyCap: supplyCap,
        borrowCap: borrowCap,
        collateral: collateralList,
        governor: EULER_LENDING_CONFIG.VAULT_GOVERNOR,
        oracle: EULER_LENDING_CONFIG.PRICE_ORACLE,
        eulerLink: `https://app.euler.finance/vault/${EULER_LENDING_CONFIG.AXUSD_VAULT}?network=arbitrumone`
      },
      feeConfiguration,
      userPosition,
      network: {
        chainId: 42161,
        name: 'Arbitrum One'
      },
      activeContracts: {
        axusd: ACTIVE_AXUSD,
        eulerAxusd: EULER_AXUSD,
        psm: ACTIVE_PSM,
        eulerPsm: EULER_PSM,
        note: 'Euler Vault uses Original AXUSD (immutable on-chain binding)'
      },
      oracle: {
        address: EULER_LENDING_CONFIG.PRICE_ORACLE,
        standard: 'ERC-7726',
        deployed: isOracleDeployed(),
        statusLabel: isOracleDeployed()
          ? 'ACTIVE — AXIOMOracleAdapter serving on-chain quotes'
          : 'PENDING_DEPLOYMENT — using legacy oracle; deploy contracts/oracle/AXIOMOracleAdapter.sol',
        legacyOracle: LEGACY_ORACLE.PRICE_ORACLE,
        upgradeAction: isOracleDeployed()
          ? null
          : 'Run: npx hardhat run scripts/deploy-axusd-oracle.js --network arbitrumOne, then update src/config/oracleConfig.ts',
      },
      guardRail3,
      warnings: warnings.length > 0 ? warnings : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Euler vault stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch vault stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
