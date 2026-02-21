import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Mapping from ticker symbol to CoinGecko coin ID.
 * To add a new crypto symbol: add an entry here, e.g. { SOL: 'solana' }.
 * CoinGecko IDs can be looked up at https://www.coingecko.com/en/api/documentation
 */
const CRYPTO_IDS: Record<string, string> = {
  ADA: 'cardano',
  DOGE: 'dogecoin',
  LINK: 'chainlink',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  UNI: 'uniswap',
  MATIC: 'matic-network',
};

const CRYPTO_SYMBOL_SET = new Set(Object.keys(CRYPTO_IDS));

// ── Types ──────────────────────────────────────────────────────────────────

interface PriceEntry {
  price: number;
  currency: string;
  assetType: 'equity' | 'crypto';
  asOf: string;
}

interface PricesResponse {
  asOf: string;
  source: string;
  prices: Record<string, PriceEntry>;
  stale: boolean;
}

interface CacheEntry {
  data: PricesResponse;
  expiresAt: number;
}

// ── In-memory cache ────────────────────────────────────────────────────────
// Module-level singleton; survives across requests within the same Node process.
const priceCache = new Map<string, CacheEntry>();

function getCacheKey(symbols: string[]): string {
  return [...symbols].sort().join(',');
}

function getCacheTtlMs(): number {
  const raw = process.env.PRICES_CACHE_TTL_SECONDS;
  const parsed = raw ? parseInt(raw, 10) : 15;
  const seconds = isNaN(parsed) || parsed < 1 ? 15 : parsed;
  return seconds * 1000;
}

// ── Upstream fetchers ──────────────────────────────────────────────────────

async function fetchEquityPrice(
  symbol: string,
  apiKey: string
): Promise<number | null> {
  const url =
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE` +
    `&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data: any = await res.json();
  const price = parseFloat(data?.['Global Quote']?.['05. price'] ?? '');
  return isNaN(price) ? null : price;
}

async function fetchCryptoPrices(
  coinIds: string[]
): Promise<Record<string, number>> {
  const ids = coinIds.join(',');
  const url =
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return {};
  const data: any = await res.json();
  const result: Record<string, number> = {};
  for (const [id, val] of Object.entries(data)) {
    const price = (val as any)?.usd;
    if (typeof price === 'number') result[id] = price;
  }
  return result;
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const symbolsParam = req.query.symbols;
  if (!symbolsParam || typeof symbolsParam !== 'string') {
    return res
      .status(400)
      .json({ error: 'symbols query parameter is required' });
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return res.status(400).json({ error: 'At least one symbol is required' });
  }

  const cacheKey = getCacheKey(symbols);
  const ttlMs = getCacheTtlMs();
  const now = Date.now();

  // Serve fresh cache hit immediately
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return res.status(200).json(cached.data);
  }

  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    // No API key configured — serve stale cache or fail
    if (cached) {
      return res.status(200).json({ ...cached.data, stale: true });
    }
    return res
      .status(502)
      .json({ error: 'ALPHAVANTAGE_API_KEY is not configured' });
  }

  try {
    const equitySymbols = symbols.filter((s) => !CRYPTO_SYMBOL_SET.has(s));
    const cryptoSymbols = symbols.filter((s) => CRYPTO_SYMBOL_SET.has(s));
    const asOf = new Date().toISOString();
    const prices: Record<string, PriceEntry> = {};

    // Equities — sequential to stay within AlphaVantage free-tier rate limit
    for (const symbol of equitySymbols) {
      try {
        const price = await fetchEquityPrice(symbol, apiKey);
        if (price !== null) {
          prices[symbol] = {
            price,
            currency: 'USD',
            assetType: 'equity',
            asOf,
          };
        }
      } catch {
        // Skip individual equity failures; serve what we have
      }
    }

    // Crypto — single batched request to CoinGecko (no key required)
    if (cryptoSymbols.length > 0) {
      const coinIds = cryptoSymbols
        .map((s) => CRYPTO_IDS[s])
        .filter(Boolean);
      if (coinIds.length > 0) {
        try {
          const cryptoPrices = await fetchCryptoPrices(coinIds);
          for (const symbol of cryptoSymbols) {
            const coinId = CRYPTO_IDS[symbol];
            if (coinId && cryptoPrices[coinId] !== undefined) {
              prices[symbol] = {
                price: cryptoPrices[coinId],
                currency: 'USD',
                assetType: 'crypto',
                asOf,
              };
            }
          }
        } catch {
          // Skip crypto batch failure
        }
      }
    }

    const response: PricesResponse = {
      asOf,
      source: 'hybrid',
      prices,
      stale: false,
    };

    priceCache.set(cacheKey, { data: response, expiresAt: now + ttlMs });
    return res.status(200).json(response);
  } catch (err: any) {
    // Upstream failure — serve stale cache if available, otherwise 502
    if (cached) {
      return res.status(200).json({ ...cached.data, stale: true });
    }
    return res
      .status(502)
      .json({ error: 'Failed to fetch prices', details: err?.message });
  }
}
