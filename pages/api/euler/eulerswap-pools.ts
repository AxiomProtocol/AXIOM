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
import { EULER_SWAP } from '../../../shared/contracts';

const ALCHEMY_RPC = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
const ZERO = '0x0000000000000000000000000000000000000000';

const AXUSD_TOKEN = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USDC_TOKEN  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXM_TOKEN   = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';

const EULERSWAP_POOL_ABI = [
  'function getReserves() view returns (uint256 reserve0, uint256 reserve1)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function fee() view returns (uint256)',
];

const EVK_ABI = [
  'function totalAssets() view returns (uint256)',
  'function interestRate() view returns (uint256)',
];

const SWAP_FEE_BPS = EULER_SWAP.SWAP_FEE_BPS;
const ESTIMATED_VOLUME_MULTIPLIER = 0.15;

// Decimal map for known tokens used in EulerSwap pools
const TOKEN_DECIMALS: Record<string, number> = {
  [AXUSD_TOKEN.toLowerCase()]: 6,  // ERC-3643 AXUSD — 6 decimals (confirmed via EVK vault totalAssets)
  [USDC_TOKEN.toLowerCase()]:  6,  // USDC — 6 decimals
  [AXM_TOKEN.toLowerCase()]:  18,  // AXM governance token — 18 decimals
};

function tokenDecimals(addr: string): number {
  return TOKEN_DECIMALS[addr.toLowerCase()] ?? 18;
}

async function fetchPoolData(poolAddress: string, label: string): Promise<{
  tvlUsd: number;
  axusdReserveUsd: number;
  reserve0: number;
  reserve1: number;
  totalSupply: number;
  feeBps: number;
  token0: string;
  token1: string;
} | null> {
  if (poolAddress === ZERO) return null;
  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC);
    const pool = new ethers.Contract(poolAddress, EULERSWAP_POOL_ABI, provider);
    const [reserves, token0, token1, totalSupply] = await Promise.all([
      pool.getReserves(),
      pool.token0(),
      pool.token1(),
      pool.totalSupply(),
    ]);
    let feeBps: number = SWAP_FEE_BPS;
    try { feeBps = Number(await pool.fee()); } catch {}

    const dec0 = tokenDecimals(token0);
    const dec1 = tokenDecimals(token1);

    const r0 = Number(ethers.formatUnits(reserves[0], dec0));
    const r1 = Number(ethers.formatUnits(reserves[1], dec1));

    const isAxusdToken0 = token0.toLowerCase() === AXUSD_TOKEN.toLowerCase();
    const axusdReserve = isAxusdToken0 ? r0 : r1;

    // TVL estimate: for stablecoin pairs (AXUSD/USDC), sum directly.
    // For token pairs (AXUSD/AXM), use AXUSD reserve × 2 as a balanced-pool proxy
    // (avoids needing an AXM/USD oracle at this layer).
    const isStablePair = (isAxusdToken0 ? dec1 : dec0) === 6;
    const otherReserve = isAxusdToken0 ? r1 : r0;
    const tvlUsd = isStablePair ? axusdReserve + otherReserve : axusdReserve * 2;

    return {
      tvlUsd,
      axusdReserveUsd: axusdReserve,
      reserve0: r0,
      reserve1: r1,
      totalSupply: Number(ethers.formatUnits(totalSupply, 18)),
      feeBps,
      token0: token0.toLowerCase(),
      token1: token1.toLowerCase(),
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

  const axusdUsdcApy = computeBlendedApy(axusdUsdcData?.tvlUsd ?? 0, axusdUsdcData?.feeBps ?? SWAP_FEE_BPS);
  const axusdAxmApy  = computeBlendedApy(axusdAxmData?.tvlUsd ?? 0, axusdAxmData?.feeBps ?? SWAP_FEE_BPS);

  const totalTvlUsd = (axusdUsdcData?.tvlUsd ?? 0) + (axusdAxmData?.tvlUsd ?? 0);

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
        token0: AXUSD_TOKEN,
        token1: USDC_TOKEN,
        status: deployed ? 'LIVE' : 'PENDING_DEPLOYMENT',
        tvlUsd: axusdUsdcData?.tvlUsd ?? 0,
        feeBps: axusdUsdcData?.feeBps ?? SWAP_FEE_BPS,
        swapFeeApyBps: axusdUsdcApy.swapFeeApyBps,
        lendingApyBps: axusdUsdcApy.lendingApyBps,
        blendedApyBps: axusdUsdcApy.blendedApyBps,
        blendedApyLabel: 'Variable',
        blendedApyPct: (axusdUsdcApy.blendedApyBps / 100).toFixed(2),
        erc3643WhitelistRequired: true,
        note: deployed ? null : 'Pool pending on-chain deployment. Register via LPM whitelist before deploying.',
      },
      {
        id: 'axusd_axm',
        label: 'AXUSD / AXM',
        address: EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
        token0: AXUSD_TOKEN,
        token1: AXM_TOKEN,
        status: deployed ? 'LIVE' : 'PENDING_DEPLOYMENT',
        tvlUsd: axusdAxmData?.tvlUsd ?? 0,
        feeBps: axusdAxmData?.feeBps ?? SWAP_FEE_BPS,
        swapFeeApyBps: axusdAxmApy.swapFeeApyBps,
        lendingApyBps: axusdAxmApy.lendingApyBps,
        blendedApyBps: axusdAxmApy.blendedApyBps,
        blendedApyLabel: 'Variable',
        blendedApyPct: (axusdAxmApy.blendedApyBps / 100).toFixed(2),
        erc3643WhitelistRequired: true,
        note: deployed ? null : 'Pool pending on-chain deployment. Register via LPM whitelist before deploying.',
      },
    ],
    erc3643Whitelist: {
      note: 'AXUSD is ERC-3643 compliant. All EulerSwap pool addresses must be registered in the LendingPlatformModule before LP operations. Use POST /api/erc3643/whitelist/add-platform.',
      registrationHandledByDeployScript: true,
    },
    source: 'on-chain',
    timestamp: new Date().toISOString(),
  });
}
