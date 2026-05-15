import type { NextPage } from 'next';
import { useState, useEffect, useCallback } from 'react';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { getAllCampaigns } from '../../../lib/sui/campaignRegistry';

// =============================================================================
// Operator Control Console — Sui Phase 10
//
// Read-only command center: campaign status, package state, proof metrics,
// RPC health, accepted risk deadlines, wallet custody, system alerts.
//
// Community distribution only. NOT AXUSD, AXAU, AXM, SEED, or KAG.
// =============================================================================

const PACKAGE_ID    = '0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487';
const CAMPAIGN_ID   = '0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982';
const ADMIN_CAP_ID  = '0x637ce7868be3f24f85968629debbee72490406147ffa756f3324fb5acb945f9a';
const ADMIN_WALLET  = '0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad';

interface HealthData {
  overallStatus?: string;
  mainnet?: { status: string; latencyMs: number };
  testnet?: { status: string; latencyMs: number };
  campaigns?: Array<{ id: string; healthLabel: string; isActive: boolean; poolValueRaw: string; integrityStatus: string }>;
  systemHealth?: string;
  integrity?: { overallStatus: string; passedChecks: number; totalChecks: number };
  claims?: { recentCount: number; anomalyCount: number; highSeverityAnomalies: number };
  proofRequests?: { totalRequests: number; successRate: number; abuseAlerts: number };
  walletRisk?: { totalTracked: number; highRisk: number; blocked: number };
  errors?: string[];
  generatedAt?: string;
  error?: string;
}

const statusBadge = (s: string | undefined) => {
  const color = s === 'HEALTHY' || s === 'OK' ? 'text-green-400'
    : s === 'DEGRADED' || s === 'WARNING' ? 'text-yellow-400'
    : s === 'CRITICAL' || s === 'DOWN' ? 'text-red-400'
    : 'text-dl-muted';
  return <span className={`font-mono text-xs ${color}`}>{s ?? '—'}</span>;
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between border-b border-dl-border/40 py-2">
    <span className="font-mono text-xs text-dl-muted uppercase tracking-wide">{label}</span>
    <span className="font-mono text-xs text-dl-fg text-right max-w-xs break-all">{value}</span>
  </div>
);

const SuiOpsPage: NextPage = () => {
  const campaigns = getAllCampaigns();
  const [rpcData, setRpcData] = useState<HealthData | null>(null);
  const [monData, setMonData] = useState<HealthData | null>(null);
  const [camData, setCamData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rpc, mon, cam] = await Promise.all([
        fetch('/api/health/sui-rpc').then((r) => r.json()),
        fetch('/api/health/sui-monitoring').then((r) => r.json()),
        fetch('/api/health/sui-campaigns').then((r) => r.json()),
      ]);
      setRpcData(rpc);
      setMonData(mon);
      setCamData(cam);
      setCheckedAt(new Date().toISOString());
    } catch {
      // retain previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const overallHealth = monData?.systemHealth ?? rpcData?.overallStatus ?? null;
  const bannerClass = overallHealth === 'HEALTHY'
    ? 'border-green-700 bg-green-950/10'
    : overallHealth === 'DEGRADED'
    ? 'border-yellow-700 bg-yellow-950/10'
    : 'border-red-700 bg-red-950/10';

  return (
    <OperatorConsoleLayout>
      <div className="max-w-5xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-dl-heading">Sui Ops Console</h1>
            <p className="font-mono text-xs text-dl-muted mt-1">
              Phase 10 · Read-Only Control Center · AMC community distribution
            </p>
            {checkedAt && <p className="font-mono text-xs text-dl-muted mt-1">Checked: {checkedAt}</p>}
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="border border-dl-border px-4 py-2 font-mono text-xs text-dl-fg hover:bg-dl-surface disabled:opacity-40"
          >
            {loading ? 'Refreshing...' : 'Refresh All'}
          </button>
        </div>

        {/* System Health */}
        <div className={`border px-5 py-3 mb-6 ${bannerClass}`}>
          <span className="font-mono text-xs uppercase tracking-widest mr-4">System Health</span>
          {statusBadge(overallHealth ?? undefined)}
          {monData?.errors && monData.errors.length > 0 && (
            <p className="font-mono text-xs text-red-400 mt-1">{monData.errors.join(' · ')}</p>
          )}
        </div>

        {/* Package State */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Package State</h2>
          <Row label="Package ID" value={PACKAGE_ID} />
          <Row label="Upgrade policy" value={<span className="text-green-400">IMMUTABLE</span>} />
          <Row label="Network" value="Sui Mainnet" />
          <Row label="Modules" value="axiom_mainnet_claim · claim_campaign · guarded_treasury · merkle" />
          <Row label="Published" value="2026-05-15" />
        </section>

        {/* Campaign Status */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Campaign Status</h2>
          {campaigns.map((c) => {
            const liveCam = camData?.campaigns?.find((x) => x.id === c.id);
            return (
              <div key={c.id} className="mb-4">
                <p className="font-mono text-xs text-dl-muted uppercase mb-2">{c.label}</p>
                <Row label="Object ID" value={c.campaignObjectId || '—'} />
                <Row label="Registry status" value={
                  <span className={c.isActive ? 'text-green-400' : c.isClosed ? 'text-dl-muted' : 'text-yellow-400'}>
                    {c.status.toUpperCase()}
                  </span>
                } />
                <Row label="Pool balance (registry)" value={`${Number(c.poolBalance).toLocaleString()} base units`} />
                <Row label="Claimed / Eligible" value={`${c.totalClaimed} / ${c.eligibilityList?.length ?? 0}`} />
                {liveCam && <>
                  <Row label="On-chain health" value={statusBadge(liveCam.healthLabel)} />
                  <Row label="On-chain pool" value={`${Number(liveCam.poolValueRaw || 0).toLocaleString()} base units`} />
                  <Row label="Integrity" value={statusBadge(liveCam.integrityStatus)} />
                </>}
              </div>
            );
          })}
        </section>

        {/* Proof + Claim Metrics */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Proof & Claim Metrics</h2>
          {monData ? (
            <>
              <Row label="Proof requests (1h)" value={monData.proofRequests?.totalRequests ?? '—'} />
              <Row label="Proof success rate" value={`${monData.proofRequests?.successRate ?? '—'}%`} />
              <Row label="Abuse alerts" value={monData.proofRequests?.abuseAlerts ?? '—'} />
              <Row label="Recent claims (window)" value={monData.claims?.recentCount ?? '—'} />
              <Row label="Anomalies detected" value={monData.claims?.anomalyCount ?? '—'} />
              <Row label="High-severity anomalies" value={monData.claims?.highSeverityAnomalies ?? '—'} />
            </>
          ) : (
            <p className="font-mono text-xs text-dl-muted">Load data by clicking Refresh</p>
          )}
        </section>

        {/* RPC Health */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">RPC Health</h2>
          {rpcData ? (
            <>
              <Row label="Mainnet status" value={statusBadge(rpcData.mainnet?.status)} />
              <Row label="Mainnet latency" value={rpcData.mainnet?.latencyMs != null ? `${rpcData.mainnet.latencyMs}ms` : '—'} />
              <Row label="Testnet status" value={statusBadge(rpcData.testnet?.status)} />
              <Row label="Testnet latency" value={rpcData.testnet?.latencyMs != null ? `${rpcData.testnet.latencyMs}ms` : '—'} />
            </>
          ) : (
            <p className="font-mono text-xs text-dl-muted">Load data by clicking Refresh</p>
          )}
        </section>

        {/* Wallet Custody */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Wallet Custody State</h2>
          <Row label="AdminCap holder" value={ADMIN_WALLET} />
          <Row label="AdminCap object" value={ADMIN_CAP_ID} />
          <Row label="Custody model" value={<span className="text-yellow-400">Single wallet (temporary)</span>} />
          <Row label="Multisig migration" value={<span className="text-yellow-400">Planned — deadline 2026-06-14</span>} />
          <Row label="Wallets tracked" value={monData?.walletRisk?.totalTracked ?? '—'} />
          <Row label="High-risk wallets" value={monData?.walletRisk?.highRisk ?? '—'} />
          <Row label="Blocked wallets" value={monData?.walletRisk?.blocked ?? '—'} />
        </section>

        {/* Accepted Risk Deadlines */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Accepted Risk Deadlines</h2>
          <table className="w-full font-mono border-collapse">
            <thead>
              <tr className="border-b border-dl-border">
                {['Risk', 'Severity', 'Deadline', 'Status'].map((h) => (
                  <th key={h} className="text-left text-xs text-dl-muted uppercase py-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-dl-border/40">
                <td className="py-2 pr-4 text-xs text-dl-fg">External Move audit</td>
                <td className="py-2 pr-4 text-xs text-yellow-400">MEDIUM</td>
                <td className="py-2 pr-4 text-xs text-dl-muted">2026-07-14</td>
                <td className="py-2 pr-4 text-xs text-yellow-400">DEFERRED</td>
              </tr>
              <tr className="border-b border-dl-border/40">
                <td className="py-2 pr-4 text-xs text-dl-fg">AdminCap multisig migration</td>
                <td className="py-2 pr-4 text-xs text-yellow-400">MEDIUM</td>
                <td className="py-2 pr-4 text-xs text-dl-muted">2026-06-14</td>
                <td className="py-2 pr-4 text-xs text-yellow-400">DEFERRED</td>
              </tr>
              <tr className="border-b border-dl-border/40">
                <td className="py-2 pr-4 text-xs text-dl-fg">Single-party authorization review</td>
                <td className="py-2 pr-4 text-xs text-dl-muted">LOW</td>
                <td className="py-2 pr-4 text-xs text-dl-muted">2026-08-13</td>
                <td className="py-2 pr-4 text-xs text-yellow-400">OPEN</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Incident Checklist */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Emergency Controls</h2>
          <p className="font-mono text-xs text-dl-muted mb-4">
            All controls require AdminCap. Execute via Sui CLI using SUI_DEPLOYER_KEY.
          </p>
          <div className="space-y-3">
            {[
              { label: 'Pause campaign', cmd: `sui client call --package ${PACKAGE_ID} --module claim_campaign --function pause --args ${CAMPAIGN_ID} ${ADMIN_CAP_ID} --gas-budget 10000000` },
              { label: 'Unpause campaign', cmd: `sui client call --package ${PACKAGE_ID} --module claim_campaign --function unpause --args ${CAMPAIGN_ID} ${ADMIN_CAP_ID} --gas-budget 10000000` },
              { label: 'Close campaign', cmd: `sui client call --package ${PACKAGE_ID} --module claim_campaign --function close_campaign --args ${CAMPAIGN_ID} ${ADMIN_CAP_ID} --gas-budget 10000000` },
            ].map(({ label, cmd }) => (
              <div key={label} className="border border-dl-border/40 p-3">
                <p className="font-mono text-xs text-dl-muted uppercase mb-1">{label}</p>
                <pre className="font-mono text-xs text-dl-fg break-all whitespace-pre-wrap">{cmd}</pre>
              </div>
            ))}
          </div>
        </section>

        {/* Governance Documents */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Governance Documents</h2>
          <div className="space-y-1 font-mono text-xs text-dl-muted">
            {[
              'AXIOM_SUI_PHASE10_ACCEPTED_RISK_REGISTER.md',
              'AXIOM_SUI_PHASE10_CUSTODY_EXCEPTION.md',
              'AXIOM_SUI_PHASE10_AUDIT_DEFERRAL_MEMO.md',
              'AXIOM_SUI_INCIDENT_RESPONSE_PLAN.md',
              'AXIOM_SUI_EMERGENCY_OPERATIONS_RUNBOOK.md',
              'AXIOM_SUI_SUPPORT_PLAYBOOK.md',
              'AXIOM_SUI_FAQ.md',
              'AXIOM_SUI_PHASE10_OPERATIONS_MANUAL.md',
            ].map((doc) => (
              <p key={doc}><span className="text-dl-fg">documents/chains/</span>{doc}</p>
            ))}
          </div>
        </section>

        <p className="font-mono text-xs text-dl-muted border-t border-dl-border pt-4">
          Axiom Protocol · Sui Phase 10 Ops · Community distribution only — NOT AXUSD, AXAU, AXM
        </p>
      </div>
    </OperatorConsoleLayout>
  );
};

export default SuiOpsPage;
