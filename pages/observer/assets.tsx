import React, { useState, useEffect } from 'react';
import { ObserverLayout, ObserverCard, ObserverLoading, ProofLink } from '../../components/observer/ObserverLayout';
import { AssetsData } from '../../server/services/observer/types';

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
    <ObserverLayout
      title="Assets"
      description="Asset registry, revenue streams, and lifecycle tracking"
      currentTab="assets"
    >
      {loading ? (
        <ObserverLoading />
      ) : data ? (
        <>
          <ObserverCard title="Asset Registry" className="mb-6">
            {!data.registry || data.registry.length === 0 ? (
              <p className="text-gray-500">No assets registered</p>
            ) : (
              <div className="overflow-x-auto">
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
                    {(data.registry || []).map((asset) => (
                      <tr key={asset.id}>
                        <td className="px-4 py-3 text-sm font-mono">{asset.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{asset.name}</td>
                        <td className="px-4 py-3 text-sm capitalize">{asset.type.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded ${
                            asset.status === 'active' ? 'bg-teal-100 text-teal-800' :
                            asset.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {asset.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-amber-600">{asset.revenue}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{asset.registeredAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ObserverCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ObserverCard title="Revenue Attribution">
              <div className="space-y-3">
                {(data.revenueAttribution || []).map((item) => (
                  <div key={item.source} className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div>
                      <p className="font-medium">{item.source}</p>
                      <p className="text-sm text-gray-500">{item.assetCount} assets</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-600">{item.revenue}</p>
                      <p className="text-sm text-gray-500">{item.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </ObserverCard>

            <ObserverCard title="Asset Summary">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Total Assets</p>
                  <p className="text-2xl font-bold text-amber-600">{data.summary?.totalAssets || 0}</p>
                </div>
                <div className="bg-teal-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-teal-600">{data.summary?.activeAssets || 0}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-purple-600">{data.summary?.totalValue || '$0'}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{data.summary?.monthlyRevenue || '$0'}</p>
                </div>
              </div>
            </ObserverCard>
          </div>

          <ObserverCard title="Lifecycle Events">
            {!data.lifecycleEvents || data.lifecycleEvents.length === 0 ? (
              <p className="text-gray-500">No recent lifecycle events</p>
            ) : (
              <div className="space-y-3">
                {(data.lifecycleEvents || []).map((event, idx) => (
                  <div key={idx} className="flex items-start border-b border-gray-100 pb-3">
                    <div className={`p-2 rounded-lg ${
                      event.type === 'registration' ? 'bg-teal-100 text-teal-600' :
                      event.type === 'update' ? 'bg-amber-100 text-amber-600' :
                      event.type === 'deregistration' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{event.assetName}</p>
                          <p className="text-sm text-gray-600">{event.description}</p>
                        </div>
                        <span className="text-xs text-gray-500">{event.timestamp}</span>
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
          </ObserverCard>
        </>
      ) : (
        <p className="text-gray-500">Failed to load assets data</p>
      )}
    </ObserverLayout>
  );
}
