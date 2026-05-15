import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { getAllCampaigns } from '../../../lib/sui/campaignRegistry';

// =============================================================================
// Operator Console — Sui Phase 9 Production Dashboard
//
// Read-only production monitoring console for the Axiom Protocol
// Sui community distribution layer (Phase 9 mainnet release candidate).
//
// Community distribution only. NOT AXUSD, AXAU, AXM, SEED, or KAG.
// =============================================================================

const DEPLOYER_ADDRESS  = '0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad';
const MAINNET_PACKAGE   = '0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487';
const CAMPAIGN_OBJECT   = '0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982';
const ADMIN_CAP_OBJECT  = '0x637ce7868be3f24f85968629debbee72490406147ffa756f3324fb5acb945f9a';
const PUBLISH_TX        = 'Hw4xfYPodku9qpJHVZNuWPFj8RkRre9KirBeUUgBEe6c';
const TESTNET_PACKAGE   = '0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602';

interface RpcHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | null;
  latencyMs: number | null;
}

const SuiPhase9Page: NextPage = () => {
  const campaigns = getAllCampaigns();
  const [rpcHealth, setRpcHealth] = useState<{ mainnet: RpcHealth; testnet: RpcHealth }>({
    mainnet: { status: null, latencyMs: null },
    testnet: { status: null, latencyMs: null },
  });
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthCheckedAt, setHealthCheckedAt] = useState<string | null>(null);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health/sui');
      const data = await res.json();
      setRpcHealth({
        mainnet: { status: data.mainnet?.status ?? null, latencyMs: data.mainnet?.latencyMs ?? null },
        testnet: { status: data.testnet?.status ?? null, latencyMs: data.testnet?.latencyMs ?? null },
      });
      setHealthCheckedAt(new Date().toISOString());
    } catch {
      // Keep previous state
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const statusColor = (s: string | null) => {
    if (s === 'HEALTHY') return 'text-green-400';
    if (s === 'DEGRADED') return 'text-yellow-400';
    if (s === 'DOWN') return 'text-red-400';
    return 'text-dl-muted';
  };

  return (
    <OperatorConsoleLayout>
      <div className="max-w-5xl">
        <h1 className="font-serif text-3xl text-dl-heading mb-2">
          Sui Phase 9 — Production Console
        </h1>
        <p className="font-mono text-xs text-dl-muted mb-8">
          Axiom Protocol · Sui Community Distribution Layer · Mainnet Release Candidate
        </p>

        {/* Active Campaign Banner */}
        <div className="border border-green-700 bg-green-950/10 px-5 py-4 mb-6">
          <p className="font-mono text-xs text-green-400 uppercase tracking-widest mb-2">
            CAMPAIGN ACTIVE — SUI MAINNET
          </p>
          <p className="text-sm text-dl-muted">
            Package published, pool funded (4 AMC), merkle root set, and campaign activated
            on 2026-05-15. 4 eligible claimants. Claims open at{' '}
            <span className="text-dl-fg font-mono text-xs">/sui/claim</span>.
          </p>
        </div>

        {/* Audit Deferred Banner */}
        <div className="border border-yellow-700 bg-yellow-950/10 px-5 py-4 mb-6">
          <p className="font-mono text-xs text-yellow-400 uppercase tracking-widest mb-2">
            ACCEPTED RISK — EXTERNAL AUDIT DEFERRED
          </p>
          <p className="text-sm text-dl-muted">
            The Move smart contract has not yet undergone an independent external security audit.
            Operating under accepted-risk until audit is complete (60-day window from mainnet publish).
            See{' '}
            <span className="font-mono text-xs text-dl-fg">
              documents/chains/AXIOM_SUI_PHASE9_ACCEPTED_RISK_MEMO.md
            </span>
          </p>
        </div>

        {/* Multisig Deferred Banner */}
        <div className="border border-yellow-700 bg-yellow-950/10 px-5 py-4 mb-8">
          <p className="font-mono text-xs text-yellow-400 uppercase tracking-widest mb-2">
            ACCEPTED RISK — SINGLE-WALLET CUSTODY (TEMPORARY)
          </p>
          <p className="text-sm text-dl-muted">
            AdminCap held by single deployer wallet. 2-of-3 multisig migration pending (30-day window).
            See{' '}
            <span className="font-mono text-xs text-dl-fg">
              documents/chains/AXIOM_SUI_PHASE9_MULTISIG_MIGRATION.md
            </span>
          </p>
        </div>

        {/* Package / Publish Status */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Package Status</h2>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-dl-muted font-mono text-xs uppercase">Package name</dt>
            <dd className="text-dl-fg font-mono text-xs">axiom_claim_mainnet_candidate</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Build status</dt>
            <dd className="text-green-400 font-mono text-xs">COMPILED — 0 errors, lint warnings only</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Mainnet package ID</dt>
            <dd className="text-green-400 font-mono text-xs break-all">{MAINNET_PACKAGE}</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Publish tx</dt>
            <dd className="text-dl-fg font-mono text-xs break-all">
              <a
                href={`https://suiscan.xyz/mainnet/tx/${PUBLISH_TX}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {PUBLISH_TX}
              </a>
            </dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Published</dt>
            <dd className="text-green-400 font-mono text-xs">2026-05-15 — LIVE ON MAINNET</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Campaign object</dt>
            <dd className="text-dl-fg font-mono text-xs break-all">{CAMPAIGN_OBJECT}</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">AdminCap object</dt>
            <dd className="text-dl-fg font-mono text-xs break-all">{ADMIN_CAP_OBJECT}</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Upgrade policy</dt>
            <dd className="text-green-400 font-mono text-xs">FROZEN — No UpgradeCap retained</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Merkle root</dt>
            <dd className="text-dl-fg font-mono text-xs break-all">dd6b3d845ed2129701dac7cf2637baf7a0b599d27813be4c75d3deb80394c67a</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Pool balance</dt>
            <dd className="text-green-400 font-mono text-xs">4,000,000 base units (4 AMC)</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Eligible claimants</dt>
            <dd className="text-dl-fg font-mono text-xs">4</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Campaign status</dt>
            <dd className="text-green-400 font-mono text-xs">ACTIVE — claims open</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Immutable Tx</dt>
            <dd className="text-dl-fg font-mono text-xs break-all">6qv18P2ZeMNKEKzzTnQyukKKKcUAEGnhsFFRqMqb37J7</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Merkle root Tx</dt>
            <dd className="text-dl-fg font-mono text-xs break-all">4dpfFWu4CYfm1QkogaaHxhjo5dgwTK1K2RvrjQpD5LmQ</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Fund Tx</dt>
            <dd className="text-dl-fg font-mono text-xs break-all">2RufGy3STSUzMTvxgqHhW4hAiifBLhf1EZFSTB32KosU</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Activate Tx</dt>
            <dd className="text-dl-fg font-mono text-xs break-all">
              <a
                href="https://suiscan.xyz/mainnet/tx/5AHTFEVAwggD4tBnwJpmSE6adxrVfjgnjR5BG3HhgW8E"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                5AHTFEVAwggD4tBnwJpmSE6adxrVfjgnjR5BG3HhgW8E
              </a>
            </dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Testnet prototype</dt>
            <dd className="text-dl-fg font-mono text-xs break-all">{TESTNET_PACKAGE}</dd>
          </dl>
        </section>

        {/* Custody State */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Custody State</h2>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-dl-muted font-mono text-xs uppercase">AdminCap holder</dt>
            <dd className="text-dl-fg font-mono text-xs">Single deployer wallet (temporary)</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Deployer address</dt>
            <dd className="text-dl-fg font-mono text-xs break-all">{DEPLOYER_ADDRESS}</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Key storage</dt>
            <dd className="text-dl-fg font-mono text-xs">Environment secret management (DEPLOYER_PRIVATE_KEY)</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Multisig status</dt>
            <dd className="text-yellow-400 font-mono text-xs">NOT IMPLEMENTED — 30-day migration window</dd>

            <dt className="text-dl-muted font-mono text-xs uppercase">Migration plan</dt>
            <dd className="text-dl-fg font-mono text-xs">AXIOM_SUI_PHASE9_MULTISIG_MIGRATION.md</dd>
          </dl>
        </section>

        {/* Campaign Registry */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Campaign Registry</h2>
          <div className="space-y-4">
            {campaigns.map((c) => (
              <div key={c.id} className="border border-dl-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="font-serif text-base text-dl-heading">{c.label}</p>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 border ${
                      c.status === 'active'
                        ? 'border-green-700 text-green-400'
                        : c.status === 'closed'
                        ? 'border-red-800 text-red-400'
                        : 'border-yellow-700 text-yellow-400'
                    }`}
                  >
                    {c.status.toUpperCase()}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-y-2 text-xs">
                  <dt className="text-dl-muted font-mono uppercase">Campaign ID</dt>
                  <dd className="text-dl-fg font-mono">{c.id}</dd>
                  <dt className="text-dl-muted font-mono uppercase">Network</dt>
                  <dd className="text-dl-fg font-mono">{c.network}</dd>
                  <dt className="text-dl-muted font-mono uppercase">Amount/claim</dt>
                  <dd className="text-dl-fg font-mono">
                    {(Number(c.amountPerClaim) / 1_000_000).toFixed(6)}{' '}
                    {c.network === 'mainnet' ? 'AMC' : 'ATC'}
                  </dd>
                  <dt className="text-dl-muted font-mono uppercase">Package ID</dt>
                  <dd className="font-mono break-all text-dl-fg">
                    {c.packageId || <span className="text-yellow-400">PENDING</span>}
                  </dd>
                  <dt className="text-dl-muted font-mono uppercase">Campaign object</dt>
                  <dd className="font-mono break-all text-dl-fg">
                    {c.campaignObjectId || <span className="text-yellow-400">PENDING</span>}
                  </dd>
                  <dt className="text-dl-muted font-mono uppercase">Total claimed</dt>
                  <dd className="text-dl-fg font-mono">{c.totalClaimed}</dd>
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* RPC Health */}
        <section className="border border-dl-border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-dl-heading">RPC Health</h2>
            <button
              onClick={fetchHealth}
              disabled={healthLoading}
              className="px-4 py-1.5 font-mono text-xs border border-dl-border text-dl-muted hover:text-dl-fg hover:border-dl-fg disabled:opacity-40"
            >
              {healthLoading ? 'Checking...' : 'Refresh'}
            </button>
          </div>
          {healthCheckedAt && (
            <p className="font-mono text-xs text-dl-muted mb-3">
              Last checked: {healthCheckedAt}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-dl-muted font-mono text-xs uppercase">Mainnet RPC</dt>
            <dd className={`font-mono text-xs ${statusColor(rpcHealth.mainnet.status)}`}>
              {rpcHealth.mainnet.status ?? '—'}
              {rpcHealth.mainnet.latencyMs != null && (
                <span className="text-dl-muted ml-2">({rpcHealth.mainnet.latencyMs}ms)</span>
              )}
            </dd>
            <dt className="text-dl-muted font-mono text-xs uppercase">Testnet RPC</dt>
            <dd className={`font-mono text-xs ${statusColor(rpcHealth.testnet.status)}`}>
              {rpcHealth.testnet.status ?? '—'}
              {rpcHealth.testnet.latencyMs != null && (
                <span className="text-dl-muted ml-2">({rpcHealth.testnet.latencyMs}ms)</span>
              )}
            </dd>
          </dl>
        </section>

        {/* Accepted Risk Summary */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Accepted Risk Register</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-dl-border">
                  <th className="text-left text-dl-muted uppercase py-2 pr-4">Risk</th>
                  <th className="text-left text-dl-muted uppercase py-2 pr-4">Severity</th>
                  <th className="text-left text-dl-muted uppercase py-2 pr-4">Status</th>
                  <th className="text-left text-dl-muted uppercase py-2">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['No external Move audit', 'MEDIUM', 'ACCEPTED', '60 days post-publish'],
                  ['Single-wallet AdminCap', 'MEDIUM', 'ACCEPTED', '30 days post-publish'],
                  ['Single-party authorization', 'LOW', 'ACCEPTED', '90 days (scope review)'],
                ].map(([risk, sev, status, deadline]) => (
                  <tr key={risk} className="border-b border-dl-border">
                    <td className="py-2 pr-4 text-dl-fg">{risk}</td>
                    <td className={`py-2 pr-4 ${sev === 'HIGH' ? 'text-red-400' : sev === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'}`}>
                      {sev}
                    </td>
                    <td className="py-2 pr-4 text-yellow-400">{status}</td>
                    <td className="py-2 text-dl-muted">{deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Incident Checklist */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Incident Response Checklist</h2>
          <div className="space-y-2 font-mono text-xs text-dl-muted">
            {[
              '1. Detect anomaly via claim event monitoring or operator report',
              '2. Immediately call pause_campaign() via deployer wallet CLI',
              '3. If pause insufficient, call close_campaign() — PERMANENT, irreversible',
              '4. Notify community participants via all known channels',
              '5. Engage security firm for emergency assessment',
              '6. Do NOT deploy hotfix without external review (package is frozen)',
              '7. File incident report within 24 hours of closure',
              '8. Phase 10 planning only after audit + multisig migration complete',
            ].map((step) => (
              <p key={step}>{step}</p>
            ))}
          </div>
        </section>

        {/* Governance Documents */}
        <section className="border border-dl-border p-5 mb-6">
          <h2 className="font-serif text-xl text-dl-heading mb-4">Governance Documents</h2>
          <dl className="space-y-2 text-xs font-mono">
            {[
              ['Accepted Risk Memo', 'documents/chains/AXIOM_SUI_PHASE9_ACCEPTED_RISK_MEMO.md'],
              ['Production Authorization', 'documents/chains/AXIOM_SUI_PHASE9_PRODUCTION_AUTHORIZATION.md'],
              ['Custody Exception', 'documents/chains/AXIOM_SUI_PHASE9_CUSTODY_EXCEPTION.md'],
              ['Multisig Migration Plan', 'documents/chains/AXIOM_SUI_PHASE9_MULTISIG_MIGRATION.md'],
            ].map(([label, path]) => (
              <div key={path} className="grid grid-cols-2 gap-2">
                <dt className="text-dl-muted">{label}</dt>
                <dd className="text-dl-fg break-all">{path}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="font-mono text-xs text-dl-muted border-t border-dl-border pt-4">
          Sui Phase 9 Operator Console · Axiom Protocol Community Distribution Layer · Read-only
        </p>
      </div>
    </OperatorConsoleLayout>
  );
};

export default SuiPhase9Page;
