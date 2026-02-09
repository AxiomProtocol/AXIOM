import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../components/design-law';

const PRINCIPLES = [
  { title: 'Transparency', description: 'Every capital movement, governance decision, and operational action is recorded with full audit trails. Verifiable records replace informal trust.' },
  { title: 'Coordination', description: 'Structure and shared rules create reliable collaboration. Defined roles, accountability loops, and evidence-based processes replace ad-hoc decision making.' },
  { title: 'Security', description: 'Multi-signature controls, audited smart contracts, and privacy by default. 23 verified contracts on Arbitrum One provide independent auditability.' },
  { title: 'Discipline', description: 'Measured onboarding, fixed treasury allocation policies, and institutional-grade reporting. No speculation, no hype, no shortcuts.' },
];

const MILESTONES = [
  { period: '2023', event: 'Community farmland acquisition — 6+ acres of community-owned land, USDA-supported development' },
  { period: '2024', event: 'Axiom Protocol concept development, smart contract architecture design, and initial infrastructure buildout' },
  { period: 'Q1 2025', event: '23 verified smart contracts deployed on Arbitrum One, DEX V2 ecosystem with 10 mainnet contracts' },
  { period: 'Q2 2025', event: 'Capital Program launch — $1M dual-asset program with two SPVs, institutional reporting, and compliance audit trails' },
  { period: 'Q3 2025', event: 'Lending Fund operational — SEC Reg D 506(c) compliant bridge loan fund for real asset acquisition' },
  { period: 'Q1 2026', event: 'Market Intelligence Terminal, Institutional Observer dashboard, and expanded platform infrastructure' },
];

export default function AboutUsPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>About — Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol is community ownership infrastructure for real assets, built from real execution." />
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-4 font-dl-mono">About Axiom Protocol</p>
        <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          Structure Over Speculation
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed mb-4">
          Axiom Protocol is community ownership infrastructure for real assets. We provide the coordination tools,
          treasury structure, and reporting systems that make shared ownership work at scale.
        </p>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          Built from real execution — a community farmland purchase, development work, and a founder-led infrastructure roadmap —
          Axiom exists to turn what already worked into a repeatable system that can scale responsibly.
        </p>
      </div>

      <div className="mb-12">
        <SectionHeading>Mission</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            Most groups fail at shared ownership because coordination breaks down. Capital gets deployed without structure.
            Decisions are made informally. Records are incomplete. Disputes arise from ambiguity, not disagreement.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            Axiom solves this by providing the economic infrastructure — structured SPVs, fixed treasury allocation policies,
            on-chain audit trails, and institutional-grade reporting — so communities can own real assets together with
            the same rigor and transparency expected of institutional programs.
          </p>
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Operating Principles</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.title}
              className={`px-6 py-5 ${i < 2 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'md:border-r border-dl-border bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-2">{p.title}</h3>
              <p className="text-sm text-dl-gray leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Timeline</SectionHeading>
        <div className="border border-dl-border">
          {MILESTONES.map((m, i) => (
            <div
              key={i}
              className={`px-6 py-4 flex flex-col md:flex-row md:items-start gap-2 md:gap-6 ${i < MILESTONES.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              <p className="font-dl-mono text-sm text-dl-navy font-semibold w-24 flex-shrink-0">{m.period}</p>
              <p className="text-sm text-dl-gray leading-relaxed">{m.event}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Disclosure</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt">
          <p className="text-xs text-dl-gray leading-relaxed mb-3">
            Axiom Protocol provides coordination infrastructure and reporting tools. Nothing on this platform constitutes
            legal, financial, or tax advice. No outcomes are guaranteed. All participation carries material risk including
            total loss of capital.
          </p>
          <p className="text-xs text-dl-gray leading-relaxed">
            Participants are responsible for their own decisions and should consult qualified professionals for specific guidance.
            Axiom does not claim endorsement by or affiliation with any external authors, institutions, or organizations.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          <Link href="/pilot">
            <SolidButton>View Capital Program</SolidButton>
          </Link>
          <Link href="/how-it-works">
            <SolidButton variant="secondary">How It Works</SolidButton>
          </Link>
          <Link href="/transparency">
            <SolidButton variant="secondary">Transparency Reports</SolidButton>
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
