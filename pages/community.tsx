import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

const PIPELINE_STAGES = [
  {
    stage: 'Stage 1 — Wealth Practice',
    status: 'LIVE',
    desc: 'Structured rotating group savings on Arbitrum One. Members contribute on defined cycles, receive their payout in sequence, and build an on-chain contribution history. Each cycle is recorded and immutable — no manual ledger required.',
    details: ['2–50 members per group', 'Daily to monthly cycle durations', 'AXM or ERC20 contribution token', 'Groups currently forming — no completed broad-cycle data yet'],
  },
  {
    stage: 'Stage 2 — Capital Readiness',
    status: 'LIVE',
    desc: 'Members who complete their first Wealth Practice cycle graduate to the capital readiness gate. On-chain contribution history and Axiom Score SBT inform readiness for fund participation. Capital Readiness Card computes eligible funding tiers.',
    details: ['On-chain Axiom Score SBT (300–850 range)', 'Capital Readiness Card analysis', 'SEED Participation Lockup (CONFIGURED-INACTIVE — activation pending)', 'Eligibility review for accredited investor pathways'],
  },
  {
    stage: 'Stage 3 — Syndication & Land',
    status: 'CONFIGURED-INACTIVE',
    desc: 'Graduated members may access SEC Reg D 506(c) fund participation and land acquisition pathways. Secondary market transfer capability is planned pending Canonical PSM activation and addAgent() governance vote.',
    details: ['SEC Reg D 506(c) — Accredited investors only', 'FixFlip / DSCR LP vaults (deployed)', 'Land Option Registry ERC1155 (deployed)', 'Canonical PSM activation required for full settlement loop'],
  },
];

export default function CommunityPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Community Capital Formation | Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol community capital formation pipeline — The Wealth Practice, capital readiness, and institutional fund access on Arbitrum One." />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">Community Capital Formation</h1>
      <p className="text-sm text-dl-gray mb-1">Structured group capital formation on Arbitrum One — from group savings to institutional fund access via a three-stage trust pipeline.</p>
      <p className="text-xs text-dl-gray font-dl-mono mb-4">Wealth Practice Hub: LIVE on Arbitrum One · Groups currently forming · No completed broad-cycle performance data</p>

      <div className="border border-dl-border mb-4 px-5 py-3 bg-dl-bg-alt">
        <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">
          The Wealth Practice is in early-stage formation. The on-chain hub contract is deployed and live on Arbitrum One. Active groups are being seeded. No completed multi-cycle performance data exists as of this disclosure. All claims on this page describe protocol design and current deployment status — not historical outcomes, individual returns, or guarantees of future performance.
        </p>
      </div>

      <div className="border border-dl-border mb-8 px-5 py-3 bg-dl-bg">
        <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">
          <span className="text-dl-navy font-semibold">Custody model:</span> On-chain pools use a non-custodial group coordination model — member funds are held in the Wealth Practice Hub automated control layer on Arbitrum One, not by Axiom Protocol directly. For off-chain coordination (Interest Hub stage), contributions are facilitated by the operations team via bank rails. Axiom Protocol does not guarantee payout timing or cycle completion. Members retain exit rights per group agreement terms. This is not a deposit product and is not FDIC-insured.
        </p>
      </div>

      <section className="mb-10">
        <SectionHeading>Protocol Infrastructure</SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
          {[
            { value: 'LIVE', label: 'Wealth Practice Hub' },
            { value: '3-Stage', label: 'Trust Pipeline' },
            { value: 'On-Chain', label: 'Contribution Records' },
            { value: 'Arbitrum One', label: 'Settlement Layer' },
          ].map((stat, i) => (
            <div key={i} className="px-4 py-4 bg-dl-bg border-r border-b md:border-b-0 border-dl-border last:border-r-0 text-center">
              <div className="font-dl-mono text-lg font-semibold text-dl-navy">{stat.value}</div>
              <div className="text-xs text-dl-gray mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading>Three-Stage Trust Pipeline</SectionHeading>
        <div className="border border-dl-border divide-y divide-dl-border">
          {PIPELINE_STAGES.map((item) => (
            <div key={item.stage} className="px-5 py-5">
              <div className="flex items-start justify-between mb-2">
                <p className="font-dl-serif text-base text-dl-navy">{item.stage}</p>
                <span className={`font-dl-mono text-xs border px-2 py-0.5 flex-shrink-0 ml-3 ${item.status === 'LIVE' ? 'border-dl-forest text-dl-forest' : 'border-dl-gold text-dl-gold'}`}>{item.status}</span>
              </div>
              <p className="text-sm text-dl-gray leading-relaxed mb-3">{item.desc}</p>
              <ul className="space-y-1">
                {item.details.map((d) => (
                  <li key={d} className="font-dl-mono text-xs text-dl-gray">· {d}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading>Trust Anchors</SectionHeading>
        <div className="border border-dl-border divide-y divide-dl-border">
          {[
            { label: 'Wealth Practice Hub Contract', desc: '0x6C69D730327930B49A7997B7b5fb0865F30c95A5 — on-chain rotating savings group engine with three-stage trust pipeline. Status: LIVE.', href: 'https://arbiscan.io/address/0x6C69D730327930B49A7997B7b5fb0865F30c95A5' },
            { label: 'Axiom Score SBT', desc: '0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008 — ERC-5192 soulbound credit scoring token. Non-transferable on-chain contribution history. Status: LIVE.', href: 'https://arbiscan.io/address/0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008' },
            { label: 'SUSU Insurance Fund', desc: '0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F — 5% of node rewards diverted to cover default protection for broken savings circles. Status: LIVE.', href: 'https://arbiscan.io/address/0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F' },
            { label: 'Solvency Dashboard', desc: 'Live CR/RR/LBR ratios, reserve composition, and AME stress scenarios for the protocol treasury that backs community settlements.', href: '/solvency' },
            { label: 'Protocol Trust Index', desc: 'Full registry of all 53 automated control layers on Arbitrum One including Wealth Practice, SEED Lockup, and community governance contracts.', href: '/transparency' },
          ].map((item) => (
            <div key={item.label} className="px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-dl-mono text-xs text-dl-navy font-semibold mb-1">{item.label}</p>
                <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">{item.desc}</p>
              </div>
              <Link href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined} className="font-dl-mono text-xs text-dl-navy underline flex-shrink-0">View &rarr;</Link>
            </div>
          ))}
        </div>
      </section>
    </DesignLawLayout>
  );
}
