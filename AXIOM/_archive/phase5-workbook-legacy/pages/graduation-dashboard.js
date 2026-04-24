import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import StepProgressBanner from '../components/StepProgressBanner';
import { useWallet } from '../components/WalletConnect/WalletContext';

export default function GraduationDashboard() {
  const { walletState } = useWallet();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/susu/graduation-overview');
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter(g => {
    if (filter === 'all') return true;
    if (filter === 'ready') return g.graduationProgress >= 100;
    if (filter === 'close') return g.graduationProgress >= 75 && g.graduationProgress < 100;
    if (filter === 'building') return g.graduationProgress < 75;
    return true;
  });

  const stats = {
    total: groups.length,
    ready: groups.filter(g => g.graduationProgress >= 100).length,
    close: groups.filter(g => g.graduationProgress >= 75 && g.graduationProgress < 100).length,
    building: groups.filter(g => g.graduationProgress < 75).length
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'from-green-500 to-emerald-500';
    if (progress >= 75) return 'from-yellow-500 to-amber-500';
    if (progress >= 50) return 'from-blue-500 to-cyan-500';
    return 'from-gray-500 to-gray-400';
  };

  const getStageLabel = (stage) => {
    if (stage === 'capital') return { text: 'Capital Mode', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (stage === 'graduated') return { text: 'Graduated', color: 'text-green-400', bg: 'bg-green-500/20' };
    return { text: 'Community', color: 'text-blue-400', bg: 'bg-blue-500/20' };
  };

  return (
    <Layout>
      <StepProgressBanner isAdvanced={true} />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                Graduation Dashboard
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Track your groups' progression from Purpose Groups to The Wealth Practice
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div 
              onClick={() => setFilter('all')}
              className={`bg-gray-800 border rounded-xl p-4 cursor-pointer transition-all ${filter === 'all' ? 'border-yellow-500' : 'border-gray-700 hover:border-gray-600'}`}
            >
              <div className="text-3xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total Groups</div>
            </div>
            <div 
              onClick={() => setFilter('ready')}
              className={`bg-gray-800 border rounded-xl p-4 cursor-pointer transition-all ${filter === 'ready' ? 'border-green-500' : 'border-gray-700 hover:border-gray-600'}`}
            >
              <div className="text-3xl font-bold text-green-400">{stats.ready}</div>
              <div className="text-sm text-gray-400">Ready to Graduate</div>
            </div>
            <div 
              onClick={() => setFilter('close')}
              className={`bg-gray-800 border rounded-xl p-4 cursor-pointer transition-all ${filter === 'close' ? 'border-yellow-500' : 'border-gray-700 hover:border-gray-600'}`}
            >
              <div className="text-3xl font-bold text-yellow-400">{stats.close}</div>
              <div className="text-sm text-gray-400">Close (75%+)</div>
            </div>
            <div 
              onClick={() => setFilter('building')}
              className={`bg-gray-800 border rounded-xl p-4 cursor-pointer transition-all ${filter === 'building' ? 'border-blue-500' : 'border-gray-700 hover:border-gray-600'}`}
            >
              <div className="text-3xl font-bold text-blue-400">{stats.building}</div>
              <div className="text-sm text-gray-400">Building Trust</div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-10 h-10 border-3 border-yellow-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">🌱</div>
              <h3 className="text-xl font-bold text-white mb-2">No Groups Yet</h3>
              <p className="text-gray-400 mb-6">Start your wealth journey by joining or creating a SUSU circle</p>
              <Link 
                href="/susu"
                className="inline-block px-6 py-3 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 transition-colors"
              >
                Explore SUSU Circles
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => {
                const stageInfo = getStageLabel(group.stage);
                return (
                  <div key={group.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-all">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-lg">{group.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageInfo.bg} ${stageInfo.color}`}>
                          {stageInfo.text}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                        <div className="bg-gray-900/50 rounded-lg p-2">
                          <div className="text-sm font-bold text-white">{group.memberCount}</div>
                          <div className="text-xs text-gray-500">Members</div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-2">
                          <div className="text-sm font-bold text-white">{group.completedCycles}</div>
                          <div className="text-xs text-gray-500">Cycles</div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-2">
                          <div className="text-sm font-bold text-white">${group.totalContributed?.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Saved</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Graduation Progress</span>
                          <span className="text-white font-medium">{group.graduationProgress}%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${getProgressColor(group.graduationProgress)} transition-all`}
                            style={{ width: `${Math.min(group.graduationProgress, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link 
                          href={`/susu/group/${group.id}`}
                          className="flex-1 py-2 bg-gray-700 text-white text-center rounded-lg text-sm hover:bg-gray-600 transition-colors"
                        >
                          View Details
                        </Link>
                        {group.graduationProgress >= 100 && (
                          <button className="px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors">
                            Graduate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
