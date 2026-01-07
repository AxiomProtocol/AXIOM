import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Proposal {
  id: number;
  title: string;
  description: string;
  proposalType: string;
  votingStartDate: string;
  votingEndDate: string;
  quorumPercentage: string;
  passingThreshold: string;
  status: string;
  totalVotes: number;
  totalVotingPower: string;
  yesVotes: string;
  noVotes: string;
  abstainVotes: string;
  proposerName: string;
  campaignTitle: string;
  poolName: string;
  location: string;
  createdAt: string;
}

const theme = {
  primary: '#00D4AA',
  secondary: '#FFD700',
  accent: '#7B68EE',
  dark: '#121212',
};

export default function VotingPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all' | 'mine'>('active');

  useEffect(() => {
    fetchProposals();
  }, [filter]);

  const fetchProposals = async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'active') params.set('status', 'active');
      if (filter === 'mine') params.set('userId', '1');
      
      const res = await fetch(`/api/land-acquisition/voting/proposals?${params}`);
      const data = await res.json();
      if (data.success) {
        setProposals(data.data.proposals);
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#cce5ff', color: '#004085' };
      case 'passed': return { bg: '#d4edda', color: '#155724' };
      case 'rejected': return { bg: '#f8d7da', color: '#721c24' };
      case 'executed': return { bg: '#d1ecf1', color: '#0c5460' };
      default: return { bg: '#e2e3e5', color: '#383d41' };
    }
  };

  const calculateVotePercentages = (proposal: Proposal) => {
    const total = parseFloat(proposal.yesVotes) + parseFloat(proposal.noVotes) + parseFloat(proposal.abstainVotes);
    if (total === 0) return { yes: 0, no: 0, abstain: 0 };
    return {
      yes: (parseFloat(proposal.yesVotes) / total * 100).toFixed(1),
      no: (parseFloat(proposal.noVotes) / total * 100).toFixed(1),
      abstain: (parseFloat(proposal.abstainVotes) / total * 100).toFixed(1),
    };
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <>
      <Head>
        <title>Token Holder Voting | Axiom Protocol</title>
        <meta name="description" content="Vote on land investment decisions as a token holder" />
      </Head>

      <main style={{ background: '#FFFFFF', minHeight: '100vh', padding: '40px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 40 }}>
            <Link href="/land-acquisition" style={{ color: theme.primary, textDecoration: 'none' }}>
              Back to Land Acquisition
            </Link>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 16 }}>Token Holder Voting</h1>
            <p style={{ color: '#666' }}>Vote on key decisions affecting your land investments</p>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {(['active', 'all', 'mine'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '10px 20px',
                  background: filter === f ? theme.primary : 'transparent',
                  color: filter === f ? '#fff' : theme.dark,
                  border: `1px solid ${filter === f ? theme.primary : '#ddd'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                {f === 'mine' ? 'My Proposals' : f === 'active' ? 'Active Votes' : 'All Proposals'}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>Loading proposals...</div>
          ) : proposals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#f8f9fa', borderRadius: 12 }}>
              <h3>No {filter === 'active' ? 'Active' : ''} Proposals</h3>
              <p style={{ color: '#666' }}>
                {filter === 'active' 
                  ? 'There are no proposals requiring your vote right now.' 
                  : 'No proposals have been created yet.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24 }}>
              {proposals.map((proposal) => {
                const statusStyle = getStatusColor(proposal.status);
                const percentages = calculateVotePercentages(proposal);
                const daysRemaining = getDaysRemaining(proposal.votingEndDate);

                return (
                  <div key={proposal.id} style={{ 
                    padding: 24, 
                    background: '#f8f9fa', 
                    borderRadius: 12,
                    border: '1px solid #e9ecef',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <span style={{
                            padding: '4px 12px',
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 500,
                            textTransform: 'uppercase',
                          }}>
                            {proposal.status}
                          </span>
                          <span style={{
                            padding: '4px 12px',
                            background: '#e9ecef',
                            color: '#495057',
                            borderRadius: 4,
                            fontSize: 12,
                          }}>
                            {proposal.proposalType}
                          </span>
                        </div>
                        <h3 style={{ margin: 0 }}>{proposal.title}</h3>
                        <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                          {proposal.campaignTitle || proposal.poolName} - {proposal.location}
                        </p>
                      </div>
                      
                      {proposal.status === 'active' && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: daysRemaining <= 1 ? '#dc3545' : theme.primary }}>
                            {daysRemaining}
                          </div>
                          <div style={{ fontSize: 12, color: '#666' }}>days left</div>
                        </div>
                      )}
                    </div>

                    <p style={{ marginBottom: 16, color: '#333' }}>
                      {proposal.description.length > 200 
                        ? proposal.description.substring(0, 200) + '...' 
                        : proposal.description}
                    </p>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#28a745' }}>Yes: {percentages.yes}%</span>
                        <span style={{ fontSize: 12, color: '#dc3545' }}>No: {percentages.no}%</span>
                      </div>
                      <div style={{ height: 8, background: '#e9ecef', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${percentages.yes}%`, background: '#28a745' }} />
                        <div style={{ width: `${percentages.no}%`, background: '#dc3545' }} />
                        <div style={{ width: `${percentages.abstain}%`, background: '#6c757d' }} />
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        {proposal.totalVotes} votes cast - Quorum: {proposal.quorumPercentage}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#666' }}>
                        Proposed by {proposal.proposerName}
                      </span>
                      <Link 
                        href={`/land-acquisition/voting/${proposal.id}`}
                        style={{
                          padding: '10px 20px',
                          background: proposal.status === 'active' ? theme.primary : '#6c757d',
                          color: '#fff',
                          borderRadius: 8,
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                      >
                        {proposal.status === 'active' ? 'Vote Now' : 'View Details'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
