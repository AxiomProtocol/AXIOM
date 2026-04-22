import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../components/design-law';

const STAGES = [
  {
    num: '0',
    title: 'Discover & Get Funded',
    gef: 'No GEF required',
    description: 'Find a distressed property through Deal Flow. Run a Property Analysis to check the numbers. If you need short-term liquidity to take the first step, apply for a Community Entry Credit line — an income-backed micro credit using your W-2 income and GEF participation record as the signal. No crypto collateral required.',
    products: [
      { name: 'Deal Flow', href: '/distressed-feed' },
      { name: 'Property Analysis', href: '/property' },
      { name: 'Community Entry Credit', href: '/community-credit' },
    ],
    cta: 'Get Started',
    ctaHref: '/community-credit',
    accent: 'border-l-dl-forest',
  },
  {
    num: '1',
    title: 'Build Community Capital',
    gef: 'Observer → Participant',
    description: 'Join a Wealth Practice group in Atlanta, Houston, or Charlotte. These are structured community savings groups with deterministic contribution cycles, on-chain audit trails, and transparent scheduling. Each cycle builds your GEF score — your participation record on the platform. No accreditation required to begin.',
    products: [
      { name: 'The Wealth Practice', href: '/wealth-practice' },
      { name: 'Deal Intelligence', href: '/deal-intelligence' },
    ],
    cta: 'Join a Group',
    ctaHref: '/wealth-practice',
    accent: 'border-l-dl-gold',
  },
  {
    num: '2',
    title: 'Collective Real Estate Participation',
    gef: 'Operator tier',
    description: 'Graduated Wealth Practice groups surface as qualified candidates for Syndication offerings — real estate deals structured as community pools or Reg D 506(c) offerings. LP into deals sourced from Deal Intelligence. Returns flow back to the community. No accreditation required for community pool structures.',
    products: [
      { name: 'Syndication', href: '/syndication' },
      { name: 'Investor Portal', href: '/syndication/portal' },
      { name: 'Land Pipeline', href: '/land' },
    ],
    cta: 'View Syndication',
    ctaHref: '/syndication',
    accent: 'border-l-dl-navy',
  },
  {
    num: '3',
    title: 'Operate Independently',
    gef: 'Operator+ tier',
    description: 'GEF Operator+ tier members access the Lending Fund as borrowers — sourcing their own Fix & Flip and BRRRR deals, drawing bridge capital secured by real property, and managing the full acquisition and rehabilitation lifecycle with on-chain transparency and settlement.',
    products: [
      { name: 'Lending Fund', href: '/lending-fund' },
      { name: 'Sentinel', href: '/sentinel' },
      { name: 'MIRDT', href: '/observer' },
    ],
    cta: 'View Lending Fund',
    ctaHref: '/lending-fund',
    accent: 'border-l-dl-navy',
  },
];

const WHO_IT_IS_FOR = [
  {
    profile: 'W-2 earner, no current capital',
    path: 'Community Entry Credit → Wealth Practice → Syndication LP',
    desc: 'Income-backed credit funds your first contribution. Cycles build your record. Graduated groups access real estate deals as LPs.',
  },
  {
    profile: 'W-2 earner with savings',
    path: 'Wealth Practice → Deal Intelligence → Syndication',
    desc: 'Start contributing immediately. Use Deal Intelligence to analyze properties your group is targeting. Graduate to collective LP participation.',
  },
  {
    profile: 'Accredited investor or operator',
    path: 'Syndication → Lending Fund → Secondary Market',
    desc: 'Structured offerings, bridge loan capital, and secondary market liquidity through the Axiom Secondary Network.',
  },
];

const STRUCTURAL_ELEMENTS = [
  {
    title: 'GEF Score',
    description: 'Your Graduated Execution Framework score tracks contribution history, cycle completions, and governance participation. It is your platform credit score and determines your access to products, credit limits, and GEF tier.',
  },
  {
    title: 'On-Chain Transparency',
    description: 'All capital movements, contribution records, governance actions, and settlement events are recorded on Arbitrum One. The Observer dashboard provides read-only access for independent verification.',
  },
  {
    title: 'Treasury Allocation Policy',
    description: 'Every dollar raised follows a fixed 35/35/20/10 allocation: 35% property equity, 35% debt service, 20% operating reserve, 10% protocol development. This policy is enforced programmatically.',
  },
  {
    title: 'Identity and Compliance',
    description: 'The Unified AXUSD stablecoin (ERC-3643 / T-REX compliant) carries on-chain identity credentials. Accredited investor verification is required for Reg D 506(c) offerings. Community pool structures have different qualification requirements.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Do I need to be an accredited investor to participate?',
    a: 'No. The Wealth Practice (Stage 1) and Community Entry Credit (Stage 0) have no accreditation requirement. Community pool Syndication structures are available to qualified non-accredited participants. Reg D 506(c) offerings in the Lending Fund and structured Syndication require accreditation.',
  },
  {
    q: 'Do I need to know how crypto works?',
    a: 'You need a self-custody wallet on Arbitrum One (MetaMask or a compatible wallet). The platform interface is designed to feel like a financial dashboard — you do not need to understand the underlying on-chain protocol mechanics to participate.',
  },
  {
    q: 'What is the minimum to start?',
    a: 'Wealth Practice groups set their own contribution amounts — some groups start as low as $50/month. If you need help with the first contribution, Community Entry Credit provides up to $1,500 for Participant-tier members.',
  },
  {
    q: 'How are decisions about which properties to buy made?',
    a: 'Deal sourcing runs through Deal Flow (distressed property feed) and Deal Intelligence (AI-powered underwriting workspace). Group acquisition decisions require governance votes recorded on-chain. The Land Pipeline tracks the full acquisition lifecycle with transparent voting.',
  },
  {
    q: 'What happens if someone in my Wealth Practice group stops contributing?',
    a: 'Contribution smoothing — either through Community Entry Credit or group reserves — is the first mechanism. The GEF system tracks missed contributions as violations that pause tier advancement. The three-stage trust pipeline (Interest Hub → Purpose Group → On-Chain Pool) is designed to surface consistent participants before capital is pooled on-chain.',
  },
];

export default function HowItWorksPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>How It Works — Axiom Protocol</title>
        <meta name="description" content="The clearest path from W-2 income to real estate ownership. Four stages. No accreditation required to begin." />
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-4 font-dl-mono">How It Works</p>
        <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          From W-2 Income to Real Estate Ownership
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          Axiom is built for working people in Atlanta, Houston, and Charlotte who want to build wealth through real asset ownership.
          You do not need to be an accredited investor to begin. You do not need capital on day one.
          The platform creates a structured path from community participation to independent real estate operation.
        </p>
      </div>

      <div className="mb-12">
        <SectionHeading>The Four-Stage Journey</SectionHeading>
        <div className="border border-dl-border">
          {STAGES.map((stage, i) => (
            <div key={stage.num} className={`px-6 py-6 border-l-4 ${stage.accent} ${i < STAGES.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-dl-mono text-2xl text-dl-navy font-bold">{stage.num}</span>
                    <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5">{stage.gef}</span>
                  </div>
                  <h3 className="font-dl-serif text-lg text-dl-navy font-bold mb-2">{stage.title}</h3>
                  <p className="text-sm text-dl-gray leading-relaxed mb-3">{stage.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {stage.products.map((p) => (
                      <Link
                        key={p.name}
                        href={p.href}
                        className="text-xs font-dl-mono text-dl-navy border border-dl-border px-2 py-1 hover:bg-dl-bg-alt"
                      >
                        {p.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="md:w-44 flex-shrink-0">
                  <Link href={stage.ctaHref}>
                    <SolidButton>{stage.cta}</SolidButton>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Who This Is For</SectionHeading>
        <div className="border border-dl-border">
          {WHO_IT_IS_FOR.map((row, i) => (
            <div key={row.profile} className={`px-6 py-5 ${i < WHO_IT_IS_FOR.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
              <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-1">{row.profile}</h3>
              <p className="font-dl-mono text-xs text-dl-forest mb-2">{row.path}</p>
              <p className="text-sm text-dl-gray leading-relaxed">{row.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Platform Architecture</SectionHeading>
        <div className="border border-dl-border">
          {STRUCTURAL_ELEMENTS.map((section, i) => (
            <div key={section.title} className={`px-6 py-5 ${i < STRUCTURAL_ELEMENTS.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
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
            <div key={i} className={`px-6 py-5 ${i < FAQ_ITEMS.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
              <p className="font-dl-serif text-sm text-dl-navy font-medium mb-2">{item.q}</p>
              <p className="text-sm text-dl-gray leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          <Link href="/start">
            <SolidButton>Start Your Journey</SolidButton>
          </Link>
          <Link href="/community-credit">
            <SolidButton variant="secondary">Community Entry Credit</SolidButton>
          </Link>
          <Link href="/wealth-practice">
            <SolidButton variant="secondary">Browse Wealth Practice Groups</SolidButton>
          </Link>
          <Link href="/disclosure">
            <SolidButton variant="secondary">Read Disclosure</SolidButton>
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
