import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConnectWalletButton } from './ConnectWalletButton';
import { NAV_ITEMS } from './navItems';
import { NavDropdown } from './NavDropdown';
import HomepageAnalytics from '../analytics/HomepageAnalytics';
import {
  ArrowRight, ChevronRight, CheckCircle2,
  TrendingUp, Coins, ShieldCheck, Eye,
  BarChart3, KeyRound, Layers,
  Activity, Banknote, Network,
  FileText,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Homepage V5 — Dual-purpose institutional front door.
// All factual claims come from /api/homepage/truth (HomepageTruthService).
// Static sections below are positioning copy — no factual status claims.
// ─────────────────────────────────────────────────────────────────────────────

type ClaimStatus = 'live' | 'configured' | 'formation' | 'planned' | 'inactive';

interface TrustItem { label: string; verifiedFrom: string; }
interface PathCard { key: string; title: string; body: string; cta: string; href: string; available: boolean; verifiedFrom: string; }
interface TrustCard { title: string; body: string; href: string; verifiedFrom: string; }
interface StatusRow { system: string; status: ClaimStatus; note: string; href: string; verifiedFrom: string; }
interface AvailabilityItem { label: string; available: boolean; href: string; verifiedFrom: string; }
interface MomentumSignal { label: string; value: string; accent: 'live' | 'neutral' | 'stale'; href?: string; verifiedFrom: string; }
interface ProofLink { label: string; href: string; available: boolean; verifiedFrom: string; }
interface OptionalMetric { label: string; value: string; verifiedFrom: string; }
interface HeroCta { primaryLabel: string; primaryHref: string; variant: string; verifiedFrom: string; }

interface HomepageTruth {
  hero: { headline: string; subheadline: string; headlineVariant?: 'A'|'B'|'C'; headlineVerifiedFrom?: string; trustItems: TrustItem[]; cta: HeroCta };
  pathCards: PathCard[];
  trustCards: TrustCard[];
  status: StatusRow[];
  availability: AvailabilityItem[];
  momentum: MomentumSignal[];
  proofLinks: { verify: ProofLink; proof: ProofLink; solvency: ProofLink; disclosure: ProofLink };
  metrics: OptionalMetric[];
  snapshotId: string | null;
  generatedAt: string;
}

const FALLBACK_TRUTH: HomepageTruth = {
  hero: {
    headline: 'The Financial Operating System for Real-World Assets',
    subheadline: 'On-chain settlement infrastructure, reserve access, structured capital formation, and public proof — connected and reviewable before capital moves.',
    trustItems: [
      { label: 'Built on Arbitrum One', verifiedFrom: 'fallback' },
      { label: 'Self-custody by default', verifiedFrom: 'fallback' },
      { label: 'Verified access controls', verifiedFrom: 'fallback' },
    ],
    cta: { primaryLabel: 'Start Here →', primaryHref: '/start', variant: 'start_here', verifiedFrom: 'fallback' },
  },
  pathCards: [],
  trustCards: [],
  status: [],
  availability: [],
  momentum: [],
  proofLinks: {
    verify:     { label: 'Verify Infrastructure',         href: '/infrastructure', available: true, verifiedFrom: 'fallback' },
    proof:      { label: 'View Live Proof',               href: '/solvency',       available: true, verifiedFrom: 'fallback' },
    solvency:   { label: 'Open Solvency Console',         href: '/solvency',       available: true, verifiedFrom: 'fallback' },
    disclosure: { label: 'Read Institutional Disclosure', href: '/disclosure',     available: true, verifiedFrom: 'fallback' },
  },
  metrics: [],
  snapshotId: null,
  generatedAt: '',
};

// ── Path card metadata (icon + audience framing) ──────────────────────────────
const PATH_META: Record<string, { icon: React.ComponentType<{ className?: string }>; audience: string; accentCls: string; color: string }> = {
  earn:         { icon: TrendingUp,  audience: 'For Savers',                 accentCls: 'border-t-2 border-dl-forest', color: 'text-dl-forest' },
  borrow:       { icon: Coins,       audience: 'For Bitcoin Holders',         accentCls: 'border-t-2 border-dl-navy',   color: 'text-dl-navy'   },
  reserve:      { icon: ShieldCheck, audience: 'For Reserve Participants',    accentCls: 'border-t-2 border-dl-gold',   color: 'text-dl-gold'   },
  intelligence: { icon: Activity,    audience: 'For Regime-Aware Operators',  accentCls: 'border-t-2 border-dl-navy',   color: 'text-dl-navy'   },
  property:     { icon: BarChart3,   audience: 'For Property Investors',      accentCls: 'border-t-2 border-dl-forest', color: 'text-dl-forest' },
  capital:      { icon: Banknote,    audience: 'For Capital Participants',     accentCls: 'border-t-2 border-dl-gold',   color: 'text-dl-gold'   },
  community:    { icon: Network,     audience: 'For Community Members',        accentCls: 'border-t-2 border-dl-forest', color: 'text-dl-forest' },
  verify:       { icon: Eye,         audience: 'For Diligence-First Users',   accentCls: 'border-t-2 border-dl-navy',   color: 'text-dl-navy'   },
};

// ── Section 2 — Choose Your Path (audience cards) ─────────────────────────────
// Positioning statements only — not factual status claims.
const AUDIENCE_CARDS = [
  {
    tag: 'Recommended Starting Point',
    audience: 'New to Axiom',
    headline: 'Start with what is already live',
    body: 'See what the protocol is, what is live today, and where you fit — before committing capital. No wallet required, no signup gate.',
    cta: 'Start Here',
    href: '/start',
    accentCls: 'border-t-4 border-dl-gold',
    tagColor: 'text-dl-gold',
  },
  {
    tag: 'Formal Review Path',
    audience: 'Accredited Investor',
    headline: 'Read the disclosure before engaging',
    body: 'Review the institutional disclosure, inspect the solvency console, and begin a formal Reg D 506(c) inquiry once your diligence is complete.',
    cta: 'Begin Review',
    href: '/disclosure',
    accentCls: 'border-t-4 border-dl-navy',
    tagColor: 'text-dl-navy',
  },
  {
    tag: 'Verification Path',
    audience: 'Technical Operator',
    headline: 'Inspect the contracts directly',
    body: 'Verify bytecode on Arbitrum One, audit the contract architecture, review the hash-chained operations log, and explore the full system map.',
    cta: 'Inspect Infrastructure',
    href: '/infrastructure',
    accentCls: 'border-t-4 border-dl-forest',
    tagColor: 'text-dl-forest',
  },
];

// ── Section 4 — Why Axiom Is Different ────────────────────────────────────────
const WHY_DIFFERENT = [
  {
    icon: KeyRound,
    title: 'Control',
    body: 'AXUSD, AXAU, and AXM remain in your wallet at all times. The protocol never holds your keys.',
  },
  {
    icon: Eye,
    title: 'Visibility',
    body: 'Public solvency console, institutional disclosure, and operations log — readable without a login.',
  },
  {
    icon: ShieldCheck,
    title: 'Access',
    body: 'Reserve, yield, and capital pathways are structured through verified entry — not open doors with no controls.',
  },
  {
    icon: Layers,
    title: 'Infrastructure',
    body: 'Banking, settlement, intelligence, property, and community programs operate in one connected framework.',
  },
];

// ── Section 5 — Proof Before Capital (4 trust containers) ────────────────────
// Hrefs reference real pages; always shown. No fabricated claims.
const PROOF_CONTAINERS = [
  {
    label: 'Public Reserves',
    headline: 'Reserve composition is publicly disclosed',
    body: 'AXAU reserve backing, PAXG and XAUT holdings, and the oracle price methodology — all verifiable on-chain.',
    href: '/axau',
    icon: ShieldCheck,
  },
  {
    label: 'Institutional Disclosure',
    headline: 'Contracts, formulas, and operational status',
    body: 'No login required to read the contract architecture, risk parameters, and the full operational framework.',
    href: '/disclosure',
    icon: FileText,
  },
  {
    label: 'Solvency Console',
    headline: 'Live coverage ratios — publicly readable',
    body: 'Coverage ratios, reserve balances, and snapshot provenance — derived on-chain and open to any visitor.',
    href: '/solvency',
    icon: BarChart3,
  },
  {
    label: 'Operations Log',
    headline: 'Every action hash-chained and recorded',
    body: 'A cryptographic record of all operational actions — no narrative required, no trust assumption required.',
    href: '/proof-of-execution',
    icon: Activity,
  },
];

// ── Section 7 — Core Product Ecosystem ───────────────────────────────────────
const PRIMARY_PRODUCTS = [
  {
    label: 'AXUSD',
    category: 'Settlement Layer',
    desc: 'Identity-gated digital dollar on Arbitrum One. ERC-3643 compliant. Used for settlement, yield, and reserve conversion.',
    href: '/axusd-3643',
    status: 'live' as ClaimStatus,
  },
  {
    label: 'Lending Fund',
    category: 'Capital Formation',
    desc: 'Reg D 506(c) accredited investor fund in formation. Structured AXUSD lending markets via Euler V2.',
    href: '/lending-fund',
    status: 'formation' as ClaimStatus,
  },
  {
    label: 'Wealth Practice',
    category: 'Community Layer',
    desc: 'Structured community group economics — coordinated capital formation, pooled participation, and shared wealth infrastructure.',
    href: '/wealth-practice',
    status: 'live' as ClaimStatus,
  },
];

const SECONDARY_PRODUCTS = [
  { label: 'AXAU Reserve',         href: '/axau',          category: 'Reserve'       },
  { label: 'Capital Program',      href: '/pilot',         category: 'Formation'     },
  { label: 'Regime Intelligence',  href: '/mirdt',         category: 'Intelligence'  },
  { label: 'Property Analysis',    href: '/property',      category: 'Real Assets'   },
  { label: 'Protocol Exchange',    href: '/dex',           category: 'Exchange'      },
  { label: 'DePIN Infrastructure', href: '/depin/denet',   category: 'Infrastructure'},
];

// ── Section 8 — Axiom Guide (navigation prompts) ─────────────────────────────
const GUIDE_PROMPTS = [
  { q: 'Where should I start?',          href: '/start'         },
  { q: 'What is live now?',              href: '/infrastructure'},
  { q: 'Do I need accreditation?',       href: '/disclosure'    },
  { q: 'How does AXUSD fit in?',         href: '/axusd-3643'    },
  { q: 'What is the Wealth Practice?',   href: '/wealth-practice'},
  { q: 'Can I verify the system first?', href: '/solvency'      },
];

// ── Section 9 — Access Tiers (positioning only, no fabricated prices) ────────
const ACCESS_TIERS = [
  {
    tier: 'Free',
    headline: 'Public Access',
    sub: 'No wallet. No signup.',
    desc: 'The solvency console, institutional disclosure, contract addresses, and the full infrastructure map are open to any visitor.',
    items: ['Public solvency console', 'Institutional disclosure', 'Contract verification', 'System map access'],
    cta: 'Start Reading',
    href: '/infrastructure',
    highlight: false,
    accentCls: 'border-t-2 border-dl-border',
  },
  {
    tier: 'Pro',
    headline: 'Full Platform',
    sub: 'Wallet required.',
    desc: 'Put digital dollars to work, access liquidity, run property analysis, and connect to the full Axiom operating framework.',
    items: ['Yield access (AXUSD)', 'Credit facility (BTC-backed)', 'Property analysis tool', 'Regime intelligence'],
    cta: 'Start Here',
    href: '/start',
    highlight: true,
    accentCls: 'border-t-4 border-dl-navy',
  },
  {
    tier: 'Institutional',
    headline: 'Private Review',
    sub: 'Accredited investors only.',
    desc: 'Formal engagement pathway. Reg D 506(c) fund access, reserve participation, and a senior review inquiry channel.',
    items: ['Reg D 506(c) fund access', 'Accreditation verification', 'Reserve participation', 'Senior inquiry channel'],
    cta: 'Submit Inquiry',
    href: '/contact',
    highlight: false,
    accentCls: 'border-t-4 border-dl-gold',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: ClaimStatus }) {
  const dot: Record<ClaimStatus, string> = {
    live: '#6ee7a5', formation: '#f0d98a', configured: '#93c5fd',
    planned: '#9ca3af', inactive: '#9ca3af',
  };
  const textCls: Record<ClaimStatus, string> = {
    live: 'text-dl-forest', formation: 'text-dl-gold', configured: 'text-dl-navy',
    planned: 'text-dl-gray', inactive: 'text-dl-gray',
  };
  const pulse = status === 'live' ? 'live' : status === 'formation' ? 'gold' : undefined;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: dot[status] ?? dot.inactive }}
        {...(pulse ? { 'data-dl-pulse': pulse } : {})}
        aria-hidden
      />
      <span className={`font-dl-mono text-[10px] uppercase tracking-wider ${textCls[status] ?? textCls.inactive}`}>
        {status}
      </span>
    </span>
  );
}

interface DesignLawHomeProps {
  initialTruth?: HomepageTruth | null;
}

function formatAgo(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const ms = Date.now() - t;
  if (ms < 0) return 'just now';
  if (ms < 10_000)           return 'just now';
  if (ms < 60_000)           return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 60 * 60_000)      return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 24 * 60 * 60_000) return `${Math.floor(ms / (60 * 60_000))}h ago`;
  return `${Math.floor(ms / (24 * 60 * 60_000))}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DesignLawHome({ initialTruth }: DesignLawHomeProps = {}) {
  const [timestamp, setTimestamp] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [truth, setTruth] = useState<HomepageTruth>(initialTruth ?? FALLBACK_TRUTH);
  const [truthLoaded, setTruthLoaded] = useState(!!initialTruth);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    setTimestamp(new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'));
    const id = setInterval(() => setNowTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const cta = params.get('cta');
        const url = cta ? `/api/homepage/truth?cta=${encodeURIComponent(cta)}` : '/api/homepage/truth';
        const r = await fetch(url);
        const j = await r.json();
        if (!cancelled && j?.success && j?.data) {
          setTruth(j.data as HomepageTruth);
        }
      } catch {
        /* keep SSR or fallback */
      } finally {
        if (!cancelled) setTruthLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const verifiedAt = truthLoaded && truth.generatedAt
    ? `${truth.generatedAt.slice(0, 19).replace('T', ' ')} UTC`
    : null;
  const verifiedAgo = truth.generatedAt ? formatAgo(truth.generatedAt) : '';
  void nowTick;
  const shortSnapshot = truth.snapshotId ? truth.snapshotId.slice(0, 8) : null;

  const accentCls: Record<MomentumSignal['accent'], string> = {
    live: 'text-dl-forest',
    neutral: 'text-dl-navy',
    stale: 'text-dl-gray',
  };

  return (
    <>
      <Head>
        <title>Axiom Protocol | Verified Financial Infrastructure</title>
        <meta name="description" content={truth.hero.subheadline} />
        <style>{`
          @keyframes dlPulse {
            0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(110,231,165,0.45); }
            50%     { opacity: 0.65; box-shadow: 0 0 0 4px rgba(110,231,165,0); }
          }
          [data-dl-pulse="live"] { animation: dlPulse 2.4s ease-in-out infinite; }
          @keyframes dlPulseGold {
            0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(240,217,138,0.45); }
            50%     { opacity: 0.65; box-shadow: 0 0 0 4px rgba(240,217,138,0); }
          }
          [data-dl-pulse="gold"] { animation: dlPulseGold 2.4s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            [data-dl-pulse] { animation: none; }
          }
        `}</style>
      </Head>

      <div className="design-law-root min-h-screen bg-dl-bg pb-16 lg:pb-0">

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav className="border-b border-dl-border bg-dl-bg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-dl-serif text-lg text-dl-navy font-bold tracking-tight">AXIOM</Link>
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
              <div className="hidden lg:block"><ConnectWalletButton /></div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 text-dl-navy border border-dl-border bg-dl-bg"
                aria-label="Menu"
              >
                {menuOpen ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="5" x2="17" y2="5" /><line x1="3" y1="10" x2="17" y2="10" /><line x1="3" y1="15" x2="17" y2="15" />
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
                        >{child.label}</Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href!}
                      className="block py-2 text-sm text-dl-navy border-b border-dl-border last:border-b-0 hover:underline"
                      onClick={() => setMenuOpen(false)}
                    >{item.label}</Link>
                  )
                )}
                <div className="pt-3"><ConnectWalletButton /></div>
              </div>
            </div>
          )}
        </nav>

        <HomepageAnalytics />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 1 — HERO                                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t-4 border-dl-gold" data-section="hero">
          <div className="relative w-full" style={{ minHeight: '640px' }}>
            <img
              src="/images/hero-landing.png"
              alt="Verified financial infrastructure on Arbitrum One"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: 'block' }}
            />
            <div className="relative" style={{ backgroundColor: 'rgba(14,28,55,0.86)' }}>
              <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

                {/* Copy column */}
                <div className="lg:col-span-7 xl:col-span-7">
                  <p
                    className="font-dl-mono text-[11px] uppercase tracking-widest mb-5"
                    style={{ color: '#f0d98a', letterSpacing: '0.18em' }}
                  >
                    Axiom Protocol · Arbitrum One
                  </p>
                  <h1
                    className="font-dl-serif text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-6xl leading-[1.08] mb-6"
                    style={{ color: '#ffffff', textShadow: '0 2px 18px rgba(0,0,0,0.55)' }}
                  >
                    {truth.hero.headline}
                  </h1>
                  <p
                    className="text-base md:text-lg leading-relaxed mb-9"
                    style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '580px', textShadow: '0 1px 8px rgba(0,0,0,0.55)' }}
                  >
                    {truth.hero.subheadline}
                  </p>

                  {/* CTA row */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 mb-8">
                    <Link href={truth.hero.cta.primaryHref}>
                      <span
                        className="inline-flex items-center justify-center gap-2 bg-dl-gold text-dl-navy px-7 py-3.5 text-xs font-bold font-dl-mono uppercase tracking-widest hover:opacity-90 w-full sm:w-auto"
                        data-cta-variant={truth.hero.cta.variant}
                        title={`source: ${truth.hero.cta.verifiedFrom}`}
                      >
                        {truth.hero.cta.primaryLabel.replace(' →', '')} <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </Link>
                    {truth.proofLinks.proof.available && (
                      <Link href={truth.proofLinks.proof.href}>
                        <span
                          className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-7 py-3.5 text-xs font-bold font-dl-mono uppercase tracking-widest hover:bg-white hover:text-dl-navy w-full sm:w-auto"
                          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                        >
                          View Proof <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </Link>
                    )}
                    <Link href="/contact" className="sm:ml-1">
                      <span
                        className="font-dl-mono text-xs uppercase tracking-widest underline decoration-dotted underline-offset-4"
                        style={{ color: '#f0d98a' }}
                      >
                        Institutional Inquiry →
                      </span>
                    </Link>
                  </div>

                  {/* Trust strip */}
                  {truth.hero.trustItems.length > 0 && (
                    <div
                      className="flex flex-wrap gap-x-6 gap-y-2.5 pt-6 border-t"
                      style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                    >
                      {truth.hero.trustItems.map((item) => (
                        <div key={item.label} className="flex items-center gap-2" title={`source: ${item.verifiedFrom}`}>
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f0d98a' }} />
                          <span
                            className="font-dl-mono text-[11px] uppercase tracking-wider"
                            style={{ color: 'rgba(255,255,255,0.9)' }}
                          >{item.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live system panel */}
                <div className="lg:col-span-5 xl:col-span-5">
                  <div
                    className="border"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(240,217,138,0.3)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    {/* Panel header */}
                    <div
                      className="px-5 py-3.5 flex items-center justify-between border-b"
                      style={{ borderColor: 'rgba(255,255,255,0.12)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: '#6ee7a5' }}
                          data-dl-pulse="live"
                          aria-hidden
                        />
                        <Activity className="w-3.5 h-3.5" style={{ color: '#f0d98a' }} />
                        <span className="font-dl-mono text-[11px] uppercase tracking-widest" style={{ color: '#f0d98a' }}>
                          Live System
                        </span>
                      </div>
                      {verifiedAgo && (
                        <span
                          className="font-dl-mono text-[10px]"
                          style={{ color: 'rgba(255,255,255,0.6)' }}
                          title={verifiedAt ?? ''}
                        >
                          Verified {verifiedAgo}
                        </span>
                      )}
                    </div>

                    {/* Status rows */}
                    <div className="divide-y divide-white/10">
                      {truth.status.slice(0, 6).map((s) => (
                        <Link
                          key={s.system}
                          href={s.href}
                          className="flex items-center justify-between px-5 py-3.5 no-underline hover:bg-white/5"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                          title={`source: ${s.verifiedFrom}`}
                        >
                          <span className="text-sm leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>{s.system}</span>
                          <StatusChip status={s.status} />
                        </Link>
                      ))}
                      {truth.status.length === 0 && (
                        <div className="px-5 py-8 text-center">
                          <p className="text-xs font-dl-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            Loading system state…
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Panel footer */}
                    {truth.proofLinks.solvency.available && (
                      <Link
                        href={truth.proofLinks.solvency.href}
                        className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-dl-mono uppercase tracking-wider hover:bg-white/5 no-underline"
                        style={{ color: '#f0d98a', borderTop: '1px solid rgba(255,255,255,0.12)' }}
                      >
                        Open Solvency Console <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 2 — CHOOSE YOUR PATH                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-b border-dl-border bg-dl-bg" data-section="choose_your_path">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
            <div className="mb-10">
              <p className="font-dl-mono text-[11px] uppercase tracking-widest text-dl-gray mb-2">Entry Point</p>
              <h2 className="font-dl-serif text-2xl md:text-3xl text-dl-navy mb-3">Choose Your Path</h2>
              <p className="text-sm md:text-base text-dl-gray max-w-2xl">
                Your starting point depends on how you intend to engage. Select the path that fits your situation.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 border border-dl-border">
              {AUDIENCE_CARDS.map((card, i) => (
                <div
                  key={card.audience}
                  className={`p-8 md:p-10 flex flex-col ${card.accentCls}
                    ${i < AUDIENCE_CARDS.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-dl-border' : ''}
                    ${i === 1 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
                >
                  <p className={`font-dl-mono text-[10px] uppercase tracking-widest mb-3 ${card.tagColor}`}>
                    {card.tag}
                  </p>
                  <p className="font-dl-mono text-xs uppercase tracking-wider text-dl-gray mb-3">
                    {card.audience}
                  </p>
                  <h3 className="font-dl-serif text-xl md:text-2xl text-dl-navy font-bold leading-snug mb-4">
                    {card.headline}
                  </h3>
                  <p className="text-sm text-dl-gray leading-relaxed mb-8 flex-1">
                    {card.body}
                  </p>
                  <Link href={card.href} className="no-underline">
                    <span className="inline-flex items-center gap-2 font-dl-mono text-xs uppercase tracking-widest text-dl-navy font-bold border border-dl-border bg-dl-bg px-4 py-2.5 hover:bg-dl-navy hover:text-white">
                      {card.cta} <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 3 — WHAT YOU CAN DO                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {truth.pathCards.length > 0 && (
          <div
            className="border-b border-dl-border"
            style={{ backgroundColor: '#fafaf8' }}
            data-section="what_you_can_do"
          >
            <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
              <div className="mb-10">
                <p className="font-dl-mono text-[11px] uppercase tracking-widest text-dl-gray mb-2">Capabilities</p>
                <h2 className="font-dl-serif text-2xl md:text-3xl text-dl-navy mb-3">What You Can Do With Axiom</h2>
                <p className="text-sm md:text-base text-dl-gray max-w-2xl">
                  Explore the available entry routes. Each path links directly to the active product or review surface.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-dl-border bg-dl-bg">
                {truth.pathCards.map((card, i) => {
                  const meta = PATH_META[card.key] ?? PATH_META.verify;
                  const Icon = meta.icon;
                  return (
                    <Link
                      key={card.key}
                      href={card.href}
                      className={`block p-6 md:p-7 no-underline hover:bg-dl-bg-alt flex flex-col ${meta.accentCls}
                        ${i < truth.pathCards.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-dl-border' : ''}
                        ${i % 2 === 0 ? 'bg-dl-bg' : 'sm:bg-dl-bg-alt lg:bg-dl-bg'}`}
                      title={`source: ${card.verifiedFrom}`}
                    >
                      <p className={`font-dl-mono text-[10px] uppercase tracking-widest mb-3 ${meta.color}`}>
                        {meta.audience}
                      </p>
                      <div className="flex items-start gap-2.5 mb-3">
                        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${meta.color}`} />
                        <h3 className="font-dl-serif text-base text-dl-navy font-bold leading-snug">{card.title}</h3>
                      </div>
                      <p className="text-sm text-dl-gray leading-relaxed mb-5 flex-1">{card.body}</p>
                      <span className="inline-flex items-center gap-1.5 text-xs text-dl-navy font-dl-mono font-bold uppercase tracking-wider">
                        {card.cta} <ChevronRight className="w-3 h-3" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 4 — WHY AXIOM IS DIFFERENT                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-dl-navy border-b border-white/10" data-section="why_different">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
            <div className="mb-10">
              <p className="font-dl-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: '#f0d98a', letterSpacing: '0.18em' }}>
                Differentiation
              </p>
              <h2 className="font-dl-serif text-2xl md:text-3xl text-white mb-3">Why Axiom Is Different</h2>
              <p className="text-sm md:text-base max-w-2xl" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Built for participants who want transparency, control, and structured access — not black-box finance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-white/15">
              {WHY_DIFFERENT.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`p-8 border-t-4 border-dl-gold
                      ${i < WHY_DIFFERENT.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-white/15' : ''}
                      ${i % 2 === 0 ? '' : 'sm:border-b lg:border-b-0'}`}
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                  >
                    <Icon className="w-5 h-5 mb-4" style={{ color: '#f0d98a' }} />
                    <h3 className="font-dl-serif text-lg text-white font-bold mb-3">{item.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 5 — CURRENT AVAILABILITY                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {(truth.availability.length > 0 || truth.status.length > 0) && (
          <div className="border-b border-dl-border bg-dl-bg" data-section="availability">
            <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
              <div className="mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <p className="font-dl-mono text-[11px] uppercase tracking-widest text-dl-gray mb-2">System Status</p>
                  <h2 className="font-dl-serif text-xl md:text-2xl text-dl-navy">Current Availability</h2>
                </div>
                {verifiedAt && (
                  <p className="font-dl-mono text-xs text-dl-gray">
                    Verified: <span className="text-dl-navy">{verifiedAt}</span>
                  </p>
                )}
              </div>

              {/* Availability pills */}
              {truth.availability.length > 0 && (
                <div className="flex flex-wrap gap-2.5 mb-8">
                  {truth.availability.map((a) => (
                    <Link
                      key={a.label}
                      href={a.href}
                      className="inline-flex items-center gap-2 border border-dl-border bg-dl-bg px-4 py-2.5 hover:bg-dl-bg-alt no-underline"
                      title={`source: ${a.verifiedFrom}`}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: a.available ? '#6ee7a5' : '#d1d5db' }}
                        {...(a.available ? { 'data-dl-pulse': 'live' } : {})}
                        aria-hidden
                      />
                      <span className="font-dl-mono text-[11px] text-dl-navy uppercase tracking-wider">{a.label}</span>
                      <ChevronRight className="w-3 h-3 text-dl-gray" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Compact status grid */}
              {truth.status.length > 0 && (
                <div className="border border-dl-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {truth.status.map((row, i) => (
                      <Link
                        key={row.system}
                        href={row.href}
                        className={`flex items-center justify-between px-5 py-3.5 no-underline hover:bg-dl-bg-alt
                          ${i % 3 !== 2 ? 'lg:border-r border-dl-border' : ''}
                          ${i % 2 === 0 ? 'sm:border-r border-dl-border lg:border-r-0' : ''}
                          ${i < truth.status.length - (truth.status.length % 3 || 3) ? 'border-b border-dl-border' : ''}
                          ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                        title={`source: ${row.verifiedFrom}`}
                      >
                        <p className="text-sm text-dl-navy font-medium truncate pr-3">{row.system}</p>
                        <StatusChip status={row.status} />
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-dl-border px-5 py-2.5 bg-dl-bg-alt flex items-center justify-between gap-2">
                    <p className="text-[11px] text-dl-gray font-dl-mono">Status reflects current operational state — not projections.</p>
                    {truth.proofLinks.solvency.available && (
                      <Link href={truth.proofLinks.solvency.href} className="text-[11px] text-dl-navy underline font-dl-mono whitespace-nowrap">
                        Solvency console →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 6 — PROOF BEFORE CAPITAL                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div
          style={{ backgroundColor: '#0c1e38' }}
          className="border-b border-white/10"
          data-section="proof_before_capital"
        >
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
            {/* Section header */}
            <div className="mb-10 md:mb-12">
              <p className="font-dl-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: '#f0d98a', letterSpacing: '0.18em' }}>
                Transparency Layer
              </p>
              <h2 className="font-dl-serif text-2xl md:text-3xl text-white mb-3">Proof Before Capital</h2>
              <p className="text-sm md:text-base max-w-2xl" style={{ color: 'rgba(255,255,255,0.6)' }}>
                No signup required. No narrative required. The solvency console, contracts, and disclosure are publicly readable before you commit anything.
              </p>
            </div>

            {/* 4 trust containers — 2×2 on md, 4-col on lg */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-white/15">
              {PROOF_CONTAINERS.map((c, i) => {
                const Icon = c.icon;
                return (
                  <Link
                    key={c.label}
                    href={c.href}
                    className={`block p-7 md:p-8 no-underline hover:bg-white/5
                      ${i < PROOF_CONTAINERS.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-white/15' : ''}
                      ${i === 1 ? 'sm:border-b sm:border-b-white/15 lg:border-b-0' : ''}
                      ${i === 2 ? 'sm:border-r-0 lg:border-r border-white/15' : ''}`}
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="flex items-center gap-2.5 mb-4">
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#f0d98a' }} />
                      <p className="font-dl-mono text-[10px] uppercase tracking-widest" style={{ color: '#f0d98a' }}>
                        {c.label}
                      </p>
                    </div>
                    <h3 className="font-dl-serif text-base text-white font-bold leading-snug mb-3">{c.headline}</h3>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.6)' }}>{c.body}</p>
                    <span className="inline-flex items-center gap-1.5 font-dl-mono text-[11px] uppercase tracking-wider" style={{ color: '#f0d98a' }}>
                      Review <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Proof CTA row */}
            <div
              className="mt-8 flex flex-col sm:flex-row gap-3 pt-8 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.12)' }}
            >
              {truth.proofLinks.proof.available && (
                <Link
                  href={truth.proofLinks.proof.href}
                  className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-6 py-3 text-xs font-bold font-dl-mono uppercase tracking-widest hover:bg-white hover:text-dl-navy w-full sm:w-auto"
                >
                  View Live Proof <ArrowRight className="w-3 h-3" />
                </Link>
              )}
              {truth.proofLinks.disclosure.available && (
                <Link
                  href={truth.proofLinks.disclosure.href}
                  className="inline-flex items-center justify-center gap-2 border border-white/40 text-white px-6 py-3 text-xs font-bold font-dl-mono uppercase tracking-widest hover:border-white w-full sm:w-auto"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                >
                  Read Institutional Disclosure <ArrowRight className="w-3 h-3" />
                </Link>
              )}
              <Link
                href="/infrastructure"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold font-dl-mono uppercase tracking-widest w-full sm:w-auto"
                style={{ color: '#f0d98a' }}
              >
                Inspect Infrastructure <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 7 — CORE PRODUCT ECOSYSTEM                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-b border-dl-border" style={{ backgroundColor: '#fafaf8' }} data-section="ecosystem">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
            <div className="mb-10">
              <p className="font-dl-mono text-[11px] uppercase tracking-widest text-dl-gray mb-2">Products</p>
              <h2 className="font-dl-serif text-2xl md:text-3xl text-dl-navy mb-3">Core Product Ecosystem</h2>
              <p className="text-sm md:text-base text-dl-gray max-w-2xl">
                Three primary instruments form the backbone of the Axiom operating framework.
              </p>
            </div>

            {/* Primary tier — 3 large cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 border border-dl-border mb-6">
              {PRIMARY_PRODUCTS.map((p, i) => (
                <Link
                  key={p.label}
                  href={p.href}
                  className={`block p-7 md:p-8 no-underline hover:bg-dl-bg-alt border-t-4 border-dl-navy flex flex-col
                    ${i < PRIMARY_PRODUCTS.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''}
                    bg-dl-bg`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-gray">{p.category}</p>
                    <StatusChip status={p.status} />
                  </div>
                  <h3 className="font-dl-serif text-2xl md:text-3xl text-dl-navy font-bold mb-3">{p.label}</h3>
                  <p className="text-sm text-dl-gray leading-relaxed mb-6 flex-1">{p.desc}</p>
                  <span className="inline-flex items-center gap-1.5 font-dl-mono text-xs uppercase tracking-wider text-dl-navy font-bold">
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>

            {/* Secondary tier — compact tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-dl-border">
              {SECONDARY_PRODUCTS.map((p, i) => (
                <Link
                  key={p.label}
                  href={p.href}
                  className={`block px-4 py-4 no-underline hover:bg-dl-bg
                    ${i < SECONDARY_PRODUCTS.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-dl-border' : ''}
                    ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
                >
                  <p className="font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-1">{p.category}</p>
                  <p className="font-dl-mono text-xs text-dl-navy font-bold leading-tight">{p.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 8 — AXIOM GUIDE                                            */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-b border-dl-border bg-dl-bg" data-section="guide">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
            <div className="mb-8">
              <p className="font-dl-mono text-[11px] uppercase tracking-widest text-dl-gray mb-2">Guide</p>
              <h2 className="font-dl-serif text-2xl md:text-3xl text-dl-navy mb-3">Not sure where to begin?</h2>
              <p className="text-sm md:text-base text-dl-gray max-w-2xl">
                Common entry points — answered and linked. Select the question that fits your situation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-dl-border">
              {GUIDE_PROMPTS.map((prompt, i) => (
                <Link
                  key={prompt.q}
                  href={prompt.href}
                  className={`flex items-center justify-between px-6 py-4 no-underline hover:bg-dl-bg-alt
                    ${i < GUIDE_PROMPTS.length - 1 ? 'border-b sm:border-b-0' : ''}
                    ${i % 2 === 0 ? 'sm:border-r border-dl-border' : ''}
                    ${i < 4 ? 'lg:border-b border-dl-border' : ''}
                    ${i % 3 !== 2 ? 'lg:border-r border-dl-border' : ''}
                    ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                >
                  <span className="text-sm text-dl-navy font-medium">{prompt.q}</span>
                  <ArrowRight className="w-4 h-4 text-dl-gray flex-shrink-0 ml-3" />
                </Link>
              ))}
            </div>

            <p className="text-[11px] text-dl-gray font-dl-mono mt-3">
              Axiom Guide is a curated set of navigation shortcuts — not an automated chat system.
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 9 — ACCESS TIERS                                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-b border-dl-border" style={{ backgroundColor: '#fafaf8' }} data-section="pricing">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
            <div className="mb-10">
              <p className="font-dl-mono text-[11px] uppercase tracking-widest text-dl-gray mb-2">Access Tiers</p>
              <h2 className="font-dl-serif text-2xl md:text-3xl text-dl-navy mb-3">How You Engage</h2>
              <p className="text-sm md:text-base text-dl-gray max-w-2xl">
                Three engagement tiers — from public proof review to full institutional participation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 border border-dl-border">
              {ACCESS_TIERS.map((tier, i) => (
                <div
                  key={tier.tier}
                  className={`p-7 md:p-8 flex flex-col ${tier.accentCls}
                    ${i < ACCESS_TIERS.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''}
                    ${tier.highlight ? 'bg-dl-navy' : 'bg-dl-bg'}`}
                >
                  <div className="mb-5">
                    <p className={`font-dl-mono text-[10px] uppercase tracking-widest mb-2 ${tier.highlight ? 'text-dl-gold' : 'text-dl-gray'}`}>
                      {tier.tier}
                    </p>
                    <h3 className={`font-dl-serif text-xl font-bold mb-1 ${tier.highlight ? 'text-white' : 'text-dl-navy'}`}>
                      {tier.headline}
                    </h3>
                    <p className={`font-dl-mono text-xs uppercase tracking-wider ${tier.highlight ? 'text-white/60' : 'text-dl-gray'}`}>
                      {tier.sub}
                    </p>
                  </div>
                  <p className={`text-sm leading-relaxed mb-6 flex-1 ${tier.highlight ? 'text-white/70' : 'text-dl-gray'}`}>
                    {tier.desc}
                  </p>
                  <ul className="mb-7 space-y-2">
                    {tier.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: tier.highlight ? '#f0d98a' : '#2d5016' }}
                        />
                        <span className={`text-xs font-dl-mono ${tier.highlight ? 'text-white/80' : 'text-dl-navy'}`}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href={tier.href} className="no-underline">
                    <span
                      className={`inline-flex items-center gap-2 font-dl-mono text-xs uppercase tracking-widest font-bold px-5 py-3 w-full justify-center
                        ${tier.highlight
                          ? 'bg-dl-gold text-dl-navy hover:opacity-90'
                          : 'border border-dl-navy bg-dl-bg text-dl-navy hover:bg-dl-navy hover:text-white'}`}
                    >
                      {tier.cta} <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 10 — FINAL CTA                                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-dl-navy border-b border-white/10" data-section="final_cta">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 text-center">
            <p className="font-dl-mono text-[11px] uppercase tracking-widest mb-5" style={{ color: '#f0d98a', letterSpacing: '0.18em' }}>
              Start Now
            </p>
            <h2
              className="font-dl-serif text-2xl md:text-4xl text-white mb-4 leading-tight"
              style={{ maxWidth: '680px', margin: '0 auto 16px' }}
            >
              Public proof is available now.{' '}
              <span style={{ color: '#f0d98a' }}>Read first. Then decide.</span>
            </h2>
            <p
              className="text-sm md:text-base leading-relaxed mb-10"
              style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '520px', margin: '0 auto 40px' }}
            >
              No signup required. No narrative required. The infrastructure is open, the disclosure is public, and the solvency console is live.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <Link
                href={truth.hero.cta.primaryHref}
                className="inline-flex items-center justify-center gap-2 bg-dl-gold text-dl-navy px-7 py-3.5 text-xs font-bold font-dl-mono uppercase tracking-widest hover:opacity-90 w-full sm:w-auto"
              >
                {truth.hero.cta.primaryLabel.replace(' →', '')} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              {truth.proofLinks.proof.available && (
                <Link
                  href={truth.proofLinks.proof.href}
                  className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-7 py-3.5 text-xs font-bold font-dl-mono uppercase tracking-widest hover:bg-white hover:text-dl-navy w-full sm:w-auto"
                >
                  View Live Proof <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 border border-white/30 px-7 py-3.5 text-xs font-bold font-dl-mono uppercase tracking-widest hover:border-white w-full sm:w-auto"
                style={{ color: '#f0d98a' }}
              >
                Institutional Inquiry <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 11 — MOMENTUM (shown only if data exists)                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {truth.momentum.length > 0 && (
          <div className="border-b border-dl-border bg-dl-bg" data-section="momentum">
            <div className="max-w-7xl mx-auto px-6 py-10 md:py-12">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border border-dl-border">
                {truth.momentum.map((m, i) => {
                  const Wrap: React.ElementType = m.href ? Link : 'div';
                  const wrapProps = m.href ? { href: m.href } : {};
                  return (
                    <Wrap
                      key={m.label}
                      {...wrapProps}
                      className={`px-5 py-5 no-underline
                        ${m.href ? 'hover:bg-dl-bg-alt cursor-pointer' : ''}
                        ${i < truth.momentum.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''}
                        ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                      title={`source: ${m.verifiedFrom}`}
                    >
                      <p className="text-[10px] text-dl-gray font-dl-mono uppercase tracking-wider mb-1">{m.label}</p>
                      <p className={`font-dl-mono text-xl font-bold ${accentCls[m.accent]}`}>{m.value}</p>
                    </Wrap>
                  );
                })}
              </div>
              <p className="text-[11px] text-dl-gray font-dl-mono mt-2">
                No fabricated counts. Only values the backend resolver verified.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 12 — VERIFIED METRICS (shown only if data exists)          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {truth.metrics.length > 0 && (
          <div className="border-b border-dl-border" style={{ backgroundColor: '#fafaf8' }} data-section="metrics">
            <div className="max-w-7xl mx-auto px-6 py-10 md:py-12">
              <div className="flex items-end justify-between mb-4 gap-2">
                <div>
                  <p className="font-dl-mono text-[11px] uppercase tracking-widest text-dl-gray mb-1">Verified Counts</p>
                  <h3 className="font-dl-serif text-lg text-dl-navy">At a Glance</h3>
                </div>
                {(verifiedAt || shortSnapshot) && (
                  <div className="text-right font-dl-mono text-[11px] text-dl-gray leading-relaxed">
                    {verifiedAt && <div>Verified: <span className="text-dl-navy">{verifiedAt}</span></div>}
                    {shortSnapshot && <div>Snapshot: <span className="text-dl-navy">{shortSnapshot}…</span></div>}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 border border-dl-border">
                {truth.metrics.map((m, i) => (
                  <div
                    key={m.label}
                    className={`px-5 py-5 border-t-4 border-dl-gold
                      ${i < truth.metrics.length - 1 ? 'border-r border-dl-border' : ''}
                      ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                    title={`source: ${m.verifiedFrom}`}
                  >
                    <p className="text-[10px] text-dl-gray mb-1 font-dl-mono uppercase tracking-wider">{m.label}</p>
                    <p className="font-dl-mono text-2xl font-bold text-dl-gold">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FOOTER LINKS                                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-dl-bg">
          <div className="max-w-7xl mx-auto px-6 pt-10 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 border border-dl-border mb-4">
              {[
                { label: 'AXAU Reserve',       href: '/axau'           },
                { label: 'AXUSD Settlement',   href: '/axusd-3643'     },
                { label: 'Capital Program',    href: '/pilot'          },
                { label: 'Lending Fund',       href: '/lending-fund'   },
                { label: 'Regime Intelligence',href: '/mirdt'          },
                { label: 'Wealth Practice',    href: '/wealth-practice'},
                { label: 'Solvency Console',   href: '/solvency'       },
                { label: 'Disclosure',         href: '/disclosure'     },
              ].map((link, i) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-4 py-3.5 text-xs text-dl-navy hover:bg-dl-bg-alt font-dl-mono underline
                    ${i % 4 !== 3 ? 'border-r border-dl-border' : ''}
                    ${i < 4 ? 'border-b border-dl-border' : ''}
                    ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                >{link.label}</Link>
              ))}
            </div>

            <div className="border-t border-dl-border pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-[11px] text-dl-gray font-dl-mono">
                Axiom Protocol · Arbitrum One · Community distribution only
              </p>
              {timestamp && (
                <p className="text-[11px] text-dl-gray font-dl-mono text-left sm:text-right">
                  Rendered: {timestamp}{verifiedAt ? ` · Truth: ${verifiedAt}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STICKY MOBILE ACTION BAR                                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-dl-border bg-dl-bg"
          style={{ boxShadow: '0 -2px 12px rgba(14,28,55,0.1)' }}
        >
          <div className="grid grid-cols-2 gap-0">
            <Link
              href={truth.hero.cta.primaryHref}
              className="flex items-center justify-center bg-dl-gold text-dl-navy px-4 py-4 text-xs font-bold font-dl-mono uppercase tracking-widest no-underline gap-1.5"
            >
              {truth.hero.cta.primaryLabel.replace(' →', '')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={truth.proofLinks.proof.href}
              className="flex items-center justify-center border-l border-dl-border bg-dl-navy text-white px-4 py-4 text-xs font-bold font-dl-mono uppercase tracking-widest no-underline gap-1.5"
            >
              View Proof <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
