/**
 * Institutional Observer Dashboard - Reports Page
 * 
 * Export options and integrity verification.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ReportsData } from '../../server/services/observer/types';

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

export default function ObserverReports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/observer/reports');
        const result = await response.json();
        if (result.success) setData(result.data);
      } catch (err) {
        console.error('Failed to fetch reports data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleExport(format: 'json' | 'csv') {
    setExporting(true);
    try {
      const response = await fetch(`/api/observer/export?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `axiom-observer-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Reports | Institutional Observer | Axiom Protocol</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="mt-2 text-gray-600">Data exports and integrity verification</p>
          </div>

          <NavTabs current="Reports" />

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h2>
                  <p className="text-gray-600 mb-6">
                    Download a complete snapshot of all observable data for auditing purposes.
                  </p>
                  <div className="space-y-4">
                    <button
                      onClick={() => handleExport('json')}
                      disabled={exporting}
                      className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export as JSON
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      disabled={exporting}
                      className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export as CSV
                    </button>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">
                        <strong>PDF Reports:</strong> Coming soon. Monthly summary reports will be available for token-gated access.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Integrity Checks</h2>
                  <p className="text-gray-600 mb-6">
                    Automated verification that on-chain data is consistent and complete.
                  </p>
                  <div className="space-y-4">
                    {data.integrityChecks.map((check) => (
                      <div key={check.name} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center">
                          {check.status === 'pass' ? (
                            <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : check.status === 'fail' ? (
                            <svg className="w-5 h-5 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-400 mr-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          <span className="font-medium">{check.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(check.lastRun).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Sources</h2>
                <div className="prose prose-sm max-w-none text-gray-600">
                  <p>
                    All data displayed in this dashboard is derived from on-chain state and events on Arbitrum One.
                    The following data sources are used:
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li>
                      <strong>Contract State:</strong> Direct RPC calls to read current balances, parameters, and configuration
                    </li>
                    <li>
                      <strong>Event Logs:</strong> Historical events from governance, treasury, and lending contracts
                    </li>
                    <li>
                      <strong>Block Data:</strong> Timestamps and block numbers for verification
                    </li>
                  </ul>
                  <p className="mt-4">
                    All proof links point to Arbiscan where the data can be independently verified.
                  </p>
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
