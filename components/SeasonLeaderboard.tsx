import React, { useState, useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  displayName: string;
  score: number;
  change: number;
  badge?: string;
}

interface SeasonInfo {
  name: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  prizePool: number;
}

type LeaderboardType = 'veaxm' | 'streak' | 'referrals' | 'quests';

interface SeasonLeaderboardProps {
  walletAddress?: string;
  compact?: boolean;
}

export default function SeasonLeaderboard({ walletAddress, compact = false }: SeasonLeaderboardProps) {
  const [activeBoard, setActiveBoard] = useState<LeaderboardType>('veaxm');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeBoard, walletAddress]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/leaderboard?type=${activeBoard}${walletAddress ? `&wallet=${walletAddress}` : ''}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setUserRank(data.userRank || null);
      setSeason(data.season || getDefaultSeason());
    } catch (error) {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSeason = (): SeasonInfo => ({
    name: 'Season 1: Genesis',
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    daysRemaining: 90,
    prizePool: 100000,
  });

  const boards: { id: LeaderboardType; label: string; icon: string; metric: string }[] = [
    { id: 'veaxm', label: 'Staking', icon: '🔒', metric: 'veAXM' },
    { id: 'streak', label: 'Streaks', icon: '🔥', metric: 'Days' },
    { id: 'referrals', label: 'Referrals', icon: '👥', metric: 'Friends' },
    { id: 'quests', label: 'Quests', icon: '🎯', metric: 'XP' },
  ];

  const formatAddress = (addr: string) => {
    if (addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '⭐';
    return '';
  };

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-amber-400 flex items-center gap-2">
            <span className="text-xl">🏆</span> Season Leaderboard
          </h3>
          {userRank && (
            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
              #{userRank}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {entries.slice(0, 3).map((entry) => (
            <div key={entry.rank} className="flex items-center gap-2 text-sm">
              <span className="text-lg w-6">{getRankBadge(entry.rank)}</span>
              <span className="text-gray-300 flex-1 truncate">{entry.displayName || formatAddress(entry.walletAddress)}</span>
              <span className="text-amber-400 font-bold">{entry.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-400 text-center">
          {season?.daysRemaining} days left in {season?.name}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🏆</span> Season Leaderboard
          </h2>
          <p className="text-gray-400 mt-1">{season?.name || 'Season 1'}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-400">{season?.prizePool?.toLocaleString() || '100,000'} AXM</div>
          <div className="text-sm text-gray-400">Prize Pool</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏱️</span>
            <div>
              <div className="font-bold text-amber-400">{season?.daysRemaining || 90} Days Remaining</div>
              <div className="text-sm text-gray-400">Season ends {season?.endDate || 'March 31, 2025'}</div>
            </div>
          </div>
          {userRank && (
            <div className="text-right">
              <div className="text-sm text-gray-400">Your Rank</div>
              <div className="text-2xl font-bold text-white">#{userRank}</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {boards.map((board) => (
          <button
            key={board.id}
            onClick={() => setActiveBoard(board.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeBoard === board.id
                ? 'bg-amber-500 text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span>{board.icon}</span>
            {board.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-700 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-3">🏁</div>
              <div>Be the first to compete!</div>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                  entry.walletAddress.toLowerCase() === walletAddress?.toLowerCase()
                    ? 'bg-amber-500/20 border border-amber-500/50'
                    : entry.rank <= 3
                    ? 'bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30'
                    : 'bg-gray-900/50 border border-gray-700'
                }`}
              >
                <div className="w-12 text-center">
                  {entry.rank <= 3 ? (
                    <span className="text-3xl">{getRankBadge(entry.rank)}</span>
                  ) : (
                    <span className="text-xl font-bold text-gray-400">#{entry.rank}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">
                      {entry.displayName || formatAddress(entry.walletAddress)}
                    </span>
                    {entry.badge && <span className="text-sm">{entry.badge}</span>}
                    {entry.walletAddress.toLowerCase() === walletAddress?.toLowerCase() && (
                      <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded">You</span>
                    )}
                  </div>
                  {entry.change !== 0 && (
                    <div className={`text-xs ${entry.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.change > 0 ? '▲' : '▼'} {Math.abs(entry.change)} since last week
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-amber-400">{entry.score.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{boards.find(b => b.id === activeBoard)?.metric}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🥇</div>
          <div className="font-bold text-yellow-400">1st Place</div>
          <div className="text-sm text-gray-400">25,000 AXM</div>
        </div>
        <div className="bg-gradient-to-br from-gray-400/10 to-gray-500/10 border border-gray-400/30 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🥈</div>
          <div className="font-bold text-gray-300">2nd Place</div>
          <div className="text-sm text-gray-400">15,000 AXM</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-amber-600/10 border border-orange-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🥉</div>
          <div className="font-bold text-orange-400">3rd Place</div>
          <div className="text-sm text-gray-400">10,000 AXM</div>
        </div>
      </div>
    </div>
  );
}
