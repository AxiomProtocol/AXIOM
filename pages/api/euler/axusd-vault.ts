import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { EULER_LENDING_CONTRACTS } from '../../../shared/contracts';
import { ERC3643_CONTRACTS } from '../../../shared/contracts-3643';
import { AXUSD_ORACLE_ADAPTER, isOracleDeployed, ERC7726_ABI } from '../../../src/config/oracleConfig';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const EVK_VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function interestRate() view returns (uint256)',
  'function caps() view returns (uint16 supplyCap, uint16 borrowCap)',
  'function asset() view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function oracle() view returns (address)',
  'function interestRateModel() view returns (address)',
  'function governorAdmin() view returns (address)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function LTV(address collateral) view returns (uint16 borrowLTV, uint16 liquidationLTV, uint16 initialLiquidationLTV, uint48 targetTimestamp, uint32 rampDuration)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

/**
 * EVK AmountCap decoding: uint16 = (mantissa << 6) | exponent
 * amount_in_asset_units = (mantissa * 10^exponent) / 1e9
 * Zero = unlimited cap.
 */
function decodeAmountCap(encoded: number): bigint {
  if (encoded === 0) return 0n;
  const exponent = encoded & 0x3F;
  const mantissa = encoded >> 6;
  const raw = BigInt(mantissa) * (10n ** BigInt(exponent));
  return raw / 1_000_000_000n; // EVK divides by 1e9 to derive asset units
}

export interface EvkVaultStats {
  vaultAddress: string;
  deployed: boolean;
  pendingDeployment: boolean;
  asset: string;
  assetSymbol: string;
  name: string;
  symbol: string;
  tvlAxusd: string;
  totalBorrowsAxusd: string;
  availableLiquidityAxusd: string;
  utilizationPct: string;
  supplyApyPct: string;
  borrowApyPct: string;
  borrowCapAxusd: string;
  supplyCapAxusd: string;
  collateral: {
    symbol: string;
    address: string;
    borrowLTV: number;
    liquidationLTV: number;
    poolSizeUsdc: string;
  }[];
  oracle: string;
  oracleDeployed: boolean;
  irm: string;
  governor: string;
  evc: string;
  lpmWhitelistRequired: boolean;
  eulerLink: string;
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

  const vaultAddress = EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT;
  const isPending = (vaultAddress as string) === ZERO_ADDRESS;

  if (isPending) {
    const pendingStats: EvkVaultStats = {
      vaultAddress: ZERO_ADDRESS,
      deployed: false,
      pendingDeployment: true,
      asset: ERC3643_CONTRACTS.AXUSD_TOKEN,
      assetSymbol: 'AXUSD',
      name: 'AXUSD EVK Open Money Market',
      symbol: 'eAXUSD-OMM',
      tvlAxusd: '0',
      totalBorrowsAxusd: '0',
      availableLiquidityAxusd: '0',
      utilizationPct: '0',
      supplyApyPct: '0',
      borrowApyPct: '1.0',
      borrowCapAxusd: '500000',
      supplyCapAxusd: '1000000',
      collateral: [
        {
          symbol: 'USDC',
          address: USDC_ADDRESS,
          borrowLTV: 90,
          liquidationLTV: 95,
          poolSizeUsdc: '0',
        },
      ],
      oracle: AXUSD_ORACLE_ADAPTER,
      oracleDeployed: isOracleDeployed(),
      irm: EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_IRM,
      governor: EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_GOVERNOR,
      evc: EULER_LENDING_CONTRACTS.EVC,
      lpmWhitelistRequired: true,
      eulerLink: `https://app.euler.finance/market/arbitrumone`,
    };

    return res.status(200).json({
      success: true,
      status: 'PENDING_DEPLOYMENT',
      message:
        'EVK Open Money Market vault not yet deployed. Run scripts/deploy-axusd-evk-vault.js to deploy.',
      deployInstructions: {
        step1: 'Deploy ERC-7726 oracle: npx hardhat run scripts/deploy-axusd-oracle.js --network arbitrumOne',
        step2: 'Deploy vault + IRM: npx hardhat run scripts/deploy-axusd-evk-vault.js --network arbitrumOne',
        step3:
          'Update EVK_OPEN_MARKET_VAULT + EVK_OPEN_MARKET_IRM in shared/contracts.ts and src/config/activeContracts.generated.ts',
        step4:
          'Whitelist vault address and EVC in LendingPlatformModule: addPlatform(vault, evc)',
      },
      vault: pendingStats,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const provider = getProvider();
    const vault = new ethers.Contract(vaultAddress, EVK_VAULT_ABI, provider);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

    const [
      totalAssets,
      totalBorrows,
      totalShareSupply,
      interestRate,
      caps,
      assetAddr,
      name,
      symbol,
      oracleAddr,
      irmAddr,
      governorAdmin,
    ] = await Promise.all([
      vault.totalAssets(),
      vault.totalBorrows(),
      vault.totalSupply().catch(() => 0n),
      vault.interestRate().catch(() => 0n),
      vault.caps().catch(() => [0, 0]),
      vault.asset().catch(() => ERC3643_CONTRACTS.AXUSD_TOKEN),
      vault.name().catch(() => 'AXUSD EVK Open Money Market'),
      vault.symbol().catch(() => 'eAXUSD-OMM'),
      vault.oracle().catch(() => AXUSD_ORACLE_ADAPTER),
      vault.interestRateModel().catch(() => EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_IRM),
      vault.governorAdmin().catch(() => EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_GOVERNOR),
    ]);

    const totalAssetsNum = parseFloat(ethers.formatEther(totalAssets));
    const totalBorrowsNum = parseFloat(ethers.formatEther(totalBorrows));
    const availableLiquidity = Math.max(0, totalAssetsNum - totalBorrowsNum);
    const utilization = totalAssetsNum > 0 ? (totalBorrowsNum / totalAssetsNum) * 100 : 0;

    const interestRateNum = Number(interestRate);
    const borrowApy = interestRateNum > 0 ? (interestRateNum / 1e27) * 100 : 1.0;
    const supplyApy = borrowApy * (utilization / 100) * 0.9;

    const supplyCap = decodeAmountCap(Number(caps[0]));
    const borrowCap = decodeAmountCap(Number(caps[1]));

    let usdcPoolSize = '0';
    try {
      const usdcBalance = await usdc.balanceOf(vaultAddress);
      usdcPoolSize = parseFloat(ethers.formatUnits(usdcBalance, 6)).toFixed(2);
    } catch {}

    let usdcBorrowLtv = 90;
    let usdcLiqLtv = 95;
    try {
      const ltvData = await vault.LTV(USDC_ADDRESS);
      usdcBorrowLtv = Math.round(Number(ltvData.borrowLTV) / 100);
      usdcLiqLtv = Math.round(Number(ltvData.liquidationLTV) / 100);
    } catch {}

    let axusdPrice = 1.0;
    if (isOracleDeployed()) {
      try {
        const oracle = new ethers.Contract(AXUSD_ORACLE_ADAPTER, [...ERC7726_ABI], provider);
        const ONE_USDC = 1_000_000n;
        const out: bigint = await oracle.getQuote(ONE_USDC, USDC_ADDRESS, ERC3643_CONTRACTS.AXUSD_TOKEN);
        if (out > 0n) {
          const WAD = BigInt(1e18);
          const priceWad = (WAD * WAD) / out;
          axusdPrice = parseFloat(ethers.formatEther(priceWad));
        }
      } catch {}
    }

    const tvlUsd = totalAssetsNum * axusdPrice;
    const borrowsUsd = totalBorrowsNum * axusdPrice;

    const stats: EvkVaultStats = {
      vaultAddress,
      deployed: true,
      pendingDeployment: false,
      asset: assetAddr,
      assetSymbol: 'AXUSD',
      name,
      symbol,
      tvlAxusd: totalAssetsNum.toFixed(2),
      totalBorrowsAxusd: totalBorrowsNum.toFixed(2),
      availableLiquidityAxusd: availableLiquidity.toFixed(2),
      utilizationPct: utilization.toFixed(2),
      supplyApyPct: supplyApy.toFixed(2),
      borrowApyPct: borrowApy.toFixed(2),
      borrowCapAxusd: borrowCap > 0n ? ethers.formatEther(borrowCap) : '500000',
      supplyCapAxusd: supplyCap > 0n ? ethers.formatEther(supplyCap) : '1000000',
      collateral: [
        {
          symbol: 'USDC',
          address: USDC_ADDRESS,
          borrowLTV: usdcBorrowLtv,
          liquidationLTV: usdcLiqLtv,
          poolSizeUsdc: usdcPoolSize,
        },
      ],
      oracle: oracleAddr,
      oracleDeployed: isOracleDeployed(),
      irm: irmAddr,
      governor: governorAdmin,
      evc: EULER_LENDING_CONTRACTS.EVC,
      lpmWhitelistRequired: true,
      eulerLink: `https://app.euler.finance/vault/${vaultAddress}?network=arbitrumone`,
    };

    return res.status(200).json({
      success: true,
      status: 'LIVE',
      vault: stats,
      priceContext: {
        axusdUsdPrice: axusdPrice.toFixed(6),
        tvlUsd: tvlUsd.toFixed(2),
        totalBorrowsUsd: borrowsUsd.toFixed(2),
        oracleSource: isOracleDeployed() ? 'erc7726_on_chain' : 'static_parity',
      },
      network: { chainId: 42161, name: 'Arbitrum One' },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[euler/axusd-vault] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch vault stats',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
