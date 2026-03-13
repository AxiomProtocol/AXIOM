import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { DesignLawLayout } from '../components/design-law/DesignLawLayout';

interface LandCandidate {
  id: number;
  name: string;
  county?: string;
  state?: string;
  acreage?: number;
  asking_price?: string;
  stage: string;
  public_summary?: string;
  due_diligence_checks: number;
  due_diligence_total: number;
  approval_proposal_id?: number;
}

interface CandidatesResponse {
  success: boolean;
  candidates: LandCandidate[];
  stats: {
    total: number;
    byStage: Record<string, number>;
  };
  error?: string;
}

interface FundingPool {
  id: number;
  name: string;
  description?: string;
  target_amount: string;
  total_contributed: string;
  funding_progress: number;
  member_count?: number;
  member_limit?: number;
  status: string;
  monthly_contribution?: string;
}

interface PoolsResponse {
  success: boolean;
  pools: FundingPool[];
  total: number;
  error?: string;
}

interface GovernanceProposal {
  id: number;
  title: string;
  description?: string;
  proposal_type?: string;
  votes_for?: number;
  votes_against?: number;
  status: string;
  quorum_required?: number;
  total_votes?: number;
  voting_starts_at?: string;
  voting_ends_at?: string;
  executed_at?: string;
  metadata?: {
    rationale?: string;
    requested_action?: string;
    land_candidate_id?: number;
  };
  land_candidate_name?: string;
  land_candidate_stage?: string;
}

interface GovernanceResponse {
  success: boolean;
  proposals: GovernanceProposal[];
  total: number;
  error?: string;
}

interface ProduceStats {
  total: number;
  reserved: number;
  confirmed: number;
  claimed: number;
}

interface ProduceReservation {
  id: number;
  member_name?: string;
  box_type?: string;
  status: string;
  created_at?: string;
}

interface ProduceResponse {
  success: boolean;
  stats: ProduceStats;
  reservations: ProduceReservation[];
  error?: string;
}

type TabKey = 'pipeline' | 'funding' | 'governance' | 'produce';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'funding', label: 'Funding Pools' },
  { key: 'governance', label: 'Governance' },
  { key: 'produce', label: 'Produce & Housing' },
];

const PIPELINE_STAGES: { key: string; label: string }[] = [
  { key: 'candidate', label: 'Submission' },
  { key: 'under_review', label: 'Due Diligence' },
  { key: 'community_vote', label: 'Community Vote' },
  { key: 'funding', label: 'Funding' },
  { key: 'acquired', label: 'Acquired' },
  { key: 'activated', label: 'Activated' },
];

const STAGE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  candidate: { text: 'text-dl-gray', bg: 'bg-gray-100', border: 'border-gray-300' },
  under_review: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  due_diligence: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  community_vote: { text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300' },
  approved: { text: 'text-dl-forest', bg: 'bg-green-50', border: 'border-green-300' },
  funding: { text: 'text-dl-gold', bg: 'bg-yellow-50', border: 'border-yellow-300' },
  acquired: { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  activated: { text: 'text-dl-navy', bg: 'bg-blue-50', border: 'border-blue-300' },
  draft: { text: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300' },
  active: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  passed: { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  failed: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
  executed: { text: 'text-dl-navy', bg: 'bg-blue-50', border: 'border-blue-300' },
  pending: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
};

const PROPOSAL_TYPES = [
  { value: 'land_acquisition', label: 'Land Acquisition' },
  { value: 'land_use', label: 'Land Use Change' },
  { value: 'steward_assignment', label: 'Steward Assignment' },
  { value: 'funding_allocation', label: 'Funding Allocation' },
  { value: 'policy_change', label: 'Policy Change' },
  { value: 'general', label: 'General' },
];

function formatCurrency(value: string | number | undefined): string {
  if (value === undefined || value === null) return '$0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatAcreage(value: number | string | undefined): string {
  if (value === undefined || value === null) return '0.0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.0';
  return num.toFixed(1);
}

function getStageBadge(stage: string) {
  const colors = STAGE_COLORS[stage] || STAGE_COLORS.candidate;
  const label = stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-dl-mono border ${colors.bg} ${colors.text} ${colors.border}`}>
      {label}
    </span>
  );
}

function getStatusLifecycleSteps() {
  return ['draft', 'active', 'passed', 'executed'];
}

export default function LandPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('pipeline');

  const [candidates, setCandidates] = useState<LandCandidate[]>([]);
  const [byStage, setByStage] = useState<Record<string, number>>({});
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [candidatesError, setCandidatesError] = useState('');

  const [pools, setPools] = useState<FundingPool[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [poolsError, setPoolsError] = useState('');

  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [proposalsError, setProposalsError] = useState('');

  const [produceStats, setProduceStats] = useState<ProduceStats>({ total: 0, reserved: 0, confirmed: 0, claimed: 0 });
  const [reservations, setReservations] = useState<ProduceReservation[]>([]);
  const [produceLoading, setProduceLoading] = useState(true);
  const [produceError, setProduceError] = useState('');

  const [proposalsRefreshKey, setProposalsRefreshKey] = useState(0);
  const [candidatesRefreshKey, setCandidatesRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/land/candidates')
      .then(r => r.json())
      .then((data: CandidatesResponse) => {
        if (data.success) {
          setCandidates(data.candidates || []);
          setByStage(data.stats?.byStage || {});
        } else {
          setCandidatesError(data.error || 'Failed to load candidates');
        }
      })
      .catch(() => setCandidatesError('Failed to load candidates'))
      .finally(() => setCandidatesLoading(false));
  }, [candidatesRefreshKey]);

  useEffect(() => {
    if (activeTab !== 'funding') return;
    setPoolsLoading(true);
    fetch('/api/land/pools')
      .then(r => r.json())
      .then((data: PoolsResponse) => {
        if (data.success) {
          setPools(data.pools || []);
        } else {
          setPoolsError(data.error || 'Failed to load pools');
        }
      })
      .catch(() => setPoolsError('Failed to load funding pools'))
      .finally(() => setPoolsLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'governance' && activeTab !== 'pipeline') return;
    setProposalsLoading(true);
    fetch('/api/land/governance')
      .then(r => r.json())
      .then((data: GovernanceResponse) => {
        if (data.success) {
          setProposals(data.proposals || []);
        } else {
          setProposalsError(data.error || 'Failed to load proposals');
        }
      })
      .catch(() => setProposalsError('Failed to load governance proposals'))
      .finally(() => setProposalsLoading(false));
  }, [activeTab, proposalsRefreshKey]);

  useEffect(() => {
    if (activeTab !== 'produce') return;
    setProduceLoading(true);
    fetch('/api/land/produce')
      .then(r => r.json())
      .then((data: ProduceResponse) => {
        if (data.success) {
          setProduceStats(data.stats || { total: 0, reserved: 0, confirmed: 0, claimed: 0 });
          setReservations(data.reservations || []);
        } else {
          setProduceError(data.error || 'Failed to load produce data');
        }
      })
      .catch(() => setProduceError('Failed to load produce data'))
      .finally(() => setProduceLoading(false));
  }, [activeTab]);

  const handleProposalCreated = () => {
    setProposalsRefreshKey(k => k + 1);
    setCandidatesRefreshKey(k => k + 1);
  };

  const handleVoteCast = () => {
    setProposalsRefreshKey(k => k + 1);
    setCandidatesRefreshKey(k => k + 1);
  };

  return (
    <>
      <Head>
        <title>Physical-Digital Bridge | Axiom Protocol</title>
        <meta name="description" content="Community Land Acquisition Pipeline — from submission to community activation." />
      </Head>
      <DesignLawLayout>
        <div className="relative w-full h-40 sm:h-52 lg:h-64 -mt-6 sm:-mt-8 -mx-4 sm:-mx-6 mb-6 overflow-hidden" style={{ width: 'calc(100% + 2rem)' }}>
          <Image
            src="/images/realestate/land_hero.jpg"
            alt="Land Acquisition Pipeline"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-4 sm:pb-6">
            <h1 className="font-dl-serif text-xl sm:text-2xl lg:text-3xl text-white">Physical-Digital Bridge</h1>
            <p className="font-dl-mono text-xs sm:text-sm text-gray-300 mt-1">Community Land Acquisition Pipeline</p>
          </div>
        </div>

        <div className="border-b border-dl-border mb-8">
          <div className="flex gap-6 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-b-2 border-dl-navy text-dl-navy font-bold'
                    : 'text-dl-gray hover:text-dl-navy'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'pipeline' && (
          <PipelineTab
            candidates={candidates}
            byStage={byStage}
            loading={candidatesLoading}
            error={candidatesError}
            proposals={proposals}
          />
        )}
        {activeTab === 'funding' && (
          <FundingTab pools={pools} loading={poolsLoading} error={poolsError} />
        )}
        {activeTab === 'governance' && (
          <GovernanceTab
            proposals={proposals}
            loading={proposalsLoading}
            error={proposalsError}
            candidates={candidates}
            onProposalCreated={handleProposalCreated}
            onVoteCast={handleVoteCast}
          />
        )}
        {activeTab === 'produce' && (
          <ProduceTab
            stats={produceStats}
            reservations={reservations}
            loading={produceLoading}
            error={produceError}
          />
        )}
      </DesignLawLayout>
    </>
  );
}

function PipelineTab({
  candidates,
  byStage,
  loading,
  error,
  proposals,
}: {
  candidates: LandCandidate[];
  byStage: Record<string, number>;
  loading: boolean;
  error: string;
  proposals: GovernanceProposal[];
}) {
  const getActiveProposalForCandidate = (candidateId: number) => {
    return proposals.find(p => {
      const meta = p.metadata;
      return meta?.land_candidate_id === candidateId && ['active', 'draft'].includes(p.status);
    });
  };

  return (
    <div>
      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = byStage[stage.key] || 0;
            return (
              <React.Fragment key={stage.key}>
                {i > 0 && (
                  <div className="text-dl-gray px-2 font-dl-mono text-xs">→</div>
                )}
                <div className="border border-dl-border bg-dl-bg px-4 py-3 text-center min-w-[120px]">
                  <p className="font-dl-serif text-sm text-dl-navy font-bold">{stage.label}</p>
                  <p className="font-dl-mono text-lg text-dl-navy">{count}</p>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {loading && <p className="text-dl-gray text-sm">Loading...</p>}
      {error && <p className="text-red-700 text-sm">{error}</p>}

      {!loading && !error && candidates.length === 0 && (
        <div className="border border-dl-border bg-dl-bg p-8 text-center">
          <p className="text-dl-gray text-sm">No land candidates currently in the pipeline.</p>
        </div>
      )}

      {!loading && !error && candidates.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map(c => {
            const activeProposal = c.stage === 'community_vote' ? getActiveProposalForCandidate(c.id) : null;
            return (
              <div key={c.id} className="border border-dl-border bg-dl-bg p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-dl-serif text-lg text-dl-navy font-bold">{c.name}</h3>
                  {getStageBadge(c.stage)}
                </div>
                {(c.county || c.state) && (
                  <p className="text-dl-gray text-sm mb-2 font-dl-mono">
                    {[c.county, c.state].filter(Boolean).join(', ')}
                  </p>
                )}
                <div className="flex gap-6 mb-3 text-sm">
                  {c.acreage !== undefined && c.acreage !== null && (
                    <div>
                      <span className="text-dl-gray">Acreage: </span>
                      <span className="font-dl-mono text-dl-navy">{formatAcreage(c.acreage)}</span>
                    </div>
                  )}
                  {c.asking_price !== undefined && c.asking_price !== null && (
                    <div>
                      <span className="text-dl-gray">Asking: </span>
                      <span className="font-dl-mono text-dl-navy">{formatCurrency(c.asking_price)}</span>
                    </div>
                  )}
                </div>
                <p className="text-dl-gray text-xs mb-3 font-dl-mono">
                  Due Diligence: {c.due_diligence_checks}/{c.due_diligence_total} checks
                </p>
                {c.public_summary && (
                  <p className="text-dl-gray text-sm leading-relaxed mb-3">{c.public_summary}</p>
                )}
                {activeProposal && (
                  <div className="border-t border-dl-border pt-3 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-700 text-xs font-dl-mono">⚡ Active Proposal</span>
                      {getStageBadge(activeProposal.status)}
                    </div>
                    <p className="text-sm text-dl-navy font-bold">{activeProposal.title}</p>
                    <div className="flex gap-4 mt-2 text-xs font-dl-mono">
                      <span className="text-green-700">For: {activeProposal.votes_for || 0}</span>
                      <span className="text-red-700">Against: {activeProposal.votes_against || 0}</span>
                      <span className="text-dl-gray">
                        Quorum: {Math.min(Math.round(((activeProposal.total_votes || 0) / (activeProposal.quorum_required || 10)) * 100), 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FundingTab({
  pools,
  loading,
  error,
}: {
  pools: FundingPool[];
  loading: boolean;
  error: string;
}) {
  if (loading) return <p className="text-dl-gray text-sm">Loading...</p>;
  if (error) return <p className="text-red-700 text-sm">{error}</p>;

  if (pools.length === 0) {
    return (
      <div className="border border-dl-border bg-dl-bg p-8 text-center">
        <p className="text-dl-gray text-sm">No active funding pools. Pools are created when land candidates reach the funding stage.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {pools.map(p => {
        const progress = Math.min(p.funding_progress, 100);
        return (
          <div key={p.id} className="border border-dl-border bg-dl-bg p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-dl-serif text-lg text-dl-navy font-bold">{p.name}</h3>
              {getStageBadge(p.status)}
            </div>
            {p.description && (
              <p className="text-dl-gray text-sm mb-3">{p.description}</p>
            )}
            <div className="flex gap-6 mb-3 text-sm">
              <div>
                <span className="text-dl-gray">Target: </span>
                <span className="font-dl-mono text-dl-navy">{formatCurrency(p.target_amount)}</span>
              </div>
              <div>
                <span className="text-dl-gray">Contributed: </span>
                <span className="font-dl-mono text-dl-navy">{formatCurrency(p.total_contributed)}</span>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-dl-gray font-dl-mono">{progress.toFixed(1)}% funded</span>
              </div>
              <div className="w-full h-3 border border-dl-border bg-dl-bg">
                <div
                  className="h-full bg-dl-forest"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              {p.member_count !== undefined && (
                <div>
                  <span className="text-dl-gray">Members: </span>
                  <span className="font-dl-mono text-dl-navy">
                    {p.member_count}{p.member_limit ? `/${p.member_limit}` : ''}
                  </span>
                </div>
              )}
              {p.monthly_contribution && (
                <div>
                  <span className="text-dl-gray">Monthly: </span>
                  <span className="font-dl-mono text-dl-navy">{formatCurrency(p.monthly_contribution)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GovernanceTab({
  proposals,
  loading,
  error,
  candidates,
  onProposalCreated,
  onVoteCast,
}: {
  proposals: GovernanceProposal[];
  loading: boolean;
  error: string;
  candidates: LandCandidate[];
  onProposalCreated: () => void;
  onVoteCast: () => void;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [votingId, setVotingId] = useState<number | null>(null);
  const [voteError, setVoteError] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRationale, setFormRationale] = useState('');
  const [formType, setFormType] = useState('land_acquisition');
  const [formCandidateId, setFormCandidateId] = useState('');
  const [formRequestedAction, setFormRequestedAction] = useState('');

  const handleCreateProposal = async () => {
    if (!formTitle.trim() || !formDescription.trim()) {
      setCreateError('Title and description are required');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const body: any = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        rationale: formRationale.trim() || undefined,
        proposal_type: formType,
        requested_action: formRequestedAction.trim() || undefined,
      };

      if (formCandidateId) {
        body.land_candidate_id = parseInt(formCandidateId);
      }

      const res = await fetch('/api/land/governance/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateForm(false);
        setFormTitle('');
        setFormDescription('');
        setFormRationale('');
        setFormType('land_acquisition');
        setFormCandidateId('');
        setFormRequestedAction('');
        onProposalCreated();
      } else {
        setCreateError(data.error || 'Failed to create proposal');
      }
    } catch {
      setCreateError('Failed to create proposal');
    } finally {
      setCreating(false);
    }
  };

  const handleVote = async (proposalId: number, vote: 'for' | 'against') => {
    setVotingId(proposalId);
    setVoteError('');

    try {
      const res = await fetch('/api/land/governance/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_id: proposalId, vote }),
      });

      const data = await res.json();
      if (data.success) {
        onVoteCast();
      } else {
        setVoteError(data.error || 'Failed to cast vote');
      }
    } catch {
      setVoteError('Failed to cast vote');
    } finally {
      setVotingId(null);
    }
  };

  const lifecycleSteps = getStatusLifecycleSteps();

  if (loading) return <p className="text-dl-gray text-sm">Loading...</p>;
  if (error) return <p className="text-red-700 text-sm">{error}</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="font-dl-serif text-xl text-dl-navy font-bold">Governance Proposals</h2>
          <p className="text-dl-gray text-xs font-dl-mono mt-1">
            Lifecycle: Draft → Active → Passed/Failed → Executed
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 min-h-[44px] text-sm font-dl-mono bg-dl-navy text-white border border-dl-navy hover:bg-dl-forest"
        >
          {showCreateForm ? 'Cancel' : '+ New Proposal'}
        </button>
      </div>

      {showCreateForm && (
        <div className="border border-dl-border bg-dl-bg p-6 mb-6">
          <h3 className="font-dl-serif text-lg text-dl-navy font-bold mb-4">Create Governance Proposal</h3>

          {createError && (
            <p className="text-red-700 text-sm mb-3">{createError}</p>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-dl-gray text-xs font-dl-mono mb-1">Title *</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="w-full border border-dl-border px-3 py-2 text-sm font-dl-mono focus:outline-none focus:border-dl-navy"
                placeholder="Proposal title"
              />
            </div>
            <div>
              <label className="block text-dl-gray text-xs font-dl-mono mb-1">Type *</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value)}
                className="w-full border border-dl-border px-3 py-2 text-sm font-dl-mono focus:outline-none focus:border-dl-navy bg-white"
              >
                {PROPOSAL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-dl-gray text-xs font-dl-mono mb-1">Description *</label>
            <textarea
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              rows={3}
              className="w-full border border-dl-border px-3 py-2 text-sm font-dl-mono focus:outline-none focus:border-dl-navy"
              placeholder="Describe the proposal in detail"
            />
          </div>

          <div className="mb-4">
            <label className="block text-dl-gray text-xs font-dl-mono mb-1">Rationale</label>
            <textarea
              value={formRationale}
              onChange={e => setFormRationale(e.target.value)}
              rows={2}
              className="w-full border border-dl-border px-3 py-2 text-sm font-dl-mono focus:outline-none focus:border-dl-navy"
              placeholder="Why should this proposal be approved?"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-dl-gray text-xs font-dl-mono mb-1">Linked Land Candidate</label>
              <select
                value={formCandidateId}
                onChange={e => setFormCandidateId(e.target.value)}
                className="w-full border border-dl-border px-3 py-2 text-sm font-dl-mono focus:outline-none focus:border-dl-navy bg-white"
              >
                <option value="">None</option>
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.stage})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-dl-gray text-xs font-dl-mono mb-1">Requested Action</label>
              <input
                type="text"
                value={formRequestedAction}
                onChange={e => setFormRequestedAction(e.target.value)}
                className="w-full border border-dl-border px-3 py-2 text-sm font-dl-mono focus:outline-none focus:border-dl-navy"
                placeholder="e.g., Approve purchase, Allocate funds"
              />
            </div>
          </div>

          <button
            onClick={handleCreateProposal}
            disabled={creating}
            className="px-6 py-2 text-sm font-dl-mono bg-dl-navy text-white border border-dl-navy hover:bg-dl-forest transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Submit Proposal'}
          </button>
        </div>
      )}

      {voteError && (
        <div className="border border-red-300 bg-red-50 p-3 mb-4">
          <p className="text-red-700 text-sm">{voteError}</p>
        </div>
      )}

      {proposals.length === 0 && (
        <div className="border border-dl-border bg-dl-bg p-8 text-center">
          <p className="text-dl-gray text-sm">No governance proposals yet. Create one to start the community governance process.</p>
        </div>
      )}

      {proposals.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {proposals.map(p => {
            const votesFor = p.votes_for || 0;
            const votesAgainst = p.votes_against || 0;
            const totalVotes = votesFor + votesAgainst;
            const forPct = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;
            const quorumRequired = p.quorum_required || 10;
            const quorumPct = Math.min((totalVotes / quorumRequired) * 100, 100);
            const quorumReached = totalVotes >= quorumRequired;
            const isActive = p.status === 'active';
            const canVote = isActive && !quorumReached;

            return (
              <div key={p.id} className="border border-dl-border bg-dl-bg p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-dl-serif text-lg text-dl-navy font-bold">{p.title}</h3>
                  {getStageBadge(p.status)}
                </div>

                <div className="flex gap-1 mb-3">
                  {lifecycleSteps.map((step, i) => {
                    const isCurrent = p.status === step;
                    const isPast = lifecycleSteps.indexOf(p.status) > i || (p.status === 'failed' && i < 2);
                    const isFailed = p.status === 'failed' && step === 'passed';
                    return (
                      <div key={step} className="flex-1">
                        <div
                          className={`h-1.5 ${
                            isCurrent ? 'bg-dl-navy' :
                            isPast ? 'bg-dl-forest' :
                            isFailed ? 'bg-red-500' :
                            'bg-gray-200'
                          }`}
                        />
                        <p className={`text-[10px] font-dl-mono mt-0.5 ${
                          isCurrent ? 'text-dl-navy font-bold' :
                          isPast ? 'text-dl-forest' :
                          'text-dl-gray'
                        }`}>
                          {isFailed ? 'Failed' : step.charAt(0).toUpperCase() + step.slice(1)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {p.proposal_type && (
                  <p className="text-dl-gray text-xs font-dl-mono mb-2 uppercase">{p.proposal_type.replace(/_/g, ' ')}</p>
                )}
                {p.description && (
                  <p className="text-dl-gray text-sm mb-3">{p.description}</p>
                )}
                {p.metadata?.rationale && (
                  <div className="mb-3">
                    <p className="text-dl-gray text-xs font-dl-mono mb-1">Rationale:</p>
                    <p className="text-dl-gray text-sm italic">{p.metadata.rationale}</p>
                  </div>
                )}
                {p.metadata?.requested_action && (
                  <p className="text-dl-gray text-xs font-dl-mono mb-3">
                    Action: <span className="text-dl-navy">{p.metadata.requested_action}</span>
                  </p>
                )}
                {p.land_candidate_name && (
                  <p className="text-purple-700 text-xs font-dl-mono mb-3">
                    Linked: {p.land_candidate_name}
                  </p>
                )}

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-dl-forest font-dl-mono">For: {votesFor}</span>
                    <span className="text-red-700 font-dl-mono">Against: {votesAgainst}</span>
                  </div>
                  <div className="w-full h-3 border border-dl-border bg-red-100 flex">
                    <div
                      className="h-full bg-dl-forest"
                      style={{ width: `${forPct}%` }}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-dl-gray font-dl-mono">
                      Quorum: {totalVotes}/{quorumRequired} votes ({quorumPct.toFixed(0)}%)
                    </span>
                    {quorumReached && (
                      <span className="text-dl-forest font-dl-mono font-bold">✓ Reached</span>
                    )}
                  </div>
                  <div className="w-full h-2 border border-dl-border bg-dl-bg">
                    <div
                      className={`h-full ${quorumReached ? 'bg-dl-forest' : 'bg-dl-navy'}`}
                      style={{ width: `${quorumPct}%` }}
                    />
                  </div>
                </div>

                {canVote && (
                  <div className="flex gap-3 pt-2 border-t border-dl-border">
                    <button
                      onClick={() => handleVote(p.id, 'for')}
                      disabled={votingId === p.id}
                      className="flex-1 px-3 py-2 min-h-[44px] text-xs font-dl-mono bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 disabled:opacity-50"
                    >
                      {votingId === p.id ? '...' : 'Vote For'}
                    </button>
                    <button
                      onClick={() => handleVote(p.id, 'against')}
                      disabled={votingId === p.id}
                      className="flex-1 px-3 py-2 min-h-[44px] text-xs font-dl-mono bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 disabled:opacity-50"
                    >
                      {votingId === p.id ? '...' : 'Vote Against'}
                    </button>
                  </div>
                )}

                {p.voting_ends_at && isActive && (
                  <p className="text-dl-gray text-[10px] font-dl-mono mt-2">
                    Voting ends: {new Date(p.voting_ends_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProduceTab({
  stats,
  reservations,
  loading,
  error,
}: {
  stats: ProduceStats;
  reservations: ProduceReservation[];
  loading: boolean;
  error: string;
}) {
  if (loading) return <p className="text-dl-gray text-sm">Loading...</p>;
  if (error) return <p className="text-red-700 text-sm">{error}</p>;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Reservations', value: stats.total },
          { label: 'Reserved', value: stats.reserved },
          { label: 'Confirmed', value: stats.confirmed },
          { label: 'Claimed', value: stats.claimed },
        ].map(s => (
          <div key={s.label} className="border border-dl-border bg-dl-bg p-4 text-center">
            <p className="font-dl-mono text-2xl text-dl-navy">{s.value}</p>
            <p className="text-dl-gray text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {reservations.length === 0 ? (
        <div className="border border-dl-border bg-dl-bg p-8 text-center mb-8">
          <p className="text-dl-gray text-sm">No produce reservations yet. Reservations become available when acquired land is activated for agriculture.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {reservations.map(r => (
            <div key={r.id} className="border border-dl-border bg-dl-bg p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="font-dl-mono text-sm text-dl-navy">{r.box_type || 'Produce Box'}</p>
                {getStageBadge(r.status)}
              </div>
              {r.member_name && (
                <p className="text-dl-gray text-xs">{r.member_name}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border border-dl-border bg-dl-bg p-6">
        <h3 className="font-dl-serif text-lg text-dl-navy font-bold mb-3">Produce-to-Community Pipeline</h3>
        <p className="text-dl-gray text-sm leading-relaxed mb-4">
          When acquired land is activated for agriculture, community members can reserve produce boxes through participation credits earned in The Wealth Practice.
        </p>
        <p className="text-dl-gray text-sm leading-relaxed mb-4">
          This creates a tangible bridge between digital asset onboarding and physical community benefit — connecting group economics to land stewardship outcomes.
        </p>
        <div className="border-t border-dl-border pt-4 mt-4">
          <p className="font-dl-serif text-sm text-dl-navy font-bold mb-2">How It Works</p>
          <ol className="list-decimal list-inside text-dl-gray text-sm space-y-1">
            <li>Land is acquired through community governance and pooled funding</li>
            <li>Stewards activate the land for agricultural production</li>
            <li>Community members earn participation credits through The Wealth Practice</li>
            <li>Credits are redeemed for produce box reservations</li>
            <li>Produce is distributed to community members locally</li>
          </ol>
        </div>
        <div className="border-t border-dl-border pt-4 mt-4">
          <a href="/wealth-practice" className="text-dl-navy text-sm font-bold border-b border-dl-navy hover:text-dl-forest">
            Join The Wealth Practice to earn participation credits &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
