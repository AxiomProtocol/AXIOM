/**
 * Capital Infrastructure — Policy Evaluator.
 *
 * Deterministic, stateless function: given (user, asset, action,
 * amount), returns ALLOWED or DENIED with a stable `reasonCode`,
 * `policyVersion`, and the list of claims required.
 *
 * Decisions are persisted to `cap_policy_decisions` and emitted as
 * `policy.evaluated` (always) and `policy.denied` (on deny) audit events.
 * Idempotency is keyed on the SHA-256 hash of the canonical input.
 *
 * Phase 3B.3 extensions:
 *  - ACH cap enforcement: per-instruction, daily aggregate, concentration.
 *  - ACH_RECONCILIATION_OVERDUE: blocks AUTHORIZE after reconCutoffUtcHour
 *    if no completed reconciliation run exists for the current UTC day.
 *  - ACH_EMERGENCY_DISABLE_UNACKNOWLEDGED: blocks all forward transitions
 *    if an unacknowledged emergency disable exists.
 *  All three are mutable-state checks (bypass cache) keyed by productContext='ACH'.
 */

import { createHash } from 'node:crypto';
import { db } from '../../server/db';
import {
  capPolicyDecisions,
  capPositions,
  capRiskPolicies,
  type CapPolicyDecision,
  type NewCapPolicyDecision,
  type CapAsset,
} from '../../shared/capInfraSchema';
import { and, eq, sql } from 'drizzle-orm';
import { getAssetById } from './assetRegistry';
import { getProjection, type IdentityProjection } from './identity';
import { generateId } from './ids';
import { emitAuditEventStrict } from './audit';
import { NotFoundError } from './errors';
import type { PolicyEvaluateInput } from './types';
import { hasSufficientHeadroom } from './reserve/service';
import { getActiveSolvencyMode, isHalt } from './reserve/solvencyMode';
import { loadAchConfig } from './adapters/ach/config';
import {
  checkAchExposureCap,
  checkAchReconOverdue,
  findUnacknowledgedEmergencyDisable,
} from './adapters/ach/expose';

/**
 * Date-stamped, monotonically incrementing policy version. The format
 * is `YYYY-MM-DD.N` where N is the rule revision for that date. Bumping
 * this string is the only way to invalidate the idempotency cache for
 * an evaluation, so it must change whenever the rule set or required-
 * claims matrix below is modified.
 *
 * 2026-04-19.3: ACH cap rules + recon overdue + emergency-disable gate.
 * 2026-04-21.1: Collateral Risk Policy enforcement — BORROW gate by
 *   collateral_class (RED denies, YELLOW per-asset cap), plus integrity
 *   downgrade reason (oracle stale / reserve attestation failure).
 */
export const POLICY_VERSION_REGISTRY = [
  '2026-04-19.1',
  '2026-04-19.2',
  '2026-04-19.3',
  '2026-04-21.1',
] as const;
export const POLICY_VERSION = POLICY_VERSION_REGISTRY[POLICY_VERSION_REGISTRY.length - 1];

export type PolicyAction =
  | 'MINT'
  | 'REDEEM'
  | 'TRANSFER'
  | 'BUY'
  | 'SELL'
  | 'STAKE'
  | 'UNSTAKE'
  | 'CUSTODY_MOVE'
  // Collateral admission. Gated by Collateral Risk Policy (§2 + §6).
  | 'BORROW';

export interface PolicyDecisionOutput {
  decisionId: string;
  allowed: boolean;
  reasonCode: string;
  policyVersion: string;
  requiredClaims: string[];
  warnings: string[];
  limits: Record<string, unknown>;
  evaluatedAt: string;
}

interface PolicyContext {
  asset: CapAsset;
  projection: IdentityProjection;
  input: PolicyEvaluateInput;
}

interface PolicyRule {
  code: string;
  appliesTo: (ctx: PolicyContext) => boolean;
  evaluate: (ctx: PolicyContext) => { allowed: boolean; reason: string };
}

/**
 * Required claim matrix. Maps (assetType, action) → minimum claims a
 * user must hold for the action to be allowed.
 */
function requiredClaimsFor(asset: CapAsset, action: PolicyAction): string[] {
  const required: string[] = [];

  // Identity floor: every non-internal action needs KYC + sanctions.
  required.push('KYC_VERIFIED', 'SANCTIONS_CLEARED');

  // Restricted / accredited / institutional gating
  if (asset.exposureClass === 'ACCREDITED') required.push('ACCREDITED_INVESTOR');
  if (asset.exposureClass === 'INSTITUTIONAL') required.push('INSTITUTIONAL');

  // Stable assets: full AML + jurisdiction allowlist on mint/redeem
  if (asset.assetType === 'STABLE_ASSET' && (action === 'MINT' || action === 'REDEEM')) {
    required.push('AML_CLEARED', 'JURISDICTION_ALLOWED');
  }

  // Physical metals + real estate: AML on any flow, jurisdiction on mint/redeem
  if (asset.assetType === 'PHYSICAL_METAL' || asset.assetType === 'REAL_ESTATE') {
    required.push('AML_CLEARED');
    if (action === 'MINT' || action === 'REDEEM') required.push('JURISDICTION_ALLOWED');
  }

  // Treasury bills are accredited-only by default
  if (asset.assetType === 'TREASURY_BILL') required.push('ACCREDITED_INVESTOR');

  return Array.from(new Set(required));
}

const RULES: PolicyRule[] = [
  {
    code: 'asset.inactive',
    appliesTo: () => true,
    evaluate: (ctx) => ({
      allowed: ctx.asset.status === 'ACTIVE',
      reason: ctx.asset.status === 'ACTIVE' ? 'asset_active' : `asset_status_${ctx.asset.status.toLowerCase()}`,
    }),
  },
  {
    code: 'user.inactive',
    appliesTo: () => true,
    evaluate: (ctx) => ({
      allowed: ctx.projection.user.status === 'ACTIVE',
      reason:
        ctx.projection.user.status === 'ACTIVE'
          ? 'user_active'
          : `user_status_${ctx.projection.user.status.toLowerCase()}`,
    }),
  },
  {
    code: 'claims.required',
    appliesTo: () => true,
    evaluate: (ctx) => {
      const required = requiredClaimsFor(ctx.asset, ctx.input.actionType as PolicyAction);
      const now = Date.now();
      const validClaimTypes = new Set(
        ctx.projection.claims
          .filter((c) => c.status === 'VALID' && (!c.expiresAt || c.expiresAt.getTime() > now))
          .map((c) => c.claimType),
      );
      const missing = required.filter((r) => !validClaimTypes.has(r as (typeof ctx.projection.claims)[number]['claimType']));
      return {
        allowed: missing.length === 0,
        reason: missing.length === 0 ? 'claims_satisfied' : `claims_missing:${missing.join(',')}`,
      };
    },
  },
  {
    code: 'jurisdiction.profile_required',
    appliesTo: (ctx) => Boolean(ctx.input.jurisdiction),
    evaluate: (ctx) => {
      const profile = ctx.projection.profile;
      if (!profile) return { allowed: false, reason: 'identity_profile_missing' };
      if (
        profile.countryOfResidence &&
        ctx.input.jurisdiction &&
        profile.countryOfResidence !== ctx.input.jurisdiction
      ) {
        return { allowed: false, reason: 'jurisdiction_mismatch' };
      }
      return { allowed: true, reason: 'jurisdiction_ok' };
    },
  },
];

function canonicalInput(input: PolicyEvaluateInput): string {
  const ordered = {
    actionType: input.actionType,
    amount: input.amount ?? null,
    assetId: input.assetId,
    jurisdiction: input.jurisdiction ?? null,
    productContext: input.productContext ?? null,
    userId: input.userId,
  };
  return JSON.stringify(ordered);
}

function hashInput(canonical: string): string {
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Emits the canonical pair of audit events for a policy decision:
 * always `policy.evaluated`, plus `policy.denied` when the decision is
 * a deny. Used by both first-evaluation and idempotent-replay paths so
 * every call leaves an audit trail.
 */
async function emitPolicyAudits(
  decision: CapPolicyDecision,
  actor: string,
  correlationId: string | undefined,
  isReplay: boolean,
  dbHandle?: Parameters<typeof emitAuditEventStrict>[1],
): Promise<void> {
  await emitAuditEventStrict(
    {
      eventType: 'policy.evaluated',
      aggregateType: 'policy_decision',
      aggregateId: decision.id,
      userId: decision.userId,
      assetId: decision.assetId,
      actor,
      correlationId,
      payloadJson: {
        allowed: decision.allowed,
        reasonCode: decision.reasonCode,
        policyVersion: decision.policyVersion,
        actionType: decision.actionType,
        replay: isReplay,
      },
    },
    dbHandle,
  );
  if (!decision.allowed) {
    await emitAuditEventStrict(
      {
        eventType: 'policy.denied',
        aggregateType: 'policy_decision',
        aggregateId: decision.id,
        userId: decision.userId,
        assetId: decision.assetId,
        actor,
        correlationId,
        payloadJson: {
          reasonCode: decision.reasonCode,
          policyVersion: decision.policyVersion,
          actionType: decision.actionType,
          replay: isReplay,
        },
      },
      dbHandle,
    );
  }
}

export async function evaluatePolicy(
  input: PolicyEvaluateInput,
  actor: string,
): Promise<PolicyDecisionOutput> {
  const canonical = canonicalInput(input);
  const inputHash = hashInput(canonical);
  const baseIdempotencyKey = `policy:${POLICY_VERSION}:${inputHash}`;

  // ────────────────────────────────────────────────────────────────
  // Mutable-state gates run BEFORE the cache.
  //
  // These are runtime checks that depend on live database state:
  //   (a) Solvency mode (halt → deny all)
  //   (b) Reserve headroom (insufficient → deny MINT)
  //   (c) ACH: emergency-disable unacknowledged → deny all ACH
  //   (d) ACH: reconciliation overdue → deny ACH AUTHORIZE
  //   (e) ACH: exposure caps (per-instruction, daily, concentration)
  //
  // A cached ALLOW cannot be honored if current state would deny.
  // A cached DENY cannot be honored if current state now allows.
  // ────────────────────────────────────────────────────────────────
  const mode = await getActiveSolvencyMode();
  const isHaltedNow = isHalt(mode.mode);
  const requiresHeadroomNow =
    input.actionType === 'MINT' &&
    input.amount !== undefined &&
    input.amount !== null &&
    String(input.amount) !== '0';

  // Detect ACH context. productContext='ACH' is set by authorizeInstruction
  // for ACH-typed settlement instructions.
  const isAchContext = input.productContext === 'ACH';

  let runtimeDeny: { reason: string; warnings: string[] } | null = null;

  if (isHaltedNow) {
    runtimeDeny = {
      reason: 'MANUAL_INTERVENTION_HALT',
      warnings: [`solvency_mode:${mode.mode}@${mode.version}`],
    };
  } else if (requiresHeadroomNow) {
    const check = await hasSufficientHeadroom(input.assetId, String(input.amount));
    if (!check.ok) {
      runtimeDeny = {
        reason: 'RESERVE_INSUFFICIENT',
        warnings: [
          `reserve_required:${check.required}`,
          `reserve_available:${check.available}`,
        ],
      };
    }
  }

  // ACH-specific mutable-state gates.
  // These only fire when productContext='ACH' AND we haven't already denied.
  if (!runtimeDeny && isAchContext) {
    // Gate 1: Emergency-disable forward-gate freeze.
    // Enforced in all modes EXCEPT DRY_RUN. DRY_RUN uses synthetic refs and moves
    // no real money. DISABLED is explicitly included: when an emergency disable
    // fires it sets mode=DISABLED, and the gate must continue blocking
    // forward transitions until a distinct second actor acknowledges.
    const achCfgForGate1 = await loadAchConfig();
    const isRealMoneyMode = achCfgForGate1 && achCfgForGate1.mode !== 'DRY_RUN';
    if (isRealMoneyMode) {
      const unackedDisableId = await findUnacknowledgedEmergencyDisable();
      if (unackedDisableId) {
        runtimeDeny = {
          reason: 'ACH_EMERGENCY_DISABLE_UNACKNOWLEDGED',
          warnings: [`unacknowledged_disable_action_id:${unackedDisableId}`],
        };
      }
    }
  }

  if (!runtimeDeny && isAchContext) {
    // Gate 2: Reconciliation overdue (LIVE_CANARY / LIVE only).
    // After reconCutoffUtcHour UTC, block AUTHORIZE if no completed recon
    // run exists for the current UTC day.
    const achCfg = await loadAchConfig();
    if (achCfg) {
      const reconOverdue = await checkAchReconOverdue({
        adapterMode: achCfg.mode,
        reconCutoffUtcHour: achCfg.reconCutoffUtcHour,
        adapterKey: 'ACH',
      });
      if (reconOverdue) {
        runtimeDeny = {
          reason: reconOverdue.reasonCode,
          warnings: Object.entries(reconOverdue.details).map(([k, v]) => `${k}:${v}`),
        };
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Collateral Risk Policy gates (BORROW only).
  // See documents/policies/collateral-risk-policy.md.
  //   - RED  → deny outright (COLLATERAL_CLASS_RED).
  //   - YELLOW → enforce per-asset cap loaded from the active
  //     cap_risk_policies publication scoped to
  //     { name: 'collateral.cap', assetId }, falling back to
  //     basePolicyJson.perTransactionMax for assets not yet covered by
  //     a published cap. Denies COLLATERAL_CAP_EXCEEDED when
  //     `requested + currentOutstanding` exceeds the cap (current
  //     outstanding read from cap_positions for this user+asset).
  // The asset row is loaded fresh each evaluation, so a guardian disable
  // (which flips collateralClass → RED + emits collateral.integrity_failed)
  // takes effect on the next evaluatePolicy() call.
  // ────────────────────────────────────────────────────────────────
  if (!runtimeDeny && input.actionType === 'BORROW') {
    const asset = await getAssetById(input.assetId);
    if (!asset) {
      runtimeDeny = { reason: 'asset_not_found', warnings: [`asset_id:${input.assetId}`] };
    } else if (asset.collateralClass === 'RED') {
      runtimeDeny = {
        reason: 'COLLATERAL_CLASS_RED',
        warnings: [
          `asset:${asset.symbol}`,
          `collateral_class:RED`,
          ...(asset.collateralClassificationRationale
            ? [`rationale:${asset.collateralClassificationRationale.slice(0, 200)}`]
            : []),
        ],
      };
    } else if (asset.collateralClass === 'YELLOW') {
      // Active per-asset cap from cap_risk_policies (publication flow).
      // Scope shape: { name: 'collateral.cap', assetId }. Rules expected
      // shape: { perAssetCap: '<decimal-string>' }.
      const [activeCap] = await db
        .select({ rulesJson: capRiskPolicies.rulesJson, version: capRiskPolicies.version, id: capRiskPolicies.id })
        .from(capRiskPolicies)
        .where(
          and(
            eq(capRiskPolicies.isActive, true),
            sql`${capRiskPolicies.scopeJson}->>'name' = 'collateral.cap'`,
            sql`${capRiskPolicies.scopeJson}->>'assetId' = ${asset.id}`,
          ),
        )
        .limit(1);

      let capRaw: string | null = null;
      let capSource: 'cap_risk_policies' | 'asset.basePolicyJson' | null = null;
      let capPolicyVersion: string | null = null;
      if (activeCap?.rulesJson) {
        const rules = activeCap.rulesJson as Record<string, unknown>;
        if (rules.perAssetCap !== undefined && rules.perAssetCap !== null) {
          capRaw = String(rules.perAssetCap);
          capSource = 'cap_risk_policies';
          capPolicyVersion = activeCap.version;
        }
      }
      if (!capRaw) {
        const basePolicy =
          (asset.basePolicyJson ?? null) as Record<string, unknown> | null;
        if (
          basePolicy &&
          basePolicy.perTransactionMax !== undefined &&
          basePolicy.perTransactionMax !== null
        ) {
          capRaw = String(basePolicy.perTransactionMax);
          capSource = 'asset.basePolicyJson';
        }
      }

      // YELLOW MUST have a cap (Collateral Risk Policy §2). Missing cap is
      // a configuration error; fail closed.
      if (!capRaw) {
        runtimeDeny = {
          reason: 'COLLATERAL_CAP_EXCEEDED',
          warnings: [`asset:${asset.symbol}`, `cap:missing_yellow_per_asset_cap`],
        };
      } else if (input.amount !== undefined && input.amount !== null) {
        const requested = Number(input.amount);
        const cap = Number(capRaw);
        // Sum currently outstanding borrow exposure for this user+asset.
        // cap_positions.quantity is the proxy for outstanding (Phase 1
        // borrow ledger); separate borrow accounting is Phase 3.
        const [outstandingRow] = await db
          .select({
            sum: sql<string | null>`COALESCE(SUM(${capPositions.quantity}), 0)::text`,
          })
          .from(capPositions)
          .where(
            and(
              eq(capPositions.userId, input.userId),
              eq(capPositions.assetId, asset.id),
              eq(capPositions.status, 'ACTIVE'),
            ),
          );
        const outstanding = Number(outstandingRow?.sum ?? '0');
        const total = (Number.isFinite(requested) ? requested : 0) + (Number.isFinite(outstanding) ? outstanding : 0);
        if (Number.isFinite(total) && Number.isFinite(cap) && total > cap) {
          runtimeDeny = {
            reason: 'COLLATERAL_CAP_EXCEEDED',
            warnings: [
              `asset:${asset.symbol}`,
              `requested:${requested}`,
              `outstanding:${outstanding}`,
              `total:${total}`,
              `per_asset_cap:${cap}`,
              `cap_source:${capSource}`,
              ...(capPolicyVersion ? [`cap_policy_version:${capPolicyVersion}`] : []),
            ],
          };
        }
      }
    }
  }

  if (!runtimeDeny && isAchContext && input.amount) {
    // Gate 3: ACH exposure caps (per-instruction, daily aggregate, concentration).
    // Only enforced when an amount is provided (AUTHORIZE path).
    const achCfg = await loadAchConfig();
    if (achCfg && achCfg.mode !== 'DRY_RUN' && achCfg.mode !== 'DISABLED') {
      const capViolation = await checkAchExposureCap({
        assetId: input.assetId,
        userId: input.userId,
        amountUsd: String(input.amount),
        adapterMode: achCfg.mode,
      });
      if (capViolation) {
        runtimeDeny = {
          reason: capViolation.reasonCode,
          warnings: Object.entries(capViolation.details).map(([k, v]) => `${k}:${String(v)}`),
        };
      }
    }
  }

  // All ACH cap/gate reason codes are mutable-state.
  const MUTABLE_STATE_DENY_REASONS = new Set([
    'RESERVE_INSUFFICIENT',
    'MANUAL_INTERVENTION_HALT',
    // ACH Phase 3B.3
    'ACH_EMERGENCY_DISABLE_UNACKNOWLEDGED',
    'ACH_RECONCILIATION_OVERDUE',
    'ACH_PER_INSTRUCTION_CAP_EXCEEDED',
    'ACH_DAILY_CAP_EXCEEDED',
    'ACH_CONCENTRATION_CAP_EXCEEDED',
    // Collateral Risk Policy (2026-04-21.1). All three are state-derived:
    // a guardian disable, a re-classification, or an integrity trigger
    // can flip the verdict at any time, so cached decisions must not be
    // honoured. Re-admission resets the same way.
    'COLLATERAL_CLASS_RED',
    'COLLATERAL_CAP_EXCEEDED',
    'COLLATERAL_INTEGRITY_FAILED',
  ]);

  const existing = await db
    .select()
    .from(capPolicyDecisions)
    .where(eq(capPolicyDecisions.idempotencyKey, baseIdempotencyKey))
    .limit(1);
  let idempotencyKey = baseIdempotencyKey;
  // Cache is bypassed when:
  //   (a) runtime gate currently DENIES (cached row may be ALLOW), OR
  //   (b) cached row is a stale mutable-state DENY (runtime now ALLOWs).
  const cacheStale =
    !!runtimeDeny ||
    (existing[0] != null &&
      !existing[0].allowed &&
      MUTABLE_STATE_DENY_REASONS.has(existing[0].reasonCode));
  if (cacheStale) {
    idempotencyKey = `${baseIdempotencyKey}:reeval:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  } else if (existing[0]) {
    try {
      await emitPolicyAudits(existing[0], actor, input.correlationId ?? undefined, true);
    } catch (err) {
      console.error('[capinfra.policy] replay audit emit failed for', existing[0].id, err);
    }
    return decisionToOutput(existing[0]);
  }

  const asset = await getAssetById(input.assetId);
  if (!asset) throw new NotFoundError(`asset ${input.assetId} not found`);
  const projection = await getProjection(input.userId);

  const ctx: PolicyContext = { asset, projection, input };

  let allowed = true;
  let reasonCode = 'allowed';
  const warnings: string[] = [];

  // Mutable-state DENY is the highest-priority verdict.
  if (runtimeDeny) {
    allowed = false;
    reasonCode = runtimeDeny.reason;
    warnings.push(...runtimeDeny.warnings);
  } else {
    for (const rule of RULES) {
      if (!rule.appliesTo(ctx)) continue;
      const r = rule.evaluate(ctx);
      if (!r.allowed) {
        allowed = false;
        reasonCode = r.reason;
        break;
      }
    }
  }

  const requiredClaims = requiredClaimsFor(asset, input.actionType as PolicyAction);
  const basePolicy = (asset.basePolicyJson ?? null) as Record<string, unknown> | null;
  const limits: Record<string, unknown> = {
    perTransactionMax:
      basePolicy && basePolicy.perTransactionMax !== undefined
        ? basePolicy.perTransactionMax
        : null,
  };

  const id = generateId('pd');
  const row: NewCapPolicyDecision = {
    id,
    userId: input.userId,
    assetId: input.assetId,
    actionType: input.actionType,
    amount: input.amount ?? null,
    jurisdiction: input.jurisdiction ?? null,
    productContext: input.productContext ?? null,
    allowed,
    reasonCode,
    policyVersion: POLICY_VERSION,
    requiredClaimsJson: requiredClaims,
    warningsJson: warnings,
    limitsJson: limits,
    idempotencyKey,
    inputHash,
  };

  const persisted = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(capPolicyDecisions)
      .values(row)
      .onConflictDoNothing({ target: capPolicyDecisions.idempotencyKey })
      .returning();
    if (inserted.length === 0) return null;
    const decision = inserted[0];
    await emitPolicyAudits(decision, actor, input.correlationId ?? undefined, false, tx);
    return decision;
  });

  if (persisted) return decisionToOutput(persisted);

  const [winner] = await db
    .select()
    .from(capPolicyDecisions)
    .where(eq(capPolicyDecisions.idempotencyKey, idempotencyKey))
    .limit(1);
  if (!winner) throw new Error('policy decision conflict but no winner row found');
  try {
    await emitPolicyAudits(winner, actor, input.correlationId ?? undefined, true);
  } catch (err) {
    console.error('[capinfra.policy] replay audit emit failed for', winner.id, err);
  }
  return decisionToOutput(winner);
}

function decisionToOutput(d: CapPolicyDecision): PolicyDecisionOutput {
  return {
    decisionId: d.id,
    allowed: d.allowed,
    reasonCode: d.reasonCode,
    policyVersion: d.policyVersion,
    requiredClaims: (d.requiredClaimsJson as string[]) ?? [],
    warnings: (d.warningsJson as string[]) ?? [],
    limits: (d.limitsJson as Record<string, unknown>) ?? {},
    evaluatedAt: d.createdAt.toISOString(),
  };
}
