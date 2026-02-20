export interface TreasuryData {
  treasuryLiquidUsd: number;
  treasuryTotalUsd: number;
  designatedReservesUsd: number;
  lossBufferUsd: number;
  compositionJson: Record<string, number>;
  timestamp: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED';
}

export interface IssuanceData {
  grossIssuanceAxusd: number;
  circulatingExposureUsd: number;
  netExternalExposureUsd: number;
  timestamp: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED';
}

export interface LiquidityData {
  redemptionCapacityUsd: number;
  estimatedRedemptionDemandUsd: number;
  depthUsd: number;
  bidAskSpreadBps: number;
  volumeChange24h: number;
  timestamp: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED';
}

export interface VolatilityData {
  pegDeviation: number;
  liquidityDepthDrop: number;
  redemptionAcceleration: number;
  correlationSpike: number;
  timestamp: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED';
}

export interface TreasuryProvider {
  name: string;
  fetchTreasury(): Promise<TreasuryData>;
}

export interface IssuanceProvider {
  name: string;
  fetchIssuance(): Promise<IssuanceData>;
}

export interface LiquidityProvider {
  name: string;
  fetchLiquidity(): Promise<LiquidityData>;
}

export interface VolatilityProvider {
  name: string;
  fetchVolatility(): Promise<VolatilityData>;
}
