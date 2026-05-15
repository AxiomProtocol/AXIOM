import type { NextPage } from 'next';
import { useState } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

// =============================================================================
// Sui Claim Page — Phase 8 Staging UI
//
// TESTNET ONLY. No monetary value.
// NOT AXUSD. NOT AXAU. NOT AXM. NOT any canonical Axiom asset.
// This page is for staging validation only.
// =============================================================================

type ClaimState =
  | 'idle'
  | 'checking'
  | 'eligible'
  | 'not_eligible'
  | 'already_claimed'
  | 'campaign_inactive'
  | 'campaign_closed'
  | 'proof_unavailable'
  | 'error';

interface EligibilityData {
  amountPerClaim?: string;
  proof?: string[];
  reason?: string;
}

const CAMPAIGN_ID = 'phase6-smoke-campaign';

const STATE_MESSAGES: Record<ClaimState, { title: string; body: string; tone: 'neutral' | 'ok' | 'warn' | 'block' }> = {
  idle: { title: '', body: '', tone: 'neutral' },
  checking: { title: 'Checking eligibility...', body: 'Querying campaign state.', tone: 'neutral' },
  eligible: {
    title: 'Address is eligible',
    body: 'This address has an unclaimed allocation. Claim functionality is available in staging.',
    tone: 'ok',
  },
  not_eligible: {
    title: 'Address not eligible',
    body: 'This address is not in the current campaign eligibility tree.',
    tone: 'warn',
  },
  already_claimed: {
    title: 'Already claimed',
    body: 'This address has already claimed its allocation from this campaign.',
    tone: 'warn',
  },
  campaign_inactive: {
    title: 'Campaign inactive',
    body: 'This campaign is currently paused. Claims are not available.',
    tone: 'block',
  },
  campaign_closed: {
    title: 'Campaign closed',
    body: 'This campaign has been permanently closed. No further claims are possible.',
    tone: 'block',
  },
  proof_unavailable: {
    title: 'Proof data unavailable',
    body: 'Eligibility proof data has not been loaded for this campaign. Contact the operator.',
    tone: 'block',
  },
  error: {
    title: 'Check failed',
    body: 'Unable to verify eligibility. Please try again.',
    tone: 'warn',
  },
};

const SuiClaimPage: NextPage = () => {
  const [address, setAddress] = useState('');
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [eligibilityData, setEligibilityData] = useState<EligibilityData>({});

  const isValidAddress = /^0x[0-9a-fA-F]{1,64}$/.test(address.trim());

  const handleCheckEligibility = async () => {
    if (!isValidAddress) return;
    setClaimState('checking');
    setEligibilityData({});

    try {
      const res = await fetch('/api/sui/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), campaignId: CAMPAIGN_ID }),
      });

      if (!res.ok) {
        setClaimState('error');
        return;
      }

      const data = await res.json();

      if (data.eligible) {
        setEligibilityData({ amountPerClaim: data.amountPerClaim, proof: data.proof });
        setClaimState('eligible');
      } else {
        setEligibilityData({ reason: data.reason });
        setClaimState((data.reason as ClaimState) ?? 'not_eligible');
      }
    } catch {
      setClaimState('error');
    }
  };

  const stateInfo = STATE_MESSAGES[claimState];

  const toneColors: Record<'neutral' | 'ok' | 'warn' | 'block', string> = {
    neutral: 'border-dl-border',
    ok: 'border-green-700',
    warn: 'border-yellow-700',
    block: 'border-red-800',
  };

  return (
    <DesignLawLayout>
      <div className="max-w-2xl">
        {/* Testnet Warning Banner */}
        <div className="border border-red-800 bg-red-950/20 px-5 py-3 mb-8">
          <p className="font-mono text-xs text-red-400 uppercase tracking-widest mb-1">
            TESTNET ONLY — STAGING ENVIRONMENT
          </p>
          <p className="text-sm text-dl-muted">
            This page is for Phase 8 staging validation. Tokens dispensed here have{' '}
            <strong className="text-dl-fg">no monetary value</strong>. This is{' '}
            <strong className="text-dl-fg">NOT AXUSD, NOT AXAU, NOT AXM</strong>, and not
            any canonical Axiom Protocol asset. Nothing here is backed by any reserve.
          </p>
        </div>

        {/* Page Header */}
        <h1 className="font-serif text-3xl text-dl-heading mb-2">
          Sui Claim — ATC Testnet
        </h1>
        <p className="text-dl-muted text-sm mb-8 font-mono">
          Package:{' '}
          <span className="text-dl-fg text-xs">
            0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602
          </span>
          {' '}· Testnet
        </p>

        {/* Campaign Info */}
        <section className="border border-dl-border p-5 mb-8">
          <h2 className="font-serif text-lg text-dl-heading mb-4">Campaign Status</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-dl-muted font-mono text-xs uppercase">Campaign</dt>
            <dd className="text-dl-fg font-mono text-xs">Phase 6 Smoke Test</dd>
            <dt className="text-dl-muted font-mono text-xs uppercase">Network</dt>
            <dd className="text-dl-fg font-mono text-xs">Sui Testnet</dd>
            <dt className="text-dl-muted font-mono text-xs uppercase">Status</dt>
            <dd className="text-red-400 font-mono text-xs">CLOSED</dd>
            <dt className="text-dl-muted font-mono text-xs uppercase">Token</dt>
            <dd className="text-dl-fg font-mono text-xs">ATC (No monetary value)</dd>
          </dl>
        </section>

        {/* Eligibility Checker */}
        <section className="border border-dl-border p-5 mb-8">
          <h2 className="font-serif text-lg text-dl-heading mb-4">Check Eligibility</h2>
          <div className="mb-4">
            <label className="block font-mono text-xs text-dl-muted uppercase mb-2">
              Sui Wallet Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (claimState !== 'idle') setClaimState('idle');
              }}
              placeholder="0x000000..."
              className="w-full bg-dl-bg border border-dl-border px-3 py-2 font-mono text-sm text-dl-fg placeholder-dl-muted focus:outline-none focus:border-dl-heading"
            />
            {address && !isValidAddress && (
              <p className="mt-1 font-mono text-xs text-red-400">
                Address must start with 0x followed by up to 64 hex characters.
              </p>
            )}
          </div>

          <button
            onClick={handleCheckEligibility}
            disabled={!isValidAddress || claimState === 'checking'}
            className="px-6 py-2 font-mono text-sm bg-dl-heading text-dl-bg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            {claimState === 'checking' ? 'Checking...' : 'Check Eligibility'}
          </button>
        </section>

        {/* Eligibility Result */}
        {claimState !== 'idle' && claimState !== 'checking' && (
          <section className={`border p-5 mb-8 ${toneColors[stateInfo.tone]}`}>
            <h2 className="font-serif text-lg text-dl-heading mb-2">{stateInfo.title}</h2>
            <p className="text-sm text-dl-muted">{stateInfo.body}</p>

            {claimState === 'eligible' && eligibilityData.amountPerClaim && (
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-dl-muted font-mono text-xs uppercase">Allocation</dt>
                <dd className="text-dl-fg font-mono text-xs">
                  {(Number(eligibilityData.amountPerClaim) / 1_000_000).toFixed(6)} ATC
                </dd>
                <dt className="text-dl-muted font-mono text-xs uppercase">Proof depth</dt>
                <dd className="text-dl-fg font-mono text-xs">
                  {eligibilityData.proof?.length ?? 0} elements
                </dd>
              </dl>
            )}

            {/* Claim CTA — staging only */}
            {claimState === 'eligible' && (
              <div className="mt-5 border border-dl-border p-4">
                <p className="font-mono text-xs text-dl-muted mb-3">
                  Wallet connection and on-chain claim execution are Phase 9 scope.
                  In Phase 8 staging, claim transactions are submitted via Sui CLI PTB.
                </p>
                <button
                  disabled
                  className="px-6 py-2 font-mono text-sm bg-dl-heading text-dl-bg opacity-40 cursor-not-allowed"
                >
                  Claim (Phase 9)
                </button>
              </div>
            )}
          </section>
        )}

        {/* Proof Readiness */}
        <section className="border border-dl-border p-5 mb-8">
          <h2 className="font-serif text-lg text-dl-heading mb-4">Proof Toolchain Status</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            {[
              ['buildMerkleTree', 'READY'],
              ['generateProof', 'READY'],
              ['verifyProofLocal', 'READY'],
              ['validateEligibilityCsv', 'READY'],
              ['serializeProof', 'READY'],
              ['On-chain proof manifest', 'PHASE 9'],
              ['Wallet connect integration', 'PHASE 9'],
            ].map(([label, status]) => (
              <>
                <dt key={`dt-${label}`} className="text-dl-muted font-mono text-xs uppercase">{label}</dt>
                <dd
                  key={`dd-${label}`}
                  className={`font-mono text-xs ${status === 'READY' ? 'text-green-400' : 'text-yellow-400'}`}
                >
                  {status}
                </dd>
              </>
            ))}
          </dl>
        </section>

        <p className="font-mono text-xs text-dl-muted border-t border-dl-border pt-4">
          Phase 8 Staging — Axiom Protocol Sui Distribution Layer — Testnet Only
        </p>
      </div>
    </DesignLawLayout>
  );
};

export default SuiClaimPage;
