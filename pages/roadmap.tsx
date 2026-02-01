import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Milestone {
  id: string;
  order: number;
  name: string;
  description: string;
  targetDate?: string;
  owner?: string;
  status: 'Planned' | 'InProgress' | 'Blocked' | 'Done';
}

interface Product {
  id: string;
  order: number;
  name: string;
  tagline: string;
  strategicValue: string;
  targetUsers: string;
  revenueModel: string;
  legalNotes: string;
  onchainModules: string;
  offchainModules: string;
  status: 'Draft' | 'Published';
  milestones: Milestone[];
}

interface Phase {
  id: string;
  order: number;
  name: string;
  summary: string;
  status: 'Draft' | 'Published';
  products: Product[];
}

interface Roadmap {
  version: string;
  updatedAt: string;
  phases: Phase[];
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  Planned: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
  InProgress: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  Blocked: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  Done: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' }
};

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const fetchRoadmap = async () => {
    try {
      const res = await fetch('/api/roadmap');
      const data = await res.json();
      if (data.success) {
        setRoadmap(data.roadmap);
      }
    } catch (error) {
      console.error('Failed to fetch roadmap:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPhases = roadmap?.phases?.filter(phase => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (phase.name.toLowerCase().includes(term)) return true;
    return phase.products.some(p => 
      p.name.toLowerCase().includes(term) || 
      p.tagline.toLowerCase().includes(term)
    );
  }) || [];

  const getFilteredProducts = (products: Product[]) => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.tagline.toLowerCase().includes(term)
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #e5e7eb', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Loading roadmap...</p>
        </div>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Product Roadmap | Axiom Protocol</title>
        <meta name="description" content="Explore the Axiom Protocol product roadmap and upcoming features" />
      </Head>

      <main style={{ minHeight: '100vh', background: '#ffffff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{ fontSize: 42, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
              Product Roadmap
            </h1>
            <p style={{ fontSize: 18, color: '#6b7280', maxWidth: 600, margin: '0 auto' }}>
              Our strategic vision for building real-world asset infrastructure on-chain
            </p>
            {roadmap?.updatedAt && (
              <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 12 }}>
                Last updated: {new Date(roadmap.updatedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 400 }}>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 16,
                  outline: 'none'
                }}
              />
              <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 4 }}>
              <button
                onClick={() => setViewMode('timeline')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  background: viewMode === 'timeline' ? '#ffffff' : 'transparent',
                  color: viewMode === 'timeline' ? '#111827' : '#6b7280',
                  boxShadow: viewMode === 'timeline' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  background: viewMode === 'list' ? '#ffffff' : 'transparent',
                  color: viewMode === 'list' ? '#111827' : '#6b7280',
                  boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                List
              </button>
            </div>
          </div>

          {viewMode === 'timeline' ? (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 24, top: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, #d4af37 0%, #b8860b 100%)' }} />
              
              {filteredPhases.map((phase, phaseIndex) => (
                <div key={phase.id} style={{ position: 'relative', marginBottom: 48, paddingLeft: 60 }}>
                  <div style={{
                    position: 'absolute',
                    left: 12,
                    top: 4,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#d4af37',
                    border: '4px solid #ffffff',
                    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    {phaseIndex + 1}
                  </div>

                  <div style={{
                    background: '#f8f9fa',
                    borderRadius: 16,
                    padding: 24,
                    border: '1px solid #e5e7eb'
                  }}>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                      {phase.name}
                    </h2>
                    <p style={{ color: '#6b7280', marginBottom: 24 }}>{phase.summary}</p>

                    <div style={{ display: 'grid', gap: 16 }}>
                      {getFilteredProducts(phase.products).map((product) => (
                        <div
                          key={product.id}
                          style={{
                            background: '#ffffff',
                            borderRadius: 12,
                            padding: 20,
                            border: '1px solid #e5e7eb',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{product.name}</h3>
                              {product.milestones.length > 0 && product.milestones.every(m => m.status === 'Done') && (
                                <span style={{
                                  padding: '3px 10px',
                                  borderRadius: 9999,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  animation: 'pulse 2s infinite'
                                }}>
                                  LIVE
                                </span>
                              )}
                            </div>
                            <svg 
                              style={{ 
                                width: 20, 
                                height: 20, 
                                color: '#9ca3af',
                                transform: expandedProduct === product.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                              }} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <p style={{ color: '#6b7280', fontSize: 15 }}>{product.tagline}</p>

                          {expandedProduct === product.id && (
                            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                                <div>
                                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' }}>Strategic Value</h4>
                                  <p style={{ fontSize: 14, color: '#374151' }}>{product.strategicValue}</p>
                                </div>
                                <div>
                                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' }}>Target Users</h4>
                                  <p style={{ fontSize: 14, color: '#374151' }}>{product.targetUsers}</p>
                                </div>
                                <div>
                                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' }}>Revenue Model</h4>
                                  <p style={{ fontSize: 14, color: '#374151' }}>{product.revenueModel}</p>
                                </div>
                              </div>

                              {product.milestones.length > 0 && (
                                <div style={{ marginTop: 20 }}>
                                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 12, textTransform: 'uppercase' }}>Milestones</h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {product.milestones.map((milestone) => (
                                      <div key={milestone.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{
                                          padding: '4px 10px',
                                          borderRadius: 9999,
                                          fontSize: 12,
                                          fontWeight: 500,
                                          background: statusColors[milestone.status]?.bg || '#f3f4f6',
                                          color: statusColors[milestone.status]?.text || '#6b7280',
                                          border: `1px solid ${statusColors[milestone.status]?.border || '#d1d5db'}`
                                        }}>
                                          {milestone.status}
                                        </span>
                                        <span style={{ fontSize: 14, color: '#374151' }}>{milestone.name}</span>
                                        {milestone.targetDate && (
                                          <span style={{ fontSize: 13, color: '#9ca3af' }}>{milestone.targetDate}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {product.milestones.length > 0 && product.milestones.every(m => m.status === 'Done') && (
                                <Link
                                  href={product.name.includes('Savings') ? '/savings' : product.name.includes('Mortgage') ? '/mortgage-notes' : product.name.includes('Rent') ? '/rent-streams' : product.name.includes('Land') ? '/land-funds' : product.name.includes('Builder') || product.name.includes('Farmer') ? '/builder-credit' : '/products'}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginTop: 20,
                                    padding: '10px 20px',
                                    background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                                    color: '#ffffff',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    fontSize: 14
                                  }}
                                >
                                  View Product
                                  <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24 }}>
              {filteredPhases.flatMap(phase => 
                getFilteredProducts(phase.products).map(product => (
                  <div
                    key={product.id}
                    style={{
                      background: '#f8f9fa',
                      borderRadius: 16,
                      padding: 24,
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 12, color: '#d4af37', fontWeight: 600, textTransform: 'uppercase' }}>
                          {phase.name}
                        </span>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 4 }}>{product.name}</h3>
                      </div>
                    </div>
                    <p style={{ color: '#6b7280', marginBottom: 16 }}>{product.tagline}</p>
                    
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <div>
                        <h4 style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>Target Users</h4>
                        <p style={{ fontSize: 14, color: '#374151' }}>{product.targetUsers}</p>
                      </div>
                      <div>
                        <h4 style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>Revenue Model</h4>
                        <p style={{ fontSize: 14, color: '#374151' }}>{product.revenueModel}</p>
                      </div>
                    </div>

                    {product.milestones.length > 0 && (
                      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {product.milestones.map((m) => (
                          <span key={m.id} style={{
                            padding: '4px 10px',
                            borderRadius: 9999,
                            fontSize: 12,
                            background: statusColors[m.status]?.bg,
                            color: statusColors[m.status]?.text,
                            border: `1px solid ${statusColors[m.status]?.border}`
                          }}>
                            {m.name}: {m.status}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <div style={{
            marginTop: 64,
            background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
            borderRadius: 20,
            padding: 48,
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>
              Ready to Build With Us?
            </h2>
            <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
              Join the Axiom ecosystem and participate in building real-world asset infrastructure on-chain.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/axusd" style={{
                padding: '14px 28px',
                background: '#d4af37',
                color: '#111827',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 16
              }}>
                Learn About AXUSD
              </Link>
              <Link href="/axiom-nexus" style={{
                padding: '14px 28px',
                background: 'transparent',
                color: '#ffffff',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 16,
                border: '1px solid #4b5563'
              }}>
                Explore Axiom Nexus
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
