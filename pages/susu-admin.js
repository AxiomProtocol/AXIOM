import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

const ADMIN_WALLETS = [
  '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96',
].map(w => w.toLowerCase());

export default function SusuAdminPage() {
  const { walletState } = useWallet();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [hubs, setHubs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);

  const isAdmin = walletState?.address && 
    ADMIN_WALLETS.includes(walletState.address.toLowerCase());

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    const headers = { 'x-wallet-address': walletState?.address || '' };
    try {
      const [statsRes, hubsRes, groupsRes, flagsRes] = await Promise.all([
        fetch('/api/susu/admin/stats', { headers }),
        fetch('/api/susu/hubs'),
        fetch('/api/susu/groups?limit=100'),
        fetch('/api/susu/admin/feature-flags', { headers })
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
      if (hubsRes.ok) {
        const data = await hubsRes.json();
        setHubs(data.hubs || []);
      }
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }
      if (flagsRes.ok) {
        const data = await flagsRes.json();
        setFlags(data.flags || {});
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagKey, currentValue) => {
    try {
      const res = await fetch('/api/susu/admin/feature-flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagKey,
          enabled: !currentValue,
          walletAddress: walletState?.address
        })
      });
      if (res.ok) {
        setFlags(prev => ({
          ...prev,
          [flagKey]: { ...prev[flagKey], enabled: !currentValue }
        }));
      }
    } catch (error) {
      console.error('Error toggling flag:', error);
    }
  };

  if (!isAdmin) {
    return (
      <Layout title="SUSU Admin">
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p>Access denied. Please connect an admin wallet.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="SUSU Admin Dashboard">
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-3xl font-bold text-yellow-400 mb-8">SUSU Regional Admin Dashboard</h1>
        
        <div className="flex gap-4 mb-8 border-b border-gray-700 pb-4">
          {['overview', 'hubs', 'groups', 'flags'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg capitalize ${
                activeTab === tab 
                  ? 'bg-yellow-500 text-black font-semibold' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <>
            {activeTab === 'overview' && stats && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard title="Total Hubs" value={stats.totalHubs} />
                  <StatCard title="Hub Members" value={stats.totalHubMembers} />
                  <StatCard title="Purpose Groups" value={stats.totalGroups} />
                  <StatCard title="Graduated" value={stats.graduatedGroups} color="green" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="text-xl font-semibold text-yellow-400 mb-4">Conversion Funnel</h3>
                    <div className="space-y-3">
                      <FunnelRow label="Hub Joins" value={stats.events?.hub_join || 0} />
                      <FunnelRow label="Group Joins" value={stats.events?.group_join || 0} />
                      <FunnelRow label="Groups Created" value={stats.events?.group_create || 0} />
                      <FunnelRow label="Graduations" value={stats.events?.graduation || 0} />
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-sm text-gray-400">
                        Hub → Group: <span className="text-white font-semibold">{stats.conversionRate}%</span>
                      </p>
                      <p className="text-sm text-gray-400">
                        Group → Graduation: <span className="text-white font-semibold">{stats.graduationRate}%</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="text-xl font-semibold text-yellow-400 mb-4">Event Breakdown</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.events || {}).map(([event, count]) => (
                        <div key={event} className="flex justify-between text-sm">
                          <span className="text-gray-400 capitalize">{event.replace(/_/g, ' ')}</span>
                          <span className="text-white font-mono">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hubs' && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Region</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Members</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hubs.map(hub => (
                      <tr key={hub.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-sm">{hub.id}</td>
                        <td className="px-4 py-3 text-sm">{hub.regionDisplay}</td>
                        <td className="px-4 py-3 text-sm">{hub.memberCount || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            hub.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                          }`}>
                            {hub.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {hubs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No hubs found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'groups' && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Members</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Ready</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(group => (
                      <tr key={group.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-sm">{group.id}</td>
                        <td className="px-4 py-3 text-sm">{group.displayName}</td>
                        <td className="px-4 py-3 text-sm">{group.memberCount}/{group.maxMembers}</td>
                        <td className="px-4 py-3 text-sm">
                          {group.isReadyToActivate ? (
                            <span className="text-green-400">Ready</span>
                          ) : (
                            <span className="text-gray-500">Need {group.minMembersToActivate - (group.memberCount || 0)} more</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {group.graduatedToPoolId ? (
                            <span className="px-2 py-1 rounded text-xs bg-blue-900 text-blue-300">
                              Graduated (Pool #{group.graduatedToPoolId})
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-yellow-900 text-yellow-300">
                              Pre-commitment
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {groups.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No groups found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'flags' && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-xl font-semibold text-yellow-400 mb-4">Feature Flags</h3>
                <div className="space-y-4">
                  {Object.entries(flags).map(([key, flag]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-mono text-sm text-white">{key}</p>
                        <p className="text-xs text-gray-400 mt-1">{flag.description}</p>
                      </div>
                      <button
                        onClick={() => toggleFlag(key, flag.enabled)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          flag.enabled
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                        }`}
                      >
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ title, value, color = 'yellow' }) {
  const colorClasses = {
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    blue: 'text-blue-400'
  };
  
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value || 0}</p>
    </div>
  );
}

function FunnelRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-mono text-lg">{value}</span>
    </div>
  );
}
