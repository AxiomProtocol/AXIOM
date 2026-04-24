/**
 * Capital Infrastructure — Recent operator-channel integrity alerts.
 *
 * Backs the "Asset integrity alerts" panel on the operator dashboard
 * (pages/operator/index.tsx). When `risk/integrity.recordIntegrityFailure`
 * flips an asset to RED it emits a `collateral.integrity_failed`
 * notification on the `operator` channel with a structured `bodyJson`
 * carrying { assetId, symbol, kind, rationale, ... }.
 *
 * This module reads the most recent UNREAD rows for that topic and
 * shapes them into a stable view-model the UI can render without
 * having to know the bodyJson schema.
 *
 * Reads only — write/dedup logic stays in `risk/integrity.ts`. Mark-
 * read goes through the existing `notifications.markRead` service via
 * `pages/api/capinfra/operator/notifications/[id]/read.ts`.
 */

import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../../server/db';
import { capNotifications } from '../../../shared/capInfraSchema';

export const INTEGRITY_ALERT_TOPIC = 'collateral.integrity_failed';

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
 */
export function shapeIntegrityAlert(row: {
  id: string;
  subject: string;
  bodyJson: unknown;
  createdAt: Date;
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
