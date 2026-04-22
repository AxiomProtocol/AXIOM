import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

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

const statusStyles: Record<string, string> = {
  Planned: 'bg-dl-bg-alt text-dl-gray border-dl-border',
  InProgress: 'bg-dl-bg-alt text-dl-navy border-dl-border',
  Blocked: 'bg-dl-bg-alt text-dl-error border-dl-border',
  Done: 'bg-dl-bg-alt text-dl-forest border-dl-border',
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
      <DesignLawLayout>
        <Head>
          <title>Product Roadmap | Axiom Protocol</title>
        </Head>
        <div className="flex items-center justify-center py-24">
          <p className="text-dl-gray">Loading roadmap...</p>
        </div>
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>Product Roadmap | Axiom Protocol</title>
        <meta name="description" content="Explore the Axiom Protocol product roadmap and upcoming features" />
      </Head>

      <div className="text-center mb-12">
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-4">
          Product Roadmap
        </h1>
        <p className="text-lg text-dl-gray max-w-xl mx-auto">
          Our strategic vision for building real-world asset infrastructure on-chain
        </p>
        {roadmap?.updatedAt && (
          <p className="text-sm text-dl-gray font-dl-mono mt-3">
            Last updated: {new Date(roadmap.updatedAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        )}
      </div>

      <div className="flex gap-4 mb-8 flex-wrap justify-center">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3 px-4 pl-11 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dl-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex border border-dl-border">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 text-sm font-medium ${viewMode === 'timeline' ? 'bg-dl-navy text-white' : 'bg-dl-bg text-dl-navy'}`}
          >
            Timeline
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 text-sm font-medium ${viewMode === 'list' ? 'bg-dl-navy text-white' : 'bg-dl-bg text-dl-navy'}`}
          >
            List
          </button>
        </div>
      </div>

      {viewMode === 'timeline' ? (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-dl-border" />

          {filteredPhases.map((phase, phaseIndex) => (
            <div key={phase.id} className="relative mb-12 pl-16">
              <div className="absolute left-3 top-1 w-6 h-6 bg-dl-navy border-4 border-dl-bg flex items-center justify-center text-white text-xs font-dl-mono">
                {phaseIndex + 1}
              </div>

              <div className="bg-dl-bg-alt border border-dl-border p-6">
                <h2 className="font-dl-serif text-xl text-dl-navy mb-2">
                  {phase.name}
                </h2>
                <p className="text-dl-gray mb-6">{phase.summary}</p>

                <div className="space-y-4">
                  {getFilteredProducts(phase.products).map((product) => (
                    <div
                      key={product.id}
                      className="bg-dl-bg border border-dl-border p-4 cursor-pointer"
                      onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-dl-serif text-lg text-dl-navy">{product.name}</h3>
                          {product.milestones.length > 0 && product.milestones.every(m => m.status === 'Done') && (
                            <span className="px-2 py-0.5 text-xs font-dl-mono bg-dl-navy text-white uppercase">
                              LIVE
                            </span>
                          )}
                        </div>
                        <svg
                          className={`w-5 h-5 text-dl-gray ${expandedProduct === product.id ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <p className="text-dl-gray text-sm">{product.tagline}</p>

                      {expandedProduct === product.id && (
                        <div className="mt-4 pt-4 border-t border-dl-border">
                          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                            <div>
                              <h4 className="text-xs font-medium text-dl-gray uppercase mb-1">Strategic Value</h4>
                              <p className="text-sm text-dl-navy">{product.strategicValue}</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-dl-gray uppercase mb-1">Target Users</h4>
                              <p className="text-sm text-dl-navy">{product.targetUsers}</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-dl-gray uppercase mb-1">Revenue Model</h4>
                              <p className="text-sm text-dl-navy">{product.revenueModel}</p>
                            </div>
                          </div>

                          {product.milestones.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-xs font-medium text-dl-gray uppercase mb-3">Milestones</h4>
                              <div className="flex flex-col gap-2">
                                {product.milestones.map((milestone) => (
                                  <div key={milestone.id} className="flex items-center gap-3">
                                    <span className={`px-2 py-1 text-xs font-dl-mono border ${statusStyles[milestone.status] || 'bg-dl-bg-alt text-dl-gray border-dl-border'}`}>
                                      {milestone.status}
                                    </span>
                                    <span className="text-sm text-dl-navy">{milestone.name}</span>
                                    {milestone.targetDate && (
                                      <span className="text-xs text-dl-gray font-dl-mono">{milestone.targetDate}</span>
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
                              className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-dl-navy text-white text-sm font-medium no-underline"
                            >
                              View Product
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="space-y-6">
          {filteredPhases.flatMap(phase =>
            getFilteredProducts(phase.products).map(product => (
              <div
                key={product.id}
                className="bg-dl-bg-alt border border-dl-border p-6"
              >
                <div className="mb-2">
                  <span className="text-xs text-dl-navy font-dl-mono uppercase">
                    {phase.name}
                  </span>
                  <h3 className="font-dl-serif text-xl text-dl-navy mt-1">{product.name}</h3>
                </div>
                <p className="text-dl-gray mb-4">{product.tagline}</p>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-medium text-dl-gray mb-1">Target Users</h4>
                    <p className="text-sm text-dl-navy">{product.targetUsers}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-dl-gray mb-1">Revenue Model</h4>
                    <p className="text-sm text-dl-navy">{product.revenueModel}</p>
                  </div>
                </div>

                {product.milestones.length > 0 && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {product.milestones.map((m) => (
                      <span key={m.id} className={`px-2 py-1 text-xs font-dl-mono border ${statusStyles[m.status] || 'bg-dl-bg-alt text-dl-gray border-dl-border'}`}>
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

      <div className="mt-16 bg-dl-navy p-8 text-center">
        <h2 className="font-dl-serif text-2xl text-white mb-4">
          Ready to Build With Us?
        </h2>
        <p className="text-sm text-white/70 mb-8 max-w-lg mx-auto">
          Join the Axiom ecosystem and participate in building real-world asset infrastructure on-chain.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/axusd" className="px-7 py-3 bg-white/10 text-white text-sm font-medium border border-white/20 no-underline">
            Learn About AXUSD
          </Link>
          <Link href="/products" className="px-7 py-3 border border-white/30 text-white text-sm font-medium no-underline">
            Explore Products
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
