/**
 * /operator/integrity — dedicated console for `collateral.integrity_failed`
 * (auto-freeze) operator notifications.
 *
 * The dashboard panel (components/operator/AssetIntegrityAlertsPanel)
 * only surfaces UNREAD alerts, so once an operator clicks "Mark read"
 * the row vanishes and the only place to find it again is the generic
 * /operator/notifications table. This page exists to answer "what
 * auto-froze in the last 24h, including the ones we've already
 * cleared?" — same columns as the dashboard panel (symbol, kind,
 * rationale, age, asset link), with a "show acknowledged" toggle that
 * keeps the default view focused on unread.
 *
 * The window is bounded by `INTEGRITY_ALERT_DEFAULT_WINDOW_MS` (24h)
 * via `listRecentIntegrityAlerts` so the page stays bounded even with
 * a large historical backlog.
 *
 * During multi-asset incidents (e.g. an oracle outage that flips
 * several assets to RED at once) the page can grow long, so we also
 * accept `?symbol=…` and `?kind=…` query params and surface the
 * active filters as a strip with a "Clear filters" link. Deep-linking
 * from elsewhere with `?symbol=AXAU` lands on the filtered view.
 */

import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { requireOperatorCookie } from '../../lib/capinfra/operatorAuth';
import {
  INTEGRITY_ALERT_DEFAULT_WINDOW_MS,
  listRecentIntegrityAlerts,
  parseIntegrityAlertKind,
  parseIntegrityWindowParam,
  windowToSinceMs,
  type IntegrityAlertKind,
  type IntegrityAlertView,
  type IntegrityAlertWindow,
} from '../../lib/capinfra/risk/integrityAlerts';
import {
  buildAssetLink,
  formatAge,
  shapePagedChannelDisplay,
} from '../../components/operator/AssetIntegrityAlertsPanel';
import { IntegrityPagerStatusBanner } from '../../components/operator/IntegrityPagerStatusBanner';
import { IntegrityPagerWiringCheckStatus } from '../../components/operator/IntegrityPagerWiringCheckStatus';
import {
  getIntegrityPagerStatus,
  type IntegrityPagerStatus,
} from '../../lib/capinfra/notifications/integrityPagerStatus';
import {
  getLastIntegrityPagerWiringCheckRun,
  type WiringCheckRunRecord,
} from '../../lib/capinfra/notifications/integrityPagerWiringCheck';

const KIND_LABEL: Record<string, string> = {
  oracle_stale: 'Oracle stale',
  reserve_attestation_failed: 'Reserve attestation',
  redemption_failed: 'Redemption',
  issuer_event: 'Issuer event',
  bridge_event: 'Bridge event',
  unknown: 'Unknown',
};

interface Props {
  alerts: IntegrityAlertView[];
  showAcknowledged: boolean;
  windowHours: number;
  loadError: string | null;
  generatedAtMs: number;
  symbolFilter: string | null;
  kindFilter: IntegrityAlertKind | null;
  /**
   * `?failed_pages=1` toggle — when true, only rows whose on-call
   * pager either failed or was skipped are shown. Optional in the
   * type because earlier callers (and a few legacy test fixtures)
   * predate the toggle; SSR always supplies a concrete boolean.
   */
  failedPagesFilter?: boolean;
  /**
   * Active time-window filter from `?window=…`. Null means the
   * default 24h window is in use (no chip is shown). When set to
   * any allow-listed value the filter strip renders a window chip
   * with a "reset to 24h" clear link. Optional so legacy test
   * fixtures that predate this prop keep compiling without changes.
   */
  windowFilter?: IntegrityAlertWindow | null;
  /**
   * Booleans-only snapshot of the on-call pager configuration. Used
   * to render the status banner at the top of the page (Task #305).
   * Optional in the type so the test suite's existing fixtures keep
   * compiling; SSR always supplies a concrete value.
   */
  pagerStatus?: IntegrityPagerStatus;
  /**
   * Most recent scheduled wiring-check run (Task #306). Surfaces the
   * outcome of the last `/api/scheduler/integrity-pager-wiring-check`
   * call so an operator can see at a glance whether the pager is
   * still actually firing — env vars being set is necessary but not
   * sufficient. `null` when the audit table is empty / unavailable.
   * Optional in the type so legacy test fixtures keep compiling.
   */
  lastWiringCheckRun?: WiringCheckRunRecord | null;
  /**
   * True when the returned `alerts` array hit the hard ceiling (200
   * rows). When set, the page renders a visible notice so operators
   * know rows are being cut off and are prompted to narrow their
   * filter window rather than silently missing older alerts.
   * Optional so legacy test fixtures that predate this prop keep
   * compiling without changes; the page treats absence as false.
   */
  truncated?: boolean;
}

function readShowAcknowledged(value: string | string[] | undefined): boolean {
  if (!value) return false;
  const v = Array.isArray(value) ? value[0] : value;
  return v === '1' || v === 'true' || v === 'yes';
}

function readFailedPages(value: string | string[] | undefined): boolean {
  if (!value) return false;
  const v = Array.isArray(value) ? value[0] : value;
  return v === '1' || v === 'true' || v === 'yes';
}

function readSingle(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Build a `/operator/integrity?…` href that preserves the current
 * filter set, optionally overriding individual params. Pass `null`
 * for a key to drop it (used by per-filter "× clear" links and the
 * "Clear filters" link).
 */
export function buildIntegrityHref(params: {
  ack?: boolean;
  symbol?: string | null;
  kind?: IntegrityAlertKind | null;
  failedPages?: boolean;
  window?: IntegrityAlertWindow | null;
}): string {
  const qs = new URLSearchParams();
  if (params.ack) qs.set('ack', '1');
  if (params.symbol) qs.set('symbol', params.symbol);
  if (params.kind) qs.set('kind', params.kind);
  if (params.failedPages) qs.set('failed_pages', '1');
  if (params.window) qs.set('window', params.window);
  const s = qs.toString();
  return s ? `/operator/integrity?${s}` : '/operator/integrity';
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const showAcknowledged = readShowAcknowledged(ctx.query.ack);
  const failedPagesFilter = readFailedPages(ctx.query.failed_pages);
  const generatedAtMs = Date.now();

  const rawSymbol = readSingle(ctx.query.symbol)?.trim() ?? '';
  const symbolFilter =
    rawSymbol.length > 0 ? rawSymbol.toUpperCase() : null;
  const kindFilter = parseIntegrityAlertKind(readSingle(ctx.query.kind));

  // Parse the ?window= param from the allow-list; null = default 24h.
  const windowFilter = parseIntegrityWindowParam(
    readSingle(ctx.query.window),
  );
  const sinceMs = windowFilter
    ? windowToSinceMs(windowFilter, generatedAtMs)
    : generatedAtMs - INTEGRITY_ALERT_DEFAULT_WINDOW_MS;
  const windowHours = Math.round(
    (generatedAtMs - sinceMs) / (60 * 60 * 1000),
  );

  // Best-effort: a malformed notification row must not blank the
  // entire console. Fall back to an empty list and surface the error.
  let alerts: IntegrityAlertView[] = [];
  let loadError: string | null = null;
  try {
    alerts = await listRecentIntegrityAlerts({
      includeRead: showAcknowledged,
      limit: 200,
      sinceMs,
      symbol: symbolFilter ?? undefined,
      kind: kindFilter ?? undefined,
      failedPages: failedPagesFilter ? true : undefined,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'unknown error';
    console.error('[operator/integrity] failed to load alerts:', loadError);
  }

  // Best-effort: never let a wiring-check audit DB error hide the
  // primary alerts table. The helper returns null on failure.
  const lastWiringCheckRun = await getLastIntegrityPagerWiringCheckRun();

  return {
    props: {
      alerts,
      showAcknowledged,
      windowHours,
      loadError,
      generatedAtMs,
      symbolFilter,
      kindFilter,
      failedPagesFilter,
      windowFilter,
      pagerStatus: getIntegrityPagerStatus(),
      lastWiringCheckRun,
      truncated: alerts.length >= 200,
    },
  };
};

export default function OperatorIntegrityPage({
  alerts,
  showAcknowledged,
  windowHours,
  loadError,
  generatedAtMs,
  symbolFilter,
  kindFilter,
  failedPagesFilter = false,
  windowFilter = null,
  pagerStatus,
  lastWiringCheckRun = null,
  truncated = false,
}: Props) {
  const toggleHref = buildIntegrityHref({
    ack: !showAcknowledged,
    symbol: symbolFilter,
    kind: kindFilter,
    failedPages: failedPagesFilter,
    window: windowFilter,
  });
  const toggleLabel = showAcknowledged
    ? 'Hide acknowledged'
    : 'Show acknowledged';

  const hasFilter =
    symbolFilter !== null ||
    kindFilter !== null ||
    failedPagesFilter ||
    windowFilter !== null;
  const clearAllHref = buildIntegrityHref({
    ack: showAcknowledged,
    symbol: null,
    kind: null,
    failedPages: false,
    window: null,
  });
  const clearSymbolHref = buildIntegrityHref({
    ack: showAcknowledged,
    symbol: null,
    kind: kindFilter,
    failedPages: failedPagesFilter,
    window: windowFilter,
  });
  const clearKindHref = buildIntegrityHref({
    ack: showAcknowledged,
    symbol: symbolFilter,
    kind: null,
    failedPages: failedPagesFilter,
    window: windowFilter,
  });
  const clearFailedPagesHref = buildIntegrityHref({
    ack: showAcknowledged,
    symbol: symbolFilter,
    kind: kindFilter,
    failedPages: false,
    window: windowFilter,
  });
  const clearWindowHref = buildIntegrityHref({
    ack: showAcknowledged,
    symbol: symbolFilter,
    kind: kindFilter,
    failedPages: failedPagesFilter,
    window: null,
  });

  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator" className="text-sm underline">
            ← Back to console
          </Link>
        </div>
        <h1 className="text-2xl font-serif mb-2">Asset integrity alerts</h1>
        {pagerStatus ? (
          <IntegrityPagerStatusBanner status={pagerStatus} />
        ) : null}
        <IntegrityPagerWiringCheckStatus
          lastRun={lastWiringCheckRun}
          generatedAtMs={generatedAtMs}
        />
        <p className="text-sm text-dl-muted font-mono mb-4">
          Recent <code>collateral.integrity_failed</code> auto-freeze
          notifications from the last {windowHours}h. Default view shows
          unread only; toggle to include rows already acknowledged via
          the dashboard panel&rsquo;s &ldquo;Mark read&rdquo; button.
        </p>

        {loadError && (
          <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-4 font-mono text-xs">
            <div className="font-serif text-sm text-dl-navy mb-1">
              Operational notice
            </div>
            <div className="text-dl-ink">
              Could not load integrity alerts. Showing empty result.
              <div className="text-dl-muted mt-1 break-all">
                ref: {loadError}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Link
            href={toggleHref}
            className="text-xs uppercase tracking-wide border border-dl-border px-3 py-1 hover:bg-dl-muted/10"
            data-testid="operator-integrity-toggle"
          >
            {toggleLabel}
          </Link>
          <span
            className="text-[10px] uppercase tracking-wider font-mono text-dl-muted"
            data-testid="operator-integrity-mode"
          >
            {showAcknowledged
              ? 'Showing unread + acknowledged'
              : 'Showing unread only'}
          </span>
        </div>

        {hasFilter && (
          <div
            className="flex flex-wrap items-center gap-2 mb-4 font-mono text-xs"
            data-testid="operator-integrity-filter-strip"
          >
            <span className="text-[10px] uppercase tracking-wider text-dl-muted">
              Filtered by:
            </span>
            {symbolFilter !== null && (
              <span
                className="inline-flex items-center gap-1 border border-dl-border bg-dl-muted/10 px-2 py-0.5"
                data-testid="operator-integrity-filter-symbol"
              >
                <span className="text-[10px] uppercase tracking-wider text-dl-muted">
                  symbol
                </span>
                <span className="font-bold text-dl-navy">{symbolFilter}</span>
                <Link
                  href={clearSymbolHref}
                  className="text-dl-muted hover:text-dl-ink ml-1"
                  data-testid="operator-integrity-filter-symbol-clear"
                  aria-label={`Clear symbol filter ${symbolFilter}`}
                >
                  ×
                </Link>
              </span>
            )}
            {kindFilter !== null && (
              <span
                className="inline-flex items-center gap-1 border border-dl-border bg-dl-muted/10 px-2 py-0.5"
                data-testid="operator-integrity-filter-kind"
              >
                <span className="text-[10px] uppercase tracking-wider text-dl-muted">
                  kind
                </span>
                <span className="font-bold text-dl-navy">
                  {KIND_LABEL[kindFilter] ?? kindFilter}
                </span>
                <Link
                  href={clearKindHref}
                  className="text-dl-muted hover:text-dl-ink ml-1"
                  data-testid="operator-integrity-filter-kind-clear"
                  aria-label={`Clear kind filter ${kindFilter}`}
                >
                  ×
                </Link>
              </span>
            )}
            {failedPagesFilter && (
              <span
                className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-2 py-0.5"
                data-testid="operator-integrity-filter-failed-pages"
                title="Showing only auto-freezes whose on-call page failed or was skipped (no channels configured)."
              >
                <span className="text-[10px] uppercase tracking-wider text-amber-800">
                  paging
                </span>
                <span className="font-bold text-amber-900">
                  failed or skipped
                </span>
                <Link
                  href={clearFailedPagesHref}
                  className="text-amber-800 hover:text-amber-900 ml-1"
                  data-testid="operator-integrity-filter-failed-pages-clear"
                  aria-label="Clear failed-pages filter"
                >
                  ×
                </Link>
              </span>
            )}
            {windowFilter !== null && (
              <span
                className="inline-flex items-center gap-1 border border-dl-border bg-dl-muted/10 px-2 py-0.5"
                data-testid="operator-integrity-filter-window"
              >
                <span className="text-[10px] uppercase tracking-wider text-dl-muted">
                  window
                </span>
                <span className="font-bold text-dl-navy">{windowFilter}</span>
                <Link
                  href={clearWindowHref}
                  className="text-dl-muted hover:text-dl-ink ml-1"
                  data-testid="operator-integrity-filter-window-clear"
                  aria-label={`Reset window to 24h (currently ${windowFilter})`}
                >
                  ×
                </Link>
              </span>
            )}
            <Link
              href={clearAllHref}
              className="underline text-dl-muted hover:text-dl-ink"
              data-testid="operator-integrity-filter-clear-all"
            >
              Clear filters
            </Link>
          </div>
        )}

        {truncated && (
          <div
            className="border border-dl-gold bg-dl-bg-alt px-4 py-2 mb-4 font-mono text-xs text-dl-ink"
            data-testid="operator-integrity-truncation-notice"
          >
            Showing {alerts.length} of {alerts.length}+ alerts in the last{' '}
            {windowHours}h — narrow the window or add a filter to see more.
          </div>
        )}

        {alerts.length === 0 ? (
          <div
            className="border border-dl-border p-6 text-sm font-mono text-dl-muted"
            data-testid="operator-integrity-empty"
          >
            {hasFilter
              ? `No integrity alerts in the last ${windowHours}h matching the current filters.`
              : showAcknowledged
                ? `No integrity alerts in the last ${windowHours}h.`
                : `No active integrity alerts. Toggle "${toggleLabel}" to see recently cleared rows.`}
          </div>
        ) : (
          <div className="overflow-x-auto border border-dl-border">
            <table
              className="w-full text-xs font-mono"
              data-testid="operator-integrity-table"
            >
              <thead className="bg-dl-muted/10">
                <tr className="text-left">
                  <th className="px-3 py-2">Symbol</th>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2">Rationale</th>
                  <th className="px-3 py-2">Age</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Paged</th>
                  <th className="px-3 py-2">Asset</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => {
                  const acknowledged = a.readAtMs !== null;
                  return (
                    <tr
                      key={a.id}
                      className="border-t border-dl-border align-top"
                      data-testid={`operator-integrity-row-${a.id}`}
                    >
                      <td className="px-3 py-2 font-bold text-dl-navy break-all">
                        {a.symbol ?? a.assetId}
                        {a.symbol && (
                          <Link
                            href={buildIntegrityHref({
                              ack: showAcknowledged,
                              symbol: a.symbol,
                              kind: kindFilter,
                              failedPages: failedPagesFilter,
                              window: windowFilter,
                            })}
                            className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-dl-muted hover:text-dl-ink underline"
                            data-testid={`operator-integrity-row-${a.id}-symbol-filter`}
                            title={`Filter to ${a.symbol} only`}
                          >
                            only
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] uppercase tracking-wider border border-red-300 bg-red-50 text-red-800 px-1.5 py-0.5">
                          {KIND_LABEL[a.kind] ?? a.kind}
                        </span>
                        <Link
                          href={buildIntegrityHref({
                            ack: showAcknowledged,
                            symbol: symbolFilter,
                            kind: a.kind,
                            failedPages: failedPagesFilter,
                            window: windowFilter,
                          })}
                          className="ml-1.5 text-[10px] normal-case tracking-normal text-dl-muted hover:text-dl-ink underline"
                          data-testid={`operator-integrity-row-${a.id}-kind-filter`}
                          title={`Filter to ${a.kind} only`}
                        >
                          only
                        </Link>
                      </td>
                      <td className="px-3 py-2 break-words max-w-md">
                        {a.rationale}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatAge(generatedAtMs - a.createdAtMs)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {acknowledged ? (
                          <span
                            className="text-[10px] uppercase tracking-wider border border-dl-border bg-dl-muted/10 text-dl-muted px-1.5 py-0.5"
                            data-testid={`operator-integrity-row-${a.id}-acknowledged`}
                            title={`Acknowledged ${formatAge(generatedAtMs - (a.readAtMs ?? 0))}`}
                          >
                            Acknowledged ·{' '}
                            {formatAge(generatedAtMs - (a.readAtMs ?? 0))}
                          </span>
                        ) : (
                          <span
                            className="text-[10px] uppercase tracking-wider border border-red-700 text-red-700 px-1.5 py-0.5"
                            data-testid={`operator-integrity-row-${a.id}-unread`}
                          >
                            Unread
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {a.paged ? (
                          <div
                            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]"
                            data-testid={`operator-integrity-row-${a.id}-paged`}
                          >
                            {a.paged.skipped ? (
                              <span
                                className="text-amber-700"
                                data-testid={`operator-integrity-row-${a.id}-paged-skipped`}
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
                                  data-testid={`operator-integrity-row-${a.id}-paged-${c.channel}`}
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
                        ) : (
                          <span className="text-dl-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={buildAssetLink(a.symbol, a.assetId)}
                          className="underline"
                          data-testid={`operator-integrity-row-${a.id}-jump`}
                        >
                          Open asset →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
