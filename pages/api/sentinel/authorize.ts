import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { AuthorizationService } from '../../../server/services/sentinel/AuthorizationService';
import { AuditLogger } from '../../../server/services/sentinel/AuditLogger';
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
    const { scope, actionType, subject, maxNotional, signalId } = req.body;

    if (!scope || !actionType || !subject || maxNotional === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields: scope, actionType, subject, maxNotional' });
    }

    let signal: SignalEvent | undefined;
    if (signalId) {
      const signalResult = await pool.query(
        `SELECT * FROM sentinel_signals WHERE id = $1`,
        [signalId]
      );
      if (signalResult.rows.length > 0) {
        const row = signalResult.rows[0];
        signal = {
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
        };
      }
    }

    const regimeResult = await pool.query(
      `SELECT * FROM sentinel_regime_snapshots
       ORDER BY created_at DESC LIMIT 1`
    );
    const currentRegime: RegimeState = regimeResult.rows[0]?.regime || 'BOOTSTRAP';

    const auditLogger = new AuditLogger();
    await auditLogger.initialize();

    const authService = new AuthorizationService(auditLogger);
    await authService.initialize();

    const decision = await authService.evaluate(
      scope, actionType, subject, maxNotional, signal, currentRegime
    );

    return res.status(200).json({
      success: true,
      decision,
    });
  } catch (error: any) {
    console.error('[sentinel/authorize] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
