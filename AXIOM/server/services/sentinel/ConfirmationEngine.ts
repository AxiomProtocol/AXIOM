import { SignalEvent, ConfirmationResult } from './types';

interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class ConfirmationEngine {
  evaluate(signal: SignalEvent, bars: OHLCVBar[]): ConfirmationResult {
    if (bars.length < 20) {
      return this.failResult('Insufficient data');
    }

    const multiTF = this.checkMultiTimeframeAlignment(signal, bars);
    const persistence = this.checkSignalPersistence(signal, bars);
    const volumeOk = this.checkVolumeConfirmation(bars);
    const rrOk = this.checkRiskReward(signal);
    const liqOk = this.checkLiquidity(bars);

    let score = 0;
    if (multiTF) score += 0.25;
    if (persistence >= 3) score += 0.25;
    if (volumeOk) score += 0.20;
    if (rrOk) score += 0.20;
    if (liqOk) score += 0.10;

    return {
      score: parseFloat(score.toFixed(4)),
      multiTimeframeAligned: multiTF,
      signalPersistence: persistence,
      volumeConfirmed: volumeOk,
      riskRewardAcceptable: rrOk,
      liquidityAdequate: liqOk,
      details: {
        multiTF,
        persistence,
        volumeOk,
        rrOk,
        liqOk,
      },
    };
  }

  private checkMultiTimeframeAlignment(signal: SignalEvent, bars: OHLCVBar[]): boolean {
    const closes = bars.map(b => b.close);
    const sma10 = this.sma(closes, 10);
    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);

    if (signal.direction === 'LONG') {
      return sma10 > sma20 && sma20 > sma50;
    } else if (signal.direction === 'SHORT') {
      return sma10 < sma20 && sma20 < sma50;
    }
    return false;
  }

  private checkSignalPersistence(signal: SignalEvent, bars: OHLCVBar[]): number {
    const closes = bars.slice(-10).map(b => b.close);
    let count = 0;

    for (let i = closes.length - 1; i >= 1; i--) {
      if (signal.direction === 'LONG' && closes[i] > closes[i - 1]) {
        count++;
      } else if (signal.direction === 'SHORT' && closes[i] < closes[i - 1]) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private checkVolumeConfirmation(bars: OHLCVBar[]): boolean {
    const volumes = bars.map(b => b.volume);
    const avgVol20 = this.sma(volumes, 20);
    const recentVol = this.sma(volumes.slice(-5), 5);
    return recentVol > avgVol20 * 1.1;
  }

  private checkRiskReward(signal: SignalEvent): boolean {
    const risk = Math.abs(signal.entryMid - signal.invalidationLevel);
    if (risk === 0) return false;
    const potentialReward = signal.entryZoneHigh - signal.entryZoneLow;
    const rr = potentialReward > 0 ? (potentialReward * 2) / risk : 0;
    return rr >= 1.5;
  }

  private checkLiquidity(bars: OHLCVBar[]): boolean {
    const volumes = bars.slice(-5).map(b => b.volume);
    const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    return avgVol > 0;
  }

  private sma(data: number[], period: number): number {
    const slice = data.slice(-period);
    if (slice.length === 0) return 0;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private failResult(reason: string): ConfirmationResult {
    return {
      score: 0,
      multiTimeframeAligned: false,
      signalPersistence: 0,
      volumeConfirmed: false,
      riskRewardAcceptable: false,
      liquidityAdequate: false,
      details: { error: reason },
    };
  }
}
