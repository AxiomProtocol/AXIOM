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

/**
 * On-call paging summary persisted alongside the operator-channel
 * notification row by `recordIntegrityFailure`. Mirrors the
 * `IntegrityPagerResult` shape from `notifications/integrityPager`
 * but is intentionally re-declared here so the UI does not transit
 * the producer module just to read its own view-model.
 */
export interface IntegrityAlertPaging {
  /** Channels that successfully woke on-call (e.g. ['email']). */
  channels: string[];
  /**
   * Per-channel error strings from the dispatcher, formatted as
   * `'<channel>: <message>'` (e.g. 'discord: HTTP 429: rate limited').
   * The synthetic `pager: <msg>` channel is used when the dispatcher
   * itself threw unexpectedly.
   */
  errors: string[];
  /**
   * `true` when no paging channels were configured at the moment the
   * auto-freeze fired (neither `INTEGRITY_ALERT_EMAIL` nor
   * `INTEGRITY_ALERT_DISCORD_WEBHOOK`). Surfaces as a distinct
   * "not configured" badge so operators don't conflate "no channels
   * set up" with "every channel failed".
   */
  skipped: boolean;
}

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
  /**
   * Summary of which on-call paging channels actually fired (or failed)
   * for this auto-freeze. Null on legacy rows written before the pager
   * result was persisted (task #258); the UI renders nothing in that
   * case rather than misrepresenting old data as "0 channels paged".
   */
  paged: IntegrityAlertPaging | null;
}

interface CollateralIntegrityBody {
  assetId?: unknown;
  symbol?: unknown;
  kind?: unknown;
  rationale?: unknown;
  detail?: unknown;
  paged?: unknown;
}

const KNOWN_KINDS = new Set<IntegrityAlertKind>([
  'oracle_stale',
  'reserve_attestation_failed',
  'redemption_failed',
  'issuer_event',
  'bridge_event',
]);

/**
 * All `IntegrityAlertKind` values that can appear in the integrity
 * console — the structured failure modes plus the synthetic
 * `'unknown'` bucket the shaper falls back to. Exposed so SSR query-
 * param parsing can validate `?kind=…` against the same set the
 * filter uses, without each caller having to re-enumerate them.
 */
export const INTEGRITY_ALERT_KINDS: readonly IntegrityAlertKind[] = [
  'oracle_stale',
  'reserve_attestation_failed',
  'redemption_failed',
  'issuer_event',
  'bridge_event',
  'unknown',
];

function coerceKind(raw: unknown): IntegrityAlertKind {
  if (typeof raw === 'string' && KNOWN_KINDS.has(raw as IntegrityAlertKind)) {
    return raw as IntegrityAlertKind;
  }
  return 'unknown';
}

/**
 * Parse an arbitrary user-supplied string (e.g. from `?kind=…`) into
 * an `IntegrityAlertKind`. Returns null when the value is missing or
 * not a recognised kind, so the page can drop the filter rather than
 * silently coerce to `'unknown'` (which would hide every structured
 * row under an unrelated label).
 */
export function parseIntegrityAlertKind(
  raw: string | undefined | null,
): IntegrityAlertKind | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed === 'unknown') return 'unknown';
  if (KNOWN_KINDS.has(trimmed as IntegrityAlertKind)) {
    return trimmed as IntegrityAlertKind;
  }
  return null;
}

function coerceString(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.length > 0) out.push(item);
  }
  return out;
}

/**
 * Shape the optional `paged` blob from the notification's bodyJson into
 * the panel's view-model. Returns null when the field is missing or
 * structurally unrecognisable so legacy rows (written before task #258)
 * render the same way they always did. We deliberately accept partial
 * shapes (e.g. `channels` present but `errors` missing) so a malformed
 * dispatch result never blanks the rest of the row.
 */
export function shapeIntegrityAlertPaging(raw: unknown): IntegrityAlertPaging | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { channels?: unknown; errors?: unknown; skipped?: unknown };
  const channels = coerceStringArray(obj.channels);
  const errors = coerceStringArray(obj.errors);
  const skipped = obj.skipped === true;
  // If the blob carried nothing recognisable at all, treat it as
  // missing so the UI doesn't render an empty "Paged:" row.
  if (channels.length === 0 && errors.length === 0 && !skipped) {
    return null;
  }
  return { channels, errors, skipped };
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
    paged: shapeIntegrityAlertPaging(body.paged),
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
  /**
   * When set, restrict results to rows whose shaped `symbol` matches
   * (case-insensitive) the provided value. Filtering happens in
   * memory after row shaping because `symbol` lives inside `bodyJson`
   * and is not a first-class column. Rows with a null symbol are
   * always excluded when this filter is active.
   */
  symbol?: string;
  /**
   * When set, restrict results to rows whose shaped `kind` equals the
   * provided value (including the synthetic `'unknown'` bucket).
   * Filtering happens in memory after row shaping for the same reason
   * as `symbol` above.
   */
  kind?: IntegrityAlertKind;
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

  const symbolFilter =
    typeof opts.symbol === 'string' && opts.symbol.trim().length > 0
      ? opts.symbol.trim().toUpperCase()
      : null;
  const kindFilter = opts.kind ?? null;

  const out: IntegrityAlertView[] = [];
  for (const row of rows) {
    const view = shapeIntegrityAlert(row);
    if (!view) continue;
    if (symbolFilter !== null) {
      if (!view.symbol) continue;
      if (view.symbol.toUpperCase() !== symbolFilter) continue;
    }
    if (kindFilter !== null && view.kind !== kindFilter) continue;
    out.push(view);
  }
  return out;
}
