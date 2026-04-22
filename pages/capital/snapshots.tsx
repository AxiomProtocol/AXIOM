import React, { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import Link from 'next/link';

interface SnapshotSummary {
  id: string;
  asOf: string;
  checksum: string;
  sourcesUsed: string[];
  confidence: string;
  warnings: string[];
  regimeBand: string | null;
  policyState: string | null;
  createdAt: string;
}

export default function CapitalSnapshots() {
  const [adminKey, setAdminKey] = useState('');
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(() => {
    const h: Record<string, string> = {};
    if (adminKey) h['x-admin-key'] = adminKey;
    return h;
  }, [adminKey]);

  const loadData = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/capital/snapshots?page=' + page, { headers: headers() });
      if (!res.ok) throw new Error('Failed to load snapshots');
      const json = await res.json();
      setSnapshots(json.data.snapshots);
      setTotalPages(json.data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminKey, page, headers]);

  useEffect(() => { if (adminKey) loadData(); }, [adminKey, page, loadData]);

  return (
    <DesignLawLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="font-dl-serif text-2xl text-dl-navy mb-1">Accounting Snapshots</h1>
        <p className="text-sm text-dl-muted mb-6">
          Immutable checkpoint records with deterministic checksums for auditability.
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

        {!loading && snapshots.length > 0 && (
          <>
            <div className="border border-dl-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dl-border bg-dl-bg-alt">
                    <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">As Of</th>
                    <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Checksum</th>
                    <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Sources</th>
                    <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Confidence</th>
                    <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Regime</th>
                    <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map(s => (
                    <tr key={s.id} className="border-b border-dl-border">
                      <td className="px-3 py-2 font-dl-mono text-xs text-dl-navy whitespace-nowrap">
                        {new Date(s.asOf).toISOString().slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="px-3 py-2 font-dl-mono text-xs text-dl-muted" title={s.checksum}>
                        {s.checksum.slice(0, 12)}...
                      </td>
                      <td className="px-3 py-2 font-dl-mono text-xs text-dl-navy">
                        {(s.sourcesUsed || []).join(', ')}
                      </td>
                      <td className="px-3 py-2 font-dl-mono text-xs text-dl-navy">{s.confidence}</td>
                      <td className="px-3 py-2 font-dl-mono text-xs text-dl-muted">{s.regimeBand || '-'}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={'/capital/snapshot/' + s.id}
                          className="text-xs font-dl-mono text-dl-navy underline"
                        >
                          VIEW
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-xs font-dl-mono border border-dl-border disabled:opacity-40"
              >
                PREV
              </button>
              <span className="text-xs font-dl-mono text-dl-muted">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-xs font-dl-mono border border-dl-border disabled:opacity-40"
              >
                NEXT
              </button>
            </div>
          </>
        )}

        {!loading && snapshots.length === 0 && adminKey && (
          <div className="text-sm text-dl-muted py-8 text-center border border-dl-border">
            No snapshots recorded. Create one from the Capital dashboard.
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
