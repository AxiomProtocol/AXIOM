import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { RegimeEngine } from '../../../server/services/sentinel/RegimeEngine';
import { ConfidenceCalibrator } from '../../../server/services/sentinel/ConfidenceCalibrator';
import { RegimeState, SignalDirection } from '../../../server/services/sentinel/types';

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

function classifyRegimeFromSetup(signalZ: number, volatilityEstimate: number): RegimeState {
  if (volatilityEstimate > 0.03) return 'HIGH_VOL_DISLOCATION';
  if (signalZ > 1.5) return 'TREND_UP';
  if (signalZ < -1.5) return 'TREND_DOWN';
  return 'RANGE_LOW_VOL';
}

function deriveDirection(signalZ: number): SignalDirection {
  if (signalZ > 0) return 'LONG';
  if (signalZ < 0) return 'SHORT';
  return 'NEUTRAL';
}

function computeConfirmationScore(signalZ: number, volatilityEstimate: number, confidenceScore: number): number {
  let score = 0;
  if (Math.abs(signalZ) > 2.0) score += 0.3;
  else if (Math.abs(signalZ) > 1.0) score += 0.15;
  if (volatilityEstimate < 0.05) score += 0.2;
  if (volatilityEstimate < 0.02) score += 0.1;
  if (confidenceScore > 70) score += 0.25;
  else if (confidenceScore > 50) score += 0.15;
  score += 0.15;
  return parseFloat(Math.min(1, score).toFixed(4));
}

function regimeBonus(regime: RegimeState, direction: SignalDirection): number {
  if (regime === 'TREND_UP' && direction === 'LONG') return 0.15;
  if (regime === 'TREND_DOWN' && direction === 'SHORT') return 0.15;
  if (regime === 'RANGE_LOW_VOL') return 0.05;
  if (regime === 'HIGH_VOL_DISLOCATION') return -0.1;
  return 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const calibrator = new ConfidenceCalibrator();

    const setupsResult = await pool.query(
      `SELECT ms.* FROM mirdt_setups ms
       LEFT JOIN sentinel_signals ss ON ss.source_setup_id = ms.id::text
       WHERE ms.status = 'ACTIVE' AND ss.id IS NULL`
    );

    const setups = setupsResult.rows;
    let signalsGenerated = 0;
    let lastRegimeSnapshot: any = null;

    for (const setup of setups) {
      const signalZ = parseFloat(setup.signal_z) || 0;
      const volatilityEstimate = parseFloat(setup.volatility_estimate) || 0.02;
      const confidenceScore = parseFloat(setup.confidence_score) || 50;

      const regime = classifyRegimeFromSetup(signalZ, volatilityEstimate);
      const direction = deriveDirection(signalZ);
      const pRaw = confidenceScore / 100;
      const pCalibrated = calibrator.calibrate(pRaw);
      const confirmationScore = computeConfirmationScore(signalZ, volatilityEstimate, confidenceScore);
      const rBonus = regimeBonus(regime, direction);
      const finalScore = parseFloat(((pCalibrated * 0.4) + (confirmationScore * 0.4) + (rBonus * 0.2)).toFixed(4));

      const entryLow = parseFloat(setup.entry_zone_low) || 0;
      const entryHigh = parseFloat(setup.entry_zone_high) || 0;
      const entryMid = (entryLow + entryHigh) / 2;

      await pool.query(
        `INSERT INTO sentinel_signals (
          id, created_at, symbol, asset_type, timeframe, horizon_days,
          direction, entry_zone_low, entry_zone_high, entry_mid, invalidation_level,
          p_raw, p_calibrated, regime_state, confirmation_score, final_score,
          vol_estimate, model_version, source_setup_id, rationale_json,
          qualified, qualified_at
        ) VALUES (
          gen_random_uuid(), NOW(), $1, $2, $3, $4,
          $5::sentinel_signal_direction, $6, $7, $8, $9,
          $10, $11, $12::sentinel_regime, $13, $14,
          $15, $16, $17, $18,
          false, NULL
        )`,
        [
          setup.symbol, setup.asset_type, '1D', setup.horizon_days,
          direction, entryLow, entryHigh, entryMid, parseFloat(setup.invalidation_price) || 0,
          parseFloat(pRaw.toFixed(4)), pCalibrated, regime, confirmationScore, finalScore,
          volatilityEstimate, 'sentinel-v1', setup.id.toString(),
          JSON.stringify({ sourceSetup: setup.id, signalZ, confidenceScore, regime, direction }),
        ]
      );

      signalsGenerated++;

      const regimeConfidence = regime === 'HIGH_VOL_DISLOCATION' ? 0.8 : regime === 'RANGE_LOW_VOL' ? 0.5 : 0.7;
      lastRegimeSnapshot = {
        regime,
        confidence: regimeConfidence,
        sma20Slope: 0,
        sma50Slope: 0,
        volatility20d: volatilityEstimate,
        volatilityRatio: 1,
        breadthScore: 0.5,
      };
    }

    if (lastRegimeSnapshot) {
      await pool.query(
        `INSERT INTO sentinel_regime_snapshots (
          id, created_at, regime, confidence, sma20_slope, sma50_slope,
          volatility_20d, volatility_ratio, breadth_score, snapshot_json
        ) VALUES (
          gen_random_uuid(), NOW(), $1::sentinel_regime, $2, $3, $4,
          $5, $6, $7, $8
        )`,
        [
          lastRegimeSnapshot.regime, lastRegimeSnapshot.confidence,
          lastRegimeSnapshot.sma20Slope, lastRegimeSnapshot.sma50Slope,
          lastRegimeSnapshot.volatility20d, lastRegimeSnapshot.volatilityRatio,
          lastRegimeSnapshot.breadthScore, JSON.stringify(lastRegimeSnapshot),
        ]
      );
    }

    return res.status(200).json({
      success: true,
      signalsGenerated,
      regimeSnapshot: lastRegimeSnapshot,
    });
  } catch (error: any) {
    console.error('[sentinel/run-signals] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
