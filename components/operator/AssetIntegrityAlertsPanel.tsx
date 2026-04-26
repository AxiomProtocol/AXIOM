/**
 * AssetIntegrityAlertsPanel — operator dashboard panel surfacing
 * unacknowledged auto-freeze (collateral.integrity_failed) alerts.
 *
 * Each row shows asset symbol, structured failure-mode kind, the
 * canonical rationale string, age since the alert was emitted, a
 * jump-to-asset link (the cap-infra console filtered by symbol),
 * and a "Mark read" button that hits the cookie-auth wrapper
 * /api/capinfra/operator/notifications/[id]/read.
 *
 * Empty state: "No active asset integrity alerts."
 */

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type {
  IntegrityAlertPaging,
  IntegrityAlertView,
} from '../../lib/capinfra/risk/integrityAlerts';

export interface AssetIntegrityAlertsPanelProps {
  alerts: IntegrityAlertView[];
  /**
   * Optional override for "now" so tests can pin age formatting
   * without mocking timers globally. Defaults to Date.now() at
   * render time.
   */
  nowMs?: number;
}

const KIND_LABEL: Record<string, string> = {
  oracle_stale: 'Oracle stale',
  reserve_attestation_failed: 'Reserve attestation',
  redemption_failed: 'Redemption',
  issuer_event: 'Issuer event',
  bridge_event: 'Bridge event',
  unknown: 'Unknown',
};

export function formatAge(ageMs: number): string {
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'just now';
  const s = Math.floor(ageMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface PagedChannelDisplay {
  /** Channel name (e.g. 'email', 'discord', 'pager'). */
  channel: string;
  /** True when the channel was successfully paged. */
  ok: boolean;
  /** First-line error reason for failed channels; null on success. */
  reason: string | null;
}

/**
 * Flatten an `IntegrityAlertPaging` blob into a stable list of
 * "channel + ✓/✗" rows for display. Successes come first (matching
 * the dispatcher's natural order), failures last with their reason
 * extracted from the `'<channel>: <reason>'` string format. Exported
 * so the test suite can pin the parser without mounting the panel.
 */
export function shapePagedChannelDisplay(
  paged: IntegrityAlertPaging,
): PagedChannelDisplay[] {
  const out: PagedChannelDisplay[] = [];
  for (const channel of paged.channels) {
    out.push({ channel, ok: true, reason: null });
  }
  for (const raw of paged.errors) {
    const idx = raw.indexOf(':');
    if (idx > 0) {
      out.push({
        channel: raw.slice(0, idx).trim(),
        ok: false,
        reason: raw.slice(idx + 1).trim(),
      });
    } else {
      // Malformed error string (no `:` separator). Surface the whole
      // string under a generic 'channel' name so the operator still
      // sees the error rather than the row silently swallowing it.
      out.push({ channel: 'channel', ok: false, reason: raw });
    }
  }
  return out;
}

export function buildAssetLink(symbol: string | null, assetId: string): string {
  // The cap-infra operator console is the closest thing to a per-asset
  // detail page; it accepts ?symbol= as an initial filter (see
  // pages/operations/cap-infra.tsx). Symbol is preferred for human
  // recognition; fall back to assetId so the link is never broken.
  const q = (symbol && symbol.length > 0 ? symbol : assetId).trim();
  return `/operations/cap-infra?symbol=${encodeURIComponent(q)}`;
}

interface BatchResponse {
  attempted: number;
  marked: string[];
  notFound: string[];
  failed: { id: string; error: string }[];
}

/**
 * Threshold above which "Mark all read" prompts the operator for
 * confirmation before clearing the queue. The common case (a handful
 * of alerts) stays a one-click action; a stray click during a busy
 * incident with many open alerts opens a dialog so the on-call has a
 * chance to back out before everything is dismissed.
 */
export const MARK_ALL_READ_CONFIRM_THRESHOLD = 5;

/**
 * Build the human-readable summary line shown on the confirm dialog,
 * e.g. "AXAU (Oracle stale), AXAG (Reserve attestation), AXPT
 * (Redemption), …+2 more". Exported so the test suite can pin it
 * without mounting the full panel.
 */
export function summarizeAlertsForConfirm(
  alerts: Pick<IntegrityAlertView, 'symbol' | 'assetId' | 'kind'>[],
  maxItems = 5,
): string {
  const head = alerts.slice(0, maxItems).map((a) => {
    const label = KIND_LABEL[a.kind] ?? a.kind;
    const id = a.symbol && a.symbol.length > 0 ? a.symbol : a.assetId;
    return `${id} (${label})`;
  });
  const remaining = alerts.length - head.length;
  if (remaining > 0) {
    head.push(`…+${remaining} more`);
  }
  return head.join(', ');
}

interface TestPageResponse {
  result: {
    channelsPaged: string[];
    errors: string[];
    skipped: boolean;
  };
}

export function AssetIntegrityAlertsPanel({
  alerts,
  nowMs,
}: AssetIntegrityAlertsPanelProps) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [batchPending, setBatchPending] = useState(false);
  const [testPagePending, setTestPagePending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onSendTestPage = useCallback(async () => {
    setError(null);
    setNotice(null);
    setTestPagePending(true);
    try {
      const res = await fetch('/api/capinfra/risk/integrity/test-page', {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `sendTestPage failed: ${res.status} ${body || ''}`.trim(),
        );
      }
      const data = (await res.json().catch(() => null)) as TestPageResponse | null;
      const result = data?.result;
      if (!result) {
        throw new Error('sendTestPage failed: malformed response');
      }
      if (result.skipped) {
        setError(
          'Test page not sent — no paging channels are configured. Set INTEGRITY_ALERT_EMAIL and/or INTEGRITY_ALERT_DISCORD_WEBHOOK in production.',
        );
      } else if (result.errors.length > 0) {
        const channelsTxt =
          result.channelsPaged.length > 0
            ? ` (sent on: ${result.channelsPaged.join(', ')})`
            : '';
        setError(
          `Test page reported channel errors: ${result.errors.join('; ')}${channelsTxt}.`,
        );
      } else {
        setNotice(
          `Test page sent on: ${result.channelsPaged.join(', ')}. Confirm on-call received it before clearing this notice.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test page');
    } finally {
      setTestPagePending(false);
    }
  }, []);

  const onMarkRead = useCallback(async (id: string) => {
    setError(null);
    setNotice(null);
    setPending((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const res = await fetch(
        `/api/capinfra/operator/notifications/${encodeURIComponent(id)}/read`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`markRead failed: ${res.status} ${body || ''}`.trim());
      }
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark read');
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  const now = nowMs ?? Date.now();

  const runMarkAllRead = useCallback(async () => {
    setError(null);
    setNotice(null);
    const ids = visible.map((a) => a.id);
    if (ids.length === 0) return;
    setBatchPending(true);
    try {
      const res = await fetch(
        '/api/capinfra/operator/notifications/mark-read-batch',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `markAllRead failed: ${res.status} ${body || ''}`.trim(),
        );
      }
      const data = (await res.json().catch(() => null)) as BatchResponse | null;
      if (!data || !Array.isArray(data.marked)) {
        throw new Error('markAllRead failed: malformed response');
      }
      if (data.marked.length > 0) {
        setDismissed((prev) => {
          const next = new Set(prev);
          for (const mid of data.marked) next.add(mid);
          return next;
        });
      }
      // Surface partial failures explicitly so the operator knows
      // some rows are still open and need attention.
      const failedCount =
        (data.failed?.length ?? 0) + (data.notFound?.length ?? 0);
      if (failedCount > 0) {
        setError(
          `Marked ${data.marked.length} of ${data.attempted} — ${failedCount} could not be marked read.`,
        );
      } else {
        setNotice(`Marked ${data.marked.length} of ${data.attempted} read.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all read');
    } finally {
      setBatchPending(false);
    }
  }, [visible]);

  const onMarkAllRead = useCallback(() => {
    if (visible.length === 0) return;
    if (visible.length > MARK_ALL_READ_CONFIRM_THRESHOLD) {
      // Big batch — pause and let the on-call confirm so a misclick
      // during an incident can't silently clear the queue.
      setError(null);
      setNotice(null);
      setConfirmOpen(true);
      return;
    }
    void runMarkAllRead();
  }, [visible.length, runMarkAllRead]);

  const onConfirmMarkAllRead = useCallback(() => {
    setConfirmOpen(false);
    void runMarkAllRead();
  }, [runMarkAllRead]);

  const onCancelMarkAllRead = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  return (
    <section
      className="border border-dl-border p-4 mb-6"
      data-testid="asset-integrity-alerts-panel"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-serif text-lg">Asset integrity alerts</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSendTestPage}
            disabled={testPagePending}
            className="text-xs uppercase tracking-wide border border-dl-border px-3 py-1 hover:bg-dl-muted/10 disabled:opacity-50"
            data-testid="asset-integrity-alerts-send-test-page"
            title="Send a clearly-labelled synthetic page to verify the on-call email + Discord wiring is healthy."
          >
            {testPagePending ? 'Sending…' : 'Send test page'}
          </button>
          {visible.length > 0 ? (
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={batchPending}
              className="text-xs uppercase tracking-wide border border-dl-border px-3 py-1 hover:bg-dl-muted/10 disabled:opacity-50"
              data-testid="asset-integrity-alerts-mark-all-read"
            >
              {batchPending ? 'Marking all…' : 'Mark all read'}
            </button>
          ) : null}
          <Link
            href="/operator/integrity"
            className="text-xs underline text-dl-muted"
            data-testid="asset-integrity-alerts-all-link"
          >
            All integrity alerts →
          </Link>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-3 border-l-4 border-l-red-500 border border-dl-border bg-red-50 p-2 text-xs font-mono text-red-800"
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="mb-3 border-l-4 border-l-green-500 border border-dl-border bg-green-50 p-2 text-xs font-mono text-green-800"
          data-testid="asset-integrity-alerts-notice"
        >
          {notice}
        </div>
      ) : null}

      {confirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="asset-integrity-alerts-confirm-title"
          className="mb-3 border-l-4 border-l-amber-500 border border-dl-border bg-amber-50 p-3 text-xs font-mono text-amber-900"
          data-testid="asset-integrity-alerts-confirm"
        >
          <p
            id="asset-integrity-alerts-confirm-title"
            className="font-bold mb-1"
          >
            Mark all {visible.length} alerts as read?
          </p>
          <p
            className="mb-2 break-words"
            data-testid="asset-integrity-alerts-confirm-summary"
          >
            About to clear: {summarizeAlertsForConfirm(visible)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirmMarkAllRead}
              disabled={batchPending}
              className="text-xs uppercase tracking-wide border border-dl-border bg-white px-3 py-1 hover:bg-dl-muted/10 disabled:opacity-50"
              data-testid="asset-integrity-alerts-confirm-yes"
            >
              {batchPending ? 'Marking all…' : `Yes, mark ${visible.length} read`}
            </button>
            <button
              type="button"
              onClick={onCancelMarkAllRead}
              disabled={batchPending}
              className="text-xs uppercase tracking-wide border border-dl-border bg-white px-3 py-1 hover:bg-dl-muted/10 disabled:opacity-50"
              data-testid="asset-integrity-alerts-confirm-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-sm text-dl-muted" data-testid="asset-integrity-alerts-empty">
          No active asset integrity alerts.
        </p>
      ) : (
        <ul className="divide-y divide-dl-border" data-testid="asset-integrity-alerts-list">
          {visible.map((a) => {
            const isPending = pending.has(a.id);
            return (
              <li
                key={a.id}
                className="py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                data-testid={`asset-integrity-alert-${a.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                    <span className="font-mono font-bold text-dl-navy">
                      {a.symbol ?? a.assetId}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider border border-red-300 bg-red-50 text-red-800 px-1.5 py-0.5 font-mono">
                      {KIND_LABEL[a.kind] ?? a.kind}
                    </span>
                    <span className="text-xs text-dl-muted font-mono">
                      {formatAge(now - a.createdAtMs)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-mono text-dl-muted break-words">
                    {a.rationale}
                  </p>
                  {a.paged ? (
                    <div
                      className="mt-1 text-[11px] font-mono text-dl-muted flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                      data-testid={`asset-integrity-alert-${a.id}-paged`}
                    >
                      <span className="text-[10px] uppercase tracking-wider text-dl-muted">
                        Paged:
                      </span>
                      {a.paged.skipped ? (
                        <span
                          className="text-amber-700"
                          data-testid={`asset-integrity-alert-${a.id}-paged-skipped`}
                          title="No paging channels are configured. Set INTEGRITY_ALERT_EMAIL and/or INTEGRITY_ALERT_DISCORD_WEBHOOK so on-call is woken on the next auto-freeze."
                        >
                          not configured
                        </span>
                      ) : (
                        shapePagedChannelDisplay(a.paged).map((c, i) => (
                          <span
                            key={`${a.id}-paged-${i}-${c.channel}`}
                            className={
                              c.ok ? 'text-green-700' : 'text-red-700'
                            }
                            data-testid={`asset-integrity-alert-${a.id}-paged-${c.channel}`}
                            title={
                              c.ok
                                ? `${c.channel} channel paged successfully`
                                : `${c.channel} channel failed: ${c.reason ?? 'unknown error'}`
                            }
                          >
                            {c.channel} {c.ok ? '✓' : '✗'}
                            {!c.ok && c.reason ? ` (${c.reason})` : ''}
                          </span>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-start gap-2 shrink-0">
                  <Link
                    href={buildAssetLink(a.symbol, a.assetId)}
                    className="text-xs uppercase tracking-wide border border-dl-border px-3 py-1 hover:bg-dl-muted/10"
                    data-testid={`asset-integrity-alert-${a.id}-jump`}
                  >
                    Open asset →
                  </Link>
                  <button
                    type="button"
                    onClick={() => onMarkRead(a.id)}
                    disabled={isPending}
                    className="text-xs uppercase tracking-wide border border-dl-border px-3 py-1 hover:bg-dl-muted/10 disabled:opacity-50"
                    data-testid={`asset-integrity-alert-${a.id}-mark-read`}
                  >
                    {isPending ? 'Marking…' : 'Mark read'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
