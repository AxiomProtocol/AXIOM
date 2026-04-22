import { SignalEvent, PortfolioAllocation, PortfolioOutput, RegimeState } from './types';

export class PortfolioEngine {
  private maxTotalDeployment = 0.6;
  private maxSinglePosition = 0.10;
  private maxCorrelatedExposure = 0.25;
  private targetVolatility = 0.15;

  allocate(
    signals: SignalEvent[],
    totalCapital: number,
    currentRegime: RegimeState
  ): PortfolioOutput {
    const regimeMultiplier = this.regimeAdjustment(currentRegime);
    const effectiveMax = this.maxTotalDeployment * regimeMultiplier;

    const qualified = signals
      .filter(s => s.finalScore !== undefined && s.finalScore > 0.5 && s.direction !== 'NEUTRAL')
      .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

    const allocations: PortfolioAllocation[] = [];
    let totalDeployed = 0;
    const assetTypeExposure: Record<string, number> = {};

    for (const signal of qualified) {
      if (totalDeployed >= effectiveMax * totalCapital) break;

      const volTarget = this.targetVolatility;
      const signalVol = signal.volEstimate || 0.2;
      let rawWeight = volTarget / signalVol;
      rawWeight = Math.min(rawWeight, this.maxSinglePosition);

      const assetKey = signal.assetType;
      const currentExposure = assetTypeExposure[assetKey] || 0;
      if (currentExposure + rawWeight > this.maxCorrelatedExposure) {
        rawWeight = Math.max(0, this.maxCorrelatedExposure - currentExposure);
      }

      if (rawWeight <= 0.005) continue;

      const notional = rawWeight * totalCapital;
      const riskPerUnit = Math.abs(signal.entryMid - signal.invalidationLevel);
      const rewardPerUnit = signal.direction === 'LONG' 
        ? signal.entryZoneHigh * 1.5 - signal.entryMid
        : signal.entryMid - signal.entryZoneLow * 0.5;

      allocations.push({
        symbol: signal.symbol,
        direction: signal.direction,
        weight: parseFloat(rawWeight.toFixed(4)),
        notional: parseFloat(notional.toFixed(2)),
        entryPrice: signal.entryMid,
        stopPrice: signal.invalidationLevel,
        targetPrice: signal.direction === 'LONG' 
          ? signal.entryMid + rewardPerUnit 
          : signal.entryMid - rewardPerUnit,
        signalId: signal.id || '',
        finalScore: signal.finalScore || 0,
      });

      totalDeployed += notional;
      assetTypeExposure[assetKey] = (assetTypeExposure[assetKey] || 0) + rawWeight;
    }

    const deployedPct = totalCapital > 0 ? totalDeployed / totalCapital : 0;
    const correlationExposure = Math.max(...Object.values(assetTypeExposure), 0);

    return {
      allocations,
      totalDeployed: parseFloat(totalDeployed.toFixed(2)),
      totalIdle: parseFloat((totalCapital - totalDeployed).toFixed(2)),
      deployedPct: parseFloat(deployedPct.toFixed(4)),
      correlationExposure: parseFloat(correlationExposure.toFixed(4)),
      timestamp: new Date(),
    };
  }

  private regimeAdjustment(regime: RegimeState): number {
    switch (regime) {
      case 'TREND_UP': return 1.0;
      case 'TREND_DOWN': return 0.5;
      case 'RANGE_LOW_VOL': return 0.7;
      case 'HIGH_VOL_DISLOCATION': return 0.3;
      default: return 0.5;
    }
  }

  setParams(params: { 
    maxTotalDeployment?: number; 
    maxSinglePosition?: number; 
    maxCorrelatedExposure?: number;
    targetVolatility?: number;
  }): void {
    if (params.maxTotalDeployment !== undefined) this.maxTotalDeployment = params.maxTotalDeployment;
    if (params.maxSinglePosition !== undefined) this.maxSinglePosition = params.maxSinglePosition;
    if (params.maxCorrelatedExposure !== undefined) this.maxCorrelatedExposure = params.maxCorrelatedExposure;
    if (params.targetVolatility !== undefined) this.targetVolatility = params.targetVolatility;
  }
}
