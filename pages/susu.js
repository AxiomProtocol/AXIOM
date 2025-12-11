import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

const STATUS_LABELS = {
  0: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  1: { label: 'Active', color: 'bg-green-100 text-green-700 border-green-200' },
  2: { label: 'Completed', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  3: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' }
};

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
  const { walletState, connectMetaMask } = useWallet();
  const [pools, setPools] = useState([]);
  const [userPools, setUserPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPool, setSelectedPool] = useState(null);
  const [poolDetails, setPoolDetails] = useState(null);
  const [stats, setStats] = useState({ totalPools: 0, defaultParams: null });
  const [contractAddress, setContractAddress] = useState('');

  useEffect(() => {
    fetchPools();
  }, []);

  useEffect(() => {
    if (walletState?.address) {
      fetchUserPools();
    }
  }, [walletState?.address]);

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
        setContractAddress(data.contractAddress || '');
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

  const filteredPools = pools.filter(p => 
    filterStatus === 'all' || p.status === parseInt(filterStatus)
  );

  const tabs = [
    { id: 'browse', label: 'Browse Pools', icon: '🔍' },
    { id: 'my-pools', label: 'My Pools', icon: '👤' },
    { id: 'how-it-works', label: 'How It Works', icon: '📖' },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                🤝
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-1">Axiom SUSU</h1>
                <p className="text-gray-300">On-Chain Rotating Savings Groups (ROSCA)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
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
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
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
                  <a 
                    href={`https://arbitrum.blockscout.com/address/${contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-700 text-sm"
                  >
                    View Contract on Blockscout
                  </a>
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
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                  >
                    Browse Pools
                  </button>
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
                    <p className="text-gray-600">Each cycle (e.g., weekly or monthly), all members contribute the same fixed amount to the pool. Contributions are tracked on-chain.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">One Member Receives the Pot</h3>
                    <p className="text-gray-600">At the end of each cycle, one member receives the entire pooled amount (minus a small protocol fee). The order is either sequential or randomized at pool creation.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Everyone Gets Their Turn</h3>
                    <p className="text-gray-600">The pool continues until every member has received the pot once. Early recipients effectively receive an interest-free loan, while later recipients earn returns on their contributions.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-amber-50 rounded-xl">
                <h3 className="font-semibold text-amber-800 mb-3">Example Scenario</h3>
                <p className="text-amber-700 text-sm">
                  10 friends create a monthly SUSU pool with 100 AXM contributions each. Each month, the pool collects 1,000 AXM, and one member receives ~990 AXM (after 1% protocol fee). After 10 months, everyone has contributed 1,000 AXM and received ~990 AXM once.
                </p>
              </div>

              <div className="mt-6 p-6 bg-blue-50 rounded-xl">
                <h3 className="font-semibold text-blue-800 mb-3">Benefits</h3>
                <ul className="text-blue-700 text-sm space-y-2">
                  <li>• Access large sums without traditional loans or credit checks</li>
                  <li>• Build savings discipline through regular contributions</li>
                  <li>• Community-based mutual aid with on-chain transparency</li>
                  <li>• Smart contract enforcement ensures fair payouts</li>
                </ul>
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
      </div>
    </Layout>
  );
}
