/**
 * Institutional Observer Dashboard - Risk Page
 * 
 * Exposure limits, concentration, and red flags.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { RiskData } from '../../server/services/observer/types';

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

function RiskGauge({ label, value, status }: { label: string; value: number; status: string }) {
  const colors = {
    safe: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</h3>
      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <span className="text-2xl font-bold">{value}%</span>
          <span className={`px-2 py-1 text-xs rounded ${
            status === 'safe' ? 'bg-green-100 text-green-800' :
            status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {status.toUpperCase()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full ${colors[status as keyof typeof colors] || colors.safe}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default function ObserverRisk() {
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/observer/risk');
        const result = await response.json();
        if (result.success) setData(result.data);
      } catch (err) {
        console.error('Failed to fetch risk data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <>
      <Head>
        <title>Risk | Institutional Observer | Axiom Protocol</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Risk</h1>
            <p className="mt-2 text-gray-600">Exposure limits, concentration analysis, and system alerts</p>
          </div>

          <NavTabs current="Risk" />

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : data ? (
            <>
              {data.circuitBreakerStatus.triggered && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-red-800 font-semibold">Circuit Breaker Triggered</h3>
                      <p className="text-red-700 text-sm mt-1">
                        Reason: {data.circuitBreakerStatus.reason || 'Unknown'}
                      </p>
                      <p className="text-red-600 text-xs mt-1">
                        Triggered at: {data.circuitBreakerStatus.triggeredAt}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {data.exposureMetrics.map((metric) => (
                  <RiskGauge
                    key={metric.name}
                    label={metric.name}
                    value={metric.utilization}
                    status={metric.status}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Exposure Details</h2>
                  <div className="space-y-4">
                    {data.exposureMetrics.map((metric) => (
                      <div key={metric.name} className="flex justify-between items-center border-b pb-3">
                        <div>
                          <p className="font-medium">{metric.name}</p>
                          <p className="text-sm text-gray-500">Limit: {metric.limit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{metric.current}</p>
                          <p className="text-sm text-gray-500">{metric.utilization}% utilized</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Concentration</h2>
                  {data.concentration.length === 0 ? (
                    <p className="text-gray-500">No concentration data available</p>
                  ) : (
                    <div className="space-y-4">
                      {data.concentration.map((entry) => (
                        <div key={entry.name} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{entry.name}</p>
                            <p className="text-sm text-gray-500 capitalize">{entry.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{entry.exposure}</p>
                            <p className="text-sm text-gray-500">{entry.percentOfTotal}% of total</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Red Flags Panel</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {data.redFlags.map((flag) => (
                    <div key={flag.id} className={`p-4 rounded-lg border ${
                      flag.status === 'ok' ? 'bg-green-50 border-green-200' :
                      flag.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">{flag.type.replace('_', ' ')}</span>
                        {flag.status === 'ok' ? (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm">{flag.message}</p>
                    </div>
                  ))}
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
