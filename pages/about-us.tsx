import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../components/design-law';

const THESIS_CARDS = [
  { label: 'Core thesis', value: 'Infrastructure first', note: 'Ownership scales when capital and reporting scale.' },
  { label: 'Program focus', value: 'Structured capital', note: 'Clear mandate, clear deployment, clear oversight.' },
  { label: 'Transparency', value: 'On chain reporting', note: 'Auditable signals, not marketing claims.' },
];

const AXIOM_IS = [
  'Real asset capital infrastructure with transparent reporting',
  'Program based deployment model with defined rules',
  'Governance oriented operations with a clean audit trail',
];

const AXIOM_IS_NOT = [
  'A meme driven token story',
  'A black box fund with unclear use of proceeds',
  'A yield promise without risk disclosure and controls',
];

const ACCOUNTABILITY = [
  { title: 'Leadership', description: 'Responsible for mandate definition, capital allocation policy, and execution standards.' },
  { title: 'Governance', description: 'Controls, permissions, and oversight. Ensures program rules are enforceable and visible.' },
  { title: 'Reporting', description: 'Metrics and disclosures that align with institutional expectations and auditability.' },
];

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
        <meta name="description" content="Axiom Protocol builds community ownership infrastructure for real assets through transparent capital programs, on chain reporting, and disciplined governance." />
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-4 font-dl-mono">About Axiom Protocol</p>
        <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          Capital infrastructure for community owned real assets
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed mb-4">
          Axiom Protocol is designed to make real asset ownership investable, transparent, and governable.
          The focus is not hype. The focus is disciplined execution: acquire or finance real assets,
          report performance with institutional grade clarity, and protect capital with explicit controls.
        </p>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          Built from real execution — a community farmland purchase, development work, and a founder-led infrastructure roadmap —
          Axiom exists to turn what already worked into a repeatable system that can scale responsibly.
        </p>
      </div>

      <div className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
          {THESIS_CARDS.map((card, i) => (
            <div
              key={card.label}
              className={`px-6 py-5 ${i < THESIS_CARDS.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">{card.label}</p>
              <p className="font-dl-serif text-lg text-dl-navy font-semibold mb-1">{card.value}</p>
              <p className="text-sm text-dl-gray leading-relaxed">{card.note}</p>
            </div>
          ))}
        </div>
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
        <SectionHeading>The Capital Program narrative</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
          <p className="text-sm text-dl-gray leading-relaxed">
            The Capital Program exists to convert real world execution into a repeatable system.
            That means disciplined underwriting, explicit capital controls, and clear reporting.
            Each deployment is treated like an operating mandate: objectives, constraints, governance,
            and measurable outcomes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
          <div className="px-6 py-5 border-b md:border-b-0 md:border-r border-dl-border bg-dl-bg">
            <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-3">What Axiom is</h3>
            <ul className="space-y-2">
              {AXIOM_IS.map((item) => (
                <li key={item} className="text-sm text-dl-gray leading-relaxed">— {item}</li>
              ))}
            </ul>
          </div>
          <div className="px-6 py-5 bg-dl-bg-alt">
            <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-3">What Axiom is not</h3>
            <ul className="space-y-2">
              {AXIOM_IS_NOT.map((item) => (
                <li key={item} className="text-sm text-dl-gray leading-relaxed">— {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Leadership, governance, and accountability</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
          <p className="text-sm text-dl-gray leading-relaxed">
            Axiom is built around explicit decision rights and measurable accountability.
            The goal is simple: protect capital, enforce program rules, and maintain integrity of reporting.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
          {ACCOUNTABILITY.map((item, i) => (
            <div
              key={item.title}
              className={`px-6 py-5 ${i < ACCOUNTABILITY.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-2">{item.title}</h3>
              <p className="text-sm text-dl-gray leading-relaxed">{item.description}</p>
            </div>
          ))}
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
          <Link href="/">
            <SolidButton variant="secondary">Back to home</SolidButton>
          </Link>
          <Link href="/pilot">
            <SolidButton>View Capital Program</SolidButton>
          </Link>
          <Link href="/transparency">
            <SolidButton variant="secondary">Transparency Reports</SolidButton>
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
