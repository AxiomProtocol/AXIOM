import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../components/navigation';
import MembershipGate, { MemberBadge } from '../components/MembershipGate';
import PoolCard from '../components/pools/PoolCard';

const poolsImage = "/images/resource_coordination_pools_illustration.png";

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

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <div style={{
          position: "relative",
          padding: "80px 0 60px 0",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 212, 170, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 60%, rgba(123, 104, 238, 0.05) 0%, transparent 50%)
            `,
            pointerEvents: "none"
          }} />

          <div className="max-w-6xl mx-auto px-4" style={{ position: "relative" }}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div style={{ 
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(123, 104, 238, 0.08) 100%)",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  marginBottom: "20px",
                  border: "1px solid rgba(0, 212, 170, 0.2)"
                }}>
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    background: "linear-gradient(135deg, #00D4AA 0%, #00A389 100%)",
                    borderRadius: "50%"
                  }} />
                  <span style={{ 
                    fontSize: "13px", 
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#00A389"
                  }}>Coordination</span>
                </div>
                
                <h1 style={{ 
                  fontSize: "clamp(32px, 5vw, 48px)", 
                  lineHeight: 1.1, 
                  margin: "0 0 16px 0",
                  fontWeight: 700,
                  color: "#0A0F1C"
                }}>Participate</h1>
                
                <p style={{ 
                  fontSize: "18px", 
                  lineHeight: 1.6,
                  color: "rgba(10, 15, 28, 0.65)", 
                  maxWidth: "500px",
                  margin: 0
                }}>
                  Coordinate resources through purpose pools and governance. Commit AXUSD to pools that align with your goals and vote on community proposals.
                </p>

                {memberData?.membershipStatus && (
                  <div className="mt-6">
                    <MemberBadge status={memberData.membershipStatus} />
                  </div>
                )}
              </div>
              
              <div className="hidden lg:block">
                <img 
                  src={poolsImage} 
                  alt="Resource coordination pools illustration"
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    borderRadius: "24px",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {memberData?.membershipStatus === 'member' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div style={{
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(0, 0, 0, 0.06)",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)"
              }}>
                <p className="text-sm text-gray-500 mb-1">AXUSD Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(memberData.axusdBalance)}</p>
              </div>
              <div style={{
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(0, 0, 0, 0.06)",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)"
              }}>
                <p className="text-sm text-gray-500 mb-1">Committed</p>
                <p className="text-2xl font-bold text-teal-600">{formatAmount(memberData.axusdCommitted)}</p>
              </div>
              <div style={{
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(0, 0, 0, 0.06)",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)"
              }}>
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
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontWeight: 500,
                  transition: "all 0.2s",
                  background: activeTab === tab 
                    ? "linear-gradient(135deg, #00A389 0%, #00D4AA 100%)" 
                    : "white",
                  color: activeTab === tab ? "white" : "#4B5563",
                  border: activeTab === tab ? "none" : "1px solid #E5E7EB"
                }}
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
              <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          )}

          {!loading && activeTab === 'pools' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Active Purpose Pools</h2>
                <Link href="/land" className="text-teal-600 hover:underline text-sm">
                  View Land Candidates
                </Link>
              </div>

              {activePools.length === 0 ? (
                <div style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  borderRadius: "16px",
                  padding: "48px",
                  textAlign: "center"
                }}>
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
                <div style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  borderRadius: "16px",
                  padding: "48px",
                  textAlign: "center"
                }}>
                  <p className="text-gray-600 mb-4">No active proposals at this time.</p>
                  <p className="text-sm text-gray-500">New proposals will appear here when submitted for voting.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeProposals.map(proposal => (
                    <div key={proposal.id} style={{
                      background: "rgba(255, 255, 255, 0.9)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(0, 0, 0, 0.06)",
                      borderRadius: "16px",
                      padding: "24px"
                    }}>
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
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-teal-500" 
                            style={{ width: `${(parseFloat(proposal.yesVotes) / (parseFloat(proposal.yesVotes) + parseFloat(proposal.noVotes) || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">{proposal.totalVotes} votes</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'commitments' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">My Commitments</h2>
              
              {!memberData?.commitments?.length ? (
                <div style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  borderRadius: "16px",
                  padding: "48px",
                  textAlign: "center"
                }}>
                  <p className="text-gray-600 mb-4">You have no active commitments.</p>
                  <p className="text-sm text-gray-500">Commit AXUSD to purpose pools to participate in coordination.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {memberData.commitments.map((commitment, i) => (
                    <div key={i} style={{
                      background: "rgba(255, 255, 255, 0.9)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(0, 0, 0, 0.06)",
                      borderRadius: "16px",
                      padding: "24px"
                    }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-gray-900">{commitment.poolName}</h3>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            commitment.status === 'active' ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {commitment.status}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-teal-600">{formatAmount(commitment.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'history' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Voting History</h2>
              
              {!memberData?.votingHistory?.length ? (
                <div style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  borderRadius: "16px",
                  padding: "48px",
                  textAlign: "center"
                }}>
                  <p className="text-gray-600 mb-4">No voting history yet.</p>
                  <p className="text-sm text-gray-500">Your votes on governance proposals will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {memberData.votingHistory.map((vote, i) => (
                    <div key={i} style={{
                      background: "rgba(255, 255, 255, 0.9)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(0, 0, 0, 0.06)",
                      borderRadius: "16px",
                      padding: "24px"
                    }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-gray-900">{vote.title}</h3>
                          <p className="text-sm text-gray-500">{new Date(vote.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`font-medium ${vote.vote === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
                          {vote.vote.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
