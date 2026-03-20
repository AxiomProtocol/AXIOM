import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

interface ApprovalRequest {
  id: string;
  approval_type: string;
  status: string;
  requested_at: string;
  expires_at: string | null;
  series_id: string;
  series_name: string;
  asset_class: string;
  units_requested: string;
  agreed_price_per_unit: string | null;
  gross_amount: string | null;
}

interface SeriesDashboard {
  id: string;
  name: string;
  slug: string;
  asset_class: string;
  status: string;
  current_nav: string | null;
  unit_price: string | null;
  total_units_issued: string;
  holder_count: string;
  total_units_held: string;
  active_listings: string;
  pending_bids: string;
  pending_approvals: string;
  liquidity_score: string | null;
  score_label: string | null;
  transferability_status: string;
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  fund_interest: 'Fund Interest',
  private_credit: 'Private Credit',
  mortgage_note: 'Mortgage Note',
  dscr_loan: 'DSCR Loan',
  fix_flip_debt: 'Fix & Flip Debt',
  rent_stream: 'Rent Stream',
  land_interest: 'Land Interest',
  treasury_yield: 'Treasury Yield',
};

const NAV_METHODS = ['cost_basis', 'appraisal', 'mark_to_model', 'mark_to_market', 'par'];

function fmtCurrency(n: string | number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const v = parseFloat(String(n));
  if (isNaN(v)) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function IssuerConsole() {
  const [series, setSeries] = useState<SeriesDashboard[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'series' | 'approvals' | 'nav' | 'registry'>('series');
  const [approvalDecision, setApprovalDecision] = useState<Record<string, { decision: string; reason: string }>>({});
  const [resolving, setResolving] = useState('');
  const [resolveResult, setResolveResult] = useState('');
  const [navForm, setNavForm] = useState({ seriesId: '', navPerUnit: '', methodUsed: 'cost_basis', notes: '' });
  const [navResult, setNavResult] = useState('');
  const [registrySeriesId, setRegistrySeriesId] = useState('');
  const [registry, setRegistry] = useState<any[]>([]);
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeries, setNewSeries] = useState({ name: '', assetClass: 'fund_interest', holdPeriodDays: '180', totalUnitsIssued: '', unitPrice: '' });
  const [creatingResult, setCreatingResult] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/secondary/issuer/dashboard');
        if (!res.ok) { setError('Access denied or not authenticated.'); setLoading(false); return; }
        const data = await res.json();
        if (data.success) { setSeries(data.series || []); setApprovals(data.pendingApprovals || []); }
      } catch { setError('Failed to load issuer data.'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function handleResolveApproval(approvalRequestId: string) {
    const form = approvalDecision[approvalRequestId];
    if (!form?.decision) return;
    setResolving(approvalRequestId);
    try {
      const res = await fetch('/api/secondary/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalRequestId, decision: form.decision, reason: form.reason }),
      });
      const data = await res.json();
      setResolveResult(data.success ? `Approval ${form.decision}` : `Error: ${data.error}`);
      if (data.success) setApprovals(prev => prev.filter(a => a.id !== approvalRequestId));
    } catch (err: any) { setResolveResult(`Error: ${err.message}`); }
    finally { setResolving(''); }
  }

  async function handleNavMark() {
    if (!navForm.seriesId || !navForm.navPerUnit) return;
    const res = await fetch(`/api/secondary/series/${navForm.seriesId}/pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ navPerUnit: parseFloat(navForm.navPerUnit), methodUsed: navForm.methodUsed, notes: navForm.notes }),
    });
    const data = await res.json();
    setNavResult(data.success ? `NAV mark recorded — ID: ${data.markId}` : `Error: ${data.error}`);
  }

  async function handleLoadRegistry() {
    if (!registrySeriesId) return;
    const res = await fetch(`/api/secondary/series/${registrySeriesId}/registry`);
    const data = await res.json();
    if (data.success) setRegistry(data.registry);
  }

  async function handleCreateSeries() {
    const res = await fetch('/api/secondary/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSeries),
    });
    const data = await res.json();
    setCreatingResult(data.success ? `Series created — slug: ${data.series.slug}` : `Error: ${data.error}`);
    if (data.success) { setSeries(prev => [...prev, data.series]); setShowNewSeries(false); }
  }

  return (
    <DesignLawLayout>
      <Head><title>Issuer Console — Secondary Network | Axiom Protocol</title></Head>

      <div className="border-b border-gray-200 pb-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-dl-navy">Issuer Console</h1>
            <p className="text-sm text-dl-muted mt-1">Manage series, approve transfers, update NAV, and view the beneficial ownership registry</p>
          </div>
          <div className="flex gap-3">
            <Link href="/secondary"><button className="text-xs font-mono text-dl-muted hover:text-dl-navy">← Portfolio</button></Link>
            <button onClick={() => setShowNewSeries(v => !v)} className="px-4 py-2 bg-dl-navy text-white text-sm font-mono">
              {showNewSeries ? 'Cancel' : '+ New Series'}
            </button>
          </div>
        </div>

        {showNewSeries && (
          <div className="mt-6 border border-gray-200 p-5">
            <h3 className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-4">Create Series</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="font-mono text-xs text-dl-muted block mb-1">Series Name</label>
                <input type="text" value={newSeries.name} onChange={e => setNewSeries(v => ({ ...v, name: e.target.value }))}
                  className="w-full border border-gray-300 p-2 text-sm font-mono" placeholder="e.g. ATL Mortgage Fund I" />
              </div>
              <div>
                <label className="font-mono text-xs text-dl-muted block mb-1">Asset Class</label>
                <select value={newSeries.assetClass} onChange={e => setNewSeries(v => ({ ...v, assetClass: e.target.value }))}
                  className="w-full border border-gray-300 p-2 text-sm font-mono">
                  {Object.entries(ASSET_CLASS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-xs text-dl-muted block mb-1">Total Units Issued</label>
                <input type="number" value={newSeries.totalUnitsIssued} onChange={e => setNewSeries(v => ({ ...v, totalUnitsIssued: e.target.value }))}
                  className="w-full border border-gray-300 p-2 text-sm font-mono" placeholder="e.g. 1000" />
              </div>
              <div>
                <label className="font-mono text-xs text-dl-muted block mb-1">Unit Price (AXUSD)</label>
                <input type="number" value={newSeries.unitPrice} onChange={e => setNewSeries(v => ({ ...v, unitPrice: e.target.value }))}
                  className="w-full border border-gray-300 p-2 text-sm font-mono" placeholder="e.g. 1000.00" />
              </div>
              <div>
                <label className="font-mono text-xs text-dl-muted block mb-1">Hold Period (days)</label>
                <input type="number" value={newSeries.holdPeriodDays} onChange={e => setNewSeries(v => ({ ...v, holdPeriodDays: e.target.value }))}
                  className="w-full border border-gray-300 p-2 text-sm font-mono" />
              </div>
            </div>
            <button onClick={handleCreateSeries} className="px-5 py-2 bg-dl-forest text-white text-sm font-mono">Create Series</button>
            {creatingResult && <p className={`mt-2 font-mono text-sm ${creatingResult.startsWith('Error') ? 'text-dl-error' : 'text-dl-forest'}`}>{creatingResult}</p>}
          </div>
        )}

        <div className="flex gap-6 mt-6">
          {(['series', 'approvals', 'nav', 'registry'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`font-mono text-sm pb-2 border-b-2 ${tab === t ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-muted hover:text-dl-navy'}`}>
              {t === 'nav' ? 'NAV Marks' : t === 'approvals' ? `Approvals${approvals.length > 0 ? ` (${approvals.length})` : ''}` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="font-mono text-sm text-dl-muted">Loading...</div>}
      {error && <div className="border border-dl-error bg-red-50 p-4 font-mono text-sm text-dl-error">{error}</div>}

      {!loading && !error && tab === 'series' && (
        <div className="border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Series</th>
                <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">NAV</th>
                <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Holders</th>
                <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Active Listings</th>
                <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Pending Bids</th>
                <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Pending Approvals</th>
                <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Liquidity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {series.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center font-mono text-sm text-dl-muted">No series found. Create one above.</td></tr>
              ) : series.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-dl-navy font-medium">{s.name}</div>
                    <div className="font-mono text-xs text-dl-muted">{ASSET_CLASS_LABELS[s.asset_class]} · {s.status?.toUpperCase()}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{fmtCurrency(s.current_nav || s.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{s.holder_count}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{s.active_listings}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{s.pending_bids}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono text-sm ${parseInt(s.pending_approvals) > 0 ? 'text-amber-600' : 'text-dl-muted'}`}>{s.pending_approvals}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {s.score_label ? <span className={s.score_label === 'High' ? 'text-dl-forest' : s.score_label === 'Low' ? 'text-dl-error' : 'text-amber-600'}>{s.score_label} ({parseFloat(s.liquidity_score || '0').toFixed(0)})</span> : <span className="text-dl-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && tab === 'approvals' && (
        <>
          {resolveResult && <div className={`mb-4 p-3 border font-mono text-sm ${resolveResult.startsWith('Error') ? 'border-dl-error text-dl-error' : 'border-dl-forest text-dl-forest'}`}>{resolveResult}</div>}
          {approvals.length === 0 ? (
            <div className="border border-gray-200 p-8 text-center">
              <p className="font-mono text-sm text-dl-muted">No pending approvals.</p>
            </div>
          ) : approvals.map(ap => (
            <div key={ap.id} className="border border-gray-200 p-5 mb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-serif text-base text-dl-navy">{ap.series_name}</div>
                  <div className="font-mono text-xs text-dl-muted">{ap.approval_type.replace(/_/g, ' ')} · Requested {fmtDate(ap.requested_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-dl-navy">{ap.units_requested ? parseFloat(ap.units_requested).toFixed(2) : '—'} units</div>
                  {ap.gross_amount && <div className="font-mono text-xs text-dl-muted">{fmtCurrency(ap.gross_amount)}</div>}
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <select
                  value={approvalDecision[ap.id]?.decision || ''}
                  onChange={e => setApprovalDecision(prev => ({ ...prev, [ap.id]: { ...prev[ap.id], decision: e.target.value } }))}
                  className="border border-gray-300 p-2 text-sm font-mono"
                >
                  <option value="">Decision</option>
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
                <input type="text" placeholder="Reason (optional)"
                  value={approvalDecision[ap.id]?.reason || ''}
                  onChange={e => setApprovalDecision(prev => ({ ...prev, [ap.id]: { ...prev[ap.id], reason: e.target.value } }))}
                  className="flex-1 border border-gray-300 p-2 text-sm font-mono" />
                <button
                  onClick={() => handleResolveApproval(ap.id)}
                  disabled={!approvalDecision[ap.id]?.decision || resolving === ap.id}
                  className="px-4 py-2 bg-dl-navy text-white text-sm font-mono disabled:opacity-50"
                >
                  {resolving === ap.id ? 'Processing...' : 'Submit'}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {!loading && !error && tab === 'nav' && (
        <div className="max-w-lg">
          <h2 className="font-serif text-lg text-dl-navy mb-4">Post NAV Mark</h2>
          <div className="space-y-4">
            <div>
              <label className="font-mono text-xs text-dl-muted block mb-1">Series</label>
              <select value={navForm.seriesId} onChange={e => setNavForm(v => ({ ...v, seriesId: e.target.value }))}
                className="w-full border border-gray-300 p-2 text-sm font-mono">
                <option value="">Select series</option>
                {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-xs text-dl-muted block mb-1">NAV per Unit (AXUSD)</label>
              <input type="number" step="0.01" value={navForm.navPerUnit}
                onChange={e => setNavForm(v => ({ ...v, navPerUnit: e.target.value }))}
                className="w-full border border-gray-300 p-2 text-sm font-mono" />
            </div>
            <div>
              <label className="font-mono text-xs text-dl-muted block mb-1">Valuation Method</label>
              <select value={navForm.methodUsed} onChange={e => setNavForm(v => ({ ...v, methodUsed: e.target.value }))}
                className="w-full border border-gray-300 p-2 text-sm font-mono">
                {NAV_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-xs text-dl-muted block mb-1">Notes</label>
              <textarea value={navForm.notes} onChange={e => setNavForm(v => ({ ...v, notes: e.target.value }))}
                className="w-full border border-gray-300 p-2 text-sm font-mono" rows={2} />
            </div>
            <button onClick={handleNavMark} disabled={!navForm.seriesId || !navForm.navPerUnit}
              className="px-6 py-2 bg-dl-navy text-white text-sm font-mono disabled:opacity-50">
              Post NAV Mark
            </button>
            {navResult && <p className={`font-mono text-sm ${navResult.startsWith('Error') ? 'text-dl-error' : 'text-dl-forest'}`}>{navResult}</p>}
          </div>
        </div>
      )}

      {!loading && !error && tab === 'registry' && (
        <div>
          <h2 className="font-serif text-lg text-dl-navy mb-4">Beneficial Ownership Registry</h2>
          <div className="flex gap-3 mb-6">
            <select value={registrySeriesId} onChange={e => setRegistrySeriesId(e.target.value)}
              className="border border-gray-300 p-2 text-sm font-mono flex-1">
              <option value="">Select series</option>
              {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={handleLoadRegistry} disabled={!registrySeriesId}
              className="px-4 py-2 bg-dl-navy text-white text-sm font-mono disabled:opacity-50">
              Load Registry
            </button>
          </div>
          {registry.length > 0 && (
            <div className="border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Investor</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Category</th>
                    <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Units</th>
                    <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Ownership %</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Effective Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registry.map((r: any) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <div className="text-dl-navy">{r.legal_name || r.email}</div>
                        <div className="font-mono text-xs text-dl-muted">{r.wallet_address ? `${r.wallet_address.slice(0, 8)}...` : '—'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-dl-muted">{r.investor_category?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{parseFloat(r.units).toFixed(4)}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">
                        {r.ownership_percent ? `${(parseFloat(r.ownership_percent) * 100).toFixed(4)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-dl-muted">{fmtDate(r.effective_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DesignLawLayout>
  );
}
