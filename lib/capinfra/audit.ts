/**
 * Capital Infrastructure — append-only audit event writer (the spine).
 *
 * Every mutating Phase 1 endpoint emits an audit event via this writer.
 * Failures are logged but never abort the parent path: the audit table
 * is the system of record for what happened, but losing one row must
 * not corrupt a settlement or policy decision.
 */

import { db } from '../../server/db';
import { capAuditEvents, type NewCapAuditEvent } from '../../shared/capInfraSchema';
import { generateId } from './ids';
import { and, desc, eq, gte, lte, lt, or, SQL, sql } from 'drizzle-orm';

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

  return { items, nextCursor };
}
