import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  address: string;
  votingPower: number;
  lockedAmount: number;
  lockDuration: number;
  badges: string[];
}

interface Props {
  currentUserAddress?: string;
  limit?: number;
}

export default function SeedLeaderboard({ currentUserAddress, limit = 20 }: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all');

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/seed/leaderboard?limit=${limit}&timeframe=${timeframe}`);
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        if (currentUserAddress) {
          setUserRank(data.userRank || null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatNumber = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (rank === 2) return { icon: '🥈', color: 'text-gray-300', bg: 'bg-gray-500/20' };
    if (rank === 3) return { icon: '🥉', color: 'text-amber-600', bg: 'bg-amber-500/20' };
    if (rank <= 10) return { icon: '🏆', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    return { icon: '', color: 'text-gray-400', bg: '' };
  };

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🌱</span> SEED Rankings
            </h3>
            <p className="text-sm text-gray-400 mt-1">Top wealth builders by SEED power</p>
          </div>
          <div className="flex gap-2">
            {(['all', 'month', 'week'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  timeframe === tf 
                    ? 'bg-yellow-500 text-black' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {tf === 'all' ? 'All Time' : tf === 'month' ? 'Month' : 'Week'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading leaderboard...</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No SEED holders yet. Be the first to plant your seeds!
            </div>
          ) : (
            leaderboard.map((entry, idx) => {
              const rankBadge = getRankBadge(entry.rank);
              const isCurrentUser = currentUserAddress?.toLowerCase() === entry.address.toLowerCase();
              
              return (
                <div
                  key={entry.address}
                  className={`flex items-center gap-4 p-4 transition-colors ${
                    isCurrentUser ? 'bg-yellow-500/10' : 'hover:bg-gray-800/50'
                  } ${rankBadge.bg}`}
                >
                  <div className={`w-12 text-center font-bold ${rankBadge.color}`}>
                    {rankBadge.icon || `#${entry.rank}`}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm ${isCurrentUser ? 'text-yellow-400' : 'text-white'}`}>
                        {formatAddress(entry.address)}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full">You</span>
                      )}
                      {entry.badges.length > 0 && (
                        <div className="flex gap-1">
                          {entry.badges.slice(0, 3).map((badge, i) => (
                            <span key={i} className="text-sm">{badge}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {entry.lockDuration} year lock
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-500">
                      {formatNumber(entry.votingPower)}
                    </div>
                    <div className="text-xs text-gray-400">
                      veAXM Power
                    </div>
                  </div>

                  <div className="text-right w-24">
                    <div className="text-sm text-white">
                      {formatNumber(entry.lockedAmount)}
                    </div>
                    <div className="text-xs text-gray-400">
                      AXM Locked
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {userRank && !leaderboard.find(e => e.address.toLowerCase() === currentUserAddress?.toLowerCase()) && (
        <div className="border-t border-gray-700 p-4 bg-gray-800/50">
          <div className="text-center text-sm text-gray-400 mb-2">Your Position</div>
          <div className="flex items-center justify-center gap-8">
            <div>
              <div className="text-2xl font-bold text-yellow-500">#{userRank.rank}</div>
              <div className="text-xs text-gray-400">Rank</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{formatNumber(userRank.votingPower)}</div>
              <div className="text-xs text-gray-400">veAXM</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
