import axios from 'axios';
import { DataProvider, OHLCVBar, AssetInfo } from './DataProvider';

const BASE_URL = 'https://www.alphavantage.co/query';

const EQUITY_UNIVERSE: { symbol: string; name: string }[] = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble Co.' },
  { symbol: 'HD', name: 'Home Depot Inc.' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
  { symbol: 'KO', name: 'Coca-Cola Company' },
  { symbol: 'LLY', name: 'Eli Lilly and Company' },
  { symbol: 'AVGO', name: 'Broadcom Inc.' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation' },
  { symbol: 'ABBV', name: 'AbbVie Inc.' },
  { symbol: 'BAC', name: 'Bank of America Corporation' },
  { symbol: 'NEE', name: 'NextEra Energy Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.' },
  { symbol: 'CAT', name: 'Caterpillar Inc.' },
  { symbol: 'GS', name: 'Goldman Sachs Group Inc.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'PLD', name: 'Prologis Inc.' },
  { symbol: 'COIN', name: 'Coinbase Global Inc.' },
  { symbol: 'GE', name: 'General Electric Company' },
  { symbol: 'BX', name: 'Blackstone Inc.' },
];



function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AlphaVantageProvider implements DataProvider {
  name = 'AlphaVantage';

  private get apiKey(): string {
    return process.env.ALPHA_VANTAGE_API_KEY ?? '';
  }

  async getUniverse(): Promise<AssetInfo[]> {
    return EQUITY_UNIVERSE.map((eq) => ({
      symbol: eq.symbol,
      name: eq.name,
      assetType: 'EQUITY' as const,
      venue: 'Alpha Vantage',
    }));
  }

  async fetchOHLCV(symbol: string, days: number): Promise<OHLCVBar[]> {
    try {
      if (!this.apiKey) {
        console.error('[AlphaVantageProvider] ALPHA_VANTAGE_API_KEY is not set');
        return [];
      }

      await delay(12000);

      const { data } = await axios.get(BASE_URL, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol,
          outputsize: 'compact',
          apikey: this.apiKey,
        },
      });

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        console.error(`[AlphaVantageProvider] No time series data for ${symbol}:`, data);
        return [];
      }

      const bars: OHLCVBar[] = Object.entries(timeSeries)
        .map(([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseFloat(values['5. volume']),
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, days);

      return bars;
    } catch (err) {
      console.error(`[AlphaVantageProvider] Failed to fetch OHLCV for ${symbol}:`, err);
      return [];
    }
  }
}
