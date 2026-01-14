import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { RebuildNav } from '../../components/axiomRebuild/RebuildNav';
import { RebuildFooter } from '../../components/axiomRebuild/RebuildFooter';

interface Proposal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'passed' | 'rejected' | 'executed' | 'pending';
  proposer: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorum: number;
  quorumReached: boolean;
  startDate: string;
  endDate: string;
  executionDate?: string;
  discussionUrl?: string;
}

interface VotingPower {
  walletAddress: string;
  axmBalance: number;
  stakedBalance: number;
  votingPower: number;
  delegatedTo?: string;
  delegatedFrom: number;
}

export default function Governance() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'passed' | 'rejected'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  async function fetchGovernanceData() {
    try {
      const response = await fetch('/api/governance/proposals');
      if (response.ok) {
        const data = await response.json();
        setProposals(data.proposals || []);
        setVotingPower(data.votingPower);
      }
    } catch (error) {
      console.error('Failed to fetch governance data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProposals = proposals.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'treasury': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'protocol': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'lending': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'community': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'emergency': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500/20 text-blue-400';
      case 'passed': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'executed': return 'bg-purple-500/20 text-purple-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatAddress = (address: string) => 
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const formatNumber = (num: number) => 
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);

  return (
    <>
      <Head>
        <title>Governance | Axiom Protocol</title>
        <meta name="description" content="Participate in Axiom Protocol governance - vote on proposals, delegate voting power, and shape the future of the protocol" />
      </Head>

      <RebuildNav />

      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Governance</h1>
              <p className="text-gray-400">Shape the future of Axiom Protocol through decentralized governance</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 md:mt-0 px-6 py-3 bg-[#00D4AA] text-black font-medium rounded-lg hover:bg-[#00B894] transition-colors flex items-center gap-2"
            >
              <span>+</span> Create Proposal
            </button>
          </div>

          {votingPower && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                <p className="text-gray-400 text-sm mb-1">Your Voting Power</p>
                <p className="text-3xl font-bold text-white">{formatNumber(votingPower.votingPower)}</p>
                <p className="text-gray-500 text-xs mt-1">AXM equivalent</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                <p className="text-gray-400 text-sm mb-1">AXM Balance</p>
                <p className="text-3xl font-bold text-white">{formatNumber(votingPower.axmBalance)}</p>
                <p className="text-gray-500 text-xs mt-1">Wallet balance</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                <p className="text-gray-400 text-sm mb-1">Staked AXM</p>
                <p className="text-3xl font-bold text-[#00D4AA]">{formatNumber(votingPower.stakedBalance)}</p>
                <p className="text-gray-500 text-xs mt-1">2x voting multiplier</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                <p className="text-gray-400 text-sm mb-1">Delegated to You</p>
                <p className="text-3xl font-bold text-purple-400">{formatNumber(votingPower.delegatedFrom)}</p>
                <p className="text-gray-500 text-xs mt-1">From other holders</p>
              </div>
            </div>
          )}

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 mb-8">
            <div className="p-6 border-b border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-xl font-bold text-white">Proposals</h2>
                <div className="flex gap-2">
                  {['all', 'active', 'passed', 'rejected'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === f 
                          ? 'bg-[#00D4AA] text-black' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-700">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00D4AA]" />
                </div>
              ) : filteredProposals.length > 0 ? (
                filteredProposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-4">🗳️</p>
                  <p>No proposals found</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-[#00D4AA] hover:underline mt-2"
                  >
                    Create the first proposal →
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📊</span> Governance Stats
              </h3>
              <div className="space-y-4">
                <StatRow label="Total Proposals" value={proposals.length.toString()} />
                <StatRow label="Active Proposals" value={proposals.filter(p => p.status === 'active').length.toString()} />
                <StatRow label="Passed This Month" value={proposals.filter(p => p.status === 'passed').length.toString()} />
                <StatRow label="Participation Rate" value="67%" />
                <StatRow label="Avg. Quorum Reached" value="82%" />
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📜</span> Governance Rules
              </h3>
              <div className="space-y-3 text-sm">
                <RuleItem title="Proposal Threshold" description="100,000 AXM to create proposal" />
                <RuleItem title="Voting Period" description="7 days for standard proposals" />
                <RuleItem title="Quorum" description="10% of circulating supply" />
                <RuleItem title="Execution Delay" description="48 hours after passing" />
                <RuleItem title="Emergency Proposals" description="24-hour voting, 25% quorum" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateProposalModal onClose={() => setShowCreateModal(false)} onSubmit={fetchGovernanceData} />
      )}

      <RebuildFooter />
    </>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercent = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'treasury': return 'bg-purple-500/20 text-purple-400';
      case 'protocol': return 'bg-blue-500/20 text-blue-400';
      case 'lending': return 'bg-green-500/20 text-green-400';
      case 'community': return 'bg-yellow-500/20 text-yellow-400';
      case 'emergency': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500/20 text-blue-400';
      case 'passed': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'executed': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="p-6 hover:bg-gray-700/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(proposal.category)}`}>
              {proposal.category}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(proposal.status)}`}>
              {proposal.status}
            </span>
            {proposal.quorumReached && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                Quorum Reached
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{proposal.title}</h3>
          <p className="text-gray-400 text-sm line-clamp-2">{proposal.description}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-green-400">For: {forPercent.toFixed(1)}%</span>
          <span className="text-red-400">Against: {againstPercent.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
          <div className="bg-green-500 h-full" style={{ width: `${forPercent}%` }} />
          <div className="bg-red-500 h-full" style={{ width: `${againstPercent}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Proposed by {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}</span>
        <span>Ends {new Date(proposal.endDate).toLocaleDateString()}</span>
      </div>

      {proposal.status === 'active' && (
        <div className="flex gap-3 mt-4">
          <button className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors font-medium">
            Vote For
          </button>
          <button className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-medium">
            Vote Against
          </button>
          <button className="flex-1 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors font-medium">
            Abstain
          </button>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function RuleItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[#00D4AA]">•</span>
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function CreateProposalModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'protocol',
    description: '',
    discussionUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/governance/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSubmit();
        onClose();
      }
    } catch (error) {
      console.error('Failed to create proposal:', error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Create Proposal</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4AA]"
              placeholder="Brief, descriptive title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4AA]"
            >
              <option value="protocol">Protocol</option>
              <option value="treasury">Treasury</option>
              <option value="lending">Lending</option>
              <option value="community">Community</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4AA] min-h-[150px]"
              placeholder="Detailed description of the proposal, rationale, and expected outcomes..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Discussion URL (Optional)</label>
            <input
              type="url"
              value={formData.discussionUrl}
              onChange={(e) => setFormData({ ...formData, discussionUrl: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#00D4AA]"
              placeholder="https://forum.axiomprotocol.io/..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-[#00D4AA] text-black font-medium rounded-lg hover:bg-[#00B894] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
