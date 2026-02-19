import { createHash, timingSafeEqual } from 'crypto';
import type { AmeInputs } from './types';

export function computeChecksum(data: unknown): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}

export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function parseExplicitInputs(body: Record<string, unknown>): AmeInputs {
  const vs = (body.volatilitySignals || {}) as Record<string, unknown>;
  const ls = (body.liquiditySignals || {}) as Record<string, unknown>;
  return {
    treasuryLiquidUsd: Number(body.treasuryLiquidUsd || 0),
    treasuryTotalUsd: Number(body.treasuryTotalUsd || 0),
    designatedReservesUsd: Number(body.designatedReservesUsd || 0),
    lossBufferUsd: Number(body.lossBufferUsd || 0),
    netExternalExposureUsd: Number(body.netExternalExposureUsd || 0),
    circulatingExposureUsd: Number(body.circulatingExposureUsd || 0),
    redemptionCapacityUsd: Number(body.redemptionCapacityUsd || 0),
    estimatedRedemptionDemandUsd: Number(body.estimatedRedemptionDemandUsd || 0),
    volatilitySignals: {
      pegDeviation: Number(vs.pegDeviation ?? 0.05),
      liquidityDepthDrop: Number(vs.liquidityDepthDrop ?? 0.05),
      redemptionAcceleration: Number(vs.redemptionAcceleration ?? 0.05),
      correlationSpike: Number(vs.correlationSpike ?? 0.05),
    },
    liquiditySignals: {
      depthUsd: Number(ls.depthUsd ?? 0),
      bidAskSpreadBps: Number(ls.bidAskSpreadBps ?? 0),
      volumeChange24h: Number(ls.volumeChange24h ?? 0),
    },
  };
}
