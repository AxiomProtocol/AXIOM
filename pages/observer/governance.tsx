import React, { useState, useEffect } from 'react';
import { ObserverLayout, ObserverCard, ObserverLoading, ProofLink } from '../../components/observer/ObserverLayout';
import { GovernanceData, RoleHolder, ParameterEntry, TimelockOperation, EmergencyControl } from '../../server/services/observer/types';

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
    <ObserverLayout
      title="Governance"
      description="Roles, permissions, parameters, and timelock operations"
      currentTab="governance"
    >
      {loading ? (
        <ObserverLoading />
      ) : data ? (
        <>
          <ObserverCard title="Timelock Status" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Minimum Delay</p>
                <p className="text-xl font-bold text-amber-600">{data.timelockStatus ? (data.timelockStatus.minDelay / 3600) : 0} hours</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Max Delay Cap</p>
                <p className="text-xl font-bold text-purple-600">{data.timelockStatus ? (data.timelockStatus.maxDelay / 86400) : 0} days</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Configuration</p>
                <p className={`text-xl font-bold ${data.timelockStatus?.configurationLocked ? 'text-teal-600' : 'text-amber-600'}`}>
                  {data.timelockStatus?.configurationLocked ? 'LOCKED' : 'CONFIGURABLE'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lock Timestamp</p>
                <p className="text-xl font-bold text-gray-900">{data.timelockStatus?.lockTimestamp || 'Not locked'}</p>
              </div>
            </div>
          </ObserverCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ObserverCard title="Role Assignments">
              <div className="space-y-3">
                {(data.roles || []).map((roleHolder: RoleHolder) => (
                  <div key={`${roleHolder.role}-${roleHolder.holder}`} className="border-b border-gray-100 pb-3">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium">{roleHolder.role}</p>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {roleHolder.holderType}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <ProofLink type="address" value={roleHolder.holder} />
                    </div>
                  </div>
                ))}
              </div>
            </ObserverCard>

            <ObserverCard title="Configuration Parameters">
              <div className="space-y-3">
                {(data.parameters || []).map((param: ParameterEntry) => (
                  <div key={param.name} className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div>
                      <p className="font-medium">{param.name}</p>
                      <p className="text-xs text-gray-500">Last updated: {param.lastChanged}</p>
                    </div>
                    <p className="font-mono text-amber-600">{param.currentValue}</p>
                  </div>
                ))}
              </div>
            </ObserverCard>
          </div>

          <ObserverCard title="Pending Timelock Operations">
            {!data.timelockQueue || data.timelockQueue.length === 0 ? (
              <p className="text-gray-500">No pending operations</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Executable At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(data.timelockQueue || []).map((op: TimelockOperation) => (
                      <tr key={op.id}>
                        <td className="px-4 py-3 text-sm font-mono">{op.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-sm">{op.functionName}</td>
                        <td className="px-4 py-3 text-sm">
                          <ProofLink type="address" value={op.target} />
                        </td>
                        <td className="px-4 py-3 text-sm">{op.eta}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded ${
                            op.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            op.status === 'ready' ? 'bg-teal-100 text-teal-800' :
                            'bg-gray-100 text-gray-800'
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
          </ObserverCard>

          <ObserverCard title="Emergency Controls" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`rounded-xl p-4 ${isPaused ? 'bg-red-50 border border-red-200' : 'bg-teal-50 border border-teal-200'}`}>
                <p className="text-sm text-gray-600">System Status</p>
                <p className={`text-xl font-bold ${isPaused ? 'text-red-600' : 'text-teal-600'}`}>
                  {isPaused ? 'PAUSED' : 'ACTIVE'}
                </p>
              </div>
              <div className={`rounded-xl p-4 ${isLendingPaused ? 'bg-amber-50 border border-amber-200' : 'bg-teal-50 border border-teal-200'}`}>
                <p className="text-sm text-gray-600">Lending</p>
                <p className={`text-xl font-bold ${isLendingPaused ? 'text-amber-600' : 'text-teal-600'}`}>
                  {isLendingPaused ? 'PAUSED' : 'ACTIVE'}
                </p>
              </div>
              <div className="rounded-xl p-4 bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-600">Emergency Controls</p>
                <p className="text-xl font-bold text-gray-900">{(data.emergencyControls || []).length} configured</p>
              </div>
            </div>
          </ObserverCard>
        </>
      ) : (
        <p className="text-gray-500">Failed to load governance data</p>
      )}
    </ObserverLayout>
  );
}
