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
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'MA', name: 'Mastercard Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble Co.' },
  { symbol: 'HD', name: 'Home Depot Inc.' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
  { symbol: 'CVX', name: 'Chevron Corporation' },
  { symbol: 'KO', name: 'Coca-Cola Company' },
  { symbol: 'PEP', name: 'PepsiCo Inc.' },
  { symbol: 'ABBV', name: 'AbbVie Inc.' },
  { symbol: 'MRK', name: 'Merck & Co. Inc.' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation' },
  { symbol: 'AVGO', name: 'Broadcom Inc.' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.' },
  { symbol: 'MCD', name: "McDonald's Corporation" },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.' },
  { symbol: 'ACN', name: 'Accenture plc' },
  { symbol: 'ABT', name: 'Abbott Laboratories' },
  { symbol: 'DHR', name: 'Danaher Corporation' },
  { symbol: 'LIN', name: 'Linde plc' },
  { symbol: 'TXN', name: 'Texas Instruments Inc.' },
  { symbol: 'NEE', name: 'NextEra Energy Inc.' },
  { symbol: 'AMGN', name: 'Amgen Inc.' },
  { symbol: 'PM', name: 'Philip Morris International Inc.' },
  { symbol: 'UNP', name: 'Union Pacific Corporation' },
  { symbol: 'RTX', name: 'RTX Corporation' },
  { symbol: 'LOW', name: "Lowe's Companies Inc." },
  { symbol: 'HON', name: 'Honeywell International Inc.' },
  { symbol: 'QCOM', name: 'Qualcomm Inc.' },
  { symbol: 'LLY', name: 'Eli Lilly and Company' },
  { symbol: 'CAT', name: 'Caterpillar Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'COP', name: 'ConocoPhillips' },
  { symbol: 'GE', name: 'General Electric Company' },
  { symbol: 'MU', name: 'Micron Technology Inc.' },
  { symbol: 'ORCL', name: 'Oracle Corporation' },
  { symbol: 'LRCX', name: 'Lam Research Corporation' },
  { symbol: 'AMAT', name: 'Applied Materials Inc.' },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.' },
  { symbol: 'WFC', name: 'Wells Fargo & Company' },
  { symbol: 'BAC', name: 'Bank of America Corporation' },
  { symbol: 'GS', name: 'Goldman Sachs Group Inc.' },
  { symbol: 'MS', name: 'Morgan Stanley' },
  { symbol: 'ADBE', name: 'Adobe Inc.' },
  { symbol: 'AXP', name: 'American Express Company' },
  { symbol: 'CHTR', name: 'Charter Communications Inc.' },
  { symbol: 'CMCSA', name: 'Comcast Corporation' },
  { symbol: 'OKE', name: 'ONEOK Inc.' },
  { symbol: 'KIM', name: 'Kimco Realty Corporation' },
  { symbol: 'SBUX', name: 'Starbucks Corporation' },
  { symbol: 'PLD', name: 'Prologis Inc.' },
  { symbol: 'TJX', name: 'The TJX Companies Inc.' },
  { symbol: 'EQIX', name: 'Equinix Inc.' },
  { symbol: 'SYK', name: 'Stryker Corporation' },
  { symbol: 'CCI', name: 'Crown Castle International' },
  { symbol: 'SPGI', name: 'S&P Global Inc.' },
  { symbol: 'INTU', name: 'Intuit Inc.' },
  { symbol: 'BDX', name: 'Becton Dickinson and Company' },
  { symbol: 'GILD', name: 'Gilead Sciences Inc.' },
  { symbol: 'BKNG', name: 'Booking Holdings Inc.' },
  { symbol: 'SNPS', name: 'Synopsys Inc.' },
  { symbol: 'CDNS', name: 'Cadence Design Systems Inc.' },
  { symbol: 'ADI', name: 'Analog Devices Inc.' },
  { symbol: 'ADP', name: 'Automatic Data Processing Inc.' },
  { symbol: 'VRTX', name: 'Vertex Pharmaceuticals Inc.' },
  { symbol: 'MSCI', name: 'MSCI Inc.' },
  { symbol: 'ILMN', name: 'Illumina Inc.' },
  { symbol: 'ROP', name: 'Roper Technologies Inc.' },
  { symbol: 'PCAR', name: 'Paccar Inc.' },
  { symbol: 'BMY', name: 'Bristol Myers Squibb Company' },
  { symbol: 'PAYX', name: 'Paychex Inc.' },
  { symbol: 'REGN', name: 'Regeneron Pharmaceuticals Inc.' },
  { symbol: 'KLAC', name: 'KLA Corporation' },
  { symbol: 'MAR', name: 'Marriott International Inc.' },
  { symbol: 'MOV', name: 'Moody\'s Corporation' },
  { symbol: 'DLTR', name: 'Dollar Tree Inc.' },
  { symbol: 'DXCM', name: 'DexCom Inc.' },
  { symbol: 'PZZA', name: 'Papa John\'s International Inc.' },
  { symbol: 'CTAS', name: 'Cintas Corporation' },
  { symbol: 'OPAL', name: 'Opal Fuels Inc.' },
  { symbol: 'GDDY', name: 'GoDaddy Inc.' },
  { symbol: 'CRL', name: 'Charles River Laboratories Inc.' },
  { symbol: 'MTB', name: 'M&T Bank Corporation' },
  { symbol: 'VEEV', name: 'Veeva Systems Inc.' },
  { symbol: 'CPRT', name: 'Copart Inc.' },
  { symbol: 'JBHT', name: 'J.B. Hunt Transport Services Inc.' },
  { symbol: 'TROW', name: 'T. Rowe Price Group Inc.' },
  { symbol: 'ALGN', name: 'Align Technology Inc.' },
  { symbol: 'BX', name: 'Blackstone Inc.' },
  { symbol: 'GWW', name: 'W.W. Grainger Inc.' },
  { symbol: 'MSTR', name: 'MicroStrategy Inc.' },
  { symbol: 'EVRG', name: 'Evergy Inc.' },
  { symbol: 'IQV', name: 'IQVIA Holdings Inc.' },
  { symbol: 'HWM', name: 'Howmet Aerospace Inc.' },
  { symbol: 'ALLE', name: 'Allegion plc' },
  { symbol: 'CHKP', name: 'Check Point Software Technologies Ltd.' },
  { symbol: 'ZTS', name: 'Zoetis Inc.' },
  { symbol: 'DTM', name: 'Daktronics Inc.' },
  { symbol: 'WST', name: 'West Pharmaceutical Services Inc.' },
  { symbol: 'MPLX', name: 'MPLX LP' },
  { symbol: 'SMCI', name: 'Super Micro Computer Inc.' },
  { symbol: 'LPLA', name: 'LPL Financial Holdings Inc.' },
  { symbol: 'SWKS', name: 'Skyworks Solutions Inc.' },
  { symbol: 'ENTG', name: 'Entegris Inc.' },
  { symbol: 'GIS', name: 'General Mills Inc.' },
  { symbol: 'CHX', name: 'Chengdu Chint Electric Co., Ltd.' },
  { symbol: 'APOG', name: 'Apogee Enterprises Inc.' },
  { symbol: 'FCX', name: 'Freeport-McMoran Inc.' },
  { symbol: 'SLB', name: 'Schlumberger NV' },
  { symbol: 'TECH', name: 'Bio-Techne Corporation' },
  { symbol: 'KEX', name: 'Kirby Corporation' },
  { symbol: 'AKAM', name: 'Akamai Technologies Inc.' },
  { symbol: 'APH', name: 'Amphenol Corporation' },
  { symbol: 'MAN', name: 'ManpowerGroup Inc.' },
  { symbol: 'MCHP', name: 'Microchip Technology Inc.' },
  { symbol: 'CMS', name: 'CMS Energy Corporation' },
  { symbol: 'RMD', name: 'ResMed Inc.' },
  { symbol: 'ADSK', name: 'Autodesk Inc.' },
  { symbol: 'CTSH', name: 'Cognizant Technology Solutions' },
  { symbol: 'PH', name: 'Parker Hannifin Corporation' },
  { symbol: 'IT', name: 'Gartner Inc.' },
  { symbol: 'URI', name: 'United Rentals Inc.' },
  { symbol: 'APO', name: 'Apollo Global Management Inc.' },
  { symbol: 'KKR', name: 'KKR & Co. Inc.' },
  { symbol: 'CFG', name: 'Citizens Financial Group Inc.' },
  { symbol: 'MTD', name: 'Mettler-Toledo International Inc.' },
  { symbol: 'RBLX', name: 'Roblox Corporation' },
  { symbol: 'TRMB', name: 'Trimble Inc.' },
  { symbol: 'BKR', name: 'Baker Hughes Company' },
  { symbol: 'ATVI', name: 'Activision Blizzard Inc.' },
  { symbol: 'SSNC', name: 'SS&C Technologies Holdings Inc.' },
  { symbol: 'COIN', name: 'Coinbase Global Inc.' },
  { symbol: 'MAXX', name: 'Maxxam Inc.' },
  { symbol: 'CBOE', name: 'Cboe Global Markets Inc.' },
  { symbol: 'HSY', name: 'The Hershey Company' },
  { symbol: 'CME', name: 'CME Group Inc.' },
  { symbol: 'HBAN', name: 'Huntington Bancshares Incorporated' },
  { symbol: 'KEY', name: 'KeyCorp' },
  { symbol: 'FANG', name: 'Diamondback Energy Inc.' },
  { symbol: 'CPAY', name: 'Corpay Inc.' },
  { symbol: 'EPAM', name: 'EPAM Systems Inc.' },
  { symbol: 'EQR', name: 'Equity Residential' },
  { symbol: 'AVB', name: 'AvalonBay Communities Inc.' },
  { symbol: 'SLAB', name: 'Silicon Labs Inc.' },
  { symbol: 'ROKU', name: 'Roku Inc.' },
  { symbol: 'PRIO', name: 'Prioration Inc.' },
  { symbol: 'SMTC', name: 'Semtech Corporation' },
  { symbol: 'LSCC', name: 'Lattice Semiconductor Corporation' },
  { symbol: 'EBAY', name: 'eBay Inc.' },
  { symbol: 'EXPE', name: 'Expedia Group Inc.' },
  { symbol: 'FOXM', name: 'Fox Corporation' },
  { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)' },
  { symbol: 'ICLR', name: 'ICON Public Limited Company' },
  { symbol: 'LEG', name: 'Leggett & Platt Incorporated' },
  { symbol: 'LULU', name: 'Lululemon Athletica Inc.' },
  { symbol: 'MAID', name: 'Maidform Inc.' },
  { symbol: 'MRT', name: 'Meritage Homes Inc.' },
  { symbol: 'NETS', name: 'Nets Inc.' },
  { symbol: 'ODFL', name: 'Old Dominion Freight Line Inc.' },
  { symbol: 'OKTA', name: 'Okta Inc.' },
  { symbol: 'PAYC', name: 'Paycom Software Inc.' },
  { symbol: 'PECO', name: 'PEC Inc.' },
  { symbol: 'PEGA', name: 'Pegasystems Inc.' },
  { symbol: 'PKI', name: 'PerkinElmer Inc.' },
  { symbol: 'PRGO', name: 'Perrigo Company plc' },
  { symbol: 'PSA', name: 'Public Storage' },
  { symbol: 'PSX', name: 'Phillips 66' },
  { symbol: 'PTC', name: 'PTC Inc.' },
  { symbol: 'PZZA', name: 'Papa John\'s International Inc.' },
  { symbol: 'QRVO', name: 'Qorvo Inc.' },
  { symbol: 'REG', name: 'Regency Centers Corporation' },
  { symbol: 'REZI', name: 'Rezidor Hotel Group' },
  { symbol: 'RGEN', name: 'Repligen Corporation' },
  { symbol: 'RHI', name: 'Robert Half International Inc.' },
  { symbol: 'RLI', name: 'RLI Corp' },
  { symbol: 'RMD', name: 'ResMed Inc.' },
  { symbol: 'ROK', name: 'Rockwell Automation Inc.' },
  { symbol: 'ROME', name: 'Rome Inc.' },
  { symbol: 'RSG', name: 'Republic Services Inc.' },
  { symbol: 'RT', name: 'Raytheon Technologies Corporation' },
  { symbol: 'SAIA', name: 'SAIA Inc.' },
  { symbol: 'SAP', name: 'SAP SE' },
  { symbol: 'SCCO', name: 'Southern Copper Corporation' },
  { symbol: 'SCHO', name: 'Scholastic Corporation' },
  { symbol: 'SCOR', name: 'SCOR SE' },
  { symbol: 'SCPL', name: 'Sculptor Capital Management Inc.' },
  { symbol: 'SCVA', name: 'Scova Inc.' },
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
