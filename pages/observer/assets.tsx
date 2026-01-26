/**
 * Institutional Observer Dashboard - Assets Page
 * 
 * Asset registry, revenue attribution, and lifecycle actions.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { AssetsData } from '../../server/services/observer/types';

function NavTabs({ current }: { current: string }) {
  const tabs = [
    { name: 'Overview', href: '/observer' },
    { name: 'Treasury', href: '/observer/treasury' },
    { name: 'Governance', href: '/observer/governance' },
    { name: 'Risk', href: '/observer/risk' },
    { name: 'Assets', href: '/observer/assets' },
    { name: 'Reports', href: '/observer/reports' },
  ];

  return (
    <nav className="flex space-x-4 mb-8">
      {tabs.map((tab) => (
        <Link key={tab.name} href={tab.href}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab.name === current ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {tab.name}
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
    <>
      <Head>
        <title>Assets | Institutional Observer | Axiom Protocol</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
            <p className="mt-2 text-gray-600">Asset registry, revenue streams, and lifecycle tracking</p>
          </div>

          <NavTabs current="Assets" />

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : data ? (
            <>
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Asset Registry</h2>
                {data.registry.length === 0 ? (
                  <p className="text-gray-500">No assets registered</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.registry.map((asset) => (
                        <tr key={asset.id}>
                          <td className="px-4 py-3 text-sm font-mono">{asset.id}</td>
                          <td className="px-4 py-3 text-sm font-medium">{asset.name}</td>
                          <td className="px-4 py-3 text-sm capitalize">{asset.type.replace('_', ' ')}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded ${
                              asset.status === 'active' ? 'bg-green-100 text-green-800' :
                              asset.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {asset.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{asset.monthlyRevenue || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{asset.registeredAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Streams</h2>
                  {data.revenueStreams.length === 0 ? (
                    <p className="text-gray-500">No revenue streams configured</p>
                  ) : (
                    <div className="space-y-4">
                      {data.revenueStreams.map((stream) => (
                        <div key={stream.source} className="border-b pb-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{stream.source}</p>
                              <a
                                href={`https://arbiscan.io/address/${stream.sourceContract}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                {stream.sourceContract.slice(0, 10)}...
                              </a>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="text-gray-500">MTD</p>
                              <p className="font-medium">{stream.mtd}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">YTD</p>
                              <p className="font-medium">{stream.ytd}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Last Payment</p>
                              <p className="font-medium">{stream.lastPayment}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Lifecycle Actions</h2>
                  {data.lifecycleActions.length === 0 ? (
                    <p className="text-gray-500">No recent lifecycle actions</p>
                  ) : (
                    <div className="space-y-4">
                      {data.lifecycleActions.map((action, i) => (
                        <div key={i} className="flex justify-between items-center border-b pb-3">
                          <div>
                            <p className="font-medium">{action.assetName}</p>
                            <p className="text-sm text-gray-500 capitalize">{action.action}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{action.date}</p>
                            <a
                              href={`https://arbiscan.io/tx/${action.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600"
                            >
                              View Tx
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 text-center text-sm text-gray-500">
                Last updated: {data.lastUpdated}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
