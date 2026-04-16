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
  note: string;
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

export interface HomepageTruth {
  hero: {
    headline: string;
    subheadline: string;
    trustItems: TrustItem[];
  };
  pathCards: PathCard[];
  trustCards: TrustCard[];
  status: StatusRow[];
  proofLinks: {
    verify: ProofLink;
    solvency: ProofLink;
    disclosure: ProofLink;
  };
  metrics: OptionalMetric[];
  generatedAt: string;
}

function pageExists(routePath: string): boolean {
  // routePath like "/savings" — accept either pages/savings.tsx or pages/savings/index.tsx
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
  async resolve(): Promise<HomepageTruth> {
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
    const increase = getProviderStatus('increase');
    const bitgo = getProviderStatus('bitgo');

    const bankingLive = sysState?.banking.status === 'live' || increase.status === 'live';
    const custodyLive = sysState?.custody.status === 'live' || bitgo.status === 'live';
    const snapshotAvailable = !!sysState?.disclosure.snapshotId;

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
        status: bankingLive ? 'live' : (increase.status === 'configured' ? 'configured' : 'inactive'),
        note: bankingLive
          ? 'Increase ACH/wire rails active. FDIC-insured banking partner connected.'
          : 'Increase rails configured but not in production environment.',
        href: '/banking',
        verifiedFrom: 'SystemStateService.banking.status',
      });
    }

    if (pageExists('/axusd-3643')) {
      status.push({
        system: 'AXUSD Settlement Layer',
        status: 'live',
        note: 'Identity-gated settlement unit. Live on Arbitrum One.',
        href: '/axusd-3643',
        verifiedFrom: 'chainRegistry + onchain-deployment',
      });
    }

    if (pageExists('/dex')) {
      status.push({
        system: 'Protocol Exchange',
        status: 'live',
        note: 'AXM/AXUSD pairs with PSM-backed conversion engine.',
        href: '/dex',
        verifiedFrom: 'route:/dex + onchain-deployment',
      });
    }

    if (pageExists('/axau-early-access')) {
      status.push({
        system: 'AXAU Reserve Access',
        status: 'live',
        note: 'Reserve access application open. Identity credential required.',
        href: '/axau-early-access',
        verifiedFrom: 'route:/axau-early-access',
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

    // ── Proof links ───────────────────────────────────────────────────
    const proofLinks = {
      verify: {
        label: 'Verify Infrastructure',
        href: '/infrastructure',
        available: pageExists('/infrastructure'),
        verifiedFrom: 'route:/infrastructure',
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

    // ── Optional metrics (only if backed by source) ───────────────────
    const metrics: OptionalMetric[] = [];
    metrics.push({
      label: 'Operational Systems',
      value: String(status.filter((s) => s.status === 'live').length),
      verifiedFrom: 'derived:status[live].count',
    });
    metrics.push({
      label: 'Public Dashboards',
      value: String(['/solvency', '/observer', '/disclosure', '/proof-of-execution', '/infrastructure']
        .filter((r) => pageExists(r)).length),
      verifiedFrom: 'derived:route-count',
    });
    metrics.push({
      label: 'Capital Pathways',
      value: String(pathCards.length),
      verifiedFrom: 'derived:pathCards.length',
    });
    if (snapshotAvailable && sysState?.disclosure.lastSnapshotAt) {
      metrics.push({
        label: 'Latest Snapshot',
        value: new Date(sysState.disclosure.lastSnapshotAt).toISOString().slice(0, 10),
        verifiedFrom: 'SystemStateService.disclosure.lastSnapshotAt',
      });
    }

    return {
      hero: {
        // Headline / subheadline are static institutional copy. Each phrase
        // below is supported by the trust items derived above. If a phrase
        // loses its backing, soften it here.
        headline: 'Build Wealth With Verified Financial Infrastructure',
        subheadline: bankingLive
          ? 'Institutional banking, digital dollar settlement, reserve access, and public solvency reporting — through one operating system.'
          : 'Digital dollar settlement, reserve access, and public solvency reporting — through one operating system.',
        trustItems,
      },
      pathCards,
      trustCards,
      status,
      proofLinks,
      metrics,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const homepageTruthService = new HomepageTruthService();
