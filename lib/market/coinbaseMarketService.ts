/**
 * Coinbase Market Data Service
 *
 * Uses the Coinbase Advanced Trade public API (no auth required for spot prices)
 * with an in-memory 30-second cache to avoid rate limits.
 *
 * Server-side only.
 */

export interface CoinbaseSpotPrice {
  productId: string;
  price: number;
  priceChange24h: number;
  priceChangePct24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  updatedAt: string;
}

export interface CoinbasePricesResult {
  prices: Record<string, CoinbaseSpotPrice>;
  isLive: boolean;
  fetchedAt: string;
  source: 'coinbase-adv-trade';
}

interface CachedResult {
  data: CoinbasePricesResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000;
const BASE_URL = 'https://api.coinbase.com/api/v3/brokerage/market/products';

let cache: CachedResult | null = null;

async function fetchProduct(productId: string): Promise<CoinbaseSpotPrice | null> {
  try {
    const res = await fetch(`${BASE_URL}/${productId}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      price?: string;
      price_percentage_change_24h?: string;
      volume_24h?: string;
      high_24h?: string;
      low_24h?: string;
    };

    const price = parseFloat(data.price ?? '0');
    const pctChange = parseFloat(data.price_percentage_change_24h ?? '0');
    const volume = parseFloat(data.volume_24h ?? '0');
    const high = parseFloat(data.high_24h ?? '0');
    const low = parseFloat(data.low_24h ?? '0');

    const priceChange24h = price / (1 + pctChange / 100) * (pctChange / 100);

    return {
      productId,
      price,
      priceChange24h,
      priceChangePct24h: pctChange,
      volume24h: volume,
      high24h: high,
      low24h: low,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getSpotPrices(
  pairs: string[] = ['ETH-USD', 'BTC-USD', 'USDC-USD']
): Promise<CoinbasePricesResult> {
  const now = Date.now();

  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  const results = await Promise.all(pairs.map(fetchProduct));

  const prices: Record<string, CoinbaseSpotPrice> = {};
  let isLive = false;

  for (const result of results) {
    if (result) {
      prices[result.productId] = result;
      isLive = true;
    }
  }

  const output: CoinbasePricesResult = {
    prices,
    isLive,
    fetchedAt: new Date().toISOString(),
    source: 'coinbase-adv-trade',
  };

  cache = { data: output, expiresAt: now + CACHE_TTL_MS };
  return output;
}
