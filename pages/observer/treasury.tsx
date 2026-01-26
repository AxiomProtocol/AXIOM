/**
 * Institutional Observer Dashboard - Treasury Page
 * 
 * Detailed treasury operations and projections.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { TreasuryData } from '../../server/services/observer/types';

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
        <Link
          key={tab.name}
          href={tab.href}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab.name === current
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {tab.name}
        </Link>
      ))}
    </nav>
  );
}

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
    <>
      <Head>
        <title>Treasury | Institutional Observer | Axiom Protocol</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Treasury</h1>
            <p className="mt-2 text-gray-600">Bucket balances, routing rules, and draw schedules</p>
          </div>

          <NavTabs current="Treasury" />

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {Object.entries(data.buckets).map(([bucket, value]) => (
                  <div key={bucket} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide capitalize">{bucket}</h3>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Routing Rules</h2>
                  <div className="space-y-4">
                    {data.routingRules.map((rule) => (
                      <div key={rule.bucket} className="flex justify-between items-center border-b pb-3">
                        <div>
                          <p className="font-medium capitalize">{rule.bucket}</p>
                          <p className="text-sm text-gray-500">Min Reserve: {rule.minReserve}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{rule.allocationPercent}%</p>
                          <p className="text-sm text-gray-500">Priority {rule.priority}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Draw Schedule</h2>
                  {data.drawSchedule.length === 0 ? (
                    <p className="text-gray-500">No scheduled draws</p>
                  ) : (
                    <div className="space-y-3">
                      {data.drawSchedule.map((draw, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{draw.purpose}</p>
                            <p className="text-sm text-gray-500">{draw.date}</p>
                          </div>
                          <span className="font-medium">{draw.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Event History</h2>
                {data.events.length === 0 ? (
                  <p className="text-gray-500">No recent treasury events</p>
                ) : (
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
                      {data.events.map((event) => (
                        <tr key={event.id}>
                          <td className="px-4 py-3 text-sm capitalize">{event.type}</td>
                          <td className="px-4 py-3 text-sm">{event.amount}</td>
                          <td className="px-4 py-3 text-sm">{event.bucket || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{event.timestamp}</td>
                          <td className="px-4 py-3 text-sm">
                            <a href={`https://arbiscan.io/tx/${event.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                              {event.txHash.slice(0, 8)}...
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
