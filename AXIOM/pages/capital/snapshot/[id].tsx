import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import Link from 'next/link';

interface SnapshotLine {
  id: string;
  metricKey: string;
  metricValue: string;
  period: string;
  instrument: string | null;
}

interface Decision {
  id: string;
  action: string;
  rationale: string;
  metadata: any;
  createdAt: string;
}

interface DrawdownRecord {
  peakValue: number;
  troughValue: number;
  depthPct: number;
  peakAt: string;
  troughAt: string;
  status: string;
}

interface DriftRecord {
  asOf: string;
  expectedValue: number;
  actualValue: number;
  variancePct: number;
}

interface SnapshotDetail {
  id: string;
  asOf: string;
  checksum: string;
  sourcesUsed: string[];
  confidence: string;
  warnings: string[];
  regimeBand: string | null;
  policyState: string | null;
  createdAt: string;
  lines: SnapshotLine[];
  decisions: Decision[];
  drawdowns: DrawdownRecord[];
  drifts: DriftRecord[];
}

export default function SnapshotDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [adminKey, setAdminKey] = useState('');
  const [snapshot, setSnapshot] = useState<SnapshotDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lines' | 'decisions' | 'drawdowns' | 'drift'>('lines');

  const headers = useCallback(() => {
    const h: Record<string, string> = {};
    if (adminKey) h['x-admin-key'] = adminKey;
    return h;
  }, [adminKey]);

  const loadData = useCallback(async () => {
    if (!adminKey || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/capital/snapshots?id=' + id, { headers: headers() });
      if (!res.ok) throw new Error('Snapshot not found');
      const json = await res.json();
      setSnapshot(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminKey, id, headers]);

  useEffect(() => { if (adminKey && id) loadData(); }, [adminKey, id, loadData]);

  const allLines = snapshot?.lines ?? [];
  const periods = [...new Set(allLines.map(l => l.period))].sort();

  return (
    <DesignLawLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-1">
          <Link href="/capital/snapshots" className="text-xs font-dl-mono text-dl-muted hover:underline">
            Snapshots
          </Link>
          <span className="text-xs text-dl-muted">/</span>
          <h1 className="font-dl-serif text-2xl text-dl-navy">Snapshot Detail</h1>
        </div>
        <p className="text-sm text-dl-muted mb-6">
          Immutable accounting checkpoint with deterministic checksum verification.
        </p>

        <div className="mb-6 flex gap-2">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-white w-64"
            placeholder="Admin key"
          />
          <button onClick={loadData} className="px-4 py-1.5 text-sm bg-dl-navy text-white border border-dl-navy">
            LOAD
          </button>
        </div>

        {error && <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">{error}</div>}
        {loading && <div className="text-sm text-dl-muted py-8 text-center">Loading...</div>}

        {!loading && snapshot && (
          <>
            <div className="border border-dl-border mb-6">
              <div className="bg-dl-bg-alt px-4 py-2 border-b border-dl-border">
                <span className="font-dl-serif text-sm text-dl-navy">Snapshot Metadata</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                <div>
                  <div className="text-xs font-dl-mono text-dl-muted">Snapshot ID</div>
                  <div className="font-dl-mono text-xs text-dl-navy break-all">{snapshot.id}</div>
                </div>
                <div>
                  <div className="text-xs font-dl-mono text-dl-muted">As Of</div>
                  <div className="font-dl-mono text-xs text-dl-navy">
                    {new Date(snapshot.asOf).toISOString().slice(0, 19).replace('T', ' ')} UTC
                  </div>
                </div>
                <div>
                  <div className="text-xs font-dl-mono text-dl-muted">Checksum (SHA-256)</div>
                  <div className="font-dl-mono text-xs text-dl-navy break-all">{snapshot.checksum}</div>
                </div>
                <div>
                  <div className="text-xs font-dl-mono text-dl-muted">Confidence</div>
                  <div className="font-dl-mono text-xs text-dl-navy">{snapshot.confidence}</div>
                </div>
                <div>
                  <div className="text-xs font-dl-mono text-dl-muted">Sources</div>
                  <div className="font-dl-mono text-xs text-dl-navy">{(snapshot.sourcesUsed || []).join(', ') || '-'}</div>
                </div>
                <div>
                  <div className="text-xs font-dl-mono text-dl-muted">Regime / Policy</div>
                  <div className="font-dl-mono text-xs text-dl-navy">
                    {snapshot.regimeBand || '-'} / {snapshot.policyState || '-'}
                  </div>
                </div>
              </div>
              {(snapshot.warnings || []).length > 0 && (
                <div className="px-4 pb-4">
                  <div className="text-xs font-dl-mono text-dl-muted mb-1">Warnings</div>
                  {(snapshot.warnings as string[]).map((w, i) => (
                    <div key={i} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 mb-1 border border-amber-200">
                      {w}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-1 mb-4">
              {(['lines', 'decisions', 'drawdowns', 'drift'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs font-dl-mono border ${
                    activeTab === tab ? 'bg-dl-navy text-white border-dl-navy' : 'bg-white text-dl-navy border-dl-border'
                  }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {activeTab === 'lines' && (
              <div className="border border-dl-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dl-border bg-dl-bg-alt">
                      <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Period</th>
                      <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Metric</th>
                      <th className="text-right px-3 py-2 font-dl-mono text-xs text-dl-muted">Value</th>
                      <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Instrument</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLines.map(l => (
                      <tr key={l.id} className="border-b border-dl-border">
                        <td className="px-3 py-1.5 font-dl-mono text-xs text-dl-muted">{l.period}</td>
                        <td className="px-3 py-1.5 font-dl-mono text-xs text-dl-navy">{l.metricKey}</td>
                        <td className="px-3 py-1.5 font-dl-mono text-xs text-dl-navy text-right">{l.metricValue}</td>
                        <td className="px-3 py-1.5 font-dl-mono text-xs text-dl-muted">{l.instrument || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'decisions' && (
              <div className="border border-dl-border">
                {snapshot.decisions.length === 0 ? (
                  <div className="text-sm text-dl-muted py-6 text-center">No decision log entries.</div>
                ) : (
                  snapshot.decisions.map(d => (
                    <div key={d.id} className="border-b border-dl-border p-4 last:border-b-0">
                      <div className="flex items-center gap-4 mb-1">
                        <span className="font-dl-mono text-xs text-dl-navy">{d.action}</span>
                        <span className="font-dl-mono text-xs text-dl-muted">
                          {new Date(d.createdAt).toISOString().slice(0, 19)}
                        </span>
                      </div>
                      <div className="text-xs text-dl-navy">{d.rationale}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'drawdowns' && (
              <div className="border border-dl-border">
                {snapshot.drawdowns.length === 0 ? (
                  <div className="text-sm text-dl-muted py-6 text-center">No drawdown records for this snapshot.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dl-border bg-dl-bg-alt">
                        <th className="text-right px-3 py-2 font-dl-mono text-xs text-dl-muted">Peak</th>
                        <th className="text-right px-3 py-2 font-dl-mono text-xs text-dl-muted">Trough</th>
                        <th className="text-right px-3 py-2 font-dl-mono text-xs text-dl-muted">Depth</th>
                        <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.drawdowns.map((dd, i) => (
                        <tr key={i} className="border-b border-dl-border">
                          <td className="px-3 py-2 font-dl-mono text-xs text-right">${dd.peakValue.toFixed(2)}</td>
                          <td className="px-3 py-2 font-dl-mono text-xs text-right">${dd.troughValue.toFixed(2)}</td>
                          <td className="px-3 py-2 font-dl-mono text-xs text-right">{(dd.depthPct * 100).toFixed(2)}%</td>
                          <td className="px-3 py-2 font-dl-mono text-xs">{dd.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'drift' && (
              <div className="border border-dl-border">
                {snapshot.drifts.length === 0 ? (
                  <div className="text-sm text-dl-muted py-6 text-center">No drift data for this snapshot.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dl-border bg-dl-bg-alt">
                        <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">As Of</th>
                        <th className="text-right px-3 py-2 font-dl-mono text-xs text-dl-muted">Expected</th>
                        <th className="text-right px-3 py-2 font-dl-mono text-xs text-dl-muted">Actual</th>
                        <th className="text-right px-3 py-2 font-dl-mono text-xs text-dl-muted">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.drifts.map((d, i) => (
                        <tr key={i} className="border-b border-dl-border">
                          <td className="px-3 py-2 font-dl-mono text-xs">{new Date(d.asOf).toISOString().slice(0, 19)}</td>
                          <td className="px-3 py-2 font-dl-mono text-xs text-right">${d.expectedValue.toFixed(2)}</td>
                          <td className="px-3 py-2 font-dl-mono text-xs text-right">${d.actualValue.toFixed(2)}</td>
                          <td className="px-3 py-2 font-dl-mono text-xs text-right">{(d.variancePct * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <p className="text-xs text-dl-muted mt-8 border-t border-dl-border pt-4">
              Snapshot checksum is computed deterministically from ordered metric lines and source references.
              Any modification to underlying data would produce a different checksum.
            </p>
          </>
        )}
      </div>
    </DesignLawLayout>
  );
}
