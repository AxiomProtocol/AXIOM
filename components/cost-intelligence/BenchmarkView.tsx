import { useState } from 'react';
import type { BenchmarkRecord } from '../../lib/cost-intelligence/types';

interface Props {
  estimateId: string;
  dealId?: string;
  providerEstimate: number;
  adjustedEstimate: number;
  propertyType?: string;
  regionCode?: string;
}

const fmt = (n: number | undefined) =>
  n != null ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—';

const fmtPct = (n: number | undefined) =>
  n != null ? `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%` : '—';

type ProjectStatus = BenchmarkRecord['projectStatus'];

export default function BenchmarkView({
  estimateId,
  dealId,
  providerEstimate,
  adjustedEstimate,
  propertyType,
  regionCode,
}: Props) {
  const [form, setForm] = useState({
    contractorBid: '',
    approvedBudget: '',
    actualCost: '',
    projectStatus: 'pending' as ProjectStatus,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<BenchmarkRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const payload: Partial<BenchmarkRecord> = {
        estimateId,
        dealId,
        propertyType: propertyType as any,
        regionCode,
        providerEstimate,
        adjustedEstimate,
        contractorBid: form.contractorBid ? Number(form.contractorBid) : undefined,
        approvedBudget: form.approvedBudget ? Number(form.approvedBudget) : undefined,
        actualCost: form.actualCost ? Number(form.actualCost) : undefined,
        projectStatus: form.projectStatus,
        notes: form.notes || undefined,
      };

      const res = await fetch('/api/cost-intelligence/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setSaved(true);
      setHistoryLoaded(false);
    } catch {
      setError('Failed to save benchmark');
    } finally {
      setSaving(false);
    }
  }

  async function loadHistory() {
    if (historyLoaded) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/cost-intelligence/benchmarks?estimateId=${estimateId}`);
      const json = await res.json();
      setHistory(json.benchmarks || []);
      setHistoryLoaded(true);
    } catch {}
    finally { setLoadingHistory(false); }
  }

  const contractorBidNum = form.contractorBid ? Number(form.contractorBid) : null;
  const bidVariance = contractorBidNum ? (contractorBidNum - adjustedEstimate) / adjustedEstimate : null;

  return (
    <div className="space-y-6">
      <div className="border border-dl-border p-4">
        <p className="font-dl-mono text-xs text-dl-muted uppercase mb-4">Estimate Anchors</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Provider Baseline</p>
            <p className="font-dl-mono text-sm font-bold text-dl-navy">{fmt(providerEstimate)}</p>
            <p className="font-dl-mono text-xs text-dl-muted">Craftsman NCE mid-point</p>
          </div>
          <div>
            <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Adjusted Total</p>
            <p className="font-dl-mono text-sm font-bold text-dl-navy">{fmt(adjustedEstimate)}</p>
            <p className="font-dl-mono text-xs text-dl-muted">With regional + contingency + soft costs</p>
          </div>
          {contractorBidNum && (
            <div>
              <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1">Bid vs. Estimate</p>
              <p className={`font-dl-mono text-sm font-bold ${bidVariance && bidVariance > 0.1 ? 'text-red-600' : bidVariance && bidVariance < -0.05 ? 'text-dl-forest' : 'text-dl-navy'}`}>
                {fmtPct(bidVariance)}
              </p>
              <p className="font-dl-mono text-xs text-dl-muted">{fmt(contractorBidNum)} contractor bid</p>
            </div>
          )}
        </div>
      </div>

      <div className="border border-dl-border p-4">
        <p className="font-dl-mono text-xs text-dl-muted uppercase mb-3">Log Actuals</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Contractor Bid ($)</label>
            <input
              type="number"
              value={form.contractorBid}
              onChange={e => setForm(f => ({ ...f, contractorBid: e.target.value }))}
              placeholder="0"
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs"
            />
          </div>
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Approved Budget ($)</label>
            <input
              type="number"
              value={form.approvedBudget}
              onChange={e => setForm(f => ({ ...f, approvedBudget: e.target.value }))}
              placeholder="0"
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs"
            />
          </div>
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Actual Cost ($)</label>
            <input
              type="number"
              value={form.actualCost}
              onChange={e => setForm(f => ({ ...f, actualCost: e.target.value }))}
              placeholder="0"
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs"
            />
          </div>
          <div>
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Project Status</label>
            <select
              value={form.projectStatus}
              onChange={e => setForm(f => ({ ...f, projectStatus: e.target.value as ProjectStatus }))}
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs bg-white"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Variance explanation, contractor notes…"
              className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-xs"
            />
          </div>
        </div>

        {error && <p className="font-dl-mono text-xs text-red-600 mb-2">{error}</p>}
        {saved && <p className="font-dl-mono text-xs text-dl-forest mb-2">Benchmark saved.</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-dl-navy text-white px-6 py-2 font-dl-mono text-xs disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save Benchmark Record'}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-dl-mono text-xs text-dl-muted uppercase">Benchmark History</p>
          <button
            onClick={loadHistory}
            disabled={loadingHistory}
            className="font-dl-mono text-xs text-dl-navy underline disabled:opacity-40"
          >
            {loadingHistory ? 'Loading…' : historyLoaded ? 'Refresh' : 'Load History'}
          </button>
        </div>

        {historyLoaded && history.length === 0 && (
          <p className="font-dl-mono text-xs text-dl-muted">No benchmark records yet.</p>
        )}

        {history.length > 0 && (
          <div className="border border-dl-border overflow-x-auto">
            <table className="w-full font-dl-mono text-xs">
              <thead>
                <tr className="border-b border-dl-border bg-gray-50">
                  <th className="text-left px-3 py-2 text-dl-muted uppercase">Status</th>
                  <th className="text-right px-3 py-2 text-dl-muted uppercase">Provider Est.</th>
                  <th className="text-right px-3 py-2 text-dl-muted uppercase">Adjusted</th>
                  <th className="text-right px-3 py-2 text-dl-muted uppercase">Contractor Bid</th>
                  <th className="text-right px-3 py-2 text-dl-muted uppercase">Bid Variance</th>
                  <th className="text-right px-3 py-2 text-dl-muted uppercase">Actual Cost</th>
                  <th className="text-right px-3 py-2 text-dl-muted uppercase">Actual Variance</th>
                  <th className="text-left px-3 py-2 text-dl-muted uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((b, i) => (
                  <tr key={b.id || i} className="border-b border-dl-border last:border-0">
                    <td className="px-3 py-2">
                      <span className={`font-dl-mono text-xs px-1 py-0.5 border ${b.projectStatus === 'completed' ? 'border-dl-forest text-dl-forest' : b.projectStatus === 'in_progress' ? 'border-blue-600 text-blue-600' : 'border-dl-muted text-dl-muted'}`}>
                        {b.projectStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-dl-muted">{fmt(b.providerEstimate)}</td>
                    <td className="px-3 py-2 text-right text-dl-navy font-bold">{fmt(b.adjustedEstimate)}</td>
                    <td className="px-3 py-2 text-right text-dl-muted">{fmt(b.contractorBid)}</td>
                    <td className={`px-3 py-2 text-right ${b.varianceBidPct && b.varianceBidPct > 0.1 ? 'text-red-600' : b.varianceBidPct && b.varianceBidPct < -0.05 ? 'text-dl-forest' : 'text-dl-muted'}`}>
                      {fmtPct(b.varianceBidPct)}
                    </td>
                    <td className="px-3 py-2 text-right text-dl-muted">{fmt(b.actualCost)}</td>
                    <td className={`px-3 py-2 text-right ${b.varianceActualPct && b.varianceActualPct > 0.1 ? 'text-red-600' : 'text-dl-muted'}`}>
                      {fmtPct(b.varianceActualPct)}
                    </td>
                    <td className="px-3 py-2 text-dl-muted max-w-xs truncate">{b.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border border-dl-border p-3 bg-gray-50">
        <p className="font-dl-mono text-xs text-dl-muted uppercase mb-2">Variance Interpretation Guide</p>
        <div className="space-y-1">
          {[
            { range: '< –5%', label: 'Bid undercut estimate', color: 'text-dl-forest' },
            { range: '–5% to +10%', label: 'Within normal tolerance', color: 'text-dl-muted' },
            { range: '+10% to +25%', label: 'Elevated — review scope', color: 'text-yellow-700' },
            { range: '> +25%', label: 'Significant overrun — re-underwrite', color: 'text-red-600' },
          ].map(({ range, label, color }) => (
            <div key={range} className="flex gap-4">
              <span className="font-dl-mono text-xs text-dl-muted w-28 shrink-0">{range}</span>
              <span className={`font-dl-mono text-xs ${color}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
