import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: number;
  progress?: number;
  maxProgress?: number;
}

const ALL_BADGES: Badge[] = [
  {
    id: 'first-susu',
    name: 'First Steps',
    description: 'Completed your first SUSU payment',
    icon: '🌱',
    rarity: 'common'
  },
  {
    id: 'circle-complete',
    name: 'Circle Champion',
    description: 'Completed a full SUSU cycle',
    icon: '🔄',
    rarity: 'rare'
  },
  {
    id: 'one-year',
    name: 'Loyal Member',
    description: 'Active member for 1 year',
    icon: '⭐',
    rarity: 'rare'
  },
  {
    id: 'organizer',
    name: 'Community Leader',
    description: 'Became a certified SUSU organizer',
    icon: '👑',
    rarity: 'epic'
  },
  {
    id: 'veaxm-holder',
    name: 'Governance Voter',
    description: 'Locked AXM as veAXM',
    icon: '🗳️',
    rarity: 'rare'
  },
  {
    id: 'perfect-score',
    name: 'Perfect Record',
    description: 'Achieved 100% on-time payment rate',
    icon: '💯',
    rarity: 'epic'
  },
  {
    id: 'high-credit',
    name: 'Credit Elite',
    description: 'Reached 800+ credit score',
    icon: '🏆',
    rarity: 'legendary'
  },
  {
    id: 'capital-mode',
    name: 'Capital Graduate',
    description: 'Graduated from Capital Mode',
    icon: '🎓',
    rarity: 'legendary'
  },
  {
    id: 'referrer-10',
    name: 'Network Builder',
    description: 'Referred 10+ active members',
    icon: '🔗',
    rarity: 'epic'
  },
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Joined during the first year',
    icon: '🚀',
    rarity: 'legendary'
  }
];

interface MemberBadgesProps {
  showAll?: boolean;
  compact?: boolean;
}

export default function MemberBadges({ showAll = false, compact = false }: MemberBadgesProps) {
  const { walletState } = useWallet();
  const address = walletState.address;
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      fetchBadges();
    } else {
      setLoading(false);
    }
  }, [address]);

  const fetchBadges = async () => {
    try {
      const res = await fetch(`/api/badges?address=${address}`);
      const data = await res.json();
      if (data.success) {
        const earnedIds = new Set(data.badges.map((b: any) => b.id));
        const combined = ALL_BADGES.map(badge => ({
          ...badge,
          earnedAt: data.badges.find((b: any) => b.id === badge.id)?.earnedAt,
          progress: data.progress?.[badge.id]?.current,
          maxProgress: data.progress?.[badge.id]?.max
        }));
        setBadges(combined);
      }
    } catch (err) {
      console.error('Error fetching badges:', err);
      setBadges(ALL_BADGES);
    } finally {
      setLoading(false);
    }
  };

  const rarityColors = {
    common: 'border-gray-500 bg-gray-500/10',
    rare: 'border-blue-500 bg-blue-500/10',
    epic: 'border-purple-500 bg-purple-500/10',
    legendary: 'border-yellow-500 bg-yellow-500/10'
  };

  const rarityLabels = {
    common: 'text-gray-400',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-yellow-400'
  };

  const earnedBadges = badges.filter(b => b.earnedAt);
  const lockedBadges = badges.filter(b => !b.earnedAt);
  const displayBadges = showAll ? badges : earnedBadges;

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-gray-700 rounded w-1/3"></div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {earnedBadges.slice(0, 5).map(badge => (
          <div
            key={badge.id}
            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${rarityColors[badge.rarity]}`}
            title={badge.name}
          >
            <span className="text-lg">{badge.icon}</span>
          </div>
        ))}
        {earnedBadges.length > 5 && (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-gray-400 text-sm font-bold">
            +{earnedBadges.length - 5}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>🏅</span> Member Badges
        </h3>
        <p className="text-sm text-gray-400">
          {earnedBadges.length} / {badges.length} earned
        </p>
      </div>

      {earnedBadges.length > 0 && (
        <div>
          <h4 className="text-sm text-gray-400 mb-3">Earned</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {earnedBadges.map(badge => (
              <div
                key={badge.id}
                className={`border rounded-xl p-4 text-center hover:scale-105 transition-transform ${rarityColors[badge.rarity]}`}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <p className="font-medium text-white text-sm">{badge.name}</p>
                <p className={`text-xs mt-1 capitalize ${rarityLabels[badge.rarity]}`}>
                  {badge.rarity}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAll && lockedBadges.length > 0 && (
        <div>
          <h4 className="text-sm text-gray-400 mb-3">Locked</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {lockedBadges.map(badge => (
              <div
                key={badge.id}
                className="border border-gray-700 bg-gray-800/50 rounded-xl p-4 text-center opacity-60"
              >
                <div className="text-3xl mb-2 grayscale">{badge.icon}</div>
                <p className="font-medium text-gray-400 text-sm">{badge.name}</p>
                <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                {badge.progress !== undefined && (
                  <div className="mt-2">
                    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gray-500 rounded-full"
                        style={{ width: `${(badge.progress / (badge.maxProgress || 1)) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {badge.progress} / {badge.maxProgress}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
