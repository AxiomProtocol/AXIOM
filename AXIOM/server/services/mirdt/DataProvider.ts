export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AssetInfo {
  symbol: string;
  name: string;
  assetType: 'CRYPTO' | 'EQUITY';
  venue: string;
}

export interface DataProvider {
  name: string;
  fetchOHLCV(symbol: string, days: number): Promise<OHLCVBar[]>;
  getUniverse(): Promise<AssetInfo[]>;
}
