import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  units: number;
  occupancy: number;
  monthlyRent: number;
  propertyValue: number;
  yield: number;
  status: string;
  nextDistribution: string;
}

interface Stats {
  totalPropertyValue: number;
  activeProperties: number;
  totalRentStreams: number;
  monthlyRentCollected: number;
  occupancyRate: number;
  averageYield: number;
  totalInvestors: number;
  totalDistributed: number;
}

interface Program {
  name: string;
  tagline: string;
  description: string;
  targetYield: string;
  minInvestment: number;
  status: string;
}

interface Distribution {
  month: string;
  amount: number;
  properties: number;
}

export default function RentStreamsPage() {
  const [program, setProgram] = useState<Program | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/rent-streams');
        if (res.ok) {
          const data = await res.json();
          setProgram(data.program);
          setStats(data.stats);
          setProperties(data.properties || []);
          setDistributions(data.distributions || []);
        }
      } catch (err) {
        console.error('Failed to load rent streams data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <>
      <Head>
        <title>Axiom Rent Streams | Tokenized Rental Income</title>
        <meta name="description" content="Invest in tokenized rental income from real properties. Receive monthly distributions from tenant rent payments." />
      </Head>

      <main style={{ background: '#ffffff', minHeight: '100vh' }}>
        <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              padding: '8px 16px', 
              borderRadius: 9999, 
              background: 'rgba(99, 102, 241, 0.2)', 
              border: '1px solid rgba(99, 102, 241, 0.4)',
              marginBottom: 24
            }}>
              <span style={{ color: '#818cf8', fontSize: 14, fontWeight: 500 }}>Passive Income | Real Property</span>
            </div>

            <h1 style={{ fontSize: 48, fontWeight: 700, color: '#ffffff', marginBottom: 16, lineHeight: 1.2 }}>
              Axiom Rent Streams
            </h1>
            <p style={{ fontSize: 20, color: '#9ca3af', maxWidth: 700, margin: '0 auto 24px' }}>
              {program?.tagline || 'Tokenized rental income from real properties'}
            </p>

            <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 36, fontWeight: 700, color: '#d4af37' }}>
                  {program?.targetYield || '6-9%'}
                </p>
                <p style={{ fontSize: 14, color: '#9ca3af' }}>Target Yield</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 36, fontWeight: 700, color: '#ffffff' }}>
                  {loading ? '...' : `${stats?.occupancyRate || 0}%`}
                </p>
                <p style={{ fontSize: 14, color: '#9ca3af' }}>Occupancy Rate</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 36, fontWeight: 700, color: '#ffffff' }}>
                  {loading ? '...' : stats?.activeProperties || 0}
                </p>
                <p style={{ fontSize: 14, color: '#9ca3af' }}>Properties</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/lending-fund/onboarding" style={{
                padding: '16px 32px',
                background: '#d4af37',
                color: '#111827',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 16
              }}>
                Invest in Rent Streams
              </Link>
              <Link href="/lending-fund/docs" style={{
                padding: '16px 32px',
                background: 'transparent',
                color: '#ffffff',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 16,
                border: '2px solid #4b5563'
              }}>
                View Properties
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, marginBottom: 48 }}>
              <StatCard label="Total Property Value" value={loading ? '...' : formatUSD(stats?.totalPropertyValue || 0)} />
              <StatCard label="Monthly Rent" value={loading ? '...' : formatUSD(stats?.monthlyRentCollected || 0)} />
              <StatCard label="Investors" value={loading ? '...' : String(stats?.totalInvestors || 0)} />
              <StatCard label="Total Distributed" value={loading ? '...' : formatUSD(stats?.totalDistributed || 0)} />
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>How Rent Streams Work</h2>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>
              Invest in tokenized rental income and receive monthly distributions from tenant payments.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              <FeatureCard 
                icon="🏢" 
                title="Real Properties" 
                description="Invest in income-producing properties professionally managed by Axiom Nexus partners."
              />
              <FeatureCard 
                icon="📅" 
                title="Monthly Income" 
                description="Receive your share of rent payments every month, settled in AXUSD stablecoin."
              />
              <FeatureCard 
                icon="📊" 
                title="Transparent Reporting" 
                description="Track occupancy, rent collection, and distributions in real-time on your dashboard."
              />
              <FeatureCard 
                icon="🔗" 
                title="On-Chain Settlement" 
                description="All distributions are recorded on-chain for complete transparency and auditability."
              />
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 24px', background: '#f8f9fa' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Active Properties</h2>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>
              Properties currently generating rental income for investors
            </p>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ color: '#6b7280' }}>Loading properties...</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {properties.map((property) => (
                  <div 
                    key={property.id} 
                    style={{
                      background: '#ffffff',
                      borderRadius: 12,
                      padding: 20,
                      border: selectedProperty === property.id ? '2px solid #d4af37' : '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setSelectedProperty(selectedProperty === property.id ? null : property.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{property.name}</h3>
                        <p style={{ fontSize: 13, color: '#6b7280' }}>{property.address}</p>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 500,
                        background: property.status === 'Performing' ? '#d1fae5' : '#fef3c7',
                        color: property.status === 'Performing' ? '#065f46' : '#92400e'
                      }}>
                        {property.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>Type</p>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{property.type}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>Units</p>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{property.units}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>Occupancy</p>
                        <p style={{ fontSize: 14, fontWeight: 500, color: property.occupancy === 100 ? '#065f46' : '#92400e' }}>
                          {property.occupancy}%
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                      <div>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>Monthly Rent</p>
                        <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{formatUSD(property.monthlyRent)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>Yield</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: '#d4af37' }}>{property.yield}%</p>
                      </div>
                    </div>

                    {selectedProperty === property.id && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <p style={{ fontSize: 11, color: '#9ca3af' }}>Property Value</p>
                            <p style={{ fontSize: 14, fontWeight: 500 }}>{formatUSD(property.propertyValue)}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: '#9ca3af' }}>Next Distribution</p>
                            <p style={{ fontSize: 14, fontWeight: 500 }}>{property.nextDistribution}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section style={{ padding: '64px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Distribution History</h2>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>Recent monthly distributions to investors</p>

            <div style={{ 
              display: 'flex', 
              gap: 16, 
              overflowX: 'auto', 
              paddingBottom: 16 
            }}>
              {distributions.map((dist) => (
                <div key={dist.month} style={{
                  minWidth: 140,
                  background: '#f8f9fa',
                  borderRadius: 12,
                  padding: 20,
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{dist.month}</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{formatUSD(dist.amount)}</p>
                  <p style={{ fontSize: 12, color: '#9ca3af' }}>{dist.properties} properties</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '64px 24px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>Start Earning Rental Income</h2>
            <p style={{ color: '#9ca3af', marginBottom: 32 }}>
              Join {stats?.totalInvestors || 0} investors earning passive income from real properties.
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
                Invest Now
              </Link>
              <Link href="/dscr/investor" style={{
                padding: '16px 32px',
                background: 'transparent',
                color: '#ffffff',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none',
                border: '2px solid #4b5563'
              }}>
                Investor Portal
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: 12,
      padding: 20,
      textAlign: 'center'
    }}>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{value}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: 12,
      padding: 24,
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}
