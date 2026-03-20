import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { useWallet } from '../../components/WalletConnect/WalletContext';

interface AdminDashboard {
  flaggedTrades: any[];
  approvalSummary: {
    total: string;
    issuer_pending: string;
    compliance_pending: string;
    admin_pending: string;
  };
  recentSettlements: any[];
  liquidityRiskSeries: any[];
}

interface InvestorStats {
  total_investors: string;
  active: string;
  pending: string;
  suspended: string;
}

interface ComplianceFlag {
  id: string;
  investor_id: string;
  email: string;
  legal_name: string | null;
  aml_status: string;
  sanctions_status: string;
  risk_tier: string;
  updated_at: string;
}

interface AuditEntry {
  id: string;
  actor_type: string;
  object_type: string;
  object_id: string;
  action: string;
  occurred_at: string;
}

const SETTLEMENT_STATUS_COLORS: Record<string, string> = {
  settled: 'text-dl-forest',
  settlement_pending: 'text-amber-600',
  instruction_created: 'text-amber-600',
  failed: 'text-dl-error',
  cancelled: 'text-dl-muted',
};

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

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminConsole() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [investorStats, setInvestorStats] = useState<InvestorStats | null>(null);
  const [complianceFlags, setComplianceFlags] = useState<ComplianceFlag[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'approvals' | 'compliance' | 'settlements' | 'audit'>('overview');
  const [approvalDecision, setApprovalDecision] = useState<Record<string, { decision: string; reason: string; isOverride: boolean }>>({});
  const [resolving, setResolving] = useState('');
  const [resolveResult, setResolveResult] = useState('');

  const { siweState } = useWallet();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/secondary/admin/dashboard');
      if (!res.ok) { setError('Access denied. Admin role required.'); setLoading(false); return; }
      const data = await res.json();
      if (data.success) {
        setDashboard(data.dashboard);
        setInvestorStats(data.investorStats);
        setComplianceFlags(data.complianceFlags || []);
        setRecentAudit(data.recentAudit || []);
      }
    } catch { setError('Failed to load admin data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (siweState.isAuthenticated) load(); }, [siweState.isAuthenticated, load]);

  async function handleApproval(approvalRequestId: string) {
    const form = approvalDecision[approvalRequestId];
    if (!form?.decision) return;
    if (form.isOverride && !form.reason) { alert('Override requires a written reason.'); return; }
    setResolving(approvalRequestId);
    try {
      const res = await fetch('/api/secondary/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalRequestId, decision: form.decision, reason: form.reason, isOverride: form.isOverride }),
      });
      const data = await res.json();
      setResolveResult(data.success ? `${form.isOverride ? 'Override' : 'Approval'} recorded: ${form.decision}` : `Error: ${data.error}`);
    } catch (err: any) { setResolveResult(`Error: ${err.message}`); }
    finally { setResolving(''); }
  }

  return (
    <DesignLawLayout>
      <Head><title>Secondary Network Admin | Axiom Protocol</title></Head>

      <div className="border-b border-gray-200 pb-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-dl-navy">Secondary Network Admin</h1>
            <p className="text-sm text-dl-muted mt-1">System-wide transfer oversight, compliance monitoring, and settlement management</p>
          </div>
          <div className="flex gap-3">
            <Link href="/secondary/issuer"><button className="text-xs font-mono text-dl-muted hover:text-dl-navy">Issuer Console</button></Link>
            <Link href="/secondary"><button className="text-xs font-mono text-dl-muted hover:text-dl-navy">← Portfolio</button></Link>
          </div>
        </div>

        <div className="flex gap-6 mt-6">
          {(['overview', 'approvals', 'compliance', 'settlements', 'audit'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`font-mono text-sm pb-2 border-b-2 ${tab === t ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-muted hover:text-dl-navy'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="font-mono text-sm text-dl-muted">Loading admin dashboard...</div>}
      {error && <div className="border border-dl-error bg-red-50 p-4 font-mono text-sm text-dl-error">{error}</div>}

      {!loading && !error && tab === 'overview' && (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="border border-gray-200 p-4">
              <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Total Investors</div>
              <div className="font-mono text-2xl text-dl-navy">{investorStats?.total_investors || '—'}</div>
              <div className="font-mono text-xs text-dl-muted">{investorStats?.active} active · {investorStats?.pending} pending</div>
            </div>
            <div className="border border-gray-200 p-4">
              <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Pending Approvals</div>
              <div className={`font-mono text-2xl ${parseInt(dashboard?.approvalSummary?.total || '0') > 0 ? 'text-amber-600' : 'text-dl-navy'}`}>
                {dashboard?.approvalSummary?.total || '0'}
              </div>
              <div className="font-mono text-xs text-dl-muted">{dashboard?.approvalSummary?.issuer_pending} issuer · {dashboard?.approvalSummary?.compliance_pending} compliance</div>
            </div>
            <div className="border border-gray-200 p-4">
              <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Compliance Flags</div>
              <div className={`font-mono text-2xl ${complianceFlags.length > 0 ? 'text-dl-error' : 'text-dl-navy'}`}>{complianceFlags.length}</div>
            </div>
            <div className="border border-gray-200 p-4">
              <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Liquidity Risk Series</div>
              <div className={`font-mono text-2xl ${(dashboard?.liquidityRiskSeries?.length || 0) > 0 ? 'text-amber-600' : 'text-dl-navy'}`}>
                {dashboard?.liquidityRiskSeries?.length || 0}
              </div>
            </div>
          </div>

          {/* Flagged trades */}
          {dashboard?.flaggedTrades && dashboard.flaggedTrades.length > 0 && (
            <div className="mb-8">
              <h2 className="font-serif text-lg text-dl-navy mb-3">Awaiting Action</h2>
              <div className="border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Series</th>
                      <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Units</th>
                      <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Matched</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dashboard.flaggedTrades.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-dl-navy">{t.series_name}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{parseFloat(t.units_requested || '0').toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-amber-600">{t.status?.replace(/_/g, ' ')?.toUpperCase()}</td>
                        <td className="px-4 py-3 font-mono text-xs text-dl-muted">{fmtDate(t.matched_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Liquidity risk */}
          {dashboard?.liquidityRiskSeries && dashboard.liquidityRiskSeries.length > 0 && (
            <div>
              <h2 className="font-serif text-lg text-dl-navy mb-3">Low Liquidity Series</h2>
              <div className="border border-gray-200 p-4 space-y-2">
                {dashboard.liquidityRiskSeries.map((s: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-dl-navy">{s.name}</span>
                    <span className="font-mono text-xs text-dl-error">{s.score_label || 'Unscored'} {s.score ? `(${parseFloat(s.score).toFixed(0)})` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !error && tab === 'approvals' && (
        <div>
          {resolveResult && (
            <div className={`mb-4 p-3 border font-mono text-sm ${resolveResult.startsWith('Error') ? 'border-dl-error text-dl-error' : 'border-dl-forest text-dl-forest'}`}>{resolveResult}</div>
          )}
          <div className="space-y-4">
            {/* Admin can load approvals via /api/secondary/approvals?GET */}
            <div className="border border-gray-200 p-6 text-center">
              <p className="font-mono text-sm text-dl-muted">Approval management for admin. Use the Issuer Console to action pending issuer approvals. Admin override requires a written reason.</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'compliance' && (
        <div>
          <h2 className="font-serif text-lg text-dl-navy mb-4">Flagged Investors ({complianceFlags.length})</h2>
          {complianceFlags.length === 0 ? (
            <div className="border border-gray-200 p-8 text-center">
              <p className="font-mono text-sm text-dl-muted">No compliance flags. All investors are clear.</p>
            </div>
          ) : (
            <div className="border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Investor</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">AML</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Sanctions</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Risk Tier</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {complianceFlags.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-dl-navy">{f.legal_name || f.email}</div>
                        <div className="font-mono text-xs text-dl-muted">{f.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-amber-600">{f.aml_status?.toUpperCase()}</td>
                      <td className="px-4 py-3 font-mono text-xs text-amber-600">{f.sanctions_status?.toUpperCase()}</td>
                      <td className="px-4 py-3 font-mono text-xs text-dl-muted">{f.risk_tier?.toUpperCase()}</td>
                      <td className="px-4 py-3 font-mono text-xs text-dl-muted">{fmtDate(f.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && !error && tab === 'settlements' && (
        <div>
          <h2 className="font-serif text-lg text-dl-navy mb-4">Recent Settlements</h2>
          {dashboard?.recentSettlements && dashboard.recentSettlements.length === 0 ? (
            <div className="border border-gray-200 p-8 text-center">
              <p className="font-mono text-sm text-dl-muted">No settlement records found.</p>
            </div>
          ) : (
            <div className="border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Series</th>
                    <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Gross Amount</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Settlement Asset</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(dashboard?.recentSettlements || []).map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-dl-navy">{s.series_name}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{fmtCurrency(s.gross_amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-xs ${SETTLEMENT_STATUS_COLORS[s.status] || 'text-dl-muted'}`}>
                          {s.status?.replace(/_/g, ' ')?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-dl-muted">{s.settlement_asset?.toUpperCase()}</td>
                      <td className="px-4 py-3 font-mono text-xs text-dl-muted">{fmtDate(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && !error && tab === 'audit' && (
        <div>
          <h2 className="font-serif text-lg text-dl-navy mb-4">Audit Trail (Recent 20)</h2>
          <div className="border border-gray-200">
            {recentAudit.length === 0 ? (
              <div className="p-8 text-center font-mono text-sm text-dl-muted">No audit records.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">When</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Actor</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Object</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentAudit.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-dl-muted">{fmtDateTime(a.occurred_at)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-dl-muted">{a.actor_type}</td>
                      <td className="px-4 py-2 font-mono text-xs text-dl-navy">{a.object_type} / {a.object_id.slice(0, 8)}…</td>
                      <td className="px-4 py-2 font-mono text-xs text-dl-muted">{a.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </DesignLawLayout>
  );
}
