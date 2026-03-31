import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, NexusBankingPanel } from '../../components/design-law';
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
    <DesignLawLayout>
      <Head>
        <title>Axiom Capital Program — Overview</title>
      </Head>

      <div className="mb-6">
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">Axiom Capital Program</h1>
        <p className="text-sm text-dl-gray">$1M dual-asset program with institutional-grade reporting and full audit trails</p>
      </div>

      <PilotNav currentTab="dashboard" />

      <div className="border border-dl-border bg-dl-bg-alt p-5 mb-8">
        <p className="text-sm text-dl-gray leading-relaxed">The Axiom Capital Program is a $1M dual-asset program designed to prove community-driven real estate participation at scale. Two carefully selected properties — a multifamily cash-flow asset and a commercial appreciation play — form the foundation of a model that can expand nationwide.</p>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <p className="text-sm text-dl-gray font-dl-mono">Loading dashboard data...</p>
        </div>
      ) : error ? (
        <div className="border border-dl-error bg-dl-bg p-6">
          <p className="text-sm text-dl-error font-medium">Error</p>
          <p className="text-sm text-dl-gray mt-1">{error}</p>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-8">
            <div className="px-4 py-4 bg-dl-bg border-r border-b md:border-b-0 border-dl-border">
              <p className="text-xs text-dl-gray mb-1">Total Capital Raised</p>
              <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatMoney(data.totalCapitalCommitted)}</p>
              <p className="text-xs text-dl-gray mt-1">{data.investorCount} participant{data.investorCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="px-4 py-4 bg-dl-bg-alt border-r border-b md:border-b-0 border-dl-border">
              <p className="text-xs text-dl-gray mb-1">Total Deployed</p>
              <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatMoney(data.totalCapitalFunded)}</p>
            </div>
            <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
              <p className="text-xs text-dl-gray mb-1">Reserve Balance</p>
              <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatMoney(totalReserveBalance)}</p>
            </div>
            <div className="px-4 py-4 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Net Cash Flow (YTD)</p>
              <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatMoney(totalNetCashFlow)}</p>
              <p className="text-xs text-dl-gray mt-1">{data.distributionHistory.count} distribution{data.distributionHistory.count !== 1 ? 's' : ''} to date</p>
            </div>
          </div>

          <div className="mb-8">
            <SectionHeading>SPV Positions</SectionHeading>
            {data.spvs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border">
                {data.spvs.map((spv, i) => (
                  <div key={spv.id} className={`p-6 ${i === 0 ? 'border-b md:border-b-0 md:border-r border-dl-border bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-dl-serif text-base text-dl-navy font-medium">{spv.name}</h3>
                        {spv.label && <p className="text-xs text-dl-gray mt-0.5">{spv.label}</p>}
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs font-dl-mono text-dl-gray">{formatStatus(spv.assetType)}</span>
                        <span className="text-xs font-dl-mono text-dl-forest">{formatStatus(spv.status)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                      <div>
                        <p className="text-xs text-dl-gray">Purchase Price</p>
                        <p className="font-dl-mono text-sm text-dl-navy font-semibold">{spv.targetPurchasePrice ? formatMoney(spv.targetPurchasePrice) : 'TBD'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dl-gray">Equity Allocated</p>
                        <p className="font-dl-mono text-sm text-dl-navy font-semibold">{formatMoney(spv.equityAllocated)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dl-gray">Debt</p>
                        <p className="font-dl-mono text-sm text-dl-navy font-semibold">{spv.debtAmount ? formatMoney(spv.debtAmount) : 'None'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dl-gray">Current Valuation</p>
                        <p className="font-dl-mono text-sm text-dl-navy font-semibold">{spv.currentValuation ? formatMoney(spv.currentValuation) : 'Pending'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dl-gray">Occupancy Rate</p>
                        <p className="font-dl-mono text-sm text-dl-navy font-semibold">{spv.occupancyRate ? formatPercent(spv.occupancyRate) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dl-gray">Target Yield</p>
                        <p className="font-dl-mono text-sm text-dl-navy font-semibold">{spv.targetYield ? formatPercent(spv.targetYield) : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-dl-border flex items-center justify-between">
                      <p className="text-xs text-dl-gray">Monthly Net Cash Flow</p>
                      <p className="font-dl-mono text-sm text-dl-forest font-semibold">{spv.monthlyNetCashFlow ? formatMoney(spv.monthlyNetCashFlow) : 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dl-border p-8 text-center bg-dl-bg-alt">
                <p className="text-sm text-dl-gray">No SPVs configured yet</p>
              </div>
            )}
          </div>

          {aggregatedBuckets && Object.keys(aggregatedBuckets).length > 0 && (
            <div className="mb-8">
              <SectionHeading>Treasury Health</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
                {Object.entries(aggregatedBuckets).map(([name, bucket], i) => (
                  <div key={name} className={`px-4 py-4 ${i < Object.keys(aggregatedBuckets).length - 1 ? 'border-r border-b md:border-b-0 border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                    <p className="text-xs text-dl-gray capitalize mb-1">{name.replace(/_/g, ' ')}</p>
                    <p className="font-dl-mono text-sm text-dl-navy font-semibold">{formatMoney(bucket.balance.toFixed(2))}</p>
                    <p className="text-xs text-dl-gray mt-1">{formatPercent(bucket.percent.toFixed(1))} allocation</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <SectionHeading>Recent Activity</SectionHeading>
            {auditEntries.length > 0 ? (
              <div className="border border-dl-border overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-dl-bg-alt">
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Actor</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.map((entry, i) => (
                      <tr key={entry.id} className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                        <td className="px-4 py-3 text-xs font-dl-mono text-dl-navy">{formatStatus(entry.action)}</td>
                        <td className="px-4 py-3 text-sm text-dl-gray">{entry.description || '—'}</td>
                        <td className="px-4 py-3 text-xs text-dl-gray">{entry.actor_role || entry.actor_id || '—'}</td>
                        <td className="px-4 py-3 text-sm font-dl-mono text-dl-navy">{entry.amount ? formatMoney(entry.amount) : '—'}</td>
                        <td className="px-4 py-3 text-xs font-dl-mono text-dl-gray">
                          {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-dl-border p-6 text-center bg-dl-bg-alt">
                <p className="text-sm text-dl-gray">No recent activity</p>
              </div>
            )}
          </div>
        </>
      ) : null}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <SectionHeading>Capital Program Deposit Account</SectionHeading>
        <NexusBankingPanel
          product="pilot"
          context="capital-program"
          title="Axiom Nexus — Capital Program Account"
          description="Capital program contributions and SPV distributions are processed through the Axiom Nexus Account at First Internet Bank. Register your account to receive dedicated deposit routing instructions. Contributions are tracked against your program participation record."
          collapsible={true}
        />
      </div>
    </DesignLawLayout>
  );
}
