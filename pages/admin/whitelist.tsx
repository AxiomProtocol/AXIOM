import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface AdminUser {
  id: number;
  email: string;
  role: string;
}

interface WhitelistMember {
  id: number;
  email: string;
  wallet_address: string | null;
  country: string | null;
  investment_interest: string | null;
  source: string;
  created_at: string;
  confirmed: boolean;
  unsubscribed: boolean;
  airdrop_status: string | null;
  airdrop_amount: string | null;
  airdrop_tx_hash: string | null;
}

interface WhitelistStats {
  total: number;
  today: number;
  thisWeek: number;
  withWallet: number;
  byCountry: { country: string; count: number }[];
  byInvestment: { range: string; count: number }[];
  airdropPending: number;
  airdropCompleted: number;
}

interface EarlyAccessMember {
  id: number;
  email: string;
  referral_code: string;
  referred_by: string | null;
  referral_count: number;
  referral_reward: number;
  base_reward: number;
  verified: boolean;
  ip_address: string | null;
  created_at: string;
}

interface EarlyAccessStats {
  total: number;
  today: number;
  thisWeek: number;
  referredSignups: number;
  spotsRemaining: number;
  totalBaseRewards: number;
  totalReferralRewards: number;
  totalRewardsCommitted: number;
}

export default function WhitelistDashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [members, setMembers] = useState<WhitelistMember[]>([]);
  const [stats, setStats] = useState<WhitelistStats | null>(null);
  const [earlyAccessMembers, setEarlyAccessMembers] = useState<EarlyAccessMember[]>([]);
  const [earlyAccessStats, setEarlyAccessStats] = useState<EarlyAccessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'airdrop' | 'early-access'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterWallet, setFilterWallet] = useState<'all' | 'with' | 'without'>('all');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [airdropAmount, setAirdropAmount] = useState('');
  const [processingAirdrop, setProcessingAirdrop] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authChecked && adminUser) {
      fetchData();
    }
  }, [authChecked, adminUser]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth/session');
      const data = await res.json();
      
      if (!data.authenticated) {
        router.push('/admin/login');
        return;
      }
      
      setAdminUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    } finally {
      setAuthChecked(true);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [membersRes, statsRes, earlyMembersRes, earlyStatsRes] = await Promise.all([
        fetch('/api/admin/whitelist/members'),
        fetch('/api/admin/whitelist/stats'),
        fetch('/api/admin/early-access/members'),
        fetch('/api/admin/early-access/stats')
      ]);

      if (membersRes.ok) setMembers(await membersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (earlyMembersRes.ok) setEarlyAccessMembers(await earlyMembersRes.json());
      if (earlyStatsRes.ok) setEarlyAccessStats(await earlyStatsRes.json());
    } catch (error) {
      console.error('Error fetching whitelist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = !searchTerm || 
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.wallet_address && m.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCountry = !filterCountry || m.country === filterCountry;
    const matchesWallet = filterWallet === 'all' || 
      (filterWallet === 'with' && m.wallet_address) ||
      (filterWallet === 'without' && !m.wallet_address);
    return matchesSearch && matchesCountry && matchesWallet;
  });

  const toggleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map(m => m.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const res = await fetch(`/api/admin/whitelist/export?format=${format}`);
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whitelist-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleMarkAirdrop = async (status: 'pending' | 'completed') => {
    if (selectedMembers.length === 0) {
      toast.error('No members selected');
      return;
    }

    if (status === 'pending' && !airdropAmount) {
      toast.error('Please enter airdrop amount');
      return;
    }

    setProcessingAirdrop(true);
    try {
      const res = await fetch('/api/admin/whitelist/airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberIds: selectedMembers,
          status,
          amount: airdropAmount || null
        })
      });

      if (!res.ok) throw new Error('Failed to update airdrop status');
      
      toast.success(`${selectedMembers.length} members marked as ${status}`);
      setSelectedMembers([]);
      setAirdropAmount('');
      fetchData();
    } catch (error) {
      toast.error('Failed to update airdrop status');
    } finally {
      setProcessingAirdrop(false);
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('Are you sure you want to remove this member from the whitelist?')) return;

    try {
      const res = await fetch(`/api/admin/whitelist/members/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Member removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const uniqueCountries = [...new Set(members.map(m => m.country).filter(Boolean))].sort();

  if (!authChecked || !adminUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <img src="/images/axiom-token.png" alt="Axiom" className="w-8 h-8 rounded-full" />
                <span className="text-xl font-bold text-white">AXIOM</span>
              </Link>
              <div className="flex gap-1">
                <Link href="/admin/treasury" className="px-3 py-2 text-gray-400 hover:text-white text-sm">Treasury</Link>
                <Link href="/admin/depin-monitor" className="px-3 py-2 text-gray-400 hover:text-white text-sm">DePIN</Link>
                <Link href="/admin/iot-dashboard" className="px-3 py-2 text-gray-400 hover:text-white text-sm">IoT</Link>
                <Link href="/admin/whitelist" className="px-3 py-2 text-amber-400 font-medium text-sm">Whitelist</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">{adminUser.email}</span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Whitelist Management</h1>
            <p className="text-gray-400 mt-1">Manage TGE subscribers and airdrops</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm">
              Export CSV
            </button>
            <button onClick={() => handleExport('json')} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm">
              Export JSON
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['overview', 'members', 'airdrop', 'early-access'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                activeTab === tab ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'early-access' ? 'Early Access' : tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div className="text-3xl font-bold text-amber-400">{stats.total}</div>
                    <div className="text-gray-400 text-sm">Total Subscribers</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div className="text-3xl font-bold text-green-400">{stats.today}</div>
                    <div className="text-gray-400 text-sm">Today</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div className="text-3xl font-bold text-blue-400">{stats.thisWeek}</div>
                    <div className="text-gray-400 text-sm">This Week</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div className="text-3xl font-bold text-purple-400">{stats.withWallet}</div>
                    <div className="text-gray-400 text-sm">With Wallet</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">By Country</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {stats.byCountry.map(c => (
                        <div key={c.country} className="flex justify-between text-sm">
                          <span className="text-gray-300">{c.country || 'Not specified'}</span>
                          <span className="text-amber-400 font-medium">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">By Investment Interest</h3>
                    <div className="space-y-2">
                      {stats.byInvestment.map(i => (
                        <div key={i.range} className="flex justify-between text-sm">
                          <span className="text-gray-300">{i.range || 'Not specified'}</span>
                          <span className="text-amber-400 font-medium">{i.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-6">
                    <div className="text-3xl font-bold text-green-400">{stats.airdropCompleted}</div>
                    <div className="text-gray-300">Airdrops Completed</div>
                  </div>
                  <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-6">
                    <div className="text-3xl font-bold text-yellow-400">{stats.airdropPending}</div>
                    <div className="text-gray-300">Airdrops Pending</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Search email or wallet..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 w-64"
                  />
                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">All Countries</option>
                    {uniqueCountries.map(c => (
                      <option key={c} value={c!}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={filterWallet}
                    onChange={(e) => setFilterWallet(e.target.value as any)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="all">All Wallets</option>
                    <option value="with">With Wallet</option>
                    <option value="without">Without Wallet</option>
                  </select>
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-400">
                          <input
                            type="checkbox"
                            checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400">Email</th>
                        <th className="px-4 py-3 text-left text-gray-400">Wallet</th>
                        <th className="px-4 py-3 text-left text-gray-400">Country</th>
                        <th className="px-4 py-3 text-left text-gray-400">Investment</th>
                        <th className="px-4 py-3 text-left text-gray-400">Airdrop</th>
                        <th className="px-4 py-3 text-left text-gray-400">Date</th>
                        <th className="px-4 py-3 text-left text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredMembers.map(m => (
                        <tr key={m.id} className="hover:bg-gray-700/50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(m.id)}
                              onChange={() => toggleSelect(m.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-white">{m.email}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">
                            {m.wallet_address ? `${m.wallet_address.slice(0, 6)}...${m.wallet_address.slice(-4)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-300">{m.country || '-'}</td>
                          <td className="px-4 py-3 text-gray-300">{m.investment_interest || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              m.airdrop_status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              m.airdrop_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {m.airdrop_status || 'none'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {new Date(m.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteMember(m.id)}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No members found</div>
                  )}
                </div>
                <div className="text-gray-400 text-sm">
                  Showing {filteredMembers.length} of {members.length} members
                  {selectedMembers.length > 0 && ` | ${selectedMembers.length} selected`}
                </div>
              </div>
            )}

            {activeTab === 'airdrop' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4">Airdrop Management</h3>
                  <p className="text-gray-400 mb-6">
                    Select members from the Members tab, then use the controls below to manage airdrops.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Selected Members</h4>
                      <div className="text-3xl font-bold text-amber-400 mb-2">{selectedMembers.length}</div>
                      {selectedMembers.length > 0 && (
                        <button
                          onClick={() => setSelectedMembers([])}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Eligible for Airdrop</h4>
                      <div className="text-3xl font-bold text-green-400">{stats?.withWallet || 0}</div>
                      <p className="text-gray-500 text-sm">Members with wallet addresses</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="text-white text-sm block mb-2">Airdrop Amount (AXM per address)</label>
                      <input
                        type="text"
                        value={airdropAmount}
                        onChange={(e) => setAirdropAmount(e.target.value)}
                        placeholder="e.g., 1000"
                        className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white w-64"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleMarkAirdrop('pending')}
                        disabled={processingAirdrop || selectedMembers.length === 0}
                        className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        Mark as Pending
                      </button>
                      <button
                        onClick={() => handleMarkAirdrop('completed')}
                        disabled={processingAirdrop || selectedMembers.length === 0}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        Mark as Completed
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-900/30 border border-amber-500/50 rounded-xl p-6">
                  <h4 className="text-amber-400 font-bold mb-2">Airdrop Workflow</h4>
                  <ol className="list-decimal list-inside text-gray-300 space-y-2 text-sm">
                    <li>Go to Members tab and filter by "With Wallet" to see eligible addresses</li>
                    <li>Select members using checkboxes (or select all)</li>
                    <li>Return to Airdrop tab and enter the AXM amount per address</li>
                    <li>Click "Mark as Pending" to queue them for airdrop</li>
                    <li>Execute the airdrop using your preferred method (Disperse.app, script, etc.)</li>
                    <li>After tokens are sent, mark selected members as "Completed"</li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === 'early-access' && (
              <div className="space-y-6">
                {earlyAccessStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <div className="text-3xl font-bold text-amber-400">{earlyAccessStats.total}</div>
                      <div className="text-gray-400 text-sm">Total Signups</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <div className="text-3xl font-bold text-green-400">{earlyAccessStats.today}</div>
                      <div className="text-gray-400 text-sm">Today</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <div className="text-3xl font-bold text-blue-400">{earlyAccessStats.spotsRemaining}</div>
                      <div className="text-gray-400 text-sm">Spots Remaining</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <div className="text-3xl font-bold text-purple-400">{earlyAccessStats.referredSignups}</div>
                      <div className="text-gray-400 text-sm">Via Referral</div>
                    </div>
                  </div>
                )}

                {earlyAccessStats && (
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-6">
                      <div className="text-2xl font-bold text-green-400">{earlyAccessStats.totalBaseRewards.toLocaleString()} AXM</div>
                      <div className="text-gray-300 text-sm">Base Rewards Committed</div>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-500/50 rounded-xl p-6">
                      <div className="text-2xl font-bold text-purple-400">{earlyAccessStats.totalReferralRewards.toLocaleString()} AXM</div>
                      <div className="text-gray-300 text-sm">Referral Rewards Committed</div>
                    </div>
                    <div className="bg-amber-900/30 border border-amber-500/50 rounded-xl p-6">
                      <div className="text-2xl font-bold text-amber-400">{earlyAccessStats.totalRewardsCommitted.toLocaleString()} AXM</div>
                      <div className="text-gray-300 text-sm">Total Rewards Committed</div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">Early Access Signups</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-gray-400">Email</th>
                          <th className="px-4 py-3 text-left text-gray-400">Referral Code</th>
                          <th className="px-4 py-3 text-left text-gray-400">Referred By</th>
                          <th className="px-4 py-3 text-left text-gray-400">Referrals</th>
                          <th className="px-4 py-3 text-left text-gray-400">Base Reward</th>
                          <th className="px-4 py-3 text-left text-gray-400">Referral Reward</th>
                          <th className="px-4 py-3 text-left text-gray-400">Signed Up</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earlyAccessMembers.map(member => (
                          <tr key={member.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-white">{member.email}</td>
                            <td className="px-4 py-3 text-amber-400 font-mono text-xs">{member.referral_code}</td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{member.referred_by || '-'}</td>
                            <td className="px-4 py-3 text-white">{member.referral_count}</td>
                            <td className="px-4 py-3 text-green-400">{member.base_reward} AXM</td>
                            <td className="px-4 py-3 text-purple-400">{member.referral_reward} AXM</td>
                            <td className="px-4 py-3 text-gray-400">{new Date(member.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                        {earlyAccessMembers.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                              No early access signups yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t border-gray-700 text-gray-400 text-sm">
                    Showing {earlyAccessMembers.length} signups
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
