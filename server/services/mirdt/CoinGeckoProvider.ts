import axios from 'axios';
import { DataProvider, OHLCVBar, AssetInfo } from './DataProvider';

const BASE_URL = 'https://api.coingecko.com/api/v3';

const SYMBOL_TO_ID: Record<string, string> = {
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

const SKIP_SYMBOLS = new Set(['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FDUSD']);

const ID_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(SYMBOL_TO_ID).map(([k, v]) => [v, k])
);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, params: object, maxRetries = 2): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data } = await axios.get(url, { params, timeout: 10000 });
      return data;
    } catch (err: any) {
      if (err?.response?.status === 429 && attempt < maxRetries - 1) {
        console.log(`[CoinGeckoProvider] Rate limited. Waiting 10s before retry ${attempt + 2}/${maxRetries}`);
        await delay(10000);
        continue;
      }
      throw err;
    }
  }
}

export class CoinGeckoProvider implements DataProvider {
  name = 'CoinGecko';

  static resolveId(symbol: string): string {
    return SYMBOL_TO_ID[symbol.toUpperCase()] ?? symbol.toLowerCase();
  }

  async getUniverse(): Promise<AssetInfo[]> {
    try {
      const data = await fetchWithRetry(`${BASE_URL}/coins/markets`, {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 20,
        page: 1,
      });

      return (data as any[])
        .map((coin) => ({
          symbol: (ID_TO_SYMBOL[coin.id] || (coin.symbol as string).toUpperCase()),
          name: coin.name as string,
          assetType: 'CRYPTO' as const,
          venue: 'CoinGecko',
        }))
        .filter((a) => !SKIP_SYMBOLS.has(a.symbol));
    } catch (err) {
      console.error('[CoinGeckoProvider] Failed to fetch universe:', (err as Error).message);
      return [];
    }
  }

  async fetchOHLCV(symbol: string, days: number): Promise<OHLCVBar[]> {
    if (SKIP_SYMBOLS.has(symbol.toUpperCase())) {
      return [];
    }
    try {
      const id = CoinGeckoProvider.resolveId(symbol);

      await delay(2500);

      const data = await fetchWithRetry(`${BASE_URL}/coins/${id}/market_chart`, {
        vs_currency: 'usd',
        days,
        interval: 'daily',
      });

      if (!data?.prices || !Array.isArray(data.prices)) {
        return [];
      }

      const prices: number[][] = data.prices;
      const volumes: number[][] = data.total_volumes || [];

      const volumeMap = new Map<string, number>();
      for (const [ts, vol] of volumes) {
        volumeMap.set(new Date(ts).toISOString().slice(0, 10), vol);
      }

      return prices.map(([timestamp, price]) => {
        const dateStr = new Date(timestamp).toISOString().slice(0, 10);
        return {
          date: dateStr,
          open: price,
          high: price * 1.005,
          low: price * 0.995,
          close: price,
          volume: volumeMap.get(dateStr) || 0,
        };
      });
    } catch (err) {
      console.error(`[CoinGeckoProvider] Failed to fetch OHLCV for ${symbol}:`, (err as Error).message);
      return [];
    }
  }
}
