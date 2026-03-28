import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
  EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
  isEulerSwapDeployed,
} from '../../../src/config/activeContracts.generated';
import { EULER_SWAP } from '../../../shared/contracts';

const AXUSD_ERC3643 = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'.toLowerCase();
const USDC          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'.toLowerCase();
const AXM           = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D'.toLowerCase();
const ZERO          = '0x0000000000000000000000000000000000000000';

// Per-token decimal map for EulerSwap pools
const POOL_TOKEN_DECIMALS: Record<string, number> = {
  [AXUSD_ERC3643]: 6,  // ERC-3643 AXUSD — 6 decimals
  [USDC]:          6,  // USDC — 6 decimals
  [AXM]:           18, // AXM governance token — 18 decimals
};

function poolTokenDecimals(addr: string): number {
  return POOL_TOKEN_DECIMALS[addr.toLowerCase()] ?? 18;
}

const EULERSWAP_POOL_ABI = [
  'function getReserves() view returns (uint256 reserve0, uint256 reserve1)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint256)',
];

function isAxusd(addr: string): boolean {
  const l = addr.toLowerCase();
  return l === AXUSD_ERC3643 || l === AXUSD_ORIG;
}

function ammOut(amountIn: number, reserveIn: number, reserveOut: number, feeMultiplier: number): number {
  const inWithFee = amountIn * feeMultiplier;
  return (inWithFee * reserveOut) / (reserveIn + inWithFee);
}

async function quoteFromEulerSwap(
  provider: ethers.JsonRpcProvider,
  poolAddress: string,
  tokenInLower: string,
  amountIn: number,
): Promise<{ amountOut: number; fee: number; feeBps: number; reserveIn: number; reserveOut: number } | null> {
  if (poolAddress === ZERO) return null;
  try {
    const pool = new ethers.Contract(poolAddress, EULERSWAP_POOL_ABI, provider);
    const [reserves, token0Raw, token1Raw] = await Promise.all([
      pool.getReserves(),
      pool.token0(),
      pool.token1(),
    ]);
    let feeBps: number = EULER_SWAP.SWAP_FEE_BPS;
    try { feeBps = Number(await pool.fee()); } catch {}

    const feeMultiplier = 1 - feeBps / 10000;
    const token0Lower = token0Raw.toLowerCase();
    const token1Lower = token1Raw.toLowerCase();

    // Look up correct decimals per token using the known-decimal map
    // This prevents 1e12 errors when one side is AXM (18 decimals) vs USDC/AXUSD (6 decimals)
    const dec0 = poolTokenDecimals(token0Lower);
    const dec1 = poolTokenDecimals(token1Lower);

    // Convert raw reserves to human-readable units with correct per-token decimals
    const r0 = Number(ethers.formatUnits(reserves[0], dec0));
    const r1 = Number(ethers.formatUnits(reserves[1], dec1));

    // Match tokenIn to its pool side
    const isTokenInToken0 = tokenInLower === token0Lower ||
      (isAxusd(tokenInLower) && isAxusd(token0Lower));

    const reserveIn  = isTokenInToken0 ? r0 : r1;
    const reserveOut = isTokenInToken0 ? r1 : r0;

    if (reserveIn <= 0 || reserveOut <= 0) return null;
    // amountIn is already in human-readable units; AMM math works correctly in those units
    const amountOut = ammOut(amountIn, reserveIn, reserveOut, feeMultiplier);
    const fee = amountIn * (feeBps / 10000);
    return { amountOut, fee, feeBps, reserveIn, reserveOut };
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenIn, tokenOut, amountIn } = req.query;
  if (!tokenIn || !tokenOut || !amountIn) {
    return res.status(400).json({ error: 'Missing required parameters: tokenIn, tokenOut, amountIn' });
  }

  const tokenInLower  = (tokenIn as string).toLowerCase();
  const tokenOutLower = (tokenOut as string).toLowerCase();
  const amountInFloat = parseFloat(amountIn as string);

  if (!amountInFloat || amountInFloat <= 0) {
    return res.status(400).json({ error: 'amountIn must be a positive number' });
  }

  const isAxusdIn  = isAxusd(tokenInLower);
  const isAxusdOut = isAxusd(tokenOutLower);
  const isUsdcIn   = tokenInLower === USDC;
  const isUsdcOut  = tokenOutLower === USDC;
  const isAxmIn    = tokenInLower === AXM;
  const isAxmOut   = tokenOutLower === AXM;

  const isAxusdUsdcPair = (isAxusdIn && isUsdcOut) || (isUsdcIn && isAxusdOut);
  const isAxusdAxmPair  = (isAxusdIn && isAxmOut)  || (isAxmIn  && isAxusdOut);

  if (!isAxusdUsdcPair && !isAxusdAxmPair) {
    return res.status(404).json({
      error: 'No route found.',
      supportedPairs: ['AXUSD/USDC', 'USDC/AXUSD', 'AXUSD/AXM', 'AXM/AXUSD'],
    });
  }

  try {
    const rpcUrl = process.env.ALCHEMY_API_KEY
      ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      : 'https://arb1.arbitrum.io/rpc';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    if (isAxusdUsdcPair && isEulerSwapDeployed()) {
      const eulerResult = await quoteFromEulerSwap(provider, EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, tokenInLower, amountInFloat);
      if (eulerResult && eulerResult.amountOut > 0) {
        // Compute real price impact from AMM reserves
        // spotPrice = reserveOut / reserveIn (tokenOut units per tokenIn)
        // execPrice = amountOut / amountIn
        // priceImpact = (spotPrice - execPrice) / spotPrice * 100
        const spotPerUnit = eulerResult.reserveOut / eulerResult.reserveIn;
        const execPerUnit = eulerResult.amountOut / amountInFloat;
        const priceImpact = spotPerUnit > 0
          ? Math.max(0, ((spotPerUnit - execPerUnit) / spotPerUnit) * 100)
          : 0;
        return res.status(200).json({
          quote: {
            amountOut: eulerResult.amountOut.toFixed(6),
            priceImpact: Math.min(priceImpact, 100).toFixed(4),
            fee: eulerResult.fee.toFixed(6),
            feeBps: eulerResult.feeBps,
            route: [tokenIn, tokenOut],
            pool: EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
            protocol: 'EulerSwap',
            note: 'Dual yield: swap fees + lending yield from EVK vault backing',
          },
        });
      }
    }

    if (isAxusdAxmPair && isEulerSwapDeployed()) {
      const eulerResult = await quoteFromEulerSwap(provider, EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, tokenInLower, amountInFloat);
      if (eulerResult && eulerResult.amountOut > 0) {
        const spotPerUnit = eulerResult.reserveOut / eulerResult.reserveIn;
        const execPerUnit = eulerResult.amountOut / amountInFloat;
        const priceImpact = spotPerUnit > 0
          ? Math.max(0, ((spotPerUnit - execPerUnit) / spotPerUnit) * 100)
          : 0;
        return res.status(200).json({
          quote: {
            amountOut: eulerResult.amountOut.toFixed(6),
            priceImpact: Math.min(priceImpact, 100).toFixed(4),
            fee: eulerResult.fee.toFixed(6),
            feeBps: eulerResult.feeBps,
            route: [tokenIn, tokenOut],
            pool: EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
            protocol: 'EulerSwap',
            note: 'Dual yield: swap fees + lending yield from EVK vault backing',
          },
        });
      }
    }

    return res.status(404).json({ error: 'No liquidity available for this swap.' });
  } catch (error) {
    console.error('[dex/quote] Error:', error);
    return res.status(500).json({ error: 'Failed to get swap quote' });
  }
}
