import type { NextApiRequest, NextApiResponse } from 'next';

export interface TreasurySection {
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
}

export interface AmeSection {
  dataStatus: 'ok' | 'empty' | 'error';
  policyMode: string | null;
  hardBrakeArmed: boolean;
  activeRegimeBand: string | null;
  evaluationId: string | null;
  recordedAt: string | null;
  triggerMetric: string | null;
  triggerValue: number | null;
}

export interface SentinelSection {
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
}

export interface ProtocolIntelligenceData {
  generatedAt: string;
  treasury: TreasurySection;
  ame: AmeSection;
  sentinel: SentinelSection;
}

function baseUrl(req: NextApiRequest): string {
  const host = req.headers.host ?? 'localhost:5000';
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  return `${proto}://${host}`;
}

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url);
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch {
    return fallback;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProtocolIntelligenceData | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  const base = baseUrl(req);

  const [metricsRaw, ameRaw, overviewRaw, decisionsRaw, regimesRaw] = await Promise.all([
    safeFetch<Record<string, unknown>>(`${base}/api/solvency/metrics`, {}),
    safeFetch<Record<string, unknown>>(`${base}/api/solvency/ame/latest`, {}),
    safeFetch<Record<string, unknown>>(`${base}/api/sentinel/overview`, {}),
    safeFetch<Record<string, unknown>>(`${base}/api/sentinel/decisions?limit=20`, {}),
    safeFetch<Record<string, unknown>>(`${base}/api/sentinel/regimes?limit=1`, {}),
  ]);

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    treasury: buildTreasury(metricsRaw),
    ame: buildAme(ameRaw, regimesRaw),
    sentinel: buildSentinel(overviewRaw, decisionsRaw),
  });
}

function buildTreasury(raw: Record<string, unknown>): TreasurySection {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
    return emptyTreasury('error');
  }
  const status = raw.dataStatus as string | undefined;
  if (status === 'empty') return emptyTreasury('empty');
  if (status && status !== 'ok' && status !== 'partial') return emptyTreasury('error');

  return {
    dataStatus: 'ok',
    asOfUtc: (raw.asOfUtc as string | null) ?? null,
    snapshotId: (raw.snapshotId as string | null) ?? null,
    treasuryTotalUsd: Number(raw.treasuryTotalUsd ?? 0),
    treasuryLiquidUsd: Number(raw.treasuryLiquidUsd ?? 0),
    reservesTotalUsd: Number(raw.reservesTotalUsd ?? 0),
    liabilitiesTotalUsd: Number(raw.liabilitiesTotalUsd ?? 0),
    reserveRatio: Number(raw.reserveRatio ?? 0),
    coverageRatio: Number(raw.coverageRatio ?? 0),
    lossBufferUsd: Number(raw.lossBufferUsd ?? 0),
    policyMode: String(raw.policyMode ?? 'BOOTSTRAP'),
    regimeState: String(raw.regimeState ?? 'UNKNOWN'),
    hardBrake: String(raw.hardBrake ?? 'OFF'),
    gateStatus: String(raw.gateStatus ?? 'OPEN'),
    composition: Array.isArray(raw.composition) ? (raw.composition as { label: string; valueUsd: number; pct: number }[]) : [],
  };
}

function emptyTreasury(status: 'empty' | 'error'): TreasurySection {
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

function buildAme(raw: Record<string, unknown>, regimesRaw: Record<string, unknown>): AmeSection {
  const nullResult = (status: AmeSection['dataStatus']): AmeSection => ({
    dataStatus: status,
    policyMode: null,
    hardBrakeArmed: false,
    activeRegimeBand: extractRegimeBand(regimesRaw),
    evaluationId: null,
    recordedAt: null,
    triggerMetric: null,
    triggerValue: null,
  });

  if (!raw || Object.keys(raw).length === 0) return nullResult('error');

  const amDataStatus = raw.dataStatus as string | undefined;
  if (amDataStatus === 'empty') return nullResult('empty');

  const ps = raw.policyState as Record<string, unknown> | null ?? null;

  return {
    dataStatus: 'ok',
    policyMode: ps ? String(ps.policyMode ?? 'BOOTSTRAP') : null,
    hardBrakeArmed: Boolean(raw.hardBrakeArmed ?? false),
    activeRegimeBand: extractRegimeBand(regimesRaw),
    evaluationId: ps ? (String(ps.evaluationId ?? '') || null) : null,
    recordedAt: ps && ps.createdAt ? new Date(ps.createdAt as string).toISOString() : null,
    triggerMetric: ps ? (String(ps.triggerMetric ?? '') || null) : null,
    triggerValue: ps && ps.triggerValue !== null && ps.triggerValue !== undefined ? Number(ps.triggerValue) : null,
  };
}

function extractRegimeBand(regimesRaw: Record<string, unknown>): string | null {
  if (!regimesRaw || Object.keys(regimesRaw).length === 0) return null;
  const current = regimesRaw.current as Record<string, unknown> | null;
  if (current?.regime) return String(current.regime);
  const regimes = regimesRaw.regimes as Record<string, unknown>[] | null;
  if (Array.isArray(regimes) && regimes.length > 0 && regimes[0].regime) {
    return String(regimes[0].regime);
  }
  return null;
}

function buildSentinel(
  overview: Record<string, unknown>,
  decisions: Record<string, unknown>
): SentinelSection {
  if (!overview || Object.keys(overview).length === 0 || (overview as { error?: string }).error) {
    return { dataStatus: 'error', regime: 'UNKNOWN', regimeConfidence: 0, systemStance: 'UNKNOWN', approvedLast7d: 0, deniedLast7d: 0, totalSignals: 0, qualifiedSignals: 0, decisions: [] };
  }

  const regime = overview.regime as Record<string, unknown> | null ?? null;
  const signalCounts = overview.signalCounts as { total: number; qualified: number } | null ?? null;
  const decisionCounts = overview.decisionCounts as { approved: number; denied: number } | null ?? null;

  return {
    dataStatus: 'ok',
    regime: regime ? String(regime.regime ?? 'RANGE_LOW_VOL') : 'RANGE_LOW_VOL',
    regimeConfidence: regime?.confidence ? Math.round(parseFloat(String(regime.confidence)) * 100) : 0,
    systemStance: String(overview.systemStance ?? 'NEUTRAL'),
    approvedLast7d: Number(decisionCounts?.approved ?? 0),
    deniedLast7d: Number(decisionCounts?.denied ?? 0),
    totalSignals: Number(signalCounts?.total ?? 0),
    qualifiedSignals: Number(signalCounts?.qualified ?? 0),
    decisions: Array.isArray(decisions.decisions)
      ? (decisions.decisions as SentinelSection['decisions'])
      : [],
  };
}
