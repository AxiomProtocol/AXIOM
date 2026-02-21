/**
 * Hybrid Exit Engine for MIRDT Paper Trades
 *
 * Two distinct stop levels:
 * - invalidationLevel: thesis / structural invalidation (the original MIRDT stop_price).
 *   If price crosses this level, the trade thesis is wrong.
 * - riskStop: capital protection boundary, computed as entry +/- k * riskDistance.
 *   Tighter than invalidation in high-vol regimes, wider in low-vol.
 *
 * Adaptive k is derived from ATR-based volRatio:
 *   volRatio < 0.01        -> k = 0.8  (low vol, tighter stop)
 *   0.01 <= volRatio < 0.02 -> k = 1.0  (normal)
 *   0.02 <= volRatio < 0.04 -> k = 1.3  (elevated vol, wider stop)
 *   volRatio >= 0.04        -> k = 1.6  (high vol, widest stop)
 *
 * Badge priority (highest to lowest):
 *   1. EXIT_RISK      — livePrice breached riskStop (capital protection)
 *   2. TAKE_PROFIT    — livePrice hit target
 *   3. INVALIDATED    — livePrice crossed invalidationLevel (thesis broken)
 *   4. TIME_EXIT      — trade exceeded horizon
 *   5. HOLD           — no exit condition met
 */

export type HybridExitBadge = 'EXIT_RISK' | 'TAKE_PROFIT' | 'INVALIDATED' | 'TIME_EXIT' | 'HOLD';

export interface HybridExitInput {
  direction: string;
  entry: number;
  invalidationLevel: number;
  target?: number;
  openedAt: string;
  horizonDays?: number;
  livePrice: number;
  volRatio?: number;
}

export interface HybridExitResult {
  badge: HybridExitBadge;
  k: number;
  riskStop: number;
  riskDistance: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  rMultiple: number;
  distanceToRiskStop: number;
  distanceToRiskStopPct: number;
  distanceToInvalidation: number;
  distanceToInvalidationPct: number;
  distanceToTarget: number | null;
  distanceToTargetPct: number | null;
  breaches: {
    riskBreach: boolean;
    invalidated: boolean;
    targetHit: boolean;
    timeExit: boolean;
  };
}

export function adaptiveK(volRatio?: number): number {
  if (volRatio === undefined || volRatio === null) return 1.0;
  if (volRatio < 0.01) return 0.8;
  if (volRatio < 0.02) return 1.0;
  if (volRatio < 0.04) return 1.3;
  return 1.6;
}

export function computeHybridExit(input: HybridExitInput): HybridExitResult {
  const { direction, entry, invalidationLevel, target, openedAt, horizonDays, livePrice, volRatio } = input;
  const isLong = direction.toUpperCase() === 'LONG';

  const rawRiskDistance = Math.abs(entry - invalidationLevel);
  const hasValidStop = rawRiskDistance > 0 && invalidationLevel > 0;
  const riskDistance = hasValidStop ? rawRiskDistance : 0;
  const k = adaptiveK(volRatio);

  const riskStop = hasValidStop
    ? (isLong ? entry - k * riskDistance : entry + k * riskDistance)
    : (isLong ? entry * 0.95 : entry * 1.05);

  const unrealizedPnl = isLong ? livePrice - entry : entry - livePrice;
  const unrealizedPnlPct = entry > 0 ? (unrealizedPnl / entry) * 100 : 0;

  const rMultiple = riskDistance > 0 ? unrealizedPnl / riskDistance : 0;

  const distanceToRiskStop = isLong ? livePrice - riskStop : riskStop - livePrice;
  const distanceToRiskStopPct = livePrice > 0 ? (distanceToRiskStop / livePrice) * 100 : 0;

  const distanceToInvalidation = isLong
    ? livePrice - invalidationLevel
    : invalidationLevel - livePrice;
  const distanceToInvalidationPct = livePrice > 0 ? (distanceToInvalidation / livePrice) * 100 : 0;

  let distanceToTarget: number | null = null;
  let distanceToTargetPct: number | null = null;
  if (target !== undefined && target !== null) {
    distanceToTarget = isLong ? target - livePrice : livePrice - target;
    distanceToTargetPct = livePrice > 0 ? (distanceToTarget / livePrice) * 100 : 0;
  }

  const riskBreach = isLong ? livePrice <= riskStop : livePrice >= riskStop;

  const invalidated = hasValidStop
    ? (isLong ? livePrice <= invalidationLevel : livePrice >= invalidationLevel)
    : false;

  const targetHit = target !== undefined && target !== null
    ? (isLong ? livePrice >= target : livePrice <= target)
    : false;

  const maxDays = horizonDays || 14;
  const elapsedMs = Date.now() - new Date(openedAt).getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const timeExit = elapsedDays >= maxDays;

  let badge: HybridExitBadge = 'HOLD';
  if (riskBreach) badge = 'EXIT_RISK';
  else if (targetHit) badge = 'TAKE_PROFIT';
  else if (invalidated) badge = 'INVALIDATED';
  else if (timeExit) badge = 'TIME_EXIT';

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    badge,
    k,
    riskStop: round(riskStop),
    riskDistance: round(riskDistance),
    unrealizedPnl: round(unrealizedPnl),
    unrealizedPnlPct: round(unrealizedPnlPct),
    rMultiple: round(rMultiple),
    distanceToRiskStop: round(distanceToRiskStop),
    distanceToRiskStopPct: round(distanceToRiskStopPct),
    distanceToInvalidation: round(distanceToInvalidation),
    distanceToInvalidationPct: round(distanceToInvalidationPct),
    distanceToTarget: distanceToTarget !== null ? round(distanceToTarget) : null,
    distanceToTargetPct: distanceToTargetPct !== null ? round(distanceToTargetPct) : null,
    breaches: { riskBreach, invalidated, targetHit, timeExit },
  };
}

export function hybridBadgeColor(badge: HybridExitBadge): string {
  switch (badge) {
    case 'EXIT_RISK': return 'bg-red-100 text-red-800 border-red-300';
    case 'TAKE_PROFIT': return 'bg-green-100 text-green-800 border-green-300';
    case 'INVALIDATED': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'TIME_EXIT': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'HOLD': return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}
