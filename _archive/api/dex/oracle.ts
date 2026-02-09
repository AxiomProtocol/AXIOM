import type { NextApiRequest, NextApiResponse } from 'next';
import { dexService } from '../../../server/services/dex/DexService';
import { 
  CHAINLINK_PRICE_FEEDS,
  TOKEN_ADDRESSES,
  TOKEN_SYMBOLS,
  TRADING_PAIRS,
  FALLBACK_PRICES_USD
} from '../../../server/config/dexOracleConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, token } = req.query;

  try {
    switch (action) {
      case 'price': {
        if (!token || typeof token !== 'string') {
          return res.status(400).json({ error: 'Token address required' });
        }
        const priceData = await dexService.getTokenPriceUSD(token);
        const symbol = TOKEN_SYMBOLS[token] || 'UNKNOWN';
        
        if (!priceData) {
          const fallbackPrice = FALLBACK_PRICES_USD[token as keyof typeof FALLBACK_PRICES_USD];
          return res.json({ 
            token,
            symbol,
            price: fallbackPrice || '0',
            timestamp: Math.floor(Date.now() / 1000),
            isStale: true,
            isFallback: true
          });
        }
        
        return res.json({ 
          token,
          symbol,
          ...priceData,
          isFallback: false
        });
      }

      case 'feeds': {
        const feeds = await dexService.getAllConfiguredPriceFeeds();
        return res.json({ 
          feeds,
          oracleAdapter: dexService.getOracleAdapterAddress()
        });
      }

      case 'config': {
        return res.json({
          chainlinkFeeds: CHAINLINK_PRICE_FEEDS,
          tokenAddresses: TOKEN_ADDRESSES,
          tokenSymbols: TOKEN_SYMBOLS,
          tradingPairs: TRADING_PAIRS,
          fallbackPrices: FALLBACK_PRICES_USD,
          oracleAdapter: dexService.getOracleAdapterAddress()
        });
      }

      case 'pairs': {
        const pairsWithPrices = await Promise.all(
          TRADING_PAIRS.map(async (pair) => {
            const [priceA, priceB] = await Promise.all([
              dexService.getTokenPriceUSD(pair.tokenA),
              dexService.getTokenPriceUSD(pair.tokenB)
            ]);
            
            return {
              ...pair,
              tokenASymbol: TOKEN_SYMBOLS[pair.tokenA] || 'UNKNOWN',
              tokenBSymbol: TOKEN_SYMBOLS[pair.tokenB] || 'UNKNOWN',
              tokenAPrice: priceA?.price || FALLBACK_PRICES_USD[pair.tokenA as keyof typeof FALLBACK_PRICES_USD] || '0',
              tokenBPrice: priceB?.price || FALLBACK_PRICES_USD[pair.tokenB as keyof typeof FALLBACK_PRICES_USD] || '0',
            };
          })
        );
        
        return res.json({ pairs: pairsWithPrices });
      }

      default: {
        const feeds = await dexService.getAllConfiguredPriceFeeds();
        return res.json({
          oracleAdapter: dexService.getOracleAdapterAddress(),
          configuredFeeds: feeds.length,
          feeds: feeds.map(f => ({
            ...f,
            symbol: TOKEN_SYMBOLS[f.token] || 'UNKNOWN'
          })),
          tradingPairs: TRADING_PAIRS.length,
          availableActions: ['price', 'feeds', 'config', 'pairs']
        });
      }
    }
  } catch (error) {
    console.error('Oracle API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch oracle data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
