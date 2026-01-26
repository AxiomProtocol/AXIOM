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

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  status?: 'safe' | 'warning' | 'critical';
}

function MetricCard({ title, value, subtitle, status = 'safe' }: MetricCardProps) {
  const statusColors = {
    safe: 'border-green-500',
    warning: 'border-yellow-500',
    critical: 'border-red-500'
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${statusColors[status]}`}>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
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
      className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
    >
      {label || shortValue}
      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function NavTabs() {
  const tabs = [
    { name: 'Overview', href: '/observer', current: true },
    { name: 'Treasury', href: '/observer/treasury', current: false },
    { name: 'Governance', href: '/observer/governance', current: false },
    { name: 'Risk', href: '/observer/risk', current: false },
    { name: 'Assets', href: '/observer/assets', current: false },
    { name: 'Controls', href: '/observer/controls', current: false },
    { name: 'Reports', href: '/observer/reports', current: false },
  ];

  return (
    <nav className="flex space-x-4 mb-8">
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab.current
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {tab.name}
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
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
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
    <div className={`rounded-lg border p-3 ${statusColors[gate.status]}`}>
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
    ready: 'from-green-500 to-green-600',
    in_progress: 'from-yellow-500 to-yellow-600',
    blocked: 'from-red-500 to-red-600'
  };

  const overallLabels = {
    ready: 'Ready for Lock',
    in_progress: 'In Progress',
    blocked: 'Blocked'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
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
        <Link href="/docs/governance-hardening.md" className="text-blue-600 hover:text-blue-800 flex items-center">
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

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Institutional Observer</h1>
            <p className="mt-2 text-gray-600">
              Read-only governance and treasury transparency dashboard. 
              All data is derived from on-chain state and verifiable.
            </p>
          </div>

          <NavTabs />

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Read-Only Dashboard:</strong> No transaction signing or admin actions are possible from this interface.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          ) : data ? (
            <>
              {lockReadiness && <LockReadinessBadge data={lockReadiness} />}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                  title="Treasury Total"
                  value={data.treasuryTotal.usd || '$0'}
                  subtitle={`${data.treasuryTotal.eth || '0'} ETH`}
                />
                <MetricCard
                  title="Governance Status"
                  value={data.governanceStatus.paused ? 'PAUSED' : 'ACTIVE'}
                  subtitle={data.governanceStatus.timelockLocked ? 'Timelock Locked' : 'Timelock Configurable'}
                  status={data.governanceStatus.paused ? 'critical' : 'safe'}
                />
                <MetricCard
                  title="Risk Utilization"
                  value={`${data.riskPosture.utilizationPercent}%`}
                  subtitle={`${data.riskPosture.currentExposure} / ${data.riskPosture.maxExposure}`}
                  status={data.riskPosture.utilizationPercent > 80 ? 'warning' : 'safe'}
                />
                <MetricCard
                  title="Lending Status"
                  value={data.governanceStatus.lendingPaused ? 'PAUSED' : 'ACTIVE'}
                  status={data.governanceStatus.lendingPaused ? 'warning' : 'safe'}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
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

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">30-Day Flows</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Inflows</span>
                      <span className="font-medium text-green-600">{data.flows.inflows30d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Outflows</span>
                      <span className="font-medium text-red-600">{data.flows.outflows30d}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 mb-8">
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

              <div className="bg-white rounded-lg shadow p-6">
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

              <div className="mt-8 text-center text-sm text-gray-500">
                Last updated: {data.lastUpdated}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
