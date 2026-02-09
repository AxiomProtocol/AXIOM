import { CalibrationResult, RegimeState } from './types';

export class ConfidenceCalibrator {
  private a: number = -1.0;
  private b: number = 0.0;

  calibrate(pRaw: number): number {
    const logit = this.a * pRaw + this.b;
    const pCal = 1 / (1 + Math.exp(-logit));
    return parseFloat(Math.max(0.01, Math.min(0.99, pCal)).toFixed(4));
  }

  fitPlatt(predictions: number[], outcomes: number[]): void {
    if (predictions.length < 10) return;

    let a = -1.0;
    let b = 0.0;
    const lr = 0.01;
    const epochs = 200;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let gradA = 0;
      let gradB = 0;

      for (let i = 0; i < predictions.length; i++) {
        const logit = a * predictions[i] + b;
        const p = 1 / (1 + Math.exp(-logit));
        const err = p - outcomes[i];
        gradA += err * predictions[i];
        gradB += err;
      }

      a -= lr * (gradA / predictions.length);
      b -= lr * (gradB / predictions.length);
    }

    this.a = a;
    this.b = b;
  }

  computeMetrics(predictions: number[], outcomes: number[]): CalibrationResult {
    const calibrated = predictions.map(p => this.calibrate(p));

    let brierSum = 0;
    for (let i = 0; i < calibrated.length; i++) {
      brierSum += (calibrated[i] - outcomes[i]) ** 2;
    }
    const brierScore = brierSum / calibrated.length;

    const nBins = 10;
    const bins: { sumP: number; sumY: number; count: number }[] = Array.from({ length: nBins }, () => ({ sumP: 0, sumY: 0, count: 0 }));

    for (let i = 0; i < calibrated.length; i++) {
      const binIdx = Math.min(nBins - 1, Math.floor(calibrated[i] * nBins));
      bins[binIdx].sumP += calibrated[i];
      bins[binIdx].sumY += outcomes[i];
      bins[binIdx].count++;
    }

    let ece = 0;
    const reliabilityData: any[] = [];
    for (const bin of bins) {
      if (bin.count === 0) continue;
      const avgP = bin.sumP / bin.count;
      const avgY = bin.sumY / bin.count;
      ece += (bin.count / calibrated.length) * Math.abs(avgP - avgY);
      reliabilityData.push({ avgPredicted: parseFloat(avgP.toFixed(4)), avgObserved: parseFloat(avgY.toFixed(4)), count: bin.count });
    }

    return {
      modelVersion: 'sentinel-v1',
      totalSignals: predictions.length,
      calibrationMethod: 'platt',
      brierScore: parseFloat(brierScore.toFixed(6)),
      ece: parseFloat(ece.toFixed(6)),
      reliabilityJson: reliabilityData,
      regimeSplitJson: {},
    };
  }

  getParams(): { a: number; b: number } {
    return { a: this.a, b: this.b };
  }

  setParams(a: number, b: number): void {
    this.a = a;
    this.b = b;
  }
}
