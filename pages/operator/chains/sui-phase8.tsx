import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import { validateEligibilityCsv, buildMerkleTree } from '../../../lib/sui/proofs/index';

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
