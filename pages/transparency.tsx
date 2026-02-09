import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

interface TreasuryMetrics {
  totalAUM: string;
  seriesABalance: string;
  seriesBBalance: string;
  activeLoansCount: number;
  totalLoansOriginated: string;
  totalRepaid: string;
  totalInterestEarned: string;
  utilizationRate: number;
  axusdSupply: string;
  reserveRatio: number;
  pendingCommitments: string;
  investorCount: number;
}

interface RecentActivity {
  id: string;
  type: string;
  amount: string;
  description: string;
  timestamp: string;
  txHash?: string;
}

interface ContractInfo {
  name: string;
  address: string;
  network: string;
  verified: boolean;
  description: string;
}

const CONTRACTS: ContractInfo[] = [
  { name: 'AxiomV2 (AXM Token)', address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', network: 'Arbitrum One', verified: true, description: 'ERC20 governance token' },
  { name: 'AxiomIdentityComplianceHub', address: '0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED', network: 'Arbitrum One', verified: true, description: 'KYC/AML identity verification' },
  { name: 'AxiomTreasuryAndRevenueHub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929', network: 'Arbitrum One', verified: true, description: 'Multi-sig treasury management' },
  { name: 'AxiomStakingAndEmissionsHub', address: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885', network: 'Arbitrum One', verified: true, description: 'Tiered staking and rewards' },
  { name: 'CitizenCredentialRegistry', address: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344', network: 'Arbitrum One', verified: true, description: 'Citizen identity credentials' },
  { name: 'AxiomLandAndAssetRegistry', address: '0xaB15907b124620E165aB6E464eE45b178d8a6591', network: 'Arbitrum One', verified: true, description: 'Land and asset registration' },
  { name: 'LeaseAndRentEngine', address: '0x26a20dEa57F951571AD6e518DFb3dC60634D5297', network: 'Arbitrum One', verified: true, description: 'KeyGrow rent-to-own engine' },
  { name: 'DePINNodeSuite', address: '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1', network: 'Arbitrum One', verified: true, description: 'DePIN node management' },
  { name: 'AxiomExchangeHub', address: '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D', network: 'Arbitrum One', verified: true, description: 'Internal DEX' },
];

const SECURITY_FEATURES = [
  { name: 'OpenZeppelin Contracts', status: 'active', description: 'Battle-tested security standards', icon: '🛡️' },
  { name: 'Role-Based Access Control', status: 'active', description: 'Granular permission management', icon: '🔐' },
  { name: 'Pausable Contracts', status: 'active', description: 'Emergency halt capabilities', icon: '⏸️' },
  { name: 'Reentrancy Guards', status: 'active', description: 'Protection against reentrancy attacks', icon: '🚫' },
  { name: 'Multi-Sig Treasury', status: 'active', description: 'Multiple approvals for fund movements', icon: '✍️' },
  { name: 'SafeERC20 Transfers', status: 'active', description: 'Safe token transfer handling', icon: '💸' },
];

const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

const formatNumber = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US').format(num);
};

export default function TransparencyPage() {
  const [expandedContract, setExpandedContract] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<TreasuryMetrics | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [treasuryLoading, setTreasuryLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchTreasuryData();
    const interval = setInterval(fetchTreasuryData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchTreasuryData() {
    try {
      const response = await fetch('/api/transparency/treasury');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setActivities(data.activities || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch treasury data:', error);
    } finally {
      setTreasuryLoading(false);
    }
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>Transparency Dashboard | Axiom</title>
        <meta name="description" content="Complete visibility into Axiom's smart contracts, security, and governance." />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">Transparency Dashboard</h1>
      <p className="text-sm text-dl-gray mb-8">Complete visibility into Axiom's smart contracts, treasury, and security infrastructure.</p>

      <section id="treasury" className="mb-10">
        <SectionHeading>Treasury Dashboard</SectionHeading>
        <p className="text-sm text-dl-gray mb-4">Real-time visibility into Axiom Nexus lending pools and reserves</p>
        {lastUpdated && (
          <p className="text-xs text-dl-gray font-dl-mono mb-4">Last updated: {lastUpdated.toLocaleTimeString()}</p>
        )}

        {treasuryLoading ? (
          <p className="text-sm text-dl-gray font-dl-mono py-10 text-center">Loading treasury data...</p>
        ) : (
          <>
            {parseFloat(metrics?.totalAUM || '0') === 0 && (
              <div className="border border-dl-border bg-dl-bg-alt p-4 mb-6">
                <p className="text-sm font-medium text-dl-navy">Pre-Launch Phase</p>
                <p className="text-xs text-dl-gray mt-1">Lending fund is accepting investor commitments. Values will update as capital is deployed.</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-6">
              <div className="px-4 py-4 bg-dl-bg border-r border-b md:border-b-0 border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Total AUM</p>
                <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatCurrency(metrics?.totalAUM || 0)}</p>
                <p className="text-xs text-dl-gray mt-1">Assets Under Management</p>
              </div>
              <div className="px-4 py-4 bg-dl-bg-alt border-r border-b md:border-b-0 border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Active Loans</p>
                <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatNumber(metrics?.activeLoansCount || 0)}</p>
                <p className="text-xs text-dl-gray mt-1">Currently outstanding</p>
              </div>
              <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
                <p className="text-xs text-dl-gray mb-1">Total Originated</p>
                <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatCurrency(metrics?.totalLoansOriginated || 0)}</p>
                <p className="text-xs text-dl-gray mt-1">Lifetime loan volume</p>
              </div>
              <div className="px-4 py-4 bg-dl-bg-alt">
                <p className="text-xs text-dl-gray mb-1">Interest Earned</p>
                <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatCurrency(metrics?.totalInterestEarned || 0)}</p>
                <p className="text-xs text-dl-gray mt-1">Revenue generated</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="border border-dl-border p-5">
                <h3 className="font-dl-serif text-base text-dl-navy mb-4">Fund Allocation</h3>
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-dl-navy">Series A: Fix & Flip</span>
                    <span className="text-sm text-dl-gray font-dl-mono">{formatCurrency(metrics?.seriesABalance || 0)}</span>
                  </div>
                  <div className="h-1 bg-dl-bg-alt border border-dl-border overflow-hidden">
                    <div className="h-full bg-dl-navy" style={{ width: '35%' }} />
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-dl-navy">Series B: DSCR Rental</span>
                    <span className="text-sm text-dl-gray font-dl-mono">{formatCurrency(metrics?.seriesBBalance || 0)}</span>
                  </div>
                  <div className="h-1 bg-dl-bg-alt border border-dl-border overflow-hidden">
                    <div className="h-full bg-dl-navy" style={{ width: '65%' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dl-border">
                  <div className="text-center">
                    <p className="font-dl-mono text-lg font-semibold text-dl-navy">{metrics?.utilizationRate?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-dl-gray">Utilization Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatNumber(metrics?.investorCount || 0)}</p>
                    <p className="text-xs text-dl-gray">Investors</p>
                  </div>
                </div>
              </div>

              <div className="border border-dl-border p-5">
                <h3 className="font-dl-serif text-base text-dl-navy mb-4">Recent Activity</h3>
                <div className="flex flex-col gap-3">
                  {activities.length > 0 ? activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex justify-between items-center border-b border-dl-border pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <p className="text-sm text-dl-navy">{activity.description}</p>
                        <p className="text-xs text-dl-gray font-dl-mono mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                      </div>
                      <span className="text-sm text-dl-navy font-dl-mono font-medium">{formatCurrency(activity.amount)}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-dl-gray text-center py-6">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section id="contracts" className="mb-10">
        <SectionHeading>Smart Contracts</SectionHeading>
        <p className="text-sm text-dl-gray mb-4">29 contracts verified on Arbitrum One</p>

        <div className="flex flex-col gap-0 border border-dl-border">
          {CONTRACTS.map((contract, i) => (
            <div
              key={i}
              className={`p-4 border-b border-dl-border last:border-b-0 cursor-pointer ${expandedContract === i ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
              onClick={() => setExpandedContract(expandedContract === i ? null : i)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 ${contract.verified ? 'bg-dl-forest' : 'bg-dl-navy'}`} />
                  <div>
                    <h3 className="text-sm font-medium text-dl-navy">{contract.name}</h3>
                    {expandedContract === i && (
                      <p className="text-xs text-dl-gray mt-1">{contract.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-dl-gray border border-dl-border px-2 py-1">{contract.network}</span>
                  <span className="text-dl-gray text-xs">{expandedContract === i ? '▲' : '▼'}</span>
                </div>
              </div>
              {expandedContract === i && (
                <div className="mt-3 pt-3 border-t border-dl-border">
                  <code className="text-xs text-dl-gray font-dl-mono break-all">{contract.address}</code>
                  <a
                    href={`https://arbiscan.io/address/${contract.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 text-xs text-dl-navy font-medium underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on Arbiscan →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="mb-10">
        <SectionHeading>Security Infrastructure</SectionHeading>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border border-dl-border">
          {SECURITY_FEATURES.map((feature, i) => (
            <div
              key={i}
              className="p-4 border-r border-b border-dl-border last:border-r-0"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{feature.icon}</span>
                <h3 className="text-sm font-medium text-dl-navy">{feature.name}</h3>
              </div>
              <p className="text-xs text-dl-gray leading-relaxed">{feature.description}</p>
              <div className="mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-dl-forest" />
                <span className="text-xs text-dl-forest font-dl-mono">Active</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </DesignLawLayout>
  );
}
