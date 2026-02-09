import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const regimeResult = await pool.query(
      `SELECT * FROM sentinel_regime_snapshots
       ORDER BY created_at DESC LIMIT 1`
    );
    const regime = regimeResult.rows[0] || null;

    const totalSignalsResult = await pool.query(
      `SELECT COUNT(*) as total FROM sentinel_signals`
    );
    const qualifiedSignalsResult = await pool.query(
      `SELECT COUNT(*) as total FROM sentinel_signals WHERE qualified = true`
    );

    const approvedResult = await pool.query(
      `SELECT COUNT(*) as total FROM sentinel_decisions WHERE decision = 'APPROVED' AND created_at >= NOW() - INTERVAL '7 days'`
    );
    const deniedResult = await pool.query(
      `SELECT COUNT(*) as total FROM sentinel_decisions WHERE decision = 'DENIED' AND created_at >= NOW() - INTERVAL '7 days'`
    );

    const regimeState = regime?.regime || 'RANGE_LOW_VOL';
    let systemStance: string;
    switch (regimeState) {
      case 'TREND_UP':
        systemStance = 'RISK_ON';
        break;
      case 'TREND_DOWN':
        systemStance = 'DEFENSIVE';
        break;
      case 'HIGH_VOL_DISLOCATION':
        systemStance = 'HALTED';
        break;
      default:
        systemStance = 'NEUTRAL';
        break;
    }

    return res.status(200).json({
      regime,
      signalCounts: {
        total: parseInt(totalSignalsResult.rows[0].total),
        qualified: parseInt(qualifiedSignalsResult.rows[0].total),
      },
      decisionCounts: {
        approved: parseInt(approvedResult.rows[0].total),
        denied: parseInt(deniedResult.rows[0].total),
      },
      systemStance,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[sentinel/overview] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
