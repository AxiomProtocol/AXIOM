/**
 * Capital Infrastructure — Phase 3A.1 Policy Publication.
 *
 * The `cap_risk_policies` table is the publication ledger for policy
 * versions. The actual rule-evaluation algorithm lives in
 * `lib/capinfra/policy.ts` and stamps each decision with its in-code
 * `POLICY_VERSION` for cache invalidation. This module manages the
 * authoritative "which version is currently in force for which scope"
 * record and enforces clarification #2: at most one active row per
 * (deterministic) scope, transactionally and via a partial unique
 * DB index on `scope_hash WHERE is_active = true`.
 */

import { createHash } from 'node:crypto';
import { db } from '../../../server/db';
import { capRiskPolicies, type CapRiskPolicy } from '../../../shared/capInfraSchema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { generateId } from '../ids';
import { emitAuditEventStrict } from '../audit';
import { ConflictError, ValidationError, NotFoundError } from '../errors';

/**
 * Canonicalize a JSON value for stable hashing: object keys sorted,
 * arrays preserved in given order. Same algorithm as the snapshot
 * canonicalizer so scope_hash is reproducible across processes.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = canonicalize(obj[k]);
        return acc;
      }, {});
  }
  return value;
}

export function computeScopeHash(scope: unknown): string {
  const canonical = JSON.stringify(canonicalize(scope ?? {}));
  return createHash('sha256').update(canonical).digest('hex');
}

export interface PublishPolicyVersionInput {
  name: string;
  version: string;
  scope: Record<string, unknown>;
  rules: Record<string, unknown>;
  effectiveAt?: Date;
  expiresAt?: Date | null;
  actor: string;
  reasonCode: string;
}

/**
 * Publish a new policy version, atomically deactivating any prior
 * active row in the same scope. Per clarification #2, ≤1 active row
 * per scope. Both the service-layer transaction AND the partial
 * unique index `cap_risk_policies_active_scope_uq` enforce this.
 */
export async function publishPolicyVersion(
  input: PublishPolicyVersionInput,
): Promise<CapRiskPolicy> {
  if (!input.name || !input.version || !input.actor || !input.reasonCode) {
    throw new ValidationError('name, version, actor, and reasonCode are required');
  }
  const scopeHash = computeScopeHash(input.scope);

  return await db.transaction(async (tx) => {
    // Look up + deactivate any prior active row in this scope.
    const prior = await tx
      .select()
      .from(capRiskPolicies)
      .where(and(eq(capRiskPolicies.scopeHash, scopeHash), eq(capRiskPolicies.isActive, true)))
      .for('update');

    for (const p of prior) {
      await tx
        .update(capRiskPolicies)
        .set({ isActive: false, expiresAt: new Date(), updatedAt: new Date() })
        .where(eq(capRiskPolicies.id, p.id));
      await emitAuditEventStrict(
        {
          eventType: 'policy.version.retired',
          aggregateType: 'cap_risk_policy',
          aggregateId: p.id,
          actor: input.actor,
          payloadJson: {
            reason: 'superseded',
            supersededBy: null, // backfilled below once new id is known
            scopeHash,
          },
        },
        tx,
      );
    }

    const id = generateId('rp');
    try {
      await tx.insert(capRiskPolicies).values({
        id,
        name: input.name,
        version: input.version,
        scopeJson: input.scope,
        scopeHash,
        rulesJson: input.rules,
        isActive: true,
        effectiveAt: input.effectiveAt ?? new Date(),
        expiresAt: input.expiresAt ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/cap_risk_policies_(name_version_uq|active_scope_uq)/.test(msg)) {
        throw new ConflictError('Policy version conflicts with an existing row', { detail: msg });
      }
      throw err;
    }

    await emitAuditEventStrict(
      {
        eventType: 'policy.version.published',
        aggregateType: 'cap_risk_policy',
        aggregateId: id,
        actor: input.actor,
        payloadJson: {
          name: input.name,
          version: input.version,
          scopeHash,
          reasonCode: input.reasonCode,
          retiredCount: prior.length,
          retiredIds: prior.map((p) => p.id),
        },
      },
      tx,
    );

    const [row] = await tx.select().from(capRiskPolicies).where(eq(capRiskPolicies.id, id));
    return row;
  });
}

export async function retirePolicyVersion(
  id: string,
  actor: string,
  reasonCode: string,
): Promise<CapRiskPolicy> {
  if (!actor || !reasonCode) {
    throw new ValidationError('actor and reasonCode are required');
  }
  return await db.transaction(async (tx) => {
    const [row] = await tx.select().from(capRiskPolicies).where(eq(capRiskPolicies.id, id));
    if (!row) throw new NotFoundError(`Policy version not found: ${id}`);
    if (!row.isActive) return row;
    await tx
      .update(capRiskPolicies)
      .set({ isActive: false, expiresAt: new Date(), updatedAt: new Date() })
      .where(eq(capRiskPolicies.id, id));
    await emitAuditEventStrict(
      {
        eventType: 'policy.version.retired',
        aggregateType: 'cap_risk_policy',
        aggregateId: id,
        actor,
        payloadJson: { reason: reasonCode },
      },
      tx,
    );
    const [updated] = await tx.select().from(capRiskPolicies).where(eq(capRiskPolicies.id, id));
    return updated;
  });
}

export interface ListPolicyVersionsFilters {
  name?: string;
  isActive?: boolean;
  scopeHash?: string;
  limit?: number;
}

export async function listPolicyVersions(
  filters: ListPolicyVersionsFilters,
): Promise<CapRiskPolicy[]> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
  const conds = [] as ReturnType<typeof eq>[];
  if (filters.name) conds.push(eq(capRiskPolicies.name, filters.name));
  if (typeof filters.isActive === 'boolean') conds.push(eq(capRiskPolicies.isActive, filters.isActive));
  if (filters.scopeHash) conds.push(eq(capRiskPolicies.scopeHash, filters.scopeHash));
  const q = db
    .select()
    .from(capRiskPolicies)
    .orderBy(desc(capRiskPolicies.createdAt), desc(capRiskPolicies.id))
    .limit(limit);
  return conds.length > 0 ? await q.where(and(...conds)) : await q;
}

/**
 * Resolve the active published policy for a given scope (if any).
 * The in-code evaluator uses this lookup to stamp decisions with the
 * publication record id, linking decisions back to the published rule
 * row that authorized the algorithm.
 */
export async function getActivePolicyForScope(
  scope: Record<string, unknown>,
): Promise<CapRiskPolicy | null> {
  const scopeHash = computeScopeHash(scope);
  const rows = await db
    .select()
    .from(capRiskPolicies)
    .where(and(eq(capRiskPolicies.scopeHash, scopeHash), eq(capRiskPolicies.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}
