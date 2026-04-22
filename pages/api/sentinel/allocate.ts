import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { PortfolioEngine } from '../../../server/services/sentinel/PortfolioEngine';
import { SignalEvent, RegimeState } from '../../../server/services/sentinel/types';

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const totalCapital = req.body?.totalCapital || 1000000;

    const signalsResult = await pool.query(
      `SELECT * FROM sentinel_signals
       WHERE qualified = true AND created_at >= NOW() - INTERVAL '7 days'
       ORDER BY final_score DESC`
    );

    const regimeResult = await pool.query(
      `SELECT * FROM sentinel_regime_snapshots
       ORDER BY created_at DESC LIMIT 1`
    );

    const currentRegime: RegimeState = regimeResult.rows[0]?.regime || 'RANGE_LOW_VOL';

    const signals: SignalEvent[] = signalsResult.rows.map((row: any) => ({
      id: row.id,
      symbol: row.symbol,
      assetType: row.asset_type,
      timeframe: row.timeframe,
      horizonDays: row.horizon_days,
      direction: row.direction,
      entryZoneLow: parseFloat(row.entry_zone_low),
      entryZoneHigh: parseFloat(row.entry_zone_high),
      entryMid: parseFloat(row.entry_mid),
      invalidationLevel: parseFloat(row.invalidation_level),
      pRaw: parseFloat(row.p_raw),
      pCalibrated: parseFloat(row.p_calibrated),
      regimeState: row.regime_state,
      confirmationScore: parseFloat(row.confirmation_score),
      finalScore: parseFloat(row.final_score),
      volEstimate: parseFloat(row.vol_estimate),
      modelVersion: row.model_version,
      sourceSetupId: row.source_setup_id,
    }));

    const engine = new PortfolioEngine();
    const portfolio = engine.allocate(signals, totalCapital, currentRegime);

    return res.status(200).json({
      success: true,
      portfolio,
    });
  } catch (error: any) {
    console.error('[sentinel/allocate] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
