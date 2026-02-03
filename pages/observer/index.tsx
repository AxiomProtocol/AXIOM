import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ObserverLayout, ObserverCard, ObserverLoading, ProofLink } from '../../components/observer/ObserverLayout';
import { OverviewMetrics, LockReadinessData, LockGate } from '../../server/services/observer/types';

const OBSERVER_CONTRACTS = {
  TimelockController: '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899',
  GovernanceHub: '0x52Dc85fd653a75323b5307f4D2629ab9A070530E',
  TreasuryHub: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
};

function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'yellow' | 'green' | 'purple' | 'blue' | 'red';
}) {
  const colorClasses = {
    yellow: 'text-amber-600 bg-amber-100',
    green: 'text-teal-600 bg-teal-100',
    purple: 'text-purple-600 bg-purple-100',
    blue: 'text-blue-600 bg-blue-100',
    red: 'text-red-600 bg-red-100'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>
        {value}
      </div>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

interface GateStatusProps {
  gate: LockGate;
}

function GateStatus({ gate }: GateStatusProps) {
  const statusColors = {
    green: 'bg-teal-100 text-teal-800 border-teal-300',
    yellow: 'bg-amber-100 text-amber-800 border-amber-300',
    red: 'bg-red-100 text-red-800 border-red-300'
  };

  const statusIcons = {
    green: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    yellow: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
    red: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  };

  return (
    <div className={`rounded-xl border p-3 ${statusColors[gate.status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {statusIcons[gate.status]}
          <span className="font-medium text-sm">{gate.name}</span>
        </div>
        <span className="text-xs font-mono">{gate.passingCount}/{gate.totalCount}</span>
      </div>
    </div>
  );
}

interface LockReadinessBadgeProps {
  data: LockReadinessData;
}

function LockReadinessBadge({ data }: LockReadinessBadgeProps) {
  const overallColors = {
    ready: 'from-teal-500 to-teal-600',
    in_progress: 'from-amber-500 to-amber-600',
    blocked: 'from-red-500 to-red-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Governance Hardening</h2>
          <p className="text-sm text-gray-500">Lock Forever Readiness Status</p>
        </div>
        <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${overallColors[data.overallStatus]} text-white font-medium text-sm`}>
          {data.passingCriteria}/{data.totalCriteria} Criteria Passing
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <GateStatus gate={data.gates.governance} />
        <GateStatus gate={data.gates.treasury} />
        <GateStatus gate={data.gates.observability} />
        <GateStatus gate={data.gates.operations} />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 border-t border-gray-100 pt-4">
        <div className="flex items-center space-x-4">
          <span>Day {data.daysElapsed} of observation window</span>
          <span className="text-gray-300">|</span>
          <span>{data.daysRemaining} days until latest review</span>
        </div>
        <Link href="/docs/governance-hardening.md" className="text-amber-600 hover:text-amber-700 flex items-center">
          View Full Checklist
          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default function ObserverOverview() {
  const [data, setData] = useState<OverviewMetrics | null>(null);
  const [lockReadiness, setLockReadiness] = useState<LockReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, lockRes] = await Promise.all([
          fetch('/api/observer/overview'),
          fetch('/api/observer/lock-readiness')
        ]);
        const [overviewResult, lockResult] = await Promise.all([
          overviewRes.json(),
          lockRes.json()
        ]);
        if (overviewResult.success) {
          setData(overviewResult.data);
        } else {
          setError(overviewResult.error || 'Failed to fetch data');
        }
        if (lockResult.success) {
          setLockReadiness(lockResult.data);
        }
      } catch (err) {
        setError('Failed to connect to API');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <ObserverLayout
      title="Overview"
      description="Executive summary for allocators and auditors"
      currentTab="overview"
    >
      {loading ? (
        <ObserverLoading />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      ) : data ? (
        <>
          {lockReadiness && <LockReadinessBadge data={lockReadiness} />}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Treasury Total"
              value={data.treasuryTotal?.usd || '$0'}
              subtitle={`${data.treasuryTotal?.eth || '0'} ETH`}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="yellow"
            />
            <StatCard
              label="Governance Status"
              value={data.governanceStatus?.paused ? 'PAUSED' : 'ACTIVE'}
              subtitle={data.governanceStatus?.timelockLocked ? 'Timelock Locked' : 'Timelock Configurable'}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              color={data.governanceStatus?.paused ? 'red' : 'green'}
            />
            <StatCard
              label="Risk Utilization"
              value={`${data.riskPosture?.utilizationPercent || 0}%`}
              subtitle={`${data.riskPosture?.currentExposure || '0'} / ${data.riskPosture?.maxExposure || '0'}`}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
              color={(data.riskPosture?.utilizationPercent || 0) > 80 ? 'yellow' : 'purple'}
            />
            <StatCard
              label="Lending Status"
              value={data.governanceStatus?.lendingPaused ? 'PAUSED' : 'ACTIVE'}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              color={data.governanceStatus?.lendingPaused ? 'yellow' : 'blue'}
            />
          </div>

          {data.operatorNetwork && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Node Operator Network</h2>
                  <p className="text-sm text-gray-500">Settlement operators and attestors</p>
                </div>
                <Link href="/operator" className="text-sm text-teal-600 hover:text-teal-700 flex items-center">
                  View Portal
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900">{data.operatorNetwork.totalOperators}</div>
                  <div className="text-xs text-gray-500">Total Operators</div>
                </div>
                <div className="bg-teal-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-teal-600">{data.operatorNetwork.activeOperators}</div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">{data.operatorNetwork.certifiedOperators}</div>
                  <div className="text-xs text-gray-500">Certified</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{data.operatorNetwork.pendingOperators}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    Observers: {data.operatorNetwork.observerCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    Validators: {data.operatorNetwork.validatorCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                    Attestors: {data.operatorNetwork.attestorCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ObserverCard title="Bucket Totals">
              <div className="space-y-3">
                {data.bucketTotals && Object.entries(data.bucketTotals).map(([bucket, value]) => (
                  <div key={bucket} className="flex justify-between items-center">
                    <span className="text-gray-600 capitalize">{bucket}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </ObserverCard>

            <ObserverCard title="30-Day Flows">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Inflows</span>
                  <span className="font-medium text-teal-600">{data.flows?.inflows30d || '$0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Outflows</span>
                  <span className="font-medium text-red-600">{data.flows?.outflows30d || '$0'}</span>
                </div>
              </div>
            </ObserverCard>
          </div>

          <ObserverCard title="Proof Links" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Treasury Contract</p>
                <ProofLink type="address" value={OBSERVER_CONTRACTS.TreasuryHub} />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Governance Hub</p>
                <ProofLink type="address" value={OBSERVER_CONTRACTS.GovernanceHub} />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Timelock Controller</p>
                <ProofLink type="address" value={OBSERVER_CONTRACTS.TimelockController} />
              </div>
            </div>
          </ObserverCard>

          <ObserverCard title="Latest Governance Actions">
            {!data.latestActions || data.latestActions.length === 0 ? (
              <p className="text-gray-500">No recent governance actions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(data.latestActions || []).map((action) => (
                      <tr key={action.id}>
                        <td className="px-4 py-3 text-sm">{action.type}</td>
                        <td className="px-4 py-3 text-sm">{action.description}</td>
                        <td className="px-4 py-3 text-sm">
                          <ProofLink type="address" value={action.actor} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{action.timestamp}</td>
                        <td className="px-4 py-3 text-sm">
                          <ProofLink type="tx" value={action.txHash} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ObserverCard>

          <div className="mt-6 text-center text-sm text-gray-500">
            Last updated: {data.lastUpdated}
          </div>
        </>
      ) : null}
    </ObserverLayout>
  );
}
