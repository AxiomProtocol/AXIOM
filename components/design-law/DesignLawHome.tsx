import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConnectWalletButton } from './ConnectWalletButton';
import { SectionHeading } from './SectionHeading';
import { SolidButton } from './SolidButton';

const PLATFORM_STATS = [
  { label: 'Real Land Acquired', value: '6+ Acres', detail: 'Community farmland, USDA-supported' },
  { label: 'Network', value: 'Arbitrum One', detail: 'Chain ID 42161' },
  { label: 'Governance Asset', value: 'AXM', detail: 'Live on mainnet' },
  { label: 'Verified Contracts', value: '72', detail: 'Auditable on-chain' },
];

const PRODUCT_SECTIONS = [
  {
    title: 'Axiom Capital Program',
    description: 'A $1M dual-asset program with two SPVs, 35/35/20/10 treasury allocation policy, and institutional-grade reporting for 20-30 qualified participants.',
    href: '/pilot',
    linkLabel: 'View Capital Program',
  },
  {
    title: 'Lending Fund',
    description: 'SEC Reg D 506(c) compliant bridge loan fund providing short-term capital for real asset acquisition and development.',
    href: '/lending-fund',
    linkLabel: 'View Fund Overview',
  },
  {
    title: 'DEX Exchange',
    description: '10 mainnet contracts on Arbitrum One enabling on-chain asset exchange with full audit trail and transparent settlement.',
    href: '/dex',
    linkLabel: 'Open Exchange',
  },
  {
    title: 'Market Intelligence Terminal',
    description: 'Probabilistic trend-following analysis for digital assets and US equities. Full audit trail, paper-trade ledger, and institutional terminology.',
    href: '/mirdt',
    linkLabel: 'Open Terminal',
  },
  {
    title: 'Institutional Observer',
    description: 'Read-only transparency dashboard providing real-time visibility into protocol treasury, capital flows, and governance activity.',
    href: '/observer',
    linkLabel: 'View Observer',
  },
];

const PARTICIPATION_STEPS = [
  { step: '1', title: 'Review', description: 'Read the transparency reports, audit trails, and risk disclosures to understand the protocol structure.' },
  { step: '2', title: 'Connect', description: 'Access the platform with your custody account on Arbitrum One to view live data and governance tools.' },
  { step: '3', title: 'Participate', description: 'Engage with the Capital Program, Lending Fund, or Exchange based on your qualification and intent.' },
];

const NAV_LINKS = [
  { href: '/about-us', label: 'About' },
  { href: '/disclosure', label: 'Disclosure' },
  { href: '/founder-ops', label: 'Founder Ops' },
  { href: '/solvency', label: 'Solvency' },
  { href: '/products', label: 'Products' },
  { href: '/pilot', label: 'Capital Program' },
  { href: '/lending-fund', label: 'Lending Fund' },
  { href: '/dex', label: 'Exchange' },
  { href: '/mirdt', label: 'Intelligence' },
  { href: '/sentinel', label: 'Sentinel' },
  { href: '/observer', label: 'Observer' },
  { href: '/depin/denet', label: 'DePIN' },
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
        <title>Axiom Protocol | Coordination-First Economic Infrastructure</title>
      </Head>
      <div className="design-law-root min-h-screen bg-dl-bg">
        <nav className="border-b border-dl-border bg-dl-bg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-dl-serif text-lg text-dl-navy font-bold">
              AXIOM
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm text-dl-navy">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:underline">{link.label}</Link>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <ConnectWalletButton />
              </div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 text-dl-navy border border-dl-border bg-dl-bg"
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
            <div className="md:hidden border-t border-dl-border bg-dl-bg">
              <div className="max-w-7xl mx-auto px-6 py-3">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block py-2 text-sm text-dl-navy border-b border-dl-border last:border-b-0 hover:underline"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-3">
                  <ConnectWalletButton />
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="border-b border-dl-border pb-10 mb-10">
            <p className="text-xs text-dl-gray uppercase tracking-widest mb-4 font-dl-mono">Axiom Protocol</p>
            <h1 className="font-dl-serif text-4xl md:text-5xl text-dl-navy leading-tight mb-4">
              Community Ownership Infrastructure for Real Assets
            </h1>
            <h2 className="font-dl-serif text-xl md:text-2xl text-dl-gray mb-6">
              A $1M Capital Program Backing Real Property, On-Chain
            </h2>
            <p className="text-sm text-dl-gray max-w-3xl leading-relaxed mb-8">
              Axiom is building the economic infrastructure for community-led real asset ownership.
              Our Capital Program deploys capital into two real properties through structured SPVs,
              with transparent treasury allocation, institutional-grade reporting, and full audit trails.
              No speculation. No hype. Just disciplined execution backed by land already acquired.
            </p>
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

          <div className="mb-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
              {PLATFORM_STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`px-4 py-4 ${i < PLATFORM_STATS.length - 1 ? 'border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                >
                  <p className="text-xs text-dl-gray mb-1">{stat.label}</p>
                  <p className="font-dl-mono text-lg font-semibold text-dl-navy">{stat.value}</p>
                  <p className="text-xs text-dl-gray mt-1">{stat.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Capital Program Structure</SectionHeading>
            <div className="border border-dl-border mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-6 border-b md:border-b-0 md:border-r border-dl-border bg-dl-bg">
                  <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">SPV-1</p>
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
                <div className="p-6 bg-dl-bg-alt">
                  <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">SPV-2</p>
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
            <div className="border border-dl-border p-5 bg-dl-bg-alt mb-1">
              <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Treasury Allocation Policy</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="font-dl-mono text-xl text-dl-navy font-bold">35%</p>
                  <p className="text-xs text-dl-gray mt-1">Property Equity</p>
                </div>
                <div>
                  <p className="font-dl-mono text-xl text-dl-navy font-bold">35%</p>
                  <p className="text-xs text-dl-gray mt-1">Debt Service</p>
                </div>
                <div>
                  <p className="font-dl-mono text-xl text-dl-navy font-bold">20%</p>
                  <p className="text-xs text-dl-gray mt-1">Operating Reserve</p>
                </div>
                <div>
                  <p className="font-dl-mono text-xl text-dl-navy font-bold">10%</p>
                  <p className="text-xs text-dl-gray mt-1">Protocol Development</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Protocol Products</SectionHeading>
            <div className="border border-dl-border">
              {PRODUCT_SECTIONS.map((product, i) => (
                <div
                  key={product.title}
                  className={`px-6 py-5 ${i < PRODUCT_SECTIONS.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="font-dl-serif text-base text-dl-navy font-medium">{product.title}</h3>
                      <p className="text-sm text-dl-gray mt-1 max-w-2xl">{product.description}</p>
                    </div>
                    <Link href={product.href} className="text-sm text-dl-navy underline whitespace-nowrap">
                      {product.linkLabel}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Participation Path</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
              {PARTICIPATION_STEPS.map((step, i) => (
                <div
                  key={step.step}
                  className={`px-6 py-5 ${i < PARTICIPATION_STEPS.length - 1 ? 'md:border-r border-b md:border-b-0 border-dl-border' : ''}`}
                >
                  <p className="font-dl-mono text-2xl text-dl-navy font-bold mb-2">{step.step}</p>
                  <h3 className="font-dl-serif text-base text-dl-navy mb-2">{step.title}</h3>
                  <p className="text-sm text-dl-gray leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Origin: Proof of Execution</SectionHeading>
            <div className="border border-dl-border bg-dl-bg-alt p-6">
              <p className="text-sm text-dl-gray leading-relaxed mb-4">
                Before Axiom existed as software, a real community came together, pooled funds, acquired six acres
                of farmland, and developed it into a working farm with USDA support. Real people. Real land. Real outcomes.
              </p>
              <p className="text-sm text-dl-gray leading-relaxed mb-4">
                That experience proved shared ownership works. It also proved most groups fail because coordination
                breaks down. Axiom exists to turn what already worked into a repeatable system that can scale responsibly.
              </p>
              <div className="flex gap-3 mt-4">
                <Link href="/about-us" className="text-sm text-dl-navy underline">About the Team</Link>
                <Link href="/transparency" className="text-sm text-dl-navy underline">View Transparency Reports</Link>
                <Link href="/community" className="text-sm text-dl-navy underline">Join the Community</Link>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Additional Resources</SectionHeading>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
              {[
                { label: 'FAQ', href: '/faq' },
                { label: 'Product Roadmap', href: '/roadmap' },
                { label: 'Community Impact', href: '/impact' },
                { label: 'Terms & Conditions', href: '/terms-and-conditions' },
              ].map((link, i) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-4 py-3 text-sm text-dl-navy underline ${i < 3 ? 'border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <SectionHeading>Risk Disclosure</SectionHeading>
            <div className="border border-dl-border p-6 bg-dl-bg-alt">
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
