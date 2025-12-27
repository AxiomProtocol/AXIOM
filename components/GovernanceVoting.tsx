import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

interface Proposal {
  id: number;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'failed' | 'pending';
  votesFor: number;
  votesAgainst: number;
  endTime: number;
  proposer: string;
}

const SAMPLE_PROPOSALS: Proposal[] = [
  {
    id: 1,
    title: 'AIP-002: Increase Insurance Fund Diversion to 7%',
    description: 'Proposal to increase node rewards diversion from 5% to 7% for stronger SUSU coverage.',
    status: 'active',
    votesFor: 45000,
    votesAgainst: 12000,
    endTime: Date.now() + 5 * 24 * 60 * 60 * 1000,
    proposer: '0xDFf9...1528'
  },
  {
    id: 2,
    title: 'AIP-003: Add ETH/AXM Liquidity Incentives',
    description: 'Allocate 100,000 AXM from treasury to incentivize DEX liquidity providers.',
    status: 'active',
    votesFor: 38000,
    votesAgainst: 22000,
    endTime: Date.now() + 3 * 24 * 60 * 60 * 1000,
    proposer: '0x8Ae0...B008'
  },
  {
    id: 3,
    title: 'AIP-001: Sovereign Banking System Launch',
    description: 'Deploy V2 contracts for credit scoring, insurance, veAXM, and fee burner.',
    status: 'passed',
    votesFor: 125000,
    votesAgainst: 8500,
    endTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
    proposer: '0xDFf9...1528'
  }
];

export default function GovernanceVoting() {
  const { walletState } = useWallet();
  const address = walletState.address;
  const isConnected = walletState.isConnected;
  const [proposals, setProposals] = useState<Proposal[]>(SAMPLE_PROPOSALS);
  const [votingPower, setVotingPower] = useState('0');
  const [voting, setVoting] = useState<number | null>(null);

  useEffect(() => {
    if (address) {
      fetchVotingPower();
    }
  }, [address]);

  const fetchVotingPower = async () => {
    try {
      const res = await fetch(`/api/v2/veaxm-stats?address=${address}`);
      const data = await res.json();
      if (data.success && data.userPosition) {
        setVotingPower(data.userPosition.votingPower || '0');
      }
    } catch (err) {
      console.error('Error fetching voting power:', err);
    }
  };

  const handleVote = async (proposalId: number, support: boolean) => {
    setVoting(proposalId);
    await new Promise(r => setTimeout(r, 1500));
    setProposals(prev => prev.map(p => 
      p.id === proposalId 
        ? { 
            ...p, 
            votesFor: support ? p.votesFor + parseFloat(votingPower) : p.votesFor,
            votesAgainst: !support ? p.votesAgainst + parseFloat(votingPower) : p.votesAgainst
          }
        : p
    ));
    setVoting(null);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  const getTimeRemaining = (endTime: number) => {
    const diff = endTime - Date.now();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'passed': return 'bg-blue-500/20 text-blue-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const hasVotingPower = parseFloat(votingPower) > 0;

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-2xl">🗳️</span> Governance
          </h3>
          <div className="text-right">
            <p className="text-xs text-gray-400">Your Voting Power</p>
            <p className="text-lg font-bold text-purple-400">{formatNumber(parseFloat(votingPower))} veAXM</p>
          </div>
        </div>

        {!hasVotingPower && isConnected && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-400">
              Lock AXM for veAXM to participate in governance voting.
            </p>
          </div>
        )}
      </div>

      {proposals.map(proposal => {
        const total = proposal.votesFor + proposal.votesAgainst;
        const forPercent = total > 0 ? (proposal.votesFor / total) * 100 : 50;
        const isActive = proposal.status === 'active';

        return (
          <div key={proposal.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(proposal.status)}`}>
                    {proposal.status.toUpperCase()}
                  </span>
                  {isActive && (
                    <span className="text-xs text-gray-400">{getTimeRemaining(proposal.endTime)}</span>
                  )}
                </div>
                <h4 className="text-lg font-semibold text-white">{proposal.title}</h4>
                <p className="text-sm text-gray-400 mt-1">{proposal.description}</p>
                <p className="text-xs text-gray-500 mt-2">Proposed by {proposal.proposer}</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-green-400">For: {formatNumber(proposal.votesFor)}</span>
                <span className="text-red-400">Against: {formatNumber(proposal.votesAgainst)}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${forPercent}%` }}
                />
                <div 
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${100 - forPercent}%` }}
                />
              </div>
            </div>

            {isActive && hasVotingPower && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleVote(proposal.id, true)}
                  disabled={voting === proposal.id}
                  className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  {voting === proposal.id ? 'Voting...' : 'Vote For'}
                </button>
                <button
                  onClick={() => handleVote(proposal.id, false)}
                  disabled={voting === proposal.id}
                  className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  {voting === proposal.id ? 'Voting...' : 'Vote Against'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
