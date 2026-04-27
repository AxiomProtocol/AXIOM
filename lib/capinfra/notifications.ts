/**
 * Capital Infrastructure — Notifications service.
 *
 * Notifications are downstream effects of canonical audit events.
 * Per §0.1 they MUST NEVER block, fail, or roll back a settlement
 * transaction; every emission path is wrapped in best-effort error
 * handling and runs only after the parent transaction has committed.
 *
 * The system of record remains `cap_audit_events`. This module simply
 * projects selected event types into operator/user-facing notification
 * rows.
 */

import { and, desc, eq, isNull, type SQL } from 'drizzle-orm';
import { db } from '../../server/db';
import {
  capNotifications,
  type CapNotification,
  type NewCapNotification,
} from '../../shared/capInfraSchema';
import { generateId } from './ids';
import { runSubscribers, type NotificationContext } from './notifications/subscriptions';

export interface NotificationInput {
  userId?: string | null;
  channel?: 'in_app' | 'operator' | 'webhook';
  topic: string;
  severity?: CapNotification['severity'];
  subject: string;
  bodyJson?: Record<string, unknown> | null;
  correlationId?: string | null;
  relatedEventId?: string | null;
}

/**
 * Persist a notification row. Best-effort: logs and swallows errors
 * so a notifications failure cannot poison a settlement path.
 */
export async function emitNotification(input: NotificationInput): Promise<string | null> {
  try {
    const id = generateId('ntf');
    const row: NewCapNotification = {
      id,
      userId: input.userId ?? null,
      channel: input.channel ?? 'in_app',
      topic: input.topic,
      severity: input.severity ?? 'INFO',
      subject: input.subject.slice(0, 240),
      bodyJson: (input.bodyJson ?? null) as Record<string, unknown> | null,
      correlationId: input.correlationId ?? null,
      relatedEventId: input.relatedEventId ?? null,
    };
    await db.insert(capNotifications).values(row);
    return id;
  } catch (err) {
    console.error('[capinfra.notifications] persist failed', input.topic, err);
    return null;
  }
}

/**
 * Fan a context object out to every registered subscriber. Called by
 * `settlement.ts` AFTER the settlement transaction commits.
 */
export async function dispatchNotifications(ctx: NotificationContext): Promise<void> {
  try {
    await runSubscribers(ctx);
  } catch (err) {
    console.error('[capinfra.notifications] dispatch failed', ctx.eventType, err);
  }
}

// ─── Reads ─────────────────────────────────────────────────────────

export interface NotificationsFilter {
  userId?: string;
  topic?: string;
  unreadOnly?: boolean;
  limit?: number;
}

export async function listNotifications(filter: NotificationsFilter) {
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
  const conditions: SQL[] = [];
  if (filter.userId) conditions.push(eq(capNotifications.userId, filter.userId));
  if (filter.topic) conditions.push(eq(capNotifications.topic, filter.topic));
  if (filter.unreadOnly) conditions.push(isNull(capNotifications.readAt));
  const baseQuery = db
    .select()
    .from(capNotifications)
    .orderBy(desc(capNotifications.createdAt))
    .limit(limit);
  return conditions.length > 0 ? await baseQuery.where(and(...conditions)) : await baseQuery;
}

export async function markRead(id: string): Promise<CapNotification | null> {
  const [row] = await db
    .update(capNotifications)
    .set({ readAt: new Date() })
    .where(eq(capNotifications.id, id))
    .returning();
  return row ?? null;
}

export async function markUnread(id: string): Promise<CapNotification | null> {
  const [row] = await db
    .update(capNotifications)
    .set({ readAt: null })
    .where(eq(capNotifications.id, id))
    .returning();
  return row ?? null;
}
