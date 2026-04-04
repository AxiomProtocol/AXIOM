import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../components/design-law';
import {
  ShieldCheck, Users, Lock, TrendingUp,
  Crown, Shield, FileText, Target, Layers,
  Building2, BarChart3, Globe
} from 'lucide-react';

const THESIS_CARDS = [
  { label: 'Core thesis', value: 'Infrastructure first', note: 'Ownership scales when capital and reporting scale.', icon: Layers },
  { label: 'Program focus', value: 'Structured capital', note: 'Clear mandate, clear deployment, clear oversight.', icon: Target },
  { label: 'Transparency', value: 'On-chain reporting', note: 'Auditable signals, not marketing claims.', icon: ShieldCheck },
];

const AXIOM_IS = [
  'Real asset capital infrastructure with transparent reporting',
  'Program-based deployment model with defined rules',
  'Governance-oriented operations with a clean audit trail',
];

const AXIOM_IS_NOT = [
  'A meme-driven instrument narrative',
  'A black box fund with unclear use of proceeds',
  'A yield promise without risk disclosure and controls',
];

const ACCOUNTABILITY = [
  { title: 'Leadership', description: 'Responsible for mandate definition, capital allocation policy, and execution standards.', icon: Crown },
  { title: 'Governance', description: 'Controls, permissions, and oversight. Ensures program rules are enforceable and visible.', icon: Shield },
  { title: 'Reporting', description: 'Metrics and disclosures that align with institutional expectations and auditability.', icon: FileText },
];

const PRINCIPLES = [
  { title: 'Transparency', description: 'Every capital movement, governance decision, and operational action is recorded with full audit trails. Verifiable records replace informal trust.', icon: ShieldCheck },
  { title: 'Coordination', description: 'Structure and shared rules create reliable collaboration. Defined roles, accountability loops, and evidence-based processes replace ad-hoc decision making.', icon: Users },
  { title: 'Security', description: 'Multi-party authorization controls, automated control layers, and privacy by default. Deployed automated control layers on Arbitrum One provide independent auditability. A third-party audit is on the development roadmap.', icon: Lock },
  { title: 'Discipline', description: 'Measured onboarding, fixed treasury allocation policies, and institutional-grade reporting. No speculation, no hype, no shortcuts.', icon: TrendingUp },
];

const MILESTONES = [
  { period: '2023', event: 'Community farmland acquisition initiative — USDA-supported development planning and land framework established', icon: Globe },
  { period: '2024', event: 'Axiom Protocol concept development, automated control layer architecture design, and initial infrastructure buildout', icon: Layers },
  { period: 'Q1 2025', event: 'Initial automated control layers deployed on Arbitrum One, DEX V2 ecosystem with mainnet contracts', icon: Building2 },
  { period: 'Q2 2025', event: 'Capital Program formation initiated — $1M dual-asset program with two SPVs, institutional reporting, and on-chain audit trails', icon: Target },
  { period: 'Q3 2025', event: 'Lending Fund infrastructure deployed — bridge loan fund designed to align with SEC Reg D 506(c) for real asset acquisition. Formation stage.', icon: BarChart3 },
  { period: 'Q4 2025', event: 'Banking infrastructure (Unit + BitGo), Syndication module, ERC-3643 Unified AXUSD, and DePIN node integration', icon: Building2 },
  { period: 'Q1 2026', event: 'Market Intelligence Terminal, Institutional Observer, Sentinel capital decision layer, and expanded platform infrastructure', icon: ShieldCheck },
  { period: 'Q2 2026', event: 'Deal Intelligence workspace, Distressed Property Feed, Investor Portal, and AI acquisition memo builder', icon: TrendingUp },
];

export default function AboutUsPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>About — Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol provides disciplined capital infrastructure for real asset ownership through transparent capital programs, risk visibility, and deterministic governance." />
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-forest uppercase tracking-widest mb-4 font-dl-mono">About Axiom Protocol</p>
        <h1 className="font-dl-serif text-2xl sm:text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          Disciplined capital infrastructure for real asset ownership
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed mb-4">
          Axiom Protocol is a governance-first financial operating system delivering reserve capital (AXAU),
          a settlement stablecoin (AXUSD), structured capital programs, and community wealth infrastructure
          — with full on-chain transparency on Arbitrum One.
        </p>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          Built from real execution — a community land initiative, USDA-supported development work, and a
          founder-led infrastructure roadmap — Axiom converts what already worked into a programmable,
          audit-traceable system that can scale responsibly.
        </p>
      </div>

      <div className="mb-12">
        <div className="w-full border border-dl-border border-l-4 border-l-dl-navy" style={{ height: '300px', overflow: 'hidden' }}>
          <img
            src="/images/about-hero.png"
            alt="Axiom Protocol institutional infrastructure"
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
          />
        </div>
      </div>

      <div className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
          {THESIS_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`px-6 py-5 border-l-4 border-l-dl-forest ${i < THESIS_CARDS.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-dl-forest" />
                  <p className="font-dl-mono text-xs text-dl-forest uppercase tracking-wider">{card.label}</p>
                </div>
                <p className="font-dl-serif text-lg text-dl-navy font-semibold mb-1">{card.value}</p>
                <p className="text-sm text-dl-gray leading-relaxed">{card.note}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Mission</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 border-l-4 border-l-dl-navy">
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

      <div className="h-px w-full mb-12" style={{ backgroundColor: '#2d5016' }} />

      <div className="mb-12">
        <SectionHeading>The Capital Program Narrative</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6 border-t-4 border-t-dl-gold">
          <p className="text-sm text-dl-gray leading-relaxed">
            The Capital Program exists to convert real-world execution into a repeatable system.
            That means disciplined underwriting, explicit capital controls, and clear reporting.
            Each deployment is treated like an operating mandate: objectives, constraints, governance,
            and measurable outcomes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
          <div className="px-6 py-5 border-b md:border-b-0 md:border-r border-dl-border bg-dl-bg border-l-4 border-l-dl-forest">
            <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-3">What Axiom is</h3>
            <ul className="space-y-2">
              {AXIOM_IS.map((item) => (
                <li key={item} className="text-sm text-dl-gray leading-relaxed flex items-start gap-2">
                  <span className="w-2 h-2 mt-1.5 flex-shrink-0" style={{ backgroundColor: '#2d5016' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-6 py-5 bg-dl-bg-alt border-l-4 border-l-dl-error">
            <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-3">What Axiom is not</h3>
            <ul className="space-y-2">
              {AXIOM_IS_NOT.map((item) => (
                <li key={item} className="text-sm text-dl-gray leading-relaxed flex items-start gap-2">
                  <span className="w-2 h-2 mt-1.5 flex-shrink-0" style={{ backgroundColor: '#991b1b' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Leadership, Governance, and Accountability</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
          <p className="text-sm text-dl-gray leading-relaxed">
            Axiom is built around explicit decision rights and measurable accountability.
            The goal is simple: protect capital, enforce program rules, and maintain integrity of reporting.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
          {ACCOUNTABILITY.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`px-6 py-5 border-t-4 border-t-dl-navy ${i < ACCOUNTABILITY.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
              >
                <Icon className="w-5 h-5 text-dl-navy mb-3" />
                <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-dl-gray leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-px w-full mb-12" style={{ backgroundColor: '#b8860b' }} />

      <div className="mb-12">
        <SectionHeading>Founder</SectionHeading>
        <div className="border border-dl-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            <div className="md:col-span-1 relative" style={{ minHeight: '320px' }}>
              <img
                src="/images/about-hero.png"
                alt="Founder portrait in professional setting"
                className="w-full h-full object-cover"
                style={{ display: 'block' }}
              />
            </div>
            <div className="md:col-span-2 bg-dl-bg border-l-4 border-l-dl-gold">
              <div className="px-6 py-5 border-b border-dl-border">
                <p className="font-dl-serif text-lg text-dl-navy font-semibold mb-1">Clarence Fuqua</p>
                <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider">Founder & Lead Architect — Axiom Protocol</p>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-dl-gray leading-relaxed mb-4">
                  Clarence Fuqua is the Founder and Lead Architect of Axiom Protocol, a financial infrastructure initiative
                  focused on transparency, risk visibility, and deterministic capital behavior.
                </p>
                <p className="text-sm text-dl-gray leading-relaxed mb-4">
                  His professional foundation was established in Atlanta, Georgia, where he began as an Acquisition and
                  Research Specialist within a real estate investment environment. This early role centered on opportunity
                  evaluation, underwriting logic, and capital efficiency analysis — disciplines that shaped a long-term
                  orientation toward risk-adjusted decision frameworks.
                </p>
                <p className="text-sm text-dl-gray leading-relaxed">
                  Across more than two decades, Clarence expanded his scope through multiple operational layers of the real
                  estate sector, including property management, short-term rental systems, construction management, and
                  property preservation — reinforcing the principle that outcomes are governed less by
                  prediction and more by structure, controls, and execution discipline.
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-5 bg-dl-bg border-t border-dl-border">
            <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-3">Design Philosophy</h3>
            <p className="text-sm text-dl-gray leading-relaxed mb-4">
              Clarence's approach to financial technology is infrastructure-centric. Rather than prioritizing product
              narratives or speculative positioning, his work emphasizes:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {['Capital preservation logic', 'Explicit risk visibility', 'Deterministic system behavior', 'Audit-traceable decision pathways', 'Governance-aware design constraints'].map((item) => (
                <div key={item} className="flex items-center gap-2 px-3 py-2 border border-dl-border bg-dl-bg-alt">
                  <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: '#b8860b' }} />
                  <p className="text-sm text-dl-gray">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 py-5 bg-dl-bg-alt border-t border-dl-border">
            <div className="border border-dl-border p-4 bg-dl-bg border-l-4 border-l-dl-gold">
              <p className="font-dl-serif text-sm text-dl-navy leading-relaxed italic">
                "Sustainable financial systems are not defined by yield generation alone, but by risk discipline,
                structural integrity, and decision architecture."
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Operating Principles</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className={`px-6 py-5 ${i < 2 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'md:border-r border-dl-border bg-dl-bg' : 'bg-dl-bg-alt'} border-l-4 border-l-dl-forest`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-dl-forest" />
                  <h3 className="font-dl-serif text-base text-dl-navy font-medium">{p.title}</h3>
                </div>
                <p className="text-sm text-dl-gray leading-relaxed">{p.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-px w-full mb-12" style={{ backgroundColor: '#2d5016' }} />

      <div className="mb-12">
        <div className="w-full border border-dl-border border-l-4 border-l-dl-forest" style={{ height: '260px', overflow: 'hidden' }}>
          <img
            src="/images/about-community.png"
            alt="Aerial view of community farmland at sunrise"
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
          />
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Timeline</SectionHeading>
        <div className="border border-dl-border">
          {MILESTONES.map((m, i) => {
            const Icon = m.icon;
            return (
              <div
                key={i}
                className={`px-6 py-4 flex flex-col md:flex-row md:items-start gap-2 md:gap-6 ${i < MILESTONES.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
              >
                <div className="flex items-center gap-2 w-28 flex-shrink-0">
                  <span className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: '#b8860b' }} />
                  <p className="font-dl-mono text-sm text-dl-navy font-semibold">{m.period}</p>
                </div>
                <div className="flex items-start gap-2 flex-1">
                  <Icon className="w-4 h-4 text-dl-forest flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-dl-gray leading-relaxed">{m.event}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Disclosure</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt border-l-4 border-l-dl-error">
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
            <SolidButton variant="secondary">Back to Home</SolidButton>
          </Link>
          <Link href="/pilot">
            <SolidButton>View Capital Program</SolidButton>
          </Link>
          <Link href="/disclosure">
            <SolidButton variant="secondary">Read Full Disclosure</SolidButton>
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
