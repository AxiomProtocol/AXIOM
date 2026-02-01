import React, { useState, useEffect } from 'react';

interface Mission {
  id: string;
  title: string;
  description: string;
  requirement: number;
  progress: number;
  reward: number;
  rewardType: 'AXM' | 'XP' | 'CREDIT';
  status: 'locked' | 'in_progress' | 'completed' | 'claimed';
  icon: string;
}

interface SocialUnlockMissionsProps {
  walletAddress?: string;
  compact?: boolean;
}

export default function SocialUnlockMissions({ walletAddress, compact = false }: SocialUnlockMissionsProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string>('');

  useEffect(() => {
    fetchMissions();
  }, [walletAddress]);

  const fetchMissions = async () => {
    try {
      const res = await fetch(`/api/social/missions${walletAddress ? `?wallet=${walletAddress}` : ''}`);
      const data = await res.json();
      setMissions(data.missions || getDefaultMissions());
      setShareCode(data.shareCode || '');
    } catch (error) {
      setMissions(getDefaultMissions());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultMissions = (): Mission[] => [
    { id: 'complete_onboarding', title: 'Complete Onboarding', description: 'Finish the guided onboarding flow', requirement: 1, progress: 0, reward: 50, rewardType: 'AXM', status: 'in_progress', icon: '🎯' },
    { id: 'invite_1', title: 'First Friend', description: 'Invite your first friend to join', requirement: 1, progress: 0, reward: 100, rewardType: 'AXM', status: 'locked', icon: '👤' },
    { id: 'invite_5', title: 'Squad Builder', description: 'Invite 5 friends to unlock shared rewards', requirement: 5, progress: 0, reward: 500, rewardType: 'AXM', status: 'locked', icon: '👥' },
    { id: 'friend_joins_susu', title: 'Circle Catalyst', description: 'Have a referred friend join a SUSU circle', requirement: 1, progress: 0, reward: 250, rewardType: 'AXM', status: 'locked', icon: '🔄' },
    { id: 'group_milestone', title: 'Collective Power', description: 'Your referral network reaches 25 members', requirement: 25, progress: 0, reward: 1000, rewardType: 'AXM', status: 'locked', icon: '🚀' },
  ];

  const claimReward = async (missionId: string) => {
    if (!walletAddress) return;
    setClaiming(missionId);
    try {
      const res = await fetch('/api/social/claim-mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId, walletAddress }),
      });
      if (res.ok) {
        await fetchMissions();
      }
    } finally {
      setClaiming(null);
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/join?ref=${shareCode}`;
    navigator.clipboard.writeText(link);
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent("Join me on Axiom's Wealth Practice - build savings habits and earn rewards together! 🏦💰");
    const url = encodeURIComponent(`${window.location.origin}/join?ref=${shareCode}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const completedCount = missions.filter(m => m.status === 'completed' || m.status === 'claimed').length;
  const totalRewards = missions.filter(m => m.status === 'claimed').reduce((sum, m) => sum + m.reward, 0);

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-700 rounded"></div>)}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-pink-400 flex items-center gap-2">
            <span className="text-xl">🎁</span> Social Missions
          </h3>
          <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full">
            {completedCount}/{missions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-800 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${(completedCount / missions.length) * 100}%` }}
            />
          </div>
          <span className="text-sm text-gray-400">{totalRewards} AXM earned</span>
        </div>
        {shareCode && (
          <button
            onClick={copyShareLink}
            className="w-full mt-3 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-lg text-pink-300 text-sm transition-all"
          >
            Copy Invite Link
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🎁</span> Social Unlock Missions
          </h2>
          <p className="text-gray-400 mt-1">Invite friends and unlock shared rewards together</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-pink-400">{totalRewards} AXM</div>
          <div className="text-sm text-gray-400">Total Earned</div>
        </div>
      </div>

      {shareCode && (
        <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Your Referral Code</div>
              <div className="text-xl font-mono font-bold text-pink-400">{shareCode}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyShareLink}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <span>📋</span> Copy Link
              </button>
              <button
                onClick={shareToTwitter}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <span>🐦</span> Share
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {missions.map((mission, index) => (
          <div
            key={mission.id}
            className={`border rounded-xl p-4 transition-all ${
              mission.status === 'locked' 
                ? 'bg-gray-900/50 border-gray-700 opacity-60'
                : mission.status === 'claimed'
                ? 'bg-green-900/20 border-green-500/30'
                : mission.status === 'completed'
                ? 'bg-pink-900/20 border-pink-500/50'
                : 'bg-gray-900/50 border-gray-600 hover:border-pink-500/30'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">{mission.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{mission.title}</h3>
                  {mission.status === 'locked' && (
                    <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">Locked</span>
                  )}
                  {mission.status === 'claimed' && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Claimed</span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{mission.description}</p>
                {mission.status !== 'locked' && mission.status !== 'claimed' && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-pink-500 to-purple-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (mission.progress / mission.requirement) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{mission.progress}/{mission.requirement}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-pink-400">+{mission.reward}</div>
                <div className="text-xs text-gray-400">{mission.rewardType}</div>
                {mission.status === 'completed' && (
                  <button
                    onClick={() => claimReward(mission.id)}
                    disabled={claiming === mission.id}
                    className="mt-2 px-3 py-1 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-600 text-white text-sm rounded-lg font-medium transition-all"
                  >
                    {claiming === mission.id ? 'Claiming...' : 'Claim'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <div className="font-bold text-yellow-400">Unlock Bonus</div>
            <div className="text-sm text-gray-400">
              Complete onboarding + invite 5 friends = both you AND your friends get 100 bonus AXM each!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
