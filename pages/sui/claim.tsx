import type { NextPage } from 'next';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { SuiConnectButton } from '../../components/sui/SuiConnectButton';
import { ClaimCard } from '../../components/sui/ClaimCard';
import type { PageClaimState } from '../../components/sui/ClaimCard';
import type { ClaimTxStatus } from '../../components/sui/ClaimStatus';

// =============================================================================
// Sui Claim Page — Phase 9 Production
//
// COMMUNITY REWARDS LAYER — NON-FINANCIAL
// NOT AXUSD. NOT AXAU. NOT AXM. NOT SEED. NOT KAG.
// No reserve backing. No monetary value. Not redeemable.
// Community distribution only.
// =============================================================================

const CAMPAIGN_ID = 'phase9-mainnet-candidate';
const MAINNET_NETWORK = 'mainnet' as const;

// Dynamically import the wallet hook — client only
const SuiClaimPageInner = dynamic(() => import('../../components/sui/SuiClaimInner'), {
  ssr: false,
  loading: () => (
    <div className="font-mono text-xs text-dl-muted animate-pulse">
      Loading claim interface...
    </div>
  ),
});

const SuiClaimPage: NextPage = () => {
  return (
    <DesignLawLayout>
      <div className="max-w-2xl">
        {/* Community Rewards Notice */}
        <div className="border border-dl-border bg-dl-bg px-5 py-4 mb-8">
          <p className="font-mono text-xs text-dl-heading uppercase tracking-widest mb-2">
            COMMUNITY REWARDS LAYER — NON-FINANCIAL
          </p>
          <p className="text-sm text-dl-muted leading-relaxed">
            Tokens distributed here have{' '}
            <strong className="text-dl-fg">no monetary value</strong>. This is{' '}
            <strong className="text-dl-fg">
              NOT AXUSD, NOT AXAU, NOT AXM, NOT SEED, NOT KAG
            </strong>{' '}
            and not any canonical Axiom Protocol asset. Nothing here is backed
            by any reserve or redeemable for any financial instrument.
          </p>
        </div>

        {/* Header */}
        <h1 className="font-serif text-3xl text-dl-heading mb-2">
          Axiom Community Claim
        </h1>
        <p className="text-dl-muted text-sm mb-8 font-mono">
          Network: Sui Mainnet · Campaign: Phase 9 Mainnet Candidate
        </p>

        <SuiClaimPageInner campaignId={CAMPAIGN_ID} network={MAINNET_NETWORK} />
      </div>
    </DesignLawLayout>
  );
};

export default SuiClaimPage;
