/**
 * Institutional Observer Dashboard - Controls & Powers Page
 * 
 * Summarizes who can pause/parameter-change, derived from permissions-diff.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

function NavTabs({ current }: { current: string }) {
  const tabs = [
    { name: 'Overview', href: '/observer' },
    { name: 'Treasury', href: '/observer/treasury' },
    { name: 'Governance', href: '/observer/governance' },
    { name: 'Risk', href: '/observer/risk' },
    { name: 'Assets', href: '/observer/assets' },
    { name: 'Controls', href: '/observer/controls' },
    { name: 'Reports', href: '/observer/reports' },
  ];

  return (
    <nav className="flex space-x-4 mb-8 overflow-x-auto">
      {tabs.map((tab) => (
        <Link key={tab.name} href={tab.href}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            tab.name === current ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {tab.name}
        </Link>
      ))}
    </nav>
  );
}

const GNOSIS_SAFE = '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d';
const OPERATOR_EOA = '0xDFf9e47eb007bF02e47477d577De9ffA99791528';
const TIMELOCK = '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899';

interface PowerEntry {
  power: string;
  holder: string;
  holderType: 'safe' | 'eoa' | 'timelock' | 'contract';
  delay: string;
  contracts: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const POWERS: PowerEntry[] = [
  {
    power: 'Emergency Pause (All Contracts)',
    holder: GNOSIS_SAFE,
    holderType: 'safe',
    delay: 'IMMEDIATE',
    contracts: ['All Pausable'],
    riskLevel: 'low'
  },
  {
    power: 'Emergency Pause (Timelock)',
    holder: GNOSIS_SAFE,
    holderType: 'safe',
    delay: 'IMMEDIATE',
    contracts: ['AxiomTimelockController'],
    riskLevel: 'low'
  },
  {
    power: 'Circuit Breaker Trigger',
    holder: 'CIRCUIT_BREAKER_ROLE',
    holderType: 'contract',
    delay: 'IMMEDIATE',
    contracts: ['AxiomTimelockController', 'RiskConfig'],
    riskLevel: 'low'
  },
  {
    power: 'Lending Pause',
    holder: GNOSIS_SAFE,
    holderType: 'safe',
    delay: 'IMMEDIATE',
    contracts: ['GovernanceHub'],
    riskLevel: 'low'
  },
  {
    power: 'Emergency Sweep (Fund Extraction)',
    holder: GNOSIS_SAFE,
    holderType: 'safe',
    delay: 'IMMEDIATE',
    contracts: ['AxiomTreasuryAndRevenueHub'],
    riskLevel: 'high'
  },
  {
    power: 'Unpause (All Contracts)',
    holder: GNOSIS_SAFE,
    holderType: 'safe',
    delay: 'IMMEDIATE',
    contracts: ['All Pausable'],
    riskLevel: 'medium'
  },
  {
    power: 'Grant/Revoke Roles',
    holder: TIMELOCK,
    holderType: 'timelock',
    delay: '24+ hours',
    contracts: ['All AccessControl'],
    riskLevel: 'critical'
  },
  {
    power: 'Set Fee Rates',
    holder: TIMELOCK,
    holderType: 'timelock',
    delay: '24+ hours',
    contracts: ['AxiomV2'],
    riskLevel: 'high'
  },
  {
    power: 'Set Treasury Allocations',
    holder: TIMELOCK,
    holderType: 'timelock',
    delay: '24+ hours',
    contracts: ['AxiomTreasuryAndRevenueHub'],
    riskLevel: 'high'
  },
  {
    power: 'Set Risk Parameters (LTV, Exposure)',
    holder: TIMELOCK,
    holderType: 'timelock',
    delay: '24+ hours',
    contracts: ['RiskConfig', 'DSCRRiskConfig'],
    riskLevel: 'high'
  },
  {
    power: 'Set Interest Rates',
    holder: TIMELOCK,
    holderType: 'timelock',
    delay: '24+ hours',
    contracts: ['FixFlipManager', 'DSCRLoanManager'],
    riskLevel: 'medium'
  },
  {
    power: 'Lock Forever (Irreversible)',
    holder: TIMELOCK,
    holderType: 'timelock',
    delay: '24+ hours',
    contracts: ['AxiomTimelockController'],
    riskLevel: 'critical'
  },
  {
    power: 'Day-to-Day Operations',
    holder: OPERATOR_EOA,
    holderType: 'eoa',
    delay: 'None',
    contracts: ['Multiple'],
    riskLevel: 'low'
  }
];

interface RoleInfo {
  role: string;
  holder: string;
  holderType: string;
  capabilities: string[];
}

const ROLES: RoleInfo[] = [
  {
    role: 'DEFAULT_ADMIN_ROLE',
    holder: GNOSIS_SAFE,
    holderType: 'Gnosis Safe (Multisig)',
    capabilities: ['All privileges', 'Role management via timelock', 'Emergency unpause']
  },
  {
    role: 'GUARDIAN_ROLE',
    holder: GNOSIS_SAFE,
    holderType: 'Gnosis Safe (Multisig)',
    capabilities: ['Emergency pause', 'Cancel queued operations', 'Emergency sweep']
  },
  {
    role: 'OPERATOR_ROLE',
    holder: OPERATOR_EOA,
    holderType: 'EOA (Deployer)',
    capabilities: ['Route funds', 'Execute draws', 'Update scores', 'Approve loans']
  },
  {
    role: 'RISK_COMMITTEE_ROLE',
    holder: GNOSIS_SAFE,
    holderType: 'Gnosis Safe (Multisig)',
    capabilities: ['Propose risk parameter changes']
  },
  {
    role: 'CIRCUIT_BREAKER_ROLE',
    holder: 'Automated/Pending',
    holderType: 'Contract/Bot',
    capabilities: ['Trigger circuit breaker on anomaly detection']
  }
];

export default function ObserverControls() {
  const [timelockLocked, setTimelockLocked] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/observer/governance');
        const result = await response.json();
        if (result.success) {
          setTimelockLocked(result.data.timelockStatus?.configurationLocked || false);
        }
      } catch (err) {
        console.error('Failed to fetch governance data');
      }
    }
    fetchData();
  }, []);

  const riskColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  const holderTypeLabels = {
    safe: 'Gnosis Safe',
    eoa: 'EOA',
    timelock: 'Via Timelock',
    contract: 'Contract/Bot'
  };

  return (
    <>
      <Head>
        <title>Controls & Powers | Institutional Observer | Axiom Protocol</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Controls & Powers</h1>
            <p className="mt-2 text-gray-600">Who can do what across the protocol</p>
          </div>

          <NavTabs current="Controls" />

          <div className={`rounded-lg p-4 mb-8 ${timelockLocked ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center">
              {timelockLocked ? (
                <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
              )}
              <div>
                <h3 className={`font-semibold ${timelockLocked ? 'text-green-800' : 'text-yellow-800'}`}>
                  Timelock Status: {timelockLocked ? 'LOCKED FOREVER' : 'CONFIGURABLE'}
                </h3>
                <p className={`text-sm ${timelockLocked ? 'text-green-700' : 'text-yellow-700'}`}>
                  {timelockLocked 
                    ? 'Governance delays cannot be reduced. Maximum institutional assurance.'
                    : 'Timelock is in configurable mode. Lock Forever has NOT been activated.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Powers Matrix</h2>
            <p className="text-gray-600 mb-4">
              All administrative powers organized by holder and delay requirement.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Power</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holder</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delay</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affected Contracts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {POWERS.map((power, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{power.power}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-gray-600">{holderTypeLabels[power.holderType]}</span>
                        {power.holderType !== 'contract' && (
                          <a
                            href={`https://arbiscan.io/address/${power.holder}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-blue-600 hover:text-blue-800 font-mono"
                          >
                            {power.holder.slice(0, 8)}...
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs rounded ${
                          power.delay === 'IMMEDIATE' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {power.delay}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs rounded uppercase ${riskColors[power.riskLevel]}`}>
                          {power.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {power.contracts.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Assignments</h2>
            <p className="text-gray-600 mb-4">
              Current role holders and their capabilities.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ROLES.map((role) => (
                <div key={role.role} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{role.role}</h3>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{role.holderType}</span>
                  </div>
                  {role.holder.startsWith('0x') ? (
                    <a
                      href={`https://arbiscan.io/address/${role.holder}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 font-mono"
                    >
                      {role.holder.slice(0, 10)}...{role.holder.slice(-8)}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-500">{role.holder}</span>
                  )}
                  <ul className="mt-3 space-y-1">
                    {role.capabilities.map((cap, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-center">
                        <svg className="w-3 h-3 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency vs Timelocked</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="font-medium text-gray-900 mb-2">Emergency (IMMEDIATE)</h3>
                <p className="text-sm text-gray-600 mb-3">
                  These functions execute immediately without any delay. Used for safety mechanisms.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• pause() - Halt all operations</li>
                  <li>• emergencyPause() - System-wide halt</li>
                  <li>• triggerCircuitBreaker() - Automated halt</li>
                  <li>• emergencySweep() - Extract funds</li>
                  <li>• pauseLending() - Halt lending only</li>
                </ul>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900 mb-2">Timelocked (24h+ delay)</h3>
                <p className="text-sm text-gray-600 mb-3">
                  These functions require scheduling and waiting. Provides reaction time.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• grantRole() / revokeRole()</li>
                  <li>• setFeeRates()</li>
                  <li>• setAllocation()</li>
                  <li>• setMaxLTV() / setExposureLimits()</li>
                  <li>• lockForever()</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            Source: <a href="https://arbiscan.io/address/0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">AxiomTimelockController</a>
          </div>
        </div>
      </div>
    </>
  );
}
