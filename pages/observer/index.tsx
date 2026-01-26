/**
 * Institutional Observer Dashboard - Overview Page
 * 
 * Read-only executive summary for allocators and auditors.
 * All data derived from on-chain state and events.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { OverviewMetrics, LockReadinessData, LockGate } from '../../server/services/observer/types';

const OBSERVER_CONTRACTS = {
  TimelockController: '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899',
  GovernanceHub: '0x52Dc85fd653a75323b5307f4D2629ab9A070530E',
  TreasuryHub: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
};

type Tab = 'overview' | 'treasury' | 'governance' | 'risk' | 'assets' | 'controls' | 'reports';

function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
  status
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'yellow' | 'green' | 'purple' | 'blue' | 'red';
  status?: 'safe' | 'warning' | 'critical';
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

interface ProofLinkProps {
  type: 'tx' | 'address' | 'block';
  value: string;
  label?: string;
}

function ProofLink({ type, value, label }: ProofLinkProps) {
  const baseUrl = 'https://arbiscan.io';
  const urlMap = {
    tx: `${baseUrl}/tx/${value}`,
    address: `${baseUrl}/address/${value}`,
    block: `${baseUrl}/block/${value}`
  };

  const shortValue = value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;

  return (
    <a 
      href={urlMap[type]} 
      target="_blank" 
      rel="noopener noreferrer"
      className="inline-flex items-center text-amber-600 hover:text-amber-700 text-sm"
    >
      {label || shortValue}
      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function NavTabs() {
  const tabs: { id: Tab; label: string; href: string; current: boolean; icon: React.ReactNode }[] = [
    { 
      id: 'overview', 
      label: 'Overview', 
      href: '/observer', 
      current: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      id: 'treasury', 
      label: 'Treasury', 
      href: '/observer/treasury', 
      current: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'governance', 
      label: 'Governance', 
      href: '/observer/governance', 
      current: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    { 
      id: 'risk', 
      label: 'Risk', 
      href: '/observer/risk', 
      current: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    { 
      id: 'assets', 
      label: 'Assets', 
      href: '/observer/assets', 
      current: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      id: 'controls', 
      label: 'Controls', 
      href: '/observer/controls', 
      current: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      href: '/observer/reports', 
      current: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
  ];

  return (
    <nav className="lg:w-48 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors whitespace-nowrap ${
            tab.current
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
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
    <>
      <Head>
        <title>Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Read-only governance and treasury transparency dashboard" />
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Institutional Observer</h1>
            <p className="text-gray-600 mt-1">Read-only governance and treasury transparency dashboard</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-amber-800">
                  <strong>Read-Only Dashboard:</strong> No transaction signing or admin actions are possible from this interface.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <NavTabs />

            <main className="flex-1">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                </div>
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
                      value={data.treasuryTotal.usd || '$0'}
                      subtitle={`${data.treasuryTotal.eth || '0'} ETH`}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                      color="yellow"
                    />
                    <StatCard
                      label="Governance Status"
                      value={data.governanceStatus.paused ? 'PAUSED' : 'ACTIVE'}
                      subtitle={data.governanceStatus.timelockLocked ? 'Timelock Locked' : 'Timelock Configurable'}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      }
                      color={data.governanceStatus.paused ? 'red' : 'green'}
                    />
                    <StatCard
                      label="Risk Utilization"
                      value={`${data.riskPosture.utilizationPercent}%`}
                      subtitle={`${data.riskPosture.currentExposure} / ${data.riskPosture.maxExposure}`}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      }
                      color={data.riskPosture.utilizationPercent > 80 ? 'yellow' : 'purple'}
                    />
                    <StatCard
                      label="Lending Status"
                      value={data.governanceStatus.lendingPaused ? 'PAUSED' : 'ACTIVE'}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      }
                      color={data.governanceStatus.lendingPaused ? 'yellow' : 'blue'}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Bucket Totals</h2>
                      <div className="space-y-3">
                        {Object.entries(data.bucketTotals).map(([bucket, value]) => (
                          <div key={bucket} className="flex justify-between items-center">
                            <span className="text-gray-600 capitalize">{bucket}</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">30-Day Flows</h2>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Inflows</span>
                          <span className="font-medium text-teal-600">{data.flows.inflows30d}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Outflows</span>
                          <span className="font-medium text-red-600">{data.flows.outflows30d}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Proof Links</h2>
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
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Governance Actions</h2>
                    {data.latestActions.length === 0 ? (
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
                            {data.latestActions.map((action) => (
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
                  </div>

                  <div className="mt-6 text-center text-sm text-gray-500">
                    Last updated: {data.lastUpdated}
                  </div>
                </>
              ) : null}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
