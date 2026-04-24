import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getSpotPrices } from '../../lib/market/coinbaseMarketService';

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

const SYMBOL_TO_COINBASE_PRODUCT: Record<string, string> = {
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  SOL: 'SOL-USD',
  XRP: 'XRP-USD',
  ADA: 'ADA-USD',
  DOGE: 'DOGE-USD',
  AVAX: 'AVAX-USD',
  DOT: 'DOT-USD',
  LINK: 'LINK-USD',
  MATIC: 'MATIC-USD',
  UNI: 'UNI-USD',
  SHIB: 'SHIB-USD',
  LTC: 'LTC-USD',
  ATOM: 'ATOM-USD',
  NEAR: 'NEAR-USD',
  FIL: 'FIL-USD',
  APT: 'APT-USD',
  ARB: 'ARB-USD',
  OP: 'OP-USD',
};

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  UNI: 'uniswap',
  SHIB: 'shiba-inu',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  NEAR: 'near',
  FIL: 'filecoin',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
};

interface CacheEntry {
  price: number;
  fetchedAt: number;
}

const priceCache = new Map<string, CacheEntry>();
const parsedTtl = parseInt(process.env.PRICES_CACHE_TTL_SECONDS || '60', 10);
const CACHE_TTL_MS = (isNaN(parsedTtl) || parsedTtl <= 0 ? 60 : parsedTtl) * 1000;

function getCached(key: string): CacheEntry | null {
  const entry = priceCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry;
}

function pruneExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of priceCache) {
    if (now - entry.fetchedAt > CACHE_TTL_MS * 10) {
      priceCache.delete(key);
    }
  }
}

function getStale(key: string): CacheEntry | null {
  return priceCache.get(key) || null;
}

function setCache(key: string, price: number): void {
  priceCache.set(key, { price, fetchedAt: Date.now() });
}

async function fetchCoinbaseBatch(symbols: string[]): Promise<Record<string, number>> {
  const productIds = symbols
    .map(s => SYMBOL_TO_COINBASE_PRODUCT[s.toUpperCase()])
    .filter((p): p is string => Boolean(p));
  if (productIds.length === 0) return {};
  try {
    const result = await getSpotPrices(productIds);
    const prices: Record<string, number> = {};
    for (const sym of symbols) {
      const productId = SYMBOL_TO_COINBASE_PRODUCT[sym.toUpperCase()];
      if (productId && result.prices[productId]) {
        prices[sym.toUpperCase()] = result.prices[productId].price;
      }
    }
    return prices;
  } catch {
    return {};
  }
}

async function fetchCoingeckoBatch(symbols: string[]): Promise<Record<string, number>> {
  const ids = symbols
    .map((s) => SYMBOL_TO_COINGECKO_ID[s.toUpperCase()])
    .filter(Boolean);
  if (ids.length === 0) return {};
  try {
    const { data } = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: { ids: ids.join(','), vs_currencies: 'usd' },
      timeout: 10000,
    });
    const result: Record<string, number> = {};
    for (const sym of symbols) {
      const id = SYMBOL_TO_COINGECKO_ID[sym.toUpperCase()];
      if (id && data?.[id]?.usd) {
        result[sym.toUpperCase()] = data[id].usd;
      }
    }
    return result;
  } catch {
    return {};
  }
}

async function fetchEquityPrice(symbol: string): Promise<number | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;
  try {
    const { data } = await axios.get(ALPHA_VANTAGE_BASE, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol.toUpperCase(),
        apikey: apiKey,
      },
      timeout: 8000,
    });
    const quote = data?.['Global Quote'];
    if (!quote) return null;
    const price = parseFloat(quote['05. price']);
    return isNaN(price) ? null : price;
  } catch {
    return null;
  }
}

interface PriceResult {
  symbol: string;
  price: number | null;
  cached: boolean;
  stale: boolean;
  fetchedAt: string | null;
  source?: 'coinbase' | 'coingecko' | 'alpha-vantage' | 'cache';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-cache');
  pruneExpiredCache();

  const rawSymbols = req.query.symbols;
  if (!rawSymbols || typeof rawSymbols !== 'string') {
    return res.status(400).json({ error: 'Missing ?symbols=SYM1,SYM2&types=CRYPTO,EQUITY' });
  }

  const rawTypes = (req.query.types as string) || '';
  const symbols = rawSymbols.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 20);
  const types = rawTypes.split(',').map((t) => t.trim().toUpperCase());

  const symbolTypeMap: Record<string, string> = {};
  symbols.forEach((s, i) => {
    symbolTypeMap[s] = types[i] || (SYMBOL_TO_COINGECKO_ID[s] ? 'CRYPTO' : 'EQUITY');
  });

  const results: PriceResult[] = [];
  const cryptoToFetch: string[] = [];
  const equityToFetch: string[] = [];

  for (const sym of symbols) {
    const cacheKey = `${symbolTypeMap[sym]}:${sym}`;
    const cached = getCached(cacheKey);
    if (cached) {
      results.push({
        symbol: sym,
        price: cached.price,
        cached: true,
        stale: false,
        fetchedAt: new Date(cached.fetchedAt).toISOString(),
        source: 'cache',
      });
    } else if (symbolTypeMap[sym] === 'CRYPTO') {
      cryptoToFetch.push(sym);
    } else {
      equityToFetch.push(sym);
    }
  }

  if (cryptoToFetch.length > 0) {
    const coinbasePrices = await fetchCoinbaseBatch(cryptoToFetch);
    const stillMissing: string[] = [];
    for (const sym of cryptoToFetch) {
      if (coinbasePrices[sym] !== undefined) {
        const cacheKey = `CRYPTO:${sym}`;
        setCache(cacheKey, coinbasePrices[sym]);
        results.push({
          symbol: sym,
          price: coinbasePrices[sym],
          cached: false,
          stale: false,
          fetchedAt: new Date().toISOString(),
          source: 'coinbase',
        });
      } else {
        stillMissing.push(sym);
      }
    }

    if (stillMissing.length > 0) {
      const coingeckoPrices = await fetchCoingeckoBatch(stillMissing);
      for (const sym of stillMissing) {
        const cacheKey = `CRYPTO:${sym}`;
        const price = coingeckoPrices[sym] ?? null;
        if (price !== null) {
          setCache(cacheKey, price);
          results.push({ symbol: sym, price, cached: false, stale: false, fetchedAt: new Date().toISOString(), source: 'coingecko' });
        } else {
          const stale = getStale(cacheKey);
          results.push({
            symbol: sym,
            price: stale?.price ?? null,
            cached: false,
            stale: !!stale,
            fetchedAt: stale ? new Date(stale.fetchedAt).toISOString() : null,
          });
        }
      }
    }
  }

  for (const sym of equityToFetch) {
    const cacheKey = `EQUITY:${sym}`;
    const price = await fetchEquityPrice(sym);
    if (price !== null) {
      setCache(cacheKey, price);
      results.push({ symbol: sym, price, cached: false, stale: false, fetchedAt: new Date().toISOString(), source: 'alpha-vantage' });
    } else {
      const stale = getStale(cacheKey);
      results.push({
        symbol: sym,
        price: stale?.price ?? null,
        cached: false,
        stale: !!stale,
        fetchedAt: stale ? new Date(stale.fetchedAt).toISOString() : null,
      });
    }
  }

  return res.status(200).json({
    prices: results,
    timestamp: new Date().toISOString(),
  });
}
