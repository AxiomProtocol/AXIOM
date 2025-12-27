import Head from 'next/head';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../../components/Layout';
import { useWallet } from '../../components/WalletConnect/WalletContext';

const PROPOSAL_TYPES = [
  { value: 'parameter', label: 'Parameter Change', description: 'Modify protocol parameters (fees, thresholds, etc.)' },
  { value: 'treasury', label: 'Treasury Allocation', description: 'Request funds from protocol treasury' },
  { value: 'upgrade', label: 'Contract Upgrade', description: 'Propose smart contract upgrades' },
  { value: 'governance', label: 'Governance Change', description: 'Modify voting rules or quorum requirements' },
  { value: 'community', label: 'Community Initiative', description: 'Propose community programs or partnerships' },
];

interface ProposalDraft {
  title: string;
  type: string;
  summary: string;
  description: string;
  specifications: string;
  timeline: string;
  budget: string;
}

export default function CreateProposalPage() {
  const { walletState } = useWallet();
  const [draft, setDraft] = useState<ProposalDraft>({
    title: '',
    type: 'parameter',
    summary: '',
    description: '',
    specifications: '',
    timeline: '',
    budget: '',
  });
  const [votingPower, setVotingPower] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const MIN_VOTING_POWER = '1000';

  useEffect(() => {
    const fetchVotingPower = async () => {
      if (!walletState.address) return;
      try {
        const res = await fetch(`/api/v2/veaxm-balance?address=${walletState.address}`);
        const data = await res.json();
        if (data.success) {
          setVotingPower(data.votingPower || '0');
        }
      } catch (err) {
        console.error('Error fetching voting power:', err);
      }
    };

    if (walletState.address) {
      fetchVotingPower();
    }
  }, [walletState.address]);

  const handleChange = (field: keyof ProposalDraft, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateDraft = (): boolean => {
    if (!draft.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (draft.title.length < 10) {
      setError('Title must be at least 10 characters');
      return false;
    }
    if (!draft.summary.trim()) {
      setError('Summary is required');
      return false;
    }
    if (draft.summary.length < 50) {
      setError('Summary must be at least 50 characters');
      return false;
    }
    if (!draft.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (draft.description.length < 100) {
      setError('Description must be at least 100 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateDraft()) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/governance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          proposer: walletState.address,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to submit proposal');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasMinVotingPower = parseFloat(votingPower) >= parseFloat(MIN_VOTING_POWER);

  if (!walletState.isConnected) {
    return (
      <>
        <Head>
          <title>Create Proposal | Axiom Governance</title>
        </Head>
        <Layout showWallet={true}>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🗳️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
              <p className="text-gray-400">Connect to create governance proposals</p>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Head>
          <title>Proposal Submitted | Axiom Governance</title>
        </Head>
        <Layout showWallet={true}>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-white mb-2">Proposal Submitted!</h2>
              <p className="text-gray-400 mb-6">Your proposal has been submitted for review. It will appear in the voting queue once approved.</p>
              <a href="/v2-analytics" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-colors">
                View Governance Dashboard
              </a>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Create Proposal | Axiom Governance</title>
      </Head>
      <Layout showWallet={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">
                Create Proposal
              </h1>
              <p className="text-gray-400">Draft a governance proposal for the Axiom community</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Your Voting Power</p>
                <p className="text-2xl font-bold text-yellow-400">{parseFloat(votingPower).toLocaleString()} veAXM</p>
              </div>
              <div className={`px-4 py-2 rounded-lg ${hasMinVotingPower ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {hasMinVotingPower ? 'Eligible to propose' : `Need ${MIN_VOTING_POWER} veAXM`}
              </div>
            </div>

            {!hasMinVotingPower && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <p className="text-red-400">You need at least {MIN_VOTING_POWER} veAXM to create proposals. Lock more AXM tokens to increase your voting power.</p>
                <a href="/staking" className="text-yellow-400 hover:text-yellow-300 text-sm mt-2 inline-block">Go to Staking →</a>
              </div>
            )}

            {preview ? (
              <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6 mb-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-white">Preview</h2>
                  <button onClick={() => setPreview(false)} className="text-gray-400 hover:text-white">
                    ← Edit
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                      {PROPOSAL_TYPES.find(t => t.value === draft.type)?.label}
                    </span>
                    <h3 className="text-2xl font-bold text-white mt-2">{draft.title}</h3>
                  </div>
                  
                  <div>
                    <h4 className="text-sm text-gray-400 mb-1">Summary</h4>
                    <p className="text-white">{draft.summary}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm text-gray-400 mb-1">Description</h4>
                    <p className="text-gray-300 whitespace-pre-wrap">{draft.description}</p>
                  </div>
                  
                  {draft.specifications && (
                    <div>
                      <h4 className="text-sm text-gray-400 mb-1">Technical Specifications</h4>
                      <p className="text-gray-300 whitespace-pre-wrap font-mono text-sm bg-gray-900/50 p-3 rounded">{draft.specifications}</p>
                    </div>
                  )}
                  
                  {draft.timeline && (
                    <div>
                      <h4 className="text-sm text-gray-400 mb-1">Timeline</h4>
                      <p className="text-gray-300">{draft.timeline}</p>
                    </div>
                  )}
                  
                  {draft.budget && (
                    <div>
                      <h4 className="text-sm text-gray-400 mb-1">Budget Request</h4>
                      <p className="text-yellow-400 font-bold">{draft.budget}</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !hasMinVotingPower}
                  className="w-full mt-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-lg transition-all"
                >
                  {submitting ? 'Submitting...' : 'Submit Proposal'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Proposal Type</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {PROPOSAL_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => handleChange('type', type.value)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          draft.type === type.value
                            ? 'border-yellow-500 bg-yellow-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <p className={`font-medium ${draft.type === type.value ? 'text-yellow-400' : 'text-white'}`}>
                          {type.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Proposal Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Title *</label>
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="Enter a clear, descriptive title"
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                        maxLength={100}
                      />
                      <p className="text-xs text-gray-500 mt-1">{draft.title.length}/100 characters</p>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Summary *</label>
                      <textarea
                        value={draft.summary}
                        onChange={(e) => handleChange('summary', e.target.value)}
                        placeholder="Brief summary of your proposal (2-3 sentences)"
                        rows={3}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none"
                        maxLength={300}
                      />
                      <p className="text-xs text-gray-500 mt-1">{draft.summary.length}/300 characters</p>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Full Description *</label>
                      <textarea
                        value={draft.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Detailed explanation of the proposal, including motivation, benefits, and potential risks"
                        rows={8}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Technical Specifications (optional)</label>
                      <textarea
                        value={draft.specifications}
                        onChange={(e) => handleChange('specifications', e.target.value)}
                        placeholder="Contract addresses, function calls, parameter changes, etc."
                        rows={4}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none font-mono text-sm"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Timeline (optional)</label>
                        <input
                          type="text"
                          value={draft.timeline}
                          onChange={(e) => handleChange('timeline', e.target.value)}
                          placeholder="e.g., 2 weeks for implementation"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Budget Request (optional)</label>
                        <input
                          type="text"
                          value={draft.budget}
                          onChange={(e) => handleChange('budget', e.target.value)}
                          placeholder="e.g., 10,000 AXM"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <a href="/v2-analytics" className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-lg text-center transition-colors">
                    Cancel
                  </a>
                  <button
                    onClick={() => {
                      if (validateDraft()) setPreview(true);
                    }}
                    disabled={!hasMinVotingPower}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-lg transition-all"
                  >
                    Preview Proposal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
