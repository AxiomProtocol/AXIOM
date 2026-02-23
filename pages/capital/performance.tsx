import React, { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

type Period = 'day' | 'week' | 'month' | 'year';

function fmt(n: number, d = 2): string { return n.toFixed(d); }
function fmtPct(n: number): string { return (n * 100).toFixed(2) + '%'; }

export default function CapitalPerformance() {
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allPeriods, setAllPeriods] = useState<Record<string, any>>({});
  const [drawdown, setDrawdown] = useState<any>(null);

  const headers = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminKey) h['x-admin-key'] = adminKey;
    return h;
  }, [adminKey]);

  const loadAll = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError(null);
    try {
      const periods: Period[] = ['day', 'week', 'month', 'year'];
      const results = await Promise.all(
        periods.map(p => fetch('/api/v1/capital/performance?period=' + p, { headers: headers() }).then(r => r.json()))
      );
      const ddRes = await fetch('/api/v1/capital/drawdown?period=year', { headers: headers() }).then(r => r.json());

      const map: Record<string, any> = {};
      periods.forEach((p, i) => { map[p] = results[i].data; });
      setAllPeriods(map);
      setDrawdown(ddRes.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminKey, headers]);

  useEffect(() => { if (adminKey) loadAll(); }, [adminKey, loadAll]);

  const periods: Period[] = ['day', 'week', 'month', 'year'];

  return (
    <DesignLawLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="font-dl-serif text-2xl text-dl-navy mb-1">Performance Detail</h1>
        <p className="text-sm text-dl-muted mb-6">
          Period-by-period capital performance derived from positions and marks.
          Diagnostic only. No projections implied.
        </p>

        <div className="mb-6 flex gap-2">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-white w-64"
            placeholder="Admin key"
          />
          <button onClick={loadAll} className="px-4 py-1.5 text-sm bg-dl-navy text-white border border-dl-navy">
            LOAD
          </button>
        </div>

        {error && <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 mb-6">{error}</div>}

        {loading && <div className="text-sm text-dl-muted py-8 text-center">Loading...</div>}

        {!loading && Object.keys(allPeriods).length > 0 && (
          <>
            <div className="border border-dl-border mb-8">
              <div className="bg-dl-bg-alt px-4 py-2 border-b border-dl-border">
                <span className="font-dl-serif text-sm text-dl-navy">Performance by Period</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dl-border">
                      <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Metric</th>
                      {periods.map(p => (
                        <th key={p} className="text-right px-3 py-2 font-dl-mono text-xs text-dl-muted">{p.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'realizedPnl', label: 'Realized P/L', format: (v: number) => '$' + fmt(v) },
                      { key: 'unrealizedPnl', label: 'Unrealized P/L', format: (v: number) => '$' + fmt(v) },
                      { key: 'feesTotal', label: 'Fees', format: (v: number) => '$' + fmt(v) },
                      { key: 'netCapitalChange', label: 'Net Change', format: (v: number) => '$' + fmt(v) },
                      { key: 'returnOnCapital', label: 'Return on Capital', format: fmtPct },
                      { key: 'returnOnDeployedCapital', label: 'Return on Deployed', format: fmtPct },
                      { key: 'capitalEfficiencyScore', label: 'Efficiency', format: (v: number) => fmt(v, 4) },
                      { key: 'closedTradeCount', label: 'Closed Trades', format: (v: number) => String(v) },
                    ].map(row => (
                      <tr key={row.key} className="border-b border-dl-border">
                        <td className="px-3 py-2 font-dl-mono text-dl-navy">{row.label}</td>
                        {periods.map(p => (
                          <td key={p} className="px-3 py-2 font-dl-mono text-dl-navy text-right">
                            {allPeriods[p] ? row.format(allPeriods[p][row.key] ?? 0) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {drawdown && (
              <div className="border border-dl-border mb-8">
                <div className="bg-dl-bg-alt px-4 py-2 border-b border-dl-border">
                  <span className="font-dl-serif text-sm text-dl-navy">Drawdown State (Year)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                  <div>
                    <div className="text-xs font-dl-mono text-dl-muted">Max Drawdown</div>
                    <div className="font-dl-mono text-dl-navy">{fmtPct(drawdown.maxDrawdown)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-dl-mono text-dl-muted">Peak</div>
                    <div className="font-dl-mono text-dl-navy">${fmt(drawdown.peakValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-dl-mono text-dl-muted">Trough</div>
                    <div className="font-dl-mono text-dl-navy">${fmt(drawdown.troughValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-dl-mono text-dl-muted">Status</div>
                    <div className="font-dl-mono text-dl-navy">{drawdown.status}</div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-dl-muted border-t border-dl-border pt-4">
              Performance data derived from recorded positions and marks.
              No metric constitutes a projection. Generated {new Date().toISOString()} UTC.
            </p>
          </>
        )}
      </div>
    </DesignLawLayout>
  );
}
