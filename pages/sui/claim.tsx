import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import type {
  SuiClaimParams,
  WalletLike,
  WalletAccount,
} from '../../components/sui/SuiWalletConnect';

// Derive explorer base URL from the configured Sui network
const SUI_NETWORK = process.env.NEXT_PUBLIC_AXIOM_SUI_NETWORK ?? 'mainnet';
const SUISCAN_NETWORK =
  SUI_NETWORK === 'mainnet'
    ? 'mainnet'
    : SUI_NETWORK === 'testnet'
    ? 'testnet'
    : SUI_NETWORK === 'devnet'
    ? 'devnet'
    : 'mainnet';
const SUISCAN_BASE = `https://suiscan.xyz/${SUISCAN_NETWORK}/tx`;

const SuiWalletConnect = dynamic(
  () => import('../../components/sui/SuiWalletConnect'),
  { ssr: false, loading: () => null }
);

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
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Shared wallet session — lifted to page so Steps 1 and 5 reuse the same connection
  const [sharedWallet, setSharedWallet] = useState<WalletLike | null>(null);
  const [sharedAccount, setSharedAccount] = useState<WalletAccount | null>(null);

  const packageId = process.env.NEXT_PUBLIC_AXIOM_SUI_PACKAGE_ID ?? '';

  const handleSharedConnect = useCallback(
    (wallet: WalletLike, account: WalletAccount) => {
      setSharedWallet(wallet);
      setSharedAccount(account);
    },
    []
  );

  const handleSharedDisconnect = useCallback(() => {
    setSharedWallet(null);
    setSharedAccount(null);
  }, []);

  const fetchCampaign = useCallback(async () => {
    if (!campaignId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sui/campaigns/${encodeURIComponent(campaignId.trim())}`
      );
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
        `/api/sui/claim-status?address=${encodeURIComponent(
          walletAddress.trim()
        )}&campaignId=${encodeURIComponent(campaignId.trim())}`
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
    if (!campaignId.trim() || !walletAddress.trim() || !csvContent.trim())
      return;
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

  const refreshStatus = useCallback(async () => {
    if (!campaignId.trim() || !walletAddress.trim()) return;
    try {
      const res = await fetch(
        `/api/sui/claim-status?address=${encodeURIComponent(
          walletAddress.trim()
        )}&campaignId=${encodeURIComponent(campaignId.trim())}`
      );
      const data = await res.json();
      if (res.ok) {
        setClaimStatus(prev => ({ ...prev!, hasClaimed: data.hasClaimed }));
      }
    } catch {
      // non-critical — txDigest panel stays visible regardless
    }
  }, [campaignId, walletAddress]);

  const handleClaimSuccess = useCallback(
    async (digest: string) => {
      setTxDigest(digest);
      setClaimError(null);
      await refreshStatus();
    },
    [refreshStatus]
  );

  const handleClaimError = useCallback((err: string) => {
    setClaimError(err);
  }, []);

  // Called from both Step 1 and Step 5 wallet instances
  const handleAddressFilled = useCallback((address: string) => {
    setWalletAddress(address);
  }, []);

  const formatAmount = (raw: string) => {
    try {
      const n = BigInt(raw);
      return (Number(n) / 1_000_000).toFixed(6) + ' AMC';
    } catch {
      return raw;
    }
  };

  const claimParams: SuiClaimParams | null =
    proof && campaignId && packageId
      ? { packageId, campaignId: campaignId.trim(), proof }
      : null;

  // Step 5 remains visible as long as proof exists AND (not yet claimed OR tx just submitted)
  const showStep5 =
    proof !== null &&
    (claimStatus?.hasClaimed !== true || txDigest !== null);

  return (
    <>
      <Head>
        <title>Sui Community Claim — Axiom Protocol</title>
        <meta
          name="description"
          content="Claim your Axiom Protocol community rewards on Sui."
        />
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
              Not AXUSD, AXAU, AXM, SEED, or KAG. Not redeemable for any
              canonical Axiom asset.
            </p>
          </div>

          {/* Step 1 — Connect Wallet */}
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-3">
              Step 1 — Connect Wallet
            </h2>
            <p className="text-xs text-dl-muted mb-3 leading-relaxed">
              Connect your Sui browser wallet to auto-fill your address. You
              can also enter your address manually in Step 2 if you prefer
              the CLI to submit.
            </p>
            <SuiWalletConnect
              onAddressFilled={handleAddressFilled}
              claimParams={null}
              onClaimSuccess={handleClaimSuccess}
              onClaimError={handleClaimError}
              sharedWallet={sharedWallet}
              sharedAccount={sharedAccount}
              onSharedConnect={handleSharedConnect}
              onSharedDisconnect={handleSharedDisconnect}
            />
          </section>

          {/* Step 2 — Campaign & Address */}
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-3">
              Step 2 — Campaign & Address
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
                <div className="font-serif text-lg text-dl-primary mb-3">
                  {campaign.label}
                </div>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono">
                  <dt className="text-dl-muted">Amount Per Claim</dt>
                  <dd className="text-dl-primary">
                    {formatAmount(campaign.amountPerClaim)}
                  </dd>
                  <dt className="text-dl-muted">Pool Balance</dt>
                  <dd className="text-dl-primary">
                    {formatAmount(campaign.poolBalance)}
                  </dd>
                  <dt className="text-dl-muted">Expires At Epoch</dt>
                  <dd className="text-dl-primary">
                    {campaign.expiresAtEpoch === '0'
                      ? 'No expiry'
                      : campaign.expiresAtEpoch}
                  </dd>
                  <dt className="text-dl-muted">Status</dt>
                  <dd
                    className={
                      campaign.isClosed
                        ? 'text-red-500'
                        : campaign.isActive
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    }
                  >
                    {campaign.isClosed
                      ? 'CLOSED'
                      : campaign.isActive
                      ? 'ACTIVE'
                      : 'PAUSED'}
                  </dd>
                </dl>
              </div>
            )}

            {/* Address input — in same section as campaign so Step 2 is self-contained */}
            <div className="mt-6">
              <p className="text-xs font-mono text-dl-muted uppercase tracking-widest mb-2">
                Your Address
              </p>
              <p className="text-xs text-dl-muted mb-3">
                Auto-filled from your connected wallet, or enter manually.
              </p>
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
                  disabled={
                    loading || !walletAddress.trim() || !campaignId.trim()
                  }
                  className="px-4 py-2 text-xs font-mono uppercase tracking-widest bg-dl-primary text-white disabled:opacity-40"
                >
                  Check
                </button>
              </div>

              {claimStatus && (
                <div className="mt-3 text-xs font-mono">
                  {claimStatus.hasClaimed && !txDigest && (
                    <span className="text-green-600">
                      Already claimed — reward has been distributed to your
                      wallet.
                    </span>
                  )}
                  {!claimStatus.hasClaimed && claimStatus.eligible === true && (
                    <span className="text-green-600">
                      Eligible — proof ready. Proceed to claim.
                    </span>
                  )}
                  {!claimStatus.hasClaimed &&
                    claimStatus.eligible === false && (
                      <span className="text-red-500">
                        Address not found in eligibility list for this campaign.
                      </span>
                    )}
                  {!claimStatus.hasClaimed && claimStatus.eligible === null && (
                    <span className="text-dl-muted">
                      Not yet claimed. Load eligibility CSV to generate proof.
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Step 3 — Eligibility Proof */}
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-3">
              Step 3 — Eligibility Proof
            </h2>
            <p className="text-xs text-dl-muted mb-3">
              Paste the eligibility CSV (columns: address, amount). Your proof
              is generated locally — the CSV is not stored.
            </p>
            <textarea
              value={csvContent}
              onChange={e => setCsvContent(e.target.value)}
              placeholder={'address,amount\n0xABC...,1000000'}
              rows={4}
              className="w-full font-mono text-xs bg-dl-surface border border-dl-border text-dl-primary px-3 py-2 focus:outline-none focus:border-dl-accent"
            />
            <div className="mt-3">
              <button
                onClick={generateProof}
                disabled={
                  loading ||
                  !csvContent.trim() ||
                  !walletAddress.trim() ||
                  !campaignId.trim()
                }
                className="w-full py-3 text-sm font-mono uppercase tracking-widest border border-dl-primary text-dl-primary disabled:border-dl-border disabled:text-dl-muted enabled:bg-dl-primary enabled:text-white"
              >
                {loading ? 'Generating…' : 'Generate Proof →'}
              </button>
              {(!csvContent.trim() ||
                !walletAddress.trim() ||
                !campaignId.trim()) && (
                <p className="text-xs text-dl-muted font-mono mt-2">
                  {!campaignId.trim()
                    ? 'Enter campaign ID in Step 2 first.'
                    : !walletAddress.trim()
                    ? 'Connect wallet or enter your address in Step 2.'
                    : 'Paste your eligibility CSV above.'}
                </p>
              )}
            </div>

            {proof && (
              <div className="mt-4 border border-dl-border p-4">
                <p className="text-xs font-mono text-dl-muted mb-2 uppercase tracking-widest">
                  Proof ({proof.length} siblings)
                </p>
                <div className="overflow-x-auto">
                  {proof.map((p, i) => (
                    <div
                      key={i}
                      className="font-mono text-xs text-dl-primary break-all"
                    >
                      [{i}] 0x{p}
                    </div>
                  ))}
                  {proof.length === 0 && (
                    <div className="font-mono text-xs text-dl-muted">
                      Single-leaf tree — empty proof (leaf is root)
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Step 4 — Submit Claim (shown when proof ready; persists while txDigest is set) */}
          {showStep5 && (
            <section className="mb-8">
              <h2 className="text-xs font-mono uppercase tracking-widest text-dl-muted mb-3">
                Step 4 — Submit Claim
              </h2>

              {/* Success panel persists even after hasClaimed refreshes to true */}
              {txDigest ? (
                <div className="border border-green-600 p-4 mb-4">
                  <p className="text-xs font-mono text-green-600 uppercase tracking-widest mb-2">
                    Claim Submitted Successfully
                  </p>
                  <p className="text-xs font-mono text-dl-muted mb-1">
                    Transaction Digest
                  </p>
                  <p className="text-xs font-mono text-dl-primary break-all mb-3">
                    {txDigest}
                  </p>
                  <a
                    href={`${SUISCAN_BASE}/${txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-mono uppercase tracking-widest border border-dl-primary text-dl-primary px-4 py-2"
                  >
                    View on Suiscan →
                  </a>
                </div>
              ) : (
                <>
                  <p className="text-xs text-dl-muted mb-4 leading-relaxed">
                    Your connected wallet will sign and broadcast the claim.
                    Already connected in Step 1? The session carries through —
                    no need to reconnect.
                  </p>

                  <div className="mb-4">
                    {/* Reuses the shared wallet session from Step 1 */}
                    <SuiWalletConnect
                      onAddressFilled={handleAddressFilled}
                      claimParams={claimParams}
                      onClaimSuccess={handleClaimSuccess}
                      onClaimError={handleClaimError}
                      disabled={loading}
                      sharedWallet={sharedWallet}
                      sharedAccount={sharedAccount}
                      onSharedConnect={handleSharedConnect}
                      onSharedDisconnect={handleSharedDisconnect}
                    />
                  </div>

                  {claimError && (
                    <div className="border border-red-400 p-3 text-xs font-mono text-red-500 mb-4">
                      CLAIM ERROR: {claimError}
                    </div>
                  )}

                  <details className="border border-dl-border">
                    <summary className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-dl-muted cursor-pointer select-none">
                      CLI fallback — Sui CLI command
                    </summary>
                    <div className="p-4 border-t border-dl-border bg-dl-surface">
                      <pre className="text-xs font-mono text-dl-primary whitespace-pre-wrap break-all leading-relaxed">
                        {[
                          `sui client ptb \\`,
                          proof!.length === 0
                            ? `  --make-move-vec "<vector<u8>>" "[]" \\`
                            : `  --make-move-vec "<vector<u8>>" "${JSON.stringify(
                                proof!.map(h =>
                                  h
                                    .match(/.{1,2}/g)
                                    ?.map(b => parseInt(b, 16)) ?? []
                                )
                              )}" \\`,
                          `  --assign proof \\`,
                          `  --move-call "${
                            packageId || '<PACKAGE_ID>'
                          }::claim_campaign::claim" \\`,
                          `    @${campaignId} proof \\`,
                          `  --gas-budget 10000000`,
                        ].join('\n')}
                      </pre>
                    </div>
                  </details>

                  <div className="mt-4 border border-dl-border p-4 bg-dl-surface">
                    <p className="text-xs font-mono text-dl-muted uppercase tracking-widest mb-2">
                      Transaction Parameters
                    </p>
                    <dl className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <dt className="text-dl-muted">Package</dt>
                      <dd className="text-dl-primary break-all">
                        {packageId || 'See operator'}
                      </dd>
                      <dt className="text-dl-muted">Module</dt>
                      <dd className="text-dl-primary">claim_campaign</dd>
                      <dt className="text-dl-muted">Function</dt>
                      <dd className="text-dl-primary">claim</dd>
                      <dt className="text-dl-muted">Campaign Object</dt>
                      <dd className="text-dl-primary break-all">
                        {campaignId}
                      </dd>
                      <dt className="text-dl-muted">Proof Nodes</dt>
                      <dd className="text-dl-primary">
                        {proof!.length}{' '}
                        {proof!.length === 0
                          ? '(single-leaf — empty proof)'
                          : ''}
                      </dd>
                    </dl>
                  </div>
                </>
              )}
            </section>
          )}

          {error && (
            <div className="border border-red-400 p-3 text-xs font-mono text-red-500">
              ERROR: {error}
            </div>
          )}

          <div className="mt-10 border-t border-dl-border pt-6 text-xs text-dl-muted font-mono">
            <p>
              COMMUNITY REWARDS ONLY. No monetary value. Not AXUSD, AXAU, AXM,
              SEED, or KAG.
            </p>
            <p>
              Not backed by any reserve. Not redeemable for any canonical
              asset.
            </p>
            <p className="mt-1">
              Network:{' '}
              {process.env.NEXT_PUBLIC_AXIOM_SUI_NETWORK ?? 'testnet'}
            </p>
          </div>
        </div>
      </DesignLawLayout>
    </>
  );
}
