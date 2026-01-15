import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

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
      color: '#d4af37',
      bgGradient: 'linear-gradient(135deg, #f8f9fa 0%, #fff8e1 100%)',
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
      color: '#111827',
      bgGradient: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
      textColor: '#ffffff',
      icon: '💰',
      phase: 1,
      live: true,
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
      color: '#6366f1',
      bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      textColor: '#ffffff',
      icon: '🏢',
      phase: 1,
      live: true,
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
      description: 'Pool resources with your community to acquire land that builds generational wealth. SEC Reg CF compliant crowdfunding.',
      href: '/land-funds',
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
      textColor: '#ffffff',
      icon: '🌍',
      phase: 2,
      stats: [
        { label: 'Parcels', value: '4' },
        { label: 'Total Acreage', value: '480 acres' },
        { label: 'Status', value: 'Active', highlight: true }
      ]
    },
    {
      id: 'builder-credit',
      name: 'Builder & Farmer Credit',
      tagline: 'Working capital for land development and agriculture',
      description: 'Access financing to build, grow, and develop community land into productive assets.',
      href: '/builder-credit',
      color: '#3b82f6',
      bgGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
      textColor: '#ffffff',
      icon: '🔨',
      phase: 2,
      stats: [
        { label: 'Products', value: '5' },
        { label: 'Rates From', value: '8% APR' },
        { label: 'Max Credit', value: '$500K', highlight: true }
      ]
    }
  ];

  return (
    <>
      <Head>
        <title>Investment Products | Axiom Protocol</title>
        <meta name="description" content="Explore Axiom's suite of real estate-backed investment products offering stable yields and transparent on-chain settlement." />
      </Head>

      <main style={{ background: '#ffffff', minHeight: '100vh' }}>
        <section style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              padding: '8px 16px', 
              borderRadius: 9999, 
              background: 'rgba(212, 175, 55, 0.1)', 
              border: '1px solid rgba(212, 175, 55, 0.3)',
              marginBottom: 24
            }}>
              <span style={{ color: '#b8860b', fontSize: 14, fontWeight: 500 }}>Phase 1: Build the Balance Sheet</span>
            </div>

            <h1 style={{ fontSize: 48, fontWeight: 700, color: '#111827', marginBottom: 16, lineHeight: 1.2 }}>
              Investment Products
            </h1>
            <p style={{ fontSize: 20, color: '#6b7280', maxWidth: 700, margin: '0 auto 48px' }}>
              Real estate-backed products offering stable yields with transparent on-chain settlement through AXUSD.
            </p>
          </div>
        </section>

        <section style={{ padding: '0 24px 80px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Phase 1: Build the Balance Sheet</h2>
                <span style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff' }}>LIVE</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: 15 }}>Foundational capital products generating yield from real-world assets</p>
            </div>
            <div style={{ display: 'grid', gap: 32, marginBottom: 48 }}>
              {products.filter(p => p.phase === 1).map((product) => (
                <Link 
                  key={product.id} 
                  href={product.href}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: product.bgGradient,
                    borderRadius: 16,
                    padding: 32,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 32,
                    alignItems: 'center',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>{product.icon}</div>
                      <h2 style={{ 
                        fontSize: 28, 
                        fontWeight: 700, 
                        color: product.textColor || '#111827', 
                        marginBottom: 8 
                      }}>
                        {product.name}
                      </h2>
                      <p style={{ 
                        fontSize: 16, 
                        color: product.textColor ? 'rgba(255,255,255,0.8)' : '#6b7280',
                        marginBottom: 16,
                        lineHeight: 1.6
                      }}>
                        {product.description}
                      </p>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: product.color,
                        color: product.textColor ? '#111827' : '#ffffff',
                        fontWeight: 600,
                        fontSize: 14
                      }}>
                        View Details →
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: 16 
                    }}>
                      {product.stats.map((stat, idx) => (
                        <div key={idx} style={{
                          background: product.textColor ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.03)',
                          borderRadius: 12,
                          padding: 16,
                          textAlign: 'center'
                        }}>
                          <p style={{ 
                            fontSize: 12, 
                            color: product.textColor ? 'rgba(255,255,255,0.7)' : '#9ca3af',
                            marginBottom: 4
                          }}>
                            {stat.label}
                          </p>
                          <p style={{ 
                            fontSize: stat.highlight ? 24 : 20, 
                            fontWeight: 700, 
                            color: stat.highlight ? '#d4af37' : (product.textColor || '#111827')
                          }}>
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ marginBottom: 24, marginTop: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Phase 2: Turn Capital Into Infrastructure</h2>
                <span style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>NEW</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: 15 }}>Deploy capital into land acquisition and community development</p>
            </div>
            <div style={{ display: 'grid', gap: 32 }}>
              {products.filter(p => p.phase === 2).map((product) => (
                <Link 
                  key={product.id} 
                  href={product.href}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: product.bgGradient,
                    borderRadius: 16,
                    padding: 32,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 32,
                    alignItems: 'center',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>{product.icon}</div>
                      <h2 style={{ 
                        fontSize: 28, 
                        fontWeight: 700, 
                        color: product.textColor || '#111827', 
                        marginBottom: 8 
                      }}>
                        {product.name}
                      </h2>
                      <p style={{ 
                        fontSize: 16, 
                        color: product.textColor ? 'rgba(255,255,255,0.8)' : '#6b7280',
                        marginBottom: 16,
                        lineHeight: 1.6
                      }}>
                        {product.description}
                      </p>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: product.color,
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: 14
                      }}>
                        View Details
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: 16 
                    }}>
                      {product.stats.map((stat, idx) => (
                        <div key={idx} style={{
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: 12,
                          padding: 16,
                          textAlign: 'center'
                        }}>
                          <p style={{ 
                            fontSize: 12, 
                            color: 'rgba(255,255,255,0.7)',
                            marginBottom: 4
                          }}>
                            {stat.label}
                          </p>
                          <p style={{ 
                            fontSize: stat.highlight ? 24 : 20, 
                            fontWeight: 700, 
                            color: stat.highlight ? '#d4af37' : '#ffffff'
                          }}>
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 24px', background: '#f8f9fa' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
              Ready to Invest?
            </h2>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>
              All products are available to accredited investors under SEC Reg D 506(c) compliance.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/lending-fund/onboarding" style={{
                padding: '16px 32px',
                background: '#d4af37',
                color: '#111827',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                Start Investing
              </Link>
              <Link href="/roadmap" style={{
                padding: '16px 32px',
                background: '#111827',
                color: '#ffffff',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                View Full Roadmap
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
