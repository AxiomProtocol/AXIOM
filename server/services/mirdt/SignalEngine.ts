import { OHLCVBar } from './DataProvider';

export interface SetupSignal {
  symbol: string;
  assetType: 'CRYPTO' | 'EQUITY';
  venue: string;
  horizonDays: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  invalidationPrice: number;
  thesisSummary: string;
  confidenceScore: number;
  signalZ: number;
  expectedP5: number;
  expectedP50: number;
  expectedP95: number;
  volatilityEstimate: number;
  liquidityNotes: string;
  rationaleTrace: object;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
  return vol.toFixed(2);
}

export class SignalEngine {
  static readonly MODEL_VERSION = 'MIRDT-TF-v1.0';

  analyzeAsset(
    symbol: string,
    assetType: 'CRYPTO' | 'EQUITY',
    venue: string,
    bars: OHLCVBar[]
  ): SetupSignal | null {
    if (bars.length < 50) return null;

    const closes = bars.map(b => b.close);
    const highs = bars.map(b => b.high);
    const lows = bars.map(b => b.low);
    const volumes = bars.map(b => b.volume);

    const currentPrice = closes[closes.length - 1];

    const sma20 = this.calcSMA(closes, 20);
    const sma50 = this.calcSMA(closes, 50);

    const previousCloses = closes.slice(0, -1);
    const previousSma20 = this.calcSMA(previousCloses, 20);
    const previousSma50 = this.calcSMA(previousCloses, 50);

    const atr14 = this.calcATR(highs, lows, closes, 14);

    const recentVolumes = volumes.slice(-20);
    if (recentVolumes.length < 20) return null;
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

    if (atr14 === 0) return null;

    const signalZ = (sma20 - sma50) / atr14;

    if (Math.abs(signalZ) <= 0.5) return null;

    const direction: 'LONG' | 'SHORT' = signalZ > 0 ? 'LONG' : 'SHORT';

    const absZ = Math.abs(signalZ);
    let horizonDays: number;
    if (absZ < 1.0) horizonDays = 1;
    else if (absZ < 1.5) horizonDays = 2;
    else if (absZ < 2.0) horizonDays = 3;
    else if (absZ < 3.0) horizonDays = 4;
    else horizonDays = 5;

    let entryZoneLow: number;
    let entryZoneHigh: number;
    let invalidationPrice: number;
    let expectedP5: number;
    let expectedP50: number;
    let expectedP95: number;

    if (direction === 'LONG') {
      entryZoneLow = currentPrice - (0.5 * atr14);
      entryZoneHigh = currentPrice + (0.25 * atr14);
      invalidationPrice = currentPrice - (2 * atr14);
      expectedP5 = currentPrice - (2.5 * atr14);
      expectedP50 = currentPrice + (signalZ * atr14 * 0.5);
      expectedP95 = currentPrice + (3 * atr14);
    } else {
      entryZoneLow = currentPrice - (0.25 * atr14);
      entryZoneHigh = currentPrice + (0.5 * atr14);
      invalidationPrice = currentPrice + (2 * atr14);
      expectedP5 = currentPrice + (2.5 * atr14);
      expectedP50 = currentPrice - (signalZ * atr14 * 0.5);
      expectedP95 = currentPrice - (3 * atr14);
    }

    const confidenceScore = Math.min(95, Math.max(25, Math.round(50 + (signalZ * 10))));
    const volatilityEstimate = atr14 / currentPrice;

    const crossDirection = direction === 'LONG' ? 'above' : 'below';
    const thesisSummary = `Short-term moving average has crossed ${crossDirection} intermediate-term average with ${confidenceScore}% signal confidence. Trend-following setup with defined invalidation level. This is a probabilistic observation, not a recommendation. Past patterns do not guarantee future outcomes.`;

    const liquidityNotes = `Average daily volume: ${formatVolume(avgVolume)}. ${assetType === 'CRYPTO' ? '24-hour digital asset market.' : 'US equity market hours.'}`;

    const rationaleTrace = {
      sma20,
      sma50,
      atr14,
      currentPrice,
      previousSma20,
      previousSma50,
      direction,
      volumeAvg: avgVolume,
      barsAnalyzed: bars.length,
      signalStrength: signalZ,
      filtersPassed: true,
    };

    return {
      symbol,
      assetType,
      venue,
      horizonDays,
      entryZoneLow,
      entryZoneHigh,
      invalidationPrice,
      thesisSummary,
      confidenceScore,
      signalZ,
      expectedP5,
      expectedP50,
      expectedP95,
      volatilityEstimate,
      liquidityNotes,
      rationaleTrace,
    };
  }

  private calcSMA(values: number[], period: number): number {
    const slice = values.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private calcATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): number {
    const trueRanges: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(hl, hc, lc));
    }
    const recent = trueRanges.slice(-period);
    if (recent.length === 0) return 0;
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }
}
