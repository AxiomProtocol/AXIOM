import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const CAMELOT_PAIR = '0x266F6Cf7eA36d3f676eb292B274EAb25172790a2';
const AXUSD = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c'.toLowerCase();
const AXUSD_POOL = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C'.toLowerCase();
const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'.toLowerCase();

const PAIR_ABI = [
  'function getReserves() view returns (uint112, uint112, uint16)',
  'function token0() view returns (address)',
  'function token1() view returns (address)'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokenIn, tokenOut, amountIn } = req.query;

    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({ 
        error: 'Missing required parameters: tokenIn, tokenOut, amountIn' 
      });
    }

    const tokenInLower = (tokenIn as string).toLowerCase();
    const tokenOutLower = (tokenOut as string).toLowerCase();
    
    const isAxusdIn = tokenInLower === AXUSD || tokenInLower === AXUSD_POOL;
    const isAxusdOut = tokenOutLower === AXUSD || tokenOutLower === AXUSD_POOL;
    const isUsdcIn = tokenInLower === USDC;
    const isUsdcOut = tokenOutLower === USDC;

    if (!((isAxusdIn && isUsdcOut) || (isUsdcIn && isAxusdOut))) {
      return res.status(404).json({ 
        error: 'No route found. Only AXUSD/USDC swaps are supported.',
        supportedPairs: ['AXUSD/USDC', 'USDC/AXUSD']
      });
    }

    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
    const pair = new ethers.Contract(CAMELOT_PAIR, PAIR_ABI, provider);
    
    const [reserve0, reserve1] = await pair.getReserves();
    const token0 = await pair.token0();
    
    const isToken0Axusd = token0.toLowerCase() === AXUSD_POOL;
    const [reserveAxusd, reserveUsdc] = isToken0Axusd 
      ? [reserve0, reserve1] 
      : [reserve1, reserve0];

    const amountInFloat = parseFloat(amountIn as string);
    const feeMultiplier = 0.997;
    
    let amountOut: number;
    let priceImpact: number;
    
    if (isUsdcIn) {
      const amountInWei = amountInFloat * 1e6;
      const reserveInFloat = Number(reserveUsdc);
      const reserveOutFloat = Number(reserveAxusd) / 1e12;
      
      const amountInWithFee = amountInWei * feeMultiplier;
      const numerator = amountInWithFee * reserveOutFloat;
      const denominator = reserveInFloat + amountInWithFee;
      amountOut = numerator / denominator / 1e6;
      
      const spotPrice = reserveOutFloat / reserveInFloat;
      const executionPrice = amountOut / amountInFloat;
      priceImpact = Math.abs((spotPrice - executionPrice) / spotPrice) * 100;
    } else {
      const amountInWei = amountInFloat * 1e18;
      const reserveInFloat = Number(reserveAxusd);
      const reserveOutFloat = Number(reserveUsdc);
      
      const amountInWithFee = amountInWei * feeMultiplier;
      const numerator = amountInWithFee * reserveOutFloat;
      const denominator = reserveInFloat + amountInWithFee;
      amountOut = numerator / denominator / 1e6;
      
      const spotPrice = reserveOutFloat / reserveInFloat * 1e12;
      const executionPrice = amountOut / amountInFloat;
      priceImpact = Math.abs((spotPrice - executionPrice) / spotPrice) * 100;
    }

    const fee = amountInFloat * 0.003;

    return res.status(200).json({ 
      quote: {
        amountOut: amountOut.toFixed(6),
        priceImpact: Math.min(priceImpact, 100),
        fee: fee.toFixed(6),
        route: [tokenIn, tokenOut],
        pair: CAMELOT_PAIR,
        protocol: 'Camelot'
      }
    });
  } catch (error) {
    console.error('Error getting swap quote:', error);
    return res.status(500).json({ error: 'Failed to get swap quote' });
  }
}
