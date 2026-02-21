import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

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
const CACHE_TTL_MS = parseInt(process.env.PRICES_CACHE_TTL_SECONDS || '60', 10) * 1000;

function getCached(key: string): CacheEntry | null {
  const entry = priceCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry;
}

function getStale(key: string): CacheEntry | null {
  return priceCache.get(key) || null;
}

function setCache(key: string, price: number): void {
  priceCache.set(key, { price, fetchedAt: Date.now() });
}

async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  const id = SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()];
  if (!id) return null;
  try {
    const { data } = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: { ids: id, vs_currencies: 'usd' },
      timeout: 8000,
    });
    return data?.[id]?.usd ?? null;
  } catch {
    return null;
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

async function fetchBatchCryptoPrices(symbols: string[]): Promise<Record<string, number>> {
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

interface PriceResult {
  symbol: string;
  price: number | null;
  cached: boolean;
  stale: boolean;
  fetchedAt: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-cache');

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
    const cached = getCached(sym);
    if (cached) {
      results.push({
        symbol: sym,
        price: cached.price,
        cached: true,
        stale: false,
        fetchedAt: new Date(cached.fetchedAt).toISOString(),
      });
    } else if (symbolTypeMap[sym] === 'CRYPTO') {
      cryptoToFetch.push(sym);
    } else {
      equityToFetch.push(sym);
    }
  }

  if (cryptoToFetch.length > 0) {
    const batchPrices = await fetchBatchCryptoPrices(cryptoToFetch);
    for (const sym of cryptoToFetch) {
      const price = batchPrices[sym] ?? null;
      if (price !== null) {
        setCache(sym, price);
        results.push({ symbol: sym, price, cached: false, stale: false, fetchedAt: new Date().toISOString() });
      } else {
        const stale = getStale(sym);
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

  for (const sym of equityToFetch) {
    const price = await fetchEquityPrice(sym);
    if (price !== null) {
      setCache(sym, price);
      results.push({ symbol: sym, price, cached: false, stale: false, fetchedAt: new Date().toISOString() });
    } else {
      const stale = getStale(sym);
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
