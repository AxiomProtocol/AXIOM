import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConnectWalletButton } from './ConnectWalletButton';
import { SectionHeading } from './SectionHeading';
import { NAV_ITEMS } from './navItems';
import { NavDropdown } from './NavDropdown';
import {
  Landmark, Users, FileText,
  Wallet, Scale, ArrowRight,
  Target, Search, BrainCircuit, CheckCircle2, ChevronRight,
  Shield, Layers, Activity, Building2, BarChart3
} from 'lucide-react';

const PLATFORM_STATS = [
  { label: 'Network', value: 'Arbitrum One', detail: 'Chain ID 42161 — mainnet live' },
  { label: 'Deployed Contracts', value: '72+', detail: 'Auditable on-chain, Arbiscan verified' },
  { label: 'Governance Asset', value: 'AXM', detail: 'Live on mainnet — ERC-20' },
  { label: 'Identity Standard', value: 'ERC-3643', detail: 'AXUSD + AXAU identity gating' },
];

const SYSTEM_LAYERS = [
  {
    num: '01',
    label: 'Reserve Layer',
    title: 'AXAU Reserve',
    desc: 'Gold-backed reserve unit, 1:1 collateralised by PAXG. Identity-gated via ERC-3643. Direct mint/redeem on Arbitrum One.',
    href: '/axau',
    status: 'LIVE',
    statusColor: 'text-dl-forest',
    accent: 'border-l-dl-gold',
    icon: Shield,
  },
  {
    num: '02',
    label: 'Settlement Layer',
    title: 'AXUSD Rail',
    desc: 'The protocol\'s identity-gated stablecoin. Settlement, transactional capital, and PSM-backed mint/redeem. ERC-3643 compliant.',
    href: '/axusd-3643',
    status: 'LIVE',
    statusColor: 'text-dl-forest',
    accent: 'border-l-dl-navy',
    icon: Wallet,
  },
  {
    num: '03',
    label: 'Asset Deployment',
    title: 'Capital + Lending',
    desc: 'Structured Reg D 506(c) capital program, bridge loan lending fund, and syndication offerings for qualified participants.',
    href: '/pilot',
    status: 'FORMATION',
    statusColor: 'text-dl-gold',
    accent: 'border-l-dl-forest',
    icon: Building2,
  },
  {
    num: '04',
    label: 'Intelligence Layer',
    title: 'Regime + Decision',
    desc: 'Nine-dimension capital regime intelligence (MIRDT), authorization gate (Sentinel), and institutional observer dashboard.',
    href: '/mirdt',
    status: 'LIVE',
    statusColor: 'text-dl-forest',
    accent: 'border-l-dl-navy',
    icon: BrainCircuit,
  },
  {
    num: '05',
    label: 'Community Access',
    title: 'Wealth Practice',
    desc: 'Structured group economics for Main Street participants. Community savings groups, deal access, and GEF score progression.',
    href: '/wealth-practice',
    status: 'FORMING',
    statusColor: 'text-dl-gold',
    accent: 'border-l-dl-forest',
    icon: Users,
  },
];

const LIVE_STATUS = [
  { system: 'AXAU Reserve (mint/redeem)', status: 'LIVE', note: 'Identity-gated. Direct on-chain. PAXG-backed.', href: '/axau' },
  { system: 'AXUSD Settlement Rail', status: 'LIVE', note: 'PSM active. ERC-3643 identity required.', href: '/axusd-3643' },
  { system: 'Protocol Exchange (DEX)', status: 'LIVE', note: 'Camelot V2. AXM / AXUSD pairs.', href: '/dex' },
  { system: 'Regime Intelligence (MIRDT)', status: 'LIVE', note: 'Nine-dimension capital regime scoring.', href: '/mirdt' },
  { system: 'Observer Dashboard', status: 'LIVE', note: 'Treasury, governance, and risk — read-only.', href: '/observer' },
  { system: 'Lending Fund (Reg D 506(c))', status: 'FORMATION', note: 'Accredited investors. Bridge loan mandate.', href: '/lending-fund' },
  { system: 'Capital Program (SPVs)', status: 'FORMATION', note: 'Dual-asset. 35/35/20/10 allocation.', href: '/pilot' },
  { system: 'Wealth Practice Groups', status: 'FORMING', note: '10 hubs seeded. Groups actively forming.', href: '/wealth-practice' },
  { system: 'Banking (Increase.com)', status: 'CONFIGURED', note: 'FDIC-insured. ACH/wire rails. Not yet in production use.', href: '/banking' },
  { system: 'Land Acquisition Pipeline', status: 'PLANNED', note: 'Framework designed. SEC Reg CF targeted.', href: '/land' },
];

const ENTRY_PROFILES = [
  {
    label: 'I have no capital yet',
    subLabel: 'W-2 income, no savings buffer',
    route: 'Community Credit → Wealth Practice',
    desc: 'An income-backed credit line covers your first contribution. No crypto collateral required. Start with as little as $25/month.',
    href: '/community-credit',
    cta: 'Apply for Entry Credit',
    accent: 'border-l-dl-forest',
    accentColor: 'text-dl-forest',
    bullets: ['No crypto or collateral required', 'Income-backed credit line', 'Guided onboarding included'],
  },
  {
    label: 'I have savings to invest',
    subLabel: 'Ready to join a group or a deal',
    route: 'Wealth Practice → Syndication',
    desc: 'Join a community savings group and build your participation record. Groups in Atlanta, Houston, and Charlotte are forming now.',
    href: '/wealth-practice',
    cta: 'Browse Open Groups',
    accent: 'border-l-dl-gold',
    accentColor: 'text-dl-gold',
    bullets: ['Community group structure', 'Real estate deal access after 90 days', 'On-chain settlement'],
  },
  {
    label: "I'm an accredited investor",
    subLabel: 'Institutional real estate exposure',
    route: 'Syndication → Lending Fund',
    desc: 'Access structured Reg D 506(c) offerings, the bridge loan LP fund, and secondary market transfers with on-chain reporting.',
    href: '/syndication',
    cta: 'View Syndication Offerings',
    accent: 'border-l-dl-navy',
    accentColor: 'text-dl-navy',
    bullets: ['Reg D 506(c) qualified offerings', 'On-chain LP fund participation', 'Institutional-grade reporting'],
  },
  {
    label: 'Reserve / Protocol Participant',
    subLabel: 'AXAU, AXUSD, or governance access',
    route: 'Identity Credential → Reserve Access',
    desc: 'Obtain an ERC-3643 identity credential, mint AXAU (gold-backed reserve unit) or AXUSD, and participate in on-chain governance.',
    href: '/axau-early-access',
    cta: 'Apply for Reserve Access',
    accent: 'border-l-dl-gold',
    accentColor: 'text-dl-gold',
    bullets: ['Identity verification required (ERC-3643)', 'Direct on-chain mint and redeem', 'Governance participation rights'],
  },
];

const PARTICIPATION_STEPS = [
  {
    step: '01',
    title: 'Review',
    description: 'Read the disclosure, solvency dashboard, and proof-of-execution logs. Understand the infrastructure before engaging.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'Connect',
    description: 'Access the platform with your self-custody wallet on Arbitrum One. View live on-chain data and governance tools.',
    icon: Wallet,
  },
  {
    step: '03',
    title: 'Participate',
    description: 'Choose your layer: Reserve (AXAU), Settlement (AXUSD), Capital (Lending Fund / Capital Program), or Community (Wealth Practice).',
    icon: Scale,
  },
];

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    LIVE: 'text-dl-forest',
    FORMATION: 'text-dl-gold',
    FORMING: 'text-dl-gold',
    CONFIGURED: 'text-dl-navy',
    PLANNED: 'text-dl-gray',
  };
  return (
    <span className={`font-dl-mono text-xs uppercase tracking-wider ${map[status] ?? 'text-dl-gray'}`}>
      {status}
    </span>
  );
}

export function DesignLawHome() {
  const [timestamp, setTimestamp] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTimestamp(new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'));
  }, []);

  return (
    <>
      <Head>
        <title>Axiom Protocol | Governance-First Financial Infrastructure for Real-World Assets</title>
        <meta name="description" content="Axiom Protocol is a governance-first financial operating system delivering reserve capital (AXAU), settlement infrastructure (AXUSD), capital programs, and community economics on Arbitrum One." />
      </Head>
      <div className="design-law-root min-h-screen bg-dl-bg">

        <nav className="border-b border-dl-border bg-dl-bg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-dl-serif text-lg text-dl-navy font-bold">
              AXIOM
            </Link>
            <div className="hidden lg:flex items-center gap-6 text-sm text-dl-navy">
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <NavDropdown key={item.label} item={item} />
                ) : (
                  <Link key={item.href} href={item.href!} className="hover:underline">{item.label}</Link>
                )
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden lg:block">
                <ConnectWalletButton />
              </div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 text-dl-navy border border-dl-border bg-dl-bg"
                aria-label="Menu"
              >
                {menuOpen ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="4" x2="16" y2="16" />
                    <line x1="16" y1="4" x2="4" y2="16" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="5" x2="17" y2="5" />
                    <line x1="3" y1="10" x2="17" y2="10" />
                    <line x1="3" y1="15" x2="17" y2="15" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="lg:hidden border-t border-dl-border bg-dl-bg">
              <div className="max-w-7xl mx-auto px-6 py-3">
                {NAV_ITEMS.map((item) =>
                  item.children ? (
                    <div key={item.label} className="border-b border-dl-border last:border-b-0">
                      <p className="py-2 text-xs text-dl-gray uppercase tracking-wider font-dl-mono">{item.label}</p>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block py-2 pl-4 text-sm text-dl-navy hover:underline"
                          onClick={() => setMenuOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href!}
                      className="block py-2 text-sm text-dl-navy border-b border-dl-border last:border-b-0 hover:underline"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )
                )}
                <div className="pt-3">
                  <ConnectWalletButton />
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* HERO */}
        <div className="border-t-4 border-dl-gold">
          <div className="relative w-full" style={{ height: '460px' }}>
            <img
              src="/images/homepage-hero.png"
              alt="Financial infrastructure for real-world assets on Arbitrum One"
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
            />
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(14, 28, 55, 0.80)' }}>
              <div className="max-w-7xl mx-auto px-6 h-full flex flex-col justify-center">
                <p className="text-xs uppercase tracking-widest mb-3 font-dl-mono" style={{ color: '#c9a84c' }}>
                  Axiom Protocol · Arbitrum One · Governance-First
                </p>
                <h1 className="font-dl-serif text-3xl md:text-5xl leading-tight mb-4" style={{ color: '#ffffff', maxWidth: '700px' }}>
                  Financial Infrastructure<br className="hidden md:block" /> for Real-World Assets.
                </h1>
                <p className="text-sm leading-relaxed mb-3" style={{ color: '#d1d5db', maxWidth: '560px' }}>
                  A governance-first protocol delivering reserve capital, settlement infrastructure, capital programs, and community economics — with full on-chain transparency.
                </p>
                <p className="text-xs font-dl-mono mb-8" style={{ color: '#9ca3af' }}>
                  AXAU Reserve · AXUSD Settlement Rail · Reg D 506(c) Lending · Regime Intelligence
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  <Link href="/disclosure">
                    <span className="inline-block border-2 border-white text-white px-5 py-2.5 text-sm font-bold hover:bg-white hover:text-dl-navy font-dl-serif">
                      Read Disclosure
                    </span>
                  </Link>
                  <Link href="/axau">
                    <span className="inline-block border border-white text-white px-5 py-2.5 text-sm font-bold hover:bg-white hover:text-dl-navy font-dl-serif" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
                      AXAU Reserve
                    </span>
                  </Link>
                  <Link href="/pilot">
                    <span className="inline-block border border-white text-white px-5 py-2.5 text-sm font-bold hover:bg-white hover:text-dl-navy font-dl-serif" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
                      Capital Program
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">

          {/* SYSTEM ARCHITECTURE */}
          <div className="mb-14">
            <div className="mb-6">
              <SectionHeading>Protocol Architecture</SectionHeading>
              <p className="text-sm text-dl-gray mt-1 max-w-2xl">
                Axiom is a five-layer financial operating system. Each layer is purpose-built and independently verifiable on Arbitrum One.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0 border border-dl-border">
              {SYSTEM_LAYERS.map((layer, i) => {
                const Icon = layer.icon;
                return (
                  <Link
                    key={layer.num}
                    href={layer.href}
                    className={`block px-5 py-5 border-l-4 ${layer.accent} ${i < SYSTEM_LAYERS.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} hover:bg-dl-bg-alt no-underline`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-dl-mono text-xs text-dl-gray">{layer.num}</span>
                      <StatusChip status={layer.status} />
                    </div>
                    <div className="flex items-start gap-2 mb-1">
                      <Icon className="w-4 h-4 text-dl-navy flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-0.5">{layer.label}</p>
                        <h3 className="font-dl-serif text-base text-dl-navy font-bold">{layer.title}</h3>
                      </div>
                    </div>
                    <p className="text-xs text-dl-gray leading-relaxed mt-2">{layer.desc}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* PLATFORM STATS */}
          <div className="mb-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
              {PLATFORM_STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`px-5 py-5 border-l-4 border-l-dl-gold ${i < PLATFORM_STATS.length - 1 ? 'border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                >
                  <p className="text-xs text-dl-gray mb-1 font-dl-mono uppercase tracking-wider">{stat.label}</p>
                  <p className="font-dl-mono text-xl font-bold text-dl-gold">{stat.value}</p>
                  <p className="text-xs text-dl-gray mt-1">{stat.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px w-full mb-14" style={{ backgroundColor: '#b8860b' }} />

          {/* HOW IT WORKS */}
          <div className="mb-14">
            <SectionHeading>How Participation Works</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
              {PARTICIPATION_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.step}
                    className={`px-6 py-6 ${i < PARTICIPATION_STEPS.length - 1 ? 'md:border-r border-b md:border-b-0 border-dl-border' : ''} border-t-4 border-t-dl-gold`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <p className="font-dl-mono text-2xl text-dl-gold font-bold">{step.step}</p>
                      <Icon className="w-5 h-5 text-dl-navy" />
                    </div>
                    <h3 className="font-dl-serif text-base text-dl-navy mb-2">{step.title}</h3>
                    <p className="text-sm text-dl-gray leading-relaxed">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WHAT IS LIVE NOW */}
          <div className="mb-14">
            <div className="mb-5">
              <SectionHeading>Infrastructure Status</SectionHeading>
              <p className="text-sm text-dl-gray mt-1">
                Current operational state of each protocol component. All on-chain data is independently verifiable.{' '}
                <Link href="/proof-of-execution" className="text-dl-navy underline">View Proof of Execution →</Link>
              </p>
            </div>
            <div className="border border-dl-border">
              {LIVE_STATUS.map((row, i) => (
                <Link
                  key={row.system}
                  href={row.href}
                  className={`flex items-center justify-between px-5 py-3.5 no-underline hover:bg-dl-bg-alt ${i < LIVE_STATUS.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dl-navy font-medium truncate">{row.system}</p>
                    <p className="text-xs text-dl-gray mt-0.5">{row.note}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <StatusChip status={row.status} />
                    <ChevronRight className="w-3.5 h-3.5 text-dl-gray" />
                  </div>
                </Link>
              ))}
            </div>
            <div className="border border-t-0 border-dl-border px-5 py-3 bg-dl-bg-alt text-right">
              <Link href="/solvency" className="text-xs text-dl-navy underline font-dl-mono">
                View live solvency dashboard →
              </Link>
            </div>
          </div>

          <div className="h-px w-full mb-14" style={{ backgroundColor: '#2d5016' }} />

          {/* WHERE DO YOU START */}
          <div className="mb-14">
            <div className="mb-6">
              <SectionHeading>Choose Your Entry Point</SectionHeading>
              <p className="text-sm text-dl-gray mt-1">Each path is designed for a specific participation intent.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
              {ENTRY_PROFILES.map((profile, i) => (
                <div
                  key={profile.label}
                  className={`p-6 border-l-4 ${profile.accent} ${i % 2 === 0 ? 'md:border-r' : ''} ${i < ENTRY_PROFILES.length - 2 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                >
                  <p className={`text-xs uppercase tracking-widest font-dl-mono mb-2 ${profile.accentColor}`}>
                    {profile.route}
                  </p>
                  <h3 className="font-dl-serif text-lg text-dl-navy font-bold mb-1">{profile.label}</h3>
                  <p className="text-xs text-dl-gray mb-4">{profile.subLabel}</p>
                  <p className="text-sm text-dl-gray leading-relaxed mb-4">{profile.desc}</p>
                  <ul className="mb-6 space-y-1.5">
                    {profile.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-dl-gray">
                        <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${profile.accentColor}`} />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={profile.href}
                    className="inline-flex items-center gap-1.5 border border-dl-navy bg-dl-bg text-dl-navy px-4 py-2.5 text-xs font-bold hover:bg-dl-navy hover:text-white"
                  >
                    {profile.cta}
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px w-full mb-14" style={{ backgroundColor: '#2d5016' }} />

          {/* CAPITAL PROGRAM */}
          <div className="mb-14">
            <SectionHeading>Capital Program Structure</SectionHeading>
            <div className="border border-dl-border mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-6 border-b md:border-b-0 md:border-r border-dl-border bg-dl-bg border-l-4 border-l-dl-forest">
                  <p className="text-xs text-dl-forest uppercase tracking-wider font-dl-mono mb-2">SPV-1</p>
                  <h3 className="font-dl-serif text-lg text-dl-navy mb-1">Cash Flow Anchor</h3>
                  <p className="text-sm text-dl-gray mb-4">Multifamily residential property generating recurring income through occupancy-driven cash flow.</p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                    <div>
                      <p className="text-xs text-dl-gray">Acquisition Target</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">$600,000</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Asset Class</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">Multifamily</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Strategy</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">Cash Flow</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Status</p>
                      <p className="font-dl-mono text-sm text-dl-forest font-semibold">Formation</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-dl-bg-alt border-l-4 border-l-dl-gold">
                  <p className="text-xs text-dl-gold uppercase tracking-wider font-dl-mono mb-2">SPV-2</p>
                  <h3 className="font-dl-serif text-lg text-dl-navy mb-1">Appreciation Asset</h3>
                  <p className="text-sm text-dl-gray mb-4">Commercial or industrial property positioned for long-term value growth through development and repositioning.</p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                    <div>
                      <p className="text-xs text-dl-gray">Acquisition Target</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">$350,000</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Asset Class</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">Commercial</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Strategy</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">Appreciation</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Status</p>
                      <p className="font-dl-mono text-sm text-dl-forest font-semibold">Formation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border border-dl-border p-5 bg-dl-bg-alt border-t-4 border-t-dl-navy mb-1">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Treasury Allocation Policy</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="font-dl-mono text-xl text-dl-gold font-bold">35%</p>
                  <p className="text-xs text-dl-gray mt-1">Property Equity</p>
                </div>
                <div>
                  <p className="font-dl-mono text-xl text-dl-gold font-bold">35%</p>
                  <p className="text-xs text-dl-gray mt-1">Debt Service</p>
                </div>
                <div>
                  <p className="font-dl-mono text-xl text-dl-gold font-bold">20%</p>
                  <p className="text-xs text-dl-gray mt-1">Operating Reserve</p>
                </div>
                <div>
                  <p className="font-dl-mono text-xl text-dl-gold font-bold">10%</p>
                  <p className="text-xs text-dl-gray mt-1">Protocol Development</p>
                </div>
              </div>
            </div>
            <div className="border border-t-0 border-dl-border px-5 py-3 bg-dl-bg-alt text-right">
              <Link href="/pilot" className="text-xs text-dl-navy underline font-dl-mono">
                View full Capital Program →
              </Link>
            </div>
          </div>

          <div className="h-px w-full mb-14" style={{ backgroundColor: '#2d5016' }} />

          {/* PROOF / TRUST ANCHOR */}
          <div className="mb-14">
            <SectionHeading>Proof-Led Execution</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
              <div className="relative" style={{ minHeight: '280px' }}>
                <img
                  src="/images/homepage-community.png"
                  alt="Community execution proof — real asset coordination"
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                />
              </div>
              <div className="p-6 bg-dl-bg-alt border-l-4 border-l-dl-forest flex flex-col justify-center">
                <p className="text-xs text-dl-forest uppercase tracking-wider font-dl-mono mb-3">Origin — Proof of Execution</p>
                <p className="text-sm text-dl-gray leading-relaxed mb-4">
                  Before Axiom existed as software, a real community came together, pooled funds, and participated in the
                  coordination of a land initiative with USDA support. Real people. Real coordination. Real execution.
                </p>
                <p className="text-sm text-dl-gray leading-relaxed mb-4">
                  That experience proved shared ownership works — and proved most groups fail because coordination lacks
                  structure. Axiom converts that insight into programmable infrastructure: on-chain audit trails,
                  deterministic treasury policies, and identity-gated capital rails.
                </p>
                <p className="text-sm text-dl-gray leading-relaxed mb-6">
                  Every operational action, solvency snapshot, and capital movement is recorded with a hash-chained
                  audit trail. Verification does not require trust — it requires reading the chain.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/proof-of-execution" className="inline-flex items-center gap-1.5 border border-dl-navy bg-dl-bg text-dl-navy px-4 py-2.5 text-xs font-bold hover:bg-dl-navy hover:text-white">
                    Proof of Execution <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link href="/disclosure" className="inline-flex items-center gap-1.5 border border-dl-border bg-dl-bg text-dl-navy px-4 py-2.5 text-xs font-bold hover:bg-dl-bg-alt">
                    Institutional Disclosure <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER LINKS */}
          <div className="border-t border-dl-border pt-8 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-2">
              {[
                { label: 'AXAU Reserve', href: '/axau' },
                { label: 'AXUSD Rail', href: '/axusd-3643' },
                { label: 'Capital Program', href: '/pilot' },
                { label: 'Lending Fund', href: '/lending-fund' },
                { label: 'Regime Intelligence', href: '/mirdt' },
                { label: 'Wealth Practice', href: '/wealth-practice' },
                { label: 'Solvency Console', href: '/solvency' },
                { label: 'Disclosure', href: '/disclosure' },
              ].map((link, i) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-4 py-3.5 text-xs text-dl-navy underline hover:bg-dl-bg-alt font-dl-mono ${i % 4 !== 3 ? 'border-r border-dl-border' : ''} ${i < 4 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {timestamp && (
              <p className="text-xs text-dl-gray font-dl-mono text-right mt-2">
                Rendered: {timestamp}
              </p>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
