import React, { useState, useEffect } from 'react';
import { ObserverLayout, ObserverCard, ObserverLoading } from '../../components/observer/ObserverLayout';

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

function MetricCard({ label, value, subtitle, color }: { label: string; value: string | number; subtitle?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
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
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icons[name] || '🔷'}</span>
        <div>
          <h4 className="font-semibold text-gray-900">{name}</h4>
          <span className="text-xs text-gray-500">{active} active</span>
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Min Stake</span>
          <span className="font-medium">{minStake} ETH</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Lock Period</span>
          <span className="font-medium">{lockDays} days</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Slash Rate</span>
          <span className="font-medium text-red-600">{slashPercent}%</span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isOperational = status === 'OPERATIONAL';
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${isOperational ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
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

  if (loading) return <ObserverLayout title="Node Economy" description="Decentralized infrastructure nodes" currentTab="node-economy"><ObserverLoading /></ObserverLayout>;
  if (error) return <ObserverLayout title="Node Economy" description="Decentralized infrastructure nodes" currentTab="node-economy"><div className="text-red-600">Error: {error}</div></ObserverLayout>;
  if (!data) return null;

  return (
    <ObserverLayout 
      title="Node Economy" 
      description="Decentralized infrastructure nodes: storage, execution, indexing, and research"
      currentTab="node-economy"
    >
      <div className="space-y-6">
        <ObserverCard title="System Overview">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Node Network</h3>
              <p className="text-sm text-gray-500">Layer 7 infrastructure</p>
            </div>
            <StatusBadge status={data.systemStatus} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              label="Total Nodes" 
              value={data.nodes.total}
              color="text-blue-600"
            />
            <MetricCard 
              label="Active Nodes" 
              value={data.nodes.active}
              color="text-teal-600"
            />
            <MetricCard 
              label="Current Epoch" 
              value={data.rewards.currentEpoch}
              subtitle={`${data.rewards.timeUntilNextEpochHours.toFixed(1)}h until next`}
              color="text-purple-600"
            />
            <MetricCard 
              label="Max Rewards/Epoch" 
              value={`${parseFloat(data.rewards.maxRewardsPerEpoch).toFixed(2)} ETH`}
              color="text-amber-600"
            />
          </div>
        </ObserverCard>

        <ObserverCard title="Node Classes">
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
        </ObserverCard>

        <ObserverCard title="Slashing & Security">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <MetricCard 
              label="Total Slashed" 
              value={`${parseFloat(data.slashing.totalSlashed).toFixed(4)} ETH`}
              color="text-red-600"
            />
            <MetricCard 
              label="In Escrow" 
              value={`${parseFloat(data.slashing.totalEscrowed).toFixed(4)} ETH`}
              subtitle="Pending appeal resolution"
              color="text-amber-600"
            />
            <MetricCard 
              label="Available for Treasury" 
              value={`${parseFloat(data.slashing.availableForWithdrawal).toFixed(4)} ETH`}
              color="text-teal-600"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-600">Node Class</th>
                  <th className="text-right py-2 px-3 text-gray-600">Slash %</th>
                  <th className="text-right py-2 px-3 text-gray-600">Cooldown</th>
                  <th className="text-right py-2 px-3 text-gray-600">Max Before Suspend</th>
                </tr>
              </thead>
              <tbody>
                {data.slashingParams.map((params) => (
                  <tr key={params.nodeClass} className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium">{params.nodeClass}</td>
                    <td className="py-2 px-3 text-right text-red-600">{params.slashPercent}%</td>
                    <td className="py-2 px-3 text-right">{params.cooldownHours}h</td>
                    <td className="py-2 px-3 text-right">{params.maxSlashes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ObserverCard>

        <ObserverCard title="Verified Contracts">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.proofLinks.map((link) => (
              <a 
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-900">{link.label}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </ObserverCard>
      </div>
    </ObserverLayout>
  );
}
