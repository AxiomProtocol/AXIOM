import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

interface ProductStats {
  mortgageNotes: { totalNotesValue: number; activeNotes: number; targetApy: string };
  savings: { totalDeposits: number; currentApy: number; depositors: number };
  rentStreams: { totalPropertyValue: number; occupancyRate: number; targetYield: string };
}

export default function ProductsPage() {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllStats() {
      try {
        const [notesRes, savingsRes, rentRes] = await Promise.all([
          fetch('/api/mortgage-notes'),
          fetch('/api/savings'),
          fetch('/api/rent-streams')
        ]);

        const notesData = notesRes.ok ? await notesRes.json() : null;
        const savingsData = savingsRes.ok ? await savingsRes.json() : null;
        const rentData = rentRes.ok ? await rentRes.json() : null;

        setStats({
          mortgageNotes: {
            totalNotesValue: notesData?.stats?.totalNotesValue || 0,
            activeNotes: notesData?.stats?.activeNotes || 0,
            targetApy: notesData?.fund?.targetApy || '10-14%'
          },
          savings: {
            totalDeposits: savingsData?.stats?.totalDeposits || 0,
            currentApy: savingsData?.vault?.currentApy || 0,
            depositors: savingsData?.stats?.totalDepositors || 0
          },
          rentStreams: {
            totalPropertyValue: rentData?.stats?.totalPropertyValue || 0,
            occupancyRate: rentData?.stats?.occupancyRate || 0,
            targetYield: rentData?.program?.targetYield || '6-9%'
          }
        });
      } catch (err) {
        console.error('Failed to load product stats');
      } finally {
        setLoading(false);
      }
    }
    fetchAllStats();
  }, []);

  const formatUSD = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const products = [
    {
      id: 'mortgage-notes',
      name: 'Axiom Mortgage Notes',
      tagline: 'Fractional ownership in performing real estate loans',
      description: 'Earn stable yields by investing in a diversified portfolio of property-backed mortgage notes.',
      href: '/mortgage-notes',
      icon: '📄',
      phase: 1,
      live: true,
      stats: [
        { label: 'Total Notes', value: loading ? '...' : formatUSD(stats?.mortgageNotes.totalNotesValue || 0) },
        { label: 'Active Notes', value: loading ? '...' : String(stats?.mortgageNotes.activeNotes || 0) },
        { label: 'Target APY', value: stats?.mortgageNotes.targetApy || '10-14%', highlight: true }
      ]
    },
    {
      id: 'savings',
      name: 'High Yield Savings',
      tagline: 'Earn competitive yields backed by real estate cash flows',
      description: 'Deposit into the savings vault and earn stable returns from real estate lending activities.',
      href: '/savings',
      icon: '💰',
      phase: 1,
      live: true,
      dark: true,
      stats: [
        { label: 'Total Deposits', value: loading ? '...' : formatUSD(stats?.savings.totalDeposits || 0) },
        { label: 'Depositors', value: loading ? '...' : String(stats?.savings.depositors || 0) },
        { label: 'Current APY', value: loading ? '...' : `${stats?.savings.currentApy || 0}%`, highlight: true }
      ]
    },
    {
      id: 'rent-streams',
      name: 'Axiom Rent Streams',
      tagline: 'Tokenized rental income from real properties',
      description: 'Invest in tokenized rental income and receive monthly distributions from tenant payments.',
      href: '/rent-streams',
      icon: '🏢',
      phase: 1,
      live: true,
      dark: true,
      stats: [
        { label: 'Property Value', value: loading ? '...' : formatUSD(stats?.rentStreams.totalPropertyValue || 0) },
        { label: 'Occupancy', value: loading ? '...' : `${stats?.rentStreams.occupancyRate || 0}%` },
        { label: 'Target Yield', value: stats?.rentStreams.targetYield || '6-9%', highlight: true }
      ]
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
      id: 'builder-credit',
      name: 'Builder & Farmer Credit',
      tagline: 'Working capital for land development and agriculture',
      description: 'Access financing to build, grow, and develop community land into productive assets.',
      href: '/builder-credit',
      icon: '🔨',
      phase: 2,
      dark: true,
      stats: [
        { label: 'Products', value: '5' },
        { label: 'Rates From', value: '8% APR' },
        { label: 'Max Credit', value: '$500K', highlight: true }
      ]
    }
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Investment Products | Axiom Protocol</title>
        <meta name="description" content="Explore Axiom's suite of real estate-backed investment products offering stable yields and transparent on-chain settlement." />
      </Head>

      <div className="text-center mb-12">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-2">Phase 1: Build the Balance Sheet</p>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-4">
          Investment Products
        </h1>
        <p className="text-lg text-dl-gray max-w-2xl mx-auto">
          Real estate-backed products offering stable yields with transparent on-chain settlement through AXUSD.
        </p>
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <SectionHeading>Phase 1: Build the Balance Sheet</SectionHeading>
          <span className="px-3 py-1 text-xs font-dl-mono bg-dl-navy text-white uppercase">LIVE</span>
        </div>
        <p className="text-dl-gray text-sm mb-6">Foundational capital products generating yield from real-world assets</p>

        <div className="space-y-6">
          {products.filter(p => p.phase === 1).map((product) => (
            <Link
              key={product.id}
              href={product.href}
              className="block no-underline"
            >
              <div className={`border border-dl-border p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center ${product.dark ? 'bg-dl-navy' : 'bg-dl-bg-alt'}`}>
                <div>
                  <div className="text-4xl mb-4">{product.icon}</div>
                  <h2 className={`font-dl-serif text-2xl mb-2 ${product.dark ? 'text-white' : 'text-dl-navy'}`}>
                    {product.name}
                  </h2>
                  <p className={`text-sm mb-4 leading-relaxed ${product.dark ? 'text-white/80' : 'text-dl-gray'}`}>
                    {product.description}
                  </p>
                  <span className={`inline-block px-4 py-2 text-sm font-medium ${product.dark ? 'bg-white/10 text-white border border-white/20' : 'bg-dl-navy text-white'}`}>
                    View Details →
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {product.stats.map((stat, idx) => (
                    <div key={idx} className={`border p-4 text-center ${product.dark ? 'border-white/20' : 'border-dl-border'}`}>
                      <p className={`text-xs mb-1 ${product.dark ? 'text-white/60' : 'text-dl-gray'}`}>
                        {stat.label}
                      </p>
                      <p className={`font-dl-mono text-lg font-medium ${stat.highlight ? 'text-dl-navy' : (product.dark ? 'text-white' : 'text-dl-navy')}`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <SectionHeading>Phase 2: Turn Capital Into Infrastructure</SectionHeading>
          <span className="px-3 py-1 text-xs font-dl-mono border border-dl-border text-dl-navy uppercase">NEW</span>
        </div>
        <p className="text-dl-gray text-sm mb-6">Deploy capital into land acquisition and community development</p>

        <div className="space-y-6">
          {products.filter(p => p.phase === 2).map((product) => (
            <Link
              key={product.id}
              href={product.href}
              className="block no-underline"
            >
              <div className="border border-dl-border p-6 bg-dl-navy grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                  <div className="text-4xl mb-4">{product.icon}</div>
                  <h2 className="font-dl-serif text-2xl text-white mb-2">
                    {product.name}
                  </h2>
                  <p className="text-sm text-white/80 mb-4 leading-relaxed">
                    {product.description}
                  </p>
                  <span className="inline-block px-4 py-2 bg-white/10 text-white text-sm font-medium border border-white/20">
                    View Details
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {product.stats.map((stat, idx) => (
                    <div key={idx} className="border border-white/20 p-4 text-center">
                      <p className="text-xs text-white/60 mb-1">
                        {stat.label}
                      </p>
                      <p className={`font-dl-mono text-lg font-medium ${stat.highlight ? 'text-white' : 'text-white'}`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-dl-bg-alt border border-dl-border p-8 text-center">
        <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">
          Ready to Invest?
        </h2>
        <p className="text-dl-gray mb-6">
          All products are available to accredited investors under SEC Reg D 506(c) compliance.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/lending-fund/invest" className="px-8 py-3 bg-dl-navy text-white text-sm font-medium no-underline">
            Start Investing
          </Link>
          <Link href="/roadmap" className="px-8 py-3 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium no-underline">
            View Full Roadmap
          </Link>
        </div>
      </section>
    </DesignLawLayout>
  );
}
