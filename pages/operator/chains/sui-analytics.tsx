import type { NextPage } from 'next';
import { useState, useEffect, useCallback } from 'react';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { getAllCampaigns } from '../../../lib/sui/campaignRegistry';

// =============================================================================
// Operator Console — Sui Analytics Dashboard (Phase 10)
//
// Displays live claim metrics, proof telemetry, RPC health, and risk summary.
// Community distribution only. NOT AXUSD, AXAU, AXM, SEED, or KAG.
// =============================================================================

interface MonitoringSnapshot {
  systemHealth: string;
  rpc: { mainnet: { status: string; latencyMs: number | null }; testnet: { status: string; latencyMs: number | null } };
  campaign: { label: string; isActive: boolean | null; isClosed: boolean | null; poolValueRaw: string | null; healthLabel: string };
  integrity: { overallStatus: string; passedChecks: number; totalChecks: number };
  claims: { recentCount: number; hasMore: boolean; anomalyCount: number; highSeverityAnomalies: number };
  proofRequests: { totalRequests: number; successRate: number; abuseAlerts: number };
  walletRisk: { totalTracked: number; highRisk: number; blocked: number };
  generatedAt: string;
  errors: string[];
}

const healthColor = (s: string | null | undefined) => {
  if (s === 'HEALTHY' || s === 'OK') return 'text-green-400';
  if (s === 'DEGRADED' || s === 'WARNING') return 'text-yellow-400';
  if (s === 'CRITICAL' || s === 'DOWN') return 'text-red-400';
  return 'text-dl-muted';
};

const Metric = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="border border-dl-border p-4">
    <p className="font-mono text-xs text-dl-muted uppercase tracking-widest mb-1">{label}</p>
    <p className="font-mono text-2xl text-dl-fg">{value}</p>
    {sub && <p className="font-mono text-xs text-dl-muted mt-1">{sub}</p>}
  </div>
);

const SuiAnalyticsPage: NextPage = () => {
  const campaigns = getAllCampaigns();
  const [snap, setSnap] = useState<MonitoringSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health/sui-monitoring');
      const data: MonitoringSnapshot = await res.json();
      setSnap(data);
      setLastRefresh(new Date().toISOString());
    } catch {
      // retain previous snapshot
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  const totalEligible = campaigns.reduce((s, c) => s + (c.eligibilityList?.length ?? 0), 0);
  const totalClaimed = campaigns.reduce((s, c) => s + c.totalClaimed, 0);
  const totalDistributed = campaigns.reduce((s, c) => s + c.totalClaimed * Number(c.amountPerClaim), 0);
  const totalPool = campaigns.reduce((s, c) => s + Number(c.poolBalance), 0);
  const activeCampaigns = campaigns.filter((c) => c.isActive).length;
  const closedCampaigns = campaigns.filter((c) => c.isClosed).length;

  return (
    <OperatorConsoleLayout>
      <div className="max-w-6xl">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="font-serif text-3xl text-dl-heading">Sui Analytics Dashboard</h1>
            <p className="font-mono text-xs text-dl-muted mt-1">
              Phase 10 · Community Distribution · AMC only
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 font-mono text-xs text-dl-muted cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-green-500"
              />
              Auto 30s
            </label>
            <button
              onClick={refresh}
              disabled={loading}
              className="border border-dl-border px-4 py-2 font-mono text-xs text-dl-fg hover:bg-dl-surface disabled:opacity-40"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        {lastRefresh && (
          <p className="font-mono text-xs text-dl-muted mb-8">
            Last refresh: {lastRefresh}
          </p>
        )}

        {/* System Health Banner */}
        {snap && (
          <div className={`border px-5 py-3 mb-6 ${
            snap.systemHealth === 'HEALTHY' ? 'border-green-700 bg-green-950/10'
            : snap.systemHealth === 'DEGRADED' ? 'border-yellow-700 bg-yellow-950/10'
            : 'border-red-700 bg-red-950/10'
          }`}>
            <span className="font-mono text-xs uppercase tracking-widest mr-4">System Health</span>
            <span className={`font-mono text-sm font-bold ${healthColor(snap.systemHealth)}`}>
              {snap.systemHealth}
            </span>
            {snap.errors.length > 0 && (
              <p className="font-mono text-xs text-red-400 mt-1">{snap.errors.join(' · ')}</p>
            )}
          </div>
        )}

        {/* Registry Summary */}
        <section className="mb-8">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Campaign Registry</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Metric label="Total Campaigns" value={campaigns.length} />
            <Metric label="Active" value={activeCampaigns} />
            <Metric label="Closed" value={closedCampaigns} />
            <Metric label="Eligible Wallets" value={totalEligible} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Metric label="Total Claimed" value={totalClaimed} sub="wallets" />
            <Metric label="AMC Distributed" value={totalDistributed.toLocaleString()} sub="base units" />
            <Metric label="Pool Remaining" value={totalPool.toLocaleString()} sub="base units" />
          </div>
        </section>

        {/* Per-Campaign Table */}
        <section className="mb-8">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Per-Campaign Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono border-collapse">
              <thead>
                <tr className="border-b border-dl-border">
                  {['Campaign', 'Network', 'Status', 'Eligible', 'Claimed', 'Pool (base)', 'Claim Rate'].map((h) => (
                    <th key={h} className="text-left text-xs text-dl-muted uppercase py-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const eligCount = c.eligibilityList?.length ?? 0;
                  const rate = eligCount > 0
                    ? Math.round((c.totalClaimed / eligCount) * 100)
                    : 0;
                  return (
                    <tr key={c.id} className="border-b border-dl-border/40">
                      <td className="py-2 pr-4 text-dl-fg text-xs">{c.label}</td>
                      <td className="py-2 pr-4 text-dl-muted text-xs uppercase">{c.network}</td>
                      <td className={`py-2 pr-4 text-xs ${
                        c.isActive ? 'text-green-400'
                        : c.isClosed ? 'text-dl-muted'
                        : 'text-yellow-400'
                      }`}>
                        {c.status.toUpperCase()}
                      </td>
                      <td className="py-2 pr-4 text-dl-fg">{c.eligibilityList?.length ?? 0}</td>
                      <td className="py-2 pr-4 text-dl-fg">{c.totalClaimed}</td>
                      <td className="py-2 pr-4 text-dl-fg">{Number(c.poolBalance).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-dl-fg">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Live Telemetry */}
        {snap ? (
          <>
            <section className="mb-8">
              <h2 className="font-serif text-xl text-dl-heading mb-4">Live Telemetry</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Metric label="Recent Claims" value={snap.claims.recentCount} sub={snap.claims.hasMore ? 'has more' : 'complete window'} />
                <Metric label="Anomalies" value={snap.claims.anomalyCount} sub={`${snap.claims.highSeverityAnomalies} high severity`} />
                <Metric label="Proof Requests" value={snap.proofRequests.totalRequests} sub="last hour" />
                <Metric label="Proof Success" value={`${snap.proofRequests.successRate}%`} sub="approval rate" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Metric label="Abuse Alerts" value={snap.proofRequests.abuseAlerts} />
                <Metric label="Wallets Tracked" value={snap.walletRisk.totalTracked} />
                <Metric label="High-Risk Wallets" value={snap.walletRisk.highRisk} />
                <Metric label="Blocked Wallets" value={snap.walletRisk.blocked} />
              </div>
            </section>

            <section className="mb-8">
              <h2 className="font-serif text-xl text-dl-heading mb-4">Campaign Integrity</h2>
              <div className="border border-dl-border p-5">
                <div className="flex items-center gap-4 mb-3">
                  <span className="font-mono text-xs text-dl-muted uppercase">Status</span>
                  <span className={`font-mono text-sm ${healthColor(snap.integrity.overallStatus)}`}>
                    {snap.integrity.overallStatus}
                  </span>
                  <span className="font-mono text-xs text-dl-muted">
                    {snap.integrity.passedChecks}/{snap.integrity.totalChecks} checks passed
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-dl-muted uppercase">Campaign</span>
                  <span className={`font-mono text-xs ${healthColor(snap.campaign.healthLabel)}`}>
                    {snap.campaign.healthLabel}
                  </span>
                  <span className="font-mono text-xs text-dl-muted">
                    Pool: {snap.campaign.poolValueRaw != null ? Number(snap.campaign.poolValueRaw).toLocaleString() : '—'} base units
                  </span>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="font-serif text-xl text-dl-heading mb-4">RPC Health</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['mainnet', 'testnet'] as const).map((net) => (
                  <div key={net} className="border border-dl-border p-4">
                    <p className="font-mono text-xs text-dl-muted uppercase tracking-widest mb-2">{net}</p>
                    <p className={`font-mono text-lg ${healthColor(snap.rpc[net].status)}`}>
                      {snap.rpc[net].status ?? '—'}
                    </p>
                    <p className="font-mono text-xs text-dl-muted mt-1">
                      {snap.rpc[net].latencyMs != null ? `${snap.rpc[net].latencyMs}ms` : 'No latency data'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="border border-dl-border p-6 text-center font-mono text-xs text-dl-muted">
            {loading ? 'Loading telemetry...' : 'Click Refresh to load live telemetry'}
          </div>
        )}

        {/* Accepted Risk Status */}
        <section className="mb-8">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Accepted Risk Status</h2>
          <table className="w-full text-sm font-mono border-collapse">
            <thead>
              <tr className="border-b border-dl-border">
                {['Risk', 'Severity', 'Status', 'Deadline'].map((h) => (
                  <th key={h} className="text-left text-xs text-dl-muted uppercase py-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-dl-border/40">
                <td className="py-2 pr-4 text-dl-fg text-xs">External Move security audit</td>
                <td className="py-2 pr-4 text-yellow-400 text-xs">MEDIUM</td>
                <td className="py-2 pr-4 text-yellow-400 text-xs">DEFERRED</td>
                <td className="py-2 pr-4 text-dl-muted text-xs">2026-07-14</td>
              </tr>
              <tr className="border-b border-dl-border/40">
                <td className="py-2 pr-4 text-dl-fg text-xs">AdminCap single-wallet custody</td>
                <td className="py-2 pr-4 text-yellow-400 text-xs">MEDIUM</td>
                <td className="py-2 pr-4 text-yellow-400 text-xs">DEFERRED</td>
                <td className="py-2 pr-4 text-dl-muted text-xs">2026-06-14</td>
              </tr>
              <tr className="border-b border-dl-border/40">
                <td className="py-2 pr-4 text-dl-fg text-xs">Single-party authorization</td>
                <td className="py-2 pr-4 text-dl-muted text-xs">LOW</td>
                <td className="py-2 pr-4 text-yellow-400 text-xs">OPEN</td>
                <td className="py-2 pr-4 text-dl-muted text-xs">2026-08-13</td>
              </tr>
            </tbody>
          </table>
        </section>

        <p className="font-mono text-xs text-dl-muted border-t border-dl-border pt-4">
          Axiom Protocol · Sui Phase 10 Analytics · Community distribution only — NOT AXUSD, AXAU, AXM, SEED, or KAG
        </p>
      </div>
    </OperatorConsoleLayout>
  );
};

export default SuiAnalyticsPage;
