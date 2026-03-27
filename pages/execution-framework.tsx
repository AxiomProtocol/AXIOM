import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

interface GefTierResponse {
  success: boolean;
  gefTier: string;
  creditLimit: number;
  hasActiveLine: boolean;
}

const TIERS = [
  {
    id: 'Observer',
    creditLimit: '$0',
    requirement: 'Wallet connected. No contribution record yet.',
    unlocks: 'Deal Flow, Property Analysis, community browsing',
    advancement: 'Join a Wealth Practice group and complete your first full contribution cycle.',
  },
  {
    id: 'Participant',
    creditLimit: '$1,500',
    requirement: 'Completed first full Wealth Practice cycle.',
    unlocks: 'Community Entry Credit line, deeper Deal Intelligence tools',
    advancement: 'Maintain consistent contributions across multiple cycles and participate in group governance.',
  },
  {
    id: 'Operator',
    creditLimit: '$5,000',
    requirement: 'Multi-cycle contributor with consistent record.',
    unlocks: 'Syndication LP access, earnest money credit, Sentinel advisory, RE bridge capital',
    advancement: 'Serve as a group facilitator or participate in multiple Wealth Practice groups.',
  },
  {
    id: 'Steward',
    creditLimit: '$10,000',
    requirement: 'Group facilitator or multi-group participant.',
    unlocks: 'Syndication structuring, Land Pipeline governance votes',
    advancement: 'Protocol-level participation: governance proposals, on-chain execution record.',
  },
  {
    id: 'Architect',
    creditLimit: '$25,000',
    requirement: 'Protocol-level participation and governance.',
    unlocks: 'Lending Fund borrowing, Secondary Network, full Operator stack',
    advancement: 'Terminal tier.',
  },
];

const TIER_ORDER = ['Observer', 'Participant', 'Operator', 'Steward', 'Architect'];

export default function ExecutionFrameworkPage() {
  const { address, isConnected } = useAccount();
  const [gefData, setGefData] = useState<GefTierResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setGefData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/community-credit/gef-tier?walletAddress=${encodeURIComponent(address)}`)
      .then(r => r.json())
      .then((data: GefTierResponse) => {
        if (data.success) setGefData(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address, isConnected]);

  const currentTierIndex = gefData ? TIER_ORDER.indexOf(gefData.gefTier) : -1;

  return (
    <DesignLawLayout>
      <Head>
        <title>Graduated Execution Framework — Axiom Protocol</title>
        <meta name="description" content="Your participation record. Your platform access level. Your protocol credit score." />
      </Head>

      <div className="mb-10">
        <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono mb-2">Operations</p>
        <SectionHeading>Graduated Execution Framework</SectionHeading>
        <p className="text-dl-gray text-sm leading-relaxed mt-3 max-w-2xl">
          Your participation record. Your platform access level. Your protocol credit score.
          GEF tier is determined by contribution history, cycle completions, and governance participation
          — not capital size.
        </p>
      </div>

      {isConnected && address && (
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-10">
          <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono mb-3">Your Status</p>
          {loading ? (
            <p className="text-sm text-dl-gray font-dl-mono">Fetching tier...</p>
          ) : gefData ? (
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-xs text-dl-gray font-dl-mono mb-1">Wallet</p>
                <p className="font-dl-mono text-sm text-dl-navy">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
              <div>
                <p className="text-xs text-dl-gray font-dl-mono mb-1">GEF Tier</p>
                <p className="font-dl-mono text-sm font-bold text-dl-navy">{gefData.gefTier}</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray font-dl-mono mb-1">Credit Limit</p>
                <p className="font-dl-mono text-sm text-dl-navy">
                  {gefData.creditLimit === 0 ? '$0' : `$${gefData.creditLimit.toLocaleString()}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-dl-gray font-dl-mono mb-1">Active Credit Line</p>
                <p className="font-dl-mono text-sm text-dl-navy">{gefData.hasActiveLine ? 'Yes' : 'None'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-dl-gray">Could not load tier data.</p>
          )}
        </div>
      )}

      {!isConnected && (
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-10">
          <p className="text-sm text-dl-gray">
            Connect your wallet using the button in the top right to see your current GEF tier.
          </p>
        </div>
      )}

      <div className="mb-12">
        <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono mb-4">Tier Progression</p>
        <div className="border border-dl-border">
          <div className="hidden md:grid grid-cols-5 bg-dl-navy px-6 py-3">
            <p className="text-xs text-white uppercase tracking-widest font-dl-mono">Tier</p>
            <p className="text-xs text-white uppercase tracking-widest font-dl-mono">Credit Limit</p>
            <p className="text-xs text-white uppercase tracking-widest font-dl-mono col-span-2">Requirement</p>
            <p className="text-xs text-white uppercase tracking-widest font-dl-mono">Unlocks</p>
          </div>
          {TIERS.map((tier, i) => {
            const isActive = gefData?.gefTier === tier.id;
            const isPast = currentTierIndex > i;
            return (
              <div
                key={tier.id}
                className={`border-b border-dl-border last:border-b-0 px-6 py-5 ${
                  isActive ? 'border-l-4 border-l-dl-forest bg-dl-bg' : 'bg-dl-bg-alt'
                }`}
              >
                <div className="md:hidden mb-3">
                  <span className={`font-dl-mono text-sm font-bold ${isActive ? 'text-dl-forest' : isPast ? 'text-dl-gray line-through' : 'text-dl-navy'}`}>
                    {tier.id}
                  </span>
                  {isActive && (
                    <span className="ml-2 text-xs text-dl-forest font-dl-mono uppercase tracking-widest">
                      Current
                    </span>
                  )}
                </div>
                <div className="md:grid md:grid-cols-5 md:gap-4 md:items-start">
                  <div className="hidden md:block">
                    <span className={`font-dl-mono text-sm font-bold ${isActive ? 'text-dl-forest' : isPast ? 'text-dl-gray' : 'text-dl-navy'}`}>
                      {tier.id}
                    </span>
                    {isActive && (
                      <p className="text-xs text-dl-forest font-dl-mono uppercase tracking-widest mt-1">
                        Current
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="md:hidden text-xs text-dl-gray font-dl-mono mb-0.5">Credit</p>
                    <p className="font-dl-mono text-sm text-dl-navy">{tier.creditLimit}</p>
                  </div>
                  <div className="md:col-span-2 mt-2 md:mt-0">
                    <p className="md:hidden text-xs text-dl-gray font-dl-mono mb-0.5">Requirement</p>
                    <p className="text-sm text-dl-gray">{tier.requirement}</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <p className="md:hidden text-xs text-dl-gray font-dl-mono mb-0.5">Unlocks</p>
                    <p className="text-sm text-dl-gray">{tier.unlocks}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {gefData && gefData.gefTier !== 'Architect' && currentTierIndex >= 0 && (
        <div className="border border-dl-border bg-dl-bg p-6 mb-12">
          <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono mb-2">
            Advancing from {gefData.gefTier}
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            {TIERS[currentTierIndex]?.advancement}
          </p>
          {gefData.gefTier === 'Observer' && (
            <div className="flex flex-wrap gap-3 mt-4">
              <Link href="/wealth-practice" className="px-5 py-2 bg-dl-navy text-white text-sm font-medium">
                Join Wealth Practice
              </Link>
              <Link href="/community-credit" className="px-5 py-2 border border-dl-border text-dl-navy text-sm font-medium">
                Community Entry Credit
              </Link>
            </div>
          )}
          {gefData.gefTier === 'Participant' && (
            <div className="flex flex-wrap gap-3 mt-4">
              <Link href="/wealth-practice" className="px-5 py-2 bg-dl-navy text-white text-sm font-medium">
                Wealth Practice Dashboard
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mb-12">
        <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono mb-4">How Advancement Works</p>
        <div className="border border-dl-border">
          {[
            {
              q: 'What triggers a tier advancement?',
              a: 'Completing a Wealth Practice cycle as a contributing member triggers automatic evaluation. Consistent contribution history, governance participation, and cycle completion drive advancement — not capital size.',
            },
            {
              q: 'Can my tier go down?',
              a: 'Outstanding credit balances or missed contributions pause tier advancement. Tier degradation can occur if you accrue GEF violations (missed cycles, unresolved credit obligations).',
            },
            {
              q: 'What is a GEF violation?',
              a: 'A GEF violation is flagged when a credit line is not repaid by the repayment deadline, or when a contribution cycle is missed without a recorded smoothing event. Violations pause access to credit and tier advancement.',
            },
            {
              q: 'How does GEF tier affect lending fund access?',
              a: 'Real estate bridge capital is reserved for Operator tier and above. Observer and Participant tier members can access Community Entry Credit (up to $1,500) but not the Lending Fund borrower tools.',
            },
            {
              q: 'Is there a minimum capital requirement?',
              a: 'No. GEF is a participation record — not an asset threshold. Wealth Practice groups set their own contribution amounts, some starting as low as $50 per cycle.',
            },
          ].map((item, i, arr) => (
            <div key={i} className={`px-6 py-5 ${i < arr.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
              <p className="font-dl-mono text-sm font-semibold text-dl-navy mb-2">{item.q}</p>
              <p className="text-sm text-dl-gray leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-dl-border bg-dl-bg-alt p-6">
        <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono mb-4">Related</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/wealth-practice" className="px-5 py-2 bg-dl-navy text-white text-sm font-medium">
            Wealth Practice
          </Link>
          <Link href="/community-credit" className="px-5 py-2 border border-dl-border text-dl-navy text-sm font-medium">
            Community Credit
          </Link>
          <Link href="/start" className="px-5 py-2 border border-dl-border text-dl-navy text-sm font-medium">
            Getting Started
          </Link>
          <Link href="/lending-fund" className="px-5 py-2 border border-dl-border text-dl-navy text-sm font-medium">
            Lending Fund
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
