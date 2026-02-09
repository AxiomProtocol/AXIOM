import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { ProofLink } from '../../components/observer/ObserverLayout';
import { OverviewMetrics, LockReadinessData, LockGate } from '../../server/services/observer/types';

const OBSERVER_CONTRACTS = {
  TimelockController: '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899',
  GovernanceHub: '0x52Dc85fd653a75323b5307f4D2629ab9A070530E',
  TreasuryHub: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
};

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

function StatCard({
  label,
  value,
  subtitle,
  icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'yellow' | 'green' | 'purple' | 'blue' | 'red';
}) {
  return (
    <div className="border border-dl-border p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-dl-bg-alt text-dl-navy">
          {icon}
        </div>
        <span className="text-sm text-dl-gray">{label}</span>
      </div>
      <div className="text-2xl font-dl-mono text-dl-navy">
        {value}
      </div>
      {subtitle && <p className="mt-1 text-sm text-dl-gray">{subtitle}</p>}
    </div>
  );
}

interface GateStatusProps {
  gate: LockGate;
}

function GateStatus({ gate }: GateStatusProps) {
  const statusColors = {
    green: 'bg-dl-bg-alt text-dl-forest border-dl-border',
    yellow: 'bg-dl-bg-alt text-dl-gold border-dl-border',
    red: 'bg-dl-bg-alt text-dl-error border-dl-border'
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
    <div className={`border p-3 ${statusColors[gate.status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {statusIcons[gate.status]}
          <span className="font-medium text-sm">{gate.name}</span>
        </div>
        <span className="text-xs font-dl-mono">{gate.passingCount}/{gate.totalCount}</span>
      </div>
    </div>
  );
}

interface LockReadinessBadgeProps {
  data: LockReadinessData;
}

function LockReadinessBadge({ data }: LockReadinessBadgeProps) {
  return (
    <div className="border border-dl-border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-dl-serif text-lg text-dl-navy">Governance Hardening</h2>
          <p className="text-sm text-dl-gray">Lock Forever Readiness Status</p>
        </div>
        <div className="bg-dl-navy text-white font-medium text-sm px-4 py-2">
          {data.passingCriteria}/{data.totalCriteria} Criteria Passing
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <GateStatus gate={data.gates.governance} />
        <GateStatus gate={data.gates.treasury} />
        <GateStatus gate={data.gates.observability} />
        <GateStatus gate={data.gates.operations} />
      </div>

      <div className="flex items-center justify-between text-sm text-dl-gray border-t border-dl-border pt-4">
        <div className="flex items-center space-x-4">
          <span>Day {data.daysElapsed} of observation window</span>
          <span className="text-dl-gray">|</span>
          <span>{data.daysRemaining} days until latest review</span>
        </div>
        <Link href="/observer/governance" className="text-dl-navy flex items-center">
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
    <DesignLawLayout>
      <Head>
        <title>Overview | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Executive summary for allocators and auditors" />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy">Observer</h1>
      <p className="text-dl-gray mt-1 mb-6">Executive summary for allocators and auditors</p>

      <ObserverNav current="overview" />

      <div className="bg-dl-bg-alt border border-dl-border p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-dl-gold mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <p className="text-sm text-dl-navy">
              <strong>Read-Only Dashboard:</strong> No transaction signing or admin actions are possible from this interface.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-dl-gray font-dl-mono">Loading data...</p>
      ) : error ? (
        <div className="border border-dl-error p-4">
          <p className="text-sm text-dl-error">Error: {error}</p>
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
            <div className="border border-dl-border p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-dl-serif text-lg text-dl-navy">Node Operator Network</h2>
                  <p className="text-sm text-dl-gray">Settlement operators and attestors</p>
                </div>
                <Link href="/observer/node-economy" className="text-sm text-dl-navy flex items-center">
                  View Portal
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-dl-bg-alt p-3 text-center">
                  <div className="text-2xl font-dl-mono text-dl-navy">{data.operatorNetwork.totalOperators}</div>
                  <div className="text-xs text-dl-gray">Total Operators</div>
                </div>
                <div className="bg-dl-bg-alt p-3 text-center">
                  <div className="text-2xl font-dl-mono text-dl-navy">{data.operatorNetwork.activeOperators}</div>
                  <div className="text-xs text-dl-gray">Active</div>
                </div>
                <div className="bg-dl-bg-alt p-3 text-center">
                  <div className="text-2xl font-dl-mono text-dl-navy">{data.operatorNetwork.certifiedOperators}</div>
                  <div className="text-xs text-dl-gray">Certified</div>
                </div>
                <div className="bg-dl-bg-alt p-3 text-center">
                  <div className="text-2xl font-dl-mono text-dl-gold">{data.operatorNetwork.pendingOperators}</div>
                  <div className="text-xs text-dl-gray">Pending</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-dl-border pt-3">
                <div className="flex items-center gap-4 text-dl-gray">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-dl-navy"></span>
                    Observers: {data.operatorNetwork.observerCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-dl-navy"></span>
                    Validators: {data.operatorNetwork.validatorCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-dl-navy"></span>
                    Attestors: {data.operatorNetwork.attestorCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="border border-dl-border p-6">
              <SectionHeading>Bucket Totals</SectionHeading>
              <div className="space-y-3">
                {data.bucketTotals && Object.entries(data.bucketTotals).map(([bucket, value]) => (
                  <div key={bucket} className="flex justify-between items-center">
                    <span className="text-dl-gray capitalize">{bucket}</span>
                    <span className="font-dl-mono font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-dl-border p-6">
              <SectionHeading>30-Day Flows</SectionHeading>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-dl-gray">Inflows</span>
                  <span className="font-dl-mono font-medium text-dl-forest">{data.flows?.inflows30d || '$0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dl-gray">Outflows</span>
                  <span className="font-dl-mono font-medium text-dl-error">{data.flows?.outflows30d || '$0'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-dl-border p-6 mb-6">
            <SectionHeading>Proof Links</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-dl-gray mb-1">Treasury Contract</p>
                <ProofLink type="address" value={OBSERVER_CONTRACTS.TreasuryHub} />
              </div>
              <div>
                <p className="text-sm text-dl-gray mb-1">Governance Hub</p>
                <ProofLink type="address" value={OBSERVER_CONTRACTS.GovernanceHub} />
              </div>
              <div>
                <p className="text-sm text-dl-gray mb-1">Timelock Controller</p>
                <ProofLink type="address" value={OBSERVER_CONTRACTS.TimelockController} />
              </div>
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Latest Governance Actions</SectionHeading>
            {!data.latestActions || data.latestActions.length === 0 ? (
              <p className="text-dl-gray">No recent governance actions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dl-border">
                  <thead>
                    <tr className="bg-dl-bg-alt">
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Type</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Description</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Actor</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Time</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dl-border">
                    {(data.latestActions || []).map((action) => (
                      <tr key={action.id}>
                        <td className="px-4 py-3 text-sm">{action.type}</td>
                        <td className="px-4 py-3 text-sm">{action.description}</td>
                        <td className="px-4 py-3 text-sm">
                          <ProofLink type="address" value={action.actor} />
                        </td>
                        <td className="px-4 py-3 text-sm text-dl-gray">{action.timestamp}</td>
                        <td className="px-4 py-3 text-sm">
                          <ProofLink type="tx" value={action.txHash} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-sm text-dl-gray font-dl-mono">
            Last updated: {data.lastUpdated}
          </div>
        </>
      ) : null}
    </DesignLawLayout>
  );
}
