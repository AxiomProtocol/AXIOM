export type { TreasuryProvider, IssuanceProvider, LiquidityProvider, VolatilityProvider, TreasuryData, IssuanceData, LiquidityData, VolatilityData } from './types';
export { SolvencySnapshotTreasuryProvider, SolvencySnapshotIssuanceProvider, SolvencySnapshotLiquidityProvider, DefaultVolatilityProvider } from './SolvencySnapshotProvider';

import type { AmeInputs } from '../types';
import { SolvencySnapshotTreasuryProvider, SolvencySnapshotIssuanceProvider, SolvencySnapshotLiquidityProvider, DefaultVolatilityProvider } from './SolvencySnapshotProvider';

import { createHash } from 'crypto';

export async function fetchAllProviderData(): Promise<{
  inputs: AmeInputs;
  checksum: string;
  providerMeta: {
    treasury: { name: string; confidence: string; timestamp: string };
    issuance: { name: string; confidence: string; timestamp: string };
    liquidity: { name: string; confidence: string; timestamp: string };
    volatility: { name: string; confidence: string; timestamp: string };
  };
}> {
  const treasuryProvider = new SolvencySnapshotTreasuryProvider();
  const issuanceProvider = new SolvencySnapshotIssuanceProvider();
  const liquidityProvider = new SolvencySnapshotLiquidityProvider();
  const volatilityProvider = new DefaultVolatilityProvider();

  const [treasury, issuance, liquidity, volatility] = await Promise.all([
    treasuryProvider.fetchTreasury(),
    issuanceProvider.fetchIssuance(),
    liquidityProvider.fetchLiquidity(),
    volatilityProvider.fetchVolatility(),
  ]);

  const inputs: AmeInputs = {
    treasuryLiquidUsd: treasury.treasuryLiquidUsd,
    treasuryTotalUsd: treasury.treasuryTotalUsd,
    designatedReservesUsd: treasury.designatedReservesUsd,
    lossBufferUsd: treasury.lossBufferUsd,
    netExternalExposureUsd: issuance.netExternalExposureUsd,
    circulatingExposureUsd: issuance.circulatingExposureUsd,
    redemptionCapacityUsd: liquidity.redemptionCapacityUsd,
    estimatedRedemptionDemandUsd: liquidity.estimatedRedemptionDemandUsd,
    volatilitySignals: {
      pegDeviation: volatility.pegDeviation,
      liquidityDepthDrop: volatility.liquidityDepthDrop,
      redemptionAcceleration: volatility.redemptionAcceleration,
      correlationSpike: volatility.correlationSpike,
    },
    liquiditySignals: {
      depthUsd: liquidity.depthUsd,
      bidAskSpreadBps: liquidity.bidAskSpreadBps,
      volumeChange24h: liquidity.volumeChange24h,
    },
  };

  const checksum = createHash('sha256').update(JSON.stringify(inputs)).digest('hex').slice(0, 16);

  return {
    inputs,
    checksum,
    providerMeta: {
      treasury: { name: treasuryProvider.name, confidence: treasury.confidence, timestamp: treasury.timestamp },
      issuance: { name: issuanceProvider.name, confidence: issuance.confidence, timestamp: issuance.timestamp },
      liquidity: { name: liquidityProvider.name, confidence: liquidity.confidence, timestamp: liquidity.timestamp },
      volatility: { name: volatilityProvider.name, confidence: volatility.confidence, timestamp: volatility.timestamp },
    },
  };
}
