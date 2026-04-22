/**
 * Capital Infrastructure — ACH Exposure Cap Checker (Phase 3B.3).
 *
 * Implements the three-tier cap system defined in the approved rollout plan:
 *
 *   1. Per-instruction cap      (per asset, global, at AUTHORIZE time)
 *   2. Daily aggregate cap      (per asset, per UTC day, all users)
 *   3. Concentration cap        (per asset, per UTC day, user-scoped)
 *
 * Cap values are read from the active cap_risk_policies row for scope
 * 'settlement.ach.exposure'. Defaults apply if no policy is published.
 *
 * All cap checks are enforced at AUTHORIZE time. This module MUST NOT
 * be called from webhook handlers, reconciliation, or portfolio services.
 *
 * Statuses counted toward the daily aggregate:
 *   AUTHORIZED + PENDING_OPERATOR_APPROVAL + SUBMITTED
 *
 * "Unresolved SUBMITTED instruction" definition (used in gate checks):
 *   A cap_settlement_instructions row where status='SUBMITTED' AND there
 *   is no cap_admin_actions row with actionType IN (
 *     'settlement.ach.submitted_review',
 *     'settlement.ach.submitted_confirmed_cleared',
 *     'settlement.ach.submitted_confirmed_returned'
 *   ) AND subjectId = instruction.id.
 */

import { db } from '../../../../server/db';
import {
  capSettlementInstructions,
  capRiskPolicies,
  capAdminActions,
} from '../../../../shared/capInfraSchema';
import { and, eq, gte, lte, inArray, not, exists, sql } from 'drizzle-orm';

export interface AchCapPolicy {
  perInstructionCapUsd: number;
  dailyAggregateCapUsd: number;
  maxSingleCounterpartyPctOfDaily: number;
}

// Defaults per rollout plan Section 5 (MANUAL_APPROVAL tier).
// These apply when no published policy exists for the scope.
const CAP_DEFAULTS_MANUAL_APPROVAL: AchCapPolicy = {
  perInstructionCapUsd: 10_000,
  dailyAggregateCapUsd: 50_000,
  maxSingleCounterpartyPctOfDaily: 0.30,
};

// Canary tier defaults (tighter).
const CAP_DEFAULTS_LIVE_CANARY: AchCapPolicy = {
  perInstructionCapUsd: 5_000,
  dailyAggregateCapUsd: 25_000,
  maxSingleCounterpartyPctOfDaily: 0.25,
};

// LIVE tier defaults.
const CAP_DEFAULTS_LIVE: AchCapPolicy = {
  perInstructionCapUsd: 50_000,
  dailyAggregateCapUsd: 250_000,
  maxSingleCounterpartyPctOfDaily: 0.30,
};

export async function getAchCapPolicy(adapterMode: string): Promise<AchCapPolicy> {
  const SCOPE = 'settlement.ach.exposure';
  const [row] = await db
    .select()
    .from(capRiskPolicies)
    .where(
      and(
        eq(capRiskPolicies.isActive, true),
        sql`scope_json->>'name' = ${SCOPE}`,
      ),
    )
    .orderBy(sql`effective_at DESC`)
    .limit(1);

  const fallback =
    adapterMode === 'LIVE'
      ? CAP_DEFAULTS_LIVE
      : adapterMode === 'LIVE_CANARY'
        ? CAP_DEFAULTS_LIVE_CANARY
        : CAP_DEFAULTS_MANUAL_APPROVAL;

  if (!row) return fallback;

  const rules = row.rulesJson as Record<string, unknown>;
  return {
    perInstructionCapUsd: Number(rules.perInstructionCapUsd ?? fallback.perInstructionCapUsd),
    dailyAggregateCapUsd: Number(rules.dailyAggregateCapUsd ?? fallback.dailyAggregateCapUsd),
    maxSingleCounterpartyPctOfDaily: Number(
      rules.maxSingleCounterpartyPctOfDaily ?? fallback.maxSingleCounterpartyPctOfDaily,
    ),
  };
}

function utcDayBounds(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

const COUNTED_STATUSES = ['AUTHORIZED', 'PENDING_OPERATOR_APPROVAL', 'SUBMITTED'] as const;

export interface AchCapViolation {
  reasonCode: string;
  message: string;
  details: Record<string, unknown>;
}

/**
 * Check all three ACH exposure caps for a proposed instruction.
 * Returns null if all caps pass, or a violation descriptor to surface as a policy denial.
 */
export async function checkAchExposureCap(opts: {
  assetId: string;
  userId: string;
  amountUsd: string | number;
  instructionId?: string;
  adapterMode: string;
}): Promise<AchCapViolation | null> {
  const policy = await getAchCapPolicy(opts.adapterMode);
  const amount = Number(opts.amountUsd);
  const { start, end } = utcDayBounds();

  // ── 1. Per-instruction cap ──────────────────────────────────────────
  if (amount > policy.perInstructionCapUsd) {
    return {
      reasonCode: 'ACH_PER_INSTRUCTION_CAP_EXCEEDED',
      message: `instruction amount $${amount} exceeds per-instruction cap $${policy.perInstructionCapUsd}`,
      details: { amount, cap: policy.perInstructionCapUsd, adapterMode: opts.adapterMode },
    };
  }

  // ── 2. Daily aggregate cap (global, all users) ─────────────────────
  const globalRows = await db
    .select({ amount: capSettlementInstructions.amount })
    .from(capSettlementInstructions)
    .where(
      and(
        eq(capSettlementInstructions.assetId, opts.assetId),
        eq(capSettlementInstructions.settlementType, 'ACH'),
        inArray(capSettlementInstructions.status, [...COUNTED_STATUSES]),
        gte(capSettlementInstructions.createdAt, start),
        lte(capSettlementInstructions.createdAt, end),
      ),
    );

  const globalSum = globalRows.reduce((acc, r) => acc + Number(r.amount), 0);
  if (globalSum + amount > policy.dailyAggregateCapUsd) {
    return {
      reasonCode: 'ACH_DAILY_CAP_EXCEEDED',
      message: `daily aggregate $${(globalSum + amount).toFixed(2)} would exceed cap $${policy.dailyAggregateCapUsd}`,
      details: {
        currentDailySum: globalSum,
        proposedAmount: amount,
        cap: policy.dailyAggregateCapUsd,
        adapterMode: opts.adapterMode,
      },
    };
  }

  // ── 3. Single-counterparty concentration cap ───────────────────────
  const userRows = await db
    .select({ amount: capSettlementInstructions.amount })
    .from(capSettlementInstructions)
    .where(
      and(
        eq(capSettlementInstructions.assetId, opts.assetId),
        eq(capSettlementInstructions.userId, opts.userId),
        eq(capSettlementInstructions.settlementType, 'ACH'),
        inArray(capSettlementInstructions.status, [...COUNTED_STATUSES]),
        gte(capSettlementInstructions.createdAt, start),
        lte(capSettlementInstructions.createdAt, end),
      ),
    );

  const userSum = userRows.reduce((acc, r) => acc + Number(r.amount), 0);
  const projectedUserPct = (userSum + amount) / policy.dailyAggregateCapUsd;
  if (projectedUserPct > policy.maxSingleCounterpartyPctOfDaily) {
    return {
      reasonCode: 'ACH_CONCENTRATION_CAP_EXCEEDED',
      message: `user share ${(projectedUserPct * 100).toFixed(1)}% would exceed concentration cap ${(policy.maxSingleCounterpartyPctOfDaily * 100).toFixed(0)}%`,
      details: {
        userSum,
        proposedAmount: amount,
        projectedPct: projectedUserPct,
        cap: policy.maxSingleCounterpartyPctOfDaily,
        dailyCapUsd: policy.dailyAggregateCapUsd,
        adapterMode: opts.adapterMode,
      },
    };
  }

  return null;
}

/**
 * Check whether the reconciliation overdue gate should block AUTHORIZE.
 * Returns a violation if:
 *   - adapterMode is LIVE_CANARY or LIVE
 *   - current UTC hour >= reconCutoffUtcHour
 *   - no COMPLETED reconciliation run exists for the current UTC day
 */
export async function checkAchReconOverdue(opts: {
  adapterMode: string;
  reconCutoffUtcHour: number;
  adapterKey?: string;
}): Promise<AchCapViolation | null> {
  if (opts.adapterMode !== 'LIVE_CANARY' && opts.adapterMode !== 'LIVE') {
    return null;
  }

  const now = new Date();
  const currentUtcHour = now.getUTCHours();
  if (currentUtcHour < opts.reconCutoffUtcHour) {
    return null;
  }

  const { start, end } = utcDayBounds();
  const adapterKey = opts.adapterKey ?? 'ACH';

  const reconResult = await db.execute<{ id: string }>(
    sql`SELECT id FROM cap_reconciliation_runs
        WHERE adapter_key = ${adapterKey}
          AND status = 'COMPLETED'
          AND created_at >= ${start}
          AND created_at <= ${end}
        LIMIT 1`,
  );
  const completedRun = (reconResult as unknown as { id: string }[])[0];

  if (!completedRun) {
    return {
      reasonCode: 'ACH_RECONCILIATION_OVERDUE',
      message: `no completed reconciliation run for today UTC; required by ${opts.reconCutoffUtcHour}:00 UTC`,
      details: {
        adapterMode: opts.adapterMode,
        reconCutoffUtcHour: opts.reconCutoffUtcHour,
        currentUtcHour,
        utcDay: start.toISOString().slice(0, 10),
      },
    };
  }

  return null;
}

/**
 * Count unresolved SUBMITTED instructions for gate checks.
 *
 * An unresolved SUBMITTED instruction is one where:
 *   status = 'SUBMITTED'
 *   AND no cap_admin_actions row exists with actionType IN (
 *     'settlement.ach.submitted_review',
 *     'settlement.ach.submitted_confirmed_cleared',
 *     'settlement.ach.submitted_confirmed_returned'
 *   ) AND subjectId = instruction.id
 */
export async function countUnresolvedSubmitted(assetId?: string): Promise<number> {
  const RESOLUTION_TYPES = [
    'settlement.ach.submitted_review',
    'settlement.ach.submitted_confirmed_cleared',
    'settlement.ach.submitted_confirmed_returned',
  ];

  const whereClause = assetId
    ? and(
        eq(capSettlementInstructions.status, 'SUBMITTED'),
        eq(capSettlementInstructions.assetId, assetId),
        eq(capSettlementInstructions.settlementType, 'ACH'),
        not(
          exists(
            db
              .select({ id: capAdminActions.id })
              .from(capAdminActions)
              .where(
                and(
                  inArray(capAdminActions.actionType, RESOLUTION_TYPES),
                  eq(capAdminActions.subjectId, capSettlementInstructions.id),
                ),
              ),
          ),
        ),
      )
    : and(
        eq(capSettlementInstructions.status, 'SUBMITTED'),
        eq(capSettlementInstructions.settlementType, 'ACH'),
        not(
          exists(
            db
              .select({ id: capAdminActions.id })
              .from(capAdminActions)
              .where(
                and(
                  inArray(capAdminActions.actionType, RESOLUTION_TYPES),
                  eq(capAdminActions.subjectId, capSettlementInstructions.id),
                ),
              ),
          ),
        ),
      );

  const rows = await db
    .select({ id: capSettlementInstructions.id })
    .from(capSettlementInstructions)
    .where(whereClause);

  return rows.length;
}

/**
 * Returns the ID of the most-recent unacknowledged emergency disable that
 * is still within the 4-hour acknowledgment window.  Disables older than
 * ACH_DISABLE_WINDOW_MS are considered expired and no longer block operations
 * (the window is the mandatory ack deadline; missing it triggers escalation,
 * not an indefinite hard-freeze).
 */
const ACH_DISABLE_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function findUnacknowledgedEmergencyDisable(): Promise<string | null> {
  const cutoff = new Date(Date.now() - ACH_DISABLE_WINDOW_MS);
  const disableRows = await db
    .select({ id: capAdminActions.id, createdAt: capAdminActions.createdAt })
    .from(capAdminActions)
    .where(
      and(
        eq(capAdminActions.actionType, 'ach.emergency_disable'),
        sql`created_at >= ${cutoff.toISOString()}`,
      ),
    )
    .orderBy(sql`created_at DESC`)
    .limit(20);

  for (const row of disableRows) {
    const [ack] = await db
      .select({ id: capAdminActions.id })
      .from(capAdminActions)
      .where(
        and(
          eq(capAdminActions.actionType, 'ach.emergency_disable.acknowledged'),
          sql`payload_json->>'originalDisableActionId' = ${row.id}`,
        ),
      )
      .limit(1);
    if (!ack) return row.id;
  }

  return null;
}
