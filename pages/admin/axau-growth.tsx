import Head from 'next/head';
import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout } from '../../components/design-law';

// ────────────────────────────────────────────────────────────────────
// /admin/axau-growth — unified analytics console for AXAU + Homepage.
// Auth: requires ?key=<ADMIN_SOLVENCY_KEY> on first load. Toggle the
// surface (AXAU vs Homepage) to flip the dashboard. AXAU view shows
// the application funnel; Homepage view shows visit/scroll/section/
// CTA detail.
// ────────────────────────────────────────────────────────────────────

interface DayBucket { day: string; visitors: number; cta_clicks: number; form_starts: number; form_completes: number; }
interface SourceRow { source: string; visitors: number; completes: number; conversion: number; }
interface HomepageData {
  sections:    Array<{ name: string; visitors: number }>;
  ctas:        Array<{ name: string; clicks: number; href: string | null }>;
  outbound:    Array<{ href: string; clicks: number }>;
  scrollDepth: { d25: number; d50: number; d75: number; d100: number };
}

interface StatsPayload {
  today:    { visitors: number; ctaClicks: number; formStarts: number; formCompletes: number; conversionPct: number };
  allTime:  { visitors: number; ctaClicks: number; formStarts: number; formCompletes: number; conversionPct: number };
  funnel:   { visitors: number; ctaClicks: number; formStarts: number; formCompletes: number;
              dropoff: { visitorToCta: number; ctaToStart: number; startToComplete: number } };
  topSource:    string | null;
  sources:      SourceRow[];
  dailySeries:  DayBucket[];
  spots:        { claimed: number | null; total: number | null; remaining: number | null };
  homepage:     HomepageData | null;
  surface:      'axau' | 'homepage';
  windowDays:   number;
  generatedAt:  string;
}

interface PageProps { adminKey: string }

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const expected = process.env.ADMIN_SOLVENCY_KEY;
  const provided = typeof ctx.query.key === 'string' ? ctx.query.key : '';
  if (!expected || !provided || provided !== expected) {
    return { redirect: { destination: '/founder-ops?reason=axau-growth-requires-key', permanent: false } };
  }
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

function Bar({ label, value, max, drop, color }: { label: string; value: number; max: number; drop: number | null; color: string }) {
  const widthPct = Math.max(2, Math.round(((value || 0) / (max || 1)) * 100));
  return (
    <div className="px-5 py-4 border-b border-dl-border bg-dl-bg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-dl-navy font-medium">{label}</p>
        <div className="flex items-center gap-4 font-dl-mono text-xs">
          <span className="text-dl-navy font-bold text-base">{value}</span>
          {drop != null && <span className="text-dl-gray">{drop}% drop</span>}
        </div>
      </div>
      <div className="h-2 bg-dl-bg-alt border border-dl-border">
        <div className={`h-full ${color}`} style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  );
}

export default function AxauGrowthAdmin({ adminKey }: PageProps) {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(14);
  const [surface, setSurface] = useState<'axau' | 'homepage'>('axau');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/analytics/axau/stats?days=${windowDays}&surface=${surface}`, {
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
  }, [adminKey, windowDays, surface]);

  const isHomepage = surface === 'homepage';
  const labelTracked = isHomepage ? '/' : '/axau-early-access';

  return (
    <>
      <Head><title>Growth Console — Admin</title></Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest mb-2">Admin · Internal</p>
          <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy mb-2">Growth Console</h1>
          <p className="text-sm text-dl-gray">
            Tracking <span className="font-dl-mono text-dl-navy">{labelTracked}</span>. Auto-refreshes every 30 seconds.
            All counts are distinct-visitor unless stated otherwise.
          </p>
        </div>

        {/* SURFACE TOGGLE */}
        <div className="mb-6 border border-dl-border inline-flex">
          {(['axau', 'homepage'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSurface(s)}
              className={`px-5 py-2 font-dl-mono text-xs uppercase tracking-wider border-r border-dl-border last:border-r-0 ${
                surface === s ? 'bg-dl-navy text-white' : 'bg-dl-bg text-dl-navy hover:bg-dl-bg-alt'
              }`}
            >
              {s === 'axau' ? 'AXAU Early Access' : 'Homepage'}
            </button>
          ))}
        </div>

        <div className="mb-6 flex items-center gap-3 flex-wrap">
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
                {isHomepage ? (
                  <>
                    <StatCard label="CTA Clicks"   value={stats.today.ctaClicks} sub="raw events" />
                    <StatCard label="Top Source"   value={stats.topSource ?? '—'} sub={`window: ${stats.windowDays}d`} />
                    <StatCard label="Top Section"  value={stats.homepage?.sections[0]?.name ?? '—'}
                                                   sub={stats.homepage?.sections[0] ? `${stats.homepage.sections[0].visitors} viewers` : undefined} />
                    <StatCard label="100% Scrolls" value={stats.homepage?.scrollDepth.d100 ?? 0} sub="distinct visitors" />
                  </>
                ) : (
                  <>
                    <StatCard label="Applications" value={stats.today.formCompletes} sub="completed" />
                    <StatCard label="Conversion"   value={`${stats.today.conversionPct}%`} sub="completes / visitors" />
                    <StatCard label="Top Source"   value={stats.topSource ?? '—'} sub={`window: ${stats.windowDays}d`} />
                    <StatCard label="Spots Claimed" value={stats.spots.claimed ?? '—'}
                              sub={stats.spots.total != null ? `of ${stats.spots.total} total` : undefined} />
                  </>
                )}
              </div>
            </div>

            {/* AXAU FUNNEL */}
            {!isHomepage && (
              <div className="mb-10">
                <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Funnel ({stats.windowDays}d window)</h2>
                <div className="border border-dl-border">
                  <Bar label="Page Visitors"  value={stats.funnel.visitors}      max={stats.funnel.visitors} drop={null}                              color="bg-dl-navy" />
                  <Bar label="CTA Clicks"     value={stats.funnel.ctaClicks}     max={stats.funnel.visitors} drop={stats.funnel.dropoff.visitorToCta}    color="bg-dl-navy" />
                  <Bar label="Form Starts"    value={stats.funnel.formStarts}    max={stats.funnel.visitors} drop={stats.funnel.dropoff.ctaToStart}      color="bg-dl-gold" />
                  <Bar label="Form Completes" value={stats.funnel.formCompletes} max={stats.funnel.visitors} drop={stats.funnel.dropoff.startToComplete} color="bg-dl-forest" />
                </div>
              </div>
            )}

            {/* HOMEPAGE: SCROLL DEPTH + SECTIONS + CTAS + OUTBOUND */}
            {isHomepage && stats.homepage && (
              <>
                <div className="mb-10">
                  <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Scroll Depth ({stats.windowDays}d)</h2>
                  <div className="border border-dl-border">
                    {([['25%', stats.homepage.scrollDepth.d25],
                       ['50%', stats.homepage.scrollDepth.d50],
                       ['75%', stats.homepage.scrollDepth.d75],
                       ['100%', stats.homepage.scrollDepth.d100]] as const).map(([lab, val]) => (
                      <Bar key={lab} label={`Reached ${lab}`} value={val} max={stats.homepage!.scrollDepth.d25 || 1} drop={null} color="bg-dl-gold" />
                    ))}
                  </div>
                </div>

                <div className="mb-10">
                  <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Sections Viewed ({stats.windowDays}d)</h2>
                  {stats.homepage.sections.length === 0 ? (
                    <div className="border border-dl-border bg-dl-bg-alt p-6 text-sm text-dl-gray font-dl-mono text-center">
                      No section views recorded yet.
                    </div>
                  ) : (
                    <div className="border border-dl-border">
                      <div className="grid grid-cols-3 gap-0 px-5 py-3 bg-dl-bg-alt border-b border-dl-border font-dl-mono text-xs uppercase tracking-wider text-dl-gray">
                        <span>Section</span>
                        <span className="text-right">Visitors</span>
                        <span className="text-right">% of Page Views</span>
                      </div>
                      {stats.homepage.sections.map((s, i) => {
                        const pct = stats.allTime.visitors > 0 ? ((s.visitors / stats.allTime.visitors) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={s.name} className={`grid grid-cols-3 gap-0 px-5 py-3 ${i < stats.homepage!.sections.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                            <span className="text-sm text-dl-navy font-mono">{s.name}</span>
                            <span className="text-right font-dl-mono text-sm text-dl-navy">{s.visitors}</span>
                            <span className="text-right font-dl-mono text-sm text-dl-gold font-bold">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mb-10">
                  <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Top CTA Clicks ({stats.windowDays}d)</h2>
                  {stats.homepage.ctas.length === 0 ? (
                    <div className="border border-dl-border bg-dl-bg-alt p-6 text-sm text-dl-gray font-dl-mono text-center">
                      No CTA clicks yet.
                    </div>
                  ) : (
                    <div className="border border-dl-border">
                      <div className="grid grid-cols-3 gap-0 px-5 py-3 bg-dl-bg-alt border-b border-dl-border font-dl-mono text-xs uppercase tracking-wider text-dl-gray">
                        <span className="col-span-2">CTA / Link Text</span>
                        <span className="text-right">Clicks</span>
                      </div>
                      {stats.homepage.ctas.map((c, i) => (
                        <div key={c.name + i} className={`grid grid-cols-3 gap-0 px-5 py-3 ${i < stats.homepage!.ctas.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                          <div className="col-span-2 text-sm">
                            <p className="text-dl-navy font-medium truncate">{c.name}</p>
                            {c.href && <p className="text-xs text-dl-gray font-dl-mono truncate">{c.href}</p>}
                          </div>
                          <span className="text-right font-dl-mono text-sm text-dl-navy">{c.clicks}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {stats.homepage.outbound.length > 0 && (
                  <div className="mb-10">
                    <h2 className="font-dl-serif text-xl text-dl-navy mb-4">Outbound Clicks ({stats.windowDays}d)</h2>
                    <div className="border border-dl-border">
                      {stats.homepage.outbound.map((o, i) => (
                        <div key={o.href + i} className={`flex items-center justify-between px-5 py-3 ${i < stats.homepage!.outbound.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                          <span className="text-sm text-dl-navy font-dl-mono truncate pr-4">{o.href}</span>
                          <span className="font-dl-mono text-sm text-dl-navy">{o.clicks}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

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
                    <span className="text-right">{isHomepage ? 'CTA Clicks' : 'Completes'}</span>
                    <span className="text-right">{isHomepage ? 'Click-Thru' : 'Conversion'}</span>
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
                        {!isHomepage && <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray">Starts</th>}
                        {!isHomepage && <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray">Completes</th>}
                        {!isHomepage && <th className="px-4 py-3 text-right uppercase tracking-wider text-dl-gray">Conv %</th>}
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
                            {!isHomepage && <td className="px-4 py-2 text-right text-dl-navy">{d.form_starts}</td>}
                            {!isHomepage && <td className="px-4 py-2 text-right text-dl-navy">{d.form_completes}</td>}
                            {!isHomepage && <td className="px-4 py-2 text-right text-dl-gold font-bold">{conv}%</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p className="font-dl-mono text-xs text-dl-gray text-right">
              Generated: {stats.generatedAt} · Surface: {stats.surface}
            </p>
          </>
        )}
      </DesignLawLayout>
    </>
  );
}
