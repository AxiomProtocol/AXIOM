import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

const BADGE_DEFINITIONS = [
  { id: 'first_stake', name: 'First Stake', icon: '🌱', description: 'Staked AXM tokens for the first time', category: 'staking' },
  { id: 'rotation_complete', name: 'Circle Closer', icon: '🔄', description: 'Completed a full SUSU rotation', category: 'susu' },
  { id: 'identity_verified', name: 'Verified Member', icon: '✅', description: 'Completed identity verification', category: 'identity' },
  { id: 'first_vote', name: 'First Vote', icon: '🗳️', description: 'Cast your first governance vote', category: 'governance' },
  { id: 'node_owner', name: 'Node Operator', icon: '🖥️', description: 'Purchased a DePIN node', category: 'depin' },
  { id: 'perfect_attendance', name: 'Perfect Attendance', icon: '🌟', description: '10 on-time contributions in a row', category: 'susu' },
  { id: 'reputation_70', name: 'Trusted Member', icon: '🏆', description: 'Achieved 70+ reputation score', category: 'reputation' },
  { id: 'reputation_90', name: 'Elite Member', icon: '💎', description: 'Achieved 90+ reputation score', category: 'reputation' },
  { id: 'delegator', name: 'Delegator', icon: '🤝', description: 'Delegated voting power to another member', category: 'governance' },
  { id: 'eco_contributor', name: 'Green Champion', icon: '🌿', description: 'Contributed to sustainability initiatives', category: 'sustainability' },
  { id: 'academy_graduate', name: 'Academy Graduate', icon: '🎓', description: 'Completed 5+ courses in Axiom Academy', category: 'education' },
  { id: 'referral_3', name: 'Community Builder', icon: '👥', description: 'Referred 3+ members to the platform', category: 'community' },
];

const CATEGORY_COLORS = {
  staking: 'bg-amber-100 text-amber-700 border-amber-200',
  susu: 'bg-blue-100 text-blue-700 border-blue-200',
  identity: 'bg-green-100 text-green-700 border-green-200',
  governance: 'bg-purple-100 text-purple-700 border-purple-200',
  depin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  reputation: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  sustainability: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  education: 'bg-pink-100 text-pink-700 border-pink-200',
  community: 'bg-cyan-100 text-cyan-700 border-cyan-200'
};

export default function BadgesDisplay({ compact = false }) {
  const { walletState } = useWallet();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, earned: 0, points: 0 });

  useEffect(() => {
    if (walletState?.address) {
      fetchBadges();
    } else {
      setLoading(false);
    }
  }, [walletState?.address]);

  const fetchBadges = async () => {
    try {
      const response = await fetch(`/api/gamification/badges?wallet=${walletState.address}`);
      if (response.ok) {
        const data = await response.json();
        setBadges(data.badges || []);
        setStats({
          total: BADGE_DEFINITIONS.length,
          earned: data.badges?.length || 0,
          points: data.points || 0
        });
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const earnedBadgeIds = new Set(badges.map(b => b.badgeId));

  if (!walletState?.address) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <p className="text-gray-400 text-sm">Connect wallet to view badges</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
          <p className="text-gray-400">Loading badges...</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Achievements</h3>
          <span className="text-yellow-400 font-bold">{stats.earned}/{stats.total}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {BADGE_DEFINITIONS.slice(0, 6).map(badge => {
            const earned = earnedBadgeIds.has(badge.id);
            return (
              <div 
                key={badge.id}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                  earned ? 'bg-gray-700' : 'bg-gray-900 opacity-40'
                }`}
                title={badge.name}
              >
                {badge.icon}
              </div>
            );
          })}
          {stats.earned > 6 && (
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-sm text-yellow-400 font-bold">
              +{stats.earned - 6}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Your Achievements</h3>
          <p className="text-gray-400 text-sm">Earn badges by participating in The Wealth Practice</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{stats.points}</div>
          <div className="text-sm text-gray-500">Points</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Progress</span>
          <span className="text-white">{stats.earned}/{stats.total} badges</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all" 
            style={{ width: `${(stats.earned / stats.total) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {BADGE_DEFINITIONS.map(badge => {
          const earned = earnedBadgeIds.has(badge.id);
          const earnedBadge = badges.find(b => b.badgeId === badge.id);
          
          return (
            <div 
              key={badge.id}
              className={`p-4 rounded-xl border transition-all ${
                earned 
                  ? `${CATEGORY_COLORS[badge.category]} border-2` 
                  : 'bg-gray-900/50 border-gray-700 opacity-50'
              }`}
            >
              <div className="text-3xl mb-2 text-center">{badge.icon}</div>
              <div className="text-center">
                <div className={`font-semibold text-sm ${earned ? '' : 'text-gray-500'}`}>
                  {badge.name}
                </div>
                <div className={`text-xs mt-1 ${earned ? '' : 'text-gray-600'}`}>
                  {badge.description}
                </div>
                {earned && earnedBadge?.earnedAt && (
                  <div className="text-xs text-gray-500 mt-2">
                    Earned {new Date(earnedBadge.earnedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
