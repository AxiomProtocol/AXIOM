/**
 * MIRDT Exit Signal Computation
 * Pure function module — no side effects, no I/O.
 *
 * Given a trade's parameters and a live price, computes deterministic
 * exit signals so the operator knows when to exit without relying on intuition.
 */

export type ExitBadge = 'STOP' | 'TAKE PROFIT' | 'TIME EXIT' | 'HOLD';

export interface ExitSignalInput {
  /** Trade direction */
  direction: 'long' | 'short';
  /** Actual entry price of the paper trade */
  entry: number;
  /** Invalidation / stop level from the setup */
  stop: number;
  /** Optional price target (e.g. expected_p95 for longs, expected_p5 for shorts) */
  target?: number;
  /** When the trade was opened */
  openedAt: string | Date;
  /** Horizon from the setup in calendar days */
  horizonDays?: number;
  /** Current live price fetched from /api/prices */
  livePrice: number;
}

export interface ExitSignalResult {
  /** True when price has touched or crossed the stop level */
  stopHit: boolean;
  /** True when price has touched or exceeded the target */
  targetHit: boolean;
  /** True when the setup horizon has elapsed */
  timeExit: boolean;
  /** Unrealised P&L per unit (positive = favourable) */
  unrealizedPnl: number;
  /**
   * R-multiple: unrealised P&L expressed as a multiple of the initial risk.
   * Null when risk-per-unit is zero (entry === stop).
   */
  rMultiple: number | null;
  /** |livePrice − stop| as a fraction of entry (always ≥ 0) */
  distanceToStop: number;
  /**
   * |livePrice − target| as a fraction of entry.
   * Null when no target is provided.
   */
  distanceToTarget: number | null;
  /**
   * Exit badge in priority order:
   * STOP > TAKE PROFIT > TIME EXIT > HOLD
   */
  badge: ExitBadge;
}

/**
 * Compute deterministic exit signals for an open paper trade.
 */
export function computeExitSignals(input: ExitSignalInput): ExitSignalResult {
  const { direction, entry, stop, target, openedAt, horizonDays, livePrice } = input;
  const isLong = direction === 'long';

  // ── Stop hit ──────────────────────────────────────────────────────────────
  const stopHit = isLong ? livePrice <= stop : livePrice >= stop;

  // ── Target hit ────────────────────────────────────────────────────────────
  const targetHit =
    target !== undefined
      ? isLong
        ? livePrice >= target
        : livePrice <= target
      : false;

  // ── Time exit ─────────────────────────────────────────────────────────────
  let timeExit = false;
  if (horizonDays !== undefined) {
    const openedMs =
      typeof openedAt === 'string'
        ? new Date(openedAt).getTime()
        : openedAt.getTime();
    timeExit = Date.now() - openedMs >= horizonDays * 24 * 60 * 60 * 1000;
  }

  // ── Unrealised P&L per unit ───────────────────────────────────────────────
  const unrealizedPnl = isLong ? livePrice - entry : entry - livePrice;

  // ── R-multiple ────────────────────────────────────────────────────────────
  const riskPerUnit = Math.abs(entry - stop);
  const rMultiple = riskPerUnit > 0 ? unrealizedPnl / riskPerUnit : null;

  // ── Distance metrics (as fraction of entry) ───────────────────────────────
  const distanceToStop = entry > 0 ? Math.abs(livePrice - stop) / entry : 0;
  const distanceToTarget =
    target !== undefined && entry > 0
      ? Math.abs(livePrice - target) / entry
      : null;

  // ── Badge (priority: STOP > TAKE PROFIT > TIME EXIT > HOLD) ──────────────
  let badge: ExitBadge;
  if (stopHit) {
    badge = 'STOP';
  } else if (targetHit) {
    badge = 'TAKE PROFIT';
  } else if (timeExit) {
    badge = 'TIME EXIT';
  } else {
    badge = 'HOLD';
  }

  return {
    stopHit,
    targetHit,
    timeExit,
    unrealizedPnl,
    rMultiple,
    distanceToStop,
    distanceToTarget,
    badge,
  };
}
