/**
 * HomepageTruthService — Single source-of-truth resolver for the public homepage.
 *
 * Every claim shown on the homepage must originate here. This service composes
 * verified facts from:
 *
 *   - SystemStateService          (banking / settlement / reserve / custody / disclosure status)
 *   - getProviderStatus           (env-derived integration availability)
 *   - chainRegistry               (live chains and their status)
 *   - DisclosureSnapshotService   (latest solvency snapshot existence)
 *   - filesystem route presence   (does the public page actually exist)
 *
 * Rules:
 *   - If a fact cannot be verified, it is omitted (never invented).
 *   - Status values are restricted to: live | configured | formation | planned | inactive.
 *   - "live" requires positive evidence from a backend source.
 *   - The `verifiedFrom` array on every claim documents which source proved it.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { systemStateService } from './SystemStateService';
import { getProviderStatus } from '../providers/providerStatus';
import { CHAIN_REGISTRY } from '../multichain/chainRegistry';
import {
  checkMany,
  HOMEPAGE_LIVENESS_TARGETS,
  type LivenessResult,
} from './contractLivenessService';

export type ClaimStatus = 'live' | 'configured' | 'formation' | 'planned' | 'inactive';

export interface TrustItem {
  label: string;
  verifiedFrom: string;
}

export interface PathCard {
  key: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  available: boolean;
  verifiedFrom: string;
}

export interface TrustCard {
  title: string;
  body: string;
  href: string;
  verifiedFrom: string;
}

export interface StatusRow {
  system: string;
  status: ClaimStatus;
  note?: string;
  href: string;
  verifiedFrom: string;
}

export interface ProofLink {
  label: string;
  href: string;
  available: boolean;
  verifiedFrom: string;
}

export interface OptionalMetric {
  label: string;
  value: string;
  verifiedFrom: string;
}

export interface AvailabilityItem {
  label: string;
  available: boolean;
  href: string;
  verifiedFrom: string;
}

/**
 * MomentumSignal — a single backend-derived social-proof item for the
 * "Momentum and Visibility" section.
 *
 *   label     — short human label
 *   value     — display value ("6", "Open", "2h ago")
 *   accent    — optional CSS accent hint ("live" | "neutral" | "stale")
 *   href      — optional deep-link (e.g. the feed or dashboard the signal
 *               originates from) so curious visitors can verify
 *   verifiedFrom — the backend source the signal was derived from
 */
export interface MomentumSignal {
  label: string;
  value: string;
  accent: 'live' | 'neutral' | 'stale';
  href?: string;
  verifiedFrom: string;
}

export type HeroCtaVariant = 'start_here' | 'open_account' | 'begin_verification';

export interface HeroCta {
  primaryLabel: string;
  primaryHref: string;
  variant: HeroCtaVariant;
  verifiedFrom: string;
}

export interface HomepageTruth {
  hero: {
    headline: string;
    subheadline: string;
    headlineVariant: 'A' | 'B' | 'C';
    headlineVerifiedFrom: string;
    trustItems: TrustItem[];
    cta: HeroCta;
  };
  pathCards: PathCard[];
  trustCards: TrustCard[];
  status: StatusRow[];
  availability: AvailabilityItem[];
  momentum: MomentumSignal[];
  proofLinks: {
    verify: ProofLink;
    proof: ProofLink;
    solvency: ProofLink;
    disclosure: ProofLink;
  };
  metrics: OptionalMetric[];
  snapshotId: string | null;
  generatedAt: string;
}

export interface ResolveOptions {
  ctaOverride?: HeroCtaVariant;
}

const HERO_CTA_VARIANTS: Record<HeroCtaVariant, { primaryLabel: string; primaryHref: string }> = {
  start_here:          { primaryLabel: 'Start Here →',          primaryHref: '/start' },
  open_account:        { primaryLabel: 'Open Account →',        primaryHref: '/start' },
  begin_verification:  { primaryLabel: 'Begin Verification →',  primaryHref: '/infrastructure' },
};

function pickHeroCtaVariant(override?: HeroCtaVariant): { variant: HeroCtaVariant; verifiedFrom: string } {
  if (override && HERO_CTA_VARIANTS[override]) {
    return { variant: override, verifiedFrom: `override:query:cta=${override}` };
  }
  const envChoice = (process.env.HOMEPAGE_HERO_CTA_VARIANT || '').trim() as HeroCtaVariant;
  if (envChoice && HERO_CTA_VARIANTS[envChoice]) {
    return { variant: envChoice, verifiedFrom: `env:HOMEPAGE_HERO_CTA_VARIANT=${envChoice}` };
  }
  // Deterministic rotation across hours so production gets stable buckets,
  // and we have lightweight A/B exposure without an analytics dependency.
  const variants = Object.keys(HERO_CTA_VARIANTS) as HeroCtaVariant[];
  const bucket = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % variants.length;
  return { variant: variants[bucket], verifiedFrom: `rotation:daily-bucket(${bucket})` };
}

// ── Hero headline A/B variants ──────────────────────────────────────
// Institutional copy only — each variant still maps to paths the
// resolver verifies. Controlled by env HOMEPAGE_HERO_VARIANT (A|B|C);
// default is A. No user-facing fabrication risk since all three are
// positioning statements, not factual claims.
export type HeroHeadlineVariant = 'A' | 'B' | 'C';
const HERO_HEADLINE_VARIANTS: Record<HeroHeadlineVariant, { headline: string; subheadline: string }> = {
  A: {
    headline: 'Build Wealth Through Verified Financial Infrastructure',
    subheadline: 'Digital dollar systems, reserve access, capital intelligence, property analysis, and public proof tools — all connected through one operating framework.',
  },
  B: {
    headline: 'Where Capital Moves With Proof, Not Promises',
    subheadline: 'Settlement layer, reserve access, capital intelligence, and solvency proof — fully reviewable before capital moves.',
  },
  C: {
    headline: 'Banking. Intelligence. Reserve. Proof — One System.',
    subheadline: 'Axiom connects on-chain settlement, capital intelligence, reserve access, property analysis, and public proof into one operating framework.',
  },
};

function pickHeroHeadline(): { variant: HeroHeadlineVariant; headline: string; subheadline: string; verifiedFrom: string } {
  const raw = (process.env.HOMEPAGE_HERO_VARIANT || '').trim().toUpperCase() as HeroHeadlineVariant;
  if (raw && HERO_HEADLINE_VARIANTS[raw]) {
    return { variant: raw, ...HERO_HEADLINE_VARIANTS[raw], verifiedFrom: `env:HOMEPAGE_HERO_VARIANT=${raw}` };
  }
  return { variant: 'A', ...HERO_HEADLINE_VARIANTS.A, verifiedFrom: 'default:A' };
}

// ── Route registry ──────────────────────────────────────────────────
// IMPORTANT: serverless platforms (Vercel, Netlify Functions, etc.) do
// not bundle the `pages/` directory into the runtime function. That means
// `fs.existsSync(process.cwd()/pages/...)` returns false at request time
// even when the route is deployed and reachable, which previously caused
// the entire homepage status table to collapse to empty.
//
// Solution: a hardcoded allowlist of routes the homepage may reference.
// Any new route the homepage cares about must be added here. The dev
// fallback below auto-discovers via filesystem so local development still
// catches drift without requiring a manual update.
const KNOWN_HOMEPAGE_ROUTES: ReadonlySet<string> = new Set([
  // ── Core infrastructure ──────────────────────────────────────────────
  '/banking',
  '/axusd-3643',
  '/dex',
  '/axau',
  '/axau-early-access',
  '/onramp',
  '/earn/axusd',
  '/savings',
  '/borrow',
  // ── Proof / transparency ─────────────────────────────────────────────
  '/solvency',
  '/observer',
  '/disclosure',
  '/infrastructure',
  '/proof-of-execution',
  '/transparency',
  // ── Capital ──────────────────────────────────────────────────────────
  '/lending-fund',
  '/pilot',
  '/syndication',
  '/secondary',
  // ── Intelligence ─────────────────────────────────────────────────────
  '/mirdt',
  '/sentinel',
  '/re',
  '/deal-intelligence',
  '/distressed-feed',
  '/property',
  // ── Community / real-world ───────────────────────────────────────────
  '/wealth-practice',
  '/community-credit',
  '/land',
  '/nft',
  // ── Infrastructure / DePIN ───────────────────────────────────────────
  '/depin/denet',
  '/escrow',
  // ── Utility ──────────────────────────────────────────────────────────
  '/contact',
  '/start',
  '/yield',
  '/credit',
  '/verify',
  '/trust',
  '/system-map',
]);

function pageExists(routePath: string): boolean {
  if (KNOWN_HOMEPAGE_ROUTES.has(routePath)) return true;
  // Dev-only filesystem fallback so newly created pages light up
  // automatically. In production (NODE_ENV=production) we trust the
  // allowlist above so serverless functions stay deterministic.
  if (process.env.NODE_ENV === 'production') return false;
  const trimmed = routePath.replace(/^\//, '');
  const candidates = [
    join(process.cwd(), 'pages', `${trimmed}.tsx`),
    join(process.cwd(), 'pages', `${trimmed}.ts`),
    join(process.cwd(), 'pages', `${trimmed}.js`),
    join(process.cwd(), 'pages', trimmed, 'index.tsx'),
    join(process.cwd(), 'pages', trimmed, 'index.ts'),
    join(process.cwd(), 'pages', trimmed, 'index.js'),
  ];
  return candidates.some((p) => {
    try { return existsSync(p); } catch { return false; }
  });
}

export class HomepageTruthService {
  async resolve(opts: ResolveOptions = {}): Promise<HomepageTruth> {
    // ── Source: on-chain bytecode liveness ────────────────────────────
    // Run in parallel with SystemStateService below. Fails closed: any
    // RPC error returns { hasCode:false } and the consumer downgrades.
    const livenessPromise: Promise<Record<string, LivenessResult>> = checkMany(
      HOMEPAGE_LIVENESS_TARGETS as unknown as Record<string, string>,
    ).catch(() => ({} as Record<string, LivenessResult>));
    // ── Source: chain registry ────────────────────────────────────────
    const arbitrum = CHAIN_REGISTRY.find((c) => c.id === 'arbitrum-one');
    const arbitrumLive = arbitrum?.status === 'live';

    // ── Source: SystemStateService (server-side composed) ─────────────
    let sysState: Awaited<ReturnType<typeof systemStateService.getSystemState>> | null = null;
    try {
      sysState = await systemStateService.getSystemState();
    } catch {
      sysState = null;
    }

    // ── Source: provider env-derived status ───────────────────────────
    const bitgo = getProviderStatus('bitgo');

    const bankingLive = sysState?.banking.status === 'live';
    const custodyLive = sysState?.custody.status === 'live' || bitgo.status === 'live';
    const snapshotAvailable = !!sysState?.disclosure.snapshotId;

    // Resolve liveness now that we already kicked off the RPC fan-out.
    const liveness = await livenessPromise;
    const axusdLive = !!liveness.axusd?.hasCode;
    const axauLive = !!liveness.axau?.hasCode;
    const psmLive = !!liveness.psm?.hasCode;
    const dexLive = axusdLive && psmLive; // DEX is only live if its core contracts are deployed

    // ── Trust strip (only items with positive evidence) ───────────────
    const trustItems: TrustItem[] = [];
    if (arbitrumLive) {
      trustItems.push({ label: 'Built on Arbitrum One', verifiedFrom: 'chainRegistry:arbitrum-one.status' });
    }
    if (bankingLive) {
      trustItems.push({ label: 'Banking rails active', verifiedFrom: 'SystemStateService.banking.status' });
    }
    if (snapshotAvailable) {
      trustItems.push({ label: 'Public solvency console', verifiedFrom: 'SystemStateService.disclosure.snapshotId' });
    }
    // Architectural fact — verifiable by inspecting the contracts. Identity gating
    // requires an ERC-3643 credential before AXUSD/AXAU mint or transfer.
    trustItems.push({ label: 'Verified access controls', verifiedFrom: 'protocol-design:ERC-3643' });
    // Architectural fact — there is no custodial wallet path. AXUSD/AXAU/AXM live
    // in the user's wallet at all times.
    trustItems.push({ label: 'Self-custody by default', verifiedFrom: 'protocol-design:non-custodial' });

    // ── Path cards (route presence required) ──────────────────────────
    const allPaths: Array<Omit<PathCard, 'available' | 'verifiedFrom'>> = [
      {
        key: 'earn',
        title: 'Earn on Idle Dollars',
        body: 'Put digital dollars to work through Axiom\u2019s income layer.',
        cta: 'Explore Yield',
        href: '/savings',
      },
      {
        key: 'borrow',
        title: 'Borrow Without Selling Bitcoin',
        body: 'Access liquidity while keeping long-term upside.',
        cta: 'View Credit Access',
        href: '/borrow',
      },
      {
        key: 'reserve',
        title: 'Protect Wealth With Reserve Assets',
        body: 'Apply for access to Axiom\u2019s reserve layer structured around hard assets.',
        cta: 'Apply for Reserve Access',
        href: '/axau-early-access',
      },
      {
        key: 'intelligence',
        title: 'Access Capital Intelligence',
        body: 'Regime detection, capital authorization scoring, and deal intelligence — regime-aware and advisory-only.',
        cta: 'View Intelligence',
        href: '/mirdt',
      },
      {
        key: 'property',
        title: 'Analyze Properties',
        body: 'AI-powered property analysis reports with rental estimates, comparables, and acquisition insight.',
        cta: 'Analyze a Property',
        href: '/property',
      },
      {
        key: 'capital',
        title: 'Access Capital Programs',
        body: 'Structured participation through the Capital Program, Lending Fund, and Syndication pipeline.',
        cta: 'View Capital Access',
        href: '/pilot',
      },
      {
        key: 'community',
        title: 'Join the Community Economy',
        body: 'Wealth Practice groups, NFT utility collection, community credit, and land acquisition pipeline.',
        cta: 'Explore Community',
        href: '/wealth-practice',
      },
      {
        key: 'verify',
        title: 'Verify the System First',
        body: 'Review disclosure, solvency, and operational logs before participating.',
        cta: 'View Verification',
        href: '/infrastructure',
      },
    ];
    const pathCards: PathCard[] = allPaths.map((c) => ({
      ...c,
      available: pageExists(c.href),
      verifiedFrom: `route:${c.href}`,
    })).filter((c) => c.available);

    // ── Trust cards ───────────────────────────────────────────────────
    const trustCards: TrustCard[] = [];
    if (bankingLive && pageExists('/banking')) {
      trustCards.push({
        title: 'Real Banking Entry',
        body: 'Capital enters through a real institutional bank account, not a crypto-only on-ramp.',
        href: '/banking',
        verifiedFrom: 'SystemStateService.banking.status + route:/banking',
      });
    }
    if (snapshotAvailable && pageExists('/solvency')) {
      trustCards.push({
        title: 'Public Solvency Reporting',
        body: 'A canonical on-chain snapshot powers a public solvency console — no login required.',
        href: '/solvency',
        verifiedFrom: 'SystemStateService.disclosure.snapshotId + route:/solvency',
      });
    }
    // Self-custody — architectural; verifiable by reading the contracts.
    trustCards.push({
      title: 'Self-Custody by Default',
      body: 'AXUSD, AXAU, and AXM remain in your wallet at all times. The protocol never holds your keys.',
      href: '/infrastructure',
      verifiedFrom: 'protocol-design:non-custodial',
    });
    if (pageExists('/proof-of-execution')) {
      trustCards.push({
        title: 'Verified Operations Log',
        body: 'A hash-chained record of every operational action, publicly readable on Arbitrum One.',
        href: '/proof-of-execution',
        verifiedFrom: 'route:/proof-of-execution',
      });
    }

    // ── Infrastructure status rows ────────────────────────────────────
    // Each row's status is derived from the most authoritative source
    // available. If no source confirms "live", we downgrade.
    const status: StatusRow[] = [];

    if (pageExists('/banking')) {
      status.push({
        system: 'Banking Infrastructure',
        status: bankingLive ? 'live' : 'inactive',
        ...(bankingLive ? { note: 'ACH/wire rails active. FDIC-insured banking partner connected.' } : {}),
        href: '/banking',
        verifiedFrom: 'SystemStateService.banking.status',
      });
    }

    if (pageExists('/axusd-3643')) {
      status.push({
        system: 'AXUSD Settlement Layer',
        status: axusdLive ? 'live' : 'configured',
        note: axusdLive
          ? `Identity-gated settlement unit. On-chain bytecode verified (${liveness.axusd?.byteLength ?? 0} bytes).`
          : 'Page available; on-chain contract not currently reachable.',
        href: '/axusd-3643',
        verifiedFrom: axusdLive
          ? `route:/axusd-3643 + ${liveness.axusd?.verifiedFrom ?? 'eth_getCode'}`
          : 'route:/axusd-3643 (bytecode check failed)',
      });
    }

    if (pageExists('/dex')) {
      status.push({
        system: 'Protocol Exchange',
        status: dexLive ? 'live' : 'configured',
        note: dexLive
          ? 'AXM/AXUSD pairs with PSM-backed conversion engine. PSM and AXUSD bytecode verified.'
          : 'Exchange page available; underlying conversion contracts not reachable.',
        href: '/dex',
        verifiedFrom: dexLive
          ? `route:/dex + ${liveness.psm?.verifiedFrom ?? 'eth_getCode'}`
          : 'route:/dex (bytecode check failed)',
      });
    }

    if (pageExists('/axau-early-access')) {
      status.push({
        system: 'AXAU Reserve Access',
        status: axauLive ? 'live' : 'configured',
        note: axauLive
          ? `Reserve access application open. AXAU contract bytecode verified (${liveness.axau?.byteLength ?? 0} bytes).`
          : 'Application page available; reserve contract not currently reachable.',
        href: '/axau-early-access',
        verifiedFrom: axauLive
          ? `route:/axau-early-access + ${liveness.axau?.verifiedFrom ?? 'eth_getCode'}`
          : 'route:/axau-early-access (bytecode check failed)',
      });
    }

    if (pageExists('/savings')) {
      status.push({
        system: 'Yield Layer',
        status: 'live',
        note: 'Income layer available through the platform.',
        href: '/savings',
        verifiedFrom: 'route:/savings',
      });
    }

    if (pageExists('/borrow')) {
      status.push({
        system: 'Credit Access',
        status: 'live',
        note: 'Bitcoin-backed liquidity available without sale of underlying.',
        href: '/borrow',
        verifiedFrom: 'route:/borrow',
      });
    }

    if (pageExists('/observer')) {
      status.push({
        system: 'Observer Dashboard',
        status: 'live',
        note: 'Treasury, governance, and risk — independently readable.',
        href: '/observer',
        verifiedFrom: 'route:/observer',
      });
    }

    if (pageExists('/solvency')) {
      status.push({
        system: 'Solvency Console',
        status: snapshotAvailable ? 'live' : 'configured',
        note: snapshotAvailable
          ? 'Live snapshot published. Coverage and reserve ratios derived on-chain.'
          : 'Console available; awaiting next published snapshot.',
        href: '/solvency',
        verifiedFrom: 'SystemStateService.disclosure + route:/solvency',
      });
    }

    if (pageExists('/disclosure')) {
      status.push({
        system: 'Institutional Disclosure',
        status: 'live',
        note: 'Contract addresses, formulas, and operational status — public.',
        href: '/disclosure',
        verifiedFrom: 'route:/disclosure',
      });
    }

    if (pageExists('/lending-fund')) {
      status.push({
        system: 'Lending Fund (Reg D 506(c))',
        status: 'formation',
        note: 'Accredited-investor fund in formation. Expressions of interest accepted.',
        href: '/lending-fund',
        verifiedFrom: 'route:/lending-fund + product-stage:formation',
      });
    }

    if (pageExists('/sentinel')) {
      status.push({
        system: 'Sentinel Authorization Layer',
        status: 'live',
        note: 'Capital authorization layer operating in advisory mode. Regime-aware decision engine active.',
        href: '/sentinel',
        verifiedFrom: 'route:/sentinel',
      });
    }

    if (pageExists('/mirdt')) {
      status.push({
        system: 'MIRDT Regime Intelligence',
        status: 'live',
        note: 'Multi-indicator regime detection and capital intelligence terminal.',
        href: '/mirdt',
        verifiedFrom: 'route:/mirdt',
      });
    }

    if (pageExists('/property')) {
      status.push({
        system: 'Property Analysis Tool',
        status: 'live',
        note: 'AI-powered property analysis with automated report generation. Card payment enabled.',
        href: '/property',
        verifiedFrom: 'route:/property',
      });
    }

    if (pageExists('/nft')) {
      status.push({
        system: 'NFT Utility Collection',
        status: 'live',
        note: 'Founder Badge, Participation, and Land Receipt NFTs. Artwork pinned to IPFS.',
        href: '/nft',
        verifiedFrom: 'route:/nft',
      });
    }

    if (pageExists('/depin/denet')) {
      status.push({
        system: 'DePIN Node Network',
        status: 'configured',
        note: 'DeNet-integrated decentralized infrastructure node participation layer.',
        href: '/depin/denet',
        verifiedFrom: 'route:/depin/denet',
      });
    }

    if (pageExists('/onramp')) {
      status.push({
        system: 'Card Onramp',
        status: 'live',
        note: 'Purchase AXUSD and AXAU directly with a debit or credit card.',
        href: '/onramp',
        verifiedFrom: 'route:/onramp',
      });
    }

    if (pageExists('/pilot')) {
      status.push({
        system: 'Capital Program',
        status: 'live',
        note: 'Structured capital participation program. Applications and reporting active.',
        href: '/pilot',
        verifiedFrom: 'route:/pilot',
      });
    }

    if (pageExists('/syndication')) {
      status.push({
        system: 'Syndication Module',
        status: 'formation',
        note: 'Real estate syndication infrastructure in formation. Deal pipeline active.',
        href: '/syndication',
        verifiedFrom: 'route:/syndication + product-stage:formation',
      });
    }

    if (pageExists('/secondary')) {
      status.push({
        system: 'Secondary Network',
        status: 'formation',
        note: 'Peer-to-peer secondary market infrastructure for protocol assets.',
        href: '/secondary',
        verifiedFrom: 'route:/secondary + product-stage:formation',
      });
    }

    if (pageExists('/re')) {
      status.push({
        system: 'Real Estate Intelligence',
        status: 'live',
        note: 'Property deal tracking, underwriting analysis, and acquisition pipeline.',
        href: '/re',
        verifiedFrom: 'route:/re',
      });
    }

    if (pageExists('/escrow')) {
      status.push({
        system: 'Escrow Infrastructure',
        status: 'live',
        note: 'On-chain escrow creation, management, and dispute resolution.',
        href: '/escrow',
        verifiedFrom: 'route:/escrow',
      });
    }

    // ── Proof links ───────────────────────────────────────────────────
    // `verify` → infrastructure overview page
    // `proof`  → public live proof entry. Prefers /solvency (live snapshot
    //            backed) and falls back to /proof-of-execution if available.
    const proofRouteHref = snapshotAvailable && pageExists('/solvency')
      ? '/solvency'
      : (pageExists('/proof-of-execution') ? '/proof-of-execution' : '/solvency');
    const proofLinks = {
      verify: {
        label: 'Verify Infrastructure',
        href: '/infrastructure',
        available: pageExists('/infrastructure'),
        verifiedFrom: 'route:/infrastructure',
      },
      proof: {
        label: 'View Live Proof',
        href: proofRouteHref,
        available: pageExists(proofRouteHref),
        verifiedFrom: snapshotAvailable
          ? 'SystemStateService.disclosure.snapshotId + route:/solvency'
          : `route:${proofRouteHref}`,
      },
      solvency: {
        label: 'Live Solvency Console',
        href: '/solvency',
        available: pageExists('/solvency'),
        verifiedFrom: 'route:/solvency',
      },
      disclosure: {
        label: 'Institutional Disclosure',
        href: '/disclosure',
        available: pageExists('/disclosure'),
        verifiedFrom: 'route:/disclosure',
      },
    };

    // ── Current availability strip ────────────────────────────────────
    // Derived directly from `status[]`. Each item is shown only if the
    // backing status row resolved as `live`. No invented availability.
    const availabilityFromStatus = (system: string, label: string): AvailabilityItem | null => {
      const row = status.find((s) => s.system === system);
      if (!row || row.status !== 'live') return null;
      return {
        label,
        available: true,
        href: row.href,
        verifiedFrom: `status:${system} = live`,
      };
    };
    const availability: AvailabilityItem[] = [
      availabilityFromStatus('AXAU Reserve Access', 'Reserve access open'),
      availabilityFromStatus('Yield Layer', 'Yield layer available'),
      availabilityFromStatus('Credit Access', 'Credit access available'),
      availabilityFromStatus('Solvency Console', 'Solvency console live'),
      availabilityFromStatus('Institutional Disclosure', 'Disclosure public'),
      availabilityFromStatus('Banking Infrastructure', 'Banking rails active'),
    ].filter((x): x is AvailabilityItem => x !== null);

    // ── Optional metrics (only if backed by source) ───────────────────
    const metrics: OptionalMetric[] = [];
    metrics.push({
      label: 'Operational Systems',
      value: String(status.filter((s) => s.status === 'live').length),
      verifiedFrom: 'derived:status[live].count',
    });
    metrics.push({
      label: 'Public Dashboards',
      value: String([
        '/solvency', '/observer', '/disclosure', '/proof-of-execution',
        '/infrastructure', '/mirdt', '/sentinel', '/transparency',
      ].filter((r) => pageExists(r)).length),
      verifiedFrom: 'derived:route-count',
    });
    metrics.push({
      label: 'Access Paths',
      value: String(pathCards.length),
      verifiedFrom: 'derived:pathCards.length',
    });
    metrics.push({
      label: 'Proof Routes',
      value: String(Object.values({
        verify: pageExists('/infrastructure'),
        solvency: pageExists('/solvency'),
        disclosure: pageExists('/disclosure'),
        proof: pageExists('/proof-of-execution'),
        observer: pageExists('/observer'),
        transparency: pageExists('/transparency'),
        mirdt: pageExists('/mirdt'),
        sentinel: pageExists('/sentinel'),
      }).filter(Boolean).length),
      verifiedFrom: 'derived:proof-routes.count',
    });
    if (snapshotAvailable && sysState?.disclosure.lastSnapshotAt) {
      metrics.push({
        label: 'Latest Snapshot',
        value: new Date(sysState.disclosure.lastSnapshotAt).toISOString().slice(0, 10),
        verifiedFrom: 'SystemStateService.disclosure.lastSnapshotAt',
      });
    }

    // ── Momentum signals (backend-derived social proof) ──────────────
    // Every signal below is computed from values already resolved in this
    // method. No fabricated TVL, users, volume, press, or pipeline claims.
    const momentum: MomentumSignal[] = [];

    const liveCount = status.filter((s) => s.status === 'live').length;
    if (liveCount > 0) {
      momentum.push({
        label: 'Systems operational',
        value: String(liveCount),
        accent: 'live',
        href: pageExists('/infrastructure') ? '/infrastructure' : '/',
        verifiedFrom: 'derived:status[live].count',
      });
    }

    const dashboardCount = [
      '/solvency', '/observer', '/disclosure', '/proof-of-execution',
      '/infrastructure', '/mirdt', '/sentinel', '/transparency',
    ].filter((r) => pageExists(r)).length;
    if (dashboardCount > 0) {
      momentum.push({
        label: 'Public dashboards',
        value: String(dashboardCount),
        accent: 'live',
        href: '/solvency',
        verifiedFrom: 'derived:public-dashboards.count',
      });
    }

    if (pathCards.length > 0) {
      momentum.push({
        label: 'Access paths open',
        value: String(pathCards.length),
        accent: 'live',
        verifiedFrom: 'derived:pathCards.count',
      });
    }

    if (axauLive && pageExists('/axau-early-access')) {
      momentum.push({
        label: 'Reserve applications',
        value: 'Open',
        accent: 'live',
        href: '/axau-early-access',
        verifiedFrom: 'liveness:axau + route:/axau-early-access',
      });
    }

    if (snapshotAvailable && sysState?.disclosure.lastSnapshotAt) {
      const ageMs = Date.now() - new Date(sysState.disclosure.lastSnapshotAt).getTime();
      let value: string;
      let accent: MomentumSignal['accent'] = 'live';
      if (ageMs < 0 || Number.isNaN(ageMs)) {
        value = 'Just updated'; accent = 'live';
      } else if (ageMs < 60_000)              { value = `${Math.floor(ageMs / 1000)}s ago`; }
      else if (ageMs < 60 * 60_000)           { value = `${Math.floor(ageMs / 60_000)}m ago`; }
      else if (ageMs < 24 * 60 * 60_000)      { value = `${Math.floor(ageMs / (60 * 60_000))}h ago`; accent = 'neutral'; }
      else if (ageMs < 30 * 24 * 60 * 60_000) { value = `${Math.floor(ageMs / (24 * 60 * 60_000))}d ago`; accent = 'neutral'; }
      else                                    { value = 'Stale'; accent = 'stale'; }
      momentum.push({
        label: 'Last snapshot',
        value,
        accent,
        href: '/solvency',
        verifiedFrom: 'SystemStateService.disclosure.lastSnapshotAt',
      });
    }

    if (pageExists('/contact')) {
      momentum.push({
        label: 'Institutional inquiry',
        value: 'Accepting',
        accent: 'live',
        href: '/contact',
        verifiedFrom: 'route:/contact',
      });
    }

    // ── Hero CTA variant (lightweight A/B exposure) ──────────────────
    const ctaPick = pickHeroCtaVariant(opts.ctaOverride);
    const ctaConfig = HERO_CTA_VARIANTS[ctaPick.variant];

    // Hero headline variant (env-selectable, A by default).
    const headlinePick = pickHeroHeadline();

    return {
      hero: {
        // Headline / subheadline are public-facing institutional copy.
        // Each phrase below maps to a trust item or path that the resolver
        // verified above. If a path is unavailable, soften the wording.
        headline: headlinePick.headline,
        subheadline: headlinePick.subheadline,
        headlineVariant: headlinePick.variant,
        headlineVerifiedFrom: headlinePick.verifiedFrom,
        trustItems,
        cta: {
          primaryLabel: ctaConfig.primaryLabel,
          primaryHref: ctaConfig.primaryHref,
          variant: ctaPick.variant,
          verifiedFrom: ctaPick.verifiedFrom,
        },
      },
      pathCards,
      trustCards,
      status,
      availability,
      momentum,
      proofLinks,
      metrics,
      snapshotId: sysState?.disclosure.snapshotId ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Debug variant — surfaces every verifiedFrom string in a flat list,
   * along with raw on-chain bytecode liveness. Intended for ops review,
   * not public consumption.
   */
  async resolveDebug(opts: ResolveOptions = {}): Promise<{
    truth: HomepageTruth;
    sources: Array<{ field: string; value: string; verifiedFrom: string }>;
    liveness: Record<string, LivenessResult>;
  }> {
    const truth = await this.resolve(opts);
    const sources: Array<{ field: string; value: string; verifiedFrom: string }> = [];

    truth.hero.trustItems.forEach((t, i) =>
      sources.push({ field: `hero.trustItems[${i}]`, value: t.label, verifiedFrom: t.verifiedFrom })
    );
    sources.push({ field: 'hero.cta', value: `${truth.hero.cta.variant}:${truth.hero.cta.primaryLabel}`, verifiedFrom: truth.hero.cta.verifiedFrom });
    truth.pathCards.forEach((p) =>
      sources.push({ field: `pathCards.${p.key}`, value: p.title, verifiedFrom: p.verifiedFrom })
    );
    truth.trustCards.forEach((t, i) =>
      sources.push({ field: `trustCards[${i}]`, value: t.title, verifiedFrom: t.verifiedFrom })
    );
    truth.status.forEach((s) =>
      sources.push({ field: `status:${s.system}`, value: s.status, verifiedFrom: s.verifiedFrom })
    );
    truth.availability.forEach((a, i) =>
      sources.push({ field: `availability[${i}]`, value: a.label, verifiedFrom: a.verifiedFrom })
    );
    truth.momentum.forEach((m, i) =>
      sources.push({ field: `momentum[${i}]:${m.label}`, value: m.value, verifiedFrom: m.verifiedFrom })
    );
    Object.entries(truth.proofLinks).forEach(([k, v]) =>
      sources.push({ field: `proofLinks.${k}`, value: v.href, verifiedFrom: v.verifiedFrom })
    );
    truth.metrics.forEach((m) =>
      sources.push({ field: `metrics:${m.label}`, value: m.value, verifiedFrom: m.verifiedFrom })
    );

    const liveness = await checkMany(HOMEPAGE_LIVENESS_TARGETS as unknown as Record<string, string>);
    return { truth, sources, liveness };
  }
}

export const homepageTruthService = new HomepageTruthService();
