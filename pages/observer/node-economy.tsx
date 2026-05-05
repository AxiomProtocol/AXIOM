import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

interface NodeEconomyData {
  success: boolean;
  timestamp: string;
  systemStatus: string;
  nodes: {
    total: number;
    active: number;
    byClass: {
      storage: number;
      execution: number;
      indexing: number;
      research: number;
    };
  };
  rewards: {
    currentEpoch: number;
    epochStartTime: string | null;
    epochDurationDays: number;
    maxRewardsPerEpoch: string;
    timeUntilNextEpochHours: number;
  };
  slashing: {
    totalSlashed: string;
    totalEscrowed: string;
    availableForWithdrawal: string;
  };
  stakeRequirements: Array<{
    nodeClass: string;
    minStake: string;
    lockPeriodDays: number;
    active: boolean;
  }>;
  slashingParams: Array<{
    nodeClass: string;
    slashPercent: number;
    cooldownHours: number;
    maxSlashes: number;
    active: boolean;
  }>;
  contracts: Record<string, string>;
  proofLinks: Array<{ label: string; url: string }>;
}

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

function MetricCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string; color?: string }) {
  return (
    <div className="border border-dl-border p-4">
      <div className="text-sm text-dl-gray mb-1">{label}</div>
      <div className="text-2xl font-dl-mono text-dl-navy">{value}</div>
      {subtitle && <div className="text-xs text-dl-gray mt-1">{subtitle}</div>}
    </div>
  );
}

function NodeClassCard({
  name,
  active,
  minStake,
  lockDays,
  slashPercent
}: {
  name: string;
  active: number;
  minStake: string;
  lockDays: number;
  slashPercent: number;
}) {
  const icons: Record<string, string> = {
    Storage: '💾',
    Execution: '⚡',
    Indexing: '📊',
    Research: '🔬',
  };

  return (
    <div className="border border-dl-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icons[name] || '🔷'}</span>
        <div>
          <h4 className="font-dl-serif text-dl-navy">{name}</h4>
          <span className="text-xs text-dl-gray">{active} active</span>
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-dl-gray">Min Stake</span>
          <span className="font-dl-mono font-medium">{minStake} ETH</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dl-gray">Lock Period</span>
          <span className="font-dl-mono font-medium">{lockDays} days</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dl-gray">Slash Rate</span>
          <span className="font-dl-mono font-medium text-dl-error">{slashPercent}%</span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isOperational = status === 'OPERATIONAL';
  return (
    <span className={`px-3 py-1 text-sm font-dl-mono ${isOperational ? 'bg-dl-bg-alt text-dl-forest' : 'bg-dl-bg-alt text-dl-gold'}`}>
      {status}
    </span>
  );
}

export default function NodeEconomyObserver() {
  const [data, setData] = useState<NodeEconomyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/observer/node-economy');
        if (!res.ok) throw new Error('Failed to fetch data');
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <DesignLawLayout>
      <Head>
        <title>Node Economy | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Decentralized infrastructure nodes" />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy">Node Economy</h1>
      <p className="text-dl-gray mt-1 mb-6">Decentralized infrastructure nodes: storage, execution, indexing, and research</p>

      <ObserverNav current="node-economy" />

      {loading ? (
        <p className="text-sm text-dl-gray font-dl-mono">Loading data...</p>
      ) : error ? (
        <div className="border border-dl-error p-4">
          <p className="text-sm text-dl-error">Error: {error}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="border border-dl-border p-6">
            <SectionHeading>System Overview</SectionHeading>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-dl-serif text-lg text-dl-navy">Node Network</h3>
                <p className="text-sm text-dl-gray">Layer 7 infrastructure</p>
              </div>
              <StatusBadge status={data.systemStatus} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Total Nodes"
                value={data.nodes.total}
              />
              <MetricCard
                label="Active Nodes"
                value={data.nodes.active}
              />
              <MetricCard
                label="Current Epoch"
                value={data.rewards.currentEpoch}
                subtitle={`${data.rewards.timeUntilNextEpochHours.toFixed(1)}h until next`}
              />
              <MetricCard
                label="Max Rewards/Epoch"
                value={`${parseFloat(data.rewards.maxRewardsPerEpoch).toFixed(2)} ETH`}
              />
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Node Classes</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.stakeRequirements.map((req, i) => (
                <NodeClassCard
                  key={req.nodeClass}
                  name={req.nodeClass}
                  active={data.nodes.byClass[req.nodeClass.toLowerCase() as keyof typeof data.nodes.byClass] || 0}
                  minStake={req.minStake}
                  lockDays={req.lockPeriodDays}
                  slashPercent={data.slashingParams[i]?.slashPercent || 0}
                />
              ))}
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Slashing &amp; Security</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <MetricCard
                label="Total Slashed"
                value={`${parseFloat(data.slashing.totalSlashed).toFixed(4)} ETH`}
              />
              <MetricCard
                label="In Escrow"
                value={`${parseFloat(data.slashing.totalEscrowed).toFixed(4)} ETH`}
                subtitle="Pending appeal resolution"
              />
              <MetricCard
                label="Available for Treasury"
                value={`${parseFloat(data.slashing.availableForWithdrawal).toFixed(4)} ETH`}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dl-border bg-dl-bg-alt">
                    <th className="text-left py-2 px-3 font-dl-mono text-xs text-dl-gray uppercase">Node Class</th>
                    <th className="text-right py-2 px-3 font-dl-mono text-xs text-dl-gray uppercase">Slash %</th>
                    <th className="text-right py-2 px-3 font-dl-mono text-xs text-dl-gray uppercase">Cooldown</th>
                    <th className="text-right py-2 px-3 font-dl-mono text-xs text-dl-gray uppercase">Max Before Suspend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slashingParams.map((params) => (
                    <tr key={params.nodeClass} className="border-b border-dl-border">
                      <td className="py-2 px-3 font-medium">{params.nodeClass}</td>
                      <td className="py-2 px-3 text-right text-dl-error font-dl-mono">{params.slashPercent}%</td>
                      <td className="py-2 px-3 text-right font-dl-mono">{params.cooldownHours}h</td>
                      <td className="py-2 px-3 text-right font-dl-mono">{params.maxSlashes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Verified Contracts</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.proofLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-dl-bg-alt text-dl-navy"
                >
                  <span className="font-medium">{link.label}</span>
                  <svg className="w-4 h-4 text-dl-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </DesignLawLayout>
  );
}
