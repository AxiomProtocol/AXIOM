import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
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

function getDistStatusStyle(status: string): string {
  switch (status) {
    case 'paid':
    case 'approved':
      return 'text-xs font-dl-mono text-dl-forest';
    case 'cancelled':
      return 'text-xs font-dl-mono text-dl-error';
    default:
      return 'text-xs font-dl-mono text-dl-gray';
  }
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
      <p className="text-xs text-dl-gray mb-1">{label}</p>
      <p className="font-dl-mono text-lg font-semibold text-dl-navy">{value}</p>
      {subtitle && <p className="text-xs text-dl-gray mt-1">{subtitle}</p>}
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
    <DesignLawLayout>
      <Head>
        <title>Axiom Capital Program — Income & Distributions</title>
      </Head>

      <div className="mb-6">
        <h1 className="font-dl-serif text-3xl text-dl-navy">Income & Distributions</h1>
        <p className="text-sm text-dl-gray mt-1">Calculate and track how property income flows to investors</p>
      </div>

      <PilotNav currentTab="distributions" />

      <div className="border border-dl-border bg-dl-bg-alt p-5 mb-8">
        <p className="text-sm text-dl-gray leading-relaxed">Every dollar of property income follows our 35/35/20/10 treasury policy: 35% distributed to investors, 35% held in reserves, 20% allocated for growth, and 10% kept as an operating buffer. This disciplined approach protects capital while delivering consistent returns.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-dl-gray font-dl-mono">Loading distributions...</p>
        </div>
      ) : error ? (
        <div className="border border-dl-error p-6">
          <p className="text-dl-error font-medium">Error</p>
          <p className="text-dl-gray text-sm mt-1">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-dl-border mb-8">
            <StatCard label="Total Distributions Paid" value={formatMoney(totalDistributed)} subtitle={`${distributions.filter((d) => d.status === 'paid').length} distributions`} />
            <StatCard label="Current Period Net Income" value={formatMoney(latestNetIncome)} subtitle={distributions.length > 0 ? `Period ending ${formatDate(distributions[0].period_end)}` : 'No periods yet'} />
            <StatCard label="Reserve Status" value={formatMoney(totalReserves)} subtitle="Total reserves accumulated" />
            <StatCard label="Next Distribution Date" value={distributions.length > 0 ? formatDate(new Date(new Date(distributions[0].period_end).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()) : 'TBD'} subtitle="Estimated" />
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <SectionHeading className="mb-0 border-b-0 pb-0">Calculate Distribution</SectionHeading>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-dl-navy text-white text-sm font-medium"
              >
                {showForm ? 'Cancel' : 'New Distribution'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="border border-dl-border p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Gross Revenue</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formGrossRevenue}
                      onChange={(e) => setFormGrossRevenue(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Operating Expenses</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formOperatingExpenses}
                      onChange={(e) => setFormOperatingExpenses(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Notes</label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Optional notes"
                      className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                    />
                  </div>
                </div>

                {(formGrossRevenue || formOperatingExpenses) && (
                  <div className="bg-dl-bg-alt border border-dl-border p-4 mb-6">
                    <h3 className="text-sm font-semibold text-dl-navy mb-3">Distribution Preview (35/35/20/10 Split)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-dl-gray">Net Income</p>
                        <p className={`text-sm font-dl-mono font-bold ${splitPreview.net >= 0 ? 'text-dl-navy' : 'text-dl-error'}`}>{formatMoney(splitPreview.net)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dl-gray">Distribution (35%)</p>
                        <p className="text-sm font-dl-mono font-bold text-dl-forest">{formatMoney(splitPreview.distribution)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dl-gray">Reserve (35%)</p>
                        <p className="text-sm font-dl-mono font-bold text-dl-navy">{formatMoney(splitPreview.reserve)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dl-gray">Growth (20%)</p>
                        <p className="text-sm font-dl-mono font-bold text-dl-navy">{formatMoney(splitPreview.growth)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dl-gray">Buffer (10%)</p>
                        <p className="text-sm font-dl-mono font-bold text-dl-navy">{formatMoney(splitPreview.buffer)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-dl-navy text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Calculating...' : 'Calculate Distribution'}
                </button>
              </form>
            )}
          </div>

          <div className="border border-dl-border">
            <div className="px-6 py-4 border-b border-dl-border">
              <SectionHeading className="mb-0 border-b-0 pb-0">Distribution History</SectionHeading>
            </div>
            {distributions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-dl-border">
                  <thead className="bg-dl-bg-alt">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">SPV</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Gross Revenue</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Net Income</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Distribution (35%)</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Reserve (35%)</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Growth (20%)</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Buffer (10%)</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.map((dist, i) => (
                      <>
                        <tr
                          key={dist.id}
                          onClick={() => handleExpand(dist.id)}
                          className={`cursor-pointer ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
                        >
                          <td className="px-4 py-3 text-sm text-dl-navy">
                            {formatDate(dist.period_start)} - {formatDate(dist.period_end)}
                          </td>
                          <td className="px-4 py-3 text-sm text-dl-navy">{getSpvName(dist.spv_id)}</td>
                          <td className="px-4 py-3 text-sm font-dl-mono text-dl-navy text-right">{formatMoney(dist.gross_revenue)}</td>
                          <td className="px-4 py-3 text-sm font-dl-mono text-dl-navy text-right">{formatMoney(dist.net_income)}</td>
                          <td className="px-4 py-3 text-sm font-dl-mono text-dl-forest font-medium text-right">{formatMoney(dist.distribution_amount)}</td>
                          <td className="px-4 py-3 text-sm font-dl-mono text-dl-navy text-right">{formatMoney(dist.reserve_amount)}</td>
                          <td className="px-4 py-3 text-sm font-dl-mono text-dl-navy text-right">{formatMoney(dist.growth_amount)}</td>
                          <td className="px-4 py-3 text-sm font-dl-mono text-dl-navy text-right">{formatMoney(dist.operating_buffer_amount)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={getDistStatusStyle(dist.status)}>
                              {formatStatus(dist.status)}
                            </span>
                          </td>
                        </tr>
                        {expandedId === dist.id && (
                          <tr key={`${dist.id}-detail`}>
                            <td colSpan={9} className="px-4 py-4 bg-dl-bg-alt">
                              {detailLoading ? (
                                <p className="text-sm text-dl-gray font-dl-mono">Loading breakdown...</p>
                              ) : detail?.investorBreakdown && detail.investorBreakdown.length > 0 ? (
                                <div>
                                  <h4 className="text-sm font-semibold text-dl-navy mb-3">Per-Investor Breakdown</h4>
                                  <table className="min-w-full border border-dl-border">
                                    <thead className="bg-dl-bg-alt">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Investor</th>
                                        <th className="px-3 py-2 text-right text-xs font-dl-mono text-dl-gray uppercase">Pro Rata Share</th>
                                        <th className="px-3 py-2 text-right text-xs font-dl-mono text-dl-gray uppercase">Distribution Amount</th>
                                        <th className="px-3 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detail.investorBreakdown.map((inv, j) => (
                                        <tr key={inv.investor_id} className={j % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                                          <td className="px-3 py-2 text-sm text-dl-navy">{inv.investor_name || inv.investor_id}</td>
                                          <td className="px-3 py-2 text-sm font-dl-mono text-dl-gray text-right">{(parseFloat(inv.pro_rata_share || '0') * 100).toFixed(2)}%</td>
                                          <td className="px-3 py-2 text-sm font-dl-mono font-medium text-dl-forest text-right">{formatMoney(inv.distribution_amount)}</td>
                                          <td className="px-3 py-2 text-sm">
                                            <span className={getDistStatusStyle(inv.status)}>
                                              {formatStatus(inv.status)}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-sm text-dl-gray">No investor breakdown available for this distribution.</p>
                              )}
                              {detail?.notes && (
                                <p className="text-sm text-dl-gray mt-3">Notes: {detail.notes}</p>
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
              <div className="py-12 text-center bg-dl-bg-alt">
                <p className="text-dl-gray text-sm">No distributions calculated yet</p>
              </div>
            )}
          </div>
        </>
      )}
    </DesignLawLayout>
  );
}
