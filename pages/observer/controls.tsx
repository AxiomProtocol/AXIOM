import React from 'react';
import { ObserverLayout, ObserverCard, ProofLink } from '../../components/observer/ObserverLayout';

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
    delay: '24 HOURS',
    contracts: ['All AccessControl'],
    riskLevel: 'high'
  },
  {
    power: 'Update Risk Parameters',
    holder: TIMELOCK,
    holderType: 'timelock',
    delay: '24 HOURS',
    contracts: ['RiskConfig', 'DSCRRiskConfig'],
    riskLevel: 'medium'
  },
  {
    power: 'Modify Treasury Routing',
    holder: TIMELOCK,
    holderType: 'timelock',
    delay: '24 HOURS',
    contracts: ['AxiomTreasuryAndRevenueHub'],
    riskLevel: 'high'
  },
  {
    power: 'Update Loan Products',
    holder: TIMELOCK,
    holderType: 'timelock',
    delay: '24 HOURS',
    contracts: ['ProductRegistry'],
    riskLevel: 'medium'
  },
  {
    power: 'Operator Actions',
    holder: OPERATOR_EOA,
    holderType: 'eoa',
    delay: 'IMMEDIATE',
    contracts: ['FixFlipManager', 'DSCRLoanManager'],
    riskLevel: 'medium'
  }
];

const riskColors = {
  low: 'bg-teal-100 text-teal-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

const holderTypeLabels = {
  safe: 'Multisig',
  eoa: 'EOA',
  timelock: 'Timelock',
  contract: 'Contract'
};

const holderTypeColors = {
  safe: 'bg-purple-100 text-purple-800',
  eoa: 'bg-blue-100 text-blue-800',
  timelock: 'bg-amber-100 text-amber-800',
  contract: 'bg-gray-100 text-gray-800'
};

export default function ObserverControls() {
  const immediatePowers = POWERS.filter(p => p.delay === 'IMMEDIATE');
  const timelockPowers = POWERS.filter(p => p.delay !== 'IMMEDIATE');

  return (
    <ObserverLayout
      title="Controls"
      description="Who can pause, parameter-change, and admin operations"
      currentTab="controls"
    >
      <ObserverCard title="Immediate Powers (No Delay)" className="mb-6">
        <p className="text-sm text-gray-600 mb-4">
          These powers can be exercised immediately without timelock delay. Used for emergency response.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Power</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holder</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contracts</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {immediatePowers.map((power, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm font-medium">{power.power}</td>
                  <td className="px-4 py-3 text-sm">
                    {power.holder.startsWith('0x') ? (
                      <ProofLink type="address" value={power.holder} />
                    ) : (
                      <span className="font-mono text-xs">{power.holder}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded ${holderTypeColors[power.holderType]}`}>
                      {holderTypeLabels[power.holderType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{power.contracts.join(', ')}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded ${riskColors[power.riskLevel]}`}>
                      {power.riskLevel.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ObserverCard>

      <ObserverCard title="Timelocked Powers (24h Delay)" className="mb-6">
        <p className="text-sm text-gray-600 mb-4">
          These powers require a 24-hour timelock delay. Actions are queued and can be cancelled during the delay period.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Power</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holder</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delay</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contracts</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timelockPowers.map((power, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm font-medium">{power.power}</td>
                  <td className="px-4 py-3 text-sm">
                    {power.holder.startsWith('0x') ? (
                      <ProofLink type="address" value={power.holder} />
                    ) : (
                      <span className="font-mono text-xs">{power.holder}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 text-xs rounded bg-amber-100 text-amber-800">
                      {power.delay}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{power.contracts.join(', ')}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded ${riskColors[power.riskLevel]}`}>
                      {power.riskLevel.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ObserverCard>

      <ObserverCard title="Key Addresses">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Governance Multisig</p>
            <ProofLink type="address" value={GNOSIS_SAFE} />
            <p className="text-xs text-gray-500 mt-2">3-of-5 Gnosis Safe</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Timelock Controller</p>
            <ProofLink type="address" value={TIMELOCK} />
            <p className="text-xs text-gray-500 mt-2">24h minimum delay</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Operator EOA</p>
            <ProofLink type="address" value={OPERATOR_EOA} />
            <p className="text-xs text-gray-500 mt-2">Day-to-day operations</p>
          </div>
        </div>
      </ObserverCard>
    </ObserverLayout>
  );
}
