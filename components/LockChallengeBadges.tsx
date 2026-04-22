import { useState, useEffect } from 'react';

interface LockBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  requiredYears: number;
  minAmount: number;
  color: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

const LOCK_BADGES: LockBadge[] = [
  { id: 'committed', name: 'Committed', icon: '🔒', description: 'Lock AXM for 1 year', requiredYears: 1, minAmount: 100, color: '#A0AEC0', rarity: 'Common' },
  { id: 'dedicated', name: 'Dedicated', icon: '⏳', description: 'Lock AXM for 2 years', requiredYears: 2, minAmount: 100, color: '#48BB78', rarity: 'Rare' },
  { id: 'believer', name: 'True Believer', icon: '💎', description: 'Lock AXM for 3 years', requiredYears: 3, minAmount: 100, color: '#805AD5', rarity: 'Epic' },
  { id: 'diamond_hands', name: 'Diamond Hands', icon: '💎🙌', description: 'Lock AXM for 4 years', requiredYears: 4, minAmount: 100, color: '#FFD700', rarity: 'Legendary' },
  { id: 'whale_lock', name: 'Whale Locker', icon: '🐋', description: 'Lock 10,000+ AXM for 4 years', requiredYears: 4, minAmount: 10000, color: '#3182CE', rarity: 'Legendary' },
  { id: 'early_adopter', name: 'Early Adopter', icon: '🌅', description: 'First 100 veAXM lockers', requiredYears: 1, minAmount: 100, color: '#ED8936', rarity: 'Epic' },
];

interface Props {
  walletAddress?: string;
  earnedBadges?: string[];
  lockYears?: number;
  lockAmount?: number;
  onSelectBadge?: (badge: LockBadge) => void;
}

export default function LockChallengeBadges({ walletAddress, earnedBadges = [], lockYears = 0, lockAmount = 0, onSelectBadge }: Props) {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  const getBadgeStatus = (badge: LockBadge) => {
    if (earnedBadges.includes(badge.id)) return 'earned';
    if (lockYears >= badge.requiredYears && lockAmount >= badge.minAmount) return 'eligible';
    return 'locked';
  };

  const rarityColors = {
    'Common': 'border-gray-500',
    'Rare': 'border-green-500',
    'Epic': 'border-purple-500',
    'Legendary': 'border-yellow-500',
  };

  const rarityGlow = {
    'Common': '',
    'Rare': 'shadow-green-500/30',
    'Epic': 'shadow-purple-500/30',
    'Legendary': 'shadow-yellow-500/50',
  };

  return (
    <div className="bg-gray-900/80 rounded-2xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Lock Challenge Badges</h3>
          <p className="text-sm text-gray-400 mt-1">Earn exclusive badges by locking AXM</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-500">{earnedBadges.length}/{LOCK_BADGES.length}</div>
          <div className="text-xs text-gray-400">Badges Earned</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {LOCK_BADGES.map((badge) => {
          const status = getBadgeStatus(badge);
          return (
            <div
              key={badge.id}
              className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                rarityColors[badge.rarity]
              } ${
                status === 'earned' 
                  ? `bg-gray-800 shadow-lg ${rarityGlow[badge.rarity]}` 
                  : status === 'eligible'
                  ? 'bg-gray-800/50 animate-pulse'
                  : 'bg-gray-800/30 opacity-50'
              }`}
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
              onClick={() => onSelectBadge?.(badge)}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">{status === 'locked' ? '🔒' : badge.icon}</div>
                <div className={`text-sm font-semibold ${status === 'earned' ? 'text-white' : 'text-gray-400'}`}>
                  {badge.name}
                </div>
                <div className={`text-xs mt-1 ${
                  badge.rarity === 'Legendary' ? 'text-yellow-500' :
                  badge.rarity === 'Epic' ? 'text-purple-400' :
                  badge.rarity === 'Rare' ? 'text-green-400' : 'text-gray-500'
                }`}>
                  {badge.rarity}
                </div>
              </div>

              {status === 'eligible' && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Claim!
                </div>
              )}

              {hoveredBadge === badge.id && (
                <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900 rounded-lg shadow-xl border border-gray-700">
                  <div className="text-sm text-white font-semibold mb-1">{badge.name}</div>
                  <div className="text-xs text-gray-400">{badge.description}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Min: {badge.minAmount.toLocaleString()} AXM × {badge.requiredYears}yr
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lockYears === 0 && (
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
          <p className="text-yellow-500 text-sm">
            Lock AXM to start earning badges! Longer locks unlock rarer badges.
          </p>
        </div>
      )}
    </div>
  );
}
