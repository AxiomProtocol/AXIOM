import { useState, useEffect } from 'react';
import Head from 'next/head';
import PilotNav from '../../components/pilot/PilotNav';

interface SpvData {
  id: string;
  name: string;
  label: string;
  assetType: string;
  status: string;
  targetPurchasePrice: string | null;
  equityAllocated: string;
  debtAmount: string | null;
  currentValuation: string | null;
  occupancyRate: string | null;
  targetYield: string | null;
  monthlyNetCashFlow: string | null;
}

interface TreasuryBucket {
  bucketName: string;
  spvId: string | null;
  currentBalance: string;
  allocationPercent: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actor_id: string;
  actor_role: string;
  description: string;
  amount: string | null;
  created_at: string;
}

interface DashboardData {
  spvs: SpvData[];
  investorCount: number;
  totalCapitalCommitted: string;
  totalCapitalFunded: string;
  distributionHistory: {
    count: number;
    totalDistributed: string;
    totalNetIncome: string;
  };
  reserveHealth: {
    spvId: string;
    currentBalance: string;
    minReserve: string;
    healthPct: string;
  }[];
  treasuryBuckets: TreasuryBucket[];
  expansionGate: any;
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

function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '0%';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  return num.toFixed(1) + '%';
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function SpvCard({ spv }: { spv: SpvData }) {
  const statusColors: Record<string, string> = {
    active: 'bg-teal-100 text-teal-800',
    pending: 'bg-amber-100 text-amber-800',
    closed: 'bg-gray-100 text-gray-800',
    under_contract: 'bg-blue-100 text-blue-800',
    due_diligence: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{spv.name}</h3>
        <div className="flex gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {formatStatus(spv.assetType)}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[spv.status] || 'bg-gray-100 text-gray-700'}`}>
            {formatStatus(spv.status)}
          </span>
        </div>
      </div>
      {spv.label && <p className="text-sm text-gray-500 mb-4">{spv.label}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-400">Purchase Price</p>
          <p className="text-sm font-semibold text-gray-900">{spv.targetPurchasePrice ? formatMoney(spv.targetPurchasePrice) : 'TBD'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Equity Allocated</p>
          <p className="text-sm font-semibold text-gray-900">{formatMoney(spv.equityAllocated)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Debt</p>
          <p className="text-sm font-semibold text-gray-900">{spv.debtAmount ? formatMoney(spv.debtAmount) : 'None'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Current Valuation</p>
          <p className="text-sm font-semibold text-gray-900">{spv.currentValuation ? formatMoney(spv.currentValuation) : 'Pending'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Occupancy Rate</p>
          <p className="text-sm font-semibold text-gray-900">{spv.occupancyRate ? formatPercent(spv.occupancyRate) : 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Target Yield</p>
          <p className="text-sm font-semibold text-gray-900">{spv.targetYield ? formatPercent(spv.targetYield) : 'N/A'}</p>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Monthly Net Cash Flow</p>
          <p className="text-sm font-bold text-teal-700">{spv.monthlyNetCashFlow ? formatMoney(spv.monthlyNetCashFlow) : 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}

function TreasuryBar({ name, balance, percent }: { name: string; balance: string; percent: string }) {
  const pct = parseFloat(percent) || 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 capitalize">{name.replace(/_/g, ' ')}</span>
        <span className="text-sm font-medium text-gray-900">{formatMoney(balance)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-teal-500 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{formatPercent(percent)} allocation</p>
    </div>
  );
}

export default function PilotDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, auditRes] = await Promise.all([
          fetch('/api/pilot'),
          fetch('/api/pilot/audit?limit=5'),
        ]);
        const dashResult = await dashRes.json();
        const auditResult = await auditRes.json();

        if (dashResult.success) {
          setData(dashResult.data);
        } else {
          setError(dashResult.error || 'Failed to load dashboard');
        }
        if (auditResult.success) {
          setAuditEntries(auditResult.data || []);
        }
      } catch {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const aggregatedBuckets = data?.treasuryBuckets?.reduce<Record<string, { balance: number; percent: number }>>((acc, b) => {
    if (!acc[b.bucketName]) acc[b.bucketName] = { balance: 0, percent: 0 };
    acc[b.bucketName].balance += parseFloat(b.currentBalance || '0');
    acc[b.bucketName].percent += parseFloat(b.allocationPercent || '0');
    return acc;
  }, {});

  const totalReserveBalance = data?.reserveHealth?.reduce(
    (sum, r) => sum + parseFloat(r.currentBalance || '0'), 0
  ) || 0;

  const totalNetCashFlow = data?.spvs?.reduce(
    (sum, s) => sum + parseFloat(s.monthlyNetCashFlow || '0'), 0
  ) || 0;

  return (
    <>
      <Head>
        <title>National Economic Pilot — Dashboard</title>
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">National Economic Pilot</h1>
            <p className="text-gray-500 mt-1">$1M Dual-Asset Pilot Dashboard</p>
          </div>

          <PilotNav currentTab="dashboard" />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              <span className="ml-3 text-gray-500">Loading dashboard...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="Total Capital Raised"
                  value={formatMoney(data.totalCapitalCommitted)}
                  subtitle={`${data.investorCount} investor${data.investorCount !== 1 ? 's' : ''}`}
                />
                <StatCard
                  label="Total Deployed"
                  value={formatMoney(data.totalCapitalFunded)}
                />
                <StatCard
                  label="Reserve Balance"
                  value={formatMoney(totalReserveBalance)}
                />
                <StatCard
                  label="Net Cash Flow (YTD)"
                  value={formatMoney(totalNetCashFlow)}
                  subtitle={`${data.distributionHistory.count} distribution${data.distributionHistory.count !== 1 ? 's' : ''} to date`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {data.spvs.length > 0 ? (
                  data.spvs.map((spv) => <SpvCard key={spv.id} spv={spv} />)
                ) : (
                  <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-500">No SPVs configured yet</p>
                  </div>
                )}
              </div>

              {aggregatedBuckets && Object.keys(aggregatedBuckets).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Treasury Health</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.entries(aggregatedBuckets).map(([name, bucket]) => (
                      <TreasuryBar
                        key={name}
                        name={name}
                        balance={bucket.balance.toFixed(2)}
                        percent={bucket.percent.toFixed(1)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                {auditEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {auditEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {formatStatus(entry.action)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{entry.description || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{entry.actor_role || entry.actor_id || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{entry.amount ? formatMoney(entry.amount) : '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">No recent activity</p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
