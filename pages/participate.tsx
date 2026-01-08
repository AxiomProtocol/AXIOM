import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../components/navigation';
import MembershipGate, { MemberBadge } from '../components/MembershipGate';
import PoolCard from '../components/pools/PoolCard';

interface Pool {
  id: number;
  name: string;
  purpose: string;
  status: string;
  targetAmountAxusd?: string;
  currentAmountAxusd?: string;
  minCommitAxusd?: string;
  currentMemberCount?: number;
  memberLimit?: number;
  landCandidate?: {
    name: string;
    location: string;
    acreage: string;
  };
}

interface Proposal {
  id: number;
  title: string;
  description: string;
  status: string;
  category: string;
  votingEndsAt: string;
  yesVotes: string;
  noVotes: string;
  totalVotes: number;
}

interface MemberData {
  membershipStatus: 'applicant' | 'member' | 'suspended' | 'removed' | null;
  axusdBalance: string;
  axusdCommitted: string;
  axusdAvailable: string;
  commitments: { poolId: number; poolName: string; amount: string; status: string }[];
  votingHistory: { proposalId: number; title: string; vote: string; createdAt: string }[];
}

export default function ParticipatePage() {
  const [activeTab, setActiveTab] = useState<'pools' | 'proposals' | 'commitments' | 'history'>('pools');
  const [pools, setPools] = useState<Pool[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [poolsRes, proposalsRes, memberRes] = await Promise.all([
          fetch('/api/pools'),
          fetch('/api/proposals'),
          fetch('/api/membership/status')
        ]);

        const poolsJson = await poolsRes.json();
        const proposalsJson = await proposalsRes.json();
        const memberJson = await memberRes.json();

        if (poolsJson.success) setPools(poolsJson.data || []);
        if (proposalsJson.success) setProposals(proposalsJson.data || []);
        if (memberJson.success) setMemberData(memberJson.data);
      } catch (error) {
        console.error('Failed to fetch participation data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatAmount = (value: string | number) => {
    const num = parseFloat(String(value || '0'));
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const activePools = pools.filter(p => p.status === 'open');
  const activeProposals = proposals.filter(p => p.status === 'voting');

  return (
    <SiteLayout>
      <Head>
        <title>Participate | Axiom Protocol</title>
        <meta name="description" content="Participate in Axiom Protocol purpose pools, vote on governance proposals, and coordinate community resources." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Participate</h1>
                <p className="text-amber-100">Coordinate resources through purpose pools and governance</p>
              </div>
              {memberData?.membershipStatus && (
                <div className="mt-4 md:mt-0 flex items-center gap-3">
                  <MemberBadge status={memberData.membershipStatus} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {memberData?.membershipStatus === 'member' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">AXUSD Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(memberData.axusdBalance)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Committed</p>
                <p className="text-2xl font-bold text-amber-600">{formatAmount(memberData.axusdCommitted)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Available</p>
                <p className="text-2xl font-bold text-green-600">{formatAmount(memberData.axusdAvailable)}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {(['pools', 'proposals', 'commitments', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {tab === 'pools' && `Purpose Pools (${activePools.length})`}
                {tab === 'proposals' && `Proposals (${activeProposals.length})`}
                {tab === 'commitments' && 'My Commitments'}
                {tab === 'history' && 'Voting History'}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          )}

          {!loading && activeTab === 'pools' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Active Purpose Pools</h2>
                <Link
                  href="/land"
                  className="text-amber-600 hover:underline text-sm"
                >
                  View Land Candidates
                </Link>
              </div>

              {activePools.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-600 mb-4">No active purpose pools at this time.</p>
                  <p className="text-sm text-gray-500">Check back soon for new coordination opportunities.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {activePools.map(pool => (
                    <MembershipGate
                      key={pool.id}
                      membershipStatus={memberData?.membershipStatus}
                      requireMember={false}
                    >
                      <PoolCard
                        pool={pool}
                        showCommitButton={memberData?.membershipStatus === 'member'}
                      />
                    </MembershipGate>
                  ))}
                </div>
              )}

              {pools.filter(p => p.status !== 'open').length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Pools</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {pools.filter(p => p.status !== 'open').map(pool => (
                      <PoolCard key={pool.id} pool={pool} showCommitButton={false} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'proposals' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Active Proposals</h2>

              {activeProposals.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-600 mb-4">No active proposals at this time.</p>
                  <p className="text-sm text-gray-500">New proposals will appear here when submitted for voting.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeProposals.map(proposal => (
                    <div key={proposal.id} className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 mb-2">
                            {proposal.category.replace('_', ' ').toUpperCase()}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">{proposal.title}</h3>
                        </div>
                        <span className="text-sm text-gray-500">
                          Ends {new Date(proposal.votingEndsAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{proposal.description}</p>
                      
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-green-600">Yes: {parseFloat(proposal.yesVotes).toFixed(0)}</span>
                            <span className="text-red-600">No: {parseFloat(proposal.noVotes).toFixed(0)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                            <div 
                              className="bg-green-500 h-full"
                              style={{ width: `${(parseFloat(proposal.yesVotes) / (parseFloat(proposal.yesVotes) + parseFloat(proposal.noVotes) || 1)) * 100}%` }}
                            />
                            <div 
                              className="bg-red-500 h-full"
                              style={{ width: `${(parseFloat(proposal.noVotes) / (parseFloat(proposal.yesVotes) + parseFloat(proposal.noVotes) || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{proposal.totalVotes} votes</span>
                      </div>

                      <MembershipGate
                        membershipStatus={memberData?.membershipStatus}
                        requireMember={true}
                        fallback={
                          <Link
                            href={`/proposals/${proposal.id}`}
                            className="block w-full text-center py-2 border border-amber-600 text-amber-600 rounded-lg hover:bg-amber-50"
                          >
                            View Details
                          </Link>
                        }
                      >
                        <div className="flex gap-3">
                          <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Vote Yes
                          </button>
                          <button className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                            Vote No
                          </button>
                          <button className="py-2 px-4 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
                            Abstain
                          </button>
                        </div>
                      </MembershipGate>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'commitments' && (
            <MembershipGate membershipStatus={memberData?.membershipStatus}>
              <h2 className="text-xl font-bold text-gray-900 mb-6">My Commitments</h2>
              {memberData?.commitments && memberData.commitments.length > 0 ? (
                <div className="space-y-4">
                  {memberData.commitments.map((commitment, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-900">{commitment.poolName}</h3>
                        <p className="text-sm text-gray-500">
                          Status: <span className="capitalize">{commitment.status}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-amber-600">{formatAmount(commitment.amount)}</p>
                        <p className="text-xs text-gray-500">AXUSD</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-600 mb-4">You have no active commitments.</p>
                  <button
                    onClick={() => setActiveTab('pools')}
                    className="text-amber-600 hover:underline"
                  >
                    Browse purpose pools
                  </button>
                </div>
              )}
            </MembershipGate>
          )}

          {!loading && activeTab === 'history' && (
            <MembershipGate membershipStatus={memberData?.membershipStatus}>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Voting History</h2>
              {memberData?.votingHistory && memberData.votingHistory.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proposal</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vote</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {memberData.votingHistory.map((vote, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-gray-900">{vote.title}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              vote.vote === 'yes' ? 'bg-green-100 text-green-800' :
                              vote.vote === 'no' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {vote.vote.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {new Date(vote.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-600">You have not voted on any proposals yet.</p>
                </div>
              )}
            </MembershipGate>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
