import Head from 'next/head';
import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout } from '../../components/design-law';

// ────────────────────────────────────────────────────────────────────
// /admin/axau-growth — admin-only AXAU launch funnel dashboard.
// Auth: requires ?key=<ADMIN_SOLVENCY_KEY> on first load. The key is
// passed through to client fetch via state. Same gate as the rest of
// the admin surfaces in this codebase.
// ────────────────────────────────────────────────────────────────────

interface DayBucket { day: string; visitors: number; cta_clicks: number; form_starts: number; form_completes: number; }
interface SourceRow { source: string; visitors: number; completes: number; conversion: number; }

interface StatsPayload {
  today:    { visitors: number; ctaClicks: number; formStarts: number; formCompletes: number; conversionPct: number };
  allTime:  { visitors: number; ctaClicks: number; formStarts: number; formCompletes: number; conversionPct: number };
  funnel:   { visitors: number; ctaClicks: number; formStarts: number; formCompletes: number;
              dropoff: { visitorToCta: number; ctaToStart: number; startToComplete: number } };
  topSource:    string | null;
  sources:      SourceRow[];
  dailySeries:  DayBucket[];
  spots:        { claimed: number | null; total: number | null; remaining: number | null };
  windowDays:   number;
  generatedAt:  string;
}

interface PageProps { adminKey: string }

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const expected = process.env.ADMIN_SOLVENCY_KEY;
  const provided = typeof ctx.query.key === 'string' ? ctx.query.key : '';
  if (!expected || !provided || provided !== expected) {
    return {
      redirect: { destination: '/founder-ops?reason=axau-growth-requires-key', permanent: false },
    };
  }
  // We pass the key to the page so client fetches can re-auth. The page
  // is server-only rendered on each request and never cached.
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  return { props: { adminKey: provided } };
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border-l-4 border-l-dl-gold border border-dl-border bg-dl-bg p-5">
      <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-1">{label}</p>
      <p className="font-dl-mono text-3xl font-bold text-dl-navy">{value}</p>
      {sub && <p className="text-xs text-dl-gray mt-1">{sub}</p>}
    </div>
  );
}

export default function AxauGrowthAdmin({ adminKey }: PageProps) {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(14);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/analytics/axau/stats?days=${windowDays}`, {
          headers: { 'x-admin-key': adminKey },
        });
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok || !j.success) { setError(j.error || 'Failed to load stats'); setStats(null); }
        else { setError(null); setStats(j.data as StatsPayload); }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'network_error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [adminKey, windowDays]);

  return (
    <>
      <Head><title>AXAU Growth — Admin</title></Head>
      <DesignLawLayout>
        <div className="mb-8">
          <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest mb-2">Admin · Internal</p>
          <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy mb-2">AXAU Growth Console</h1>
          <p className="text-sm text-dl-gray">
            Launch funnel for /axau-early-access. Auto-refreshes every 30 seconds. All counts are
            distinct-visitor counts, not raw event hits.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <label className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Window:</label>
          {[7, 14, 30, 60].map((d) => (
            <button
              key={d}
              onClick={() => setWindowDays(d)}
              className={`px-3 py-1.5 font-dl-mono text-xs uppercase tracking-wider border ${
                windowDays === d ? 'bg-dl-navy text-white border-dl-navy' : 'bg-dl-bg text-dl-navy border-dl-border hover:bg-dl-bg-alt'
              }`}
            >
              {d}d
            </button>
          ))}
          {loading && <span className="font-dl-mono text-xs text-dl-gray ml-3">loading…</span>}
        </div>

        {error && (
          <div className="mb-6 border-l-4 border-l-red-500 border border-dl-border bg-red-50 p-4">
            <p className="font-dl-mono text-xs text-red-700">Error: {error}</p>
          </div>
        )}

        {stats && (
          <>
            {/* TODAY */}
            <div className="mb-10">
              <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Today (UTC)</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border border-dl-border">
                <StatCard label="Visitors"   value={stats.today.visitors}      sub="distinct" />
                <StatCard label="Applications" value={stats.today.formCompletes} sub="completed" />
                <StatCard label="Conversion" value={`${stats.today.conversionPct}%`} sub="completes / visitors" />
                <StatCard label="Top Source" value={stats.topSource ?? '—'}    sub={`window: ${stats.windowDays}d`} />
                <StatCard
                  label="Spots Claimed"
                  value={stats.spots.claimed ?? '—'}
                  sub={stats.spots.total != null ? `of ${stats.spots.total} total` : undefined}
                />
              </div>
            </div>

            {/* FUNNEL */}
            <div className="mb-10">
              <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Funnel ({stats.windowDays}d window)</h2>
              <div className="border border-dl-border">
                {[
                  { label: 'Page Visitors',       value: stats.funnel.visitors,      drop: null,                              color: 'bg-dl-navy' },
                  { label: 'CTA Clicks',          value: stats.funnel.ctaClicks,     drop: stats.funnel.dropoff.visitorToCta,    color: 'bg-dl-navy' },
                  { label: 'Form Starts',         value: stats.funnel.formStarts,    drop: stats.funnel.dropoff.ctaToStart,      color: 'bg-dl-gold' },
                  { label: 'Form Completes',      value: stats.funnel.formCompletes, drop: stats.funnel.dropoff.startToComplete, color: 'bg-dl-forest' },
                ].map((row, i, arr) => {
                  const max = stats.funnel.visitors || 1;
                  const widthPct = Math.max(2, Math.round((row.value / max) * 100));
                  return (
                    <div key={row.label} className={`px-5 py-4 ${i < arr.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-dl-navy font-medium">{row.label}</p>
                        <div className="flex items-center gap-4 font-dl-mono text-xs">
                          <span className="text-dl-navy font-bold text-base">{row.value}</span>
                          {row.drop != null && <span className="text-dl-gray">{row.drop}% drop</span>}
                        </div>
                      </div>
                      <div className="h-2 bg-dl-bg-alt border border-dl-border">
                        <div className={`h-full ${row.color}`} style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SOURCES */}
            <div className="mb-10">
              <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Source Attribution ({stats.windowDays}d)</h2>
              {stats.sources.length === 0 ? (
                <div className="border border-dl-border bg-dl-bg-alt p-6 text-sm text-dl-gray font-dl-mono text-center">
                  No traffic recorded in this window yet.
                </div>
              ) : (
                <div className="border border-dl-border">
                  <div className="grid grid-cols-4 gap-0 px-5 py-3 bg-dl-bg-alt border-b border-dl-border font-dl-mono text-xs uppercase tracking-wider text-dl-gray">
                    <span>Source</span>
                    <span className="text-right">Visitors</span>
                    <span className="text-right">Completes</span>
                    <span className="text-right">Conversion</span>
                  </div>
                  {stats.sources.map((s, i) => (
                    <div key={s.source} className={`grid grid-cols-4 gap-0 px-5 py-3 ${i < stats.sources.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                      <span className="text-sm text-dl-navy font-medium uppercase font-dl-mono">{s.source}</span>
                      <span className="text-right font-dl-mono text-sm text-dl-navy">{s.visitors}</span>
                      <span className="text-right font-dl-mono text-sm text-dl-navy">{s.completes}</span>
                      <span className="text-right font-dl-mono text-sm text-dl-gold font-bold">{s.conversion}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DAILY SERIES */}
            <div className="mb-10">
              <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Daily Series ({stats.windowDays}d)</h2>
              {stats.dailySeries.length === 0 ? (
                <div className="border border-dl-border bg-dl-bg-alt p-6 text-sm text-dl-gray font-dl-mono text-center">
                  No daily activity yet.
                </div>
              ) : (
                <div className="border border-dl-border overflow-x-auto">
                  <table className="w-full font-dl-mono text-xs">
                    <thead className="bg-dl-bg-alt border-b border-dl-border">
                      <tr>
                        <th className="px-4 py-3 text-left uppercase tracking-wider text-dl-gray">Day</th>
                        <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray">Visitors</th>
                        <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray">CTA</th>
                        <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray">Starts</th>
                        <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray">Completes</th>
                        <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray">Conv %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.dailySeries.map((d, i) => {
                        const conv = d.visitors > 0 ? ((d.form_completes / d.visitors) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={d.day} className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                            <td className="px-4 py-2 text-dl-navy">{d.day}</td>
                            <td className="px-4 py-2 text-right text-dl-navy">{d.visitors}</td>
                            <td className="px-4 py-2 text-right text-dl-navy">{d.cta_clicks}</td>
                            <td className="px-4 py-2 text-right text-dl-navy">{d.form_starts}</td>
                            <td className="px-4 py-2 text-right text-dl-navy">{d.form_completes}</td>
                            <td className="px-4 py-2 text-right text-dl-gold font-bold">{conv}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p className="font-dl-mono text-xs text-dl-gray text-right">
              Generated: {stats.generatedAt}
            </p>
          </>
        )}
      </DesignLawLayout>
    </>
  );
}
