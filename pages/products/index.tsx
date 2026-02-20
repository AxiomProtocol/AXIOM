import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

export default function ProductsPage() {
  const liveProducts = [
    {
      id: 'capital-program',
      name: 'Axiom Capital Program',
      description: 'Structured capital formation program with dual-asset treasury allocation and 52-week operational playbook.',
      href: '/pilot',
      status: 'LIVE',
      metrics: [
        { label: 'Structure', value: 'Dual-Asset' },
        { label: 'Allocation', value: '35/35/20/10' },
        { label: 'Participants', value: '20-30 Target' },
      ],
    },
    {
      id: 'lending-fund',
      name: 'Real Estate Lending Fund',
      description: 'Fix and flip bridge loans and DSCR rental loans with ERC-4626 vaults, ERC-721 loan receipts, and governance-controlled risk parameters.',
      href: '/lending-fund',
      status: 'LIVE',
      metrics: [
        { label: 'Products', value: 'Fix & Flip + DSCR' },
        { label: 'Vault Standard', value: 'ERC-4626' },
        { label: 'Governance', value: 'On-Chain' },
      ],
    },
    {
      id: 'dex',
      name: 'Axiom Exchange',
      description: 'On-chain exchange infrastructure with Camelot DEX integration for AXM and AXUSD liquidity.',
      href: '/dex',
      status: 'LIVE',
      metrics: [
        { label: 'DEX', value: 'Camelot V2' },
        { label: 'Pairs', value: 'AXM / AXUSD' },
        { label: 'Network', value: 'Arbitrum One' },
      ],
    },
    {
      id: 'depin',
      name: 'DePIN Node Economy',
      description: 'Decentralized physical infrastructure nodes with ETH and AXM payment options, rewards distribution, and slashing engine.',
      href: '/depin/denet',
      status: 'LIVE',
      metrics: [
        { label: 'Payments', value: 'ETH + AXM' },
        { label: 'AXM Discount', value: '15%' },
        { label: 'Insurance', value: '5% Diversion' },
      ],
    },
  ];

  const communityProducts = [
    {
      id: 'wealth-practice',
      name: 'The Wealth Practice',
      description: 'Structured group savings framework with a three-stage trust pipeline: Interest Hub, Purpose Group, and On-Chain Pool.',
      href: '/wealth-practice',
      status: 'STAGED',
      metrics: [
        { label: 'Pipeline', value: '3-Stage Trust' },
        { label: 'Hubs', value: '10 Seeded' },
        { label: 'Custody', value: 'Pooled + Self' },
      ],
    },
    {
      id: 'land',
      name: 'Physical Asset Pipeline',
      description: 'Land acquisition lifecycle from submission through activation, with community pooling and SEC Reg CF compliant crowdfunding.',
      href: '/land',
      status: 'PLANNED',
      metrics: [
        { label: 'Lifecycle', value: '6 Stages' },
        { label: 'Crowdfunding', value: 'Reg CF' },
        { label: 'Credit', value: 'Builder + Farmer' },
      ],
    },
  ];

  const intelligenceProducts = [
    {
      id: 'mirdt',
      name: 'MIRDT',
      description: 'Market Intelligence and Risk Disclosure Terminal with probabilistic trend-following analysis and full audit trail.',
      href: '/mirdt',
      status: 'LIVE',
      metrics: [
        { label: 'Mode', value: 'Paper Trading' },
        { label: 'Sources', value: 'Equities + Digital' },
        { label: 'Gates', value: 'Human Confirm' },
      ],
    },
    {
      id: 'land-funds',
      name: 'Community Land Funds',
      tagline: 'Collective ownership of strategic land parcels',
      description: 'Pool resources with your community to participate in land acquisition through a structured coordination framework. SEC Reg CF compliant crowdfunding.',
      href: '/land-funds',
      icon: '🌍',
      phase: 2,
      dark: true,
      stats: [
        { label: 'Parcels', value: '4' },
        { label: 'Pipeline Acreage', value: 'In Framework' },
        { label: 'Status', value: 'Active', highlight: true }
      ]
    },
    {
      id: 'solvency',
      name: 'Solvency Console',
      description: 'Three-mode institutional solvency disclosure with Adaptive Metrics Engine, stress testing, and AI-powered oracle interpretation.',
      href: '/solvency',
      status: 'LIVE',
      metrics: [
        { label: 'Modes', value: '3 Institutional' },
        { label: 'Policy States', value: '6' },
        { label: 'Stress Tests', value: '6 Scenarios' },
      ],
    },
  ];

  const renderProductCard = (product: typeof liveProducts[0], dark: boolean = false) => (
    <Link
      key={product.id}
      href={product.href}
      className="block no-underline"
    >
      <div className={`border border-dl-border p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center ${dark ? 'bg-dl-navy' : 'bg-dl-bg-alt'}`}>
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className={`font-dl-serif text-2xl ${dark ? 'text-white' : 'text-dl-navy'}`}>
              {product.name}
            </h2>
            <span className={`px-2 py-0.5 text-xs font-dl-mono uppercase ${
              product.status === 'LIVE' 
                ? 'bg-dl-forest/10 text-dl-forest border border-dl-forest/30'
                : product.status === 'STAGED'
                ? 'bg-dl-gold/10 text-dl-gold border border-dl-gold/30'
                : 'border border-dl-border text-dl-gray'
            }`}>
              {product.status}
            </span>
          </div>
          <p className={`text-sm mb-4 leading-relaxed ${dark ? 'text-white/80' : 'text-dl-gray'}`}>
            {product.description}
          </p>
          <span className={`inline-block px-4 py-2 text-sm font-medium ${dark ? 'bg-white/10 text-white border border-white/20' : 'bg-dl-navy text-white'}`}>
            View Details
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {product.metrics.map((metric, idx) => (
            <div key={idx} className={`border p-4 text-center ${dark ? 'border-white/20' : 'border-dl-border'}`}>
              <p className={`text-xs mb-1 ${dark ? 'text-white/60' : 'text-dl-gray'}`}>
                {metric.label}
              </p>
              <p className={`font-dl-mono text-sm font-medium ${dark ? 'text-white' : 'text-dl-navy'}`}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );

  return (
    <DesignLawLayout>
      <Head>
        <title>All Products | Axiom Protocol</title>
        <meta name="description" content="Explore the full suite of Axiom Protocol products across capital formation, community economics, and market intelligence." />
      </Head>

      <div className="text-center mb-12">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-2">Axiom Protocol</p>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-4">
          All Products
        </h1>
        <p className="text-lg text-dl-gray max-w-2xl mx-auto">
          Governance-first wealth infrastructure across capital formation, community economics, and market intelligence.
        </p>
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <SectionHeading>Capital Products</SectionHeading>
        </div>
        <p className="text-dl-gray text-sm mb-6">Structured capital formation and lending infrastructure</p>
        <div className="space-y-6">
          {liveProducts.map((product, idx) => renderProductCard(product, idx % 2 === 1))}
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <SectionHeading>Community Economics</SectionHeading>
        </div>
        <p className="text-dl-gray text-sm mb-6">Group savings, land acquisition, and physical asset pipelines</p>
        <div className="space-y-6">
          {communityProducts.map((product, idx) => renderProductCard(product, idx % 2 === 1))}
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <SectionHeading>Intelligence and Risk</SectionHeading>
        </div>
        <p className="text-dl-gray text-sm mb-6">Market analysis, risk authorization, and solvency monitoring</p>
        <div className="space-y-6">
          {intelligenceProducts.map((product, idx) => renderProductCard(product, idx % 2 === 1))}
        </div>
      </section>

      <section className="bg-dl-bg-alt border border-dl-border p-8 text-center">
        <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">
          Explore the Protocol
        </h2>
        <p className="text-dl-gray mb-6">
          Learn more about the governance framework, treasury transparency, and institutional disclosure.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/disclosure" className="px-8 py-3 bg-dl-navy text-white text-sm font-medium no-underline">
            View Disclosure
          </Link>
          <Link href="/solvency" className="px-8 py-3 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium no-underline">
            Solvency Console
          </Link>
          <Link href="/observer" className="px-8 py-3 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium no-underline">
            Observer Dashboard
          </Link>
        </div>
      </section>
    </DesignLawLayout>
  );
}
