import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

interface CampaignInfo {
  id: string;
  label: string;
  amountPerClaim: string;
  expiresAtEpoch: string;
  poolBalance: string;
  isActive: boolean;
  isClosed: boolean;
}

interface ClaimStatus {
  hasClaimed: boolean;
  eligible: boolean | null;
}

export default function SuiClaimPage() {
  const [campaignId, setCampaignId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [proof, setProof] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [csvLoaded, setCsvLoaded] = useState(false);

  const fetchCampaign = useCallback(async () => {
    if (!campaignId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sui/campaigns/${encodeURIComponent(campaignId.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load campaign');
      setCampaign(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const checkStatus = useCallback(async () => {
    if (!campaignId.trim() || !walletAddress.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sui/claim-status?address=${encodeURIComponent(walletAddress.trim())}&campaignId=${encodeURIComponent(campaignId.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Status check failed');
      setClaimStatus({ hasClaimed: data.hasClaimed, eligible: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status check failed');
    } finally {
      setLoading(false);
    }
  }, [campaignId, walletAddress]);

  const generateProof = useCallback(async () => {
    if (!campaignId.trim() || !walletAddress.trim() || !csvContent.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sui/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress.trim(),
          campaignId: campaignId.trim(),
          eligibilityCsv: csvContent.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Proof generation failed');
      if (data.eligible) {
        setProof(data.proof);
        setClaimStatus(prev => ({ ...prev!, eligible: true }));
      } else {
        setProof(null);
        setClaimStatus(prev => ({ ...prev!, eligible: false }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Proof generation failed');
    } finally {
      setLoading(false);
    }
  }, [campaignId, walletAddress, csvContent]);

  const formatAmount = (raw: string) => {
    try {
      const n = BigInt(raw);
      return (Number(n) / 1_000_000).toFixed(6) + ' AMC';
    } catch {
      return raw;
    }
  };

  return (
    <>
      <Head>
        <title>Sui Community Claim — Axiom Protocol</title>
        <meta name="description" content="Claim your Axiom Protocol community rewards on Sui." />
      </Head>
      <DesignLawLayout>
        <div className="max-w-3xl mx-auto px-6 py-10">

          <div className="mb-8 border-b border-dl-border pb-6">
            <p className="text-xs font-mono text-dl-muted uppercase tracking-widest mb-2">
              Sui Network — Community Rewards
            </p>
            <h1 className="text-3xl font-serif text-dl-primary mb-3">
              Claim Community Rewards
            </h1>
            <p className="text-sm text-dl-muted leading-relaxed">
              This is a community rewards distribution only. No monetary value.
              Not AXUSD, AXAU, AXM, SEED, or KAG. Not redeemable for any canonical Axiom asset.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-3">
              Step 1 — Campaign
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
                placeholder="0x... campaign object ID"
                className="flex-1 font-mono text-sm bg-dl-surface border border-dl-border text-dl-primary px-3 py-2 focus:outline-none focus:border-dl-accent"
              />
              <button
                onClick={fetchCampaign}
                disabled={loading || !campaignId.trim()}
                className="px-4 py-2 text-xs font-mono uppercase tracking-widest bg-dl-primary text-white disabled:opacity-40"
              >
                {loading ? 'Loading…' : 'Load'}
              </button>
            </div>

            {campaign && (
              <div className="mt-4 border border-dl-border p-4">
                <div className="font-serif text-lg text-dl-primary mb-3">{campaign.label}</div>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono">
                  <dt className="text-dl-muted">Amount Per Claim</dt>
                  <dd className="text-dl-primary">{formatAmount(campaign.amountPerClaim)}</dd>
                  <dt className="text-dl-muted">Pool Balance</dt>
                  <dd className="text-dl-primary">{formatAmount(campaign.poolBalance)}</dd>
                  <dt className="text-dl-muted">Expires At Epoch</dt>
                  <dd className="text-dl-primary">
                    {campaign.expiresAtEpoch === '0' ? 'No expiry' : campaign.expiresAtEpoch}
                  </dd>
                  <dt className="text-dl-muted">Status</dt>
                  <dd className={campaign.isClosed ? 'text-red-500' : campaign.isActive ? 'text-green-600' : 'text-yellow-600'}>
                    {campaign.isClosed ? 'CLOSED' : campaign.isActive ? 'ACTIVE' : 'PAUSED'}
                  </dd>
                </dl>
              </div>
            )}
          </section>

          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-3">
              Step 2 — Your Wallet
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={walletAddress}
                onChange={e => setWalletAddress(e.target.value)}
                placeholder="0x... your Sui address"
                className="flex-1 font-mono text-sm bg-dl-surface border border-dl-border text-dl-primary px-3 py-2 focus:outline-none focus:border-dl-accent"
              />
              <button
                onClick={checkStatus}
                disabled={loading || !walletAddress.trim() || !campaignId.trim()}
                className="px-4 py-2 text-xs font-mono uppercase tracking-widest bg-dl-primary text-white disabled:opacity-40"
              >
                Check
              </button>
            </div>

            {claimStatus && (
              <div className="mt-3 text-xs font-mono">
                {claimStatus.hasClaimed && (
                  <span className="text-green-600">Already claimed — reward has been distributed to your wallet.</span>
                )}
                {!claimStatus.hasClaimed && claimStatus.eligible === true && (
                  <span className="text-green-600">Eligible — proof ready. Proceed to claim.</span>
                )}
                {!claimStatus.hasClaimed && claimStatus.eligible === false && (
                  <span className="text-red-500">Address not found in eligibility list for this campaign.</span>
                )}
                {!claimStatus.hasClaimed && claimStatus.eligible === null && (
                  <span className="text-dl-muted">Not yet claimed. Load eligibility CSV to generate proof.</span>
                )}
              </div>
            )}
          </section>

          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-3">
              Step 3 — Eligibility Proof
            </h2>
            <p className="text-xs text-dl-muted mb-3">
              Paste the eligibility CSV (columns: address, amount). Your proof is generated locally — the CSV is not stored.
            </p>
            <textarea
              value={csvContent}
              onChange={e => { setCsvContent(e.target.value); setCsvLoaded(e.target.value.trim().length > 0); }}
              placeholder={'address,amount\n0xABC...,1000000'}
              rows={6}
              className="w-full font-mono text-xs bg-dl-surface border border-dl-border text-dl-primary px-3 py-2 focus:outline-none focus:border-dl-accent"
            />
            <button
              onClick={generateProof}
              disabled={loading || !csvLoaded || !walletAddress.trim() || !campaignId.trim()}
              className="mt-2 px-4 py-2 text-xs font-mono uppercase tracking-widest bg-dl-primary text-white disabled:opacity-40"
            >
              {loading ? 'Generating…' : 'Generate Proof'}
            </button>

            {proof && (
              <div className="mt-4 border border-dl-border p-4">
                <p className="text-xs font-mono text-dl-muted mb-2 uppercase tracking-widest">Proof ({proof.length} siblings)</p>
                <div className="overflow-x-auto">
                  {proof.map((p, i) => (
                    <div key={i} className="font-mono text-xs text-dl-primary break-all">
                      [{i}] 0x{p}
                    </div>
                  ))}
                  {proof.length === 0 && (
                    <div className="font-mono text-xs text-dl-muted">Single-leaf tree — empty proof (leaf is root)</div>
                  )}
                </div>
              </div>
            )}
          </section>

          {proof && !claimStatus?.hasClaimed && (
            <section className="mb-8">
              <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-3">
                Step 4 — Submit Claim
              </h2>
              <p className="text-xs text-dl-muted mb-4 leading-relaxed">
                Submit your claim transaction using a Sui wallet (Sui Wallet, Suiet, or Ethos).
                Call <span className="font-mono text-dl-primary">claim_campaign::claim</span> on
                campaign <span className="font-mono text-dl-primary">{campaignId}</span> with the
                proof shown above.
              </p>
              <div className="border border-dl-border p-4 bg-dl-surface">
                <p className="text-xs font-mono text-dl-muted uppercase tracking-widest mb-2">Transaction Parameters</p>
                <dl className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <dt className="text-dl-muted">Package</dt>
                  <dd className="text-dl-primary break-all">{process.env.NEXT_PUBLIC_AXIOM_SUI_PACKAGE_ID ?? 'See operator'}</dd>
                  <dt className="text-dl-muted">Module</dt>
                  <dd className="text-dl-primary">claim_campaign</dd>
                  <dt className="text-dl-muted">Function</dt>
                  <dd className="text-dl-primary">claim</dd>
                  <dt className="text-dl-muted">Campaign Object</dt>
                  <dd className="text-dl-primary break-all">{campaignId}</dd>
                  <dt className="text-dl-muted">Proof Length</dt>
                  <dd className="text-dl-primary">{proof.length} nodes</dd>
                </dl>
              </div>
            </section>
          )}

          {error && (
            <div className="border border-red-400 p-3 text-xs font-mono text-red-500">
              ERROR: {error}
            </div>
          )}

          <div className="mt-10 border-t border-dl-border pt-6 text-xs text-dl-muted font-mono">
            <p>COMMUNITY REWARDS ONLY. No monetary value. Not AXUSD, AXAU, AXM, SEED, or KAG.</p>
            <p>Not backed by any reserve. Not redeemable for any canonical asset.</p>
            <p className="mt-1">Network: {process.env.NEXT_PUBLIC_AXIOM_SUI_NETWORK ?? 'testnet'}</p>
          </div>
        </div>
      </DesignLawLayout>
    </>
  );
}
