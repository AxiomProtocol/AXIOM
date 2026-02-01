import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { useWallet } from '../../components/WalletConnect/WalletContext';

interface Grant {
  id: number;
  proposerAddress: string;
  title: string;
  description: string;
  category: string;
  requestedAmount: string;
  status: string;
  votesFor: string;
  votesAgainst: string;
  votesAbstain: string;
  quorumReached: boolean;
  votingStartDate: string;
  votingEndDate: string;
  createdAt: string;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  development: 'bg-blue-100 text-blue-700',
  marketing: 'bg-amber-100 text-amber-700',
  community: 'bg-green-100 text-green-700',
  infrastructure: 'bg-purple-100 text-purple-700',
  research: 'bg-cyan-100 text-cyan-700',
  education: 'bg-pink-100 text-pink-700',
  partnerships: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700'
};

const CATEGORY_ICONS: { [key: string]: string } = {
  development: '💻',
  marketing: '📣',
  community: '👥',
  infrastructure: '🏗️',
  research: '🔬',
  education: '📚',
  partnerships: '🤝',
  other: '📋'
};

const STATUS_COLORS: { [key: string]: string } = {
  draft: 'bg-gray-100 text-gray-600',
  voting: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  funded: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500'
};

export default function GrantsDAO() {
  const { walletState, connectMetaMask } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  const [activeTab, setActiveTab] = useState<'all' | 'voting' | 'my-proposals' | 'create'>('all');
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [proposalForm, setProposalForm] = useState({
    title: '',
    category: 'development',
    requestedAmount: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchGrants();
  }, []);

  const fetchGrants = async () => {
    try {
      const res = await fetch('/api/governance/grants');
      if (res.ok) {
        const data = await res.json();
        setGrants(data.grants || []);
      }
    } catch (error) {
      console.error('Error fetching grants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (!proposalForm.title || !proposalForm.description || !proposalForm.requestedAmount) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const res = await fetch('/api/governance/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposerAddress: address,
          title: proposalForm.title,
          category: proposalForm.category,
          requestedAmount: proposalForm.requestedAmount,
          description: proposalForm.description
        })
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setProposalForm({ title: '', category: 'development', requestedAmount: '', description: '' });
        fetchGrants();
        setTimeout(() => {
          setActiveTab('all');
          setSubmitSuccess(false);
        }, 2000);
      } else {
        const error = await res.json();
        setSubmitError(error.error || 'Failed to submit proposal');
      }
    } catch (error) {
      console.error('Error submitting proposal:', error);
      setSubmitError('Failed to submit proposal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const calculateVotePercentages = (grant: Grant) => {
    const total = parseFloat(grant.votesFor) + parseFloat(grant.votesAgainst) + parseFloat(grant.votesAbstain);
    if (total === 0) return { for: 0, against: 0, abstain: 0 };
    return {
      for: (parseFloat(grant.votesFor) / total) * 100,
      against: (parseFloat(grant.votesAgainst) / total) * 100,
      abstain: (parseFloat(grant.votesAbstain) / total) * 100
    };
  };

  const stats = {
    totalGrants: grants.length,
    activeVoting: grants.filter(g => g.status === 'voting').length,
    totalFunded: grants.filter(g => g.status === 'funded' || g.status === 'completed')
      .reduce((sum, g) => sum + parseFloat(g.requestedAmount), 0),
    approvalRate: grants.length > 0 
      ? ((grants.filter(g => g.status === 'approved' || g.status === 'funded' || g.status === 'completed').length / grants.length) * 100).toFixed(1)
      : '0'
  };

  const filteredGrants = grants.filter(g => {
    if (filterCategory !== 'all' && g.category !== filterCategory) return false;
    if (filterStatus !== 'all' && g.status !== filterStatus) return false;
    if (activeTab === 'voting' && g.status !== 'voting') return false;
    if (activeTab === 'my-proposals' && g.proposerAddress.toLowerCase() !== address?.toLowerCase()) return false;
    return true;
  });

  return (
    <Layout>
      <Head>
        <title>Treasury Grants DAO | Axiom Smart City</title>
        <meta name="description" content="Community-driven treasury grants for Axiom ecosystem development" />
      </Head>

      <div className="bg-gradient-to-b from-purple-50/50 to-white">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-2 mb-4">
              <Link href="/" className="text-white/80 hover:text-white text-sm">Home</Link>
              <span className="text-white/50">/</span>
              <Link href="/governance" className="text-white/80 hover:text-white text-sm">Governance</Link>
              <span className="text-white/50">/</span>
              <span className="text-sm">Treasury Grants</span>
            </div>
            
            <h1 className="text-4xl font-bold mb-2">Community Treasury Grants</h1>
            <p className="text-white/90 text-lg">
              Propose and vote on treasury funding for ecosystem development
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Proposals', value: stats.totalGrants, icon: '📋', color: 'bg-purple-50 border-purple-200' },
              { label: 'Active Voting', value: stats.activeVoting, icon: '🗳️', color: 'bg-blue-50 border-blue-200' },
              { label: 'Total Funded', value: `${(stats.totalFunded / 1000000).toFixed(2)}M AXM`, icon: '💰', color: 'bg-green-50 border-green-200' },
              { label: 'Approval Rate', value: `${stats.approvalRate}%`, icon: '✅', color: 'bg-amber-50 border-amber-200' }
            ].map((stat, i) => (
              <div key={i} className={`${stat.color} border rounded-xl p-6`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{stat.icon}</span>
                  <span className="text-gray-600 text-sm">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All Proposals', icon: '📋' },
                { id: 'voting', label: 'Active Voting', icon: '🗳️' },
                { id: 'my-proposals', label: 'My Proposals', icon: '👤' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {isConnected ? (
              <button
                onClick={() => setActiveTab('create')}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-2 rounded-lg font-bold hover:from-purple-600 hover:to-indigo-600 transition-all"
              >
                + Submit Proposal
              </button>
            ) : (
              <button
                onClick={connectMetaMask}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-2 rounded-lg font-bold hover:from-purple-600 hover:to-indigo-600 transition-all"
              >
                Connect Wallet to Submit
              </button>
            )}
          </div>

          <div className="flex gap-4 mb-6">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg"
            >
              <option value="all">All Categories</option>
              <option value="development">Development</option>
              <option value="marketing">Marketing</option>
              <option value="community">Community</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="research">Research</option>
              <option value="education">Education</option>
              <option value="partnerships">Partnerships</option>
              <option value="other">Other</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="voting">Voting</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="funded">Funded</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-500">
              Loading proposals...
            </div>
          ) : activeTab === 'create' ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit New Proposal</h2>
              <p className="text-gray-600 mb-8">
                Treasury grant proposals require a minimum of 100,000 AXM voting power to submit.
                Proposals are voted on by the community for 7 days.
              </p>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                  Proposal submitted successfully! Redirecting...
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Title</label>
                  <input 
                    type="text" 
                    value={proposalForm.title}
                    onChange={(e) => setProposalForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief title for your proposal"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Category</label>
                  <select 
                    value={proposalForm.category}
                    onChange={(e) => setProposalForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="development">Development</option>
                    <option value="marketing">Marketing</option>
                    <option value="community">Community</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="research">Research</option>
                    <option value="education">Education</option>
                    <option value="partnerships">Partnerships</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Requested Amount (AXM)</label>
                  <input 
                    type="number" 
                    value={proposalForm.requestedAmount}
                    onChange={(e) => setProposalForm(prev => ({ ...prev, requestedAmount: e.target.value }))}
                    placeholder="Amount of AXM requested"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Description</label>
                  <textarea 
                    rows={6}
                    value={proposalForm.description}
                    onChange={(e) => setProposalForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of your proposal, goals, and how funds will be used"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveTab('all')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmitProposal}
                    disabled={submitting || !proposalForm.title || !proposalForm.requestedAmount || !proposalForm.description}
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-3 rounded-lg font-bold hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Proposal'}
                  </button>
                </div>
              </div>
            </div>
          ) : filteredGrants.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Proposals Found</h3>
              <p className="text-gray-500">
                {activeTab === 'my-proposals' 
                  ? "You haven't submitted any proposals yet" 
                  : "No proposals match your filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGrants.map((grant) => {
                const votes = calculateVotePercentages(grant);
                
                return (
                  <div key={grant.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{CATEGORY_ICONS[grant.category]}</span>
                          <h3 className="text-xl font-bold text-gray-900">{grant.title}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[grant.category]}`}>
                            {grant.category}
                          </span>
                          <span className="text-gray-500 text-sm">
                            by {formatAddress(grant.proposerAddress)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-amber-600 font-bold text-xl">
                            {(parseFloat(grant.requestedAmount) / 1000000).toFixed(2)}M AXM
                          </div>
                          <div className="text-gray-500 text-sm">Requested</div>
                        </div>
                        <span className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${STATUS_COLORS[grant.status]}`}>
                          {grant.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {grant.description}
                    </p>

                    {grant.status === 'voting' && (
                      <div>
                        <div className="flex justify-between mb-2 text-sm">
                          <span className="text-green-600">For: {votes.for.toFixed(1)}%</span>
                          <span className="text-red-600">Against: {votes.against.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                          <div style={{ width: `${votes.for}%` }} className="bg-green-500" />
                          <div style={{ width: `${votes.abstain}%` }} className="bg-gray-400" />
                          <div style={{ width: `${votes.against}%` }} className="bg-red-500" />
                        </div>
                        <div className="flex justify-between mt-2 text-sm text-gray-500">
                          <span>{grant.quorumReached ? '✅ Quorum reached' : '⏳ Quorum not reached'}</span>
                          <span>Ends: {new Date(grant.votingEndDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* How Treasury Grants Work */}
          <div className="mt-16 border-t border-gray-200 pt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How Treasury Grants Work</h2>
            
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              {[
                {
                  step: '1',
                  icon: '💡',
                  title: 'Submit Proposal',
                  description: 'Create a detailed proposal explaining your project, goals, budget breakdown, and timeline. Requires 100,000 AXM voting power minimum.'
                },
                {
                  step: '2',
                  icon: '🗳️',
                  title: 'Community Voting',
                  description: 'AXM holders vote on proposals for 7 days. Your voting power is based on your staked AXM and node ownership.'
                },
                {
                  step: '3',
                  icon: '✅',
                  title: 'Approval & Funding',
                  description: 'Proposals passing with majority vote and reaching quorum are approved. Funds are released from the treasury.'
                },
                {
                  step: '4',
                  icon: '📊',
                  title: 'Execution & Reporting',
                  description: 'Grant recipients execute their plans and provide progress updates. Community tracks milestones and impact.'
                }
              ].map((item) => (
                <div key={item.step} className="bg-white border border-gray-200 rounded-xl p-5 text-center hover:shadow-lg transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3">
                    {item.step}
                  </div>
                  <span className="text-3xl block mb-2">{item.icon}</span>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              ))}
            </div>

            {/* Grant Categories */}
            <div className="mb-12">
              <h3 className="font-bold text-gray-900 text-xl mb-6 text-center">Grant Categories</h3>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { category: 'Development', icon: '💻', color: 'bg-blue-100 border-blue-200', desc: 'Smart contracts, dApps, tools, and protocol improvements' },
                  { category: 'Marketing', icon: '📣', color: 'bg-amber-100 border-amber-200', desc: 'Brand awareness, partnerships, and community growth' },
                  { category: 'Community', icon: '👥', color: 'bg-green-100 border-green-200', desc: 'Events, meetups, education programs, and content' },
                  { category: 'Infrastructure', icon: '🏗️', color: 'bg-purple-100 border-purple-200', desc: 'Node operations, security audits, and network scaling' },
                  { category: 'Research', icon: '🔬', color: 'bg-cyan-100 border-cyan-200', desc: 'Academic studies, whitepapers, and R&D initiatives' },
                  { category: 'Education', icon: '📚', color: 'bg-pink-100 border-pink-200', desc: 'Tutorials, courses, documentation, and onboarding' },
                  { category: 'Partnerships', icon: '🤝', color: 'bg-orange-100 border-orange-200', desc: 'Business development and strategic integrations' },
                  { category: 'Other', icon: '📋', color: 'bg-gray-100 border-gray-200', desc: 'Unique proposals that don\'t fit other categories' }
                ].map((cat, i) => (
                  <div key={i} className={`${cat.color} border rounded-xl p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="font-bold text-gray-900">{cat.category}</span>
                    </div>
                    <p className="text-gray-600 text-sm">{cat.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Grant Sizes */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🌱</div>
                <h3 className="font-bold text-green-800 text-lg mb-2">Micro Grants</h3>
                <div className="text-2xl font-bold text-green-600 mb-2">Up to 100K AXM</div>
                <p className="text-gray-600 text-sm">For small projects, bug bounties, and quick wins. Faster approval with lower quorum requirements.</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="font-bold text-blue-800 text-lg mb-2">Standard Grants</h3>
                <div className="text-2xl font-bold text-blue-600 mb-2">100K - 5M AXM</div>
                <p className="text-gray-600 text-sm">For medium-sized projects like dApp development, marketing campaigns, and community initiatives.</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🏛️</div>
                <h3 className="font-bold text-purple-800 text-lg mb-2">Major Grants</h3>
                <div className="text-2xl font-bold text-purple-600 mb-2">5M+ AXM</div>
                <p className="text-gray-600 text-sm">For strategic initiatives, major infrastructure, and ecosystem-defining projects. Requires higher quorum.</p>
              </div>
            </div>

            {/* Tips for Success */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 mb-12">
              <h3 className="font-bold text-purple-800 text-lg mb-4 flex items-center gap-2">
                <span className="text-2xl">💡</span> Tips for a Successful Proposal
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { tip: 'Clear Objectives', desc: 'Define specific, measurable goals and outcomes for your project' },
                  { tip: 'Detailed Budget', desc: 'Break down exactly how funds will be used with itemized costs' },
                  { tip: 'Realistic Timeline', desc: 'Set achievable milestones with clear deadlines' },
                  { tip: 'Team Credentials', desc: 'Showcase relevant experience and past successes' },
                  { tip: 'Community Benefit', desc: 'Explain how the Axiom ecosystem will benefit' },
                  { tip: 'Engage Early', desc: 'Discuss your idea in forums before formal submission' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <div>
                      <span className="font-bold text-gray-900">{item.tip}:</span>
                      <span className="text-gray-600 ml-1">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Voting Power */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-12">
              <h3 className="font-bold text-gray-900 text-xl mb-4">Understanding Voting Power</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">🪙</div>
                  <h4 className="font-bold text-gray-900 mb-1">AXM Holdings</h4>
                  <p className="text-gray-600 text-sm">1 AXM = 1 vote for tokens held in your wallet</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">📈</div>
                  <h4 className="font-bold text-gray-900 mb-1">Staked AXM</h4>
                  <p className="text-gray-600 text-sm">Staked tokens receive 1.5x voting multiplier</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">🖥️</div>
                  <h4 className="font-bold text-gray-900 mb-1">Node Ownership</h4>
                  <p className="text-gray-600 text-sm">Node operators gain bonus voting power based on tier</p>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 text-xl mb-6">Frequently Asked Questions</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    q: 'How much AXM do I need to submit a proposal?',
                    a: 'You need at least 100,000 AXM voting power (from holdings, staking, or node ownership) to submit a proposal.'
                  },
                  {
                    q: 'How long is the voting period?',
                    a: 'Standard voting lasts 7 days. Major grants (5M+ AXM) may have extended 14-day voting periods.'
                  },
                  {
                    q: 'What is quorum and why does it matter?',
                    a: 'Quorum is the minimum participation required for a valid vote. Without reaching quorum, proposals cannot pass regardless of vote ratio.'
                  },
                  {
                    q: 'Can I change my vote?',
                    a: 'Yes, you can change your vote at any time before the voting period ends. Only your final vote counts.'
                  },
                  {
                    q: 'How are funds distributed?',
                    a: 'Approved grants receive funds in phases tied to milestone completion. This ensures accountability and progress.'
                  },
                  {
                    q: 'What happens if a project fails to deliver?',
                    a: 'Remaining funds may be reclaimed by the treasury. The community can vote on remediation or fund recovery.'
                  }
                ].map((faq, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 text-sm mb-2">{faq.q}</h4>
                    <p className="text-gray-600 text-sm">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
