import type { NextApiRequest, NextApiResponse } from 'next';
import dexService from '../../../server/services/dex/DexService';

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

    const quote = await dexService.getSwapQuote(
      tokenIn as string,
      tokenOut as string,
      amountIn as string
    );

    if (!quote) {
      return res.status(404).json({ error: 'No route found for this swap' });
    }

    return res.status(200).json({ quote });
  } catch (error) {
    console.error('Error getting swap quote:', error);
    return res.status(500).json({ error: 'Failed to get swap quote' });
  }
}
