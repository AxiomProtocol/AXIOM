import { useState, useEffect } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
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
    return <p className="text-sm text-dl-gray">No report data available.</p>;
  }

  const type = report.report_type;

  if (type === 'monthly_balance_sheet' || type.includes('balance')) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-dl-navy mb-2 pb-1 border-b border-dl-border">Assets</h4>
          {data.assets ? (
            Object.entries(data.assets).map(([key, val]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="text-sm text-dl-gray capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-dl-mono font-medium text-dl-navy">{formatMoney(val as any)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-dl-gray">No asset data</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-dl-navy mb-2 pb-1 border-b border-dl-border">Liabilities</h4>
          {data.liabilities ? (
            Object.entries(data.liabilities).map(([key, val]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="text-sm text-dl-gray capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-dl-mono font-medium text-dl-navy">{formatMoney(val as any)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-dl-gray">No liability data</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-dl-navy mb-2 pb-1 border-b border-dl-border">Equity</h4>
          {data.equity ? (
            Object.entries(data.equity).map(([key, val]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="text-sm text-dl-gray capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-dl-mono font-medium text-dl-navy">{formatMoney(val as any)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-dl-gray">No equity data</p>
          )}
        </div>
      </div>
    );
  }

  if (type === 'monthly_income_statement' || type.includes('income')) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-dl-navy mb-2 pb-1 border-b border-dl-border">Revenue</h4>
          {data.revenue ? (
            typeof data.revenue === 'object' ? (
              Object.entries(data.revenue).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="text-sm text-dl-gray capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-dl-mono font-medium text-dl-navy">{formatMoney(val as any)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-dl-mono font-medium text-dl-navy">{formatMoney(data.revenue)}</p>
            )
          ) : (
            <p className="text-sm text-dl-gray">No revenue data</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-dl-navy mb-2 pb-1 border-b border-dl-border">Expenses</h4>
          {data.expenses ? (
            typeof data.expenses === 'object' ? (
              Object.entries(data.expenses).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="text-sm text-dl-gray capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-dl-mono font-medium text-dl-navy">{formatMoney(val as any)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-dl-mono font-medium text-dl-navy">{formatMoney(data.expenses)}</p>
            )
          ) : (
            <p className="text-sm text-dl-gray">No expense data</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-dl-navy mb-2 pb-1 border-b border-dl-border">NOI</h4>
          <p className="text-lg font-dl-mono font-bold text-dl-navy">{formatMoney(data.noi)}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-dl-navy mb-2 pb-1 border-b border-dl-border">Net Income</h4>
          <p className="text-lg font-dl-mono font-bold text-dl-forest">{formatMoney(data.net_income)}</p>
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
              <div key={i} className="bg-dl-bg-alt p-4 border border-dl-border">
                <p className="text-sm font-semibold text-dl-navy capitalize mb-2">{(bucket.name || bucket.bucket_name || 'Bucket').replace(/_/g, ' ')}</p>
                <div className="flex justify-between py-1">
                  <span className="text-xs text-dl-gray">Current Balance</span>
                  <span className="text-sm font-dl-mono font-medium text-dl-navy">{formatMoney(bucket.current_balance || bucket.balance)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-xs text-dl-gray">Min Required</span>
                  <span className="text-sm font-dl-mono font-medium text-dl-navy">{formatMoney(bucket.min_required || bucket.min_reserve)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-xs text-dl-gray">Surplus / Deficit</span>
                  <span className={`text-sm font-dl-mono font-bold ${parseFloat(bucket.surplus || '0') >= 0 ? 'text-dl-forest' : 'text-dl-error'}`}>
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
                <span className="text-sm text-dl-gray capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-dl-mono font-medium text-dl-navy">{typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val))) ? formatMoney(val as any) : String(val)}</span>
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
          <span className="text-sm text-dl-gray capitalize">{key.replace(/_/g, ' ')}</span>
          <span className="text-sm font-dl-mono font-medium text-dl-navy">
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
    <DesignLawLayout>
      <Head>
        <title>Axiom Capital Program — Financial Reports</title>
      </Head>

      <div className="mb-6">
        <h1 className="font-dl-serif text-3xl text-dl-navy">Financial Reports</h1>
        <p className="text-sm text-dl-gray mt-1">Generate and review institutional-grade financial statements</p>
      </div>

      <PilotNav currentTab="reports" />

      <div className="border border-dl-border bg-dl-bg-alt p-5 mb-8">
        <p className="text-sm text-dl-gray leading-relaxed">Transparent reporting is the backbone of investor trust. Generate balance sheets, income statements, reserve reports, valuations, and risk assessments — all exportable for your records and compliance needs.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-dl-gray font-dl-mono">Loading reports...</p>
        </div>
      ) : error ? (
        <div className="border border-dl-error p-6">
          <p className="text-dl-error font-medium">Error</p>
          <p className="text-dl-gray text-sm mt-1">{error}</p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <SectionHeading className="mb-0 border-b-0 pb-0">Generate Report</SectionHeading>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-dl-navy text-white text-sm font-medium"
              >
                {showForm ? 'Cancel' : 'New Report'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleGenerate} className="border border-dl-border p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Report Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                    >
                      {REPORT_TYPES.map((rt) => (
                        <option key={rt.value} value={rt.value}>{rt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">SPV</label>
                    <select
                      value={formSpvId}
                      onChange={(e) => setFormSpvId(e.target.value)}
                      className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                    >
                      <option value="">All SPVs</option>
                      {spvs.map((spv) => (
                        <option key={spv.id} value={spv.id}>{spv.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Period Start</label>
                    <input
                      type="date"
                      value={formPeriodStart}
                      onChange={(e) => setFormPeriodStart(e.target.value)}
                      required
                      className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Period End</label>
                    <input
                      type="date"
                      value={formPeriodEnd}
                      onChange={(e) => setFormPeriodEnd(e.target.value)}
                      required
                      className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-dl-navy text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : 'Generate Report'}
                </button>
              </form>
            )}
          </div>

          <div className="border border-dl-border mb-8">
            <div className="px-6 py-4 border-b border-dl-border">
              <SectionHeading className="mb-0 border-b-0 pb-0">Reports History</SectionHeading>
            </div>
            {reports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-dl-border">
                  <thead className="bg-dl-bg-alt">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">SPV</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Generated</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Published</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report, i) => (
                      <tr key={report.id} className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                        <td className="px-4 py-3 text-sm text-dl-navy">{formatReportType(report.report_type)}</td>
                        <td className="px-4 py-3 text-sm text-dl-navy">{getSpvName(report.spv_id)}</td>
                        <td className="px-4 py-3 text-sm text-dl-navy">{formatDate(report.period_start)} - {formatDate(report.period_end)}</td>
                        <td className="px-4 py-3 text-sm text-dl-gray">{formatDate(report.created_at)}</td>
                        <td className="px-4 py-3 text-sm">
                          {report.published_at ? (
                            <span className="text-xs font-dl-mono text-dl-forest">
                              {formatDate(report.published_at)}
                            </span>
                          ) : (
                            <span className="text-xs font-dl-mono text-dl-gray">Draft</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setViewingReport(viewingReport?.id === report.id ? null : report)}
                              className="px-3 py-1 text-xs font-medium text-dl-navy border border-dl-border bg-dl-bg"
                            >
                              {viewingReport?.id === report.id ? 'Hide' : 'View'}
                            </button>
                            <button
                              onClick={() => downloadCsv(report.data, `report-${report.report_type}-${report.period_start}.csv`)}
                              className="px-3 py-1 text-xs font-medium text-dl-navy border border-dl-border bg-dl-bg"
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
              <div className="py-12 text-center bg-dl-bg-alt">
                <p className="text-dl-gray text-sm">No reports generated yet</p>
              </div>
            )}
          </div>

          {viewingReport && (
            <div className="border border-dl-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-dl-serif text-lg text-dl-navy">{formatReportType(viewingReport.report_type)}</h2>
                  <p className="text-sm text-dl-gray">{getSpvName(viewingReport.spv_id)} &middot; {formatDate(viewingReport.period_start)} - {formatDate(viewingReport.period_end)}</p>
                </div>
                <button
                  onClick={() => downloadCsv(viewingReport.data, `report-${viewingReport.report_type}-${viewingReport.period_start}.csv`)}
                  className="px-4 py-2 text-sm font-medium text-dl-navy border border-dl-border bg-dl-bg"
                >
                  Export CSV
                </button>
              </div>
              <ReportDataView report={viewingReport} />
            </div>
          )}
        </>
      )}
    </DesignLawLayout>
  );
}
