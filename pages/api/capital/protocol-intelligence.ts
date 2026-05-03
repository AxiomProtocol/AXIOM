import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export interface ProtocolIntelligenceData {
  generatedAt: string;
  treasury: {
    dataStatus: 'ok' | 'empty' | 'error';
    asOfUtc: string | null;
    snapshotId: string | null;
    treasuryTotalUsd: number;
    treasuryLiquidUsd: number;
    reservesTotalUsd: number;
    liabilitiesTotalUsd: number;
    reserveRatio: number;
    coverageRatio: number;
    lossBufferUsd: number;
    policyMode: string;
    regimeState: string;
    hardBrake: string;
    gateStatus: string;
    composition: { label: string; valueUsd: number; pct: number }[];
  };
  ame: {
    dataStatus: 'ok' | 'empty' | 'error';
    policyMode: string | null;
    hardBrakeActive: boolean;
    evaluationId: string | null;
    recordedAt: string | null;
    meta: Record<string, unknown> | null;
  };
  sentinel: {
    dataStatus: 'ok' | 'error';
    regime: string;
    regimeConfidence: number;
    systemStance: string;
    approvedLast7d: number;
    deniedLast7d: number;
    totalSignals: number;
    qualifiedSignals: number;
    decisions: {
      id: string;
      scope: string;
      action_type: string;
      subject: string;
      max_notional: string;
      decision: string;
      reason_code: string;
      plain_language: string | null;
      created_at: string;
    }[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProtocolIntelligenceData | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  const [treasuryResult, ameResult, sentinelResult] = await Promise.all([
    fetchTreasury(),
    fetchAme(),
    fetchSentinel(),
  ]);

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    treasury: treasuryResult,
    ame: ameResult,
    sentinel: sentinelResult,
  });
}

async function fetchTreasury(): Promise<ProtocolIntelligenceData['treasury']> {
  try {
    const result = await pool.query(
      `SELECT id, as_of_utc, payload_json, checksum
       FROM solvency_snapshots
       ORDER BY created_at DESC
       LIMIT 1`
    );
    if (result.rows.length === 0) {
      return emptyTreasury('empty');
    }
    const row = result.rows[0];
    const payload: Record<string, any> =
      typeof row.payload_json === 'string'
        ? JSON.parse(row.payload_json)
        : row.payload_json ?? {};

    return {
      dataStatus: 'ok',
      asOfUtc: row.as_of_utc ?? null,
      snapshotId: row.id ?? null,
      treasuryTotalUsd: Number(payload.treasuryTotalUsd ?? 0),
      treasuryLiquidUsd: Number(payload.treasuryLiquidUsd ?? 0),
      reservesTotalUsd: Number(payload.reservesTotalUsd ?? 0),
      liabilitiesTotalUsd: Number(payload.liabilitiesTotalUsd ?? 0),
      reserveRatio: Number(payload.reserveRatio ?? 0),
      coverageRatio: Number(payload.coverageRatio ?? 0),
      lossBufferUsd: Number(payload.lossBufferUsd ?? 0),
      policyMode: String(payload.policyMode ?? 'BOOTSTRAP'),
      regimeState: String(payload.regimeState ?? 'UNKNOWN'),
      hardBrake: String(payload.hardBrake ?? 'OFF'),
      gateStatus: String(payload.gateStatus ?? 'OPEN'),
      composition: Array.isArray(payload.composition) ? payload.composition : [],
    };
  } catch {
    return emptyTreasury('error');
  }
}

function emptyTreasury(
  status: 'empty' | 'error'
): ProtocolIntelligenceData['treasury'] {
  return {
    dataStatus: status,
    asOfUtc: null,
    snapshotId: null,
    treasuryTotalUsd: 0,
    treasuryLiquidUsd: 0,
    reservesTotalUsd: 0,
    liabilitiesTotalUsd: 0,
    reserveRatio: 0,
    coverageRatio: 0,
    lossBufferUsd: 0,
    policyMode: 'BOOTSTRAP',
    regimeState: 'UNKNOWN',
    hardBrake: 'OFF',
    gateStatus: 'OPEN',
    composition: [],
  };
}

async function fetchAme(): Promise<ProtocolIntelligenceData['ame']> {
  try {
    const result = await pool.query(
      `SELECT id, policy_mode, evaluation_id, created_at, trigger_metric, trigger_value, notes
       FROM ame_policy_state
       ORDER BY created_at DESC
       LIMIT 1`
    );
    if (result.rows.length === 0) {
      return { dataStatus: 'empty', policyMode: null, hardBrakeActive: false, evaluationId: null, recordedAt: null, meta: null };
    }
    const row = result.rows[0];
    return {
      dataStatus: 'ok',
      policyMode: row.policy_mode ?? null,
      hardBrakeActive: false,
      evaluationId: row.evaluation_id ?? null,
      recordedAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      meta: row.notes ? { notes: row.notes, triggerMetric: row.trigger_metric, triggerValue: row.trigger_value } : null,
    };
  } catch {
    return { dataStatus: 'error', policyMode: null, hardBrakeActive: false, evaluationId: null, recordedAt: null, meta: null };
  }
}

async function fetchSentinel(): Promise<ProtocolIntelligenceData['sentinel']> {
  try {
    const [regimeRes, approvedRes, deniedRes, totalRes, qualRes, decisionsRes] =
      await Promise.all([
        pool.query(`SELECT regime, confidence FROM sentinel_regime_snapshots ORDER BY created_at DESC LIMIT 1`),
        pool.query(`SELECT COUNT(*) as n FROM sentinel_decisions WHERE decision='APPROVED' AND created_at >= NOW() - INTERVAL '7 days'`),
        pool.query(`SELECT COUNT(*) as n FROM sentinel_decisions WHERE decision='DENIED'  AND created_at >= NOW() - INTERVAL '7 days'`),
        pool.query(`SELECT COUNT(*) as n FROM sentinel_signals`),
        pool.query(`SELECT COUNT(*) as n FROM sentinel_signals WHERE qualified=true`),
        pool.query(`SELECT id, scope, action_type, subject, max_notional, decision, reason_code, plain_language, created_at FROM sentinel_decisions ORDER BY created_at DESC LIMIT 20`),
      ]);

    const regime = regimeRes.rows[0];
    const regimeLabel = regime?.regime ?? 'RANGE_LOW_VOL';
    const stanceMap: Record<string, string> = {
      TREND_UP: 'RISK_ON',
      TREND_DOWN: 'DEFENSIVE',
      HIGH_VOL_DISLOCATION: 'HALTED',
    };

    return {
      dataStatus: 'ok',
      regime: regimeLabel,
      regimeConfidence: regime?.confidence ? Math.round(parseFloat(regime.confidence) * 100) : 0,
      systemStance: stanceMap[regimeLabel] ?? 'NEUTRAL',
      approvedLast7d: parseInt(approvedRes.rows[0]?.n ?? '0', 10),
      deniedLast7d: parseInt(deniedRes.rows[0]?.n ?? '0', 10),
      totalSignals: parseInt(totalRes.rows[0]?.n ?? '0', 10),
      qualifiedSignals: parseInt(qualRes.rows[0]?.n ?? '0', 10),
      decisions: decisionsRes.rows,
    };
  } catch {
    return {
      dataStatus: 'error',
      regime: 'UNKNOWN',
      regimeConfidence: 0,
      systemStance: 'UNKNOWN',
      approvedLast7d: 0,
      deniedLast7d: 0,
      totalSignals: 0,
      qualifiedSignals: 0,
      decisions: [],
    };
  }
}
