import { useState, useEffect } from 'react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: number;
  weeklyGoal: number;
  lastActivityDate: string | null;
  streakType: 'payment' | 'login' | 'learning';
  rewards: {
    axmBonus: number;
    creditBoost: number;
  };
}

interface Props {
  walletAddress?: string;
  compact?: boolean;
}

const STREAK_REWARDS = {
  7: { axm: 10, credit: 5, badge: '🔥 Week Warrior' },
  14: { axm: 25, credit: 10, badge: '⚡ Bi-Weekly Beast' },
  30: { axm: 75, credit: 25, badge: '🏆 Monthly Master' },
  60: { axm: 200, credit: 50, badge: '💎 Diamond Dedication' },
  90: { axm: 500, credit: 100, badge: '👑 Legendary Streak' },
};

export default function StreakTracker({ walletAddress, compact = false }: Props) {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      fetchStreakData();
    } else {
      setLoading(false);
    }
  }, [walletAddress]);

  const fetchStreakData = async () => {
    try {
      const res = await fetch(`/api/streaks/status?address=${walletAddress}`);
      const data = await res.json();
      if (data.success) {
        setStreakData(data.streak);
      }
    } catch (error) {
      console.error('Failed to fetch streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStreakLevel = (days: number) => {
    if (days >= 90) return { level: 'Legendary', color: 'text-yellow-400', bg: 'bg-yellow-500', emoji: '👑' };
    if (days >= 60) return { level: 'Diamond', color: 'text-cyan-400', bg: 'bg-cyan-500', emoji: '💎' };
    if (days >= 30) return { level: 'Gold', color: 'text-amber-400', bg: 'bg-amber-500', emoji: '🏆' };
    if (days >= 14) return { level: 'Silver', color: 'text-gray-300', bg: 'bg-gray-400', emoji: '⚡' };
    if (days >= 7) return { level: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-500', emoji: '🔥' };
    return { level: 'Starting', color: 'text-gray-500', bg: 'bg-gray-600', emoji: '🌱' };
  };

  const getNextMilestone = (current: number) => {
    const milestones = [7, 14, 30, 60, 90];
    return milestones.find(m => m > current) || 90;
  };

  const defaultStreak: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    weeklyProgress: 0,
    weeklyGoal: 3,
    lastActivityDate: null,
    streakType: 'payment',
    rewards: { axmBonus: 0, creditBoost: 0 },
  };

  const streak = streakData || defaultStreak;
  const level = getStreakLevel(streak.currentStreak);
  const nextMilestone = getNextMilestone(streak.currentStreak);
  const nextReward = STREAK_REWARDS[nextMilestone as keyof typeof STREAK_REWARDS];

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-xl border border-orange-500/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{level.emoji}</span>
            <div>
              <div className="text-white font-semibold">{streak.currentStreak} Day Streak</div>
              <div className="text-xs text-gray-400">{level.level}</div>
            </div>
          </div>
          {streak.currentStreak >= 7 && (
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full animate-pulse">
              🔥 On Fire!
            </span>
          )}
        </div>
        
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress to {nextMilestone} days</span>
            <span>{streak.currentStreak}/{nextMilestone}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-red-500"
              style={{ width: `${(streak.currentStreak / nextMilestone) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          Next reward: {nextReward?.axm} AXM + {nextReward?.credit} credit
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🔥</span> Practice Streak
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Stay consistent with your Wealth Practice to earn bonus rewards
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-xl p-4 ${level.bg}/20 border border-${level.bg}/30`}>
            <div className="text-4xl mb-2">{level.emoji}</div>
            <div className={`text-3xl font-bold ${level.color}`}>{streak.currentStreak}</div>
            <div className="text-sm text-gray-400">Day Streak</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Longest Streak</div>
            <div className="text-3xl font-bold text-white">{streak.longestStreak}</div>
            <div className="text-sm text-gray-500">days</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Weekly Activity</div>
            <div className="text-3xl font-bold text-green-400">{streak.weeklyProgress}/{streak.weeklyGoal}</div>
            <div className="text-sm text-gray-500">activities</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Total Rewards</div>
            <div className="text-3xl font-bold text-yellow-400">{streak.rewards.axmBonus}</div>
            <div className="text-sm text-gray-500">AXM earned</div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Progress to {level.level === 'Legendary' ? 'Max Level' : 'next milestone'}</span>
            <span className="text-sm text-white font-bold">{streak.currentStreak}/{nextMilestone} days</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all`}
              style={{ width: `${Math.min((streak.currentStreak / nextMilestone) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Streak Milestones</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(STREAK_REWARDS).map(([days, reward]) => {
            const daysNum = parseInt(days);
            const achieved = streak.currentStreak >= daysNum;
            const isNext = daysNum === nextMilestone;
            
            return (
              <div 
                key={days}
                className={`rounded-lg p-3 text-center transition-all ${
                  achieved 
                    ? 'bg-green-500/20 border border-green-500/30' 
                    : isNext
                    ? 'bg-orange-500/10 border border-orange-500/30 ring-1 ring-orange-500/20'
                    : 'bg-gray-800/50 border border-gray-700'
                }`}
              >
                <div className="text-lg mb-1">{achieved ? '✓' : reward.badge.split(' ')[0]}</div>
                <div className={`font-bold ${achieved ? 'text-green-400' : 'text-white'}`}>{days} Days</div>
                <div className="text-xs text-gray-400 mt-1">
                  +{reward.axm} AXM
                </div>
                <div className="text-xs text-gray-500">
                  +{reward.credit} credit
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
