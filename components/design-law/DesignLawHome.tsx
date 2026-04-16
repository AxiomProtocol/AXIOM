import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConnectWalletButton } from './ConnectWalletButton';
import { SectionHeading } from './SectionHeading';
import { NAV_ITEMS } from './navItems';
import { NavDropdown } from './NavDropdown';
import {
  ArrowRight, ChevronRight, CheckCircle2,
  TrendingUp, Coins, ShieldCheck, Eye,
  Lock, BarChart3, KeyRound, Layers,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Source-of-truth contract
// All public claims rendered below come from /api/homepage/truth, which
// composes lib/services/HomepageTruthService.ts. If a claim cannot be
// verified, the resolver omits it. Static fallbacks here are conservative.
// ─────────────────────────────────────────────────────────────────────

type ClaimStatus = 'live' | 'configured' | 'formation' | 'planned' | 'inactive';

interface TrustItem { label: string; verifiedFrom: string; }
interface PathCard { key: string; title: string; body: string; cta: string; href: string; available: boolean; verifiedFrom: string; }
interface TrustCard { title: string; body: string; href: string; verifiedFrom: string; }
interface StatusRow { system: string; status: ClaimStatus; note: string; href: string; verifiedFrom: string; }
interface AvailabilityItem { label: string; available: boolean; href: string; verifiedFrom: string; }
interface ProofLink { label: string; href: string; available: boolean; verifiedFrom: string; }
interface OptionalMetric { label: string; value: string; verifiedFrom: string; }

interface HeroCta { primaryLabel: string; primaryHref: string; variant: string; verifiedFrom: string; }
interface HomepageTruth {
  hero: { headline: string; subheadline: string; trustItems: TrustItem[]; cta: HeroCta };
  pathCards: PathCard[];
  trustCards: TrustCard[];
  status: StatusRow[];
  availability: AvailabilityItem[];
  proofLinks: { verify: ProofLink; proof: ProofLink; solvency: ProofLink; disclosure: ProofLink };
  metrics: OptionalMetric[];
  snapshotId: string | null;
  generatedAt: string;
}

// Conservative fallback shown only if /api/homepage/truth is unreachable.
// No live/operational claims are made here — only architectural facts.
const FALLBACK_TRUTH: HomepageTruth = {
  hero: {
    headline: 'Build Wealth Through Verified Financial Infrastructure',
    subheadline: 'Earn on digital dollars, borrow against Bitcoin, access reserve assets, and verify every system publicly.',
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
  proofLinks: {
    verify:     { label: 'Verify Infrastructure',  href: '/infrastructure', available: true, verifiedFrom: 'fallback' },
    proof:      { label: 'View Live Proof',        href: '/solvency',       available: true, verifiedFrom: 'fallback' },
    solvency:   { label: 'Live Solvency Console',  href: '/solvency',       available: true, verifiedFrom: 'fallback' },
    disclosure: { label: 'Institutional Disclosure', href: '/disclosure',   available: true, verifiedFrom: 'fallback' },
  },
  metrics: [],
  snapshotId: null,
  generatedAt: '',
};

// Path card visual + audience metadata — sublabels are framing devices,
// not factual claims. Card availability still comes from the resolver.
const PATH_META: Record<string, { icon: React.ComponentType<{ className?: string }>; audience: string; border: string; color: string }> = {
  earn:    { icon: TrendingUp, audience: 'For Savers',             border: 'border-l-dl-forest', color: 'text-dl-forest' },
  borrow:  { icon: Coins,      audience: 'For Bitcoin Holders',    border: 'border-l-dl-navy',   color: 'text-dl-navy'   },
  reserve: { icon: ShieldCheck, audience: 'For Reserve Participants', border: 'border-l-dl-gold', color: 'text-dl-gold'  },
  verify:  { icon: Eye,        audience: 'For Diligence-First Users', border: 'border-l-dl-navy', color: 'text-dl-navy'  },
};

// Micro benefits strip — labels are public-facing framing; routes must
// resolve as `available` in the path-cards array.
const MICRO_STRIP: Array<{ key: string; label: string; sub: string }> = [
  { key: 'earn',    label: 'Earn',    sub: 'Put digital dollars to work' },
  { key: 'borrow',  label: 'Borrow',  sub: 'Bitcoin-backed liquidity' },
  { key: 'reserve', label: 'Reserve', sub: 'Hard-asset reserve access' },
  { key: 'verify',  label: 'Verify',  sub: 'Public proof, no signup' },
];

// "Why Serious Capital Moves Here" — institutional positioning.
// Body copy is framed against verified system attributes, not promises.
const SERIOUS_CAPITAL = [
  { icon: KeyRound,  title: 'Control',        body: 'Self-custody by default. Your assets stay in your wallet where applicable.' },
  { icon: Eye,       title: 'Visibility',     body: 'Public solvency, disclosure, and operations data are open for review.' },
  { icon: ShieldCheck, title: 'Access',       body: 'Reserve, income, and capital paths are structured around verified participation.' },
  { icon: Layers,    title: 'Infrastructure', body: 'Banking, settlement, and on-chain systems are connected through one framework.' },
];

function StatusChip({ status }: { status: ClaimStatus }) {
  const map: Record<ClaimStatus, string> = {
    live: 'text-dl-forest',
    formation: 'text-dl-gold',
    configured: 'text-dl-navy',
    planned: 'text-dl-gray',
    inactive: 'text-dl-gray',
  };
  return (
    <span className={`font-dl-mono text-xs uppercase tracking-wider ${map[status] ?? 'text-dl-gray'}`}>
      {status}
    </span>
  );
}

interface DesignLawHomeProps {
  // SSR-resolved canonical truth payload. When present, the verified hero
  // text and all source-backed sections render on first paint with no
  // hydration flicker. The client still re-fetches /api/homepage/truth on
  // mount to refresh CTA variant rotation and bytecode liveness state.
  initialTruth?: HomepageTruth | null;
}

export function DesignLawHome({ initialTruth }: DesignLawHomeProps = {}) {
  const [timestamp, setTimestamp] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [truth, setTruth] = useState<HomepageTruth>(initialTruth ?? FALLBACK_TRUTH);
  const [truthLoaded, setTruthLoaded] = useState(!!initialTruth);

  useEffect(() => {
    setTimestamp(new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Forward ?cta= override if present in the URL so client and SSR agree.
        const params = new URLSearchParams(window.location.search);
        const cta = params.get('cta');
        const url = cta ? `/api/homepage/truth?cta=${encodeURIComponent(cta)}` : '/api/homepage/truth';
        const r = await fetch(url);
        const j = await r.json();
        if (!cancelled && j?.success && j?.data) {
          setTruth(j.data as HomepageTruth);
        }
      } catch {
        // Keep prior truth (SSR or fallback)
      } finally {
        if (!cancelled) setTruthLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const verifiedAt = truthLoaded && truth.generatedAt
    ? `${truth.generatedAt.slice(0, 19).replace('T', ' ')} UTC`
    : null;
  const shortSnapshot = truth.snapshotId ? truth.snapshotId.slice(0, 8) : null;

  // Micro strip routes are taken from the resolver's pathCards; if the
  // route is not present in pathCards we omit it entirely.
  const pathHrefByKey = Object.fromEntries(truth.pathCards.map((p) => [p.key, p.href]));
  const microStrip = MICRO_STRIP.filter((m) => pathHrefByKey[m.key]);

  return (
    <>
      <Head>
        <title>Axiom Protocol | Verified Financial Infrastructure</title>
        <meta name="description" content={truth.hero.subheadline} />
      </Head>
      <div className="design-law-root min-h-screen bg-dl-bg">

        {/* NAV */}
        <nav className="border-b border-dl-border bg-dl-bg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-dl-serif text-lg text-dl-navy font-bold">AXIOM</Link>
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

        {/* SECTION 1 — HERO ─────────────────────────────────────────── */}
        <div className="border-t-4 border-dl-gold">
          <div className="relative w-full" style={{ minHeight: '520px' }}>
            <img
              src="/images/homepage-hero.png"
              alt="Verified financial infrastructure on Arbitrum One"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: 'block' }}
            />
            <div className="relative" style={{ backgroundColor: 'rgba(14, 28, 55, 0.82)' }}>
              <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col justify-center">
                <p className="font-dl-mono text-xs uppercase tracking-widest mb-4" style={{ color: '#f0d98a', textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
                  Axiom Protocol · Arbitrum One
                </p>
                <h1
                  className="font-dl-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-5"
                  style={{ color: '#ffffff', maxWidth: '880px', textShadow: '0 2px 14px rgba(0,0,0,0.65)' }}
                >
                  {truth.hero.headline}
                </h1>
                <p
                  className="text-base md:text-lg leading-relaxed mb-8"
                  style={{ color: '#ffffff', maxWidth: '720px', textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}
                >
                  {truth.hero.subheadline}
                </p>

                {/* CTA hierarchy: 1 primary + 1 secondary + 1 tertiary text link */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 mb-8">
                  <Link href={truth.hero.cta.primaryHref}>
                    <span
                      className="inline-block bg-dl-gold text-dl-navy px-7 py-3.5 text-sm font-bold hover:opacity-90 font-dl-mono uppercase tracking-wider w-full sm:w-auto text-center"
                      data-cta-variant={truth.hero.cta.variant}
                      title={`source: ${truth.hero.cta.verifiedFrom}`}
                    >
                      {truth.hero.cta.primaryLabel}
                    </span>
                  </Link>
                  {truth.proofLinks.proof.available && (
                    <Link href={truth.proofLinks.proof.href}>
                      <span
                        className="inline-block border-2 border-white text-white px-7 py-3.5 text-sm font-bold hover:bg-white hover:text-dl-navy font-dl-mono uppercase tracking-wider w-full sm:w-auto text-center"
                        style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
                      >
                        View Live Proof
                      </span>
                    </Link>
                  )}
                  <Link href="/contact" className="sm:ml-2">
                    <span className="text-xs sm:text-sm font-dl-mono uppercase tracking-wider underline" style={{ color: '#f0d98a' }}>
                      Institutional Access →
                    </span>
                  </Link>
                </div>

                {/* Trust strip — backend-verified items */}
                {truth.hero.trustItems.length > 0 && (
                  <div
                    className="flex flex-wrap gap-x-6 gap-y-2 pt-5 border-t"
                    style={{ borderColor: 'rgba(255,255,255,0.18)', maxWidth: '900px' }}
                  >
                    {truth.hero.trustItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-2" title={`source: ${item.verifiedFrom}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#f0d98a' }} />
                        <span
                          className="font-dl-mono text-xs uppercase tracking-wider"
                          style={{ color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
                        >{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2 — MICRO BENEFITS STRIP ─────────────────────────── */}
        {microStrip.length > 0 && (
          <div className="border-b border-dl-border bg-dl-bg">
            <div className="max-w-7xl mx-auto px-6 py-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
                {microStrip.map((m, i) => (
                  <Link
                    key={m.key}
                    href={pathHrefByKey[m.key]}
                    className={`block px-4 py-4 no-underline hover:bg-dl-bg-alt
                      ${i < microStrip.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''}
                      ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-dl-mono text-sm font-bold text-dl-navy uppercase tracking-wider">{m.label}</p>
                      <ChevronRight className="w-3 h-3 text-dl-gray" />
                    </div>
                    <p className="text-xs text-dl-gray mt-0.5">{m.sub}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3 — CHOOSE YOUR PATH (with audience sublabels) ───── */}
        {truth.pathCards.length > 0 && (
          <div className="border-b border-dl-border" style={{ backgroundColor: '#fafaf8' }}>
            <div className="max-w-7xl mx-auto px-6 py-14 md:py-16">
              <div className="mb-7">
                <SectionHeading>Choose Your Path</SectionHeading>
                <p className="text-sm md:text-base text-dl-gray mt-2 max-w-2xl">
                  Four access paths, segmented by what you want to do.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border bg-dl-bg">
                {truth.pathCards.map((card, i) => {
                  const meta = PATH_META[card.key] ?? PATH_META.verify;
                  const Icon = meta.icon;
                  return (
                    <Link
                      key={card.key}
                      href={card.href}
                      className={`block p-6 border-l-4 ${meta.border} no-underline hover:bg-dl-bg-alt
                        ${i < truth.pathCards.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-dl-border' : ''}
                        ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                      title={`source: ${card.verifiedFrom}`}
                    >
                      <p className={`font-dl-mono text-xs uppercase tracking-widest mb-2 ${meta.color}`}>
                        {meta.audience}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                        <h3 className="font-dl-serif text-lg text-dl-navy font-bold leading-tight">{card.title}</h3>
                      </div>
                      <p className="text-sm text-dl-gray leading-relaxed mb-5">{card.body}</p>
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

        <div className="max-w-7xl mx-auto px-6 py-14">

          {/* SECTION 4 — CURRENT AVAILABILITY ─────────────────────── */}
          {truth.availability.length > 0 && (
            <div className="mb-16">
              <div className="mb-5">
                <SectionHeading>Current Availability</SectionHeading>
                <p className="text-sm md:text-base text-dl-gray mt-2 max-w-2xl">
                  Availability derived from the live system state. Click any item to enter that path.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {truth.availability.map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="inline-flex items-center gap-2 border border-dl-border bg-dl-bg px-4 py-2.5 hover:bg-dl-bg-alt no-underline"
                    title={`source: ${a.verifiedFrom}`}
                  >
                    <span className="w-2 h-2 bg-dl-forest" />
                    <span className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">{a.label}</span>
                    <ChevronRight className="w-3 h-3 text-dl-gray" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5 — WHY TRUST AXIOM ──────────────────────────── */}
          {truth.trustCards.length > 0 && (
            <div className="mb-16">
              <div className="mb-7">
                <SectionHeading>Why Trust Axiom</SectionHeading>
                <p className="text-sm md:text-base text-dl-gray mt-2 max-w-2xl">
                  Each item maps to a verifiable source. Read the chain, the bank record, or the published snapshot.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border">
                {truth.trustCards.map((card, i) => (
                  <Link
                    key={card.title}
                    href={card.href}
                    className={`block p-6 border-t-4 border-t-dl-forest no-underline hover:bg-dl-bg-alt
                      ${i < truth.trustCards.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-dl-border' : ''}
                      ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                    title={`source: ${card.verifiedFrom}`}
                  >
                    <h3 className="font-dl-serif text-base text-dl-navy font-bold mb-2 leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-sm text-dl-gray leading-relaxed mb-4">{card.body}</p>
                    <span className="inline-flex items-center gap-1.5 text-xs text-dl-navy font-dl-mono font-bold uppercase tracking-wider">
                      Open Proof <ChevronRight className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 6 — WHY SERIOUS CAPITAL MOVES HERE ───────────── */}
          <div className="mb-16">
            <div className="mb-7">
              <SectionHeading>Why Serious Capital Moves Here</SectionHeading>
              <p className="text-sm md:text-base text-dl-gray mt-2 max-w-2xl">
                Built for participants who want transparency, control, and structured access — not black-box finance.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-dl-border">
              {SERIOUS_CAPITAL.map((c, i) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.title}
                    className={`p-6 border-l-4 border-l-dl-navy
                      ${i < SERIOUS_CAPITAL.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-dl-border' : ''}
                      ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                  >
                    <Icon className="w-5 h-5 text-dl-gold mb-3" />
                    <h3 className="font-dl-serif text-base text-dl-navy font-bold mb-2">{c.title}</h3>
                    <p className="text-sm text-dl-gray leading-relaxed">{c.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 7 — INFRASTRUCTURE STATUS ───────────────────── */}
          {truth.status.length > 0 && (
            <div className="mb-16">
              <div className="mb-5">
                <SectionHeading>Infrastructure Status</SectionHeading>
                <p className="text-sm md:text-base text-dl-gray mt-2">
                  Operational state of each component. Every label is derived from a backend source — not a marketing claim.
                </p>
              </div>
              <div className="border border-dl-border">
                {truth.status.map((row, i) => (
                  <Link
                    key={row.system}
                    href={row.href}
                    className={`flex items-center justify-between px-5 py-4 no-underline hover:bg-dl-bg-alt
                      ${i < truth.status.length - 1 ? 'border-b border-dl-border' : ''}
                      ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                    title={`source: ${row.verifiedFrom}`}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm md:text-base text-dl-navy font-medium">{row.system}</p>
                      <p className="text-xs text-dl-gray mt-0.5">{row.note}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusChip status={row.status} />
                      <ChevronRight className="w-3.5 h-3.5 text-dl-gray" />
                    </div>
                  </Link>
                ))}
              </div>
              <div className="border border-t-0 border-dl-border px-5 py-3 bg-dl-bg-alt flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-dl-gray font-dl-mono">
                  Status reflects current operational state — not projections.
                </p>
                {truth.proofLinks.solvency.available && (
                  <Link href={truth.proofLinks.solvency.href} className="text-xs text-dl-navy underline font-dl-mono">
                    Open live solvency console →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* SECTION 8 — VERIFIED METRICS ─────────────────────────── */}
          {truth.metrics.length > 0 && (
            <div className="mb-16">
              <div className="mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div>
                  <SectionHeading>Verified at a Glance</SectionHeading>
                  <p className="text-sm text-dl-gray mt-2">
                    Counts derived from the live route registry and the latest published snapshot.
                  </p>
                </div>
                {(verifiedAt || shortSnapshot) && (
                  <div className="text-xs font-dl-mono text-dl-gray text-left sm:text-right leading-relaxed">
                    {verifiedAt && <div>Last verified: <span className="text-dl-navy">{verifiedAt}</span></div>}
                    {shortSnapshot && <div>Snapshot: <span className="text-dl-navy">{shortSnapshot}…</span></div>}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
                {truth.metrics.map((m, i) => (
                  <div
                    key={m.label}
                    className={`px-5 py-5 border-l-4 border-l-dl-gold
                      ${i < truth.metrics.length - 1 ? 'border-r border-dl-border' : ''}
                      ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                    title={`source: ${m.verifiedFrom}`}
                  >
                    <p className="text-xs text-dl-gray mb-1 font-dl-mono uppercase tracking-wider">{m.label}</p>
                    <p className="font-dl-mono text-2xl font-bold text-dl-gold">{m.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-dl-gray font-dl-mono mt-2">
                No fabricated TVL, user counts, or capital volume. Only counts derived from the live system.
              </p>
            </div>
          )}

          {/* SECTION 9 — PROOF-FIRST CTA BAND ─────────────────────── */}
          <div className="mb-16 border border-dl-border border-t-4 border-t-dl-navy">
            <div className="p-8 md:p-12 bg-dl-bg-alt text-center">
              <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest mb-5">
                Proof Before Capital
              </p>
              <h2 className="font-dl-serif text-2xl md:text-4xl text-dl-navy mb-4 leading-tight" style={{ maxWidth: '720px', margin: '0 auto 16px' }}>
                The solvency console is public.<br />
                The contracts are verifiable.<br />
                <span className="text-dl-gold">Read first. Then decide.</span>
              </h2>
              <p className="text-sm md:text-base text-dl-gray leading-relaxed mb-8" style={{ maxWidth: '560px', margin: '0 auto 32px' }}>
                No signup required. No narrative required. Public proof is available now.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                {truth.proofLinks.verify.available && (
                  <Link
                    href={truth.proofLinks.verify.href}
                    className="inline-flex items-center justify-center gap-2 border-2 border-dl-navy bg-dl-navy text-white px-6 py-3.5 text-xs font-bold hover:bg-transparent hover:text-dl-navy font-dl-mono uppercase tracking-wider"
                  >
                    {truth.proofLinks.verify.label} <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
                {truth.proofLinks.solvency.available && (
                  <Link
                    href={truth.proofLinks.solvency.href}
                    className="inline-flex items-center justify-center gap-2 border border-dl-gold text-dl-gold px-6 py-3.5 text-xs font-bold hover:bg-dl-gold hover:text-white font-dl-mono uppercase tracking-wider"
                  >
                    {truth.proofLinks.solvency.label} <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
                {truth.proofLinks.disclosure.available && (
                  <Link
                    href={truth.proofLinks.disclosure.href}
                    className="inline-flex items-center justify-center gap-2 border border-dl-navy text-dl-navy px-6 py-3.5 text-xs font-bold hover:bg-dl-navy hover:text-white font-dl-mono uppercase tracking-wider"
                  >
                    {truth.proofLinks.disclosure.label} <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ORIGIN — community proof block (lower fold) */}
          <div className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
              <div className="relative" style={{ minHeight: '280px' }}>
                <img
                  src="/images/homepage-community.png"
                  alt="Community execution proof"
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                />
              </div>
              <div className="p-6 md:p-8 bg-dl-bg-alt border-l-4 border-l-dl-forest flex flex-col justify-center">
                <p className="text-xs text-dl-forest uppercase tracking-wider font-dl-mono mb-3">Origin — Reviewable Records</p>
                <p className="text-sm text-dl-gray leading-relaxed mb-4">
                  Before Axiom existed as software, a real community pooled funds and coordinated a land initiative with USDA support.
                  That experience proved shared ownership works — and proved most groups fail because coordination lacks structure.
                </p>
                <p className="text-sm text-dl-gray leading-relaxed mb-6">
                  Axiom converts that insight into a financial system: every operational action, snapshot, and capital movement is recorded
                  with a hash-chained log. Verification does not require trust — it requires reading.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/proof-of-execution"
                    className="inline-flex items-center gap-1.5 border border-dl-navy bg-dl-bg text-dl-navy px-4 py-2.5 text-xs font-bold hover:bg-dl-navy hover:text-white font-dl-mono uppercase tracking-wider"
                  >
                    Operations Log <ArrowRight className="w-3 h-3" />
                  </Link>
                  {truth.proofLinks.disclosure.available && (
                    <Link
                      href={truth.proofLinks.disclosure.href}
                      className="inline-flex items-center gap-1.5 border border-dl-border bg-dl-bg text-dl-navy px-4 py-2.5 text-xs font-bold hover:bg-dl-bg-alt font-dl-mono uppercase tracking-wider"
                    >
                      Disclosure <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER LINKS */}
          <div className="border-t border-dl-border pt-8 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-2">
              {[
                { label: 'AXAU Reserve', href: '/axau' },
                { label: 'AXUSD Settlement', href: '/axusd-3643' },
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
                >{link.label}</Link>
              ))}
            </div>
            {timestamp && (
              <p className="text-xs text-dl-gray font-dl-mono text-right mt-2">
                Rendered: {timestamp}{verifiedAt ? ` · Truth verified: ${verifiedAt}` : ''}
              </p>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
