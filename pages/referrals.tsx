import Head from 'next/head';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface Referral {
  id: string;
  address: string;
  joinedAt: number;
  status: 'active' | 'pending' | 'graduated';
  rewardEarned: string;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalRewardsEarned: string;
  pendingRewards: string;
  referralCode: string;
  referralLink: string;
  currentStreak?: number;
  bestStreak?: number;
}

interface StreakBadge {
  id: string;
  name: string;
  icon: string;
  threshold: number;
  color: string;
  earned: boolean;
}

const STREAK_BADGES: StreakBadge[] = [
  { id: 'starter', name: 'First Referral', icon: '🌱', threshold: 1, color: 'from-green-500 to-emerald-600', earned: false },
  { id: 'connector', name: 'Community Connector', icon: '🔗', threshold: 5, color: 'from-blue-500 to-cyan-600', earned: false },
  { id: 'builder', name: 'Network Builder', icon: '🏗️', threshold: 10, color: 'from-purple-500 to-violet-600', earned: false },
  { id: 'champion', name: 'Referral Champion', icon: '🏆', threshold: 25, color: 'from-yellow-500 to-orange-600', earned: false },
  { id: 'legend', name: 'Axiom Legend', icon: '👑', threshold: 50, color: 'from-yellow-400 to-amber-500', earned: false },
];

export default function ReferralsPage() {
  const { walletState } = useWallet();
  const address = walletState.address;
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (address) {
      fetchReferralData();
      fetchLeaderboard();
    } else {
      setLoading(false);
      setLeaderboardLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchReferralData = async () => {
    try {
      const res = await fetch(`/api/referrals?address=${address}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setReferrals(data.referrals || []);
      }
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch('/api/referrals/leaderboard');
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const copyLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!walletState.isConnected) {
    return (
      <>
        <Head>
          <title>Referrals | Axiom Protocol</title>
        </Head>
        <Layout showWallet={true}>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🔗</div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
              <p className="text-gray-400">Connect to view your referral dashboard</p>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Referrals | Axiom Protocol</title>
        <meta name="description" content="Invite friends and earn AXM rewards" />
      </Head>

      <Layout showWallet={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Referral Program
              </h1>
              <p className="text-gray-400">
                Invite friends to Axiom and earn rewards together
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/50 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎁</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-400">Double-Sided Rewards Active!</h3>
                  <p className="text-green-300/80 text-sm">Limited time: Both you AND your friend earn bonus AXM</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">You Earn</p>
                  <p className="text-3xl font-bold text-yellow-400">100 AXM</p>
                  <p className="text-xs text-gray-500 mt-1">per successful referral</p>
                </div>
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Friend Gets</p>
                  <p className="text-3xl font-bold text-green-400">50 AXM</p>
                  <p className="text-xs text-gray-500 mt-1">welcome bonus on signup</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-xl p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Your Referral Link</h3>
                  <p className="text-gray-400 text-sm">Share this link to earn 100 AXM per successful referral</p>
                </div>
                <div className="flex gap-2">
                  <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 font-mono text-sm text-yellow-400 flex-1 md:flex-none">
                    {stats?.referralCode || 'Loading...'}
                  </div>
                  <button
                    onClick={copyLink}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    {copied ? '✓ Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Total Referrals</p>
                <p className="text-3xl font-bold text-white mt-1">{stats?.totalReferrals || 0}</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Active Members</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{stats?.activeReferrals || 0}</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Rewards Earned</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{stats?.totalRewardsEarned || '0'} AXM</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">{stats?.pendingRewards || '0'} AXM</p>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-purple-500/30 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🏅</span> Referral Badges
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full ml-2">
                  {STREAK_BADGES.filter(b => (stats?.totalReferrals || 0) >= b.threshold).length}/{STREAK_BADGES.length} Earned
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {STREAK_BADGES.map((badge) => {
                  const isEarned = (stats?.totalReferrals || 0) >= badge.threshold;
                  const progress = Math.min(100, ((stats?.totalReferrals || 0) / badge.threshold) * 100);
                  return (
                    <div
                      key={badge.id}
                      className={`relative rounded-xl p-4 text-center transition-all ${
                        isEarned 
                          ? `bg-gradient-to-br ${badge.color} shadow-lg` 
                          : 'bg-gray-900/50 border border-gray-700'
                      }`}
                    >
                      <div className={`text-3xl mb-2 ${isEarned ? '' : 'grayscale opacity-50'}`}>
                        {badge.icon}
                      </div>
                      <p className={`text-xs font-medium ${isEarned ? 'text-white' : 'text-gray-400'}`}>
                        {badge.name}
                      </p>
                      <p className={`text-xs mt-1 ${isEarned ? 'text-white/80' : 'text-gray-500'}`}>
                        {badge.threshold} referrals
                      </p>
                      {!isEarned && (
                        <div className="mt-2">
                          <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {isEarned && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>👥</span> Your Referrals
                </h3>
                {referrals.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🔗</div>
                    <p className="text-gray-400">No referrals yet</p>
                    <p className="text-gray-500 text-sm mt-1">Share your link to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {referrals.map((ref) => (
                      <div key={ref.id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white font-mono">{shortenAddress(ref.address)}</p>
                            <p className="text-xs text-gray-400 mt-1">Joined {formatDate(ref.joinedAt)}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              ref.status === 'active' ? 'bg-green-500/20 text-green-400' :
                              ref.status === 'graduated' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {ref.status}
                            </span>
                            <p className="text-sm text-yellow-400 mt-1">+{ref.rewardEarned} AXM</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🏆</span> Top Referrers
                </h3>
                <div className="space-y-3">
                  {leaderboard.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        i === 0 ? 'bg-yellow-500 text-black' :
                        i === 1 ? 'bg-gray-400 text-black' :
                        i === 2 ? 'bg-orange-600 text-white' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-mono text-sm">{shortenAddress(entry.address)}</p>
                        <p className="text-xs text-gray-400">{entry.count} referrals</p>
                      </div>
                      <p className="text-yellow-400 font-bold">{entry.earned} AXM</p>
                    </div>
                  ))}
                  {leaderboardLoading && leaderboard.length === 0 && (
                    <div className="animate-pulse space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-gray-700 rounded-lg"></div>
                      ))}
                    </div>
                  )}
                  {!leaderboardLoading && leaderboard.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No referrers yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">How Double-Sided Rewards Work</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">1️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-1">Share Link</h4>
                  <p className="text-xs text-gray-400">Copy your unique referral link</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">2️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-1">Friend Joins</h4>
                  <p className="text-xs text-gray-400">They sign up via your link</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">3️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-1">First Practice</h4>
                  <p className="text-xs text-gray-400">They join a Wealth Practice</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">🎁</span>
                  </div>
                  <h4 className="font-medium text-white mb-1">Both Earn!</h4>
                  <p className="text-xs text-gray-400">You get 100 AXM, they get 50 AXM</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-400">No limit on referrals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-400">Instant reward tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-400">Unlock badges as you grow</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
