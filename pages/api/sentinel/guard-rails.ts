import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

interface GuardRail {
  id: number;
  title: string;
  status: 'PASS' | 'ENFORCED' | 'WARNING' | 'UNKNOWN';
  detail: string;
  source: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [regimeRes, solvencyRes, lendingRes, complianceRes] = await Promise.all([
      pool.query(`
        SELECT regime, created_at FROM sentinel_regime_snapshots
        ORDER BY created_at DESC LIMIT 1
      `).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT payload_json FROM solvency_snapshots
        ORDER BY created_at DESC LIMIT 1
      `).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT COUNT(*) as count FROM income_credit_lines WHERE status = 'active'
      `).catch(() => ({ rows: [{ count: 0 }] })),
      pool.query(`
        SELECT COUNT(*) as count FROM compliance_audit_logs
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const regime = regimeRes.rows[0]?.regime || null;
    const solvencyPayload = solvencyRes.rows[0]?.payload_json
      ? (typeof solvencyRes.rows[0].payload_json === 'string'
          ? JSON.parse(solvencyRes.rows[0].payload_json)
          : solvencyRes.rows[0].payload_json)
      : null;
    const activeLoans = parseInt(lendingRes.rows[0]?.count || '0');
    const complianceEvents = parseInt(complianceRes.rows[0]?.count || '0');

    const cr = Number(solvencyPayload?.coverageRatio ?? solvencyPayload?.cr ?? 0);
    const policyMode = solvencyPayload?.policyMode ?? 'UNKNOWN';
    const backingRatio = Number(solvencyPayload?.axusdStability?.backingRatio ?? 0);

    const guardRails: GuardRail[] = [
      {
        id: 1,
        title: 'Capital Preservation',
        status: regime === 'TREND_DOWN' || regime === 'HIGH_VOL_DISLOCATION' ? 'WARNING' : 'PASS',
        detail: regime
          ? `Market regime: ${regime}. ${regime === 'TREND_DOWN' ? 'Defensive stance active — reduce new deployments.' : regime === 'TREND_UP' ? 'Risk-on environment — standard deployment permitted.' : 'Low volatility — preserve capital, monitor conditions.'}`
          : 'No regime data available. Apply conservative capital preservation defaults.',
        source: 'sentinel',
      },
      {
        id: 2,
        title: 'AXUSD Peg Stability',
        status: backingRatio === 0
          ? 'ENFORCED'
          : backingRatio >= 1.0
          ? 'PASS'
          : backingRatio >= 0.95
          ? 'WARNING'
          : 'WARNING',
        detail: backingRatio === 0
          ? 'PSM backing ratio initializing (BOOTSTRAP). Peg enforcement rule active — no uncollateralized issuance permitted.'
          : `PSM backing ratio: ${(backingRatio * 100).toFixed(2)}%. ${backingRatio >= 1.0 ? 'Fully collateralized.' : 'Below 100% — review PSM reserves.'}`,
        source: 'psm',
      },
      {
        id: 3,
        title: 'Treasury Coverage',
        status: policyMode === 'BOOTSTRAP'
          ? 'ENFORCED'
          : cr >= 1.5
          ? 'PASS'
          : cr >= 1.0
          ? 'WARNING'
          : 'WARNING',
        detail: policyMode === 'BOOTSTRAP'
          ? `Protocol in BOOTSTRAP phase (CR: ${cr.toFixed(4)}x). Capital accumulation mode — treasury building in progress.`
          : `Coverage ratio: ${cr.toFixed(4)}x. ${cr >= 1.5 ? 'Well-capitalized.' : cr >= 1.0 ? 'Adequate coverage — monitor closely.' : 'Below minimum — restrict new deployments.'}`,
        source: 'solvency',
      },
      {
        id: 4,
        title: 'Lending Health',
        status: activeLoans === 0 ? 'ENFORCED' : 'PASS',
        detail: activeLoans === 0
          ? 'No active credit lines. Lending guard rail ENFORCED — credit portfolio not yet initiated.'
          : `${activeLoans} active credit line${activeLoans !== 1 ? 's' : ''}. Monitor debt service coverage and repayment schedules.`,
        source: 'lending',
      },
      {
        id: 5,
        title: 'Regulatory Compliance',
        status: 'ENFORCED',
        detail: `Sentinel authority is ADVISORY ONLY until post-public governance vote. All outputs are informational. ${complianceEvents > 0 ? `${complianceEvents} compliance event(s) logged in last 30 days.` : 'No compliance events flagged in last 30 days.'}`,
        source: 'disclosure',
      },
    ];

    return res.status(200).json({
      guardRails,
      computedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[sentinel/guard-rails] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
