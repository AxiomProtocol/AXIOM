/**
 * Capital Infrastructure — Recent operator-channel integrity alerts.
 *
 * Backs the "Asset integrity alerts" panel on the operator dashboard
 * (pages/operator/index.tsx) and the dedicated /operator/integrity
 * page that surfaces both unread and recently-acknowledged rows.
 *
 * When `risk/integrity.recordIntegrityFailure` flips an asset to RED
 * it emits a `collateral.integrity_failed` notification on the
 * `operator` channel with a structured `bodyJson` carrying
 * { assetId, symbol, kind, rationale, ... }.
 *
 * This module reads recent rows for that topic and shapes them into
 * a stable view-model the UI can render without having to know the
 * bodyJson schema.
 *
 * Reads only — write/dedup logic stays in `risk/integrity.ts`. Mark-
 * read goes through the existing `notifications.markRead` service via
 * `pages/api/capinfra/operator/notifications/[id]/read.ts`.
 */

import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import { db } from '../../../server/db';
import { capNotifications } from '../../../shared/capInfraSchema';

export const INTEGRITY_ALERT_TOPIC = 'collateral.integrity_failed';

/** Default cutoff for the "recent" window on the integrity page (24h). */
export const INTEGRITY_ALERT_DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type IntegrityAlertKind =
  | 'oracle_stale'
  | 'reserve_attestation_failed'
  | 'redemption_failed'
  | 'issuer_event'
  | 'bridge_event'
  | 'unknown';

export interface IntegrityAlertView {
  /** Notification row id; the mark-read endpoint takes this. */
  id: string;
  /** Affected asset id (always present — produced by integrity.ts). */
  assetId: string;
  /** Affected asset symbol; null if the asset row was missing on emit. */
  symbol: string | null;
  /** Structured failure-mode discriminator from the integrity producer. */
  kind: IntegrityAlertKind;
  /** Human-readable rationale already containing kind prefix + detail. */
  rationale: string;
  /** Notification subject line, used as a fallback display string. */
  subject: string;
  /** Unix-ms timestamp the notification row was created. */
  createdAtMs: number;
  /**
   * Unix-ms timestamp the notification was acknowledged ("Mark read"),
   * or null if the row is still unread. The /operator/integrity page
   * uses this to distinguish acknowledged rows from active alerts.
   */
  readAtMs: number | null;
}

interface CollateralIntegrityBody {
  assetId?: unknown;
  symbol?: unknown;
  kind?: unknown;
  rationale?: unknown;
  detail?: unknown;
}

const KNOWN_KINDS = new Set<IntegrityAlertKind>([
  'oracle_stale',
  'reserve_attestation_failed',
  'redemption_failed',
  'issuer_event',
  'bridge_event',
]);

function coerceKind(raw: unknown): IntegrityAlertKind {
  if (typeof raw === 'string' && KNOWN_KINDS.has(raw as IntegrityAlertKind)) {
    return raw as IntegrityAlertKind;
  }
  return 'unknown';
}

function coerceString(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Map a raw notification row into the panel's view-model. Exported
 * for tests so they can pin the shape without touching the DB.
 *
 * `readAt` is optional so existing callers (and tests) that only
 * pass the unread-row fields keep working — it defaults to null.
 */
export function shapeIntegrityAlert(row: {
  id: string;
  subject: string;
  bodyJson: unknown;
  createdAt: Date;
  readAt?: Date | null;
}): IntegrityAlertView | null {
  const body = (row.bodyJson ?? {}) as CollateralIntegrityBody;
  const assetId = coerceString(body.assetId);
  // Without an assetId we cannot link or disambiguate; treat the row
  // as malformed and skip it rather than render a broken link.
  if (!assetId) return null;
  return {
    id: row.id,
    assetId,
    symbol: coerceString(body.symbol),
    kind: coerceKind(body.kind),
    // Prefer the structured rationale; fall back to detail; finally
    // the subject so the row is never visually empty.
    rationale:
      coerceString(body.rationale) ??
      coerceString(body.detail) ??
      row.subject,
    subject: row.subject,
    createdAtMs: row.createdAt.getTime(),
    readAtMs: row.readAt ? row.readAt.getTime() : null,
  };
}

export interface ListIntegrityAlertsOptions {
  /** Cap on the number of rows returned. Hard ceiling at 50. */
  limit?: number;
}

/**
 * Returns the most-recent UNREAD `collateral.integrity_failed`
 * operator-channel notifications, newest first, shaped for the
 * operator dashboard panel.
 */
export async function listRecentUnreadIntegrityAlerts(
  opts: ListIntegrityAlertsOptions = {},
): Promise<IntegrityAlertView[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);
  const rows = await db
    .select({
      id: capNotifications.id,
      subject: capNotifications.subject,
      bodyJson: capNotifications.bodyJson,
      createdAt: capNotifications.createdAt,
      readAt: capNotifications.readAt,
    })
    .from(capNotifications)
    .where(
      and(
        eq(capNotifications.topic, INTEGRITY_ALERT_TOPIC),
        eq(capNotifications.channel, 'operator'),
        isNull(capNotifications.readAt),
      ),
    )
    .orderBy(desc(capNotifications.createdAt))
    .limit(limit);

  const out: IntegrityAlertView[] = [];
  for (const row of rows) {
    const view = shapeIntegrityAlert(row);
    if (view) out.push(view);
  }
  return out;
}

export interface ListRecentIntegrityAlertsOptions {
  /** Cap on the number of rows returned. Hard ceiling at 200. */
  limit?: number;
  /**
   * When true, include rows that have already been acknowledged
   * (`readAt IS NOT NULL`). When false, behaves like
   * `listRecentUnreadIntegrityAlerts` but still respects `sinceMs`.
   * Defaults to false so the dedicated /operator/integrity page can
   * keep its default "focused on unread" view.
   */
  includeRead?: boolean;
  /**
   * Lower bound on `createdAt` (Unix-ms). Rows older than this are
   * filtered out so the page stays bounded even with a large
   * historical backlog. Defaults to now − 24h
   * (`INTEGRITY_ALERT_DEFAULT_WINDOW_MS`).
   */
  sinceMs?: number;
  /** Override for "now" so tests can pin the default sinceMs window. */
  nowMs?: number;
}

/**
 * Returns recent `collateral.integrity_failed` operator-channel
 * notifications, newest first, shaped for the operator integrity
 * console (/operator/integrity). Unlike
 * `listRecentUnreadIntegrityAlerts`, this can include acknowledged
 * rows so operators can see "what auto-froze in the last 24h,
 * including ones we already cleared".
 */
export async function listRecentIntegrityAlerts(
  opts: ListRecentIntegrityAlertsOptions = {},
): Promise<IntegrityAlertView[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const now = opts.nowMs ?? Date.now();
  const sinceMs = opts.sinceMs ?? now - INTEGRITY_ALERT_DEFAULT_WINDOW_MS;
  const sinceDate = new Date(sinceMs);

  const conditions = [
    eq(capNotifications.topic, INTEGRITY_ALERT_TOPIC),
    eq(capNotifications.channel, 'operator'),
    gte(capNotifications.createdAt, sinceDate),
  ];
  if (!opts.includeRead) {
    conditions.push(isNull(capNotifications.readAt));
  }

  const rows = await db
    .select({
      id: capNotifications.id,
      subject: capNotifications.subject,
      bodyJson: capNotifications.bodyJson,
      createdAt: capNotifications.createdAt,
      readAt: capNotifications.readAt,
    })
    .from(capNotifications)
    .where(and(...conditions))
    .orderBy(desc(capNotifications.createdAt))
    .limit(limit);

  const out: IntegrityAlertView[] = [];
  for (const row of rows) {
    const view = shapeIntegrityAlert(row);
    if (view) out.push(view);
  }
  return out;
}
