import { useState, useEffect } from 'react';
import Head from 'next/head';
import PilotNav from '../../components/pilot/PilotNav';

interface SpvOption {
  id: string;
  name: string;
}

interface Report {
  id: string;
  spv_id: string | null;
  report_type: string;
  period_start: string;
  period_end: string;
  data: any;
  generated_by: string;
  published_at: string | null;
  created_at: string;
}

const REPORT_TYPES = [
  { value: 'monthly_balance_sheet', label: 'Monthly Balance Sheet' },
  { value: 'monthly_income', label: 'Monthly Income Statement' },
  { value: 'monthly_reserves', label: 'Monthly Reserve Report' },
  { value: 'quarterly_valuation', label: 'Quarterly Valuation' },
  { value: 'quarterly_risk', label: 'Quarterly Risk Assessment' },
  { value: 'annual_summary', label: 'Annual Summary' },
];

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatReportType(type: string): string {
  const found = REPORT_TYPES.find((r) => r.value === type);
  if (found) return found.label;
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function jsonToCsv(data: any): string {
  if (!data || typeof data !== 'object') return '';
  const rows: string[] = [];

  function flatten(obj: any, prefix: string = '') {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => flatten(item, `${prefix}[${i}]`));
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, val]) => {
        flatten(val, prefix ? `${prefix}.${key}` : key);
      });
    } else {
      rows.push(`"${prefix}","${obj ?? ''}"`);
    }
  }

  rows.push('"Field","Value"');
  flatten(data);
  return rows.join('\n');
}

function downloadCsv(data: any, filename: string) {
  const csv = jsonToCsv(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportDataView({ report }: { report: Report }) {
  const data = report.data;
  if (!data || typeof data !== 'object') {
    return <p className="text-sm text-gray-400">No report data available.</p>;
  }

  const type = report.report_type;

  if (type === 'monthly_balance_sheet' || type.includes('balance')) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-200">Assets</h4>
          {data.assets ? (
            Object.entries(data.assets).map(([key, val]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-medium text-gray-900">{formatMoney(val as any)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No asset data</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-200">Liabilities</h4>
          {data.liabilities ? (
            Object.entries(data.liabilities).map(([key, val]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-medium text-gray-900">{formatMoney(val as any)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No liability data</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-200">Equity</h4>
          {data.equity ? (
            Object.entries(data.equity).map(([key, val]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-medium text-gray-900">{formatMoney(val as any)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No equity data</p>
          )}
        </div>
      </div>
    );
  }

  if (type === 'monthly_income_statement' || type.includes('income')) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-200">Revenue</h4>
          {data.revenue ? (
            typeof data.revenue === 'object' ? (
              Object.entries(data.revenue).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-gray-900">{formatMoney(val as any)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-medium text-gray-900">{formatMoney(data.revenue)}</p>
            )
          ) : (
            <p className="text-sm text-gray-400">No revenue data</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-200">Expenses</h4>
          {data.expenses ? (
            typeof data.expenses === 'object' ? (
              Object.entries(data.expenses).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-gray-900">{formatMoney(val as any)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-medium text-gray-900">{formatMoney(data.expenses)}</p>
            )
          ) : (
            <p className="text-sm text-gray-400">No expense data</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-200">NOI</h4>
          <p className="text-lg font-bold text-gray-900">{formatMoney(data.noi)}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-200">Net Income</h4>
          <p className="text-lg font-bold text-teal-700">{formatMoney(data.net_income)}</p>
        </div>
      </div>
    );
  }

  if (type === 'monthly_reserve_report' || type.includes('reserve')) {
    return (
      <div>
        {data.buckets && Array.isArray(data.buckets) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.buckets.map((bucket: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 capitalize mb-2">{(bucket.name || bucket.bucket_name || 'Bucket').replace(/_/g, ' ')}</p>
                <div className="flex justify-between py-1">
                  <span className="text-xs text-gray-500">Current Balance</span>
                  <span className="text-sm font-medium text-gray-900">{formatMoney(bucket.current_balance || bucket.balance)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-xs text-gray-500">Min Required</span>
                  <span className="text-sm font-medium text-gray-900">{formatMoney(bucket.min_required || bucket.min_reserve)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-xs text-gray-500">Surplus / Deficit</span>
                  <span className={`text-sm font-bold ${parseFloat(bucket.surplus || '0') >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatMoney(bucket.surplus ?? (parseFloat(bucket.current_balance || bucket.balance || '0') - parseFloat(bucket.min_required || bucket.min_reserve || '0')))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(data).map(([key, val]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-medium text-gray-900">{typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val))) ? formatMoney(val as any) : String(val)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="flex justify-between py-1">
          <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
          <span className="text-sm font-medium text-gray-900">
            {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-')}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [spvs, setSpvs] = useState<SpvOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  const [formType, setFormType] = useState('monthly_balance_sheet');
  const [formSpvId, setFormSpvId] = useState('');
  const [formPeriodStart, setFormPeriodStart] = useState('');
  const [formPeriodEnd, setFormPeriodEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [repRes, spvRes] = await Promise.all([
          fetch('/api/pilot/reports'),
          fetch('/api/pilot/spvs'),
        ]);
        const repResult = await repRes.json();
        const spvResult = await spvRes.json();
        if (repResult.success) setReports(repResult.data || []);
        else setError(repResult.error || 'Failed to load reports');
        if (spvResult.success) setSpvs(spvResult.data || []);
      } catch {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/pilot/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spvId: formSpvId || null,
          reportType: formType,
          periodStart: formPeriodStart,
          periodEnd: formPeriodEnd,
          data: {},
          generatedBy: 'admin',
        }),
      });
      const result = await res.json();
      if (result.success) {
        setReports((prev) => [result.data, ...prev]);
        setShowForm(false);
      } else {
        alert(result.error || 'Failed to generate report');
      }
    } catch {
      alert('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  }

  const getSpvName = (spvId: string | null) => {
    if (!spvId) return 'All SPVs';
    const spv = spvs.find((s) => s.id === spvId);
    return spv?.name || spvId;
  };

  return (
    <>
      <Head>
        <title>Axiom Economic Pilot — Financial Reports</title>
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
            <p className="text-gray-500 mt-1">Generate and review institutional-grade financial statements</p>
          </div>

          <PilotNav currentTab="reports" />

          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 rounded-xl p-5 mb-8">
            <p className="text-sm text-teal-800 leading-relaxed">Transparent reporting is the backbone of investor trust. Generate balance sheets, income statements, reserve reports, valuations, and risk assessments — all exportable for your records and compliance needs.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              <span className="ml-3 text-gray-500">Loading reports...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Generate Report</h2>
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    {showForm ? 'Cancel' : 'New Report'}
                  </button>
                </div>

                {showForm && (
                  <form onSubmit={handleGenerate} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                        <select
                          value={formType}
                          onChange={(e) => setFormType(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                          {REPORT_TYPES.map((rt) => (
                            <option key={rt.value} value={rt.value}>{rt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SPV</label>
                        <select
                          value={formSpvId}
                          onChange={(e) => setFormSpvId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value="">All SPVs</option>
                          {spvs.map((spv) => (
                            <option key={spv.id} value={spv.id}>{spv.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                        <input
                          type="date"
                          value={formPeriodStart}
                          onChange={(e) => setFormPeriodStart(e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                        <input
                          type="date"
                          value={formPeriodEnd}
                          onChange={(e) => setFormPeriodEnd(e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Generating...' : 'Generate Report'}
                    </button>
                  </form>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Reports History</h2>
                </div>
                {reports.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SPV</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Published</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reports.map((report) => (
                          <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-700">{formatReportType(report.report_type)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{getSpvName(report.spv_id)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{formatDate(report.period_start)} - {formatDate(report.period_end)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(report.created_at)}</td>
                            <td className="px-4 py-3 text-sm">
                              {report.published_at ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {formatDate(report.published_at)}
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Draft</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setViewingReport(viewingReport?.id === report.id ? null : report)}
                                  className="px-3 py-1 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                                >
                                  {viewingReport?.id === report.id ? 'Hide' : 'View'}
                                </button>
                                <button
                                  onClick={() => downloadCsv(report.data, `report-${report.report_type}-${report.period_start}.csv`)}
                                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  Export CSV
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-gray-400 text-sm">No reports generated yet</p>
                  </div>
                )}
              </div>

              {viewingReport && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{formatReportType(viewingReport.report_type)}</h2>
                      <p className="text-sm text-gray-500">{getSpvName(viewingReport.spv_id)} &middot; {formatDate(viewingReport.period_start)} - {formatDate(viewingReport.period_end)}</p>
                    </div>
                    <button
                      onClick={() => downloadCsv(viewingReport.data, `report-${viewingReport.report_type}-${viewingReport.period_start}.csv`)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Export CSV
                    </button>
                  </div>
                  <ReportDataView report={viewingReport} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
