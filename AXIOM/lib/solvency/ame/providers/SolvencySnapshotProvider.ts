import { pool } from '../../../../server/db';
import type { TreasuryProvider, IssuanceProvider, LiquidityProvider, VolatilityProvider, TreasuryData, IssuanceData, LiquidityData, VolatilityData } from './types';

export class SolvencySnapshotTreasuryProvider implements TreasuryProvider {
  name = 'solvency-snapshot';

  async fetchTreasury(): Promise<TreasuryData> {
    const result = await pool.query(
      `SELECT payload_json, created_at FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return {
        treasuryLiquidUsd: 0,
        treasuryTotalUsd: 0,
        designatedReservesUsd: 0,
        lossBufferUsd: 0,
        compositionJson: {},
        timestamp: new Date().toISOString(),
        confidence: 'DEGRADED',
      };
    }

    const payload = typeof result.rows[0].payload_json === 'string'
      ? JSON.parse(result.rows[0].payload_json)
      : result.rows[0].payload_json;

    return {
      treasuryLiquidUsd: Number(payload.treasuryLiquidUsd || 0),
      treasuryTotalUsd: Number(payload.treasuryTotalUsd || 0),
      designatedReservesUsd: Number(payload.designatedReservesUsd || 0),
      lossBufferUsd: Number(payload.lossBufferUsd || 0),
      compositionJson: payload.composition || {},
      timestamp: new Date(result.rows[0].created_at).toISOString(),
      confidence: payload.treasuryTotalUsd > 0 ? 'HIGH' : 'LOW',
    };
  }
}

export class SolvencySnapshotIssuanceProvider implements IssuanceProvider {
  name = 'solvency-snapshot';

  async fetchIssuance(): Promise<IssuanceData> {
    const result = await pool.query(
      `SELECT payload_json FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return {
        grossIssuanceAxusd: 0,
        circulatingExposureUsd: 0,
        netExternalExposureUsd: 0,
        timestamp: new Date().toISOString(),
        confidence: 'DEGRADED',
      };
    }

    const payload = typeof result.rows[0].payload_json === 'string'
      ? JSON.parse(result.rows[0].payload_json)
      : result.rows[0].payload_json;

    return {
      grossIssuanceAxusd: Number(payload.grossIssuanceAxusd || 0),
      circulatingExposureUsd: Number(payload.circulatingExposureUsd || payload.liabilitiesTotalUsd || 0),
      netExternalExposureUsd: Number(payload.netExternalExposureUsd || payload.liabilitiesTotalUsd || 0),
      timestamp: new Date().toISOString(),
      confidence: payload.liabilitiesTotalUsd > 0 || payload.netExternalExposureUsd > 0 ? 'HIGH' : 'LOW',
    };
  }
}

export class SolvencySnapshotLiquidityProvider implements LiquidityProvider {
  name = 'solvency-snapshot';

  async fetchLiquidity(): Promise<LiquidityData> {
    const result = await pool.query(
      `SELECT payload_json FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return {
        redemptionCapacityUsd: 0,
        estimatedRedemptionDemandUsd: 0,
        depthUsd: 0,
        bidAskSpreadBps: 0,
        volumeChange24h: 0,
        timestamp: new Date().toISOString(),
        confidence: 'DEGRADED',
      };
    }

    const payload = typeof result.rows[0].payload_json === 'string'
      ? JSON.parse(result.rows[0].payload_json)
      : result.rows[0].payload_json;

    const hasLiquidity = payload.redemptionCapacityUsd > 0;

    return {
      redemptionCapacityUsd: Number(payload.redemptionCapacityUsd || 0),
      estimatedRedemptionDemandUsd: Number(payload.estimatedRedemptionDemandUsd || 0),
      depthUsd: Number(payload.depthUsd || 0),
      bidAskSpreadBps: Number(payload.bidAskSpreadBps || 0),
      volumeChange24h: Number(payload.volumeChange24h || 0),
      timestamp: new Date().toISOString(),
      confidence: hasLiquidity ? 'MEDIUM' : 'DEGRADED',
    };
  }
}

export class DefaultVolatilityProvider implements VolatilityProvider {
  name = 'default-low';

  async fetchVolatility(): Promise<VolatilityData> {
    return {
      pegDeviation: 0.05,
      liquidityDepthDrop: 0.05,
      redemptionAcceleration: 0.05,
      correlationSpike: 0.05,
      timestamp: new Date().toISOString(),
      confidence: 'LOW',
    };
  }
}
