import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { ReportsData } from '../../server/services/observer/types';

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
  { id: 'reserve-performance', label: 'Reserve Performance', href: '/observer/reserve-performance' },
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
    <DesignLawLayout>
      <Head>
        <title>Reports | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Data exports and integrity verification" />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy">Reports</h1>
      <p className="text-dl-gray mt-1 mb-6">Data exports and integrity verification</p>

      <ObserverNav current="reports" />

      {loading ? (
        <p className="text-sm text-dl-gray font-dl-mono">Loading data...</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="border border-dl-border p-6">
              <SectionHeading>Export Data</SectionHeading>
              <p className="text-dl-gray mb-4">
                Download complete dashboard data for offline analysis or audit purposes.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleExport('json')}
                  disabled={exporting}
                  className="flex-1 px-4 py-3 bg-dl-navy text-white text-sm font-medium disabled:opacity-50"
                >
                  {exporting ? 'Exporting...' : 'Export JSON'}
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="flex-1 px-4 py-3 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium disabled:opacity-50"
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>

            <div className="border border-dl-border p-6">
              <SectionHeading>Data Integrity</SectionHeading>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-dl-gray">Data Hash</span>
                  <span className="font-dl-mono text-sm text-dl-gold">{data.integrity?.hash?.slice(0, 16) || 'N/A'}...</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dl-gray">Last Verified</span>
                  <span className="text-dl-navy">{data.integrity?.lastVerified || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dl-gray">Chain Block</span>
                  <span className="font-dl-mono text-dl-navy">{data.integrity?.blockNumber || 'N/A'}</span>
                </div>
                <div className={`flex items-center justify-center py-2 ${
                  data.integrity?.valid ? 'bg-dl-bg-alt text-dl-forest' : 'border border-dl-error text-dl-error'
                }`}>
                  {data.integrity?.valid ? (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-dl-mono text-sm">Integrity Verified</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="font-dl-mono text-sm">Integrity Check Failed</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Available Reports</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(data.availableReports || []).map((report) => (
                <div key={report.id} className="border border-dl-border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-dl-bg-alt text-dl-gold">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-dl-gray">{report.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-dl-gray font-dl-mono">Last generated: {report.lastGenerated}</span>
                    <span className={`px-2 py-1 text-xs font-dl-mono ${
                      report.status === 'available' ? 'bg-dl-bg-alt text-dl-forest' :
                      report.status === 'generating' ? 'bg-dl-bg-alt text-dl-gold' :
                      'bg-dl-bg-alt text-dl-gray'
                    }`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-dl-border p-6 mt-6">
            <SectionHeading>Audit Log</SectionHeading>
            {!data.auditLog || data.auditLog.length === 0 ? (
              <p className="text-dl-gray">No audit events</p>
            ) : (
              <div className="space-y-3">
                {(data.auditLog || []).map((entry, idx) => (
                  <div key={idx} className="flex items-start border-b border-dl-border pb-3">
                    <div className="p-2 bg-dl-bg-alt text-dl-gray">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{entry.action}</p>
                        <span className="text-xs text-dl-gray font-dl-mono">{entry.timestamp}</span>
                      </div>
                      <p className="text-sm text-dl-gray">{entry.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-dl-gray">Failed to load reports data</p>
      )}
    </DesignLawLayout>
  );
}
