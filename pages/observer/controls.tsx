import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { ProofLink } from '../../components/observer/ObserverLayout';

const GNOSIS_SAFE = '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d';
const AXM_ADMIN_SAFE = '0x93696b537d814Aed5875C4490143195983AED365';
const OPERATOR_EOA = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
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
  low: 'bg-dl-bg-alt text-dl-forest',
  medium: 'bg-dl-bg-alt text-dl-gold',
  high: 'bg-dl-bg-alt text-dl-error',
  critical: 'bg-dl-bg-alt text-dl-error'
};

const holderTypeLabels = {
  safe: 'Multisig',
  eoa: 'EOA',
  timelock: 'Timelock',
  contract: 'Contract'
};

const holderTypeColors = {
  safe: 'bg-dl-bg-alt text-dl-navy',
  eoa: 'bg-dl-bg-alt text-dl-navy',
  timelock: 'bg-dl-bg-alt text-dl-gold',
  contract: 'bg-dl-bg-alt text-dl-gray'
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
  { id: 'reserve-performance', label: 'Reserve Performance', href: '/observer/reserve-performance' },
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

export default function ObserverControls() {
  const immediatePowers = POWERS.filter(p => p.delay === 'IMMEDIATE');
  const timelockPowers = POWERS.filter(p => p.delay !== 'IMMEDIATE');

  return (
    <DesignLawLayout>
      <Head>
        <title>Controls | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Who can pause, parameter-change, and admin operations" />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy">Controls</h1>
      <p className="text-dl-gray mt-1 mb-6">Who can pause, parameter-change, and admin operations</p>

      <ObserverNav current="controls" />

      <div className="border border-dl-border p-6 mb-6">
        <SectionHeading>Immediate Powers (No Delay)</SectionHeading>
        <p className="text-sm text-dl-gray mb-4">
          These powers can be exercised immediately without timelock delay. Used for emergency response.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-dl-border">
            <thead>
              <tr className="bg-dl-bg-alt">
                <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Power</th>
                <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Holder</th>
                <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Type</th>
                <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Contracts</th>
                <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dl-border">
              {immediatePowers.map((power, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm font-medium">{power.power}</td>
                  <td className="px-4 py-3 text-sm">
                    {power.holder.startsWith('0x') ? (
                      <ProofLink type="address" value={power.holder} />
                    ) : (
                      <span className="font-dl-mono text-xs">{power.holder}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs font-dl-mono ${holderTypeColors[power.holderType]}`}>
                      {holderTypeLabels[power.holderType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-dl-gray">{power.contracts.join(', ')}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs font-dl-mono ${riskColors[power.riskLevel]}`}>
                      {power.riskLevel.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-dl-border p-6 mb-6">
        <SectionHeading>Timelocked Powers (24h Delay)</SectionHeading>
        <p className="text-sm text-dl-gray mb-4">
          These powers require a 24-hour timelock delay. Actions are queued and can be cancelled during the delay period.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-dl-border">
            <thead>
              <tr className="bg-dl-bg-alt">
                <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Power</th>
                <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Holder</th>
                <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Delay</th>
                <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Contracts</th>
                <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dl-border">
              {timelockPowers.map((power, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm font-medium">{power.power}</td>
                  <td className="px-4 py-3 text-sm">
                    {power.holder.startsWith('0x') ? (
                      <ProofLink type="address" value={power.holder} />
                    ) : (
                      <span className="font-dl-mono text-xs">{power.holder}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 text-xs font-dl-mono bg-dl-bg-alt text-dl-gold">
                      {power.delay}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-dl-gray">{power.contracts.join(', ')}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs font-dl-mono ${riskColors[power.riskLevel]}`}>
                      {power.riskLevel.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-dl-border p-6 mb-6">
        <SectionHeading>Key Addresses</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-dl-bg-alt p-4 border border-dl-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-dl-mono text-xs border border-dl-forest text-dl-forest px-1.5 py-0.5">SAFE</span>
              <p className="text-sm text-dl-gray">Governance Multisig</p>
            </div>
            <ProofLink type="address" value={GNOSIS_SAFE} />
            <p className="text-xs text-dl-gray mt-2 font-dl-mono">3-of-5 Gnosis Safe — emergency pause, sweep, timelock proposer</p>
            <a href={`https://app.safe.global/home?safe=arb1:${GNOSIS_SAFE}`} target="_blank" rel="noopener noreferrer"
              className="font-dl-mono text-xs text-dl-navy underline mt-1 block">View on app.safe.global →</a>
          </div>
          <div className="bg-dl-bg-alt p-4 border border-dl-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-dl-mono text-xs border border-dl-forest text-dl-forest px-1.5 py-0.5">SAFE</span>
              <p className="text-sm text-dl-gray">AXM Admin Safe</p>
            </div>
            <ProofLink type="address" value={AXM_ADMIN_SAFE} />
            <p className="text-xs text-dl-gray mt-2 font-dl-mono">AXM token minting and admin authority</p>
            <a href={`https://app.safe.global/home?safe=arb1:${AXM_ADMIN_SAFE}`} target="_blank" rel="noopener noreferrer"
              className="font-dl-mono text-xs text-dl-navy underline mt-1 block">View on app.safe.global →</a>
          </div>
          <div className="bg-dl-bg-alt p-4 border border-dl-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-dl-mono text-xs border border-dl-gold text-dl-gold px-1.5 py-0.5">TIMELOCK</span>
              <p className="text-sm text-dl-gray">Timelock Controller</p>
            </div>
            <ProofLink type="address" value={TIMELOCK} />
            <p className="text-xs text-dl-gray mt-2 font-dl-mono">24h minimum delay — Safe holds PROPOSER_ROLE</p>
          </div>
          <div className="bg-dl-bg-alt p-4 border border-dl-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-dl-mono text-xs border border-dl-gold text-dl-gold px-1.5 py-0.5">EOA</span>
              <p className="text-sm text-dl-gray">Deployer / Operator EOA</p>
            </div>
            <ProofLink type="address" value={OPERATOR_EOA} />
            <p className="text-xs text-dl-gray mt-2 font-dl-mono">Current holder of most admin roles — migrating to Safe/Timelock</p>
          </div>
        </div>
        <div className="border border-dl-border bg-dl-bg-alt px-4 py-3">
          <p className="font-dl-mono text-xs text-dl-gray">
            <span className="text-dl-gold font-semibold">Migration in Progress:</span>{' '}
            Most admin roles currently reside on the Deployer EOA. Critical roles are being transferred to the Governance Safe and Timelock via Task #42.
            See Governance Migration tab in Founder Operations for the role-by-role tracker.
          </p>
        </div>
      </div>
    </DesignLawLayout>
  );
}
