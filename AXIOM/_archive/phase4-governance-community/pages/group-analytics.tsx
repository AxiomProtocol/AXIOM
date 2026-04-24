import Head from 'next/head';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

interface GroupStats {
  id: string;
  name: string;
  members: number;
  completionRate: number;
  avgPaymentTime: string;
  totalCycles: number;
  currentCycle: number;
  status: 'active' | 'graduated' | 'forming';
  trustScore: number;
}

export default function GroupAnalyticsPage() {
  const [groups, setGroups] = useState<GroupStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'completionRate' | 'trustScore' | 'members'>('completionRate');

  useEffect(() => {
    fetchGroupStats();
  }, []);

  const fetchGroupStats = async () => {
    try {
      const res = await fetch('/api/groups/analytics');
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Error fetching group analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedGroups = [...groups].sort((a, b) => b[sortBy] - a[sortBy]);

  const platformStats = {
    totalGroups: groups.length,
    activeGroups: groups.filter(g => g.status === 'active').length,
    avgCompletionRate: groups.length > 0 
      ? (groups.reduce((sum, g) => sum + g.completionRate, 0) / groups.length).toFixed(1)
      : '0',
    avgTrustScore: groups.length > 0
      ? Math.round(groups.reduce((sum, g) => sum + g.trustScore, 0) / groups.length)
      : 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'graduated': return 'bg-purple-500/20 text-purple-400';
      case 'forming': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTrustColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Group Analytics | Axiom Protocol</title>
        </Head>
        <Layout showWallet={true}>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Group Analytics | Axiom Protocol</title>
        <meta name="description" content="SUSU group performance analytics and comparisons" />
      </Head>

      <Layout showWallet={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Group Analytics
              </h1>
              <p className="text-gray-400">
                Performance metrics and comparisons across SUSU groups
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Total Groups</p>
                <p className="text-3xl font-bold text-white mt-1">{platformStats.totalGroups}</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Active Groups</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{platformStats.activeGroups}</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Avg Completion Rate</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{platformStats.avgCompletionRate}%</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Avg Trust Score</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">{platformStats.avgTrustScore}</p>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Group Performance</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy('completionRate')}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      sortBy === 'completionRate' 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Completion
                  </button>
                  <button
                    onClick={() => setSortBy('trustScore')}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      sortBy === 'trustScore' 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Trust Score
                  </button>
                  <button
                    onClick={() => setSortBy('members')}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      sortBy === 'members' 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Size
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {sortedGroups.map((group, index) => (
                  <div 
                    key={group.id}
                    className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-black font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{group.name}</h4>
                          <p className="text-xs text-gray-400">{group.members} members</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(group.status)}`}>
                        {group.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Completion Rate</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${group.completionRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-green-400">{group.completionRate}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Trust Score</p>
                        <p className={`text-lg font-bold ${getTrustColor(group.trustScore)}`}>
                          {group.trustScore}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Avg Payment Time</p>
                        <p className="text-sm text-white">{group.avgPaymentTime}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cycles</p>
                        <p className="text-sm text-white">{group.currentCycle} / {group.totalCycles}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Understanding Metrics</h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400">
                <div>
                  <h4 className="font-medium text-white mb-2">Completion Rate</h4>
                  <p>
                    Percentage of payments made on time by group members. Higher rates 
                    indicate more reliable groups with consistent payment behavior.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">Trust Score</h4>
                  <p>
                    Composite score (0-100) based on payment history, group tenure, 
                    member credit scores, and organizer certification status.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
