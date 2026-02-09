import { RegimeState, RegimeSnapshot } from './types';

interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class RegimeEngine {
  classify(bars: OHLCVBar[]): RegimeSnapshot {
    if (bars.length < 50) {
      return this.defaultSnapshot();
    }

    const closes = bars.map(b => b.close);
    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);

    const sma20Prev = this.sma(closes.slice(0, -5), 20);
    const sma50Prev = this.sma(closes.slice(0, -5), 50);

    const sma20Slope = (sma20 - sma20Prev) / sma20Prev;
    const sma50Slope = (sma50 - sma50Prev) / sma50Prev;

    const returns20 = this.returns(closes, 20);
    const returns50 = this.returns(closes, 50);
    const vol20 = this.stddev(returns20);
    const vol50 = this.stddev(returns50);
    const volRatio = vol50 > 0 ? vol20 / vol50 : 1;

    const currentPrice = closes[closes.length - 1];
    const aboveSma20 = currentPrice > sma20;
    const aboveSma50 = currentPrice > sma50;
    const sma20AboveSma50 = sma20 > sma50;

    let breadthScore = 0;
    if (aboveSma20) breadthScore += 0.33;
    if (aboveSma50) breadthScore += 0.33;
    if (sma20AboveSma50) breadthScore += 0.34;

    let regime: RegimeState;
    let confidence: number;

    if (vol20 > 0.03 && volRatio > 1.5) {
      regime = 'HIGH_VOL_DISLOCATION';
      confidence = Math.min(0.95, volRatio / 2.5);
    } else if (sma20AboveSma50 && sma20Slope > 0 && sma50Slope > 0 && breadthScore >= 0.66) {
      regime = 'TREND_UP';
      confidence = Math.min(0.95, breadthScore * 1.2);
    } else if (!sma20AboveSma50 && sma20Slope < 0 && sma50Slope < 0 && breadthScore <= 0.34) {
      regime = 'TREND_DOWN';
      confidence = Math.min(0.95, (1 - breadthScore) * 1.2);
    } else {
      regime = 'RANGE_LOW_VOL';
      confidence = Math.min(0.95, 1 - Math.abs(breadthScore - 0.5) * 2);
    }

    return {
      regime,
      confidence: parseFloat(confidence.toFixed(4)),
      sma20Slope: parseFloat(sma20Slope.toFixed(6)),
      sma50Slope: parseFloat(sma50Slope.toFixed(6)),
      volatility20d: parseFloat(vol20.toFixed(4)),
      volatilityRatio: parseFloat(volRatio.toFixed(4)),
      breadthScore: parseFloat(breadthScore.toFixed(4)),
      snapshotJson: { sma20, sma50, currentPrice, aboveSma20, aboveSma50, sma20AboveSma50 }
    };
  }

  private defaultSnapshot(): RegimeSnapshot {
    return {
      regime: 'RANGE_LOW_VOL',
      confidence: 0.5,
      sma20Slope: 0,
      sma50Slope: 0,
      volatility20d: 0,
      volatilityRatio: 1,
      breadthScore: 0.5,
    };
  }

  private sma(data: number[], period: number): number {
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private returns(data: number[], period: number): number[] {
    const slice = data.slice(-period - 1);
    const ret: number[] = [];
    for (let i = 1; i < slice.length; i++) {
      ret.push((slice[i] - slice[i - 1]) / slice[i - 1]);
    }
    return ret;
  }

  private stddev(data: number[]): number {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const sq = data.map(d => (d - mean) ** 2);
    return Math.sqrt(sq.reduce((a, b) => a + b, 0) / data.length);
  }
}
