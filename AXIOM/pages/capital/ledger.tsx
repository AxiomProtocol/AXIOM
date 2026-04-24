import React, { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

interface LedgerEntry {
  id: string;
  txGroupId: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  currency: string;
  description: string;
  externalId: string | null;
  sourceType: string;
  createdAt: string;
}

export default function CapitalLedger() {
  const [adminKey, setAdminKey] = useState('');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
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
      const res = await fetch('/api/v1/capital/ledger?page=' + page + '&pageSize=50', { headers: headers() });
      if (!res.ok) throw new Error('Failed to load ledger');
      const json = await res.json();
      setEntries(json.data.entries);
      setTotalPages(json.data.pagination.totalPages);
      setTotal(json.data.pagination.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminKey, page, headers]);

  useEffect(() => { if (adminKey) loadData(); }, [adminKey, page, loadData]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capital-ledger-page-' + page + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DesignLawLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="font-dl-serif text-2xl text-dl-navy mb-1">Capital Ledger</h1>
        <p className="text-sm text-dl-muted mb-6">
          Double-entry capital event log. All entries are immutable once recorded.
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
          {entries.length > 0 && (
            <button onClick={exportJson} className="px-4 py-1.5 text-sm border border-dl-border text-dl-navy ml-auto">
              EXPORT JSON
            </button>
          )}
        </div>

        {error && <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">{error}</div>}

        {loading && <div className="text-sm text-dl-muted py-8 text-center">Loading ledger...</div>}

        {!loading && entries.length > 0 && (
          <>
            <div className="text-xs font-dl-mono text-dl-muted mb-2">
              {total} entries total, page {page} of {totalPages}
            </div>
            <div className="border border-dl-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dl-border bg-dl-bg-alt">
                    <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Date</th>
                    <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Account</th>
                    <th className="text-right px-3 py-2 font-dl-mono text-xs text-dl-muted">Debit</th>
                    <th className="text-right px-3 py-2 font-dl-mono text-xs text-dl-muted">Credit</th>
                    <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Source</th>
                    <th className="text-left px-3 py-2 font-dl-mono text-xs text-dl-muted">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-b border-dl-border">
                      <td className="px-3 py-2 font-dl-mono text-xs text-dl-navy whitespace-nowrap">
                        {new Date(e.createdAt).toISOString().slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="px-3 py-2 font-dl-mono text-xs text-dl-navy">{e.accountName || '-'}</td>
                      <td className="px-3 py-2 font-dl-mono text-xs text-dl-navy text-right">
                        {e.debitAmount > 0 ? e.debitAmount.toFixed(2) : ''}
                      </td>
                      <td className="px-3 py-2 font-dl-mono text-xs text-dl-navy text-right">
                        {e.creditAmount > 0 ? e.creditAmount.toFixed(2) : ''}
                      </td>
                      <td className="px-3 py-2 font-dl-mono text-xs text-dl-muted">{e.sourceType}</td>
                      <td className="px-3 py-2 text-xs text-dl-navy max-w-xs truncate">{e.description}</td>
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

        {!loading && entries.length === 0 && adminKey && (
          <div className="text-sm text-dl-muted py-8 text-center border border-dl-border">
            No ledger entries recorded. Entries are created when snapshots ingest trade data.
          </div>
        )}

        <p className="text-xs text-dl-muted mt-8 border-t border-dl-border pt-4">
          Ledger entries are immutable. All modifications create new compensating entries.
        </p>
      </div>
    </DesignLawLayout>
  );
}
