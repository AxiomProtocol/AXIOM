import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
  isEulerSwapDeployed,
} from '../../../src/config/activeContracts.generated';
import { EULER_SWAP } from '../../../shared/contracts';

const CAMELOT_PAIR = '0x266F6Cf7eA36d3f676eb292B274EAb25172790a2';
const AXUSD_ERC3643 = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'.toLowerCase();
const AXUSD_ORIG    = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c'.toLowerCase();
const USDC          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'.toLowerCase();
const AXM           = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D'.toLowerCase();
const ZERO          = '0x0000000000000000000000000000000000000000';

const CAMELOT_PAIR_ABI = [
  'function getReserves() view returns (uint112, uint112, uint16)',
  'function token0() view returns (address)',
];

const EULERSWAP_POOL_ABI = [
  'function getReserves() view returns (uint256 reserve0, uint256 reserve1)',
  'function token0() view returns (address)',
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
): Promise<{ amountOut: number; fee: number; feeBps: number } | null> {
  if (poolAddress === ZERO) return null;
  try {
    const pool = new ethers.Contract(poolAddress, EULERSWAP_POOL_ABI, provider);
    const [reserves, token0Raw] = await Promise.all([pool.getReserves(), pool.token0()]);
    let feeBps = EULER_SWAP.SWAP_FEE_BPS;
    try { feeBps = Number(await pool.fee()); } catch {}

    const feeMultiplier = 1 - feeBps / 10000;
    const token0Lower = token0Raw.toLowerCase();
    const isTokenInToken0 = tokenInLower === token0Lower || isAxusd(tokenInLower) && isAxusd(token0Lower);

    const reserveIn  = isTokenInToken0 ? Number(ethers.formatUnits(reserves[0], 6)) : Number(ethers.formatUnits(reserves[1], 6));
    const reserveOut = isTokenInToken0 ? Number(ethers.formatUnits(reserves[1], 6)) : Number(ethers.formatUnits(reserves[0], 6));

    if (reserveIn <= 0 || reserveOut <= 0) return null;
    const amountOut = ammOut(amountIn, reserveIn, reserveOut, feeMultiplier);
    const fee = amountIn * (feeBps / 10000);
    return { amountOut, fee, feeBps };
  } catch {
    return null;
  }
}

async function quoteFromCamelot(
  provider: ethers.JsonRpcProvider,
  tokenInLower: string,
  amountIn: number,
): Promise<{ amountOut: number; fee: number } | null> {
  try {
    const pair = new ethers.Contract(CAMELOT_PAIR, CAMELOT_PAIR_ABI, provider);
    const [reserves, token0Raw] = await Promise.all([pair.getReserves(), pair.token0()]);
    const token0Lower = token0Raw.toLowerCase();

    const isAxusdToken0 = isAxusd(token0Lower);
    const isTokenInAxusd = isAxusd(tokenInLower);

    let reserveIn: number;
    let reserveOut: number;
    if ((isTokenInAxusd && isAxusdToken0) || (!isTokenInAxusd && !isAxusdToken0)) {
      reserveIn  = Number(reserves[0]);
      reserveOut = Number(reserves[1]);
    } else {
      reserveIn  = Number(reserves[1]);
      reserveOut = Number(reserves[0]);
    }

    const feeMultiplier = 0.997;
    const amountInScaled = isTokenInAxusd ? amountIn * 1e18 : amountIn * 1e6;
    const amountOutRaw = ammOut(amountInScaled, reserveIn, reserveOut, feeMultiplier);
    const amountOut = isTokenInAxusd ? amountOutRaw / 1e6 : amountOutRaw / 1e12;
    const fee = amountIn * 0.003;
    return { amountOut, fee };
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
        const spotPrice = amountInFloat / eulerResult.amountOut;
        const execPrice = amountInFloat / eulerResult.amountOut;
        const priceImpact = Math.abs((spotPrice - execPrice) / spotPrice) * 100;
        return res.status(200).json({
          quote: {
            amountOut: eulerResult.amountOut.toFixed(6),
            priceImpact: Math.min(priceImpact, 100),
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
        const priceImpact = 0;
        return res.status(200).json({
          quote: {
            amountOut: eulerResult.amountOut.toFixed(6),
            priceImpact: Math.min(priceImpact, 100),
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

    if (isAxusdUsdcPair) {
      const camelotResult = await quoteFromCamelot(provider, tokenInLower, amountInFloat);
      if (camelotResult) {
        return res.status(200).json({
          quote: {
            amountOut: camelotResult.amountOut.toFixed(6),
            priceImpact: 0,
            fee: camelotResult.fee.toFixed(6),
            feeBps: 30,
            route: [tokenIn, tokenOut],
            pair: CAMELOT_PAIR,
            protocol: 'Camelot',
            note: isEulerSwapDeployed() ? 'Routed via Camelot (EulerSwap returned insufficient liquidity)' : 'Routed via Camelot (EulerSwap pools pending deployment)',
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
