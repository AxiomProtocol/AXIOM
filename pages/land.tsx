import React, { useState, useEffect } from 'react';
import Head from 'next/head';
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
};

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
  }, []);

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
    if (activeTab !== 'governance') return;
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
  }, [activeTab]);

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

  return (
    <>
      <Head>
        <title>Physical-Digital Bridge | Axiom Protocol</title>
        <meta name="description" content="Community Land Acquisition Pipeline — from submission to community activation." />
      </Head>
      <DesignLawLayout>
        <div className="mb-8">
          <h1 className="font-dl-serif text-3xl text-dl-navy font-bold mb-1">Physical-Digital Bridge</h1>
          <p className="text-dl-gray text-sm font-dl-mono">Community Land Acquisition Pipeline</p>
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
          />
        )}
        {activeTab === 'funding' && (
          <FundingTab pools={pools} loading={poolsLoading} error={poolsError} />
        )}
        {activeTab === 'governance' && (
          <GovernanceTab proposals={proposals} loading={proposalsLoading} error={proposalsError} />
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
}: {
  candidates: LandCandidate[];
  byStage: Record<string, number>;
  loading: boolean;
  error: string;
}) {
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
          {candidates.map(c => (
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
                <p className="text-dl-gray text-sm leading-relaxed">{c.public_summary}</p>
              )}
            </div>
          ))}
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
}: {
  proposals: GovernanceProposal[];
  loading: boolean;
  error: string;
}) {
  if (loading) return <p className="text-dl-gray text-sm">Loading...</p>;
  if (error) return <p className="text-red-700 text-sm">{error}</p>;

  if (proposals.length === 0) {
    return (
      <div className="border border-dl-border bg-dl-bg p-8 text-center">
        <p className="text-dl-gray text-sm">No governance proposals. Proposals are created when land candidates require community vote.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {proposals.map(p => {
        const votesFor = p.votes_for || 0;
        const votesAgainst = p.votes_against || 0;
        const totalVotes = votesFor + votesAgainst;
        const forPct = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;
        const quorumPct = p.quorum_required && p.total_votes !== undefined
          ? Math.min(((p.total_votes || totalVotes) / p.quorum_required) * 100, 100)
          : 0;

        return (
          <div key={p.id} className="border border-dl-border bg-dl-bg p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-dl-serif text-lg text-dl-navy font-bold">{p.title}</h3>
              {getStageBadge(p.status)}
            </div>
            {p.proposal_type && (
              <p className="text-dl-gray text-xs font-dl-mono mb-2 uppercase">{p.proposal_type.replace(/_/g, ' ')}</p>
            )}
            {p.description && (
              <p className="text-dl-gray text-sm mb-3">{p.description}</p>
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
            {p.quorum_required && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-dl-gray font-dl-mono">Quorum: {quorumPct.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 border border-dl-border bg-dl-bg">
                  <div
                    className="h-full bg-dl-navy"
                    style={{ width: `${quorumPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
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