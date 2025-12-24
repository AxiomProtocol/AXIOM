import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { DelegationPanel } from '../components/Governance/DelegationPanel';
import { useWallet } from '../components/WalletConnect/WalletContext';
import StepProgressBanner from '../components/StepProgressBanner';

const GOVERNANCE_MODE = {
  isOnchain: false,
  contractAddress: null,
  statusMessage: 'Governance votes are recorded via API. On-chain voting will be enabled when GovernanceHub contract is deployed.',
};

const COUNCIL_MEMBERS = [
  { name: 'Genesis Council', role: 'Founding Members', members: 7, votingPower: '15%', focus: 'Protocol Development' },
  { name: 'Member Assembly', role: 'Token Holders', members: 'All', votingPower: '60%', focus: 'General Proposals' },
  { name: 'Technical Committee', role: 'Engineers', members: 5, votingPower: '10%', focus: 'Smart Contracts' },
  { name: 'Treasury Stewards', role: 'Financial Oversight', members: 5, votingPower: '10%', focus: 'Fund Allocation' },
  { name: 'Sustainability Board', role: 'Environment', members: 3, votingPower: '5%', focus: 'Green Initiatives' },
];

const DEFAULT_STATS = {
  totalProposals: 0,
  passedProposals: 0,
  activeProposals: 0,
  totalVoters: 0,
  totalVotingPower: '0 AXM',
  averageParticipation: '0%',
  treasuryBalance: '0 AXM',
};

export default function GovernancePage() {
  const { walletState, connectMetaMask } = useWallet();
  const [activeTab, setActiveTab] = useState('proposals');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [proposals, setProposals] = useState([]);
  const [governanceStats, setGovernanceStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [votingState, setVotingState] = useState({ proposalId: null, pending: false, error: '', success: '' });
  const [userVotingPower, setUserVotingPower] = useState('0');

  const handleCastVote = async (proposalId, support) => {
    if (!walletState?.address) {
      setVotingState({ proposalId, pending: false, error: 'Please connect your wallet first', success: '' });
      return;
    }

    setVotingState({ proposalId, pending: true, error: '', success: '' });

    try {
      const response = await fetch('/api/governance/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          support,
          voterAddress: walletState.address
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to record vote');
      }
      
      setVotingState({ proposalId, pending: false, error: '', success: 'Vote recorded successfully!' });
      
      await fetchGovernanceData();
      
      setTimeout(() => setVotingState({ proposalId: null, pending: false, error: '', success: '' }), 3000);
    } catch (err) {
      console.error('Voting error:', err);
      setVotingState({ 
        proposalId, 
        pending: false, 
        error: err.message || 'Failed to cast vote', 
        success: '' 
      });
    }
  };

  const fetchUserVotingPower = async () => {
    if (!walletState?.address) return;
    
    try {
      const response = await fetch(`/api/governance/voting-power?wallet=${walletState.address}`);
      if (response.ok) {
        const data = await response.json();
        setUserVotingPower(data.votingPower || walletState.axmBalance || '0');
      } else {
        setUserVotingPower(walletState.axmBalance || '0');
      }
    } catch (err) {
      console.error('Error fetching voting power:', err);
      setUserVotingPower(walletState.axmBalance || '0');
    }
  };

  useEffect(() => {
    if (walletState?.address) {
      fetchUserVotingPower();
    }
  }, [walletState?.address]);

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  const fetchGovernanceData = async () => {
    try {
      const [proposalsRes, statsRes] = await Promise.all([
        fetch('/api/governance/proposals'),
        fetch('/api/governance/stats')
      ]);

      if (proposalsRes.ok) {
        const data = await proposalsRes.json();
        setProposals(data.proposals || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setGovernanceStats(data.stats || DEFAULT_STATS);
      }
    } catch (error) {
      console.error('Error fetching governance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = proposals.filter(p => 
    filterStatus === 'all' || p.status === filterStatus
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'passed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Treasury': return 'bg-amber-100 text-amber-700';
      case 'Protocol': return 'bg-purple-100 text-purple-700';
      case 'Governance': return 'bg-blue-100 text-blue-700';
      case 'Economics': return 'bg-green-100 text-green-700';
      case 'Partnerships': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const calculateVotePercentage = (proposal) => {
    const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    if (total === 0) return { for: 0, against: 0, abstain: 0 };
    return {
      for: (proposal.forVotes / total * 100).toFixed(1),
      against: (proposal.againstVotes / total * 100).toFixed(1),
      abstain: (proposal.abstainVotes / total * 100).toFixed(1)
    };
  };

  const tabs = [
    { id: 'proposals', label: 'Proposals', icon: '📜' },
    { id: 'delegation', label: 'Delegation', icon: '🗳️' },
    { id: 'council', label: 'Council', icon: '👥' },
    { id: 'process', label: 'How It Works', icon: '📖' },
  ];

  return (
    <Layout>
      <StepProgressBanner isAdvanced={true} />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                🏛️
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-1">Axiom Governance</h1>
                <p className="text-gray-300">Community-owned and member-governed decision-making</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-400">{governanceStats.totalProposals}</div>
                <div className="text-sm text-gray-400">Total Proposals</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-green-400">{governanceStats.passedProposals}</div>
                <div className="text-sm text-gray-400">Passed</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-400">{governanceStats.activeProposals}</div>
                <div className="text-sm text-gray-400">Active Now</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-purple-400">{governanceStats.totalVoters.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Total Voters</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-pink-400">{governanceStats.totalVotingPower}</div>
                <div className="text-sm text-gray-400">Voting Power</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-cyan-400">{governanceStats.averageParticipation}</div>
                <div className="text-sm text-gray-400">Avg Participation</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-400">{governanceStats.treasuryBalance}</div>
                <div className="text-sm text-gray-400">Treasury</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'proposals' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Governance Proposals</h2>
                  <p className="text-gray-500">Vote on proposals to shape the future of Axiom Smart City</p>
                </div>
                <div className="flex gap-2">
                  {['all', 'active', 'pending', 'passed'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                        filterStatus === status
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent mb-4"></div>
                    <p className="text-gray-500">Loading proposals...</p>
                  </div>
                ) : filteredProposals.length === 0 ? (
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-12 text-center">
                    <div className="text-5xl mb-4">📜</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Proposals Yet</h3>
                    <p className="text-gray-500 mb-4">
                      {filterStatus === 'all' 
                        ? 'Be the first to submit a governance proposal!'
                        : `No ${filterStatus} proposals found.`}
                    </p>
                  </div>
                ) : filteredProposals.map(proposal => {
                  const votes = calculateVotePercentage(proposal);
                  const quorumReached = (proposal.forVotes + proposal.againstVotes + proposal.abstainVotes) >= proposal.quorum;
                  
                  return (
                    <div 
                      key={proposal.id}
                      className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedProposal(selectedProposal?.id === proposal.id ? null : proposal)}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-mono text-sm text-gray-400">{proposal.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)}`}>
                              {proposal.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(proposal.category)}`}>
                              {proposal.category}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">{proposal.title}</h3>
                          <p className="text-gray-600 text-sm mb-3">{proposal.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span>Proposer: <span className="font-mono">{proposal.proposer}</span></span>
                            <span>Voters: {proposal.totalVoters}</span>
                            <span>Ends: {proposal.endDate}</span>
                          </div>
                        </div>

                        {proposal.status !== 'pending' && (
                          <div className="md:w-48">
                            <div className="space-y-2">
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-green-600 font-medium">For</span>
                                  <span>{votes.for}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${votes.for}%` }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-red-600 font-medium">Against</span>
                                  <span>{votes.against}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${votes.against}%` }} />
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 text-xs">
                              <span className={quorumReached ? 'text-green-600' : 'text-amber-600'}>
                                {quorumReached ? '✓ Quorum reached' : `${((proposal.forVotes + proposal.againstVotes + proposal.abstainVotes) / proposal.quorum * 100).toFixed(0)}% of quorum`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedProposal?.id === proposal.id && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <div className="grid md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-green-50 rounded-xl p-4 text-center">
                              <div className="text-2xl font-bold text-green-600">{formatNumber(proposal.forVotes)}</div>
                              <div className="text-sm text-green-700">For</div>
                            </div>
                            <div className="bg-red-50 rounded-xl p-4 text-center">
                              <div className="text-2xl font-bold text-red-600">{formatNumber(proposal.againstVotes)}</div>
                              <div className="text-sm text-red-700">Against</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 text-center">
                              <div className="text-2xl font-bold text-gray-600">{formatNumber(proposal.abstainVotes)}</div>
                              <div className="text-sm text-gray-700">Abstain</div>
                            </div>
                          </div>

                          {proposal.status === 'active' && walletState.isConnected && (
                            <div className="space-y-3">
                              <div className="flex gap-3">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCastVote(proposal.id, 1); }}
                                  disabled={votingState.pending}
                                  className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold rounded-xl transition-colors"
                                >
                                  {votingState.proposalId === proposal.id && votingState.pending ? 'Voting...' : 'Vote For'}
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCastVote(proposal.id, 0); }}
                                  disabled={votingState.pending}
                                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold rounded-xl transition-colors"
                                >
                                  {votingState.proposalId === proposal.id && votingState.pending ? 'Voting...' : 'Vote Against'}
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCastVote(proposal.id, 2); }}
                                  disabled={votingState.pending}
                                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                  Abstain
                                </button>
                              </div>
                              {votingState.proposalId === proposal.id && votingState.error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                  {votingState.error}
                                </div>
                              )}
                              {votingState.proposalId === proposal.id && votingState.success && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                                  {votingState.success}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 text-center">
                                Your voting power: {parseFloat(userVotingPower).toLocaleString()} AXM
                              </div>
                            </div>
                          )}

                          {proposal.status === 'active' && !walletState.isConnected && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); connectMetaMask(); }}
                              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
                            >
                              Connect Wallet to Vote
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Want to Submit a Proposal?</h3>
                <p className="text-gray-600 mb-4">
                  Any citizen holding at least 100,000 AXM can submit governance proposals. Proposals go through a 7-day voting period and require a 10M AXM quorum to pass.
                </p>
                <button className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors">
                  Create Proposal
                </button>
              </div>
            </div>
          )}

          {activeTab === 'delegation' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Vote Delegation</h2>
                <p className="text-gray-500">Delegate your voting power to participate in governance</p>
              </div>

              {!walletState.isConnected ? (
                <div className="bg-gray-50 rounded-2xl p-12 text-center mb-8">
                  <div className="text-6xl mb-4">🗳️</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-600 mb-6">Connect your wallet to access delegation features</p>
                  <button
                    onClick={connectMetaMask}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="mb-8">
                  <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Your Account</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="text-sm text-gray-500 mb-1">Wallet Address</div>
                        <div className="font-mono text-amber-600 text-sm truncate">{walletState.address}</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="text-sm text-gray-500 mb-1">ETH Balance</div>
                        <div className="text-xl font-bold text-gray-900">{parseFloat(walletState.balance || 0).toFixed(4)} ETH</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="text-sm text-gray-500 mb-1">AXM Balance</div>
                        <div className="text-xl font-bold text-amber-600">{parseFloat(walletState.axmBalance || 0).toLocaleString()} AXM</div>
                      </div>
                    </div>
                  </div>

                  <DelegationPanel />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="font-bold text-blue-900 mb-3">Why Delegate?</h3>
                  <ul className="text-blue-800 space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">✓</span>
                      <span>Participate in governance without voting on every proposal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">✓</span>
                      <span>Delegate to experts who align with your values</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">✓</span>
                      <span>Keep your tokens - delegation doesn't transfer ownership</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">✓</span>
                      <span>Change or revoke delegation at any time</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <h3 className="font-bold text-amber-900 mb-3">Top Delegates</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Genesis Foundation', power: '125M', proposals: 12 },
                      { name: 'DePIN Alliance', power: '89M', proposals: 8 },
                      { name: 'Community DAO', power: '67M', proposals: 15 },
                    ].map((delegate, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                        <div>
                          <div className="font-medium text-gray-900">{delegate.name}</div>
                          <div className="text-xs text-gray-500">{delegate.proposals} proposals voted</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-amber-600">{delegate.power} AXM</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'council' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Governance Council</h2>
                <p className="text-gray-500">The multi-body governance structure that guides Axiom Smart City</p>
              </div>

              <div className="grid gap-4 mb-8">
                {COUNCIL_MEMBERS.map((council, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-2xl text-white font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{council.name}</h3>
                          <p className="text-gray-500 text-sm">{council.role}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 md:gap-8">
                        <div className="text-center">
                          <div className="text-xl font-bold text-gray-900">{council.members}</div>
                          <div className="text-xs text-gray-500">Members</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-amber-600">{council.votingPower}</div>
                          <div className="text-xs text-gray-500">Voting Power</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">{council.focus}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
                <h3 className="text-xl font-bold mb-4">Become a Council Member</h3>
                <p className="text-gray-300 mb-6">
                  Council positions are elected annually through community voting. Citizens can nominate themselves or others for council positions. Requirements vary by council type.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-amber-400 font-bold mb-1">Technical Committee</div>
                    <div className="text-sm text-gray-400">Requires proven smart contract expertise</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-amber-400 font-bold mb-1">Treasury Stewards</div>
                    <div className="text-sm text-gray-400">Requires 1M AXM stake</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-amber-400 font-bold mb-1">Sustainability Board</div>
                    <div className="text-sm text-gray-400">Open to environmental experts</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'process' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">How Governance Works</h2>
                <p className="text-gray-500">A step-by-step guide to Axiom's decentralized decision-making process</p>
              </div>

              <div className="grid gap-6 mb-8">
                {[
                  {
                    step: 1,
                    title: 'Proposal Creation',
                    description: 'Any citizen with 100,000+ AXM can submit a proposal. Proposals must include a clear title, description, and implementation plan.',
                    icon: '📝',
                    duration: 'Instant'
                  },
                  {
                    step: 2,
                    title: 'Discussion Period',
                    description: 'The community discusses the proposal in forums and social channels. Proposers can make amendments based on feedback.',
                    icon: '💬',
                    duration: '3 Days'
                  },
                  {
                    step: 3,
                    title: 'Voting Period',
                    description: 'Token holders vote For, Against, or Abstain. Votes are weighted by AXM balance and delegated power.',
                    icon: '🗳️',
                    duration: '7 Days'
                  },
                  {
                    step: 4,
                    title: 'Quorum Check',
                    description: 'Proposal must reach 10M AXM in total votes to be valid. Simple majority (>50%) wins.',
                    icon: '✅',
                    duration: 'Automatic'
                  },
                  {
                    step: 5,
                    title: 'Timelock',
                    description: 'Passed proposals enter a 48-hour timelock before execution, allowing final review.',
                    icon: '⏰',
                    duration: '48 Hours'
                  },
                  {
                    step: 6,
                    title: 'Execution',
                    description: 'Approved proposals are executed on-chain. Smart contract changes are implemented automatically.',
                    icon: '🚀',
                    duration: 'Automatic'
                  }
                ].map((phase, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                        {phase.step}
                      </div>
                      {i < 5 && <div className="w-0.5 flex-1 bg-amber-200 my-2" />}
                    </div>
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 mb-2">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{phase.icon}</span>
                        <h3 className="text-lg font-bold text-gray-900">{phase.title}</h3>
                        <span className="ml-auto text-sm text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-full">
                          {phase.duration}
                        </span>
                      </div>
                      <p className="text-gray-600">{phase.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Voting Power</h3>
                  <p className="text-gray-600 mb-4">
                    Your voting power equals your AXM token balance plus any tokens delegated to you. To activate voting power:
                  </p>
                  <ol className="text-gray-600 space-y-2">
                    <li className="flex gap-2"><span className="text-amber-500 font-bold">1.</span> Hold AXM tokens in your wallet</li>
                    <li className="flex gap-2"><span className="text-amber-500 font-bold">2.</span> Delegate to yourself or another address</li>
                    <li className="flex gap-2"><span className="text-amber-500 font-bold">3.</span> Vote on active proposals</li>
                  </ol>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Proposal Types</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-amber-500 rounded-full" />
                      <span className="text-gray-700"><strong>Treasury:</strong> Fund allocation decisions</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-purple-500 rounded-full" />
                      <span className="text-gray-700"><strong>Protocol:</strong> Smart contract changes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span className="text-gray-700"><strong>Governance:</strong> Voting rules changes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="text-gray-700"><strong>Economics:</strong> Token economics updates</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-pink-500 rounded-full" />
                      <span className="text-gray-700"><strong>Partnerships:</strong> External collaborations</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Can I change my vote after submitting?</h4>
                    <p className="text-blue-800 text-sm">No, votes are final once submitted on-chain. Review carefully before voting.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">What happens if quorum isn't reached?</h4>
                    <p className="text-blue-800 text-sm">The proposal fails and can be resubmitted after modifications.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Are there any gas fees for voting?</h4>
                    <p className="text-blue-800 text-sm">Yes, voting requires a small gas fee on Arbitrum One (typically less than $0.10).</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Can proposals be vetoed?</h4>
                    <p className="text-blue-800 text-sm">The Genesis Council has emergency veto power for security-critical issues only.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 border-t border-gray-200 py-8">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="text-gray-500 text-sm">
              Governance powered by AXM Token on Arbitrum One (Chain ID: 42161)
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Contract: 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
