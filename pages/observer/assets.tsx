import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { ProofLink } from '../../components/observer/ObserverLayout';
import { AssetsData, AssetEntry, RevenueStream, LifecycleAction } from '../../server/services/observer/types';

const OBSERVER_TABS = [
  { id: 'overview', label: 'Overview', href: '/observer' },
  { id: 'treasury', label: 'Treasury', href: '/observer/treasury' },
  { id: 'governance', label: 'Governance', href: '/observer/governance' },
  { id: 'risk', label: 'Risk', href: '/observer/risk' },
  { id: 'assets', label: 'Assets', href: '/observer/assets' },
  { id: 'controls', label: 'Controls', href: '/observer/controls' },
  { id: 'reports', label: 'Reports', href: '/observer/reports' },
  { id: 'capital-bridge', label: 'Capital Bridge', href: '/observer/capital-bridge' },
  { id: 'node-economy', label: 'Node Economy', href: '/observer/node-economy' },
];

function ObserverNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-0 border-b border-dl-border mb-8">
      {OBSERVER_TABS.map(tab => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`px-4 py-2 text-sm ${tab.id === current ? 'border-b-2 border-dl-navy text-dl-navy font-medium' : 'text-dl-gray'}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export default function ObserverAssets() {
  const [data, setData] = useState<AssetsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/observer/assets');
        const result = await response.json();
        if (result.success) setData(result.data);
      } catch (err) {
        console.error('Failed to fetch assets data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <DesignLawLayout>
      <Head>
        <title>Assets | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Asset registry, revenue streams, and lifecycle tracking" />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy">Assets</h1>
      <p className="text-dl-gray mt-1 mb-6">Asset registry, revenue streams, and lifecycle tracking</p>

      <ObserverNav current="assets" />

      {loading ? (
        <p className="text-sm text-dl-gray font-dl-mono">Loading data...</p>
      ) : data ? (
        <>
          <div className="border border-dl-border p-6 mb-6">
            <SectionHeading>Asset Registry</SectionHeading>
            {!data.registry || data.registry.length === 0 ? (
              <p className="text-dl-gray">No assets registered</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dl-border">
                  <thead>
                    <tr className="bg-dl-bg-alt">
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">ID</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Name</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Type</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Status</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Revenue</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dl-border">
                    {(data.registry || []).map((asset: AssetEntry) => (
                      <tr key={asset.id}>
                        <td className="px-4 py-3 text-sm font-dl-mono">{asset.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{asset.name}</td>
                        <td className="px-4 py-3 text-sm capitalize">{asset.type.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-dl-mono ${
                            asset.status === 'active' ? 'bg-dl-bg-alt text-dl-forest' :
                            asset.status === 'pending' ? 'bg-dl-bg-alt text-dl-gold' :
                            'bg-dl-bg-alt text-dl-gray'
                          }`}>
                            {asset.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-dl-mono text-dl-gold">{asset.monthlyRevenue || '$0'}</td>
                        <td className="px-4 py-3 text-sm text-dl-gray">{asset.registeredAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="border border-dl-border p-6">
              <SectionHeading>Revenue Streams</SectionHeading>
              <div className="space-y-3">
                {(data.revenueStreams || []).map((item: RevenueStream) => (
                  <div key={item.source} className="flex justify-between items-center border-b border-dl-border pb-3">
                    <div>
                      <p className="font-medium">{item.source}</p>
                      <p className="text-sm text-dl-gray">Last payment: {item.lastPayment}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-dl-mono text-dl-gold">{item.mtd}</p>
                      <p className="text-sm text-dl-gray">YTD: {item.ytd}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-dl-border p-6">
              <SectionHeading>Asset Summary</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dl-bg-alt p-4">
                  <p className="text-sm text-dl-gray">Total Assets</p>
                  <p className="text-2xl font-dl-mono text-dl-gold">{data.registry?.length || 0}</p>
                </div>
                <div className="bg-dl-bg-alt p-4">
                  <p className="text-sm text-dl-gray">Active</p>
                  <p className="text-2xl font-dl-mono text-dl-forest">{data.registry?.filter((a: AssetEntry) => a.status === 'active').length || 0}</p>
                </div>
                <div className="bg-dl-bg-alt p-4">
                  <p className="text-sm text-dl-gray">Revenue Streams</p>
                  <p className="text-2xl font-dl-mono text-dl-navy">{data.revenueStreams?.length || 0}</p>
                </div>
                <div className="bg-dl-bg-alt p-4">
                  <p className="text-sm text-dl-gray">Lifecycle Events</p>
                  <p className="text-2xl font-dl-mono text-dl-navy">{data.lifecycleActions?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Lifecycle Events</SectionHeading>
            {!data.lifecycleActions || data.lifecycleActions.length === 0 ? (
              <p className="text-dl-gray">No recent lifecycle events</p>
            ) : (
              <div className="space-y-3">
                {(data.lifecycleActions || []).map((event: LifecycleAction, idx: number) => (
                  <div key={idx} className="flex items-start border-b border-dl-border pb-3">
                    <div className={`p-2 ${
                      event.action === 'acquire' ? 'bg-dl-bg-alt text-dl-forest' :
                      event.action === 'maintain' ? 'bg-dl-bg-alt text-dl-gold' :
                      event.action === 'deprecate' ? 'bg-dl-bg-alt text-dl-error' :
                      'bg-dl-bg-alt text-dl-gray'
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{event.assetName}</p>
                          <p className="text-sm text-dl-gray">{event.action}</p>
                        </div>
                        <span className="text-xs text-dl-gray font-dl-mono">{event.date}</span>
                      </div>
                      {event.txHash && (
                        <div className="mt-1">
                          <ProofLink type="tx" value={event.txHash} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-dl-gray">Failed to load assets data</p>
      )}
    </DesignLawLayout>
  );
}
