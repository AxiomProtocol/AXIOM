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
}

export default function ReferralsPage() {
  const { walletState } = useWallet();
  const address = walletState.address;
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (address) {
      fetchReferralData();
      fetchLeaderboard();
    } else {
      setLoading(false);
    }
  }, [address]);

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
    try {
      const res = await fetch('/api/referrals/leaderboard');
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
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

            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-xl p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Your Referral Link</h3>
                  <p className="text-gray-400 text-sm">Share this link to earn 50 AXM per successful referral</p>
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

            <div className="grid md:grid-cols-4 gap-4 mb-8">
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
                  {leaderboard.length === 0 && (
                    <p className="text-gray-400 text-center py-4">Leaderboard loading...</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
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
                  <p className="text-xs text-gray-400">They connect wallet via your link</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">3️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-1">Complete SUSU</h4>
                  <p className="text-xs text-gray-400">They make their first payment</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">4️⃣</span>
                  </div>
                  <h4 className="font-medium text-white mb-1">Earn Rewards</h4>
                  <p className="text-xs text-gray-400">Both get 50 AXM bonus!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
