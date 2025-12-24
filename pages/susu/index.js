import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useWallet } from '../../components/WalletConnect/WalletContext';
import { ethers } from 'ethers';
import DisclosureBanner from '../../components/DisclosureBanner';
import StepProgressBanner from '../../components/StepProgressBanner';
import PolicyComplianceCard from '../../components/PolicyComplianceCard';
import { SUSU_ROUTES } from '../../lib/susuRoutes';

const STATUS_LABELS = {
  0: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  1: { label: 'Active', color: 'bg-green-100 text-green-700 border-green-200' },
  2: { label: 'Completed', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  3: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' }
};

const SUSU_CONTRACT = '0x6C69D730327930B49A7997B7b5fb0865F30c95A5';
const AXM_TOKEN = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';

const SUSU_ABI = [
  "function createPool(address token, uint256 memberCount, uint256 contributionAmount, uint256 cycleDuration, uint256 startTime, bool randomizedOrder, bool openJoin, uint16 protocolFeeBps) external returns (uint256)",
  "function joinPool(uint256 poolId) external",
  "function contribute(uint256 poolId) external"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

const formatDuration = (seconds) => {
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 86400)} days`;
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Not set';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function SusuPage() {
  const router = useRouter();
  const { walletState, connectMetaMask } = useWallet();
  const [pools, setPools] = useState([]);
  const [userPools, setUserPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('discover');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPool, setSelectedPool] = useState(null);
  const [poolDetails, setPoolDetails] = useState(null);
  const [stats, setStats] = useState({ totalPools: 0, defaultParams: null });
  const [contractAddress, setContractAddress] = useState('');
  
  const [createForm, setCreateForm] = useState({
    memberCount: 5,
    contributionAmount: 100,
    cycleDuration: 'monthly',
    randomizedOrder: false,
    openJoin: true
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Discovery state
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [discoverHubs, setDiscoverHubs] = useState([]);
  const [discoverCategories, setDiscoverCategories] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverFilters, setDiscoverFilters] = useState({
    region: '',
    purposeId: '',
    q: ''
  });
  const [selectedHub, setSelectedHub] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({
    hubId: '',
    purposeCategoryId: '',
    contributionAmount: 50,
    cycleLengthDays: 30,
    description: '',
    minMembersToActivate: 3,
    maxMembers: 10
  });
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Trust Center state
  const [trustData, setTrustData] = useState(null);
  const [trustLoading, setTrustLoading] = useState(false);
  const [trustSection, setTrustSection] = useState('safety');

  useEffect(() => {
    fetchPools();
    fetchDiscoveryData();
  }, []);

  useEffect(() => {
    if (activeTab === 'safety' && !trustData && !trustLoading) {
      fetchTrustCenterData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (walletState?.address) {
      fetchUserPools();
    }
  }, [walletState?.address]);

  useEffect(() => {
    const { tab, action, filter } = router.query;
    if (tab === 'create') {
      setActiveTab('create');
    } else if (tab === 'browse') {
      setActiveTab('browse');
    } else if (tab === 'discover') {
      setActiveTab('discover');
      if (filter === 'purpose' && discoverCategories.length > 0) {
        setDiscoverFilters(prev => ({ ...prev, purposeId: discoverCategories[0]?.id?.toString() || '' }));
      }
    }
    if (action === 'create-group') {
      setActiveTab('discover');
      setShowCreateGroup(true);
    }
  }, [router.query, discoverCategories]);

  const fetchDiscoveryData = async () => {
    setDiscoverLoading(true);
    try {
      const [hubsRes, categoriesRes, groupsRes] = await Promise.all([
        fetch('/api/susu/hubs'),
        fetch('/api/susu/categories'),
        fetch('/api/susu/discover')
      ]);
      
      if (hubsRes.ok) {
        const data = await hubsRes.json();
        setDiscoverHubs(data.hubs || []);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setDiscoverCategories(data.categories || []);
      }
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setDiscoverGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching discovery data:', error);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const fetchTrustCenterData = async () => {
    setTrustLoading(true);
    try {
      const res = await fetch('/api/susu/trust-center');
      if (res.ok) {
        const data = await res.json();
        setTrustData(data.trustCenter);
      }
    } catch (error) {
      console.error('Error fetching trust center data:', error);
    } finally {
      setTrustLoading(false);
    }
  };

  const searchGroups = async () => {
    setDiscoverLoading(true);
    try {
      const params = new URLSearchParams();
      if (discoverFilters.region) params.append('region', discoverFilters.region);
      if (discoverFilters.purposeId) params.append('purposeId', discoverFilters.purposeId);
      if (discoverFilters.q) params.append('q', discoverFilters.q);
      
      const res = await fetch(`/api/susu/discover?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDiscoverGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error searching groups:', error);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    if (!walletState?.address) {
      alert('Please connect your wallet first');
      return;
    }
    try {
      const res = await fetch(`/api/susu/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletState.address })
      });
      if (res.ok) {
        alert('Successfully joined the group!');
        fetchDiscoveryData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to join group');
      }
    } catch (error) {
      alert('Error joining group');
    }
  };

  const handleGraduateGroup = async (group) => {
    if (!walletState?.address) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (!window.confirm(`Graduate "${group.displayName || group.purposeName}" to an on-chain circle? This will create a smart contract pool.`)) {
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(SUSU_CONTRACT, SUSU_ABI, signer);
      
      const cycleDurationSeconds = (group.cycleLengthDays || 30) * 24 * 60 * 60;
      const contributionWei = ethers.parseEther(String(group.contributionAmount || '100'));
      const memberCount = group.memberCount || group.minMembersToActivate || 3;
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      
      const tx = await contract.createPool(
        AXM_TOKEN,
        memberCount,
        contributionWei,
        cycleDurationSeconds,
        startTime,
        false,
        false,
        100
      );
      
      const receipt = await tx.wait();
      const poolId = receipt.logs[0]?.args?.[0] || 1;

      const res = await fetch(`/api/susu/groups/${group.id}/graduate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: walletState.address,
          poolId: Number(poolId),
          txHash: tx.hash
        })
      });
      
      if (res.ok) {
        alert('Group successfully graduated to on-chain circle!');
        fetchDiscoveryData();
      } else {
        const data = await res.json();
        alert(data.error || 'Pool created but failed to update group');
      }
    } catch (error) {
      console.error('Error graduating group:', error);
      alert('Error creating on-chain pool: ' + (error.message || 'Unknown error'));
    }
  };

  const handleCreateGroup = async () => {
    if (!walletState?.address) {
      alert('Please connect your wallet first');
      return;
    }
    if (!newGroupForm.hubId || !newGroupForm.purposeCategoryId) {
      alert('Please select a region hub and purpose category');
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await fetch('/api/susu/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGroupForm,
          walletAddress: walletState.address
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreateGroup(false);
        setNewGroupForm({
          hubId: '',
          purposeCategoryId: '',
          contributionAmount: 50,
          cycleLengthDays: 30,
          description: '',
          minMembersToActivate: 3,
          maxMembers: 10
        });
        if (data.group?.id) {
          router.push(`/susu/group/${data.group.id}`);
        } else {
          fetchDiscoveryData();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create group');
      }
    } catch (error) {
      alert('Error creating group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const fetchPools = async () => {
    try {
      const res = await fetch('/api/susu/pools');
      if (res.ok) {
        const data = await res.json();
        setPools(data.pools || []);
        setStats({
          totalPools: data.totalPools || 0,
          defaultParams: data.defaultParams
        });
        setContractAddress(data.contractAddress || SUSU_CONTRACT);
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPools = async () => {
    try {
      const res = await fetch(`/api/susu/user/${walletState.address}`);
      if (res.ok) {
        const data = await res.json();
        setUserPools(data.userPools || []);
      }
    } catch (error) {
      console.error('Error fetching user pools:', error);
    }
  };

  const fetchPoolDetails = async (poolId) => {
    try {
      const res = await fetch(`/api/susu/pool/${poolId}`);
      if (res.ok) {
        const data = await res.json();
        setPoolDetails(data);
      }
    } catch (error) {
      console.error('Error fetching pool details:', error);
    }
  };

  const handlePoolClick = (pool) => {
    setSelectedPool(pool);
    fetchPoolDetails(pool.poolId);
  };

  const getCycleDurationSeconds = (duration) => {
    switch (duration) {
      case 'daily': return 86400;
      case 'weekly': return 604800;
      case 'biweekly': return 1209600;
      case 'monthly': return 2592000;
      default: return 2592000;
    }
  };

  const handleCreatePool = async () => {
    if (!walletState?.address) {
      setCreateError('Please connect your wallet first');
      return;
    }

    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contributionWei = ethers.parseEther(createForm.contributionAmount.toString());
      const cycleDurationSeconds = getCycleDurationSeconds(createForm.cycleDuration);
      const startTime = Math.floor(Date.now() / 1000) + 86400;
      
      const tokenContract = new ethers.Contract(AXM_TOKEN, ERC20_ABI, signer);
      const susuContract = new ethers.Contract(SUSU_CONTRACT, SUSU_ABI, signer);
      
      const tx = await susuContract.createPool(
        AXM_TOKEN,
        createForm.memberCount,
        contributionWei,
        cycleDurationSeconds,
        startTime,
        createForm.randomizedOrder,
        createForm.openJoin,
        100
      );
      
      setCreateSuccess('Transaction submitted! Waiting for confirmation...');
      await tx.wait();
      
      setCreateSuccess('Pool created successfully! It will appear in the list shortly.');
      setCreateForm({
        memberCount: 5,
        contributionAmount: 100,
        cycleDuration: 'monthly',
        randomizedOrder: false,
        openJoin: true
      });
      
      setTimeout(() => {
        fetchPools();
        setActiveTab('browse');
      }, 3000);
      
    } catch (error) {
      console.error('Error creating pool:', error);
      setCreateError(error.message || 'Failed to create pool. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const filteredPools = pools.filter(p => 
    filterStatus === 'all' || p.status === parseInt(filterStatus)
  );

  const tabs = [
    { id: 'discover', label: 'Discover Groups', icon: '🌍' },
    { id: 'browse', label: 'Browse Pools', icon: '🔍' },
    { id: 'create', label: 'Create Pool', icon: '➕' },
    { id: 'my-pools', label: 'My Pools', icon: '👤' },
    { id: 'how-it-works', label: 'How It Works', icon: '📖' },
    { id: 'safety', label: 'Safety & Trust', icon: '🛡️' },
    { id: 'admin', label: 'Admin', icon: '⚙️', href: '/susu/admin' },
  ];

  return (
    <Layout>
      <StepProgressBanner currentStep="save" />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                🤝
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-1">The Wealth Practice</h1>
                <p className="text-gray-300">Structured Savings Built With Others</p>
              </div>
            </div>

            <p className="text-amber-200 text-sm mb-2">Step 3: Practice Wealth — Start small, build consistency, grow over time.</p>
            <p className="text-gray-400 max-w-2xl mt-2 mb-4">
              A structured savings practice built with others. Focus on consistency, discipline, and alignment — not investing or speculation.
            </p>
            <p className="text-gray-500 text-xs mb-4">Based on the traditional SUSU (rotating savings) method.</p>
            <div className="flex flex-wrap gap-4 mb-4">
              <Link href={SUSU_ROUTES.SUSU_START_PATH} className="text-amber-400 hover:text-amber-300 underline text-sm">
                New to The Wealth Practice? Start here
              </Link>
              <Link href={SUSU_ROUTES.SUSU_FAQ_PATH} className="text-gray-400 hover:text-gray-300 underline text-sm">
                Read the FAQ
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-400">{stats.totalPools}</div>
                <div className="text-sm text-gray-300">Total Pools</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-400">{pools.filter(p => p.status === 1).length}</div>
                <div className="text-sm text-gray-300">Active Pools</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-400">{stats.defaultParams?.protocolFeeBps ? (stats.defaultParams.protocolFeeBps / 100) + '%' : '1%'}</div>
                <div className="text-sm text-gray-300">Protocol Fee</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-400">{userPools.length}</div>
                <div className="text-sm text-gray-300">Your Pools</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 -mt-6">
          <div className="flex overflow-x-auto gap-2 pb-2">
            {tabs.map(tab => (
              tab.href ? (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap bg-white text-gray-600 hover:bg-amber-50 border border-gray-200"
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </Link>
              ) : (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                      : 'bg-white text-gray-600 hover:bg-amber-50 border border-gray-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          <DisclosureBanner 
            featureId="susu" 
            walletAddress={walletState?.address}
          />
          {activeTab === 'discover' && (
            <div>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Discover Purpose Groups</h2>
                  <p className="text-gray-500 mt-1">Find savings groups by region and purpose, or start your own</p>
                  <p className="text-xs text-blue-600 mt-1">New to SUSU? Check the "How It Works" tab to learn about community savings!</p>
                </div>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors flex items-center gap-2"
                >
                  <span>+</span> Start a Group
                </button>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={discoverFilters.q}
                  onChange={(e) => setDiscoverFilters({...discoverFilters, q: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && searchGroups()}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <select
                  value={discoverFilters.region}
                  onChange={(e) => { setDiscoverFilters({...discoverFilters, region: e.target.value}); }}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">All Regions</option>
                  {discoverHubs.map(hub => (
                    <option key={hub.id} value={hub.regionId}>{hub.regionDisplay}</option>
                  ))}
                </select>
                <select
                  value={discoverFilters.purposeId}
                  onChange={(e) => { setDiscoverFilters({...discoverFilters, purposeId: e.target.value}); }}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">All Purposes</option>
                  {discoverCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                <button
                  onClick={searchGroups}
                  className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                  Search
                </button>
              </div>

              {discoverHubs.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Interest Hubs</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {discoverHubs.map(hub => (
                      <div
                        key={hub.id}
                        onClick={() => setDiscoverFilters({...discoverFilters, region: hub.regionId})}
                        className={`flex-shrink-0 bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                          discoverFilters.region === hub.regionId 
                            ? 'border-amber-500 shadow-lg' 
                            : 'border-gray-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">{hub.regionDisplay}</div>
                        <div className="text-sm text-gray-500">{hub.memberCount || 0} members</div>
                      </div>
                    ))}
                    <div
                      onClick={() => setShowCreateGroup(true)}
                      className="flex-shrink-0 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4 cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all flex items-center gap-2"
                    >
                      <span className="text-2xl text-gray-400">+</span>
                      <span className="text-gray-600">New Region</span>
                    </div>
                  </div>
                </div>
              )}

              {discoverCategories.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Savings Purposes</h3>
                  <div className="flex flex-wrap gap-2">
                    {discoverCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setDiscoverFilters({...discoverFilters, purposeId: discoverFilters.purposeId === cat.id.toString() ? '' : cat.id.toString()})}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                          discoverFilters.purposeId === cat.id.toString()
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-amber-100'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Available Purpose Groups
                {discoverGroups.length > 0 && <span className="text-gray-500 font-normal ml-2">({discoverGroups.length})</span>}
              </h3>

              {discoverLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500">Loading groups...</p>
                </div>
              ) : discoverGroups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8">
                  <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🌱</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No local groups yet.</h3>
                    <p className="text-gray-600">That's normal early on. You can still connect and start building trust today.</p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Link
                      href={SUSU_ROUTES.GOAL_GROUPS_PATH}
                      className="block bg-amber-50 rounded-xl border border-amber-200 p-5 hover:shadow-lg hover:border-amber-400 transition-all"
                    >
                      <div className="text-2xl mb-2">🎯</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Join a Goal Group</h4>
                      <p className="text-sm text-gray-600">Connect with people saving for the same goal, regardless of location.</p>
                    </Link>
                    <div
                      onClick={() => setShowCreateGroup(true)}
                      className="block bg-gray-50 rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-amber-400 transition-all cursor-pointer"
                    >
                      <div className="text-2xl mb-2">➕</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Start a Group</h4>
                      <p className="text-sm text-gray-600">Invite friends, family, or coworkers. Set the goal and rules together.</p>
                    </div>
                    <Link
                      href={SUSU_ROUTES.LEARN_PATH}
                      className="block bg-blue-50 rounded-xl border border-blue-200 p-5 hover:shadow-lg hover:border-blue-400 transition-all"
                    >
                      <div className="text-2xl mb-2">📖</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Learn How Group Saving Works</h4>
                      <p className="text-sm text-gray-600">A short guide to the Learn, Connect, Save Together journey.</p>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {discoverGroups.map(group => (
                    <div
                      key={group.id}
                      className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer"
                      onClick={() => router.push(`/susu/group/${group.id}`)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{group.purposeIcon}</span>
                          <span className="font-semibold text-gray-900">{group.purposeName}</span>
                        </div>
                        {group.isReadyToActivate && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Ready!
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-500 mb-4">{group.regionDisplay}</div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Contribution</span>
                          <span className="font-medium">{parseFloat(group.contributionAmount).toLocaleString()} {group.contributionCurrency}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Cycle</span>
                          <span className="font-medium">{group.cycleLengthDays} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Members</span>
                          <span className="font-medium">{group.memberCount || 0} / {group.maxMembers}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full transition-all"
                            style={{ width: `${((group.memberCount || 0) / (group.maxMembers || 10)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        {group.availableSlots > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleJoinGroup(group.id); }}
                            className="w-full py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                          >
                            Join Group ({group.availableSlots} slots left)
                          </button>
                        )}
                        {group.availableSlots <= 0 && (
                          <div className="w-full py-2 bg-gray-100 text-gray-500 rounded-lg font-medium text-center">
                            Group Full
                          </div>
                        )}
                        {group.isReadyToActivate && !group.graduatedToPoolId && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleGraduateGroup(group); }}
                            className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <span>Graduate to On-Chain</span>
                          </button>
                        )}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Click to view group details & members
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'browse' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Available Pools</h2>
                <div className="flex gap-2">
                  {['all', '0', '1', '2'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterStatus === status
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? 'All' : STATUS_LABELS[status]?.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500">Loading pools...</p>
                </div>
              ) : filteredPools.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <div className="text-5xl mb-4">🏦</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pools Found</h3>
                  <p className="text-gray-500 mb-6">Be the first to create a SUSU savings pool!</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                  >
                    Create Your First Pool
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPools.map(pool => (
                    <div
                      key={pool.poolId}
                      onClick={() => handlePoolClick(pool)}
                      className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer hover:border-amber-300"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Pool #{pool.poolId}</div>
                          <div className="font-semibold text-gray-900">{pool.tokenSymbol || 'AXM'} Pool</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_LABELS[pool.status]?.color}`}>
                          {STATUS_LABELS[pool.status]?.label}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Contribution</span>
                          <span className="font-medium">{parseFloat(pool.contributionAmount).toLocaleString()} {pool.tokenSymbol}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Members</span>
                          <span className="font-medium">{pool.currentMemberCount || 0} / {pool.memberCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Cycle</span>
                          <span className="font-medium">{formatDuration(pool.cycleDuration)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-medium">{pool.currentCycle} / {pool.totalCycles}</span>
                        </div>
                      </div>

                      {pool.openJoin && pool.status === 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <span>✓</span> Open for joining
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create a SUSU Pool</h2>
                <p className="text-gray-500 mb-8">Start a community savings circle with friends, family, or colleagues.</p>

                {!walletState?.address ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">🔐</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
                    <p className="text-gray-500 mb-6">Connect your wallet to create a SUSU pool</p>
                    <button
                      onClick={connectMetaMask}
                      className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                    >
                      Connect Wallet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <PolicyComplianceCard 
                      contributionAmount={createForm.contributionAmount}
                      onComplianceCheck={(result) => {
                        if (!result.passed) {
                          setCreateError('Please meet all membership requirements before creating a pool.');
                        } else {
                          setCreateError('');
                        }
                      }}
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Members
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="50"
                        value={createForm.memberCount}
                        onChange={(e) => setCreateForm({...createForm, memberCount: parseInt(e.target.value) || 2})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Between 2 and 50 members. Each member receives the pot once.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contribution Amount (AXM)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={createForm.contributionAmount}
                        onChange={(e) => setCreateForm({...createForm, contributionAmount: parseFloat(e.target.value) || 1})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Fixed amount each member contributes per cycle.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cycle Duration
                      </label>
                      <select
                        value={createForm.cycleDuration}
                        onChange={(e) => setCreateForm({...createForm, cycleDuration: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">How often members contribute and payouts occur.</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createForm.randomizedOrder}
                          onChange={(e) => setCreateForm({...createForm, randomizedOrder: e.target.checked})}
                          className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-700">Randomize payout order</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createForm.openJoin}
                          onChange={(e) => setCreateForm({...createForm, openJoin: e.target.checked})}
                          className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-700">Allow anyone to join (open pool)</span>
                      </label>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4">
                      <h4 className="font-semibold text-amber-800 mb-2">Pool Summary</h4>
                      <div className="space-y-1 text-sm text-amber-700">
                        <p>Members: {createForm.memberCount}</p>
                        <p>Contribution: {createForm.contributionAmount} AXM per {createForm.cycleDuration.replace('ly', '')}</p>
                        <p>Total pool per cycle: {createForm.memberCount * createForm.contributionAmount} AXM</p>
                        <p>Payout per member: ~{(createForm.memberCount * createForm.contributionAmount * 0.99).toFixed(2)} AXM (after 1% fee)</p>
                        <p>Duration: {createForm.memberCount} {createForm.cycleDuration.replace('ly', '')}s</p>
                      </div>
                    </div>

                    {createError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                        {createError}
                      </div>
                    )}

                    {createSuccess && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700">
                        {createSuccess}
                      </div>
                    )}

                    <button
                      onClick={handleCreatePool}
                      disabled={creating}
                      className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? 'Creating Pool...' : 'Create Pool'}
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                      Creating a pool requires a transaction on Arbitrum. You will be the first member automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'my-pools' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">My Pools</h2>
              
              {!walletState?.address ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <div className="text-5xl mb-4">🔐</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-500 mb-6">Connect your wallet to view your SUSU pools</p>
                  <button
                    onClick={connectMetaMask}
                    className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : userPools.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <div className="text-5xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pools Yet</h3>
                  <p className="text-gray-500 mb-6">You haven't joined any SUSU pools yet</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setActiveTab('browse')}
                      className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                    >
                      Browse Pools
                    </button>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                    >
                      Create a Pool
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPools.map(({ pool, member, hasContributedThisCycle }) => (
                    <div
                      key={pool.poolId}
                      className="bg-white rounded-2xl border border-gray-200 p-6"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🏦</span>
                            <div>
                              <div className="font-semibold text-gray-900">Pool #{pool.poolId}</div>
                              <div className="text-sm text-gray-500">{pool.tokenSymbol} Pool</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4">
                          <div className="text-center">
                            <div className="text-sm text-gray-500">Position</div>
                            <div className="font-semibold">#{member?.payoutPosition || 'N/A'}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-500">Contributed</div>
                            <div className="font-semibold">{parseFloat(member?.totalContributed || 0).toLocaleString()}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-500">Received</div>
                            <div className="font-semibold">{parseFloat(member?.totalReceived || 0).toLocaleString()}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-500">Status</div>
                            <div className={`font-semibold ${member?.hasReceivedPayout ? 'text-green-600' : 'text-amber-600'}`}>
                              {member?.hasReceivedPayout ? 'Paid' : 'Waiting'}
                            </div>
                          </div>
                        </div>

                        {pool.status === 1 && !hasContributedThisCycle && (
                          <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                            Contribution Due
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'how-it-works' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">How SUSU Works</h2>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Create or Join a Pool</h3>
                    <p className="text-gray-600">A pool organizer creates a SUSU pool with fixed parameters: contribution amount, number of members, and cycle duration. Members join until the pool is full.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Everyone Contributes Each Cycle</h3>
                    <p className="text-gray-600">Each cycle (e.g., weekly or monthly), all members contribute the same fixed amount to the pool. Contributions are tracked on-chain for complete transparency.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">One Member Receives the Pot</h3>
                    <p className="text-gray-600">At the end of each cycle, one member receives the entire pooled amount (minus a small 1% protocol fee). The order is either sequential or randomized at pool creation.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Everyone Gets Their Turn</h3>
                    <p className="text-gray-600">The pool continues until every member has received the pot once. Early recipients effectively receive an interest-free advance, while later recipients save consistently.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-amber-50 rounded-xl">
                <h3 className="font-semibold text-amber-800 mb-3">Example: 10-Member Monthly Pool</h3>
                <div className="text-amber-700 text-sm space-y-2">
                  <p><strong>Setup:</strong> 10 friends create a pool with 100 AXM monthly contributions</p>
                  <p><strong>Each month:</strong> Everyone contributes 100 AXM = 1,000 AXM total</p>
                  <p><strong>Payout:</strong> One member receives ~990 AXM (after 1% fee)</p>
                  <p><strong>Duration:</strong> 10 months until everyone has received once</p>
                  <p><strong>Result:</strong> Each person contributes 1,000 AXM total, receives ~990 AXM</p>
                </div>
              </div>

              <div className="mt-6 p-6 bg-green-50 rounded-xl">
                <h3 className="font-semibold text-green-800 mb-3">Why Use SUSU?</h3>
                <ul className="text-green-700 text-sm space-y-2">
                  <li>✓ Access large sums without loans or credit checks</li>
                  <li>✓ Build savings discipline through regular contributions</li>
                  <li>✓ Community-based mutual aid with friends you trust</li>
                  <li>✓ Smart contract enforcement ensures fair payouts</li>
                  <li>✓ No interest charges - just community savings</li>
                  <li>✓ Fully transparent on-chain records</li>
                </ul>
              </div>

              <div className="mt-8 border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Finding Your Savings Community</h2>
                <p className="text-gray-600 mb-6">
                  Not sure where to start? Use our Discovery System to find or create a savings group that matches your goals and location.
                </p>

                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <span className="text-xl">🌍</span> Step 1: Browse by Region
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Interest Hubs are regional communities - your city, state, or country. Filter by region to find people near you who share similar financial goals. Local groups often work better because members can build real relationships.
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-6">
                    <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                      <span className="text-xl">🎯</span> Step 2: Choose Your Purpose
                    </h3>
                    <p className="text-purple-700 text-sm mb-3">
                      Purpose Groups are organized around savings goals. We offer 12 categories to help you find like-minded savers:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-purple-600 text-xs">
                      <span>🛡️ Emergency Fund</span>
                      <span>🏠 Home Down Payment</span>
                      <span>🚀 Business Startup</span>
                      <span>📚 Education</span>
                      <span>💍 Wedding/Celebration</span>
                      <span>✈️ Travel</span>
                      <span>🚗 Vehicle</span>
                      <span>👶 Family Planning</span>
                      <span>🏥 Medical/Health</span>
                      <span>💳 Debt Payoff</span>
                      <span>📈 Investment</span>
                      <span>🌟 General Savings</span>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-6">
                    <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <span className="text-xl">👥</span> Step 3: Join a Purpose Group
                    </h3>
                    <p className="text-amber-700 text-sm">
                      Purpose Groups are pre-commitment groups where members gather before creating an on-chain pool. This is your chance to meet potential pool members, discuss terms, and build trust. Once enough committed members join, the group can "graduate" to become an official on-chain SUSU Circle.
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <span className="text-xl">✨</span> Step 4: Graduate to On-Chain Circle
                    </h3>
                    <p className="text-green-700 text-sm">
                      When your Purpose Group has enough committed members (usually 3-10), the organizer can create an official on-chain SUSU pool. At this point, the smart contract takes over: contributions are locked, payouts are automated, and everything is transparent on the blockchain.
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-100 rounded-xl">
                  <p className="text-gray-600 text-sm text-center">
                    <strong>Tip:</strong> Can't find a group that fits? Click "+ Start a Group" to create your own Purpose Group and invite others to join!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">🛡️</div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Safety & Trust Center</h2>
                    <p className="text-gray-500 text-sm">Complete transparency about how Axiom SUSU works</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  {[
                    { id: 'safety', label: 'Security' },
                    { id: 'custody', label: 'Custody Model' },
                    { id: 'risks', label: 'Risk Disclosures' },
                    { id: 'claims', label: 'Marketing Claims' },
                    { id: 'faq', label: 'FAQ' },
                    { id: 'stats', label: 'Operational Stats' }
                  ].map(section => (
                    <button
                      key={section.id}
                      onClick={() => setTrustSection(section.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        trustSection === section.id
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>

                {trustSection === 'safety' && (
                  <div className="space-y-6">
                    <p className="text-gray-600">
                      Axiom SUSU is designed with your security as the top priority. Here's how we protect your funds and ensure fair treatment for all members.
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 rounded-xl p-6">
                        <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                          <span>🔐</span> Smart Contract Security
                        </h3>
                        <ul className="text-blue-700 text-sm space-y-2">
                          <li>• All funds held by audited smart contract, not individuals</li>
                          <li>• No single person can access or redirect funds</li>
                          <li>• Code executes automatically without human intervention</li>
                          <li>• Built with OpenZeppelin security standards</li>
                        </ul>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-6">
                        <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                          <span>👁️</span> Full Transparency
                        </h3>
                        <ul className="text-purple-700 text-sm space-y-2">
                          <li>• Every contribution visible on Arbitrum blockchain</li>
                          <li>• Every payout verifiable by anyone</li>
                          <li>• Pool rules set at creation and cannot change</li>
                          <li>• View contract on Blockscout anytime</li>
                        </ul>
                      </div>
                      <div className="bg-green-50 rounded-xl p-6">
                        <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                          <span>⚖️</span> Fair Payouts
                        </h3>
                        <ul className="text-green-700 text-sm space-y-2">
                          <li>• Payout order set at pool start (sequential or random)</li>
                          <li>• Cannot be changed after pool begins</li>
                          <li>• Everyone receives exactly once</li>
                          <li>• Automatic execution - no favoritism possible</li>
                        </ul>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-6">
                        <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                          <span>⏰</span> Grace Periods & Protection
                        </h3>
                        <ul className="text-amber-700 text-sm space-y-2">
                          <li>• 24-hour grace period for late contributions</li>
                          <li>• Small late fee incentivizes on-time payment</li>
                          <li>• Emergency pause if critical issues arise</li>
                          <li>• Pro-rata refunds if pool is cancelled</li>
                        </ul>
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-2xl p-6 text-white">
                      <h3 className="text-lg font-bold mb-4">Best Practices for Safe Participation</h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="flex gap-2"><span className="text-green-400">✓</span><p className="text-gray-300 text-sm">Start with pools involving people you know and trust</p></div>
                        <div className="flex gap-2"><span className="text-green-400">✓</span><p className="text-gray-300 text-sm">Only contribute amounts you can comfortably afford</p></div>
                        <div className="flex gap-2"><span className="text-green-400">✓</span><p className="text-gray-300 text-sm">Understand the full pool duration before joining</p></div>
                        <div className="flex gap-2"><span className="text-green-400">✓</span><p className="text-gray-300 text-sm">Set reminders for contribution deadlines</p></div>
                        <div className="flex gap-2"><span className="text-green-400">✓</span><p className="text-gray-300 text-sm">Verify the smart contract address before transacting</p></div>
                        <div className="flex gap-2"><span className="text-green-400">✓</span><p className="text-gray-300 text-sm">Keep your wallet secure and never share your seed phrase</p></div>
                      </div>
                    </div>
                  </div>
                )}

                {trustSection === 'custody' && (
                  <div className="space-y-6">
                    {trustLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading custody information...</div>
                    ) : trustData?.custodyModel ? (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">🔒</span>
                            <span className="text-xl font-bold text-green-700 uppercase">{trustData.custodyModel.type}</span>
                          </div>
                          <p className="text-green-800">{trustData.custodyModel.description}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6">
                          <h3 className="font-semibold text-gray-900 mb-4">Smart Contract Details</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Contract Address:</span>
                              <a href={`https://arbiscan.io/address/${trustData.custodyModel.contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline font-mono text-sm">{trustData.custodyModel.contractAddress}</a>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Network:</span>
                              <span className="text-gray-900">{trustData.custodyModel.network}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-6">
                        <p className="text-gray-600">All funds are held in audited smart contracts on Arbitrum One. No individual can access or redirect funds outside of normal pool operations.</p>
                      </div>
                    )}
                  </div>
                )}

                {trustSection === 'risks' && (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">Please read and understand these risks before participating in any SUSU pool.</p>
                    {trustData?.riskDisclosures?.map((risk, index) => (
                      <div key={index} className="bg-amber-50 rounded-xl p-5 border-l-4 border-amber-400">
                        <h4 className="font-semibold text-amber-800 mb-2">{risk.category}</h4>
                        <p className="text-amber-700 text-sm">{risk.description}</p>
                      </div>
                    )) || (
                      <>
                        <div className="bg-amber-50 rounded-xl p-5 border-l-4 border-amber-400">
                          <h4 className="font-semibold text-amber-800 mb-2">Smart Contract Risk</h4>
                          <p className="text-amber-700 text-sm">While contracts are audited, bugs may still exist. Only participate with funds you can afford to lock.</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-5 border-l-4 border-amber-400">
                          <h4 className="font-semibold text-amber-800 mb-2">Counterparty Risk</h4>
                          <p className="text-amber-700 text-sm">Pool members may default on contributions. Late fees and ejection mechanisms exist to mitigate this.</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-5 border-l-4 border-amber-400">
                          <h4 className="font-semibold text-amber-800 mb-2">Token Volatility</h4>
                          <p className="text-amber-700 text-sm">AXM token value may fluctuate. Your contribution's USD value at payout may differ from deposit time.</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {trustSection === 'claims' && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2"><span>✓</span> What We CAN Say</h3>
                      <ul className="space-y-2">
                        {(trustData?.allowedClaims || [
                          "Funds are secured by smart contracts",
                          "All transactions are transparent on-chain",
                          "Payouts are automated and verifiable",
                          "Built with OpenZeppelin security standards"
                        ]).map((claim, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700 text-sm"><span className="text-green-500 mt-0.5">•</span>{claim}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2"><span>✗</span> What We CANNOT Say</h3>
                      <ul className="space-y-2">
                        {(trustData?.prohibitedClaims || [
                          "Guaranteed returns or profits",
                          "Risk-free investment",
                          "FDIC insured or bank-backed",
                          "Regulated financial product"
                        ]).map((claim, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700 text-sm"><span className="text-red-500 mt-0.5">•</span>{claim}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {trustSection === 'faq' && (
                  <div className="space-y-6">
                    {[
                      { q: "What happens if someone doesn't pay?", a: "There's a 24-hour grace period for late payments with a small 2% late fee. If a member repeatedly misses payments, they can be ejected from the pool to protect other members." },
                      { q: "Can someone run away with the money after receiving their payout?", a: "Members are expected to continue contributing after receiving their payout. If they stop, they forfeit their position and any future participation. The smart contract tracks all obligations transparently." },
                      { q: "Who holds the funds?", a: "The smart contract holds all funds. No individual - not even the pool creator - can access funds outside of the normal contribution and payout process. The contract code is public and verifiable." },
                      { q: "What if I need to leave early?", a: "You can exit a pool early, but if you've already received your payout, you forfeit any remaining contributions. If you haven't received yet, your contributions may be partially refunded depending on pool rules." },
                      { q: "Is my money safe?", a: "Your funds are secured by audited smart contracts on Arbitrum, a proven Layer 2 blockchain. The code follows industry-standard security practices from OpenZeppelin. However, as with any blockchain application, you should only participate with funds you can afford to have locked for the pool duration." },
                      { q: "How do I know I'll get paid?", a: "Payouts are automatic and enforced by code. When all members contribute for a cycle, the designated recipient automatically receives the pooled funds. No human can stop or redirect this payment." }
                    ].map((item, i) => (
                      <div key={i}>
                        <h4 className="font-semibold text-gray-900 mb-2">{item.q}</h4>
                        <p className="text-gray-600 text-sm">{item.a}</p>
                      </div>
                    ))}
                  </div>
                )}

                {trustSection === 'stats' && (
                  <div className="space-y-6">
                    {trustLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading statistics...</div>
                    ) : (
                      <>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="bg-gray-50 rounded-xl p-5">
                            <div className="text-2xl font-bold text-amber-600">{trustData?.operationalStats?.active_hubs || 0}</div>
                            <div className="text-gray-500 text-sm">Active Regional Hubs</div>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-5">
                            <div className="text-2xl font-bold text-amber-600">{trustData?.operationalStats?.active_groups || 0}</div>
                            <div className="text-gray-500 text-sm">Active Purpose Groups</div>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-5">
                            <div className="text-2xl font-bold text-amber-600">{trustData?.operationalStats?.total_participants || 0}</div>
                            <div className="text-gray-500 text-sm">Total Participants</div>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-5">
                            <div className="text-2xl font-bold text-amber-600">{trustData?.operationalStats?.graduated_pools || 0}</div>
                            <div className="text-gray-500 text-sm">Graduated to On-Chain</div>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-5">
                            <div className="text-2xl font-bold text-amber-600">{trustData?.operationalStats?.total_charters || 0}</div>
                            <div className="text-gray-500 text-sm">Total Charters Created</div>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-5">
                            <div className="text-2xl font-bold text-amber-600">{trustData?.operationalStats?.total_charter_acceptances || 0}</div>
                            <div className="text-gray-500 text-sm">Charter Acceptances</div>
                          </div>
                        </div>
                        {trustData?.lastUpdated && (
                          <div className="text-sm text-gray-400 text-center">
                            Last updated: {new Date(trustData.lastUpdated).toLocaleString()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center">
                <a
                  href={`https://arbitrum.blockscout.com/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
                >
                  View Smart Contract on Blockscout
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}
        </div>

        {selectedPool && poolDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Pool #{selectedPool.poolId}</h3>
                  <p className="text-sm text-gray-500">Created {formatDate(selectedPool.createdAt)}</p>
                </div>
                <button
                  onClick={() => { setSelectedPool(null); setPoolDetails(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500">Status</div>
                    <div className={`font-semibold ${STATUS_LABELS[selectedPool.status]?.color.replace('bg-', 'text-').replace('-100', '-700')}`}>
                      {STATUS_LABELS[selectedPool.status]?.label}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500">Token</div>
                    <div className="font-semibold">{selectedPool.tokenSymbol}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500">Contribution</div>
                    <div className="font-semibold">{parseFloat(selectedPool.contributionAmount).toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500">Cycle Duration</div>
                    <div className="font-semibold">{formatDuration(selectedPool.cycleDuration)}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Progress</h4>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${(selectedPool.currentCycle / selectedPool.totalCycles) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {selectedPool.currentCycle} / {selectedPool.totalCycles} cycles
                    </span>
                  </div>
                </div>

                {poolDetails.cycleInfo && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Current Cycle Info</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs text-blue-600">Contributions</div>
                        <div className="font-semibold text-blue-800">{poolDetails.cycleInfo.contributionCount} / {selectedPool.memberCount}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-xs text-green-600">Cycle End</div>
                        <div className="font-semibold text-green-800">{formatDate(poolDetails.cycleInfo.cycleEnd)}</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3">
                        <div className="text-xs text-amber-600">Expected Payout</div>
                        <div className="font-semibold text-amber-800">{parseFloat(poolDetails.expectedPayout?.net || 0).toLocaleString()} {selectedPool.tokenSymbol}</div>
                      </div>
                    </div>
                  </div>
                )}

                {poolDetails.currentRecipient && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="text-sm text-green-600 mb-1">Next Payout Recipient</div>
                    <div className="font-mono text-green-800">{formatAddress(poolDetails.currentRecipient)}</div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Members ({poolDetails.members?.length || 0})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {poolDetails.payoutOrder?.map((address, index) => (
                      <div key={address} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-xs font-medium text-amber-700">
                            {index + 1}
                          </span>
                          <span className="font-mono text-sm">{formatAddress(address)}</span>
                        </div>
                        {index < selectedPool.currentCycle && (
                          <span className="text-xs text-green-600 font-medium">Received</span>
                        )}
                        {index === selectedPool.currentCycle && selectedPool.status === 1 && (
                          <span className="text-xs text-amber-600 font-medium">Current</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <a
                    href={`https://arbitrum.blockscout.com/address/${contractAddress}?tab=read_contract`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-200 transition-colors"
                  >
                    View on Blockscout
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCreateGroup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Start a Purpose Group</h3>
                  <p className="text-sm text-gray-500">Create a savings group for your community</p>
                </div>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <p className="text-blue-800 text-sm">
                    <strong>What is a Purpose Group?</strong> It's a pre-commitment group where people gather before creating an on-chain savings pool. Build trust first, then graduate to an official SUSU Circle.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region Hub *</label>
                  <p className="text-xs text-gray-500 mb-2">Choose the region where your group will be based. Local groups build stronger connections.</p>
                  <select
                    value={newGroupForm.hubId}
                    onChange={(e) => setNewGroupForm({...newGroupForm, hubId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Select a region...</option>
                    {discoverHubs.map(hub => (
                      <option key={hub.id} value={hub.id}>{hub.regionDisplay}</option>
                    ))}
                  </select>
                  {discoverHubs.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No regions available yet. Contact support to add your region.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Savings Purpose *</label>
                  <p className="text-xs text-gray-500 mb-2">What are you all saving for? This helps members with the same goal find each other.</p>
                  <select
                    value={newGroupForm.purposeCategoryId}
                    onChange={(e) => setNewGroupForm({...newGroupForm, purposeCategoryId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Select a purpose...</option>
                    {discoverCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contribution (AXM)</label>
                    <p className="text-xs text-gray-500 mb-2">Amount each person contributes per cycle</p>
                    <input
                      type="number"
                      min="1"
                      value={newGroupForm.contributionAmount}
                      onChange={(e) => setNewGroupForm({...newGroupForm, contributionAmount: parseFloat(e.target.value) || 1})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Length</label>
                    <p className="text-xs text-gray-500 mb-2">How often members contribute</p>
                    <select
                      value={newGroupForm.cycleLengthDays}
                      onChange={(e) => setNewGroupForm({...newGroupForm, cycleLengthDays: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value={7}>Weekly (7 days)</option>
                      <option value={14}>Bi-Weekly (14 days)</option>
                      <option value={30}>Monthly (30 days)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Members</label>
                    <p className="text-xs text-gray-500 mb-2">Needed to activate the pool</p>
                    <input
                      type="number"
                      min="2"
                      max="50"
                      value={newGroupForm.minMembersToActivate}
                      onChange={(e) => setNewGroupForm({...newGroupForm, minMembersToActivate: parseInt(e.target.value) || 3})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
                    <p className="text-xs text-gray-500 mb-2">Group capacity limit</p>
                    <input
                      type="number"
                      min="2"
                      max="50"
                      value={newGroupForm.maxMembers}
                      onChange={(e) => setNewGroupForm({...newGroupForm, maxMembers: parseInt(e.target.value) || 10})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <p className="text-xs text-gray-500 mb-2">Add details to attract the right members - goals, rules, or expectations</p>
                  <textarea
                    value={newGroupForm.description}
                    onChange={(e) => setNewGroupForm({...newGroupForm, description: e.target.value})}
                    placeholder="Example: Looking for 5 friends to save for a group vacation next summer. Monthly contributions, trusted friends only!"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div className="bg-amber-50 rounded-xl p-4">
                  <h4 className="font-semibold text-amber-800 mb-2">Group Summary</h4>
                  <div className="space-y-1 text-sm text-amber-700">
                    <p>Contribution: {newGroupForm.contributionAmount} AXM every {newGroupForm.cycleLengthDays} days</p>
                    <p>Members: {newGroupForm.minMembersToActivate} min, {newGroupForm.maxMembers} max</p>
                    <p>Pool per cycle: {newGroupForm.contributionAmount * newGroupForm.maxMembers} AXM (at max capacity)</p>
                  </div>
                </div>

                <button
                  onClick={handleCreateGroup}
                  disabled={creatingGroup || !newGroupForm.hubId || !newGroupForm.purposeCategoryId}
                  className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingGroup ? 'Creating...' : 'Create Purpose Group'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
