import React, { useState, useEffect } from 'react';
import { ObserverLayout, ObserverCard, ObserverLoading, ProofLink } from '../../components/observer/ObserverLayout';
import { TreasuryData, RoutingRule, DrawSchedule, TreasuryEvent } from '../../server/services/observer/types';

export default function ObserverTreasury() {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/observer/treasury');
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch treasury data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <ObserverLayout
      title="Treasury"
      description="Bucket balances, routing rules, and draw schedules"
      currentTab="treasury"
    >
      {loading ? (
        <ObserverLoading />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {data.buckets && Object.entries(data.buckets).map(([bucket, value]: [string, string]) => (
              <div key={bucket} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide capitalize">{bucket}</h3>
                <p className="mt-2 text-2xl font-bold text-amber-600">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ObserverCard title="Routing Rules">
              <div className="space-y-4">
                {(data.routingRules || []).map((rule: RoutingRule) => (
                  <div key={rule.bucket} className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div>
                      <p className="font-medium capitalize">{rule.bucket}</p>
                      <p className="text-sm text-gray-500">Min Reserve: {rule.minReserve}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-amber-600">{rule.allocationPercent}%</p>
                      <p className="text-sm text-gray-500">Allocation</p>
                    </div>
                  </div>
                ))}
              </div>
            </ObserverCard>

            <ObserverCard title="Draw Schedule">
              <div className="space-y-3">
                {(data.drawSchedule || []).map((draw: DrawSchedule, idx: number) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div>
                      <p className="font-medium">{draw.purpose}</p>
                      <p className="text-sm text-gray-500">{draw.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-teal-600">{draw.amount}</p>
                      <p className="text-sm text-gray-500">{draw.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ObserverCard>
          </div>

          <ObserverCard title="Recent Transactions">
            {!data.events || data.events.length === 0 ? (
              <p className="text-gray-500">No recent transactions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bucket</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(data.events || []).map((tx: TreasuryEvent) => (
                      <tr key={tx.txHash}>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded ${
                            tx.type === 'deposit' ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{tx.amount}</td>
                        <td className="px-4 py-3 text-sm capitalize">{tx.bucket || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{tx.timestamp}</td>
                        <td className="px-4 py-3 text-sm">
                          <ProofLink type="tx" value={tx.txHash} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ObserverCard>
        </>
      ) : (
        <p className="text-gray-500">Failed to load treasury data</p>
      )}
    </ObserverLayout>
  );
}
