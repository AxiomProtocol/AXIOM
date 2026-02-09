import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../components/design-law';

const STEPS = [
  {
    num: '1',
    title: 'Review the Structure',
    description: 'Examine transparency reports, audit trails, SPV documentation, and treasury allocation policies. Understand how capital flows through the system before participating.',
  },
  {
    num: '2',
    title: 'Access the Platform',
    description: 'Connect your custody account on Arbitrum One. View live dashboards, capital positions, governance tools, and audit records.',
  },
  {
    num: '3',
    title: 'Participate with Intent',
    description: 'Engage with the Capital Program, Lending Fund, or Exchange based on your qualification, risk tolerance, and objectives.',
  },
];

const MODEL_SECTIONS = [
  {
    title: 'Structured SPVs',
    description: 'Capital is deployed through Special Purpose Vehicles, each targeting a specific asset class. SPV-1 focuses on cash-flow-generating multifamily property. SPV-2 targets commercial appreciation. Each SPV operates independently with its own financials and reporting.',
  },
  {
    title: 'Treasury Allocation Policy',
    description: 'Every dollar raised follows a fixed 35/35/20/10 allocation: 35% property equity, 35% debt service, 20% operating reserve, 10% protocol development. This policy is enforced programmatically and reported transparently.',
  },
  {
    title: 'Institutional Reporting',
    description: 'All capital movements, distributions, and governance actions are recorded with full audit trails. Financial reports, compliance logs, and performance metrics are available to qualified participants through the Capital Program dashboard.',
  },
  {
    title: 'On-Chain Settlement',
    description: 'The protocol operates on Arbitrum One with 23 verified smart contracts. All material transactions are recorded on-chain for independent verification. The Institutional Observer provides read-only access to treasury and governance data.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Do I need technical knowledge to participate?',
    a: 'No. The platform is designed to function as institutional financial infrastructure. You need a custody account on Arbitrum One, but the interface operates like a standard reporting dashboard.',
  },
  {
    q: 'How is capital protected?',
    a: 'Capital is allocated through a fixed treasury policy (35/35/20/10), held in structured SPVs with independent reporting, and backed by real property. Operating reserves provide liquidity buffer. All movements are audited.',
  },
  {
    q: 'Who can participate in the Capital Program?',
    a: 'The Capital Program is designed for 20-30 qualified participants. Qualification requirements and risk disclosures are available in the program documentation.',
  },
  {
    q: 'How are decisions made?',
    a: 'Governance actions are recorded on-chain with full audit trails. The AXM governance asset provides structured participation in protocol decisions. All governance activity is visible through the Observer dashboard.',
  },
];

export default function HowItWorksPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>How It Works — Axiom Protocol</title>
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-4 font-dl-mono">How It Works</p>
        <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          From Structure to Participation
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          Axiom coordinates community-led real asset ownership through structured SPVs, transparent treasury allocation,
          and institutional-grade reporting. Here is how the model functions.
        </p>
      </div>

      <div className="mb-12">
        <SectionHeading>Participation Path</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`px-6 py-6 ${i < STEPS.length - 1 ? 'md:border-r border-b md:border-b-0 border-dl-border' : ''}`}
            >
              <p className="font-dl-mono text-2xl text-dl-navy font-bold mb-2">{step.num}</p>
              <h3 className="font-dl-serif text-base text-dl-navy mb-2">{step.title}</h3>
              <p className="text-sm text-dl-gray leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>The Model</SectionHeading>
        <div className="border border-dl-border">
          {MODEL_SECTIONS.map((section, i) => (
            <div
              key={section.title}
              className={`px-6 py-5 ${i < MODEL_SECTIONS.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-2">{section.title}</h3>
              <p className="text-sm text-dl-gray leading-relaxed">{section.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Common Questions</SectionHeading>
        <div className="border border-dl-border">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`px-6 py-5 ${i < FAQ_ITEMS.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              <p className="font-dl-serif text-sm text-dl-navy font-medium mb-2">{item.q}</p>
              <p className="text-sm text-dl-gray leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          <Link href="/pilot">
            <SolidButton>View Capital Program</SolidButton>
          </Link>
          <Link href="/transparency">
            <SolidButton variant="secondary">Transparency Reports</SolidButton>
          </Link>
          <Link href="/observer">
            <SolidButton variant="secondary">Observer Dashboard</SolidButton>
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
