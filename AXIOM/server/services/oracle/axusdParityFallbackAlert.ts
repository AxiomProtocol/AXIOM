/**
 * Axiom Protocol — AXUSD parity-fallback alerting (Task #100)
 *
 * Background
 * ----------
 * `valueAxusdAsUsd` (Task #95) silently falls back to flat 1:1 USD parity
 * whenever the on-chain ERC-7726 quote is unusable (returns 0 or reverts).
 * That is the right *safety* behaviour — it prevents loan-lifecycle accounting
 * from recording a $0 write-down for a non-zero AXUSD principal — but on its
 * own it produces no operator signal. A real oracle outage could then go
 * unnoticed for days.
 *
 * This module is the single place where every caller of `valueAxusdAsUsd`
 * reports a static-parity fallback. It does three things:
 *
 *   1. Emits a structured `[ALERT]` warning to stderr so log-based alerting
 *      pipelines (Datadog, Loki, etc.) can pattern-match on it.
 *   2. Maintains an in-process metric counter (total fallbacks, last-seen
 *      timestamp, per-caller breakdown) that the ops endpoint
 *      /api/oracle/axusd-parity-fallback-metrics surfaces as a fast path.
 *   3. Persists each fallback event to `axusd_oracle_fallback_events` in
 *      Postgres so the totals survive server restarts and allow time-windowed
 *      queries (Task #105).
 *
 * Callers should invoke `recordAxusdParityFallback` whenever they receive
 * `{ source: 'static_parity' }` from `valueAxusdAsUsd` for a *non-zero*
 * AXUSD input — a zero input is expected to return `static_parity` and is
 * not an oracle outage.
 */

import { pool } from '../../db';

export interface AxusdParityFallbackContext {
  /** Short caller identifier, e.g. 'loan-lifecycle:charge_off'. */
  caller: string;
  /** Loan / position id this valuation was for, if applicable. */
  loanId?: string;
  /** USD principal that was valued via the parity fallback. */
  principalUsd?: number | string;
  /** Free-form details surfaced in the structured warning line. */
  extra?: Record<string, unknown>;
  /** Human-readable reason why the oracle was unusable, if known. */
  reason?: string;
}

export interface AxusdParityFallbackMetrics {
  totalFallbacks: number;
  lastFallbackAt: string | null;
  perCaller: Record<string, { count: number; lastAt: string }>;
}

let totalFallbacks = 0;
let lastFallbackAt: string | null = null;
const perCaller: Record<string, { count: number; lastAt: string }> = {};

/**
 * Persist a single fallback event to Postgres (fire-and-forget).
 * Failures are swallowed — persisting must never break the calling write path.
 */
function persistFallbackEvent(ctx: AxusdParityFallbackContext, ts: string): void {
  const principalUsd =
    ctx.principalUsd !== undefined ? String(ctx.principalUsd) : null;

  pool
    .query(
      `INSERT INTO axusd_oracle_fallback_events
         (occurred_at, caller, loan_id, principal_usd, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [ts, ctx.caller, ctx.loanId ?? null, principalUsd, ctx.reason ?? null],
    )
    .catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('[axusdParityFallbackAlert] DB persist failed:', err);
    });
}

/**
 * Record + alert a single AXUSD static-parity fallback.
 *
 * Safe to call from request handlers — it never throws.
 */
export function recordAxusdParityFallback(ctx: AxusdParityFallbackContext): void {
  try {
    const ts = new Date().toISOString();
    totalFallbacks++;
    lastFallbackAt = ts;
    const bucket = perCaller[ctx.caller] ?? { count: 0, lastAt: ts };
    bucket.count++;
    bucket.lastAt = ts;
    perCaller[ctx.caller] = bucket;

    const payload: Record<string, unknown> = {
      alert: 'axusd_oracle_parity_fallback',
      caller: ctx.caller,
      timestamp: ts,
      totalFallbacks,
    };
    if (ctx.loanId !== undefined) payload.loanId = ctx.loanId;
    if (ctx.principalUsd !== undefined) payload.principalUsd = ctx.principalUsd;
    if (ctx.reason !== undefined) payload.reason = ctx.reason;
    if (ctx.extra) Object.assign(payload, ctx.extra);

    // Single-line structured warning so log-based alerting can pattern-match.
    // eslint-disable-next-line no-console
    console.warn(`[ALERT] AXUSD on-chain quote unusable; static 1:1 parity used. ${JSON.stringify(payload)}`);

    // Persist to Postgres for durable history across restarts (Task #105).
    persistFallbackEvent(ctx, ts);
  } catch (err) {
    // Alerting must never break the calling write path.
    // eslint-disable-next-line no-console
    console.error('[axusdParityFallbackAlert] recordAxusdParityFallback failed:', err);
  }
}

/** Snapshot of the in-process fallback counters for ops/observability. */
export function getAxusdParityFallbackMetrics(): AxusdParityFallbackMetrics {
  return {
    totalFallbacks,
    lastFallbackAt,
    perCaller: Object.fromEntries(
      Object.entries(perCaller).map(([k, v]) => [k, { ...v }]),
    ),
  };
}

/** Test-only reset hook. */
export function __resetAxusdParityFallbackMetricsForTests(): void {
  totalFallbacks = 0;
  lastFallbackAt = null;
  for (const k of Object.keys(perCaller)) delete perCaller[k];
}
