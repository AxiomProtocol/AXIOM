import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

const LAYER_1 = {
  label: 'Layer 01 — Reserve',
  heading: 'AXAU Reserve',
  description: 'The gold-backed reserve unit of the Axiom Protocol. Collateralised 1:1 by PAXG. Direct on-chain mint and redeem via identity-gated (ERC-3643) smart contract rails.',
  href: '/axau',
  status: 'LIVE',
  metrics: [
    { label: 'Backing', value: 'PAXG 1:1' },
    { label: 'Standard', value: 'ERC-3643' },
    { label: 'Network', value: 'Arbitrum One' },
    { label: 'Access', value: 'Identity Gated' },
  ],
};

const LAYER_2 = [
  {
    id: 'axusd',
    name: 'AXUSD Settlement Rail',
    description: 'The protocol\'s identity-gated stablecoin for settlement, transactional capital, and PSM-backed liquidity. ERC-3643 compliant with embedded identity credentials.',
    href: '/axusd-3643',
    status: 'LIVE',
    metrics: [
      { label: 'Standard', value: 'ERC-3643' },
      { label: 'PSM', value: 'Live' },
      { label: 'Identity', value: 'On-Chain KYC' },
    ],
  },
  {
    id: 'dex',
    name: 'Protocol Exchange',
    description: 'On-chain exchange infrastructure on Camelot V2 for AXM governance token and AXUSD stablecoin liquidity. Open access, no identity gating required.',
    href: '/dex',
    status: 'LIVE',
    metrics: [
      { label: 'DEX', value: 'Camelot V2' },
      { label: 'Pairs', value: 'AXM / AXUSD' },
      { label: 'Network', value: 'Arbitrum One' },
    ],
  },
];

const LAYER_3 = [
  {
    id: 'capital-program',
    name: 'Capital Program',
    description: 'Structured Reg D 506(c) formation with dual-asset SPVs (cash flow + appreciation), a 52-week operational playbook, and a 35/35/20/10 treasury allocation policy.',
    href: '/pilot',
    status: 'FORMATION',
    metrics: [
      { label: 'Structure', value: 'Dual SPV' },
      { label: 'Allocation', value: '35/35/20/10' },
      { label: 'Target Capital', value: '$1M' },
    ],
  },
  {
    id: 'lending-fund',
    name: 'Lending Fund',
    description: 'Bridge loan and DSCR rental fund designed to align with SEC Reg D 506(c). ERC-4626 vault standard, ERC-721 loan receipts, and governance-controlled risk parameters.',
    href: '/lending-fund',
    status: 'FORMATION',
    metrics: [
      { label: 'Mandate', value: 'Fix & Flip + DSCR' },
      { label: 'Vault', value: 'ERC-4626' },
      { label: 'Governance', value: 'On-Chain' },
    ],
  },
  {
    id: 'syndication',
    name: 'Syndication',
    description: 'Full syndication operating system including deal structuring, LP investor onboarding, accredited investor verification, and an on-chain investor portal.',
    href: '/syndication',
    status: 'ACTIVE',
    metrics: [
      { label: 'Access', value: 'Accredited LPs' },
      { label: 'Portal', value: 'Investor Portal' },
      { label: 'Settlement', value: 'On-Chain' },
    ],
  },
  {
    id: 'depin',
    name: 'DePIN Network',
    description: 'Decentralized physical infrastructure nodes integrated with DeNet. ETH and AXM payment options with a 5% insurance diversion and 15% AXM discount.',
    href: '/depin/denet',
    status: 'LIVE',
    metrics: [
      { label: 'Payments', value: 'ETH + AXM' },
      { label: 'AXM Discount', value: '15%' },
      { label: 'Insurance', value: '5% Diversion' },
    ],
  },
];

const LAYER_4 = [
  {
    id: 'mirdt',
    name: 'Regime Intelligence (MIRDT)',
    description: 'Nine-dimension capital regime scoring engine with probabilistic trend-following analysis, full audit trail, and human confirmation gate on all signal outputs.',
    href: '/mirdt',
    status: 'LIVE',
    metrics: [
      { label: 'Dimensions', value: '9-Factor' },
      { label: 'Mode', value: 'Paper / Live' },
      { label: 'Gate', value: 'Human Confirm' },
    ],
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    description: 'Unified capital decision and risk authorization layer. Policy-based autonomous agent authorization with explicit human confirmation requirements on all outputs.',
    href: '/sentinel',
    status: 'LIVE',
    metrics: [
      { label: 'Type', value: 'Risk Gate' },
      { label: 'Auth', value: 'Policy-Based' },
      { label: 'Override', value: 'Human Required' },
    ],
  },
  {
    id: 'observer',
    name: 'Observer Dashboard',
    description: 'Institutional-grade read-only transparency dashboard. Treasury balances, governance role assignments, risk metrics, and real-time protocol health indicators.',
    href: '/observer',
    status: 'LIVE',
    metrics: [
      { label: 'Access', value: 'Public' },
      { label: 'Mode', value: 'Read-Only' },
      { label: 'Data', value: 'On-Chain Live' },
    ],
  },
  {
    id: 'deal-intelligence',
    name: 'Deal Intelligence',
    description: 'AI-powered underwriting workspace for real estate deal analysis. Multi-exit strategy engine with 8 scenarios, cost intelligence, and acquisition memo builder.',
    href: '/deal-intelligence',
    status: 'LIVE',
    metrics: [
      { label: 'Exits', value: '8 Strategies' },
      { label: 'AI Memo', value: 'Gemini-Powered' },
      { label: 'Cost Engine', value: 'Craftsman NCE' },
    ],
  },
  {
    id: 're',
    name: 'RE Intelligence',
    description: 'Allocator-grade real estate underwriting intelligence including IVCEE scoring, market comparables, and property-level risk analytics powered by RentCast data.',
    href: '/re',
    status: 'LIVE',
    metrics: [
      { label: 'Source', value: 'RentCast + AI' },
      { label: 'Output', value: 'IVCEE Score' },
      { label: 'Mode', value: 'Underwriting' },
    ],
  },
];

const LAYER_5 = [
  {
    id: 'wealth-practice',
    name: 'The Wealth Practice',
    description: 'Structured community savings groups with a three-stage trust pipeline: Interest Hub → Purpose Group → On-Chain Pool. Deterministic contribution cycles with on-chain audit trails.',
    href: '/wealth-practice',
    status: 'FORMING',
    metrics: [
      { label: 'Pipeline', value: '3-Stage Trust' },
      { label: 'Hubs', value: '10 Seeded' },
      { label: 'Custody', value: 'Pooled + Self' },
    ],
  },
  {
    id: 'land',
    name: 'Land Acquisition Pipeline',
    description: 'Six-stage land acquisition lifecycle from submission through community pooling, governance vote, and SEC Reg CF targeted crowdfunding infrastructure.',
    href: '/land',
    status: 'PLANNED',
    metrics: [
      { label: 'Lifecycle', value: '6 Stages' },
      { label: 'Framework', value: 'Reg CF Targeted' },
      { label: 'Governance', value: 'On-Chain Vote' },
    ],
  },
  {
    id: 'property',
    name: 'Property Analysis',
    description: 'Pay-per-report property analysis tool. Valuation estimates, rent comp analysis, market data, and investment scoring with printable institutional report output.',
    href: '/property',
    status: 'LIVE',
    metrics: [
      { label: 'Pricing', value: 'Pay-Per-Report' },
      { label: 'Data', value: 'RentCast + Walk Score' },
      { label: 'Output', value: 'PDF Report' },
    ],
  },
  {
    id: 'distressed-feed',
    name: 'Deal Flow',
    description: 'Aggregated distressed property feed with AI-powered scoring, condition estimates, and direct handoff to Deal Intelligence for full underwriting analysis.',
    href: '/distressed-feed',
    status: 'LIVE',
    metrics: [
      { label: 'Source', value: 'Distressed Feed' },
      { label: 'Scoring', value: 'AI-Powered' },
      { label: 'Integration', value: 'Deal Intelligence' },
    ],
  },
];

function StatusChip({ status }: { status: string }) {
  const cls: Record<string, string> = {
    LIVE: 'text-dl-forest border-dl-forest/30 bg-dl-forest/5',
    FORMATION: 'text-dl-gold border-dl-gold/30 bg-dl-gold/5',
    FORMING: 'text-dl-gold border-dl-gold/30 bg-dl-gold/5',
    ACTIVE: 'text-dl-navy border-dl-navy/30 bg-dl-navy/5',
    PLANNED: 'text-dl-gray border-dl-border',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-dl-mono uppercase border ${cls[status] ?? 'text-dl-gray border-dl-border'}`}>
      {status}
    </span>
  );
}

function ProductCard({ product, dark = false }: { product: typeof LAYER_3[0]; dark?: boolean }) {
  return (
    <Link href={product.href} className="block no-underline">
      <div className={`border border-dl-border p-5 grid grid-cols-1 md:grid-cols-2 gap-5 items-start ${dark ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-dl-serif text-lg text-dl-navy">{product.name}</h3>
            <StatusChip status={product.status} />
          </div>
          <p className="text-sm text-dl-gray leading-relaxed mb-4">{product.description}</p>
          <span className="inline-block px-4 py-2 text-xs font-medium bg-dl-navy text-white">
            View Details
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {product.metrics.map((m, idx) => (
            <div key={idx} className="border border-dl-border p-3 text-center">
              <p className="text-xs text-dl-gray mb-1">{m.label}</p>
              <p className="font-dl-mono text-xs font-medium text-dl-navy">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function ProductsPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Protocol Infrastructure | Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol — a five-layer financial operating system delivering reserve capital, settlement infrastructure, asset deployment, capital intelligence, and community access." />
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-forest uppercase tracking-widest mb-4 font-dl-mono">Protocol Infrastructure</p>
        <h1 className="font-dl-serif text-2xl sm:text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          A Five-Layer Financial Operating System
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          Every component of Axiom Protocol is purpose-built, independently verifiable on Arbitrum One,
          and positioned within a clear hierarchy — from reserve and settlement infrastructure through
          capital programs, intelligence tools, and community access.
        </p>
      </div>

      {/* LAYER 01 — RESERVE */}
      <section className="mb-12">
        <div className="mb-1">
          <SectionHeading>{LAYER_1.label}</SectionHeading>
        </div>
        <p className="text-dl-gray text-sm mb-5">The foundational reserve unit. Gold-backed. Identity-gated. Live on Arbitrum One.</p>
        <Link href={LAYER_1.href} className="block no-underline">
          <div className="border border-dl-border border-l-4 border-l-dl-gold p-6 bg-dl-bg-alt">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-dl-serif text-2xl text-dl-navy">{LAYER_1.heading}</h2>
              <StatusChip status={LAYER_1.status} />
            </div>
            <p className="text-sm text-dl-gray mb-5 max-w-2xl leading-relaxed">{LAYER_1.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {LAYER_1.metrics.map((m, idx) => (
                <div key={idx} className="border border-dl-border p-3 text-center bg-dl-bg">
                  <p className="text-xs text-dl-gray mb-1">{m.label}</p>
                  <p className="font-dl-mono text-sm font-medium text-dl-navy">{m.value}</p>
                </div>
              ))}
            </div>
            <span className="inline-block px-5 py-2.5 text-sm font-medium bg-dl-navy text-white">
              AXAU Reserve →
            </span>
          </div>
        </Link>
      </section>

      {/* LAYER 02 — SETTLEMENT */}
      <section className="mb-12">
        <div className="mb-1">
          <SectionHeading>Layer 02 — Settlement</SectionHeading>
        </div>
        <p className="text-dl-gray text-sm mb-5">Identity-gated stablecoin and on-chain liquidity infrastructure.</p>
        <div className="space-y-4">
          {LAYER_2.map((product, i) => <ProductCard key={product.id} product={product} dark={i % 2 === 1} />)}
        </div>
      </section>

      {/* LAYER 03 — ASSET DEPLOYMENT */}
      <section className="mb-12">
        <div className="mb-1">
          <SectionHeading>Layer 03 — Asset Deployment</SectionHeading>
        </div>
        <p className="text-dl-gray text-sm mb-5">Structured capital formation, lending, syndication, and physical infrastructure deployment.</p>
        <div className="space-y-4">
          {LAYER_3.map((product, i) => <ProductCard key={product.id} product={product} dark={i % 2 === 1} />)}
        </div>
      </section>

      {/* LAYER 04 — CAPITAL INTELLIGENCE */}
      <section className="mb-12">
        <div className="mb-1">
          <SectionHeading>Layer 04 — Capital Intelligence</SectionHeading>
        </div>
        <p className="text-dl-gray text-sm mb-5">Regime analysis, risk authorization, institutional transparency, and deal intelligence.</p>
        <div className="space-y-4">
          {LAYER_4.map((product, i) => <ProductCard key={product.id} product={product} dark={i % 2 === 1} />)}
        </div>
      </section>

      {/* LAYER 05 — COMMUNITY ACCESS */}
      <section className="mb-12">
        <div className="mb-1">
          <SectionHeading>Layer 05 — Community Access</SectionHeading>
        </div>
        <p className="text-dl-gray text-sm mb-5">Group economics, land pipeline, property tools, and Main Street participant onboarding.</p>
        <div className="space-y-4">
          {LAYER_5.map((product, i) => <ProductCard key={product.id} product={product} dark={i % 2 === 1} />)}
        </div>
      </section>

      {/* TRUST + DISCLOSURE ANCHOR */}
      <section className="border border-dl-border border-t-4 border-t-dl-navy p-8">
        <h2 className="font-dl-serif text-xl text-dl-navy mb-3">
          Transparency and Governance
        </h2>
        <p className="text-sm text-dl-gray mb-6 max-w-2xl leading-relaxed">
          Every capital movement, governance decision, and operational action is recorded with a full on-chain audit trail.
          The solvency dashboard, observer, and proof-of-execution logs are publicly accessible for independent verification.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/disclosure" className="px-5 py-2.5 bg-dl-navy text-white text-sm font-medium no-underline">
            Institutional Disclosure
          </Link>
          <Link href="/solvency" className="px-5 py-2.5 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium no-underline">
            Solvency Console
          </Link>
          <Link href="/observer" className="px-5 py-2.5 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium no-underline">
            Observer Dashboard
          </Link>
          <Link href="/proof-of-execution" className="px-5 py-2.5 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium no-underline">
            Proof of Execution
          </Link>
        </div>
      </section>
    </DesignLawLayout>
  );
}
