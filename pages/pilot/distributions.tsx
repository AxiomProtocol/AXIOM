import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import PilotNav from '../../components/pilot/PilotNav';

interface SpvOption {
  id: string;
  name: string;
}

interface Distribution {
  id: string;
  spv_id: string | null;
  period_start: string;
  period_end: string;
  gross_revenue: string;
  operating_expenses: string;
  net_income: string;
  distribution_amount: string;
  reserve_amount: string;
  growth_amount: string;
  operating_buffer_amount: string;
  distribution_type: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface InvestorBreakdown {
  investor_id: string;
  investor_name: string;
  pro_rata_share: string;
  distribution_amount: string;
  status: string;
}

interface DistributionDetail extends Distribution {
  investorBreakdown?: InvestorBreakdown[];
}

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function DistributionsPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [spvs, setSpvs] = useState<SpvOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DistributionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formSpvId, setFormSpvId] = useState('');
  const [formGrossRevenue, setFormGrossRevenue] = useState('');
  const [formOperatingExpenses, setFormOperatingExpenses] = useState('');
  const [formPeriodStart, setFormPeriodStart] = useState('');
  const [formPeriodEnd, setFormPeriodEnd] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const splitPreview = useMemo(() => {
    const gross = parseFloat(formGrossRevenue) || 0;
    const expenses = parseFloat(formOperatingExpenses) || 0;
    const net = gross - expenses;
    if (net <= 0) return { net: 0, distribution: 0, reserve: 0, growth: 0, buffer: 0 };
    return {
      net,
      distribution: net * 0.35,
      reserve: net * 0.35,
      growth: net * 0.20,
      buffer: net * 0.10,
    };
  }, [formGrossRevenue, formOperatingExpenses]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [distRes, spvRes] = await Promise.all([
          fetch('/api/pilot/distributions'),
          fetch('/api/pilot/spvs'),
        ]);
        const distResult = await distRes.json();
        const spvResult = await spvRes.json();
        if (distResult.success) setDistributions(distResult.data || []);
        else setError(distResult.error || 'Failed to load distributions');
        if (spvResult.success) setSpvs(spvResult.data || []);
      } catch {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/pilot/distributions/${id}`);
      const result = await res.json();
      if (result.success) setDetail(result.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/pilot/distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spvId: formSpvId || null,
          periodStart: formPeriodStart,
          periodEnd: formPeriodEnd,
          grossRevenue: formGrossRevenue,
          operatingExpenses: formOperatingExpenses,
          notes: formNotes || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setDistributions((prev) => [result.data, ...prev]);
        setShowForm(false);
        setFormSpvId('');
        setFormGrossRevenue('');
        setFormOperatingExpenses('');
        setFormPeriodStart('');
        setFormPeriodEnd('');
        setFormNotes('');
      } else {
        alert(result.error || 'Failed to create distribution');
      }
    } catch {
      alert('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  }

  const totalDistributed = distributions
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + parseFloat(d.distribution_amount || '0'), 0);

  const latestNetIncome = distributions.length > 0 ? parseFloat(distributions[0].net_income || '0') : 0;

  const totalReserves = distributions.reduce((sum, d) => sum + parseFloat(d.reserve_amount || '0'), 0);

  const getSpvName = (spvId: string | null) => {
    if (!spvId) return 'All SPVs';
    const spv = spvs.find((s) => s.id === spvId);
    return spv?.name || spvId;
  };

  return (
    <>
      <Head>
        <title>Axiom Capital Program — Income & Distributions</title>
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Income & Distributions</h1>
            <p className="text-gray-500 mt-1">Calculate and track how property income flows to investors</p>
          </div>

          <PilotNav currentTab="distributions" />

          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 rounded-xl p-5 mb-8">
            <p className="text-sm text-teal-800 leading-relaxed">Every dollar of property income follows our 35/35/20/10 treasury policy: 35% distributed to investors, 35% held in reserves, 20% allocated for growth, and 10% kept as an operating buffer. This disciplined approach protects capital while delivering consistent returns.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              <span className="ml-3 text-gray-500">Loading distributions...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Distributions Paid" value={formatMoney(totalDistributed)} subtitle={`${distributions.filter((d) => d.status === 'paid').length} distributions`} />
                <StatCard label="Current Period Net Income" value={formatMoney(latestNetIncome)} subtitle={distributions.length > 0 ? `Period ending ${formatDate(distributions[0].period_end)}` : 'No periods yet'} />
                <StatCard label="Reserve Status" value={formatMoney(totalReserves)} subtitle="Total reserves accumulated" />
                <StatCard label="Next Distribution Date" value={distributions.length > 0 ? formatDate(new Date(new Date(distributions[0].period_end).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()) : 'TBD'} subtitle="Estimated" />
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Calculate Distribution</h2>
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    {showForm ? 'Cancel' : 'New Distribution'}
                  </button>
                </div>

                {showForm && (
                  <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gross Revenue</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formGrossRevenue}
                          onChange={(e) => setFormGrossRevenue(e.target.value)}
                          required
                          placeholder="0.00"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Operating Expenses</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formOperatingExpenses}
                          onChange={(e) => setFormOperatingExpenses(e.target.value)}
                          required
                          placeholder="0.00"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <input
                          type="text"
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          placeholder="Optional notes"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    </div>

                    {(formGrossRevenue || formOperatingExpenses) && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribution Preview (35/35/20/10 Split)</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Net Income</p>
                            <p className={`text-sm font-bold ${splitPreview.net >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatMoney(splitPreview.net)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Distribution (35%)</p>
                            <p className="text-sm font-bold text-teal-700">{formatMoney(splitPreview.distribution)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Reserve (35%)</p>
                            <p className="text-sm font-bold text-blue-700">{formatMoney(splitPreview.reserve)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Growth (20%)</p>
                            <p className="text-sm font-bold text-purple-700">{formatMoney(splitPreview.growth)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Buffer (10%)</p>
                            <p className="text-sm font-bold text-amber-700">{formatMoney(splitPreview.buffer)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Calculating...' : 'Calculate Distribution'}
                    </button>
                  </form>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Distribution History</h2>
                </div>
                {distributions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SPV</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Income</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Distribution (35%)</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reserve (35%)</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Growth (20%)</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Buffer (10%)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {distributions.map((dist) => (
                          <>
                            <tr
                              key={dist.id}
                              onClick={() => handleExpand(dist.id)}
                              className="cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {formatDate(dist.period_start)} - {formatDate(dist.period_end)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">{getSpvName(dist.spv_id)}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatMoney(dist.gross_revenue)}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatMoney(dist.net_income)}</td>
                              <td className="px-4 py-3 text-sm text-teal-700 font-medium text-right">{formatMoney(dist.distribution_amount)}</td>
                              <td className="px-4 py-3 text-sm text-blue-700 text-right">{formatMoney(dist.reserve_amount)}</td>
                              <td className="px-4 py-3 text-sm text-purple-700 text-right">{formatMoney(dist.growth_amount)}</td>
                              <td className="px-4 py-3 text-sm text-amber-700 text-right">{formatMoney(dist.operating_buffer_amount)}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[dist.status] || 'bg-gray-100 text-gray-700'}`}>
                                  {formatStatus(dist.status)}
                                </span>
                              </td>
                            </tr>
                            {expandedId === dist.id && (
                              <tr key={`${dist.id}-detail`}>
                                <td colSpan={9} className="px-4 py-4 bg-gray-50">
                                  {detailLoading ? (
                                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600" />
                                      Loading breakdown...
                                    </div>
                                  ) : detail?.investorBreakdown && detail.investorBreakdown.length > 0 ? (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Per-Investor Breakdown</h4>
                                      <table className="min-w-full divide-y divide-gray-200">
                                        <thead>
                                          <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Investor</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pro Rata Share</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Distribution Amount</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {detail.investorBreakdown.map((inv) => (
                                            <tr key={inv.investor_id}>
                                              <td className="px-3 py-2 text-sm text-gray-700">{inv.investor_name || inv.investor_id}</td>
                                              <td className="px-3 py-2 text-sm text-gray-600 text-right">{(parseFloat(inv.pro_rata_share || '0') * 100).toFixed(2)}%</td>
                                              <td className="px-3 py-2 text-sm font-medium text-teal-700 text-right">{formatMoney(inv.distribution_amount)}</td>
                                              <td className="px-3 py-2 text-sm">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                                                  {formatStatus(inv.status)}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400">No investor breakdown available for this distribution.</p>
                                  )}
                                  {detail?.notes && (
                                    <p className="text-sm text-gray-500 mt-3">Notes: {detail.notes}</p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-gray-400 text-sm">No distributions calculated yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
