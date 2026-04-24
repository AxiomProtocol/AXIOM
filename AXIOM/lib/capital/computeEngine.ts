import { createHash } from 'crypto';

export interface TradeRecord {
  id: string;
  positionId: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executedAt: string;
}

export interface PositionRecord {
  id: string;
  instrument: string;
  status: 'OPEN' | 'CLOSED';
  side: 'BUY' | 'SELL';
  quantity: number;
  avgEntryPrice: number;
  avgExitPrice: number | null;
  realizedPnl: number | null;
  openedAt: string;
  closedAt: string | null;
}

export interface FeeRecord {
  id: string;
  amount: number;
  incurredAt: string;
}

export interface MarkRecord {
  instrument: string;
  price: number;
  markedAt: string;
}

export interface DrawdownState {
  peakValue: number;
  troughValue: number;
  depthPct: number;
  peakAt: string;
  troughAt: string;
  recoveredAt: string | null;
  status: 'ACTIVE' | 'RECOVERED';
}

export interface DriftState {
  expectedValue: number;
  actualValue: number;
  variancePct: number;
}

export function computeRealizedPnl(positions: PositionRecord[]): number {
  return positions
    .filter(p => p.status === 'CLOSED' && p.realizedPnl !== null)
    .reduce((sum, p) => sum + (p.realizedPnl ?? 0), 0);
}

export function computeUnrealizedPnl(
  openPositions: PositionRecord[],
  latestMarks: Map<string, number>
): number {
  let total = 0;
  for (const pos of openPositions) {
    if (pos.status !== 'OPEN') continue;
    const mark = latestMarks.get(pos.instrument);
    if (mark === undefined) continue;
    const direction = pos.side === 'BUY' ? 1 : -1;
    const unrealized = direction * pos.quantity * (mark - pos.avgEntryPrice);
    total += unrealized;
  }
  return total;
}

export function computeFeesTotal(fees: FeeRecord[]): number {
  return fees.reduce((sum, f) => sum + f.amount, 0);
}

export function computeNetCapitalChange(
  realizedPnl: number,
  unrealizedPnl: number,
  feesTotal: number
): number {
  return realizedPnl + unrealizedPnl - feesTotal;
}

export function computeReturnOnCapital(
  netCapitalChange: number,
  totalCapital: number
): number {
  if (totalCapital <= 0) return 0;
  return netCapitalChange / totalCapital;
}

export function computeReturnOnDeployedCapital(
  netCapitalChange: number,
  deployedCapital: number
): number {
  if (deployedCapital <= 0) return 0;
  return netCapitalChange / deployedCapital;
}

export function computeDeployedCapital(positions: PositionRecord[]): number {
  return positions
    .filter(p => p.status === 'OPEN')
    .reduce((sum, p) => sum + (p.quantity * p.avgEntryPrice), 0);
}

export function computeCapitalEfficiencyScore(
  returnOnDeployedCapital: number,
  utilizationRatio: number
): number {
  if (utilizationRatio <= 0) return 0;
  return returnOnDeployedCapital * utilizationRatio;
}

export function computeVarianceStabilityIndex(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 1.0;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 1.0;
  const cv = Math.abs(mean) > 0 ? stdDev / Math.abs(mean) : stdDev;
  return Math.max(0, 1 - Math.min(cv, 1));
}

export function computeMaxDrawdown(equityCurve: { value: number; at: string }[]): DrawdownState | null {
  if (equityCurve.length < 2) return null;

  let peak = equityCurve[0].value;
  let peakAt = equityCurve[0].at;
  let maxDepth = 0;
  let maxTrough = peak;
  let maxTroughAt = peakAt;
  let maxPeakAt = peakAt;
  let maxPeakVal = peak;

  for (const point of equityCurve) {
    if (point.value >= peak) {
      peak = point.value;
      peakAt = point.at;
    }
    const drawdown = peak > 0 ? (peak - point.value) / peak : 0;
    if (drawdown > maxDepth) {
      maxDepth = drawdown;
      maxTrough = point.value;
      maxTroughAt = point.at;
      maxPeakAt = peakAt;
      maxPeakVal = peak;
    }
  }

  if (maxDepth === 0) return null;

  const lastVal = equityCurve[equityCurve.length - 1].value;
  const recovered = lastVal >= maxPeakVal;

  return {
    peakValue: maxPeakVal,
    troughValue: maxTrough,
    depthPct: maxDepth,
    peakAt: maxPeakAt,
    troughAt: maxTroughAt,
    recoveredAt: recovered ? equityCurve[equityCurve.length - 1].at : null,
    status: recovered ? 'RECOVERED' : 'ACTIVE',
  };
}

export function computeRecoveryDuration(drawdown: DrawdownState | null): number | null {
  if (!drawdown || !drawdown.recoveredAt) return null;
  const troughMs = new Date(drawdown.troughAt).getTime();
  const recoveredMs = new Date(drawdown.recoveredAt).getTime();
  return Math.max(0, recoveredMs - troughMs);
}

export function computeCapitalDrift(
  expectedValue: number,
  actualValue: number
): number {
  if (expectedValue === 0) return 0;
  return (actualValue - expectedValue) / expectedValue;
}

export function filterByPeriod<T extends { executedAt?: string; incurredAt?: string; openedAt?: string; closedAt?: string | null }>(
  records: T[],
  periodStart: string,
  periodEnd: string,
  dateField: keyof T = 'executedAt' as keyof T
): T[] {
  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();
  return records.filter(r => {
    const val = r[dateField];
    if (!val || typeof val !== 'string') return false;
    const ts = new Date(val).getTime();
    return ts >= start && ts <= end;
  });
}

export function getPeriodBounds(period: 'day' | 'week' | 'month' | 'year', anchor?: string): { start: string; end: string } {
  const now = anchor ? new Date(anchor) : new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();

  let start: Date;
  let end: Date;

  switch (period) {
    case 'day':
      start = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
      end = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
      break;
    case 'week': {
      const dayOfWeek = now.getUTCDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start = new Date(Date.UTC(year, month, date + mondayOffset, 0, 0, 0, 0));
      end = new Date(start.getTime() + 6 * 86400000 + 86399999);
      break;
    }
    case 'month':
      start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      break;
    case 'year':
      start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      break;
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export interface ChecksumInput {
  lines: Array<{ metricKey: string; metricValue: string; period: string; instrument: string | null }>;
  sourcesUsed: string[];
  asOf: string;
}

export function computeChecksum(input: ChecksumInput): string {
  const sorted = [...input.lines].sort((a, b) => {
    if (a.metricKey < b.metricKey) return -1;
    if (a.metricKey > b.metricKey) return 1;
    if (a.period < b.period) return -1;
    if (a.period > b.period) return 1;
    const ai = a.instrument ?? '';
    const bi = b.instrument ?? '';
    if (ai < bi) return -1;
    if (ai > bi) return 1;
    return 0;
  });

  const payload = JSON.stringify({
    asOf: input.asOf,
    sources: input.sourcesUsed.sort(),
    lines: sorted.map(l => ({
      k: l.metricKey,
      v: l.metricValue,
      p: l.period,
      i: l.instrument ?? '',
    })),
  });

  return createHash('sha256').update(payload).digest('hex');
}

export function aggregateByDay(
  trades: Array<{ executedAt: string; pnl: number }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of trades) {
    const day = t.executedAt.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + t.pnl);
  }
  return map;
}
