import { useState } from 'react';

interface VersionRecord {
  id: string;
  estimateId: string;
  version: number;
  triggeredBy: string;
  snapshotJson: {
    grandTotal?: number;
    lineItems?: any[];
    range?: any;
  };
  createdAt: string;
}

interface Props {
  estimateId: string;
  currentVersion: number;
}

const fmt = (n: number | undefined) =>
  n != null ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—';

export default function EstimateVersionHistory({ estimateId, currentVersion }: Props) {
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function loadVersions() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/cost-intelligence/estimates/${estimateId}/versions`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setVersions(json.versions || []);
      setLoaded(true);
    } catch {
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  }

  function getLineCount(v: VersionRecord) {
    return v.snapshotJson?.lineItems?.length ?? '—';
  }

  function getHardCostTotal(v: VersionRecord) {
    const items = v.snapshotJson?.lineItems ?? [];
    return items
      .filter((l: any) => !l.isContingency && !l.isSoftCost)
      .reduce((s: number, l: any) => s + (l.lineTotal || 0), 0);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-dl-mono text-xs text-dl-muted uppercase">
          Version History — Current: v{currentVersion}
        </p>
        <button
          onClick={loadVersions}
          disabled={loading}
          className="font-dl-mono text-xs text-dl-navy underline disabled:opacity-40"
        >
          {loading ? 'Loading…' : loaded ? 'Refresh' : 'Load Versions'}
        </button>
      </div>

      {error && <p className="font-dl-mono text-xs text-red-600">{error}</p>}

      {loaded && versions.length === 0 && (
        <p className="font-dl-mono text-xs text-dl-muted">
          No saved versions yet. Enable "Save snapshot" when generating an estimate to create a version checkpoint.
        </p>
      )}

      {versions.length > 0 && (
        <div className="border border-dl-border">
          {versions.map((v) => {
            const grandTotal = v.snapshotJson?.grandTotal;
            const hardTotal = getHardCostTotal(v);
            const lineCount = getLineCount(v);
            const isOpen = expanded === v.id;

            return (
              <div key={v.id} className="border-b border-dl-border last:border-0">
                <button
                  onClick={() => setExpanded(isOpen ? null : v.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-dl-mono text-xs font-bold text-dl-navy">v{v.version}</span>
                    <span className="font-dl-mono text-xs text-dl-muted">
                      {new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-dl-mono text-xs text-dl-muted">
                      {lineCount} line{typeof lineCount === 'number' && lineCount !== 1 ? 's' : ''}
                    </span>
                    <span className="font-dl-mono text-xs text-dl-muted capitalize">
                      by {v.triggeredBy}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-dl-mono text-xs font-bold text-dl-navy">{fmt(grandTotal)}</span>
                    <span className="font-dl-mono text-xs text-dl-muted">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-dl-border bg-gray-50">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 mb-3">
                      <div>
                        <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Grand Total</p>
                        <p className="font-dl-mono text-sm font-bold text-dl-navy">{fmt(grandTotal)}</p>
                      </div>
                      <div>
                        <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Hard Costs</p>
                        <p className="font-dl-mono text-sm font-bold text-dl-navy">{fmt(hardTotal)}</p>
                      </div>
                      <div>
                        <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Range Low</p>
                        <p className="font-dl-mono text-sm text-dl-forest">{fmt(v.snapshotJson?.range?.confidenceWeightedLow)}</p>
                      </div>
                      <div>
                        <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Range High</p>
                        <p className="font-dl-mono text-sm text-red-600">{fmt(v.snapshotJson?.range?.confidenceWeightedHigh)}</p>
                      </div>
                    </div>

                    {v.snapshotJson?.lineItems && v.snapshotJson.lineItems.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full font-dl-mono text-xs">
                          <thead>
                            <tr className="border-b border-dl-border">
                              <th className="text-left px-2 py-1.5 text-dl-muted uppercase">Trade</th>
                              <th className="text-left px-2 py-1.5 text-dl-muted uppercase">Description</th>
                              <th className="text-right px-2 py-1.5 text-dl-muted uppercase">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.snapshotJson.lineItems.map((l: any, i: number) => (
                              <tr key={i} className="border-b border-dl-border last:border-0">
                                <td className="px-2 py-1.5 text-dl-muted">{l.trade}</td>
                                <td className="px-2 py-1.5 text-dl-text">{l.description}</td>
                                <td className="px-2 py-1.5 text-right font-bold text-dl-navy">{fmt(l.lineTotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="border border-dl-border p-3 bg-gray-50">
        <p className="font-dl-mono text-xs text-dl-muted">
          Snapshots are saved when generating an estimate with "Save snapshot" enabled.
          Each version preserves a full line-item record for audit and comparison.
          Versions are immutable — deleting scope items does not affect prior versions.
        </p>
      </div>
    </div>
  );
}
