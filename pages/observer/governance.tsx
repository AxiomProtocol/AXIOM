/**
 * Institutional Observer Dashboard - Governance Page
 * 
 * Roles, parameters, timelock queue, and emergency controls.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GovernanceData } from '../../server/services/observer/types';

function NavTabs({ current }: { current: string }) {
  const tabs = [
    { name: 'Overview', href: '/observer' },
    { name: 'Treasury', href: '/observer/treasury' },
    { name: 'Governance', href: '/observer/governance' },
    { name: 'Risk', href: '/observer/risk' },
    { name: 'Assets', href: '/observer/assets' },
    { name: 'Reports', href: '/observer/reports' },
  ];

  return (
    <nav className="flex space-x-4 mb-8">
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab.name === current ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {tab.name}
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

  return (
    <>
      <Head>
        <title>Governance | Institutional Observer | Axiom Protocol</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Governance</h1>
            <p className="mt-2 text-gray-600">Roles, permissions, parameters, and timelock operations</p>
          </div>

          <NavTabs current="Governance" />

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : data ? (
            <>
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Timelock Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Minimum Delay</p>
                    <p className="text-xl font-bold">{data.timelockStatus.minDelay / 3600} hours</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Max Delay Cap</p>
                    <p className="text-xl font-bold">{data.timelockStatus.maxDelay / 86400} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Configuration</p>
                    <p className={`text-xl font-bold ${data.timelockStatus.configurationLocked ? 'text-green-600' : 'text-yellow-600'}`}>
                      {data.timelockStatus.configurationLocked ? 'LOCKED' : 'CONFIGURABLE'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Lock Timestamp</p>
                    <p className="text-xl font-bold">{data.timelockStatus.lockTimestamp || 'Not locked'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Holders</h2>
                  <div className="space-y-4">
                    {data.roles.map((role) => (
                      <div key={role.role} className="border-b pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{role.role}</p>
                            <a
                              href={`https://arbiscan.io/address/${role.holder}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              {role.holder.slice(0, 8)}...{role.holder.slice(-6)}
                            </a>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${
                            role.holderType === 'safe' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {role.holderType.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Controls</h2>
                  <div className="space-y-4">
                    {data.emergencyControls.map((control) => (
                      <div key={control.name} className="flex justify-between items-center border-b pb-3">
                        <div>
                          <p className="font-medium">{control.name}</p>
                          <p className="text-sm text-gray-500">{control.holder} ({control.policy})</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          control.currentState === 'active' ? 'bg-red-100 text-red-800' :
                          control.currentState === 'inactive' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {control.currentState.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Timelock Queue</h2>
                {data.timelockQueue.length === 0 ? (
                  <p className="text-gray-500">No pending timelock operations</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Function</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.timelockQueue.map((op) => (
                        <tr key={op.id}>
                          <td className="px-4 py-3 text-sm font-mono">{op.id.slice(0, 10)}...</td>
                          <td className="px-4 py-3 text-sm">{op.targetName}</td>
                          <td className="px-4 py-3 text-sm">{op.functionName}</td>
                          <td className="px-4 py-3 text-sm">{op.eta}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded ${
                              op.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              op.status === 'ready' ? 'bg-green-100 text-green-800' :
                              op.status === 'executed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {op.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Parameter Registry</h2>
                {data.parameters.length === 0 ? (
                  <p className="text-gray-500">No parameter changes recorded</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Changed</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tx</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.parameters.map((param) => (
                        <tr key={param.name}>
                          <td className="px-4 py-3 text-sm font-medium">{param.name}</td>
                          <td className="px-4 py-3 text-sm">{param.currentValue}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{param.lastChanged}</td>
                          <td className="px-4 py-3 text-sm">
                            <a href={`https://arbiscan.io/tx/${param.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                              {param.txHash.slice(0, 8)}...
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
