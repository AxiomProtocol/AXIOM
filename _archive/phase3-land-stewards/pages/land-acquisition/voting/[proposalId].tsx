import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Vote {
  id: number;
  voterName: string;
  voteChoice: string;
  votingPower: string;
  sharesHeld: number;
  reason: string;
  createdAt: string;
}

interface Proposal {
  id: number;
  title: string;
  description: string;
  proposalType: string;
  options: any[];
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
  winningOption: number | null;
  proposerName: string;
  campaignTitle: string;
  poolName: string;
  createdAt: string;
}

const theme = {
  primary: '#00D4AA',
  secondary: '#FFD700',
  dark: '#121212',
};

export default function ProposalDetailPage() {
  const router = useRouter();
  const { proposalId } = router.query;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVote, setSelectedVote] = useState<'yes' | 'no' | 'abstain' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (proposalId) {
      fetchProposal();
    }
  }, [proposalId]);

  const fetchProposal = async () => {
    try {
      const res = await fetch(`/api/land-acquisition/voting/${proposalId}`);
      const data = await res.json();
      if (data.success) {
        setProposal(data.data.proposal);
        setVotes(data.data.votes);
      }
    } catch (error) {
      console.error('Failed to fetch proposal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedVote) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/land-acquisition/voting/${proposalId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({ voteChoice: selectedVote, reason }),
      });

      const data = await res.json();
      if (data.success) {
        setHasVoted(true);
        fetchProposal();
      } else {
        alert(data.error || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Vote error:', error);
      alert('Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  const calculatePercentages = () => {
    if (!proposal) return { yes: 0, no: 0, abstain: 0 };
    const total = parseFloat(proposal.yesVotes) + parseFloat(proposal.noVotes) + parseFloat(proposal.abstainVotes);
    if (total === 0) return { yes: 0, no: 0, abstain: 0 };
    return {
      yes: (parseFloat(proposal.yesVotes) / total * 100).toFixed(1),
      no: (parseFloat(proposal.noVotes) / total * 100).toFixed(1),
      abstain: (parseFloat(proposal.abstainVotes) / total * 100).toFixed(1),
    };
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center' }}>Loading proposal...</div>;
  }

  if (!proposal) {
    return <div style={{ padding: 60, textAlign: 'center' }}>Proposal not found</div>;
  }

  const percentages = calculatePercentages();
  const isActive = proposal.status === 'active' && new Date(proposal.votingEndDate) > new Date();

  return (
    <>
      <Head>
        <title>{proposal.title} | Voting | Axiom Protocol</title>
      </Head>

      <main style={{ background: '#FFFFFF', minHeight: '100vh', padding: '40px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Link href="/land-acquisition/voting" style={{ color: theme.primary, textDecoration: 'none' }}>
            Back to Voting
          </Link>

          <div style={{ marginTop: 24, marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <span style={{
                padding: '4px 12px',
                background: isActive ? '#cce5ff' : '#e2e3e5',
                color: isActive ? '#004085' : '#383d41',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'uppercase',
              }}>
                {proposal.status}
              </span>
              <span style={{
                padding: '4px 12px',
                background: '#f0f0f0',
                color: '#333',
                borderRadius: 4,
                fontSize: 12,
              }}>
                {proposal.proposalType}
              </span>
            </div>

            <h1 style={{ margin: 0, fontSize: 28 }}>{proposal.title}</h1>
            <p style={{ color: '#666', marginTop: 8 }}>
              {proposal.campaignTitle || proposal.poolName} - Proposed by {proposal.proposerName}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
            <div>
              <div style={{ background: '#f8f9fa', padding: 24, borderRadius: 12, marginBottom: 24 }}>
                <h3 style={{ marginTop: 0 }}>Description</h3>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{proposal.description}</p>
              </div>

              <div style={{ background: '#f8f9fa', padding: 24, borderRadius: 12, marginBottom: 24 }}>
                <h3 style={{ marginTop: 0 }}>Voting Results</h3>
                
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#28a745', fontWeight: 500 }}>Yes: {percentages.yes}%</span>
                    <span style={{ color: '#dc3545', fontWeight: 500 }}>No: {percentages.no}%</span>
                    <span style={{ color: '#6c757d', fontWeight: 500 }}>Abstain: {percentages.abstain}%</span>
                  </div>
                  <div style={{ height: 12, background: '#e9ecef', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${percentages.yes}%`, background: '#28a745', transition: 'width 0.3s' }} />
                    <div style={{ width: `${percentages.no}%`, background: '#dc3545', transition: 'width 0.3s' }} />
                    <div style={{ width: `${percentages.abstain}%`, background: '#6c757d', transition: 'width 0.3s' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#28a745' }}>{proposal.yesVotes}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Yes Votes</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#dc3545' }}>{proposal.noVotes}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>No Votes</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#6c757d' }}>{proposal.abstainVotes}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Abstain</div>
                  </div>
                </div>

                <div style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
                  {proposal.totalVotes} votes cast - Quorum required: {proposal.quorumPercentage}% - Passing threshold: {proposal.passingThreshold}%
                </div>
              </div>

              <div style={{ background: '#f8f9fa', padding: 24, borderRadius: 12 }}>
                <h3 style={{ marginTop: 0 }}>Recent Votes</h3>
                {votes.length === 0 ? (
                  <p style={{ color: '#666' }}>No votes cast yet</p>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {votes.slice(0, 10).map((vote) => (
                      <div key={vote.id} style={{ 
                        padding: 12, 
                        background: '#fff', 
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div>
                          <span style={{ fontWeight: 500 }}>{vote.voterName}</span>
                          <span style={{ 
                            marginLeft: 8,
                            padding: '2px 8px',
                            background: vote.voteChoice === 'yes' ? '#d4edda' : vote.voteChoice === 'no' ? '#f8d7da' : '#e2e3e5',
                            color: vote.voteChoice === 'yes' ? '#155724' : vote.voteChoice === 'no' ? '#721c24' : '#383d41',
                            borderRadius: 4,
                            fontSize: 12,
                            textTransform: 'uppercase',
                          }}>
                            {vote.voteChoice}
                          </span>
                          {vote.reason && (
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>{vote.reason}</p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 500 }}>{vote.votingPower}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>voting power</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              {isActive && !hasVoted ? (
                <div style={{ background: '#f8f9fa', padding: 24, borderRadius: 12, position: 'sticky', top: 24 }}>
                  <h3 style={{ marginTop: 0 }}>Cast Your Vote</h3>
                  
                  <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                    {(['yes', 'no', 'abstain'] as const).map((choice) => (
                      <button
                        key={choice}
                        onClick={() => setSelectedVote(choice)}
                        style={{
                          padding: 16,
                          background: selectedVote === choice 
                            ? choice === 'yes' ? '#28a745' : choice === 'no' ? '#dc3545' : '#6c757d'
                            : '#fff',
                          color: selectedVote === choice ? '#fff' : '#333',
                          border: '2px solid ' + (choice === 'yes' ? '#28a745' : choice === 'no' ? '#dc3545' : '#6c757d'),
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for your vote (optional)"
                    style={{
                      width: '100%',
                      padding: 12,
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      minHeight: 80,
                      resize: 'vertical',
                      marginBottom: 16,
                    }}
                  />

                  <button
                    onClick={handleVote}
                    disabled={!selectedVote || submitting}
                    style={{
                      width: '100%',
                      padding: 16,
                      background: selectedVote ? theme.primary : '#ccc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: selectedVote ? 'pointer' : 'not-allowed',
                      fontWeight: 600,
                      fontSize: 16,
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Vote'}
                  </button>
                </div>
              ) : hasVoted ? (
                <div style={{ background: '#d4edda', padding: 24, borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>&#10003;</div>
                  <h3 style={{ margin: 0, color: '#155724' }}>Vote Submitted</h3>
                  <p style={{ color: '#155724', marginTop: 8 }}>Thank you for participating!</p>
                </div>
              ) : (
                <div style={{ background: '#f8f9fa', padding: 24, borderRadius: 12, textAlign: 'center' }}>
                  <h3 style={{ margin: 0 }}>Voting Closed</h3>
                  <p style={{ color: '#666', marginTop: 8 }}>
                    This proposal is no longer accepting votes.
                  </p>
                </div>
              )}

              <div style={{ background: '#f8f9fa', padding: 24, borderRadius: 12, marginTop: 24 }}>
                <h4 style={{ marginTop: 0 }}>Voting Info</h4>
                <div style={{ fontSize: 14, color: '#666' }}>
                  <p><strong>Voting Ends:</strong> {new Date(proposal.votingEndDate).toLocaleDateString()}</p>
                  <p><strong>Quorum:</strong> {proposal.quorumPercentage}%</p>
                  <p><strong>Pass Threshold:</strong> {proposal.passingThreshold}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
