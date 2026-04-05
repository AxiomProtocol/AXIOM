import React, { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

interface CapitalState {
  cashBalance: number;
  openPositionCount: number;
  closedPositionCount: number;
  totalRealizedPnl: number;
  lastSnapshotAt: string | null;
  snapshotAgeMs: number | null;
}

interface PerfMetrics {
  period: string;
  realizedPnl: number;
  unrealizedPnl: number;
  feesTotal: number;
  netCapitalChange: number;
  returnOnCapital: number;
  returnOnDeployedCapital: number;
  capitalEfficiencyScore: number;
  totalCapital: number;
  deployedCapital: number;
  closedTradeCount: number;
  openTradeCount: number;
}

type Period = 'day' | 'week' | 'month' | 'year';

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(2) + '%';
}

function fmtAge(ms: number | null): string {
  if (ms === null) return 'No snapshot';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

export default function CapitalDashboard() {
  const [state, setState] = useState<CapitalState | null>(null);
  const [perf, setPerf] = useState<PerfMetrics | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const [adminKey, setAdminKey] = useState('');

  const headers = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminKey) h['x-admin-key'] = adminKey;
    return h;
  }, [adminKey]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stateRes, perfRes] = await Promise.all([
        fetch('/api/v1/capital/state', { headers: headers() }),
        fetch('/api/v1/capital/performance?period=' + period, { headers: headers() }),
      ]);

      if (!stateRes.ok || !perfRes.ok) {
        const errBody = await (stateRes.ok ? perfRes : stateRes).json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to load capital data');
      }

      const stateData = await stateRes.json();
      const perfData = await perfRes.json();
      setState(stateData.data);
      setPerf(perfData.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, headers]);

  useEffect(() => {
    if (adminKey) loadData();
  }, [adminKey, period, loadData]);

  const createSnapshot = async () => {
    setSnapshotting(true);
    try {
      const res = await fetch('/api/v1/capital/snapshot', {
        method: 'POST',
        headers: headers(),
      });
      if (!res.ok) throw new Error('Snapshot creation failed');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSnapshotting(false);
    }
  };

  return (
    <DesignLawLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Layer 03 Institutional Framing */}
        <div className="mb-10 border-t-4 border-t-dl-navy">
          <div className="border border-dl-border border-t-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              <div className="p-6 lg:col-span-2 border-b lg:border-b-0 lg:border-r border-dl-border bg-white">
                <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Layer 03 — Capital Deployment Architecture</p>
                <h2 className="font-dl-serif text-2xl text-dl-navy mb-2">Capital Deployment — Layer 03</h2>
                <p className="text-sm text-dl-gray leading-relaxed mb-4 max-w-2xl">
                  Layer 03 is the Axiom Protocol&apos;s capital deployment architecture — Reg D 506(c) structured SPV programs, bridge loan LP fund, syndication infrastructure, and permissioned secondary market access. All positions are denominated and settled in AXUSD. Every capital movement is recorded with a hash-chained audit trail on Arbitrum One — independently verifiable by any participant without trusting the team. Formation stage — accepting qualified expressions of interest from accredited participants only.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Reg D 506(c)', 'AXUSD Settlement', 'Max 70% LTV', 'On-Chain Reporting', 'Accredited Only'].map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-xs font-dl-mono text-dl-gray border border-dl-border bg-dl-bg">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-dl-bg-alt">
                <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-3">Capital Programs</p>
                <div className="space-y-2">
                  {[
                    { label: 'Lending Fund', sub: 'Bridge loan LP · 70% LTV · Variable yield', href: '/lending-fund' },
                    { label: 'Capital Program', sub: 'SPV-structured Reg D 506(c)', href: '/pilot' },
                    { label: 'Syndication', sub: 'Deal-by-deal LP participation', href: '/syndication' },
                    { label: 'Secondary Network', sub: 'Permissioned secondary transfers', href: '/secondary' },
                  ].map(item => (
                    <a key={item.label} href={item.href} className="block border border-dl-border p-3 bg-white hover:bg-dl-bg-alt text-dl-navy no-underline">
                      <p className="font-dl-mono text-xs text-dl-navy font-bold">{item.label}</p>
                      <p className="font-dl-mono text-xs text-dl-gray mt-0.5">{item.sub}</p>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-1 flex items-center gap-2">
          <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5">Layer 03 — Capital Deployment</span>
          <span className="font-dl-mono text-xs text-dl-navy border border-dl-navy px-2 py-0.5">ADMIN ACCESS</span>
        </div>
        <h1 className="font-dl-serif text-2xl text-dl-navy mb-1">Capital Accounting + Performance Intelligence</h1>
        <p className="text-sm text-dl-muted mb-6">
          Internal capital accounting dashboard for the Layer 03 capital deployment layer. Performance metrics derived from ledger, open positions, and mark-to-market valuations.
          All figures are diagnostic and do not constitute financial advice or projections.
        </p>

        <div className="mb-6">
          <label className="text-xs font-dl-mono text-dl-muted block mb-1">Admin Key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-white w-64"
              placeholder="Enter admin key"
            />
            <button
              onClick={loadData}
              className="px-4 py-1.5 text-sm bg-dl-navy text-white border border-dl-navy"
            >
              LOAD DATA
            </button>
          </div>
        </div>

        {error && (
          <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 mb-6">
            {error}
          </div>
        )}

        {loading && adminKey && (
          <div className="text-sm text-dl-muted py-8 text-center">Loading capital data...</div>
        )}

        {!loading && state && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard label="Cash Balance" value={'$' + fmt(state.cashBalance)} />
              <MetricCard label="Realized P/L" value={'$' + fmt(state.totalRealizedPnl)} />
              <MetricCard label="Open Positions" value={String(state.openPositionCount)} />
              <MetricCard label="Last Snapshot" value={fmtAge(state.snapshotAgeMs)} />
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex gap-1">
                {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs font-dl-mono border ${
                      period === p ? 'bg-dl-navy text-white border-dl-navy' : 'bg-white text-dl-navy border-dl-border'
                    }`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                onClick={createSnapshot}
                disabled={snapshotting}
                className="px-4 py-1 text-xs font-dl-mono bg-dl-forest text-white border border-dl-forest ml-auto"
              >
                {snapshotting ? 'COMPUTING...' : 'CREATE SNAPSHOT'}
              </button>
            </div>

            {perf && (
              <div className="border border-dl-border">
                <div className="bg-dl-bg-alt px-4 py-2 border-b border-dl-border">
                  <span className="font-dl-serif text-sm text-dl-navy">
                    Performance Summary - {period.toUpperCase()}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dl-border">
                        <th className="text-left px-4 py-2 font-dl-mono text-xs text-dl-muted">Metric</th>
                        <th className="text-right px-4 py-2 font-dl-mono text-xs text-dl-muted">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <PerfRow label="Realized P/L" value={'$' + fmt(perf.realizedPnl)} />
                      <PerfRow label="Unrealized P/L" value={'$' + fmt(perf.unrealizedPnl)} />
                      <PerfRow label="Fees" value={'$' + fmt(perf.feesTotal)} />
                      <PerfRow label="Net Capital Change" value={'$' + fmt(perf.netCapitalChange)} highlight />
                      <PerfRow label="Return on Capital" value={fmtPct(perf.returnOnCapital)} />
                      <PerfRow label="Return on Deployed Capital" value={fmtPct(perf.returnOnDeployedCapital)} />
                      <PerfRow label="Capital Efficiency" value={fmt(perf.capitalEfficiencyScore, 4)} />
                      <PerfRow label="Total Capital" value={'$' + fmt(perf.totalCapital)} />
                      <PerfRow label="Deployed Capital" value={'$' + fmt(perf.deployedCapital)} />
                      <PerfRow label="Closed Trades" value={String(perf.closedTradeCount)} />
                      <PerfRow label="Open Trades" value={String(perf.openTradeCount)} />
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <NavCard href="/capital/performance" title="Performance Detail" desc="Period-by-period analysis with return metrics" />
              <NavCard href="/capital/ledger" title="Ledger" desc="Double-entry capital event log" />
              <NavCard href="/capital/snapshots" title="Snapshots" desc="Immutable accounting checkpoints" />
            </div>

            <p className="text-xs text-dl-muted mt-8 border-t border-dl-border pt-4">
              Capital Accounting System - Diagnostic use only. All metrics are derived from recorded
              positions, marks, and ledger entries. No metric constitutes a projection or guarantee.
              Generated {new Date().toISOString()} UTC.
            </p>
          </>
        )}
      </div>
    </DesignLawLayout>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-dl-border p-4">
      <div className="text-xs font-dl-mono text-dl-muted mb-1">{label}</div>
      <div className="text-lg font-dl-mono text-dl-navy">{value}</div>
    </div>
  );
}

function PerfRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr className={`border-b border-dl-border ${highlight ? 'bg-dl-bg-alt' : ''}`}>
      <td className="px-4 py-2 font-dl-mono text-dl-navy">{label}</td>
      <td className="px-4 py-2 font-dl-mono text-dl-navy text-right">{value}</td>
    </tr>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a href={href} className="border border-dl-border p-4 hover:bg-dl-bg-alt block">
      <div className="font-dl-serif text-dl-navy mb-1">{title}</div>
      <div className="text-xs text-dl-muted">{desc}</div>
    </a>
  );
}
