import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
  EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
  EULER_SWAP_FACTORY_ADDRESS,
  EVK_OPEN_MARKET_VAULT_ADDRESS,
  isEulerSwapDeployed,
  isEvkVaultDeployed,
} from '../../../src/config/activeContracts.generated';

const ALCHEMY_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';
const ZERO = '0x0000000000000000000000000000000000000000';

const AXUSD_TOKEN = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USDC_TOKEN  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXM_TOKEN   = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';

// EulerSwap uses its own interface — NOT ERC-20 or Uniswap V2 compatible
const EULERSWAP_POOL_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 status)',
  'function getDynamicParams() view returns (uint112 equilibriumReserve0, uint112 equilibriumReserve1, uint112 minReserve0, uint112 minReserve1, uint80 priceX, uint80 priceY, uint64 concentrationX, uint64 concentrationY, uint64 fee0, uint64 fee1, uint40 expiration, uint8 swapHookedOperations, address swapHook)',
];

const EVK_ABI = [
  'function totalAssets() view returns (uint256)',
  'function interestRate() view returns (uint256)',
];

const ESTIMATED_VOLUME_MULTIPLIER = 0.15;

// Pool-specific token configuration (reserve0 and reserve1 for each known pool)
// AXUSD/USDC: reserve0 = USDC (6 dec), reserve1 = AXUSD (18 dec)
// (Ordering determined by asset address comparison during activate: USDC 0xaf88.. < AXUSD 0xD611..)
const POOL_TOKEN_CONFIG: Record<string, {
  token0: string; dec0: number; label0: string;
  token1: string; dec1: number; label1: string;
  axusdIsToken0: boolean;
}> = {
  [EULER_SWAP_AXUSD_USDC_POOL_ADDRESS.toLowerCase()]: {
    token0: USDC_TOKEN, dec0: 6,  label0: 'USDC',
    token1: AXUSD_TOKEN, dec1: 18, label1: 'AXUSD',
    axusdIsToken0: false,
  },
  [EULER_SWAP_AXUSD_AXM_POOL_ADDRESS.toLowerCase()]: {
    token0: AXUSD_TOKEN, dec0: 18, label0: 'AXUSD',
    token1: AXM_TOKEN,   dec1: 18, label1: 'AXM',
    axusdIsToken0: true,
  },
};

async function fetchPoolData(poolAddress: string, label: string): Promise<{
  tvlUsd: number;
  axusdReserveUsd: number;
  reserve0: number;
  reserve1: number;
  equilibriumReserve0: number;
  equilibriumReserve1: number;
  feeBps: number;
  token0: string;
  token1: string;
  status: number;
} | null> {
  if (poolAddress === ZERO) return null;
  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC);
    const pool = new ethers.Contract(poolAddress, EULERSWAP_POOL_ABI, provider);

    const config = POOL_TOKEN_CONFIG[poolAddress.toLowerCase()];
    if (!config) throw new Error(`No token config for pool ${poolAddress}`);

    const [reserves, dynParams] = await Promise.all([
      pool.getReserves(),
      pool.getDynamicParams(),
    ]);

    const r0 = Number(ethers.formatUnits(reserves[0], config.dec0));
    const r1 = Number(ethers.formatUnits(reserves[1], config.dec1));
    const eq0 = Number(ethers.formatUnits(dynParams[0], config.dec0));
    const eq1 = Number(ethers.formatUnits(dynParams[1], config.dec1));
    const status = Number(reserves[2]);

    // fee0 is in WAD (1e18 = 100%); convert to basis points (1 bps = 0.01%)
    const fee0Raw = BigInt(dynParams[8].toString());
    const feeBps = Number(fee0Raw) / 1e14; // fee0 / 1e18 * 10000

    const axusdReserve = config.axusdIsToken0 ? r0 : r1;

    // TVL: for stablecoin pairs (AXUSD+USDC), sum both at $1 parity
    // For mixed pairs (AXUSD+AXM), use AXUSD reserve × 2 as balanced-pool proxy
    const isStablePair = !config.axusdIsToken0 ? config.dec0 === 6 : config.dec1 === 6;
    const otherReserve = config.axusdIsToken0 ? r1 : r0;
    const tvlUsd = isStablePair ? axusdReserve + otherReserve : axusdReserve * 2;

    return {
      tvlUsd,
      axusdReserveUsd: axusdReserve,
      reserve0: r0,
      reserve1: r1,
      equilibriumReserve0: eq0,
      equilibriumReserve1: eq1,
      feeBps,
      token0: config.token0.toLowerCase(),
      token1: config.token1.toLowerCase(),
      status,
    };
  } catch (err: any) {
    console.warn(`[eulerswap-pools] Failed to fetch ${label}:`, err?.message);
    return null;
  }
}

async function fetchEvkLendingApyBps(): Promise<number> {
  if (!isEvkVaultDeployed()) return 0;
  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC);
    const vault = new ethers.Contract(EVK_OPEN_MARKET_VAULT_ADDRESS, EVK_ABI, provider);
    const rateRaw: bigint = await vault.interestRate();
    const ratePerSecond = Number(rateRaw) / 1e27;
    const apyDecimal = Math.pow(1 + ratePerSecond * 86400, 365) - 1;
    return Math.round(apyDecimal * 10000);
  } catch {
    return 0;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const deployed = isEulerSwapDeployed();

  const [axusdUsdcData, axusdAxmData, evkLendingApyBps] = await Promise.all([
    fetchPoolData(EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, 'AXUSD/USDC'),
    fetchPoolData(EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, 'AXUSD/AXM'),
    fetchEvkLendingApyBps(),
  ]);

  function computeBlendedApy(tvlUsd: number, feeBps: number): {
    swapFeeApyBps: number;
    lendingApyBps: number;
    blendedApyBps: number;
  } {
    if (tvlUsd <= 0) {
      return { swapFeeApyBps: 0, lendingApyBps: evkLendingApyBps, blendedApyBps: evkLendingApyBps };
    }
    const dailyVolume = tvlUsd * ESTIMATED_VOLUME_MULTIPLIER;
    const annualFees = dailyVolume * (feeBps / 10000) * 365;
    const swapFeeApyBps = Math.round((annualFees / tvlUsd) * 10000);
    const blendedApyBps = swapFeeApyBps + evkLendingApyBps;
    return { swapFeeApyBps, lendingApyBps: evkLendingApyBps, blendedApyBps };
  }

  const DEFAULT_FEE_BPS = 0.3; // 0.003% = 0.3 bps (30e12 in WAD)
  const axusdUsdcApy = computeBlendedApy(axusdUsdcData?.tvlUsd ?? 0, axusdUsdcData?.feeBps ?? DEFAULT_FEE_BPS);
  const axusdAxmApy  = computeBlendedApy(axusdAxmData?.tvlUsd ?? 0, axusdAxmData?.feeBps ?? DEFAULT_FEE_BPS);

  const totalTvlUsd = (axusdUsdcData?.tvlUsd ?? 0) + (axusdAxmData?.tvlUsd ?? 0);

  // Pool status: 0=unactivated, 1=unlocked (active), 2=locked
  const axusdUsdcStatus = axusdUsdcData?.status === 1 ? 'LIVE' : axusdUsdcData?.status === 2 ? 'LOCKED' : 'PENDING_DEPLOYMENT';
  const axusdAxmStatus  = axusdAxmData?.status === 1 ? 'LIVE' : axusdAxmData?.status === 2 ? 'LOCKED' : 'PENDING_DEPLOYMENT';

  return res.status(200).json({
    deployed,
    factoryAddress: EULER_SWAP_FACTORY_ADDRESS,
    evkVaultAddress: EVK_OPEN_MARKET_VAULT_ADDRESS,
    evkLendingApyBps,
    totalTvlUsd,
    pools: [
      {
        id: 'axusd_usdc',
        label: 'AXUSD / USDC',
        address: EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
        token0: USDC_TOKEN,
        token1: AXUSD_TOKEN,
        status: axusdUsdcData ? axusdUsdcStatus : (deployed ? 'LIVE' : 'PENDING_DEPLOYMENT'),
        tvlUsd: axusdUsdcData?.tvlUsd ?? 0,
        reserve0: axusdUsdcData?.reserve0 ?? 0,
        reserve1: axusdUsdcData?.reserve1 ?? 0,
        reserve0Label: 'USDC',
        reserve1Label: 'AXUSD',
        equilibriumReserve0: axusdUsdcData?.equilibriumReserve0 ?? 0,
        equilibriumReserve1: axusdUsdcData?.equilibriumReserve1 ?? 0,
        feeBps: axusdUsdcData?.feeBps ?? DEFAULT_FEE_BPS,
        swapFeeApyBps: axusdUsdcApy.swapFeeApyBps,
        lendingApyBps: axusdUsdcApy.lendingApyBps,
        blendedApyBps: axusdUsdcApy.blendedApyBps,
        blendedApyLabel: 'Variable',
        blendedApyPct: (axusdUsdcApy.blendedApyBps / 100).toFixed(2),
        erc3643WhitelistRequired: true,
        note: null,
      },
      {
        id: 'axusd_axm',
        label: 'AXUSD / AXM',
        address: EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
        token0: AXUSD_TOKEN,
        token1: AXM_TOKEN,
        status: axusdAxmData ? axusdAxmStatus : 'PENDING_DEPLOYMENT',
        tvlUsd: axusdAxmData?.tvlUsd ?? 0,
        reserve0: axusdAxmData?.reserve0 ?? 0,
        reserve1: axusdAxmData?.reserve1 ?? 0,
        reserve0Label: 'AXUSD',
        reserve1Label: 'AXM',
        equilibriumReserve0: axusdAxmData?.equilibriumReserve0 ?? 0,
        equilibriumReserve1: axusdAxmData?.equilibriumReserve1 ?? 0,
        feeBps: axusdAxmData?.feeBps ?? DEFAULT_FEE_BPS,
        swapFeeApyBps: axusdAxmApy.swapFeeApyBps,
        lendingApyBps: axusdAxmApy.lendingApyBps,
        blendedApyBps: axusdAxmApy.blendedApyBps,
        blendedApyLabel: 'Variable',
        blendedApyPct: (axusdAxmApy.blendedApyBps / 100).toFixed(2),
        erc3643WhitelistRequired: true,
        note: null,
      },
    ],
    erc3643Whitelist: {
      note: 'AXUSD is ERC-3643 compliant. All EulerSwap pool addresses must be registered in the LendingPlatformModule before LP operations.',
      registrationHandledByDeployScript: true,
    },
    source: 'on-chain',
    timestamp: new Date().toISOString(),
  });
}
