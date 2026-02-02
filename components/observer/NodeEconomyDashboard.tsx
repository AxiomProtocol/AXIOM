import React, { useState, useEffect, useCallback } from 'react';

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
  nodeClasses: string[];
  contracts: {
    NODE_REGISTRY: string;
    NODE_REWARDS: string;
    SLASHING_ENGINE: string;
  };
  proofLinks: Array<{
    label: string;
    url: string;
  }>;
}

const NODE_CLASS_COLORS: Record<string, string> = {
  STORAGE: 'bg-blue-500',
  EXECUTION: 'bg-purple-500',
  INDEXING: 'bg-green-500',
  RESEARCH: 'bg-amber-500',
};

function formatDuration(hours: number): string {
  if (hours <= 0) return 'Now';
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  const mins = Math.floor((hours * 60) % 60);
  
  if (days > 0) return `${days}d ${remainingHours}h`;
  if (remainingHours > 0) return `${remainingHours}h ${mins}m`;
  return `${mins}m`;
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'OPERATIONAL':
      return { bg: 'bg-green-500', text: 'text-green-700' };
    case 'PAUSED':
      return { bg: 'bg-amber-500', text: 'text-amber-700' };
    default:
      return { bg: 'bg-gray-500', text: 'text-gray-700' };
  }
}

export default function NodeEconomyDashboard() {
  const [data, setData] = useState<NodeEconomyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/observer/node-economy');
      if (!res.ok) throw new Error('Failed to fetch node economy data');
      const result = await res.json();
      if (result.success) {
        setData(result);
        setCountdown(result.rewards.timeUntilNextEpochHours);
        setLastRefresh(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const refreshInterval = setInterval(fetchData, 30000);
    return () => clearInterval(refreshInterval);
  }, [fetchData]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - (1/3600)));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Node Economy</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Node Economy</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error || 'Failed to load node economy data'}</p>
          <button 
            onClick={fetchData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusColors = getStatusColor(data.systemStatus);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Node Economy Network</h2>
            <p className="text-sm text-gray-500">Live on-chain data from Arbitrum One</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white ${statusColors.bg}`}>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              {data.systemStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
            <div className="text-3xl font-bold text-teal-700">{data.nodes.total}</div>
            <div className="text-sm text-teal-600">Total Nodes</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="text-3xl font-bold text-blue-700">{data.nodes.active}</div>
            <div className="text-sm text-blue-600">Active Nodes</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="text-3xl font-bold text-purple-700">{data.rewards.currentEpoch}</div>
            <div className="text-sm text-purple-600">Current Epoch</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
            <div className="text-3xl font-bold text-amber-700">{formatDuration(countdown)}</div>
            <div className="text-sm text-amber-600">Next Epoch</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(data.nodes.byClass).map(([classKey, count]) => (
            <div key={classKey} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-3 h-3 rounded-full ${NODE_CLASS_COLORS[classKey.toUpperCase()] || 'bg-gray-400'}`}></span>
                <span className="text-sm font-medium text-gray-700 capitalize">{classKey}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500">active nodes</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Epoch & Rewards</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Current Epoch</span>
              <span className="font-semibold text-gray-900">{data.rewards.currentEpoch}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Epoch Duration</span>
              <span className="font-semibold text-gray-900">{data.rewards.epochDurationDays} days</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Time Until Next Epoch</span>
              <span className="font-semibold text-teal-600">{formatDuration(countdown)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Max Rewards/Epoch</span>
              <span className="font-semibold text-gray-900">{data.rewards.maxRewardsPerEpoch} AXM</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Epoch Start</span>
              <span className="font-mono text-sm text-gray-500">
                {data.rewards.epochStartTime 
                  ? new Date(data.rewards.epochStartTime).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Slashing & Escrow</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Escrowed</span>
              <span className="font-semibold text-blue-600">{data.slashing.totalEscrowed} AXM</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Slashed</span>
              <span className="font-semibold text-red-600">{data.slashing.totalSlashed} AXM</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Available for Withdrawal</span>
              <span className="font-semibold text-green-600">{data.slashing.availableForWithdrawal} AXM</span>
            </div>
            <div className="pt-2">
              <div className="text-xs text-gray-500 mb-2">Network Status</div>
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${data.systemStatus === 'OPERATIONAL' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {data.systemStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-md font-semibold text-gray-900 mb-4">Stake Requirements by Node Class</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 rounded-tl-lg">Node Class</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Min Stake</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Lock Period</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Slash %</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cooldown</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.stakeRequirements.map((req, idx) => {
                const slashParams = data.slashingParams.find(p => p.nodeClass === req.nodeClass);
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${NODE_CLASS_COLORS[req.nodeClass] || 'bg-gray-400'}`}></span>
                        <span className="font-medium text-gray-900 capitalize">{req.nodeClass.toLowerCase()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">
                      {req.minStake} AXM
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {req.lockPeriodDays} days
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {slashParams?.slashPercent || 0}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {slashParams?.cooldownHours || 0}h
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${req.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {req.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-md font-semibold text-gray-900 mb-4">Contract Addresses</h3>
        <div className="space-y-3">
          {data.proofLinks.map((link) => (
            <div key={link.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-600">{link.label}</span>
              <a 
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1"
              >
                View on Blockscout
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-400 text-center">
        Last updated: {lastRefresh?.toLocaleString()} | Auto-refresh every 30s
      </div>
    </div>
  );
}
