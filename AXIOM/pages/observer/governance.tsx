import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { ProofLink } from '../../components/observer/ObserverLayout';
import { GovernanceData, RoleHolder, ParameterEntry, TimelockOperation, EmergencyControl } from '../../server/services/observer/types';

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

export default function ObserverGovernance() {
  const [data, setData] = useState<GovernanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/observer/governance');
        const result = await response.json();
        if (result.success) setData(result.data);
      } catch (err) {
        console.error('Failed to fetch governance data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const isPaused = data?.emergencyControls?.some((ctrl: EmergencyControl) => ctrl.name === 'Emergency Pause' && ctrl.currentState === 'active') || false;
  const isLendingPaused = data?.emergencyControls?.some((ctrl: EmergencyControl) => ctrl.name === 'Circuit Breaker' && ctrl.currentState === 'active') || false;

  return (
    <DesignLawLayout>
      <Head>
        <title>Governance | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Roles, permissions, parameters, and timelock operations" />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy">Governance</h1>
      <p className="text-dl-gray mt-1 mb-6">Roles, permissions, parameters, and timelock operations</p>

      <ObserverNav current="governance" />

      {loading ? (
        <p className="text-sm text-dl-gray font-dl-mono">Loading data...</p>
      ) : data ? (
        <>
          <div className="border border-dl-border p-6 mb-6">
            <SectionHeading>Timelock Status</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-dl-gray">Minimum Delay</p>
                <p className="text-xl font-dl-mono text-dl-gold">{data.timelockStatus ? (data.timelockStatus.minDelay / 3600) : 0} hours</p>
              </div>
              <div>
                <p className="text-sm text-dl-gray">Max Delay Cap</p>
                <p className="text-xl font-dl-mono text-dl-navy">{data.timelockStatus ? (data.timelockStatus.maxDelay / 86400) : 0} days</p>
              </div>
              <div>
                <p className="text-sm text-dl-gray">Configuration</p>
                <p className={`text-xl font-dl-mono ${data.timelockStatus?.configurationLocked ? 'text-dl-forest' : 'text-dl-gold'}`}>
                  {data.timelockStatus?.configurationLocked ? 'LOCKED' : 'CONFIGURABLE'}
                </p>
              </div>
              <div>
                <p className="text-sm text-dl-gray">Lock Timestamp</p>
                <p className="text-xl font-dl-mono text-dl-navy">{data.timelockStatus?.lockTimestamp || 'Not locked'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="border border-dl-border p-6">
              <SectionHeading>Role Assignments</SectionHeading>
              <div className="space-y-3">
                {(data.roles || []).map((roleHolder: RoleHolder) => (
                  <div key={`${roleHolder.role}-${roleHolder.holder}`} className="border-b border-dl-border pb-3">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium">{roleHolder.role}</p>
                      <span className="text-xs bg-dl-bg-alt text-dl-gray px-2 py-1 font-dl-mono">
                        {roleHolder.holderType}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <ProofLink type="address" value={roleHolder.holder} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-dl-border p-6">
              <SectionHeading>Configuration Parameters</SectionHeading>
              <div className="space-y-3">
                {(data.parameters || []).map((param: ParameterEntry) => (
                  <div key={param.name} className="flex justify-between items-center border-b border-dl-border pb-3">
                    <div>
                      <p className="font-medium">{param.name}</p>
                      <p className="text-xs text-dl-gray">Last updated: {param.lastChanged}</p>
                    </div>
                    <p className="font-dl-mono text-dl-gold">{param.currentValue}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Pending Timelock Operations</SectionHeading>
            {!data.timelockQueue || data.timelockQueue.length === 0 ? (
              <p className="text-dl-gray">No pending operations</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dl-border">
                  <thead>
                    <tr className="bg-dl-bg-alt">
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">ID</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Operation</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Target</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Executable At</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dl-border">
                    {(data.timelockQueue || []).map((op: TimelockOperation) => (
                      <tr key={op.id}>
                        <td className="px-4 py-3 text-sm font-dl-mono">{op.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-sm">{op.functionName}</td>
                        <td className="px-4 py-3 text-sm">
                          <ProofLink type="address" value={op.target} />
                        </td>
                        <td className="px-4 py-3 text-sm font-dl-mono">{op.eta}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-dl-mono ${
                            op.status === 'pending' ? 'bg-dl-bg-alt text-dl-gold' :
                            op.status === 'ready' ? 'bg-dl-bg-alt text-dl-forest' :
                            'bg-dl-bg-alt text-dl-gray'
                          }`}>
                            {op.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border border-dl-border p-6 mt-6">
            <SectionHeading>Emergency Controls</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 border ${isPaused ? 'border-dl-error' : 'border-dl-border'}`}>
                <p className="text-sm text-dl-gray">System Status</p>
                <p className={`text-xl font-dl-mono ${isPaused ? 'text-dl-error' : 'text-dl-forest'}`}>
                  {isPaused ? 'PAUSED' : 'ACTIVE'}
                </p>
              </div>
              <div className={`p-4 border ${isLendingPaused ? 'border-dl-border' : 'border-dl-border'}`}>
                <p className="text-sm text-dl-gray">Lending</p>
                <p className={`text-xl font-dl-mono ${isLendingPaused ? 'text-dl-gold' : 'text-dl-forest'}`}>
                  {isLendingPaused ? 'PAUSED' : 'ACTIVE'}
                </p>
              </div>
              <div className="p-4 border border-dl-border">
                <p className="text-sm text-dl-gray">Emergency Controls</p>
                <p className="text-xl font-dl-mono text-dl-navy">{(data.emergencyControls || []).length} configured</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-dl-gray">Failed to load governance data</p>
      )}
    </DesignLawLayout>
  );
}
