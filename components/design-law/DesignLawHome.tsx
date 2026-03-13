import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConnectWalletButton } from './ConnectWalletButton';
import { SectionHeading } from './SectionHeading';
import { SolidButton } from './SolidButton';
import { NAV_ITEMS } from './navItems';
import { NavDropdown } from './NavDropdown';
import {
  Building2, Landmark, TrendingUp, BarChart3, Eye, Coins,
  Wallet, Radio, CreditCard, ShieldCheck, Users, FileText,
  Search, BrainCircuit, Layers, Scale, BookOpen, ArrowRight,
  Target, Globe, Lock
} from 'lucide-react';

const PLATFORM_STATS = [
  { label: 'Land Framework', value: '6+ Acres', detail: 'Community farmland initiative, USDA-supported' },
  { label: 'Network', value: 'Arbitrum One', detail: 'Chain ID 42161' },
  { label: 'Governance Asset', value: 'AXM', detail: 'Live on mainnet' },
  { label: 'Verified Contracts', value: '72', detail: 'Auditable on-chain' },
];

const PRODUCT_GRID = [
  { title: 'Capital Program', description: '$1M dual-asset program with two SPVs and institutional-grade reporting.', href: '/pilot', icon: Target },
  { title: 'Lending Fund', description: 'SEC Reg D 506(c) compliant bridge loan fund for real asset acquisition.', href: '/lending-fund', icon: Landmark },
  { title: 'Exchange', description: '10 mainnet contracts on Arbitrum One with full audit trail settlement.', href: '/dex', icon: Coins },
  { title: 'Unified AXUSD', description: 'ERC-3643 compliant stablecoin with on-chain identity and compliance.', href: '/axusd-3643', icon: ShieldCheck },
  { title: 'Banking', description: 'FDIC-insured deposits, ACH payments, debit cards, and crypto custody.', href: '/banking', icon: CreditCard },
  { title: 'Property Analysis', description: 'Pay-per-report property analysis with free, base, and premium tiers.', href: '/property', icon: Search },
  { title: 'Deal Intelligence', description: 'AI-powered document analysis and acquisition memo generation.', href: '/deal-intelligence', icon: BrainCircuit },
  { title: 'Deal Flow', description: 'Distressed property feed from government sources and wholesaler portal.', href: '/distressed-feed', icon: Building2 },
  { title: 'Wealth Practice', description: 'Community group economics with a three-stage trust pipeline.', href: '/wealth-practice', icon: Users },
  { title: 'Land Pipeline', description: 'Full land acquisition lifecycle with live governance and voting.', href: '/land', icon: Globe },
  { title: 'DePIN', description: 'Decentralized storage infrastructure through DeNet node integration.', href: '/depin/denet', icon: Radio },
  { title: 'Syndication', description: 'Full syndication operating system with offerings, capital calls, and distributions.', href: '/syndication', icon: Layers },
  { title: 'Investor Portal', description: 'Wallet-authenticated investor dashboard with holdings, capital calls, and distributions.', href: '/syndication/portal', icon: FileText },
  { title: 'GEF', description: 'Graduated Execution Framework — behavior-based qualification system with access tiers.', href: '/execution', icon: Scale },
];

const INTELLIGENCE_GRID = [
  { title: 'MIRDT', description: 'Probabilistic trend-following analysis for digital assets and US equities.', href: '/mirdt', icon: BarChart3 },
  { title: 'Sentinel', description: 'Unified capital decision and risk authorization layer.', href: '/sentinel', icon: Lock },
  { title: 'Observer', description: 'Read-only transparency dashboard for treasury and governance activity.', href: '/observer', icon: Eye },
  { title: 'RE Intelligence', description: 'Real estate market intelligence and property data analysis.', href: '/re', icon: TrendingUp },
];

const PARTICIPATION_STEPS = [
  { step: '01', title: 'Review', description: 'Read transparency reports, audit trails, and risk disclosures to understand the protocol structure.', icon: FileText },
  { step: '02', title: 'Connect', description: 'Access the platform with your self-custody wallet on Arbitrum One to view live data and governance tools.', icon: Wallet },
  { step: '03', title: 'Participate', description: 'Engage with the Capital Program, Lending Fund, or Exchange based on your qualification and intent.', icon: Scale },
];


export function DesignLawHome() {
  const [timestamp, setTimestamp] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTimestamp(new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'));
  }, []);

  return (
    <>
      <Head>
        <title>Axiom Protocol | Community Ownership Infrastructure for Real Assets</title>
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

        <div className="border-t-4 border-dl-gold">
          <div className="relative w-full" style={{ height: '420px' }}>
            <img
              src="/images/homepage-hero.png"
              alt="Modern city skyline at golden hour representing real asset infrastructure"
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
            />
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(30, 58, 95, 0.65)' }}>
              <div className="max-w-7xl mx-auto px-6 h-full flex flex-col justify-center">
                <p className="text-xs uppercase tracking-widest mb-4 font-dl-mono" style={{ color: '#c9a84c' }}>Axiom Protocol</p>
                <h1 className="font-dl-serif text-3xl md:text-5xl leading-tight mb-4" style={{ color: '#ffffff' }}>
                  Community Ownership Infrastructure<br className="hidden md:block" /> for Real Assets
                </h1>
                <p className="text-sm max-w-2xl leading-relaxed mb-8" style={{ color: '#e5e7eb' }}>
                  A financial operating system for community-led real asset ownership. Structured capital programs,
                  institutional-grade reporting, and transparent governance on Arbitrum One.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/pilot">
                    <SolidButton>View Capital Program</SolidButton>
                  </Link>
                  <Link href="/disclosure">
                    <SolidButton variant="secondary">Read Disclosure</SolidButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">

          <div className="mb-12">
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

          <div className="h-px w-full mb-12" style={{ backgroundColor: '#2d5016' }} />

          <div className="mb-12">
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
          </div>

          <div className="h-px w-full mb-12" style={{ backgroundColor: '#b8860b' }} />

          <div className="mb-12">
            <SectionHeading>Products</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
              {PRODUCT_GRID.map((product, i) => {
                const Icon = product.icon;
                return (
                  <Link
                    key={product.title}
                    href={product.href}
                    className={`flex items-start gap-4 px-6 py-5 border-dl-border hover:bg-dl-bg-alt ${
                      i % 2 === 0 ? 'md:border-r' : ''
                    } ${i < PRODUCT_GRID.length - 2 ? 'border-b' : i < PRODUCT_GRID.length - 1 ? 'border-b md:border-b-0' : ''} border-l-4 border-l-dl-forest`}
                  >
                    <Icon className="w-5 h-5 text-dl-forest flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-dl-serif text-base text-dl-navy font-medium">{product.title}</h3>
                        <ArrowRight className="w-4 h-4 text-dl-gray-light flex-shrink-0" />
                      </div>
                      <p className="text-sm text-dl-gray mt-1">{product.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Intelligence Suite</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
              {INTELLIGENCE_GRID.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={`flex items-start gap-4 px-6 py-5 border-dl-border hover:bg-dl-bg-alt ${
                      i % 2 === 0 ? 'md:border-r' : ''
                    } ${i < INTELLIGENCE_GRID.length - 2 ? 'border-b' : i < INTELLIGENCE_GRID.length - 1 ? 'border-b md:border-b-0' : ''} border-l-4 border-l-dl-navy`}
                  >
                    <Icon className="w-5 h-5 text-dl-navy flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-dl-serif text-base text-dl-navy font-medium">{item.title}</h3>
                        <ArrowRight className="w-4 h-4 text-dl-gray-light flex-shrink-0" />
                      </div>
                      <p className="text-sm text-dl-gray mt-1">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="h-px w-full mb-12" style={{ backgroundColor: '#2d5016' }} />

          <div className="mb-12">
            <SectionHeading>Participation Path</SectionHeading>
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

          <div className="mb-12">
            <SectionHeading>Community-Led Execution</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
              <div className="relative" style={{ minHeight: '280px' }}>
                <img
                  src="/images/homepage-community.png"
                  alt="Diverse professionals collaborating on financial planning"
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                />
              </div>
              <div className="p-6 bg-dl-bg-alt border-l-4 border-l-dl-forest flex flex-col justify-center">
                <p className="text-xs text-dl-forest uppercase tracking-wider font-dl-mono mb-3">Origin: Proof of Execution</p>
                <p className="text-sm text-dl-gray leading-relaxed mb-4">
                  Before Axiom existed as software, a real community came together, pooled funds, and participated in the acquisition and development
                  of farmland with USDA support. Real people. Real coordination. Real execution.
                </p>
                <p className="text-sm text-dl-gray leading-relaxed mb-6">
                  That experience proved shared ownership works. It also proved most groups fail because coordination
                  breaks down. Axiom exists to turn what already worked into a repeatable system that can scale responsibly.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/about-us" className="text-sm text-dl-navy underline flex items-center gap-1">
                    About the Team <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link href="/disclosure" className="text-sm text-dl-navy underline flex items-center gap-1">
                    View Disclosure <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Additional Resources</SectionHeading>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
              {[
                { label: 'FAQ', href: '/faq', icon: BookOpen },
                { label: 'Product Roadmap', href: '/roadmap', icon: Target },
                { label: 'Investor Portal', href: '/syndication/portal', icon: Users },
                { label: 'Terms & Conditions', href: '/terms-and-conditions', icon: FileText },
              ].map((link, i) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`px-4 py-4 flex items-center gap-2 text-sm text-dl-navy hover:bg-dl-bg-alt ${i < 3 ? 'border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                  >
                    <Icon className="w-4 h-4 text-dl-gold flex-shrink-0" />
                    <span className="underline">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Risk Disclosure</SectionHeading>
            <div className="border border-dl-border p-6 bg-dl-bg-alt border-l-4 border-l-dl-error">
              <p className="text-xs text-dl-gray leading-relaxed mb-3">
                Axiom Protocol and its associated programs involve the acquisition, management, and disposition of real property and digital assets. All participation carries material risk, including but not limited to: total loss of capital, illiquidity of assets, regulatory changes, property depreciation, vacancy risk, and market volatility.
              </p>
              <p className="text-xs text-dl-gray leading-relaxed mb-3">
                Past performance of any asset, strategy, or model does not guarantee future results. Projections and estimates are forward-looking statements subject to change. Nothing on this platform constitutes legal, financial, or tax advice.
              </p>
              <p className="text-xs text-dl-gray leading-relaxed">
                Participation in the Capital Program is limited to qualified individuals under applicable exemptions. All participants should consult independent legal and financial advisors before committing capital.
              </p>
            </div>
          </div>

          <div className="border-t border-dl-border pt-6 mb-8">
            <div className="flex flex-col md:flex-row md:justify-between gap-4 text-xs text-dl-gray">
              <div>
                <p>Axiom Protocol. Arbitrum One (Chain ID: 42161).</p>
                <p className="mt-1">This platform does not provide investment advice. All participation carries risk of loss.</p>
              </div>
              <div className="text-right">
                <p className="font-dl-mono">{timestamp}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
