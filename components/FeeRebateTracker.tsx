import { useState, useEffect } from 'react';

interface RebateData {
  groupId: string;
  groupName: string;
  completedRotations: number;
  totalContributions: number;
  rebateEarned: number;
  rebateRate: number;
  status: 'active' | 'completed' | 'pending_claim';
  nextMilestone: number;
}

interface Props {
  walletAddress?: string;
  compact?: boolean;
}

export default function FeeRebateTracker({ walletAddress, compact = false }: Props) {
  const [rebates, setRebates] = useState<RebateData[]>([]);
  const [totalRebate, setTotalRebate] = useState(0);
  const [pendingClaims, setPendingClaims] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      fetchRebates();
    } else {
      setLoading(false);
    }
  }, [walletAddress]);

  const fetchRebates = async () => {
    try {
      const res = await fetch(`/api/rebates/status?address=${walletAddress}`);
      const data = await res.json();
      if (data.success) {
        setRebates(data.rebates || []);
        setTotalRebate(data.totalRebate || 0);
        setPendingClaims(data.pendingClaims || 0);
      }
    } catch (error) {
      console.error('Failed to fetch rebates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRebate = async (groupId: string) => {
    if (!walletAddress) return;
    setClaiming(groupId);
    try {
      const res = await fetch('/api/rebates/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, walletAddress }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRebates();
      }
    } catch (error) {
      console.error('Failed to claim rebate:', error);
    } finally {
      setClaiming(null);
    }
  };

  const getRebateTier = (rotations: number) => {
    if (rotations >= 12) return { rate: 0.75, tier: 'Diamond', color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
    if (rotations >= 6) return { rate: 0.50, tier: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (rotations >= 3) return { rate: 0.30, tier: 'Silver', color: 'text-gray-300', bg: 'bg-gray-500/20' };
    if (rotations >= 1) return { rate: 0.15, tier: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-600/20' };
    return { rate: 0, tier: 'None', color: 'text-gray-500', bg: 'bg-gray-700' };
  };

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl border border-green-500/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💸</span>
            <span className="text-white font-semibold">Fee Rebates</span>
          </div>
          {pendingClaims > 0 && (
            <span className="text-xs bg-green-500 text-black px-2 py-0.5 rounded-full font-semibold animate-pulse">
              {pendingClaims} to claim
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <div className="text-gray-400 text-sm">Total Earned</div>
          <div className="text-green-400 font-bold">${totalRebate.toFixed(2)}</div>
        </div>
        
        <div className="text-xs text-gray-500">
          Complete Wealth Practice rotations to earn up to 75% fee rebate
        </div>
        
        <a href="/wealth-practice" className="block text-center text-green-400 hover:text-green-300 text-sm mt-3">
          View Rebate Details →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>💸</span> Fee Rebate Program
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Earn back fees by completing Wealth Practice rotations via AxiomFeeBurner
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Total Rebate Earned</div>
            <div className="text-3xl font-bold text-green-400">${totalRebate.toFixed(2)}</div>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Pending Claims</div>
            <div className="text-3xl font-bold text-yellow-400">${pendingClaims.toFixed(2)}</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Active Groups</div>
            <div className="text-3xl font-bold text-white">{rebates.filter(r => r.status === 'active').length}</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Avg Rebate Rate</div>
            <div className="text-3xl font-bold text-purple-400">
              {rebates.length > 0 ? (rebates.reduce((sum, r) => sum + r.rebateRate, 0) / rebates.length * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-white mb-3">Rebate Tiers</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { rotations: 1, rate: 15, tier: 'Bronze', color: 'amber-600' },
              { rotations: 3, rate: 30, tier: 'Silver', color: 'gray-300' },
              { rotations: 6, rate: 50, tier: 'Gold', color: 'yellow-400' },
              { rotations: 12, rate: 75, tier: 'Diamond', color: 'cyan-400' },
            ].map(tier => (
              <div key={tier.tier} className="bg-gray-900/50 rounded-lg p-3 text-center">
                <div className={`text-${tier.color} font-bold text-lg`}>{tier.rate}%</div>
                <div className="text-xs text-gray-400">{tier.tier}</div>
                <div className="text-xs text-gray-500">{tier.rotations}+ rotations</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin text-4xl mb-2">⏳</div>
            <p className="text-gray-400">Loading rebates...</p>
          </div>
        ) : rebates.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-gray-400 mb-2">No rebates yet</p>
            <p className="text-sm text-gray-500">Join a Wealth Practice circle and complete rotations to earn fee rebates</p>
          </div>
        ) : (
          rebates.map(rebate => {
            const tierInfo = getRebateTier(rebate.completedRotations);
            return (
              <div 
                key={rebate.groupId}
                className={`rounded-xl p-4 border ${
                  rebate.status === 'pending_claim' 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-gray-800/50 border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{rebate.groupName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tierInfo.bg} ${tierInfo.color}`}>
                        {tierInfo.tier}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {rebate.completedRotations} rotations completed
                    </div>
                  </div>
                  
                  {rebate.status === 'pending_claim' ? (
                    <button
                      onClick={() => handleClaimRebate(rebate.groupId)}
                      disabled={claiming === rebate.groupId}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-50"
                    >
                      {claiming === rebate.groupId ? 'Claiming...' : `Claim $${rebate.rebateEarned.toFixed(2)}`}
                    </button>
                  ) : (
                    <div className="text-right">
                      <div className={`text-lg font-bold ${tierInfo.color}`}>
                        {(rebate.rebateRate * 100).toFixed(0)}% rate
                      </div>
                      <div className="text-xs text-gray-500">
                        ${rebate.rebateEarned.toFixed(2)} earned
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      style={{ width: `${(rebate.completedRotations / rebate.nextMilestone) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {rebate.completedRotations}/{rebate.nextMilestone} to next tier
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
