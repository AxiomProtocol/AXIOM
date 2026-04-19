/**
 * /admin/oracle-fallbacks — Oracle Fallback History Dashboard
 *
 * Read-only operator dashboard showing AXUSD oracle parity-fallback events.
 * Displays time-windowed counts (1h / 24h / 7d), a pruning status panel
 * (last run timestamp + deleted count), and a paginated table of individual
 * events with timestamps, callers, loan IDs, and principals.
 *
 * Auth: requires ?key=<ADMIN_SOLVENCY_KEY> on first load (same pattern as
 * /admin/axau-growth).
 */

import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout } from '../../components/design-law';
import { PRUNE_STALE_HOURS, PRUNE_GAP_WARN_HOURS } from '../../lib/admin/config';
import { getPruneStaleness } from '../../lib/admin/prune-staleness';
import type { LastPrune } from '../../lib/admin/prune-staleness';

const PAGE_SIZE = 50;

interface FallbackEvent {
  id: number;
  occurred_at: string;
  caller: string;
  loan_id: string | null;
  principal_usd: string | null;
  reason: string | null;
}

interface CallerCount {
  caller: string;
  count: number;
}

interface WindowedCounts {
  last1h: number;
  last24h: number;
  last7d: number;
}

interface OracleFallbackData {
  success: true;
  windowedCounts: WindowedCounts;
  topCallers: CallerCount[];
  events: FallbackEvent[];
  pagination: { total: number; limit: number; offset: number };
  lastPrune: LastPrune | null;
  pruneHistory: LastPrune[];
}

interface PageProps {
  adminKey: string;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const expected = process.env.ADMIN_SOLVENCY_KEY;
  const provided = typeof ctx.query.key === 'string' ? ctx.query.key : '';
  if (!expected || !provided || provided !== expected) {
    return {
      redirect: {
        destination: '/founder-ops?reason=oracle-fallbacks-requires-key',
        permanent: false,
      },
    };
  }
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  return { props: { adminKey: provided } };
};

function CountCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="border-l-4 border-l-dl-gold border border-dl-border bg-dl-bg p-5">
      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">{label}</p>
      <p className="font-dl-mono text-3xl font-bold text-dl-navy">{value}</p>
      {sub && <p className="text-xs text-dl-gray mt-1">{sub}</p>}
    </div>
  );
}

function formatTs(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }) + ' UTC';
  } catch {
    return isoString;
  }
}

function PruneStatusPanel({
  lastPrune,
  pruneHistory,
  adminKey,
}: {
  lastPrune: LastPrune | null;
  pruneHistory: LastPrune[];
  adminKey: string;
}) {
  const { isStale, hoursAgo } = getPruneStaleness(lastPrune);
  const [csvLoading, setCsvLoading] = useState(false);

  async function handleDownloadCsv() {
    setCsvLoading(true);
    try {
      const r = await fetch('/api/admin/oracle-fallbacks-prune-csv', {
        headers: { 'x-admin-key': adminKey },
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(`CSV export failed: ${(j as { error?: string }).error ?? r.statusText}`);
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'oracle-fallback-prune-history.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert(`CSV export failed: ${e instanceof Error ? e.message : 'network_error'}`);
    } finally {
      setCsvLoading(false);
    }
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dl-serif text-xl text-dl-navy">Data Hygiene</h2>
        <div className="flex items-center gap-4">
          {pruneHistory.length > 0 && (
            <span className="font-dl-mono text-xs text-dl-gray">
              {pruneHistory.length} run{pruneHistory.length !== 1 ? 's' : ''} recorded
            </span>
          )}
          <button
            onClick={handleDownloadCsv}
            disabled={csvLoading}
            className={`px-3 py-1.5 font-dl-mono text-xs uppercase tracking-wider border ${
              csvLoading
                ? 'bg-dl-bg-alt text-dl-gray border-dl-border cursor-not-allowed opacity-50'
                : 'bg-dl-bg text-dl-navy border-dl-border hover:bg-dl-bg-alt cursor-pointer'
            }`}
          >
            {csvLoading ? 'Exporting…' : 'Download CSV'}
          </button>
        </div>
      </div>

      {/* Staleness warning */}
      {isStale && (
        <div className="mb-4 border-l-4 border-l-amber-500 border border-amber-200 bg-amber-50 p-4">
          <p className="font-dl-mono text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
            Pruning Overdue
          </p>
          <p className="font-dl-mono text-xs text-amber-700">
            {hoursAgo === null
              ? 'No pruning run has ever been recorded. The scheduled job may not be configured.'
              : `Last prune was ${Math.floor(hoursAgo)} hours ago — exceeds the ${PRUNE_STALE_HOURS}-hour threshold. Check that the scheduler is firing POST /api/scheduler/prune-oracle-fallback.`}
          </p>
        </div>
      )}

      {/* Summary strip for the most-recent run */}
      {lastPrune && (
        <div className="border border-dl-border bg-dl-bg mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-dl-border">
            <div className="p-5">
              <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">
                Last Pruned At
              </p>
              <p className="font-dl-mono text-sm font-bold text-dl-navy">
                {formatTs(lastPrune.pruned_at)}
              </p>
            </div>
            <div className="p-5">
              <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">
                Rows Removed
              </p>
              <p className="font-dl-mono text-3xl font-bold text-dl-navy">
                {lastPrune.deleted_count.toLocaleString('en-US')}
              </p>
            </div>
            <div className="p-5">
              <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">
                Retention Window
              </p>
              <p className="font-dl-mono text-sm font-bold text-dl-navy">
                {lastPrune.retention_days} days
              </p>
              <p className="text-xs text-dl-gray mt-1">
                via {lastPrune.triggered_by}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full history table */}
      {pruneHistory.length === 0 ? (
        <div className="border border-dl-border bg-dl-bg p-8 text-sm text-dl-gray font-dl-mono text-center">
          No pruning runs recorded yet.
        </div>
      ) : (
        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full font-dl-mono text-xs">
            <thead className="bg-dl-bg-alt border-b border-dl-border">
              <tr>
                <th className="px-4 py-3 text-left uppercase tracking-wider text-dl-gray whitespace-nowrap">
                  Pruned At (UTC)
                </th>
                <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray whitespace-nowrap">
                  Gap Since Prev
                </th>
                <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray whitespace-nowrap">
                  Rows Deleted
                </th>
                <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray whitespace-nowrap">
                  Retention (days)
                </th>
                <th className="px-4 py-3 text-left uppercase tracking-wider text-dl-gray whitespace-nowrap">
                  Trigger
                </th>
              </tr>
            </thead>
            <tbody>
              {pruneHistory.map((run, i) => {
                const prevRun = pruneHistory[i + 1];
                const gapHours = prevRun
                  ? (new Date(run.pruned_at).getTime() - new Date(prevRun.pruned_at).getTime()) /
                    (1000 * 60 * 60)
                  : null;
                const gapLabel =
                  gapHours === null
                    ? '—'
                    : gapHours >= 48
                      ? `${(gapHours / 24).toFixed(1)}d`
                      : `${gapHours.toFixed(1)}h`;
                const isGapOverdue = gapHours !== null && gapHours > PRUNE_GAP_WARN_HOURS;
                const rowBg = isGapOverdue
                  ? 'bg-amber-50'
                  : i % 2 === 0
                    ? 'bg-dl-bg'
                    : 'bg-dl-bg-alt';
                return (
                  <tr key={run.pruned_at} className={rowBg}>
                    <td className="px-4 py-2 text-dl-navy whitespace-nowrap">
                      {formatTs(run.pruned_at)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right whitespace-nowrap font-bold ${
                        isGapOverdue ? 'text-amber-700' : 'text-dl-gray'
                      }`}
                    >
                      {gapLabel}
                      {isGapOverdue && (
                        <span className="ml-1 text-amber-600" title={`Gap exceeds ${PRUNE_GAP_WARN_HOURS}h — possible missed run`}>
                          ⚠
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-dl-navy font-bold">
                      {run.deleted_count.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-2 text-right text-dl-navy">
                      {run.retention_days}
                    </td>
                    <td className="px-4 py-2 text-dl-gray">
                      {run.triggered_by}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function OracleFallbacksDashboard({ adminKey }: PageProps) {
  const [data, setData] = useState<OracleFallbackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const load = useCallback(
    async (pageOffset: number) => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/admin/oracle-fallbacks?limit=${PAGE_SIZE}&offset=${pageOffset}`,
          { headers: { 'x-admin-key': adminKey } },
        );
        const j: OracleFallbackData | { success: false; error: string } = await r.json();
        if (!r.ok || !j.success) {
          setError((j as { success: false; error: string }).error ?? 'Failed to load data');
          setData(null);
        } else {
          setError(null);
          setData(j as OracleFallbackData);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'network_error');
      } finally {
        setLoading(false);
      }
    },
    [adminKey],
  );

  useEffect(() => {
    load(offset);
    const id = setInterval(() => load(offset), 30_000);
    return () => clearInterval(id);
  }, [load, offset]);

  function goToPage(newOffset: number) {
    setOffset(newOffset);
  }

  const total = data?.pagination.total ?? 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <>
      <Head>
        <title>Oracle Fallback History — Admin</title>
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest mb-2">
            Admin · Internal
          </p>
          <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy mb-2">
            Oracle Fallback History
          </h1>
          <p className="text-sm text-dl-gray">
            AXUSD on-chain oracle failures where static 1:1 parity was used.
            {loading && <span className="font-dl-mono text-dl-gold ml-2">loading…</span>}
          </p>
        </div>

        {error && (
          <div className="mb-6 border-l-4 border-l-red-500 border border-dl-border bg-red-50 p-4">
            <p className="font-dl-mono text-xs text-red-700">Error: {error}</p>
          </div>
        )}

        {/* TIME-WINDOWED COUNTS */}
        {data && (
          <>
            <div className="mb-10">
              <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Fallback Counts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-dl-border">
                <CountCard
                  label="Last 1 Hour"
                  value={data.windowedCounts.last1h}
                  sub="events in past 60 min"
                />
                <CountCard
                  label="Last 24 Hours"
                  value={data.windowedCounts.last24h}
                  sub="events in past day"
                />
                <CountCard
                  label="Last 7 Days"
                  value={data.windowedCounts.last7d}
                  sub="events in past week"
                />
              </div>
            </div>

            {/* DATA HYGIENE / PRUNE STATUS */}
            <PruneStatusPanel lastPrune={data.lastPrune} pruneHistory={data.pruneHistory ?? []} adminKey={adminKey} />

            {/* TOP CALLERS (7d) */}
            {data.topCallers.length > 0 && (
              <div className="mb-10">
                <h2 className="font-dl-serif text-xl text-dl-navy mb-4">
                  Top Callers (7d)
                </h2>
                <div className="border border-dl-border">
                  <div className="grid grid-cols-2 gap-0 px-5 py-3 bg-dl-bg-alt border-b border-dl-border font-dl-mono text-xs uppercase tracking-wider text-dl-gray">
                    <span>Caller</span>
                    <span className="text-right">Fallbacks</span>
                  </div>
                  {data.topCallers.map((row, i) => (
                    <div
                      key={row.caller}
                      className={`grid grid-cols-2 gap-0 px-5 py-3 ${
                        i < data.topCallers.length - 1 ? 'border-b border-dl-border' : ''
                      } ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                    >
                      <span className="text-sm text-dl-navy font-dl-mono truncate pr-4">
                        {row.caller}
                      </span>
                      <span className="text-right font-dl-mono text-sm text-dl-navy font-bold">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RECENT EVENTS TABLE */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-dl-serif text-xl text-dl-navy">
                  Recent Events
                </h2>
                <span className="font-dl-mono text-xs text-dl-gray">
                  {total} total · page {currentPage} of {totalPages}
                </span>
              </div>

              {data.events.length === 0 ? (
                <div className="border border-dl-border bg-dl-bg-alt p-8 text-sm text-dl-gray font-dl-mono text-center">
                  No fallback events recorded yet.
                </div>
              ) : (
                <>
                  <div className="border border-dl-border overflow-x-auto">
                    <table className="w-full font-dl-mono text-xs">
                      <thead className="bg-dl-bg-alt border-b border-dl-border">
                        <tr>
                          <th className="px-4 py-3 text-left uppercase tracking-wider text-dl-gray whitespace-nowrap">
                            Timestamp (UTC)
                          </th>
                          <th className="px-4 py-3 text-left uppercase tracking-wider text-dl-gray whitespace-nowrap">
                            Caller
                          </th>
                          <th className="px-4 py-3 text-left uppercase tracking-wider text-dl-gray whitespace-nowrap">
                            Loan ID
                          </th>
                          <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray whitespace-nowrap">
                            Principal (USD)
                          </th>
                          <th className="px-4 py-3 text-left uppercase tracking-wider text-dl-gray">
                            Reason
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.events.map((ev, i) => (
                          <tr
                            key={ev.id}
                            className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}
                          >
                            <td className="px-4 py-2 text-dl-navy whitespace-nowrap">
                              {formatTs(ev.occurred_at)}
                            </td>
                            <td className="px-4 py-2 text-dl-navy max-w-xs truncate">
                              {ev.caller}
                            </td>
                            <td className="px-4 py-2 text-dl-gray">
                              {ev.loan_id ?? <span className="text-dl-border">—</span>}
                            </td>
                            <td className="px-4 py-2 text-right text-dl-navy">
                              {ev.principal_usd != null
                                ? `$${parseFloat(ev.principal_usd).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : <span className="text-dl-border">—</span>}
                            </td>
                            <td className="px-4 py-2 text-dl-gray max-w-xs truncate">
                              {ev.reason ?? <span className="text-dl-border">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION */}
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      disabled={!hasPrev}
                      onClick={() => goToPage(Math.max(0, offset - PAGE_SIZE))}
                      className={`px-4 py-2 font-dl-mono text-xs uppercase tracking-wider border ${
                        hasPrev
                          ? 'bg-dl-bg text-dl-navy border-dl-border hover:bg-dl-bg-alt cursor-pointer'
                          : 'bg-dl-bg-alt text-dl-gray border-dl-border cursor-not-allowed opacity-50'
                      }`}
                    >
                      ← Prev
                    </button>
                    <span className="font-dl-mono text-xs text-dl-gray">
                      {total === 0
                      ? 'No events'
                      : `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}`}
                    </span>
                    <button
                      disabled={!hasNext}
                      onClick={() => goToPage(offset + PAGE_SIZE)}
                      className={`px-4 py-2 font-dl-mono text-xs uppercase tracking-wider border ${
                        hasNext
                          ? 'bg-dl-bg text-dl-navy border-dl-border hover:bg-dl-bg-alt cursor-pointer'
                          : 'bg-dl-bg-alt text-dl-gray border-dl-border cursor-not-allowed opacity-50'
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                </>
              )}
            </div>

            <p className="font-dl-mono text-xs text-dl-gray text-right">
              Auto-refreshes every 30 seconds · Total recorded: {total}
            </p>
          </>
        )}
      </DesignLawLayout>
    </>
  );
}
