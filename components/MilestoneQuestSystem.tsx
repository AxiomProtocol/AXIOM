import { useState, useEffect } from 'react';

interface Quest {
  id: string;
  title: string;
  description: string;
  category: 'onboarding' | 'susu' | 'staking' | 'community' | 'governance';
  xpReward: number;
  axmReward: number;
  creditBoost: number;
  progress: number;
  maxProgress: number;
  status: 'locked' | 'active' | 'completed' | 'claimed';
  icon: string;
  tier: 'starter' | 'builder' | 'champion' | 'legend';
}

const MILESTONE_QUESTS: Quest[] = [
  { id: 'welcome', title: 'Welcome to Axiom', description: 'Complete your profile and join a group', category: 'onboarding', xpReward: 100, axmReward: 25, creditBoost: 15, progress: 0, maxProgress: 1, status: 'active', icon: '👋', tier: 'starter' },
  { id: 'first_contribution', title: 'First Contribution', description: 'Make your first SUSU contribution', category: 'susu', xpReward: 200, axmReward: 50, creditBoost: 25, progress: 0, maxProgress: 1, status: 'locked', icon: '💰', tier: 'starter' },
  { id: 'week_streak', title: 'Weekly Warrior', description: 'Login for 7 consecutive days', category: 'community', xpReward: 150, axmReward: 30, creditBoost: 10, progress: 0, maxProgress: 7, status: 'active', icon: '🔥', tier: 'starter' },
  { id: 'invite_friend', title: 'Community Builder', description: 'Invite 3 friends who join', category: 'community', xpReward: 300, axmReward: 100, creditBoost: 20, progress: 0, maxProgress: 3, status: 'active', icon: '👥', tier: 'builder' },
  { id: 'complete_cycle', title: 'Full Circle', description: 'Complete an entire SUSU rotation', category: 'susu', xpReward: 500, axmReward: 150, creditBoost: 50, progress: 0, maxProgress: 1, status: 'locked', icon: '🎯', tier: 'builder' },
  { id: 'lock_veaxm', title: 'Diamond Hands', description: 'Lock 1000 AXM as veAXM', category: 'staking', xpReward: 400, axmReward: 75, creditBoost: 35, progress: 0, maxProgress: 1000, status: 'locked', icon: '💎', tier: 'builder' },
  { id: 'vote_3', title: 'Active Citizen', description: 'Vote on 3 governance proposals', category: 'governance', xpReward: 250, axmReward: 60, creditBoost: 20, progress: 0, maxProgress: 3, status: 'locked', icon: '🗳️', tier: 'builder' },
  { id: 'month_streak', title: 'Consistency Champion', description: 'Make on-time payments for 3 months', category: 'susu', xpReward: 750, axmReward: 200, creditBoost: 75, progress: 0, maxProgress: 3, status: 'locked', icon: '🏆', tier: 'champion' },
  { id: 'lead_group', title: 'Circle Leader', description: 'Become an organizer of a SUSU circle', category: 'community', xpReward: 600, axmReward: 250, creditBoost: 40, progress: 0, maxProgress: 1, status: 'locked', icon: '👑', tier: 'champion' },
  { id: 'create_proposal', title: 'Governance Pioneer', description: 'Create an approved governance proposal', category: 'governance', xpReward: 1000, axmReward: 500, creditBoost: 100, progress: 0, maxProgress: 1, status: 'locked', icon: '⚡', tier: 'legend' },
];

const TIER_CONFIG = {
  starter: { color: 'from-gray-500 to-gray-600', badge: '🌱', minXp: 0, label: 'Starter' },
  builder: { color: 'from-blue-500 to-indigo-600', badge: '🔨', minXp: 500, label: 'Builder' },
  champion: { color: 'from-purple-500 to-pink-600', badge: '🏅', minXp: 2000, label: 'Champion' },
  legend: { color: 'from-yellow-500 to-amber-600', badge: '👑', minXp: 5000, label: 'Legend' },
};

interface Props {
  walletAddress?: string;
  compact?: boolean;
}

export default function MilestoneQuestSystem({ walletAddress, compact = false }: Props) {
  const [quests, setQuests] = useState<Quest[]>(MILESTONE_QUESTS);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      fetchQuestProgress();
    }
  }, [walletAddress]);

  const fetchQuestProgress = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quests/progress?address=${walletAddress}`);
      const data = await res.json();
      if (data.success && data.quests) {
        setQuests(data.quests);
        setTotalXp(data.totalXp || 0);
      }
    } catch (error) {
      console.error('Failed to fetch quest progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (questId: string) => {
    if (!walletAddress) return;
    setClaimingId(questId);
    try {
      const res = await fetch('/api/quests/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, walletAddress }),
      });
      const data = await res.json();
      if (data.success) {
        setQuests(prev => prev.map(q => 
          q.id === questId ? { ...q, status: 'claimed' as const } : q
        ));
        setTotalXp(prev => prev + (quests.find(q => q.id === questId)?.xpReward || 0));
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
    } finally {
      setClaimingId(null);
    }
  };

  const getCurrentTier = () => {
    if (totalXp >= TIER_CONFIG.legend.minXp) return 'legend';
    if (totalXp >= TIER_CONFIG.champion.minXp) return 'champion';
    if (totalXp >= TIER_CONFIG.builder.minXp) return 'builder';
    return 'starter';
  };

  const currentTier = getCurrentTier();
  const tierConfig = TIER_CONFIG[currentTier];
  const nextTier = currentTier === 'starter' ? 'builder' : currentTier === 'builder' ? 'champion' : currentTier === 'champion' ? 'legend' : null;
  const nextTierXp = nextTier ? TIER_CONFIG[nextTier].minXp : null;

  const filteredQuests = selectedTier === 'all' ? quests : quests.filter(q => q.tier === selectedTier);
  const completedCount = quests.filter(q => q.status === 'completed' || q.status === 'claimed').length;
  const activeCount = quests.filter(q => q.status === 'active').length;

  if (compact) {
    return (
      <div className="bg-gray-900/80 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{tierConfig.badge}</span>
            <span className="text-white font-semibold">{tierConfig.label}</span>
          </div>
          <div className="text-right">
            <div className="text-yellow-500 font-bold">{totalXp.toLocaleString()} XP</div>
            {nextTierXp && (
              <div className="text-xs text-gray-400">{nextTierXp - totalXp} to {nextTier}</div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-green-400 font-bold">{completedCount}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="flex-1 bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-yellow-400 font-bold">{activeCount}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
        </div>
        
        {quests.filter(q => q.status === 'active').slice(0, 2).map(quest => (
          <div key={quest.id} className="bg-gray-800/50 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span>{quest.icon}</span>
              <span className="text-sm font-medium text-white">{quest.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500"
                  style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{quest.progress}/{quest.maxProgress}</span>
            </div>
          </div>
        ))}
        
        <a href="/wealth-dashboard?tab=quests" className="block text-center text-yellow-500 hover:text-yellow-400 text-sm mt-2">
          View All Quests →
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
              <span>🎮</span> Milestone Quests
            </h3>
            <p className="text-sm text-gray-400 mt-1">Complete quests to earn XP, AXM, and credit boosts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`bg-gradient-to-br ${tierConfig.color} rounded-xl p-4`}>
            <div className="text-2xl mb-1">{tierConfig.badge}</div>
            <div className="text-white font-bold">{tierConfig.label}</div>
            <div className="text-white/80 text-sm">{totalXp.toLocaleString()} XP</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Active Quests</div>
            <div className="text-3xl font-bold text-yellow-500">{activeCount}</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Completed</div>
            <div className="text-3xl font-bold text-green-500">{completedCount}</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">
              {nextTier ? `To ${TIER_CONFIG[nextTier].label}` : 'Max Tier!'}
            </div>
            {nextTierXp ? (
              <>
                <div className="text-xl font-bold text-white">{(nextTierXp - totalXp).toLocaleString()} XP</div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-600"
                    style={{ width: `${(totalXp / nextTierXp) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="text-xl font-bold text-yellow-500">🎉</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-gray-700">
        {[
          { id: 'all', label: 'All', icon: '📋' },
          { id: 'starter', label: 'Starter', icon: '🌱' },
          { id: 'builder', label: 'Builder', icon: '🔨' },
          { id: 'champion', label: 'Champion', icon: '🏅' },
          { id: 'legend', label: 'Legend', icon: '👑' },
        ].map(tier => (
          <button
            key={tier.id}
            onClick={() => setSelectedTier(tier.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              selectedTier === tier.id 
                ? 'text-yellow-500 border-b-2 border-yellow-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{tier.icon}</span> {tier.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin text-4xl mb-2">⏳</div>
            <p className="text-gray-400">Loading quests...</p>
          </div>
        ) : filteredQuests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No quests in this tier yet
          </div>
        ) : (
          filteredQuests.map(quest => (
            <div 
              key={quest.id}
              className={`rounded-xl p-4 transition-all ${
                quest.status === 'locked' 
                  ? 'bg-gray-800/30 opacity-60' 
                  : quest.status === 'claimed'
                  ? 'bg-green-500/10 border border-green-500/30'
                  : quest.status === 'completed'
                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                  : 'bg-gray-800/50 border border-gray-700'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  quest.status === 'locked' ? 'bg-gray-700' : 
                  quest.status === 'claimed' ? 'bg-green-500/20' :
                  quest.status === 'completed' ? 'bg-yellow-500/20' :
                  'bg-gray-700'
                }`}>
                  {quest.status === 'locked' ? '🔒' : quest.status === 'claimed' ? '✓' : quest.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold ${
                      quest.status === 'locked' ? 'text-gray-500' :
                      quest.status === 'claimed' ? 'text-green-400' :
                      'text-white'
                    }`}>
                      {quest.title}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      quest.tier === 'starter' ? 'bg-gray-600 text-gray-300' :
                      quest.tier === 'builder' ? 'bg-blue-500/20 text-blue-400' :
                      quest.tier === 'champion' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {TIER_CONFIG[quest.tier].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{quest.description}</p>
                  
                  {quest.status !== 'locked' && quest.status !== 'claimed' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            quest.status === 'completed' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 min-w-[60px] text-right">
                        {quest.progress}/{quest.maxProgress}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-purple-400">⚡ {quest.xpReward} XP</span>
                    <span className="text-yellow-400">🪙 {quest.axmReward} AXM</span>
                    <span className="text-green-400">📈 +{quest.creditBoost} Credit</span>
                  </div>
                </div>
                
                {quest.status === 'completed' && (
                  <button
                    onClick={() => handleClaimReward(quest.id)}
                    disabled={claimingId === quest.id}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-amber-500 transition-all disabled:opacity-50"
                  >
                    {claimingId === quest.id ? 'Claiming...' : 'Claim'}
                  </button>
                )}
                
                {quest.status === 'claimed' && (
                  <span className="text-green-400 text-sm font-medium">✓ Claimed</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
