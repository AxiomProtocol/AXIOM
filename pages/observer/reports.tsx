import React, { useState, useEffect } from 'react';
import { ObserverLayout, ObserverCard, ObserverLoading } from '../../components/observer/ObserverLayout';
import { ReportsData } from '../../server/services/observer/types';

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
    <ObserverLayout
      title="Reports"
      description="Data exports and integrity verification"
      currentTab="reports"
    >
      {loading ? (
        <ObserverLoading />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ObserverCard title="Export Data">
              <p className="text-gray-600 mb-4">
                Download complete dashboard data for offline analysis or audit purposes.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleExport('json')}
                  disabled={exporting}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {exporting ? 'Exporting...' : 'Export JSON'}
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </ObserverCard>

            <ObserverCard title="Data Integrity">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Data Hash</span>
                  <span className="font-mono text-sm text-amber-600">{data.integrity?.hash?.slice(0, 16) || 'N/A'}...</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Verified</span>
                  <span className="text-gray-900">{data.integrity?.lastVerified || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Chain Block</span>
                  <span className="font-mono text-gray-900">{data.integrity?.blockNumber || 'N/A'}</span>
                </div>
                <div className={`flex items-center justify-center py-2 rounded-xl ${
                  data.integrity?.valid ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
                }`}>
                  {data.integrity?.valid ? (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Integrity Verified
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Integrity Check Failed
                    </>
                  )}
                </div>
              </div>
            </ObserverCard>
          </div>

          <ObserverCard title="Available Reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(data.availableReports || []).map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-xl p-4 hover:border-amber-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-gray-500">{report.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Last generated: {report.lastGenerated}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      report.status === 'available' ? 'bg-teal-100 text-teal-800' :
                      report.status === 'generating' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ObserverCard>

          <ObserverCard title="Audit Log" className="mt-6">
            {!data.auditLog || data.auditLog.length === 0 ? (
              <p className="text-gray-500">No audit events</p>
            ) : (
              <div className="space-y-3">
                {(data.auditLog || []).map((entry, idx) => (
                  <div key={idx} className="flex items-start border-b border-gray-100 pb-3">
                    <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{entry.action}</p>
                        <span className="text-xs text-gray-500">{entry.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-600">{entry.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ObserverCard>
        </>
      ) : (
        <p className="text-gray-500">Failed to load reports data</p>
      )}
    </ObserverLayout>
  );
}
