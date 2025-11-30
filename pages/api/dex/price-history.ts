import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const EXCHANGE_HUB_ADDRESS = '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D';
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

const SWAP_EVENT_ABI = [
  'event Swap(uint256 indexed swapId, uint256 indexed poolId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 fee)'
];

interface PricePoint {
  time: number;
  value?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { poolId, period = '24h' } = req.query;
    
    if (!poolId) {
      return res.status(400).json({ error: 'poolId is required' });
    }

    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, SWAP_EVENT_ABI, provider);

    const periodSeconds: Record<string, number> = {
      '1h': 3600,
      '24h': 86400,
      '7d': 604800,
      '30d': 2592000,
      'all': 2592000 * 12
    };

    const seconds = periodSeconds[period as string] || 86400;
    const currentBlock = await provider.getBlockNumber();
    // Arbitrum produces ~4 blocks per second (one every 0.25 seconds)
    const blocksPerSecond = 4;
    const blocksToLookBack = Math.min(Math.floor(seconds * blocksPerSecond), 2000000);
    const fromBlock = Math.max(currentBlock - blocksToLookBack, 0);

    // poolId is the second indexed parameter (after swapId)
    const filter = contract.filters.Swap(null, parseInt(poolId as string));
    
    let events: ethers.Log[] = [];
    try {
      events = await contract.queryFilter(filter, fromBlock, currentBlock);
    } catch (error) {
      console.log('No swap events found or error querying:', error);
    }

    const prices: PricePoint[] = [];
    let priceChange = { value: 0, percent: 0 };

    if (events.length > 0) {
      for (const event of events) {
        try {
          const block = await provider.getBlock(event.blockNumber);
          const parsedLog = contract.interface.parseLog({
            topics: event.topics as string[],
            data: event.data
          });

          if (parsedLog && block) {
            const amountIn = parseFloat(ethers.formatUnits(parsedLog.args.amountIn, 18));
            const amountOut = parseFloat(ethers.formatUnits(parsedLog.args.amountOut, 18));
            
            if (amountIn > 0 && amountOut > 0) {
              const price = amountOut / amountIn;
              prices.push({
                time: block.timestamp,
                value: price
              });
            }
          }
        } catch (e) {
          console.error('Error parsing event:', e);
        }
      }

      prices.sort((a, b) => a.time - b.time);

      if (prices.length >= 2) {
        const firstPrice = prices[0].value || 0;
        const lastPrice = prices[prices.length - 1].value || 0;
        const change = lastPrice - firstPrice;
        const percentChange = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
        priceChange = { value: change, percent: percentChange };
      }
    }

    res.status(200).json({
      poolId,
      period,
      prices,
      priceChange,
      dataPoints: prices.length
    });

  } catch (error) {
    console.error('Price history error:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
}
