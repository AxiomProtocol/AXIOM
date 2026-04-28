/**
 * Capital Infrastructure — append-only audit event writer (the spine).
 *
 * Every mutating Phase 1 endpoint emits an audit event via this writer.
 * Failures are logged but never abort the parent path: the audit table
 * is the system of record for what happened, but losing one row must
 * not corrupt a settlement or policy decision.
 */

import { db } from '../../server/db';
import { capAuditEvents, capIdentityProfiles, type NewCapAuditEvent } from '../../shared/capInfraSchema';
import { generateId } from './ids';
import { and, desc, eq, gte, inArray, lte, lt, or, SQL, sql } from 'drizzle-orm';

type DbLike = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface AuditEventInput {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  userId?: string | null;
  assetId?: string | null;
  instructionId?: string | null;
  payloadJson?: Record<string, unknown> | null;
  correlationId?: string | null;
  actor?: string | null;
}

/**
 * Strong-guarantee audit writer. Throws on failure so the caller's
 * transaction (if any) rolls back. Use this from inside `db.transaction`
 * blocks for mutations that must be atomic with their audit row — i.e.
 * every Phase 1 mutation (asset CRUD, wallet link, price ingest, policy
 * decision persist).
 *
 * Pass the transactional handle as `dbHandle` to enlist the insert in
 * the surrounding tx; omit it for fire-and-forget audit-only writes.
 */
export async function emitAuditEventStrict(
  input: AuditEventInput,
  dbHandle: DbLike = db,
): Promise<string> {
  const id = generateId('ae');
  const row: NewCapAuditEvent = {
    id,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    userId: input.userId ?? null,
    assetId: input.assetId ?? null,
    instructionId: input.instructionId ?? null,
    payloadJson: (input.payloadJson ?? null) as Record<string, unknown> | null,
    correlationId: input.correlationId ?? null,
    actor: input.actor ?? null,
  };
  await (dbHandle as typeof db).insert(capAuditEvents).values(row);
  return id;
}

/**
 * Soft-guarantee audit writer. Logs and swallows errors. Reserved for
 * non-critical paths where losing one audit row must not abort the
 * parent operation.
 */
export async function emitAuditEvent(input: AuditEventInput): Promise<string | null> {
  try {
    return await emitAuditEventStrict(input);
  } catch (err) {
    console.error('[capinfra.audit] failed to emit', input.eventType, err);
    return null;
  }
}

export interface AuditQueryFilters {
  aggregateType?: string;
  aggregateId?: string;
  eventType?: string;
  userId?: string;
  assetId?: string;
  instructionId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
}

/**
 * Cursor format: `<iso-timestamp>|<id>`. The composite ordering
 * `(createdAt desc, id desc)` plus a tuple cursor guarantees stable,
 * non-skipping pagination even though IDs are random nanoid strings.
 */
function encodeCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}|${id}`;
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  const sep = cursor.lastIndexOf('|');
  if (sep <= 0) return null;
  const ts = cursor.slice(0, sep);
  const id = cursor.slice(sep + 1);
  const d = new Date(ts);
  if (Number.isNaN(d.getTime()) || !id) return null;
  return { createdAt: d, id };
}

export async function listAuditEvents(filters: AuditQueryFilters) {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
  const conditions: SQL[] = [];
  if (filters.aggregateType) conditions.push(eq(capAuditEvents.aggregateType, filters.aggregateType));
  if (filters.aggregateId) conditions.push(eq(capAuditEvents.aggregateId, filters.aggregateId));
  if (filters.eventType) conditions.push(eq(capAuditEvents.eventType, filters.eventType));
  if (filters.userId) conditions.push(eq(capAuditEvents.userId, filters.userId));
  if (filters.assetId) conditions.push(eq(capAuditEvents.assetId, filters.assetId));
  if (filters.instructionId) conditions.push(eq(capAuditEvents.instructionId, filters.instructionId));
  if (filters.from) conditions.push(gte(capAuditEvents.createdAt, filters.from));
  if (filters.to) conditions.push(lte(capAuditEvents.createdAt, filters.to));

  if (filters.cursor) {
    const decoded = decodeCursor(filters.cursor);
    if (decoded) {
      // (createdAt, id) < (cursor.createdAt, cursor.id)
      const tupleCondition = or(
        lt(capAuditEvents.createdAt, decoded.createdAt),
        and(eq(capAuditEvents.createdAt, decoded.createdAt), lt(capAuditEvents.id, decoded.id)),
      ) as SQL;
      conditions.push(tupleCondition);
    }
  }

  const baseQuery = db
    .select()
    .from(capAuditEvents)
    .orderBy(desc(capAuditEvents.createdAt), desc(capAuditEvents.id))
    .limit(limit + 1);
  const rows =
    conditions.length > 0 ? await baseQuery.where(and(...conditions)) : await baseQuery;

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

  // Batch-fetch legal names for every distinct userId on this page (single query).
  const userIds = [...new Set(items.map((r) => r.userId).filter((id): id is string => id != null))];
  const legalNameMap: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const profiles = await db
      .select({ userId: capIdentityProfiles.userId, legalName: capIdentityProfiles.legalName })
      .from(capIdentityProfiles)
      .where(inArray(capIdentityProfiles.userId, userIds));
    for (const p of profiles) {
      legalNameMap[p.userId] = p.legalName ?? null;
    }
  }

  const enrichedItems = items.map((r) => ({
    ...r,
    legalName: r.userId != null ? (legalNameMap[r.userId] ?? null) : null,
  }));

  return { items: enrichedItems, nextCursor };
}

/**
 * Queries the audit table for the most recent `risk.integrity.test_page_sent`
 * event that matches either the given actor or the given client IP within the
 * last `windowMs` milliseconds. Returns the event's `createdAt` timestamp so
 * the caller can compute a precise `retry_after_seconds` hint, or `null` if
 * no blocking event exists.
 *
 * This is the shared-store backing for the test-page per-actor / per-IP
 * cooldown. Keying off the audit table means the cooldown survives process
 * restarts and applies uniformly across every Next.js replica behind the load
 * balancer — there is no instance-local state to bypass.
 *
 * The IP is stored in `payloadJson->>'ip'` by the test-page handler; if an
 * older row was written before the IP field was added it simply won't match
 * the IP axis (which is fine — it still matches the actor axis if the actor
 * is the same).
 */
export async function getLatestTestPageEvent(
  actor: string,
  ip: string,
  windowMs: number,
): Promise<{ createdAt: Date } | null> {
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({ createdAt: capAuditEvents.createdAt })
    .from(capAuditEvents)
    .where(
      and(
        eq(capAuditEvents.eventType, 'risk.integrity.test_page_sent'),
        gte(capAuditEvents.createdAt, since),
        // Exclude skipped calls — no channel was paged, so the cooldown
        // must not fire (consistent with the original in-process behaviour
        // where armCooldown was only called when !result.skipped).
        sql`(${capAuditEvents.payloadJson}->>'skipped')::boolean IS NOT TRUE`,
        or(
          eq(capAuditEvents.actor, actor),
          sql`${capAuditEvents.payloadJson}->>'ip' = ${ip}`,
        ) as SQL,
      ),
    )
    .orderBy(desc(capAuditEvents.createdAt))
    .limit(1);
  return row ?? null;
}

export interface BatchMarkReadSummary {
  /** Most recent batch event, or null if none exist. */
  lastBatch: {
    attempted: number;
    markedCount: number;
    createdAt: string;
  } | null;
  /** Total alerts marked read via batch in the last 24 hours. */
  clearedToday: number;
}

/**
 * Returns a summary of recent `operator.notifications.batch_mark_read`
 * audit events: the most recent event (regardless of age) and an exact
 * 24-hour aggregate computed in the database.
 *
 * Two separate queries are used so that `lastBatch` is never hidden
 * just because the most recent click happened more than 24 h ago, and
 * so that `clearedToday` is an exact SUM rather than a JS-side total
 * that could undercount on high-volume days.
 *
 * Best-effort — returns zeros/null on failure so the dashboard renders.
 */
export async function getBatchMarkReadSummary(): Promise<BatchMarkReadSummary> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // (a) Most recent batch event — no age filter.
  const [latestRow] = await db
    .select({
      payloadJson: capAuditEvents.payloadJson,
      createdAt: capAuditEvents.createdAt,
    })
    .from(capAuditEvents)
    .where(eq(capAuditEvents.eventType, 'operator.notifications.batch_mark_read'))
    .orderBy(desc(capAuditEvents.createdAt))
    .limit(1);

  let lastBatch: BatchMarkReadSummary['lastBatch'] = null;
  if (latestRow) {
    const payload = latestRow.payloadJson as Record<string, unknown> | null;
    const markedCount =
      typeof payload?.markedCount === 'number' ? payload.markedCount : 0;
    const attempted =
      typeof payload?.attempted === 'number' ? payload.attempted : markedCount;
    lastBatch = {
      attempted,
      markedCount,
      createdAt: latestRow.createdAt.toISOString(),
    };
  }

  // (b) 24-hour aggregate — exact SUM in SQL, no row-count cap.
  const [sumRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM((${capAuditEvents.payloadJson}->>'markedCount')::int), 0)`,
    })
    .from(capAuditEvents)
    .where(
      and(
        eq(capAuditEvents.eventType, 'operator.notifications.batch_mark_read'),
        gte(capAuditEvents.createdAt, since),
      ),
    );

  const clearedToday = Number(sumRow?.total ?? 0);

  return { lastBatch, clearedToday };
}
