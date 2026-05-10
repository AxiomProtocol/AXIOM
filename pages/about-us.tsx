import React from 'react';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../components/design-law';
import { SeoHead } from '../components/seo/SeoHead';
import {
  ShieldCheck, Lock, TrendingUp,
  Crown, Shield, FileText, Target, Layers,
  Building2, Eye, BookOpen
} from 'lucide-react';

const THESIS_CARDS = [
  { label: 'Core thesis', value: 'Infrastructure first', note: 'Capital and reporting must scale before access does.', icon: Layers },
  { label: 'Operating model', value: 'Compliance-first design', note: 'Structure before scale. Disclosure before participation.', icon: Target },
  { label: 'Transparency', value: 'Reviewable pathways', note: 'Auditable structure, not marketing claims.', icon: ShieldCheck },
];

const SYSTEM_LAYERS = [
  'Tokenized real estate workflows',
  'Private credit infrastructure',
  'Stablecoin settlement',
  'Reserve-linked participation',
  'Disclosure and solvency visibility',
  'Operational reporting and governance tools',
];

const AXIOM_IS_NOT = [
  'Built around hype, vague promises, or disconnected financial tools',
  'Designed to rely on narrative alone',
  'Built to hide risk behind branding',
  'Structured to ask for trust without reviewable public pathways',
];

const PRINCIPLES = [
  { title: 'Infrastructure before scale', description: 'The underlying systems must be operational and reviewable before participation expands.', icon: Layers },
  { title: 'Proof before capital', description: 'Reviewable pathways and disclosed structure precede any capital movement.', icon: ShieldCheck },
  { title: 'Disclosure before participation', description: 'Participants deserve a clear view of the system before they engage with it.', icon: Eye },
  { title: 'Compliance-first design', description: 'Product structure and governance are built around compliance requirements, not retrofitted to them.', icon: Shield },
  { title: 'Transparency where appropriate', description: 'Public visibility is extended where it supports participant decision-making and institutional trust.', icon: BookOpen },
  { title: 'Long-term system discipline', description: 'Short-term optics are secondary to operational structure and sustainable execution.', icon: TrendingUp },
];

const OPERATING_LAYERS = [
  { title: 'Capital formation', icon: Target },
  { title: 'Settlement infrastructure', icon: Building2 },
  { title: 'Reserve transparency', icon: ShieldCheck },
  { title: 'Identity and access controls', icon: Lock },
  { title: 'Operational reporting', icon: FileText },
  { title: 'Governance and decision support', icon: Crown },
  { title: 'Public disclosure and trust architecture', icon: Eye },
];

const TRUST_ITEMS = [
  'Public disclosure',
  'Reserve visibility',
  'Operational pathways',
  'Product-level clarity',
  'Reviewable system pages',
  'Clear distinctions between live systems, configured systems, and products in formation',
];

export default function AboutUsPage() {
  return (
    <DesignLawLayout>
      <SeoHead
        title="About Axiom Protocol | Financial Operating System for Real-World Assets"
        description="Learn about Axiom Protocol, a financial operating system for real-world assets built around tokenized real estate, private credit infrastructure, stablecoin settlement, reserve transparency, and disciplined public disclosure."
        path="/about"
      />

      {/* Opening */}
      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-forest uppercase tracking-widest mb-4 font-dl-mono">About Axiom Protocol</p>
        <h1 className="font-dl-serif text-2xl sm:text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          About Axiom Protocol
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed mb-4">
          Axiom Protocol is a financial operating system for real-world assets.
        </p>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed mb-4">
          It coordinates tokenized real estate, private credit infrastructure, stablecoin settlement, reserve
          transparency, reporting, and governance through one disciplined, compliance-first operating framework.
        </p>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          The platform is designed for participants who value structure before scale, disclosure before
          participation, and operational clarity over marketing narratives.
        </p>
      </div>

      {/* Hero image */}
      <div className="mb-12">
        <div className="w-full border border-dl-border border-l-4 border-l-dl-navy" style={{ height: '300px', overflow: 'hidden' }}>
          <img
            src="/images/hero-about.png"
            alt="Rural American timberland — the physical land thesis underlying Axiom Protocol"
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
          />
        </div>
      </div>

      {/* Thesis cards */}
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

      {/* What Axiom Protocol Is */}
      <div className="mb-12">
        <SectionHeading>What Axiom Protocol Is</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6 border-l-4 border-l-dl-navy">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            Axiom Protocol is infrastructure for real-world asset finance.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            It is built to connect capital formation, settlement, reserve visibility, reporting, and governance
            into one system so that participants can review the structure, understand the pathways, and make
            better decisions before capital moves.
          </p>
        </div>
        <div className="border border-dl-border bg-dl-bg p-6 border-l-4 border-l-dl-forest">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            The system brings together multiple layers of financial infrastructure, including:
          </p>
          <ul className="space-y-2">
            {SYSTEM_LAYERS.map((item) => (
              <li key={item} className="text-sm text-dl-gray leading-relaxed flex items-start gap-2">
                <span className="w-2 h-2 mt-1.5 flex-shrink-0" style={{ backgroundColor: '#2d5016' }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="h-px w-full mb-12" style={{ backgroundColor: '#2d5016' }} />

      {/* What Axiom Protocol Is Not */}
      <div className="mb-12">
        <SectionHeading>What Axiom Protocol Is Not</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6 border-l-4 border-l-dl-error">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            Axiom Protocol is not built around hype, vague promises, or disconnected financial tools.
          </p>
          <ul className="space-y-2 mb-4">
            {AXIOM_IS_NOT.map((item) => (
              <li key={item} className="text-sm text-dl-gray leading-relaxed flex items-start gap-2">
                <span className="w-2 h-2 mt-1.5 flex-shrink-0" style={{ backgroundColor: '#991b1b' }} />
                It is not {item}.
              </li>
            ))}
          </ul>
          <p className="text-sm text-dl-gray leading-relaxed">
            Axiom Protocol is designed to make real-world asset finance more legible, more disciplined, and
            more reviewable.
          </p>
        </div>
      </div>

      {/* Why Axiom Exists */}
      <div className="mb-12">
        <SectionHeading>Why Axiom Exists</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 border-t-4 border-t-dl-gold">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            Most real-world asset platforms focus on access, marketing, or token issuance.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            Axiom Protocol focuses on infrastructure.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            That means building the underlying systems that allow capital, settlement, identity, reserve
            visibility, governance, and reporting to operate together in a coordinated way.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed mb-2">
            The goal is not to create more noise in financial markets.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            The goal is to create a stronger operating model for real-world asset participation.
          </p>
        </div>
      </div>

      {/* Operating Principles */}
      <div className="mb-12">
        <SectionHeading>Operating Principles</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
          <p className="text-sm text-dl-gray leading-relaxed">
            Axiom Protocol is guided by a clear operating philosophy. These principles shape how public routes
            are presented, how products are introduced, and how the platform communicates what is live, what
            is in formation, and what is still being configured.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className={`px-6 py-5 ${i < PRINCIPLES.length - 2 ? 'border-b border-dl-border' : i === PRINCIPLES.length - 2 ? 'border-b md:border-b-0 border-dl-border' : ''} ${i % 2 === 0 ? 'md:border-r border-dl-border bg-dl-bg' : 'bg-dl-bg-alt'} border-l-4 border-l-dl-forest`}
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

      <div className="h-px w-full mb-12" style={{ backgroundColor: '#b8860b' }} />

      {/* How the System Is Structured */}
      <div className="mb-12">
        <SectionHeading>How the System Is Structured</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
          <p className="text-sm text-dl-gray leading-relaxed">
            Axiom Protocol is organized as a multi-layer operating environment for real-world asset finance.
            Community participation exists within this system as an access and coordination layer, but it does
            not replace the broader protocol, settlement, reserve, and disclosure architecture.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border border-dl-border">
          {OPERATING_LAYERS.map((layer, i) => {
            const Icon = layer.icon;
            const isLastRow = i >= OPERATING_LAYERS.length - (OPERATING_LAYERS.length % 4 || 4);
            return (
              <div
                key={layer.title}
                className={`px-5 py-4 flex items-center gap-3 border-l-4 border-l-dl-navy bg-dl-bg ${!isLastRow || i < OPERATING_LAYERS.length - 1 ? 'border-b sm:border-b border-dl-border' : ''} ${i % 2 === 0 ? '' : 'bg-dl-bg-alt'}`}
              >
                <Icon className="w-4 h-4 text-dl-navy flex-shrink-0" />
                <p className="text-sm text-dl-gray leading-relaxed">{layer.title}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Community image */}
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

      {/* Founder */}
      <div className="mb-12">
        <SectionHeading>Leadership and Design Philosophy</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            Axiom Protocol is being built with a focus on disciplined financial structure, real-world utility,
            and operational reviewability.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            The design philosophy is straightforward: make the system understandable, make the pathways
            visible, make the rules legible, and reduce the gap between financial claims and financial proof.
            This means public-facing pages should do more than persuade — they should help visitors inspect
            the structure behind the platform.
          </p>
        </div>
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
                  Axiom Protocol was not built as a branding exercise. It emerged from practical exposure to
                  real-world capital coordination, real estate workflows, infrastructure planning, and the need
                  for stronger systems that support disciplined execution.
                </p>
                <p className="text-sm text-dl-gray leading-relaxed mb-4">
                  Clarence Fuqua is the Founder and Lead Architect of Axiom Protocol. His professional
                  foundation was established in Atlanta, Georgia, where he began as an Acquisition and Research
                  Specialist within a real estate investment environment — centering on opportunity evaluation,
                  underwriting logic, and capital efficiency analysis.
                </p>
                <p className="text-sm text-dl-gray leading-relaxed">
                  Across more than two decades, Clarence expanded his scope through multiple operational layers
                  of the real estate sector, including property management, short-term rental systems,
                  construction management, and property preservation — reinforcing the principle that outcomes
                  are governed less by prediction and more by structure, controls, and execution discipline.
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-5 bg-dl-bg border-t border-dl-border">
            <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-3">Design Philosophy</h3>
            <p className="text-sm text-dl-gray leading-relaxed mb-4">
              That background informs the platform's emphasis on reviewability, operational structure, and
              real-world financial pathways rather than speculative abstraction. The work emphasizes:
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

      <div className="h-px w-full mb-12" style={{ backgroundColor: '#2d5016' }} />

      {/* Public Trust Architecture */}
      <div className="mb-12">
        <SectionHeading>Public Trust Architecture</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
          <p className="text-sm text-dl-gray leading-relaxed">
            Trust in Axiom Protocol is expressed through structure. The intent is to give participants a more
            inspectable framework before they engage with the platform.
          </p>
        </div>
        <div className="border border-dl-border bg-dl-bg p-6 border-l-4 border-l-dl-navy">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">That includes:</p>
          <ul className="space-y-2">
            {TRUST_ITEMS.map((item) => (
              <li key={item} className="text-sm text-dl-gray leading-relaxed flex items-start gap-2">
                <span className="w-2 h-2 mt-1.5 flex-shrink-0" style={{ backgroundColor: '#2d5016' }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Where Axiom Is Going */}
      <div className="mb-12">
        <SectionHeading>Where Axiom Is Going</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6 border-l-4 border-l-dl-navy">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            Axiom Protocol is being developed as a broader operating system for real-world assets, with
            continued expansion across settlement, reserve-linked infrastructure, capital formation, and
            public financial transparency.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            As the platform develops, the objective remains the same: build a more disciplined model for
            real-world asset finance that can be reviewed, understood, and used with greater confidence.
          </p>
        </div>
      </div>

      {/* Disclosure */}
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

      {/* CTA */}
      <div className="mb-8">
        <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
          <p className="text-sm text-dl-gray leading-relaxed">
            To understand the platform in more detail, start with the public infrastructure and trust routes:
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/disclosure">
            <SolidButton>Review Disclosure</SolidButton>
          </Link>
          <Link href="/infrastructure">
            <SolidButton variant="secondary">Explore Infrastructure</SolidButton>
          </Link>
          <Link href="/solvency">
            <SolidButton variant="secondary">View Solvency</SolidButton>
          </Link>
          <Link href="/axusd">
            <SolidButton variant="secondary">Explore AXUSD</SolidButton>
          </Link>
          <Link href="/axau">
            <SolidButton variant="secondary">Explore AXAU</SolidButton>
          </Link>
          <Link href="/contact">
            <SolidButton variant="secondary">Contact Axiom Protocol</SolidButton>
          </Link>
          <Link href="/partner">
            <SolidButton variant="secondary">Partner with Axiom Protocol</SolidButton>
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
