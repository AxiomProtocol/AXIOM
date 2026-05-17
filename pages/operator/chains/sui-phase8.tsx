import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import { validateEligibilityCsv, buildMerkleTree } from '../../../lib/sui/proofs/index';
import type { MigrateStatusResponse } from '../../api/sui/campaigns/migrate-status';
import type { NaviMarket, NaviPoolEntry } from '../../../lib/defi/navi/service';
import type { AftermathPools, AftermathPoolEntry } from '../../../lib/defi/aftermath/service';

interface CampaignRow {
  id: string;
  label: string;
  amountPerClaim: string;
  poolBalance: string;
  expiresAtEpoch: string;
  isActive: boolean;
  isClosed: boolean;
  fetchedAt: number;
}

interface CsvAudit {
  valid: boolean;
  entryCount: number;
  totalAmount: string;
  errors: string[];
  warnings: string[];
  root: string | null;
}

function formatAmc(raw: string): string {
  try {
    const n = BigInt(raw);
    const whole = n / 1_000_000n;
    const frac = n % 1_000_000n;
    return `${whole.toLocaleString()}.${frac.toString().padStart(6, '0')} AMC`;
  } catch {
    return raw;
  }
}

function SuiDefiPanel() {
  const [navi, setNavi] = useState<NaviMarket | null>(null);
  const [aftermath, setAftermath] = useState<AftermathPools | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/sui/navi/market').then(r => r.ok ? r.json() as Promise<NaviMarket> : Promise.reject(new Error(`Navi HTTP ${r.status}`))),
      fetch('/api/sui/aftermath/pools').then(r => r.ok ? r.json() as Promise<AftermathPools> : Promise.reject(new Error(`Aftermath HTTP ${r.status}`))),
    ]).then(([naviResult, aftermathResult]) => {
      const errs: string[] = [];
      if (naviResult.status === 'fulfilled') setNavi(naviResult.value);
      else errs.push(naviResult.reason instanceof Error ? naviResult.reason.message : 'Navi unavailable');
      if (aftermathResult.status === 'fulfilled') setAftermath(aftermathResult.value);
      else errs.push(aftermathResult.reason instanceof Error ? aftermathResult.reason.message : 'Aftermath unavailable');
      setErrors(errs);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <section className="mb-10">
      <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-4">
        DeFi Integrations — Sui Chain
      </h2>
      <p className="text-xs text-dl-muted mb-4">
        Read-only market intelligence from Navi Protocol and Aftermath Finance on Sui.
        Data sourced via public REST APIs · 60 s cache.
      </p>
      {loading && <p className="text-xs font-mono text-dl-muted">Loading Sui DeFi data…</p>}
      {errors.map((e, i) => (
        <p key={i} className="text-xs font-mono text-dl-error mb-1">⚠ {e}</p>
      ))}

      {navi && (
        <div className="mb-8">
          <p className="text-xs font-mono text-dl-muted mb-2 uppercase tracking-widest">
            Navi Protocol · Lending Markets
          </p>
          <div className="border border-dl-border overflow-x-auto mb-2">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-dl-border">
                  {['Asset', 'Total Supply', 'Total Borrows', 'Util %', 'Supply APY', 'Borrow APY'].map(h => (
                    <th key={h} className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {navi.pools.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-3 text-dl-muted">No pool data available</td></tr>
                ) : navi.pools.map((p: NaviPoolEntry) => (
                  <tr key={p.coinType || p.symbol} className="border-b border-dl-border last:border-b-0">
                    <td className="px-4 py-2 text-dl-primary font-bold">{p.symbol}</td>
                    <td className="px-4 py-2 text-dl-muted">{p.totalSupply.toLocaleString()}</td>
                    <td className="px-4 py-2 text-dl-muted">{p.totalBorrow.toLocaleString()}</td>
                    <td className="px-4 py-2" style={{ color: p.utilizationPct > 80 ? '#f87171' : '#94a3b8' }}>{p.utilizationPct.toFixed(1)}%</td>
                    <td className="px-4 py-2" style={{ color: '#4ade80' }}>{p.supplyApyPct.toFixed(2)}%</td>
                    <td className="px-4 py-2" style={{ color: '#fbbf24' }}>{p.borrowApyPct.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-mono text-dl-muted">
            Total TVL: {navi.totalTvlUsd.toLocaleString()} · Fetched: {navi.fetchedAt} ·{' '}
            <code className="text-dl-accent">GET /api/sui/navi/market</code>
          </p>
        </div>
      )}

      {aftermath && (
        <div>
          <p className="text-xs font-mono text-dl-muted mb-2 uppercase tracking-widest">
            Aftermath Finance · Top Liquidity Pools
          </p>
          <div className="border border-dl-border overflow-x-auto mb-2">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-dl-border">
                  {['Pool', 'Tokens', 'TVL (USD)', 'Vol 24h (USD)', 'Fee APR'].map(h => (
                    <th key={h} className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aftermath.pools.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-3 text-dl-muted">No pool data available</td></tr>
                ) : aftermath.pools.slice(0, 10).map((p: AftermathPoolEntry) => (
                  <tr key={p.poolId} className="border-b border-dl-border last:border-b-0">
                    <td className="px-4 py-2 text-dl-primary">{p.name}</td>
                    <td className="px-4 py-2 text-dl-muted">{p.tokens.join(' / ') || '—'}</td>
                    <td className="px-4 py-2 text-dl-muted">${p.tvlUsd.toLocaleString()}</td>
                    <td className="px-4 py-2 text-dl-muted">${p.volume24hUsd.toLocaleString()}</td>
                    <td className="px-4 py-2" style={{ color: '#4ade80' }}>{p.feeAprPct.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-mono text-dl-muted">
            Total TVL: ${aftermath.totalTvlUsd.toLocaleString()} · Fetched: {aftermath.fetchedAt} ·{' '}
            <code className="text-dl-accent">GET /api/sui/aftermath/pools</code>
          </p>
        </div>
      )}
    </section>
  );
}

export default function SuiPhase8OperatorPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  const [csvInput, setCsvInput] = useState('');
  const [csvAudit, setCsvAudit] = useState<CsvAudit | null>(null);

  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<CampaignRow | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [migrateStatus, setMigrateStatus] = useState<MigrateStatusResponse | null>(null);
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migrateError, setMigrateError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    setCampaignsError(null);
    try {
      const res = await fetch('/api/sui/campaigns?limit=20');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load campaigns');
      setCampaigns(data.campaigns ?? []);
    } catch (e) {
      setCampaignsError(e instanceof Error ? e.message : 'Failed to load campaigns');
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  const fetchMigrateStatus = useCallback(async () => {
    setMigrateLoading(true);
    setMigrateError(null);
    try {
      const res = await fetch('/api/sui/campaigns/migrate-status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load migration status');
      setMigrateStatus(data);
    } catch (e) {
      setMigrateError(e instanceof Error ? e.message : 'Failed to load migration status');
    } finally {
      setMigrateLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const auditCsv = useCallback(() => {
    if (!csvInput.trim()) return;
    const result = validateEligibilityCsv(csvInput.trim());
    let root: string | null = null;
    if (result.valid && result.entries.length > 0) {
      try {
        const tree = buildMerkleTree(result.entries);
        root = tree.root;
      } catch (e) {
        root = null;
      }
    }
    setCsvAudit({
      valid: result.valid,
      entryCount: result.entries.length,
      totalAmount: result.totalAmount.toString(),
      errors: result.errors,
      warnings: result.warnings,
      root,
    });
  }, [csvInput]);

  const lookupCampaign = useCallback(async () => {
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch(`/api/sui/campaigns/${encodeURIComponent(lookupId.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Not found');
      setLookupResult(data);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  }, [lookupId]);

  return (
    <>
      <Head>
        <title>Sui Phase 8 Operator — Axiom Protocol</title>
      </Head>
      <DesignLawLayout>
        <div className="max-w-5xl mx-auto px-6 py-10">

          <div className="mb-8 border-b border-dl-border pb-6">
            <p className="text-xs font-mono text-dl-muted uppercase tracking-widest mb-2">
              Operator Dashboard — Sui Chain
            </p>
            <h1 className="text-3xl font-serif text-dl-primary mb-2">
              Sui Phase 8 — Claim Campaign Operator
            </h1>
            <p className="text-sm text-dl-muted">
              Monitor active campaigns, audit eligibility CSVs, and verify Merkle roots.
              All write operations (fund, activate, pause, close) require AdminCap — submit via Sui CLI or hardware wallet.
            </p>
          </div>

          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted">
                Active Campaigns
              </h2>
              <button
                onClick={fetchCampaigns}
                disabled={loadingCampaigns}
                className="text-xs font-mono uppercase tracking-widest text-dl-muted border border-dl-border px-3 py-1 hover:border-dl-primary disabled:opacity-40"
              >
                {loadingCampaigns ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {campaignsError && (
              <div className="border border-red-400 p-3 text-xs font-mono text-red-500 mb-4">
                {campaignsError}
              </div>
            )}

            {campaigns.length === 0 && !loadingCampaigns && !campaignsError && (
              <div className="border border-dl-border p-6 text-center text-xs font-mono text-dl-muted">
                No campaigns found on {process.env.NEXT_PUBLIC_AXIOM_SUI_NETWORK ?? 'testnet'}.
                Configure AXIOM_SUI_PACKAGE_ID and AXIOM_SUI_RPC_URL to connect.
              </div>
            )}

            {campaigns.length > 0 && (
              <div className="border border-dl-border overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-dl-border">
                      <th className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest">Label</th>
                      <th className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest">Pool</th>
                      <th className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest">Per Claim</th>
                      <th className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest">Expires</th>
                      <th className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest">Status</th>
                      <th className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.id} className="border-b border-dl-border last:border-b-0">
                        <td className="px-4 py-2 text-dl-primary">{c.label}</td>
                        <td className="px-4 py-2 text-dl-primary">{formatAmc(c.poolBalance)}</td>
                        <td className="px-4 py-2 text-dl-primary">{formatAmc(c.amountPerClaim)}</td>
                        <td className="px-4 py-2 text-dl-muted">
                          {c.expiresAtEpoch === '0' ? 'None' : `Epoch ${c.expiresAtEpoch}`}
                        </td>
                        <td className="px-4 py-2">
                          <span className={
                            c.isClosed ? 'text-red-500' :
                            c.isActive ? 'text-green-600' : 'text-yellow-600'
                          }>
                            {c.isClosed ? '⬛ CLOSED' : c.isActive ? '● ACTIVE' : '◌ PAUSED'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-dl-muted max-w-xs truncate"
                          title={c.id}>{c.id.slice(0, 12)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Campaign Migration Tracker ─────────────────────────────────── */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted">
                  Label Typo Migration
                </h2>
                <p className="text-xs text-dl-muted mt-1">
                  "AXOOM Genesis" → "Axiom Genesis" — close old campaign, create correctly-named replacement.
                </p>
              </div>
              <button
                onClick={fetchMigrateStatus}
                disabled={migrateLoading}
                className="text-xs font-mono uppercase tracking-widest text-dl-muted border border-dl-border px-3 py-1 hover:border-dl-primary disabled:opacity-40"
              >
                {migrateLoading ? 'Checking…' : 'Check Status'}
              </button>
            </div>

            {migrateError && (
              <div className="border border-red-400 p-3 text-xs font-mono text-red-500 mb-4">
                {migrateError}
              </div>
            )}

            {migrateStatus && (
              <div className="border border-dl-border p-4 mb-4">
                {/* Overall badge */}
                <div className={`text-xs font-mono uppercase tracking-widest mb-4 ${
                  migrateStatus.isComplete ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {migrateStatus.isComplete ? '✓ MIGRATION COMPLETE' : '◌ MIGRATION PENDING'}
                </div>

                {/* Step checklist */}
                <div className="grid grid-cols-1 gap-1 mb-5 text-xs font-mono">
                  {([
                    ['oldClosed',  'Step 1 — Old "AXOOM Genesis" campaign closed'],
                    ['newCreated', 'Step 2 — New "Axiom Genesis" campaign created'],
                    ['newFunded',  'Step 3 — New campaign funded (pool > 0)'],
                    ['newActive',  'Step 4 — New campaign activated'],
                  ] as [keyof typeof migrateStatus.steps, string][]).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className={migrateStatus.steps[key] ? 'text-green-600' : 'text-dl-muted'}>
                        {migrateStatus.steps[key] ? '✓' : '○'}
                      </span>
                      <span className={migrateStatus.steps[key] ? 'text-dl-primary' : 'text-dl-muted'}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Old campaign row */}
                {migrateStatus.oldCampaign && (
                  <div className="mb-3">
                    <p className="text-xs font-mono text-dl-muted uppercase tracking-widest mb-1">Old Campaign</p>
                    <div className="border border-dl-border p-3 text-xs font-mono">
                      <div className="flex justify-between mb-1">
                        <span className="text-dl-muted">Label</span>
                        <span className="text-red-400">{migrateStatus.oldCampaign.label}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-dl-muted">Status</span>
                        <span className={migrateStatus.oldCampaign.isClosed ? 'text-dl-muted' : 'text-yellow-600'}>
                          {migrateStatus.oldCampaign.isClosed ? 'CLOSED' : 'STILL OPEN — close required'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dl-muted">Object ID</span>
                        <span className="text-dl-muted" title={migrateStatus.oldCampaign.id}>
                          {migrateStatus.oldCampaign.id.slice(0, 14)}…
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* New campaign row */}
                {migrateStatus.newCampaign ? (
                  <div>
                    <p className="text-xs font-mono text-dl-muted uppercase tracking-widest mb-1">New Campaign</p>
                    <div className="border border-dl-border p-3 text-xs font-mono">
                      <div className="flex justify-between mb-1">
                        <span className="text-dl-muted">Label</span>
                        <span className="text-green-600">{migrateStatus.newCampaign.label}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-dl-muted">Status</span>
                        <span className={migrateStatus.newCampaign.isActive ? 'text-green-600' : 'text-yellow-600'}>
                          {migrateStatus.newCampaign.isClosed ? 'CLOSED' :
                           migrateStatus.newCampaign.isActive ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-dl-muted">Pool Balance</span>
                        <span className="text-dl-primary">{formatAmc(migrateStatus.newCampaign.poolBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dl-muted">Object ID</span>
                        <span className="text-dl-muted font-mono break-all" title={migrateStatus.newCampaign.id}>
                          {migrateStatus.newCampaign.id.slice(0, 14)}…
                        </span>
                      </div>
                    </div>
                    {migrateStatus.isComplete && (
                      <div className="mt-3 border border-green-600 p-3 text-xs font-mono text-green-600">
                        Update Replit secret AXIOM_SUI_CAMPAIGN_ID →{' '}
                        <span className="break-all">{migrateStatus.newCampaign.id}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-mono text-dl-muted italic">
                    New campaign not yet found — run migration script first.
                  </div>
                )}
              </div>
            )}

            {/* CLI command reference */}
            <details className="border border-dl-border">
              <summary className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-dl-muted cursor-pointer hover:text-dl-primary">
                CLI Command Reference
              </summary>
              <div className="px-4 pb-4 pt-2">
                <p className="text-xs text-dl-muted mb-3">
                  Run <code className="font-mono bg-dl-surface px-1">npx tsx scripts/sui-migrate-campaign.ts</code> with
                  the required env vars set, or execute these commands manually via Sui CLI.
                </p>
                <div className="space-y-3">
                  {[
                    {
                      step: '1. Close old campaign',
                      code: `sui client call \\
  --package ${process.env.NEXT_PUBLIC_AXIOM_SUI_PACKAGE_ID ?? '<AXIOM_SUI_PACKAGE_ID>'} \\
  --module claim_campaign \\
  --function close_campaign \\
  --args 0x3d3023694c96f9a71f6737a9aa43166c2f0b376418147cb005db0e17a52b726e <ADMIN_CAP_ID> \\
  --gas-budget 10000000 --json`,
                    },
                    {
                      step: '2. Create "Axiom Genesis" campaign',
                      code: `sui client call \\
  --package ${process.env.NEXT_PUBLIC_AXIOM_SUI_PACKAGE_ID ?? '<AXIOM_SUI_PACKAGE_ID>'} \\
  --module claim_campaign \\
  --function create_campaign_entry \\
  --args '[65,120,105,111,109,32,71,101,110,101,115,105,115]' <MERKLE_ROOT_HEX> <AMOUNT_PER_CLAIM> 0 \\
  --gas-budget 10000000 --json`,
                    },
                    {
                      step: '3. Fund + 4. Activate (use NEW AdminCap from step 2)',
                      code: `# Fund
sui client call --package <PKG> --module claim_campaign --function fund_campaign \\
  --args <NEW_CAMPAIGN_ID> <AMC_COIN_ID> <NEW_ADMIN_CAP_ID> --gas-budget 10000000 --json

# Activate
sui client call --package <PKG> --module claim_campaign --function activate \\
  --args <NEW_CAMPAIGN_ID> <NEW_ADMIN_CAP_ID> --gas-budget 10000000 --json`,
                    },
                  ].map(({ step, code }) => (
                    <div key={step}>
                      <p className="text-xs font-mono text-dl-muted uppercase tracking-widest mb-1">{step}</p>
                      <pre className="text-xs font-mono text-dl-primary bg-dl-surface border border-dl-border p-3 overflow-x-auto whitespace-pre">
                        {code}
                      </pre>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-mono text-dl-muted mt-4">
                  Label bytes: [65,120,105,111,109,32,71,101,110,101,115,105,115] = "Axiom Genesis"
                </p>
              </div>
            </details>
          </section>

          {/* ── Campaign Lookup ─────────────────────────────────────────────── */}
          <section className="mb-10">
            <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-4">
              Campaign Lookup
            </h2>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={lookupId}
                onChange={e => setLookupId(e.target.value)}
                placeholder="0x... campaign object ID"
                className="flex-1 font-mono text-sm bg-dl-surface border border-dl-border text-dl-primary px-3 py-2 focus:outline-none focus:border-dl-accent"
              />
              <button
                onClick={lookupCampaign}
                disabled={lookupLoading || !lookupId.trim()}
                className="px-4 py-2 text-xs font-mono uppercase tracking-widest bg-dl-primary text-white disabled:opacity-40"
              >
                {lookupLoading ? 'Loading…' : 'Lookup'}
              </button>
            </div>

            {lookupError && (
              <div className="text-xs font-mono text-red-500">{lookupError}</div>
            )}

            {lookupResult && (
              <div className="border border-dl-border p-4">
                <div className="font-serif text-lg text-dl-primary mb-3">{lookupResult.label}</div>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono">
                  <dt className="text-dl-muted">Object ID</dt>
                  <dd className="text-dl-primary break-all">{lookupResult.id}</dd>
                  <dt className="text-dl-muted">Pool Balance</dt>
                  <dd className="text-dl-primary">{formatAmc(lookupResult.poolBalance)}</dd>
                  <dt className="text-dl-muted">Amount Per Claim</dt>
                  <dd className="text-dl-primary">{formatAmc(lookupResult.amountPerClaim)}</dd>
                  <dt className="text-dl-muted">Expires At Epoch</dt>
                  <dd className="text-dl-primary">
                    {lookupResult.expiresAtEpoch === '0' ? 'No expiry' : lookupResult.expiresAtEpoch}
                  </dd>
                  <dt className="text-dl-muted">Is Active</dt>
                  <dd className={lookupResult.isActive ? 'text-green-600' : 'text-dl-muted'}>
                    {lookupResult.isActive ? 'Yes' : 'No'}
                  </dd>
                  <dt className="text-dl-muted">Is Closed</dt>
                  <dd className={lookupResult.isClosed ? 'text-red-500' : 'text-dl-muted'}>
                    {lookupResult.isClosed ? 'Yes — permanent' : 'No'}
                  </dd>
                </dl>
              </div>
            )}
          </section>

          <section className="mb-10">
            <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-4">
              Eligibility CSV Auditor
            </h2>
            <p className="text-xs text-dl-muted mb-3 leading-relaxed">
              Paste eligibility CSV (address, amount) to validate format, check for duplicates,
              and compute the Merkle root that will be committed on-chain.
            </p>
            <textarea
              value={csvInput}
              onChange={e => setCsvInput(e.target.value)}
              placeholder={'address,amount\n0xAAA1...,1000000\n0xAAA2...,1000000'}
              rows={8}
              className="w-full font-mono text-xs bg-dl-surface border border-dl-border text-dl-primary px-3 py-2 focus:outline-none focus:border-dl-accent mb-3"
            />
            <button
              onClick={auditCsv}
              disabled={!csvInput.trim()}
              className="px-4 py-2 text-xs font-mono uppercase tracking-widest bg-dl-primary text-white disabled:opacity-40"
            >
              Audit CSV
            </button>

            {csvAudit && (
              <div className="mt-4 border border-dl-border p-4">
                <div className={`text-xs font-mono uppercase tracking-widest mb-3 ${csvAudit.valid ? 'text-green-600' : 'text-red-500'}`}>
                  {csvAudit.valid ? '✓ VALID' : '✗ INVALID'}
                </div>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono mb-4">
                  <dt className="text-dl-muted">Entries</dt>
                  <dd className="text-dl-primary">{csvAudit.entryCount.toLocaleString()}</dd>
                  <dt className="text-dl-muted">Total Amount</dt>
                  <dd className="text-dl-primary">{formatAmc(csvAudit.totalAmount)}</dd>
                  <dt className="text-dl-muted">Merkle Root</dt>
                  <dd className="text-dl-primary break-all">
                    {csvAudit.root ? `0x${csvAudit.root}` : 'N/A'}
                  </dd>
                </dl>

                {csvAudit.errors.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-mono text-red-500 uppercase tracking-widest mb-1">Errors</p>
                    {csvAudit.errors.map((e, i) => (
                      <div key={i} className="text-xs font-mono text-red-400">{e}</div>
                    ))}
                  </div>
                )}

                {csvAudit.warnings.length > 0 && (
                  <div>
                    <p className="text-xs font-mono text-yellow-600 uppercase tracking-widest mb-1">Warnings</p>
                    {csvAudit.warnings.map((w, i) => (
                      <div key={i} className="text-xs font-mono text-yellow-500">{w}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <SuiDefiPanel />

          <section className="mb-10">
            <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-4">
              Admin Operations Reference
            </h2>
            <p className="text-xs text-dl-muted mb-3">
              All write operations require AdminCap. Submit via Sui CLI from the air-gapped operator machine.
            </p>
            <div className="border border-dl-border overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-dl-border">
                    <th className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest">Operation</th>
                    <th className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest">Function</th>
                    <th className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest">Approval</th>
                    <th className="text-left text-dl-muted px-4 py-2 font-normal uppercase tracking-widest">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Create Campaign', 'create_campaign_entry', '1 operator', 'Low'],
                    ['Fund Campaign', 'fund_campaign', '1 operator', 'Low'],
                    ['Activate', 'activate', '1 operator', 'Low'],
                    ['Pause', 'pause', '1 operator', 'Low'],
                    ['Unpause', 'unpause', '2 operators', 'Medium'],
                    ['Update Root', 'update_merkle_root', '2 operators + audit', 'High'],
                    ['Close Campaign', 'close_campaign', '2 operators + finance', 'High'],
                    ['Destroy AdminCap', 'destroy_admin_cap', 'Ceremony', 'Critical'],
                    ['Transfer AdminCap', 'transfer_admin_cap', 'Ceremony', 'Critical'],
                  ].map(([op, fn, approval, risk]) => (
                    <tr key={fn} className="border-b border-dl-border last:border-b-0">
                      <td className="px-4 py-2 text-dl-primary">{op}</td>
                      <td className="px-4 py-2 text-dl-muted">{fn}</td>
                      <td className="px-4 py-2 text-dl-muted">{approval}</td>
                      <td className={`px-4 py-2 ${
                        risk === 'Critical' ? 'text-red-500' :
                        risk === 'High' ? 'text-yellow-600' :
                        risk === 'Medium' ? 'text-dl-primary' : 'text-dl-muted'
                      }`}>{risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="border-t border-dl-border pt-6 text-xs font-mono text-dl-muted">
            <p>Package: {process.env.NEXT_PUBLIC_AXIOM_SUI_PACKAGE_ID ?? 'AXIOM_SUI_PACKAGE_ID not set'}</p>
            <p>Network: {process.env.NEXT_PUBLIC_AXIOM_SUI_NETWORK ?? 'testnet'}</p>
            <p className="mt-1">COMMUNITY REWARDS ONLY — no monetary value, not a canonical Axiom asset.</p>
          </div>
        </div>
      </DesignLawLayout>
    </>
  );
}
