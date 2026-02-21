import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2',
  DOT: 'polkadot', LINK: 'chainlink', MATIC: 'matic-network', UNI: 'uniswap',
  SHIB: 'shiba-inu', LTC: 'litecoin', ATOM: 'cosmos', NEAR: 'near',
  FIL: 'filecoin', APT: 'aptos', ARB: 'arbitrum', OP: 'optimism',
};

interface VolCacheEntry {
  atr14: number;
  volRatio: number;
  approx: boolean;
  asOf: string;
  cachedAt: number;
}

const volCache = new Map<string, VolCacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function getCached(key: string): VolCacheEntry | null {
  const entry = volCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
  return entry;
}

function getStale(key: string): VolCacheEntry | null {
  return volCache.get(key) || null;
}

function setCache(key: string, entry: Omit<VolCacheEntry, 'cachedAt'>): void {
  volCache.set(key, { ...entry, cachedAt: Date.now() });
}

function computeATR(bars: { high: number; low: number; close: number }[]): number | null {
  if (bars.length < 15) return null;

  const sorted = [...bars].slice(0, 30);
  const trueRanges: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const high = sorted[i].high;
    const low = sorted[i].low;
    const prevClose = sorted[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  if (trueRanges.length < 14) return null;

  let atr = trueRanges.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
  for (let i = 14; i < trueRanges.length; i++) {
    atr = (atr * 13 + trueRanges[i]) / 14;
  }

  return atr;
}

async function fetchEquityVol(symbol: string): Promise<Omit<VolCacheEntry, 'cachedAt'> | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  try {
    const { data } = await axios.get(ALPHA_VANTAGE_BASE, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol.toUpperCase(),
        outputsize: 'compact',
        apikey: apiKey,
      },
      timeout: 10000,
    });

    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) return null;

    const bars = Object.entries(timeSeries)
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .slice(-30)
      .map(([, values]: [string, any]) => ({
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
      }));

    const atr14 = computeATR(bars);
    if (atr14 === null || bars.length === 0) return null;

    const lastClose = bars[bars.length - 1].close;
    const volRatio = lastClose > 0 ? atr14 / lastClose : 0;

    return {
      atr14: Math.round(atr14 * 10000) / 10000,
      volRatio: Math.round(volRatio * 10000) / 10000,
      approx: false,
      asOf: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchCryptoVolFallback(symbol: string): Promise<Omit<VolCacheEntry, 'cachedAt'> | null> {
  const id = SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const { data } = await axios.get(`${COINGECKO_BASE}/coins/${id}/market_chart`, {
      params: { vs_currency: 'usd', days: 30, interval: 'daily' },
      timeout: 10000,
    });

    if (!data?.prices || data.prices.length < 15) return null;

    const prices: number[][] = data.prices;
    const deltas: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      deltas.push(Math.abs(prices[i][1] - prices[i - 1][1]));
    }

    if (deltas.length < 14) return null;

    let atr = deltas.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
    for (let i = 14; i < deltas.length; i++) {
      atr = (atr * 13 + deltas[i]) / 14;
    }

    const lastClose = prices[prices.length - 1][1];
    const volRatio = lastClose > 0 ? atr / lastClose : 0;

    return {
      atr14: Math.round(atr * 10000) / 10000,
      volRatio: Math.round(volRatio * 10000) / 10000,
      approx: true,
      asOf: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchCryptoVol(symbol: string): Promise<Omit<VolCacheEntry, 'cachedAt'> | null> {
  const id = SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const { data } = await axios.get(`${COINGECKO_BASE}/coins/${id}/ohlc`, {
      params: { vs_currency: 'usd', days: 30 },
      timeout: 10000,
    });

    if (!Array.isArray(data) || data.length < 15) {
      return fetchCryptoVolFallback(symbol);
    }

    const bars = [...data]
      .sort((a: number[], b: number[]) => a[0] - b[0])
      .map((candle: number[]) => ({
        high: candle[2],
        low: candle[3],
        close: candle[4],
      }));

    const atr14 = computeATR(bars);
    if (atr14 === null || bars.length === 0) return fetchCryptoVolFallback(symbol);

    const lastClose = bars[bars.length - 1].close;
    const volRatio = lastClose > 0 ? atr14 / lastClose : 0;

    return {
      atr14: Math.round(atr14 * 10000) / 10000,
      volRatio: Math.round(volRatio * 10000) / 10000,
      approx: false,
      asOf: new Date().toISOString(),
    };
  } catch {
    return fetchCryptoVolFallback(symbol);
  }
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

  const vol: Record<string, { atr14: number; volRatio: number; approx: boolean; asOf: string }> = {};

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const assetType = types[i] || (SYMBOL_TO_COINGECKO_ID[sym] ? 'CRYPTO' : 'EQUITY');

    const cached = getCached(sym);
    if (cached) {
      vol[sym] = { atr14: cached.atr14, volRatio: cached.volRatio, approx: cached.approx, asOf: cached.asOf };
      continue;
    }

    const result = assetType === 'CRYPTO' ? await fetchCryptoVol(sym) : await fetchEquityVol(sym);
    if (result) {
      setCache(sym, result);
      vol[sym] = { atr14: result.atr14, volRatio: result.volRatio, approx: result.approx, asOf: result.asOf };
    } else {
      const stale = getStale(sym);
      if (stale) {
        vol[sym] = { atr14: stale.atr14, volRatio: stale.volRatio, approx: stale.approx, asOf: stale.asOf };
      }
    }
  }

  return res.status(200).json({ asOf: new Date().toISOString(), vol });
}
