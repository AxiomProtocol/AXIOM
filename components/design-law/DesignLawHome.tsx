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
  { label: 'Network', value: 'Arbitrum One', detail: 'Chain ID 42161 — production mainnet · All contracts live' },
  { label: 'Infrastructure Layers', value: '7 Layers', detail: 'L00 Banking · L01 Settlement · L01.5 DEX · L02 Reserve · L03–05 Capital / Intelligence / Trust' },
  { label: 'Settlement Rail', value: 'AXUSD', detail: 'ERC-3643 · PSM active · Identity-gated · Exclusive unit of account' },
  { label: 'Reserve Layer', value: 'AXAU', detail: 'PAXG-backed positions · On-chain mint/redeem · Coverage enforced' },
];

const SYSTEM_LAYERS = [
  {
    num: '00',
    label: 'Fiat Entry',
    title: 'Banking Infrastructure',
    desc: 'FDIC-insured checking via First Internet Bank. ACH and wire rails through Increase. BitGo institutional custody for the on-chain layer. Capital enters here before touching any automated control layer.',
    href: '/banking',
    status: 'LIVE',
    statusColor: 'text-dl-forest',
    accent: 'border-l-dl-forest',
    icon: Landmark,
  },
  {
    num: '01',
    label: 'Settlement Layer',
    title: 'AXUSD Rail',
    desc: 'The mandatory unit of account for the entire protocol. Identity-gated via ERC-3643. Issued only through the live PSM. Not a generic stablecoin — a settlement infrastructure layer with a compliance gate at every entry point.',
    href: '/axusd-3643',
    status: 'LIVE',
    statusColor: 'text-dl-forest',
    accent: 'border-l-dl-navy',
    icon: Wallet,
  },
  {
    num: '01.5',
    label: 'Exchange + Peg Layer',
    title: 'Protocol Exchange',
    desc: 'Camelot V2 with AXM/AXUSD trading pairs. PSM-backed peg maintenance holds AXUSD at $1.00. The settlement conversion layer — not a generic DEX. Identity required for liquidity provision.',
    href: '/dex',
    status: 'LIVE',
    statusColor: 'text-dl-forest',
    accent: 'border-l-dl-gold',
    icon: Activity,
  },
  {
    num: '02',
    label: 'Reserve Layer',
    title: 'AXAU Reserve',
    desc: 'Structured around PAXG-backed reserve positions. Identity-gated via ERC-3643. Direct on-chain mint in one transaction. Coverage ratio enforced by the NAVEngine contract before every mint — the system cannot over-issue.',
    href: '/axau',
    status: 'LIVE',
    statusColor: 'text-dl-forest',
    accent: 'border-l-dl-gold',
    icon: Shield,
  },
  {
    num: '03',
    label: 'Capital Deployment',
    title: 'Capital + Lending',
    desc: 'Reg D 506(c) SPV-structured real estate programs, bridge loan LP fund, and syndication infrastructure. Settlement in AXUSD. On-chain reporting. Accredited investors — formation stage, accepting qualified expressions of interest.',
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
    desc: 'MIRDT scores nine capital regime dimensions to generate a live advisory signal. Sentinel gates authorization decisions. Observer provides independent institutional read access to treasury, governance, and risk data.',
    href: '/mirdt',
    status: 'LIVE',
    statusColor: 'text-dl-forest',
    accent: 'border-l-dl-navy',
    icon: BrainCircuit,
  },
  {
    num: '05',
    label: 'Trust + Verification',
    title: 'Solvency + Proof',
    desc: 'Three-mode solvency console: coverage ratio, reserve ratio, and LBR — derived live from a canonical on-chain snapshot. Hash-chained audit trail of every operational action. Institutional disclosure with contract addresses and coverage formulas. All public, no login.',
    href: '/solvency',
    status: 'LIVE',
    statusColor: 'text-dl-forest',
    accent: 'border-l-dl-navy',
    icon: Shield,
  },
];

const DIFFERENTIATORS = [
  {
    num: '01',
    label: 'L00 · LIVE',
    title: 'FDIC-Insured Banking Entry',
    desc: 'Fiat capital enters through a real institutional bank account — First Internet Bank via Increase ACH and wire rails. No crypto-only on-ramp. BitGo institutional custody handles the on-chain layer. Capital is traceable at every step.',
    accentColor: '#2d6a4f',
  },
  {
    num: '02',
    label: 'L01 · LIVE',
    title: 'Identity-Gated Settlement Rail',
    desc: 'AXUSD is not a wrapped stablecoin. It is issued through a live PSM, requires an ERC-3643 on-chain identity credential, and functions as the exclusive unit of account for all capital movement across the protocol.',
    accentColor: '#1e3a5f',
  },
  {
    num: '03',
    label: 'L02 · LIVE',
    title: 'Direct On-Chain Reserve Issuance',
    desc: 'AXAU is minted directly against PAXG via the GoldVault automated control layer. One transaction. No intermediary. Coverage ratio enforced on-chain before every mint — the system cannot over-issue by design.',
    accentColor: '#b8860b',
  },
  {
    num: '04',
    label: 'L03 · FORMATION',
    title: 'Reg D 506(c) Capital Deployment',
    desc: 'Capital programs are structured as SEC Reg D 506(c) private placements — bridge loan LP fund and SPV programs. Settlement is in AXUSD. On-chain reporting. Independently verifiable audit trails. Accredited investors only.',
    accentColor: '#2d6a4f',
  },
  {
    num: '05',
    label: 'L04 · LIVE',
    title: 'Nine-Dimension Capital Intelligence',
    desc: 'MIRDT scores nine capital regime dimensions to generate a live advisory signal. Sentinel gates authorization decisions. Observer provides independent institutional read access to treasury, governance, and risk data.',
    accentColor: '#1e3a5f',
  },
  {
    num: '06',
    label: 'L05 · LIVE',
    title: 'Proof of Execution — Not Attestation',
    desc: 'Every capital movement, solvency snapshot, and operational action is recorded with a hash-chained audit trail. Published live from a canonical on-chain snapshot. Publicly readable on Arbitrum One. The chain does not require trust — it requires reading.',
    accentColor: '#2d6a4f',
  },
];

const CAPITAL_FLOW = [
  { id: 'L00', label: 'USD / Fiat', sub: 'Banking — Increase ACH/Wire · FDIC-insured', href: '/banking', color: '#1D3D2A' },
  { id: 'L01', label: 'AXUSD', sub: 'Settlement Rail — ERC-3643 · PSM Active', href: '/axusd-3643', color: '#1B2A4A' },
  { id: 'L01.5', label: 'DEX / PSM', sub: 'Protocol Exchange — Peg Maintenance', href: '/dex', color: '#B8973A' },
  { id: 'L02', label: 'AXAU', sub: 'Reserve Layer — PAXG-Backed Positions', href: '/axau', color: '#B8973A' },
  { id: 'L03', label: 'Capital', sub: 'Lending Fund / SPV Deployment · Reg D', href: '/pilot', color: '#1D3D2A' },
  { id: 'L04–05', label: 'Intelligence + Trust', sub: 'MIRDT · Sentinel · Solvency · Disclosure', href: '/solvency', color: '#1B2A4A' },
];

const LIVE_STATUS = [
  { system: 'Banking Infrastructure', status: 'LIVE', note: 'FDIC-insured. ACH/wire rails. BitGo institutional custody active.', href: '/banking' },
  { system: 'AXUSD Settlement Rail', status: 'LIVE', note: 'PSM active. ERC-3643 identity required. Peg maintained.', href: '/axusd-3643' },
  { system: 'Protocol Exchange (DEX)', status: 'LIVE', note: 'Camelot V2. AXM/AXUSD pairs. PSM-backed conversion.', href: '/dex' },
  { system: 'AXAU Reserve (mint/redeem)', status: 'LIVE', note: 'Identity-gated. Direct on-chain. PAXG-backed. Coverage enforced.', href: '/axau' },
  { system: 'Regime Intelligence (MIRDT)', status: 'LIVE', note: 'Nine-dimension capital regime scoring. Live advisory signal.', href: '/mirdt' },
  { system: 'Observer Dashboard', status: 'LIVE', note: 'Treasury, governance, and risk — independently verifiable.', href: '/observer' },
  { system: 'Lending Fund (Reg D 506(c))', status: 'FORMATION', note: 'Accredited investors. Bridge loan mandate. Accepting expressions of interest.', href: '/lending-fund' },
  { system: 'Capital Program (SPVs)', status: 'FORMATION', note: 'Dual-asset. 35/35/20/10 allocation. Groups forming.', href: '/pilot' },
  { system: 'Wealth Practice Groups', status: 'FORMATION', note: '10 hubs seeded. Groups forming across multiple cities.', href: '/wealth-practice' },
  { system: 'Land Acquisition Pipeline', status: 'PLANNED', note: 'Framework designed. SEC Reg CF targeted.', href: '/land' },
];

const ENTRY_PROFILES = [
  {
    label: 'No Capital Buffer Required — Income-Backed Entry',
    subLabel: 'Your income qualifies you. No savings, no crypto, no collateral required to start.',
    route: 'Community Credit → Wealth Practice',
    desc: 'An income-backed credit line covers your first contribution. The protocol issues a credit position based on income — not savings history. Build a verifiable on-chain participation record from month one, then progress into group economics and structured deal access.',
    href: '/community-credit',
    cta: 'Apply for Entry Credit',
    accent: 'border-l-dl-forest',
    accentColor: 'text-dl-forest',
    bullets: [
      'Income-backed credit line — no collateral, no savings buffer required',
      'On-chain participation record from your first contribution',
      'Structured path from community group into real estate deal access',
    ],
  },
  {
    label: 'Group Economics — 90-Day Track Record Unlocks Deal Access',
    subLabel: 'Wealth Practice group coordination + verifiable history → structured real estate participation.',
    route: 'Wealth Practice → Syndication',
    desc: 'Join a Wealth Practice group. Coordinate pooled resources on-chain and build a 90-day participation record. After a verified track record, unlock access to structured real estate deal opportunities through Axiom Syndication. Groups forming now.',
    href: '/wealth-practice',
    cta: 'Browse Open Groups',
    accent: 'border-l-dl-gold',
    accentColor: 'text-dl-gold',
    bullets: [
      'On-chain settlement within every group — every transaction recorded',
      'Structured deal access unlocks after a 90-day verified record',
      'Start at your capital level — progressive commitment model',
    ],
  },
  {
    label: 'Qualified Allocators — Reg D 506(c) Structured Access',
    subLabel: 'Bridge loan fund · SPV programs · Secondary market · Independently verifiable reporting.',
    route: 'Syndication → Lending Fund',
    desc: 'Access Reg D 506(c) structured offerings, the bridge loan LP fund, and secondary market transfers. On-chain settlement in AXUSD. Live solvency reporting. Independently verifiable audit trails. No narrative — just the chain.',
    href: '/syndication',
    cta: 'View Capital Programs',
    accent: 'border-l-dl-navy',
    accentColor: 'text-dl-navy',
    bullets: [
      'Reg D 506(c) qualified offerings — accredited investors only',
      'On-chain LP participation with live solvency and yield reporting',
      'Secondary transfer infrastructure with permissioned settlement layer',
    ],
  },
  {
    label: 'Self-Custody Reserve Position — AXAU via ERC-3643',
    subLabel: 'One identity credential. One transaction. Direct on-chain reserve issuance. No intermediary.',
    route: 'Identity Credential → AXAU',
    desc: 'Apply for an ERC-3643 identity credential once. Then access AXAU — structured around PAXG-backed reserve positions — via direct on-chain mint in a single transaction, or through the Assisted Mint path using AXUSD. Self-custody throughout. Coverage ratio enforced on-chain.',
    href: '/axau-early-access',
    cta: 'Apply for Reserve Access',
    accent: 'border-l-dl-gold',
    accentColor: 'text-dl-gold',
    bullets: [
      'ERC-3643 identity credential required — one-time application, permanently valid',
      'Direct on-chain mint via GoldVault automated control layer — one transaction',
      'Coverage ratio enforced by NAVEngine before every mint — cannot over-issue',
    ],
  },
];

const TRUST_ANCHORS = [
  {
    label: 'Proof of Execution',
    desc: 'Hash-chained audit trail of every operational action, capital movement, and solvency snapshot. Publicly readable on Arbitrum One. No account required. No trust required.',
    href: '/proof-of-execution',
    status: 'LIVE',
  },
  {
    label: 'Three-Mode Solvency Console',
    desc: 'Coverage ratio, reserve ratio, and liability-backed reserve — derived live from a canonical on-chain snapshot. Not a dashboard of claims. A verification layer with public access.',
    href: '/solvency',
    status: 'LIVE',
  },
  {
    label: 'Institutional Disclosure',
    desc: 'Contract addresses, coverage formulas, operational status by layer, policy mode, and the complete legal framework — available without login, without email, without narrative.',
    href: '/disclosure',
    status: 'LIVE',
  },
  {
    label: 'Observer Dashboard',
    desc: 'Treasury balance, reserve composition, governance state, and node performance — live from Arbitrum One. Independent read access for institutional participants. No account. No login.',
    href: '/observer',
    status: 'LIVE',
  },
];

const PARTICIPATION_STEPS = [
  {
    step: '01',
    title: 'Verify First',
    description: 'Read the solvency console, institutional disclosure, and proof-of-execution logs. Every claim on this platform has an on-chain record. Verify before you engage capital.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'Connect Your Wallet',
    description: 'Access the platform with a self-custody wallet on Arbitrum One. View live reserve metrics, governance state, and on-chain data — no account needed.',
    icon: Wallet,
  },
  {
    step: '03',
    title: 'Choose Your Layer',
    description: 'Reserve (AXAU) · Settlement (AXUSD) · Capital (Lending / Capital Program) · Community (Wealth Practice). Each path is designed for a specific intent and capital position.',
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
        <title>Axiom Protocol | On-Chain Financial Infrastructure for Real-World Assets</title>
        <meta name="description" content="Axiom Protocol is a vertically integrated financial operating system — banking, settlement, reserve, capital deployment, and intelligence — built on Arbitrum One for real-world assets." />
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
          <div className="relative w-full" style={{ height: '420px' }}>
            <img
              src="/images/homepage-hero.png"
              alt="On-chain financial infrastructure for real-world assets on Arbitrum One"
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
            />
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(14, 28, 55, 0.78)' }}>
              <div className="max-w-7xl mx-auto px-6 h-full flex flex-col justify-center">
                <h1 className="font-dl-serif text-3xl md:text-5xl leading-tight mb-6" style={{ color: '#ffffff', maxWidth: '760px', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
                  The Financial Operating System<br className="hidden md:block" />
                  for the On-Chain Economy.<br className="hidden md:block" />
                  <span style={{ color: '#f0d98a' }}>Verifiable. Institutional. Live.</span>
                </h1>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  <Link href="/infrastructure">
                    <span className="inline-block border-2 border-white text-white px-5 py-2.5 text-sm font-bold hover:bg-white hover:text-dl-navy font-dl-mono uppercase tracking-wider">
                      Verify the Infrastructure →
                    </span>
                  </Link>
                  <Link href="/axau-early-access">
                    <span className="inline-block border border-white text-white px-5 py-2.5 text-sm font-bold hover:bg-white hover:text-dl-navy font-dl-mono uppercase tracking-wider" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
                      Apply for Reserve Access
                    </span>
                  </Link>
                  <Link href="/disclosure">
                    <span className="inline-block border border-white text-white px-5 py-2.5 text-sm font-bold hover:bg-white hover:text-dl-navy font-dl-mono uppercase tracking-wider" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                      Institutional Disclosure
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INTRO STRIP — content moved from hero */}
        <div className="border-b border-dl-border" style={{ backgroundColor: '#f8f7f4' }}>
          <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center gap-6">
            <p className="text-sm leading-relaxed text-dl-navy flex-1" style={{ maxWidth: '680px' }}>
              FDIC-insured banking enters capital. Identity-gated AXUSD settles it. The DEX maintains the peg. AXAU holds reserve positions structured around PAXG. Reg D capital programs deploy it. Intelligence scores it. Solvency proves it. One operating system — not a collection of tokens.
            </p>
            <p className="font-dl-mono text-xs text-dl-gray whitespace-nowrap md:text-right leading-relaxed">
              L00 Banking · L01 AXUSD Rail<br />
              L01.5 DEX + PSM · L02 AXAU Reserve<br />
              L03 Capital · L04 Intelligence · L05 Trust<br />
              <span className="text-dl-navy font-bold">Arbitrum One</span>
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">

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

          {/* WHAT AXIOM IS NOT — CLARITY STRIP */}
          <div className="mb-10 border border-dl-border border-l-4 border-l-dl-navy bg-dl-bg-alt">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
              {[
                { label: 'Not a Token Launch', detail: 'AXM is a governance token, not an investment product. No presale. No fundraise built on token appreciation.' },
                { label: 'Not a Yield Protocol', detail: 'No guaranteed returns. No APY claims. Capital programs disclose risk as Reg D private placements.' },
                { label: 'Not a Narrative', detail: 'Every system claim has a contract address. Every solvency figure has an on-chain source. Verify it yourself.' },
                { label: 'Not Custodial', detail: 'Self-custody throughout. AXUSD, AXAU, and AXM remain in your wallet. The protocol never holds your keys.' },
              ].map((item, i) => (
                <div key={item.label} className={`px-5 py-4 ${i < 3 ? 'border-b sm:border-b-0 sm:border-r border-dl-border' : ''}`}>
                  <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-xs text-dl-gray leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* WHY INFRASTRUCTURE */}
          <div className="mb-14">
            <div className="mb-6">
              <SectionHeading>Six Verifiable Properties That Make This Infrastructure</SectionHeading>
              <p className="text-sm text-dl-gray mt-1 max-w-2xl">
                Each property is independently confirmed on Arbitrum One without trusting the team. No narrative required.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-dl-border">
              {DIFFERENTIATORS.map((item, i) => (
                <div
                  key={item.num}
                  className={`px-5 py-5 border-l-4 ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} ${i < DIFFERENTIATORS.length - 3 ? 'border-b border-dl-border' : ''} ${i % 3 !== 2 ? 'lg:border-r lg:border-dl-border' : ''}`}
                  style={{ borderLeftColor: item.accentColor }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-dl-mono text-xs text-dl-gray">{item.num}</span>
                    <span className="font-dl-mono text-xs px-1.5 py-0.5 border" style={{ color: item.accentColor, borderColor: item.accentColor }}>{item.label}</span>
                  </div>
                  <h3 className="font-dl-serif text-base text-dl-navy font-bold mb-2">{item.title}</h3>
                  <p className="text-xs text-dl-gray leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="border border-t-0 border-dl-border px-5 py-3 bg-dl-bg-alt flex items-center justify-between">
              <p className="text-xs text-dl-gray font-dl-mono">Each layer has a contract address on Arbiscan. Verify before engaging capital.</p>
              <Link href="/infrastructure" className="text-xs text-dl-navy underline font-dl-mono">Full infrastructure overview →</Link>
            </div>
          </div>

          {/* CAPITAL FLOW */}
          <div className="mb-14">
            <div className="mb-5">
              <SectionHeading>How Capital Moves Through the System</SectionHeading>
              <p className="text-sm text-dl-gray mt-1 max-w-2xl">
                Every layer of the protocol connects to the next. Fiat enters through banking rails, converts to the settlement unit, moves into the reserve layer or capital programs — all verifiable on-chain.
              </p>
            </div>
            <div className="border border-dl-border">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0">
                {CAPITAL_FLOW.map((node, i) => (
                  <Link
                    key={node.id}
                    href={node.href}
                    className={`block no-underline group ${i < CAPITAL_FLOW.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-dl-border' : ''}`}
                  >
                    <div className="px-4 py-5 bg-dl-bg group-hover:bg-dl-bg-alt h-full flex flex-col justify-between">
                      <div>
                        <p className="font-dl-mono text-xs text-dl-gray mb-1 uppercase tracking-wider">{node.id}</p>
                        <p className="font-dl-serif text-base text-dl-navy font-bold mb-1">{node.label}</p>
                        <p className="text-xs text-dl-gray leading-relaxed">{node.sub}</p>
                      </div>
                      {i < CAPITAL_FLOW.length - 1 && (
                        <div className="hidden lg:flex items-center justify-end mt-3">
                          <span className="font-dl-mono text-xs text-dl-gray">→</span>
                        </div>
                      )}
                    </div>
                    <div className="h-1" style={{ backgroundColor: node.color }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* SYSTEM ARCHITECTURE */}
          <div className="mb-14">
            <div className="mb-6">
              <SectionHeading>Protocol Architecture</SectionHeading>
              <p className="text-sm text-dl-gray mt-1 max-w-2xl">
                Axiom is a seven-layer financial operating system. Each layer is purpose-built, independently verifiable on Arbitrum One, and connected to the layers above and below it.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border">
              {SYSTEM_LAYERS.map((layer, i) => {
                const Icon = layer.icon;
                return (
                  <Link
                    key={layer.num}
                    href={layer.href}
                    className={`block px-5 py-5 border-l-4 ${layer.accent} ${i < SYSTEM_LAYERS.length - 1 ? 'border-b lg:border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} hover:bg-dl-bg-alt no-underline`}
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

          {/* LIVE INFRASTRUCTURE STATUS */}
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
            <div className="border border-t-0 border-dl-border px-5 py-3 bg-dl-bg-alt flex items-center justify-between">
              <p className="text-xs text-dl-gray font-dl-mono">Live / Formation / Planned reflects current operational state — not projections.</p>
              <Link href="/solvency" className="text-xs text-dl-navy underline font-dl-mono">
                View live solvency dashboard →
              </Link>
            </div>
          </div>

          <div className="h-px w-full mb-14" style={{ backgroundColor: '#2d5016' }} />

          {/* ENTRY PATHS */}
          <div className="mb-14">
            <div className="mb-6">
              <SectionHeading>Choose Your Access Path</SectionHeading>
              <p className="text-sm text-dl-gray mt-1">Each path is designed for a specific participation intent. Choose the layer that matches where you are.</p>
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
            <SectionHeading>Capital Deployment Structure</SectionHeading>
            <div className="border border-dl-border mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-6 border-b md:border-b-0 md:border-r border-dl-border bg-dl-bg border-l-4 border-l-dl-forest">
                  <p className="text-xs text-dl-forest uppercase tracking-wider font-dl-mono mb-2">SPV-1 — Cash Flow Anchor</p>
                  <h3 className="font-dl-serif text-lg text-dl-navy mb-1">Multifamily Residential</h3>
                  <p className="text-sm text-dl-gray mb-4">Multifamily residential property generating recurring income through occupancy-driven cash flow. On-chain reporting and settlement.</p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                    <div>
                      <p className="text-xs text-dl-gray">Acquisition Target</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">$600,000</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Strategy</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">Cash Flow</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Mandate</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">Reg D 506(c)</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Stage</p>
                      <p className="font-dl-mono text-sm text-dl-forest font-semibold">Formation</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-dl-bg-alt border-l-4 border-l-dl-gold">
                  <p className="text-xs text-dl-gold uppercase tracking-wider font-dl-mono mb-2">SPV-2 — Appreciation Asset</p>
                  <h3 className="font-dl-serif text-lg text-dl-navy mb-1">Commercial / Industrial</h3>
                  <p className="text-sm text-dl-gray mb-4">Commercial or industrial property positioned for long-term value growth through strategic repositioning and development activity.</p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                    <div>
                      <p className="text-xs text-dl-gray">Acquisition Target</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">$350,000</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Strategy</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">Appreciation</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Mandate</p>
                      <p className="font-dl-mono text-sm text-dl-navy font-semibold">Reg D 506(c)</p>
                    </div>
                    <div>
                      <p className="text-xs text-dl-gray">Stage</p>
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
                View full Capital Deployment Layer →
              </Link>
            </div>
          </div>

          <div className="h-px w-full mb-14" style={{ backgroundColor: '#2d5016' }} />

          {/* TRUST ANCHORS */}
          <div className="mb-14">
            <div className="mb-5">
              <SectionHeading>Verification and Trust Infrastructure</SectionHeading>
              <p className="text-sm text-dl-gray mt-1">
                Four independently verifiable trust layers. No narrative required — read the chain.
              </p>
            </div>
            <div className="mb-5 border border-dl-border border-l-4 border-l-dl-forest p-5 bg-dl-bg-alt">
              <p className="text-xs text-dl-forest uppercase tracking-wider font-dl-mono mb-1">Verification Principle</p>
              <p className="font-dl-serif text-lg text-dl-navy">The chain does not require trust — it requires reading.</p>
              <p className="text-sm text-dl-gray mt-1 max-w-2xl">Four independently verifiable trust layers. All on Arbitrum One. All public. No login, no email, no narrative.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border mb-6">
              {TRUST_ANCHORS.map((anchor, i) => (
                <Link
                  key={anchor.label}
                  href={anchor.href}
                  className={`block p-6 border-t-4 border-t-dl-forest no-underline hover:bg-dl-bg-alt ${i < TRUST_ANCHORS.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-dl-serif text-base text-dl-navy font-bold">{anchor.label}</p>
                    <StatusChip status={anchor.status} />
                  </div>
                  <p className="text-sm text-dl-gray leading-relaxed mb-4">{anchor.desc}</p>
                  <p className="text-xs text-dl-navy font-dl-mono font-bold inline-flex items-center gap-1">
                    Verify →
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* PROOF / EXECUTION */}
          <div className="mb-14">
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

          {/* PROTOCOL COMMITMENTS */}
          <div className="mb-14 border border-dl-border border-t-4 border-t-dl-forest">
            <div className="px-5 py-4 border-b border-dl-border bg-dl-bg-alt">
              <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Protocol Commitments — No Exceptions</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              {[
                {
                  heading: 'No Trust Required',
                  body: 'Every contract address is on Arbiscan. Every solvency figure comes from a canonical on-chain snapshot. Every operational action has a hash-chained audit trail. Read the chain, not the team.',
                  accent: 'border-l-dl-forest',
                },
                {
                  heading: 'Self-Custody by Default',
                  body: 'AXUSD, AXAU, and AXM remain in your wallet throughout. The protocol moves value through automated control layers — not through custodial accounts. Your keys. Your assets.',
                  accent: 'border-l-dl-navy',
                },
                {
                  heading: 'Institutional Disclosure Standard',
                  body: 'Contract addresses, coverage formulas, operational status, policy mode, and the full legal framework are published without login, without email, without a narrative framing the data.',
                  accent: 'border-l-dl-gold',
                },
              ].map((c, i) => (
                <div key={c.heading} className={`p-6 border-l-4 ${c.accent} ${i < 2 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                  <h3 className="font-dl-serif text-base text-dl-navy font-bold mb-2">{c.heading}</h3>
                  <p className="text-sm text-dl-gray leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FINAL CTA */}
          <div className="mb-14 border border-dl-border border-t-4 border-t-dl-navy">
            <div className="p-10 bg-dl-bg-alt text-center">
              <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest mb-4">Axiom Protocol · Seven Layers · Arbitrum One · Mainnet Live</p>
              <h2 className="font-dl-serif text-2xl md:text-4xl text-dl-navy mb-4" style={{ maxWidth: '680px', margin: '0 auto 16px' }}>
                The solvency console is public.<br />
                The contract addresses are on Arbiscan.<br />
                <span className="text-dl-gold">Verify it. Then decide.</span>
              </h2>
              <p className="text-sm text-dl-gray leading-relaxed mb-8" style={{ maxWidth: '560px', margin: '0 auto 32px' }}>
                No account. No email. No narrative required. The solvency console, proof-of-execution logs, institutional disclosure, and Observer dashboard are publicly accessible right now. Read the chain. Then choose your path.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap mb-6">
                <Link href="/infrastructure" className="inline-flex items-center gap-2 border-2 border-dl-navy bg-dl-navy text-white px-6 py-3 text-xs font-bold hover:bg-transparent hover:text-dl-navy font-dl-mono uppercase tracking-wider">
                  Verify the Infrastructure <ArrowRight className="w-3 h-3" />
                </Link>
                <Link href="/solvency" className="inline-flex items-center gap-2 border border-dl-gold text-dl-gold px-6 py-3 text-xs font-bold hover:bg-dl-gold hover:text-white font-dl-mono uppercase tracking-wider">
                  Live Solvency Console <ArrowRight className="w-3 h-3" />
                </Link>
                <Link href="/axau-early-access" className="inline-flex items-center gap-2 border border-dl-navy text-dl-navy px-6 py-3 text-xs font-bold hover:bg-dl-navy hover:text-white font-dl-mono uppercase tracking-wider">
                  Apply for Reserve Access <ArrowRight className="w-3 h-3" />
                </Link>
                <Link href="/disclosure" className="inline-flex items-center gap-2 border border-dl-border text-dl-navy px-6 py-3 text-xs font-bold hover:bg-dl-bg-alt font-dl-mono uppercase tracking-wider">
                  Institutional Disclosure <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/observer" className="text-xs text-dl-navy underline font-dl-mono">Observer Dashboard →</Link>
                <Link href="/proof-of-execution" className="text-xs text-dl-navy underline font-dl-mono">Proof of Execution →</Link>
                <Link href="/contact" className="text-xs text-dl-navy underline font-dl-mono">Contact the Team →</Link>
              </div>
              <p className="text-xs text-dl-gray font-dl-mono mt-5">L00 Banking · L01 Settlement · L01.5 Exchange · L02 Reserve · L03 Capital · L04 Intelligence · L05 Trust</p>
            </div>
          </div>

          {/* FOOTER LINKS */}
          <div className="border-t border-dl-border pt-8 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-2">
              {[
                { label: 'AXAU Reserve', href: '/axau' },
                { label: 'AXUSD Settlement Rail', href: '/axusd-3643' },
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
