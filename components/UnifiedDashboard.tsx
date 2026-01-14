import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { usePersonalization, INTEREST_CONFIGS, InterestConfig } from '../lib/usePersonalization';

type DashboardTab = 'home' | 'investments' | 'governance';

interface InvestorPosition {
  fundSeries: string;
  committedAmount: number;
  deployedAmount: number;
  shares: number;
  currentValue: number;
  unrealizedGain: number;
  earnedYield: number;
  pendingDistribution: number;
  nextDistributionDate: string;
}

interface Distribution {
  id: string;
  date: string;
  fundSeries: string;
  grossAmount: number;
  fees: number;
  netAmount: number;
  type: 'interest' | 'principal' | 'special';
  status: 'paid' | 'pending' | 'scheduled';
  txHash?: string;
}

interface Statement {
  id: string;
  period: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'k1';
  generatedDate: string;
  downloadUrl: string;
}

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
}

interface VotingPower {
  walletAddress: string;
  axmBalance: number;
  stakedBalance: number;
  votingPower: number;
  delegatedTo?: string;
  delegatedFrom: number;
}

interface DashboardWidget {
  id: string;
  interest: InterestConfig;
  stats: { label: string; value: string }[];
  cta: { label: string; path: string };
}

interface QuickStat {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

export function UnifiedDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  
  const { 
    preferences, 
    isLoading, 
    getRecommendedFeatures, 
    getQuickActions, 
    getPersonalizedGreeting,
    shouldShowTutorials 
  } = usePersonalization();
  
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [overallStats, setOverallStats] = useState<QuickStat[]>([]);
  
  const [positions, setPositions] = useState<InvestorPosition[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [investorLoading, setInvestorLoading] = useState(true);
  const [investorSubTab, setInvestorSubTab] = useState<'overview' | 'distributions' | 'statements' | 'tax'>('overview');
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [governanceLoading, setGovernanceLoading] = useState(true);
  const [proposalFilter, setProposalFilter] = useState<'all' | 'active' | 'passed' | 'rejected'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isLoading && preferences.onboardingComplete) {
      loadDashboardData();
    }
  }, [isLoading, preferences]);

  useEffect(() => {
    if (activeTab === 'investments' && investorLoading) {
      fetchInvestorData();
    }
    if (activeTab === 'governance' && governanceLoading) {
      fetchGovernanceData();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    const { primary } = getRecommendedFeatures();
    
    try {
      const statsRes = await fetch('/api/stats/overview');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setOverallStats([
            { label: 'Community Members', value: statsData.members?.toLocaleString() || '0', change: statsData.memberChange || '', positive: true },
            { label: 'Total Value Locked', value: `$${((statsData.tvl || 0) / 1000000).toFixed(2)}M`, change: statsData.tvlChange || '', positive: true },
            { label: 'Active Proposals', value: String(statsData.proposals || 0), change: '', positive: true },
            { label: 'Your Participation', value: `${statsData.participation || 0}%`, change: '', positive: true }
          ]);
        }
      }
    } catch (err) {
      setOverallStats([
        { label: 'Community Members', value: '2,847', change: '+12%', positive: true },
        { label: 'Total Value Locked', value: '$1.2M', change: '+8%', positive: true },
        { label: 'Active Proposals', value: '5', change: '', positive: true },
        { label: 'Your Participation', value: '78%', change: '+5%', positive: true }
      ]);
    }
    
    const widgetData: DashboardWidget[] = await Promise.all(
      primary.slice(0, 4).map(async interest => {
        const stats = await fetchInterestStats(interest.id);
        return {
          id: interest.id,
          interest,
          stats,
          cta: { label: `Go to ${interest.label}`, path: interest.path }
        };
      })
    );
    
    setWidgets(widgetData);
  };

  const fetchInterestStats = async (interestId: string): Promise<{ label: string; value: string }[]> => {
    try {
      const res = await fetch(`/api/stats/${interestId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          return data.stats;
        }
      }
    } catch (err) {
      console.log(`Using default stats for ${interestId}`);
    }
    return getInterestStats(interestId);
  };

  const getInterestStats = (interestId: string): { label: string; value: string }[] => {
    const statsMap: Record<string, { label: string; value: string }[]> = {
      land: [{ label: 'Active Campaigns', value: '3' }, { label: 'Your Contributions', value: '$0' }],
      keygrow: [{ label: 'Available Properties', value: '12' }, { label: 'Ownership Progress', value: '0%' }],
      susu: [{ label: 'Active Circles', value: '8' }, { label: 'Your Savings', value: '$0' }],
      governance: [{ label: 'Open Proposals', value: '5' }, { label: 'Your Voting Power', value: '0 AXM' }],
      training: [{ label: 'Available Courses', value: '12' }, { label: 'Your Progress', value: '0%' }],
      staking: [{ label: 'Current APY', value: '12.5%' }, { label: 'Your Staked', value: '0 AXM' }],
      transparency: [{ label: 'Treasury Balance', value: '$1.2M' }, { label: 'Last Update', value: 'Today' }],
      nodes: [{ label: 'Active Nodes', value: '47' }, { label: 'Your Nodes', value: '0' }]
    };
    return statsMap[interestId] || [];
  };

  async function fetchInvestorData() {
    try {
      const response = await fetch('/api/dscr/investor/reports');
      if (response.ok) {
        const data = await response.json();
        setPositions(data.positions || []);
        setDistributions(data.distributions || []);
        setStatements(data.statements || []);
      }
    } catch (error) {
      console.error('Failed to fetch investor data:', error);
    } finally {
      setInvestorLoading(false);
    }
  }

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
      setGovernanceLoading(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);

  const handleExportReport = (format: 'pdf' | 'csv' = 'pdf') => {
    window.open(`/api/dscr/investor/reports/export?format=${format}`, '_blank');
  };

  const quickActions = getQuickActions();
  const greeting = getPersonalizedGreeting();

  const totalCommitted = positions.reduce((sum, p) => sum + p.committedAmount, 0);
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalYield = positions.reduce((sum, p) => sum + p.earnedYield, 0);
  const totalGain = positions.reduce((sum, p) => sum + p.unrealizedGain, 0);
  const overallReturn = totalCommitted > 0 ? ((totalValue - totalCommitted) / totalCommitted) * 100 : 0;

  const filteredProposals = proposals.filter(p => proposalFilter === 'all' || p.status === proposalFilter);

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading your dashboard...</div>
      </div>
    );
  }

  if (!preferences.onboardingComplete) {
    return null;
  }

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: '🏠' },
    { id: 'investments' as const, label: 'My Investments', icon: '💰' },
    { id: 'governance' as const, label: 'Governance', icon: '🗳️' }
  ];

  return (
    <div className="unified-dashboard" style={{ minHeight: '100vh', background: '#0f172a' }}>
      <style>{`
        .unified-dashboard { padding: 0; }
        .tab-nav { display: flex; gap: 0; overflow-x: auto; background: #1e293b; border-bottom: 1px solid #334155; }
        .tab-btn { flex: 1; min-width: 100px; padding: 16px 12px; background: transparent; border: none; color: #94a3b8; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: all 0.2s; border-bottom: 3px solid transparent; }
        .tab-btn:hover { background: #1e293b; color: #e2e8f0; }
        .tab-btn.active { color: #22c55e; border-bottom-color: #22c55e; background: #1e293b; }
        .tab-btn .tab-icon { font-size: 20px; }
        @media (min-width: 768px) {
          .tab-btn { flex-direction: row; gap: 8px; padding: 16px 24px; flex: none; }
          .tab-btn .tab-icon { font-size: 16px; }
        }
        .content-area { padding: 16px; max-width: 1200px; margin: 0 auto; }
        @media (min-width: 768px) { .content-area { padding: 24px; } }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 768px) { .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; } }
        .home-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
        @media (min-width: 768px) { .home-stats-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; } }
        .interests-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 768px) { .interests-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; } }
        .quick-actions-grid { display: flex; flex-direction: column; gap: 10px; }
        @media (min-width: 768px) { .quick-actions-grid { flex-direction: row; flex-wrap: wrap; gap: 12px; } .quick-actions-grid .quick-action-btn { width: auto; } }
        .inv-sub-tabs { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 2px; }
        .inv-sub-tab { padding: 10px 16px; background: transparent; border: none; color: #94a3b8; font-size: 13px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; }
        .inv-sub-tab:hover { color: #e2e8f0; }
        .inv-sub-tab.active { color: #22c55e; border-bottom-color: #22c55e; }
        .proposal-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: all 0.2s; }
        .filter-btn.active { background: #22c55e; color: #000; }
        .filter-btn:not(.active) { background: #334155; color: #94a3b8; }
        .filter-btn:not(.active):hover { background: #475569; }
      `}</style>

      <nav className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="content-area">
        {activeTab === 'home' && (
          <HomeTabContent
            greeting={greeting}
            overallStats={overallStats}
            quickActions={quickActions}
            widgets={widgets}
            preferences={preferences}
            shouldShowTutorials={shouldShowTutorials}
            router={router}
          />
        )}

        {activeTab === 'investments' && (
          <InvestmentsTabContent
            loading={investorLoading}
            positions={positions}
            distributions={distributions}
            statements={statements}
            totalCommitted={totalCommitted}
            totalValue={totalValue}
            totalYield={totalYield}
            totalGain={totalGain}
            overallReturn={overallReturn}
            activeSubTab={investorSubTab}
            setActiveSubTab={setInvestorSubTab}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            handleExportReport={handleExportReport}
          />
        )}

        {activeTab === 'governance' && (
          <GovernanceTabContent
            loading={governanceLoading}
            proposals={filteredProposals}
            allProposals={proposals}
            votingPower={votingPower}
            filter={proposalFilter}
            setFilter={setProposalFilter}
            showCreateModal={showCreateModal}
            setShowCreateModal={setShowCreateModal}
            formatNumber={formatNumber}
            onRefresh={fetchGovernanceData}
          />
        )}
      </div>
    </div>
  );
}

function HomeTabContent({ greeting, overallStats, quickActions, widgets, preferences, shouldShowTutorials, router }: any) {
  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
          {greeting}
        </h1>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          Here's what's happening in your Axiom community today.
        </p>
      </div>

      {shouldShowTutorials() && (
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
            <span style={{ fontSize: '28px' }}>💡</span>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#a5b4fc', marginBottom: '4px' }}>
                Getting Started Tip
              </h3>
              <p style={{ fontSize: '13px', color: '#c7d2fe', margin: 0, lineHeight: 1.5 }}>
                {preferences.interests.includes('land') 
                  ? 'Check out the Land Stewardship page to see active community campaigns and contribute to land acquisition.'
                  : preferences.interests.includes('susu')
                  ? 'Join The Wealth Practice to start building wealth together with your community.'
                  : 'Explore the features you selected during onboarding to get started with your journey.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/learn')}
            style={{
              padding: '10px 20px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Learn More
          </button>
        </div>
      )}

      <div className="home-stats-grid">
        {overallStats.map((stat: any, index: number) => (
          <div
            key={index}
            style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid #334155'
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              {stat.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>
                {stat.value}
              </span>
              {stat.change && (
                <span style={{ 
                  fontSize: '11px', 
                  color: stat.positive ? '#22c55e' : '#ef4444',
                  fontWeight: 500
                }}>
                  {stat.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '12px' }}>
          Quick Actions
        </h2>
        <div className="quick-actions-grid">
          {quickActions.map((action: any, index: number) => (
            <button
              key={index}
              onClick={() => router.push(action.path)}
              className="quick-action-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: '#e2e8f0',
                width: '100%',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '20px' }}>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '12px' }}>
          Your Interests
        </h2>
        <div className="interests-grid">
          {widgets.map((widget: any) => (
            <div
              key={widget.id}
              style={{
                background: '#1e293b',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid #334155',
                cursor: 'pointer'
              }}
              onClick={() => router.push(widget.interest.path)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: `${widget.interest.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  {widget.interest.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
                    {widget.interest.label}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                    {widget.interest.description}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
                {widget.stats.map((stat: any, idx: number) => (
                  <div key={idx} style={{ background: '#0f172a', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{stat.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <button style={{
                width: '100%',
                padding: '12px',
                background: widget.interest.color,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}>
                {widget.cta.label} →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvestmentsTabContent({ 
  loading, positions, distributions, statements, 
  totalCommitted, totalValue, totalYield, totalGain, overallReturn,
  activeSubTab, setActiveSubTab, formatCurrency, formatPercent, handleExportReport 
}: any) {
  const subTabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'distributions', label: 'Distributions', icon: '💸' },
    { id: 'statements', label: 'Statements', icon: '📄' },
    { id: 'tax', label: 'Tax Docs', icon: '📑' }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid #334155', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>My Investments</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>Track your positions, yields, and download statements</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleExportReport('csv')} style={{ padding: '8px 16px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            Export CSV
          </button>
          <button onClick={() => handleExportReport('pdf')} style={{ padding: '8px 16px', background: '#22c55e', color: '#000', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            Download PDF
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <SummaryCard title="Total Invested" value={formatCurrency(totalCommitted)} icon="💰" color="blue" />
        <SummaryCard title="Current Value" value={formatCurrency(totalValue)} subtitle={formatPercent(overallReturn)} icon="📈" color="green" />
        <SummaryCard title="Yield Earned" value={formatCurrency(totalYield)} subtitle="Year to date" icon="💵" color="purple" />
        <SummaryCard title="Unrealized Gain" value={formatCurrency(totalGain)} icon="📊" color="yellow" />
      </div>

      <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
        <div className="inv-sub-tabs" style={{ borderBottom: '1px solid #334155', padding: '0 16px' }}>
          {subTabs.map(tab => (
            <button
              key={tab.id}
              className={`inv-sub-tab ${activeSubTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              <span style={{ marginRight: '6px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px' }}>
          {activeSubTab === 'overview' && (
            <PositionsTable positions={positions} formatCurrency={formatCurrency} />
          )}
          {activeSubTab === 'distributions' && (
            <DistributionsList distributions={distributions} formatCurrency={formatCurrency} />
          )}
          {activeSubTab === 'statements' && (
            <StatementsList statements={statements.filter((s: Statement) => s.type !== 'k1')} />
          )}
          {activeSubTab === 'tax' && (
            <TaxDocuments statements={statements.filter((s: Statement) => s.type === 'k1')} totalYield={totalYield} totalCommitted={totalCommitted} formatCurrency={formatCurrency} />
          )}
        </div>
      </div>
    </div>
  );
}

function GovernanceTabContent({ 
  loading, proposals, allProposals, votingPower, filter, setFilter, 
  showCreateModal, setShowCreateModal, formatNumber, onRefresh 
}: any) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid #334155', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>Governance</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>Shape the future of Axiom Protocol through decentralized governance</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ padding: '12px 20px', background: '#22c55e', color: '#000', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}
        >
          + Create Proposal
        </button>
      </div>

      {votingPower && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Your Voting Power</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>{formatNumber(votingPower.votingPower)}</p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>AXM Balance</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>{formatNumber(votingPower.axmBalance)}</p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Staked AXM</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{formatNumber(votingPower.stakedBalance)}</p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Delegated to You</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#a855f7' }}>{formatNumber(votingPower.delegatedFrom)}</p>
          </div>
        </div>
      )}

      <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', marginBottom: '24px' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>Proposals</h2>
          <div className="proposal-filters">
            {['all', 'active', 'passed', 'rejected'].map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          {proposals.length > 0 ? (
            proposals.map((proposal: Proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>🗳️</p>
              <p>No proposals found</p>
              <button onClick={() => setShowCreateModal(true)} style={{ color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                Create the first proposal →
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> Governance Stats
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StatRow label="Total Proposals" value={allProposals.length.toString()} />
            <StatRow label="Active Proposals" value={allProposals.filter((p: Proposal) => p.status === 'active').length.toString()} />
            <StatRow label="Passed This Month" value={allProposals.filter((p: Proposal) => p.status === 'passed').length.toString()} />
            <StatRow label="Participation Rate" value="67%" />
          </div>
        </div>

        <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📜</span> Governance Rules
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <RuleItem title="Proposal Threshold" description="100,000 AXM to create" />
            <RuleItem title="Voting Period" description="7 days for standard" />
            <RuleItem title="Quorum" description="10% of circulating supply" />
            <RuleItem title="Execution Delay" description="48 hours after passing" />
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateProposalModal onClose={() => setShowCreateModal(false)} onSubmit={onRefresh} />
      )}
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon, color }: { title: string; value: string; subtitle?: string; icon: string; color: 'blue' | 'green' | 'purple' | 'yellow' }) {
  const colorClasses = {
    blue: { bg: '#1e3a5f', border: '#2563eb' },
    green: { bg: '#14532d', border: '#22c55e' },
    purple: { bg: '#3b0764', border: '#a855f7' },
    yellow: { bg: '#422006', border: '#eab308' }
  };

  return (
    <div style={{ background: colorClasses[color].bg, borderRadius: '12px', border: `1px solid ${colorClasses[color].border}40`, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
      </div>
      <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{title}</p>
      <p style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>{value}</p>
      {subtitle && (
        <p style={{ fontSize: '12px', marginTop: '4px', color: subtitle.startsWith('+') ? '#22c55e' : subtitle.startsWith('-') ? '#ef4444' : '#94a3b8' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function PositionsTable({ positions, formatCurrency }: { positions: InvestorPosition[]; formatCurrency: (v: number) => string }) {
  if (positions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
        <p style={{ fontSize: '32px', marginBottom: '12px' }}>📊</p>
        <p>No positions yet. Start investing to see your portfolio.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #334155' }}>
            <th style={{ textAlign: 'left', padding: '12px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>Fund Series</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>Committed</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>Deployed</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>Current Value</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>Yield</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '12px 8px' }}>
                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: pos.fundSeries === 'Series A' ? '#581c87' : '#14532d', color: pos.fundSeries === 'Series A' ? '#c084fc' : '#4ade80' }}>
                  {pos.fundSeries}
                </span>
              </td>
              <td style={{ padding: '12px 8px', color: '#f1f5f9', fontSize: '14px' }}>{formatCurrency(pos.committedAmount)}</td>
              <td style={{ padding: '12px 8px', color: '#f1f5f9', fontSize: '14px' }}>{formatCurrency(pos.deployedAmount)}</td>
              <td style={{ padding: '12px 8px', color: '#22c55e', fontSize: '14px' }}>{formatCurrency(pos.currentValue)}</td>
              <td style={{ padding: '12px 8px', color: '#f1f5f9', fontSize: '14px' }}>{formatCurrency(pos.earnedYield)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DistributionsList({ distributions, formatCurrency }: { distributions: Distribution[]; formatCurrency: (v: number) => string }) {
  if (distributions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
        <p style={{ fontSize: '32px', marginBottom: '12px' }}>💸</p>
        <p>No distributions yet. Distributions are paid quarterly.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {distributions.map(dist => (
        <div key={dist.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#0f172a', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: dist.type === 'interest' ? '#14532d' : dist.type === 'principal' ? '#1e3a5f' : '#422006' }}>
              {dist.type === 'interest' ? '💵' : dist.type === 'principal' ? '🏦' : '⭐'}
            </div>
            <div>
              <p style={{ color: '#f1f5f9', fontWeight: 500, fontSize: '14px' }}>{dist.fundSeries} - {dist.type.charAt(0).toUpperCase() + dist.type.slice(1)}</p>
              <p style={{ color: '#94a3b8', fontSize: '12px' }}>{new Date(dist.date).toLocaleDateString()}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#22c55e', fontWeight: 600, fontSize: '16px' }}>{formatCurrency(dist.netAmount)}</p>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: dist.status === 'paid' ? '#14532d' : dist.status === 'pending' ? '#422006' : '#334155', color: dist.status === 'paid' ? '#4ade80' : dist.status === 'pending' ? '#fbbf24' : '#94a3b8' }}>
              {dist.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatementsList({ statements }: { statements: Statement[] }) {
  if (statements.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
        <p style={{ fontSize: '32px', marginBottom: '12px' }}>📄</p>
        <p>No statements available yet. Statements are generated monthly.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
      {statements.map(statement => (
        <div key={statement.id} style={{ padding: '16px', background: '#0f172a', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>📄</span>
            <div>
              <p style={{ color: '#f1f5f9', fontWeight: 500, fontSize: '14px' }}>{statement.period}</p>
              <p style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'capitalize' }}>{statement.type} Statement</p>
            </div>
          </div>
          <button style={{ width: '100%', padding: '10px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            Download PDF
          </button>
        </div>
      ))}
    </div>
  );
}

function TaxDocuments({ statements, totalYield, totalCommitted, formatCurrency }: { statements: Statement[]; totalYield: number; totalCommitted: number; formatCurrency: (v: number) => string }) {
  return (
    <div>
      <div style={{ padding: '16px', background: '#422006', border: '1px solid #854d0e', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <p style={{ color: '#fbbf24', fontWeight: 500, marginBottom: '4px' }}>K-1 Schedule Availability</p>
            <p style={{ color: '#fcd34d', fontSize: '13px' }}>
              K-1 schedules are typically available by March 15th each year for the prior tax year.
            </p>
          </div>
        </div>
      </div>

      {statements.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {statements.map(doc => (
            <div key={doc.id} style={{ padding: '16px', background: '#0f172a', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📑</span>
                <div>
                  <p style={{ color: '#f1f5f9', fontWeight: 500, fontSize: '14px' }}>K-1 - {doc.period}</p>
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>Generated {new Date(doc.generatedDate).toLocaleDateString()}</p>
                </div>
              </div>
              <button style={{ width: '100%', padding: '10px', background: '#22c55e', color: '#000', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                Download K-1
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8', marginBottom: '20px' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>📑</p>
          <p>No K-1 documents available yet.</p>
        </div>
      )}

      <div style={{ padding: '16px', background: '#0f172a', borderRadius: '12px' }}>
        <h4 style={{ color: '#f1f5f9', fontWeight: 500, marginBottom: '12px' }}>Tax Information Summary (Estimated)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
          <div><p style={{ color: '#94a3b8', marginBottom: '4px' }}>Ordinary Income</p><p style={{ color: '#f1f5f9', fontWeight: 500 }}>{formatCurrency(totalYield * 0.8)}</p></div>
          <div><p style={{ color: '#94a3b8', marginBottom: '4px' }}>Capital Gains</p><p style={{ color: '#f1f5f9', fontWeight: 500 }}>{formatCurrency(totalYield * 0.2)}</p></div>
          <div><p style={{ color: '#94a3b8', marginBottom: '4px' }}>Depreciation</p><p style={{ color: '#f1f5f9', fontWeight: 500 }}>{formatCurrency(totalCommitted * 0.02)}</p></div>
          <div><p style={{ color: '#94a3b8', marginBottom: '4px' }}>Est. Tax Liability</p><p style={{ color: '#f1f5f9', fontWeight: 500 }}>{formatCurrency(totalYield * 0.25)}</p></div>
        </div>
        <p style={{ color: '#64748b', fontSize: '11px', marginTop: '12px' }}>* These are estimates only. Consult your tax advisor for actual tax implications.</p>
      </div>
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercent = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'treasury': return { bg: '#3b0764', color: '#c084fc' };
      case 'protocol': return { bg: '#1e3a5f', color: '#60a5fa' };
      case 'lending': return { bg: '#14532d', color: '#4ade80' };
      case 'community': return { bg: '#422006', color: '#fbbf24' };
      case 'emergency': return { bg: '#450a0a', color: '#f87171' };
      default: return { bg: '#334155', color: '#94a3b8' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#1e3a5f', color: '#60a5fa' };
      case 'passed': return { bg: '#14532d', color: '#4ade80' };
      case 'rejected': return { bg: '#450a0a', color: '#f87171' };
      case 'executed': return { bg: '#3b0764', color: '#c084fc' };
      default: return { bg: '#334155', color: '#94a3b8' };
    }
  };

  const catColor = getCategoryColor(proposal.category);
  const statColor = getStatusColor(proposal.status);

  return (
    <div style={{ padding: '20px', borderBottom: '1px solid #334155' }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: catColor.bg, color: catColor.color }}>
            {proposal.category}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: statColor.bg, color: statColor.color }}>
            {proposal.status}
          </span>
          {proposal.quorumReached && (
            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, background: '#14532d', color: '#4ade80' }}>
              Quorum Reached
            </span>
          )}
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px' }}>{proposal.title}</h3>
        <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{proposal.description.slice(0, 150)}...</p>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
          <span style={{ color: '#22c55e' }}>For: {forPercent.toFixed(1)}%</span>
          <span style={{ color: '#ef4444' }}>Against: {againstPercent.toFixed(1)}%</span>
        </div>
        <div style={{ height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${forPercent}%`, background: '#22c55e' }} />
          <div style={{ width: `${againstPercent}%`, background: '#ef4444' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
        <span>By {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}</span>
        <span>Ends {new Date(proposal.endDate).toLocaleDateString()}</span>
      </div>

      {proposal.status === 'active' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button style={{ flex: 1, padding: '10px', background: '#14532d', color: '#4ade80', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            Vote For
          </button>
          <button style={{ flex: 1, padding: '10px', background: '#450a0a', color: '#f87171', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            Vote Against
          </button>
          <button style={{ flex: 1, padding: '10px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            Abstain
          </button>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#94a3b8', fontSize: '13px' }}>{label}</span>
      <span style={{ color: '#f1f5f9', fontWeight: 500, fontSize: '13px' }}>{value}</span>
    </div>
  );
}

function RuleItem({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <span style={{ color: '#22c55e' }}>•</span>
      <div>
        <p style={{ color: '#f1f5f9', fontWeight: 500 }}>{title}</p>
        <p style={{ color: '#94a3b8' }}>{description}</p>
      </div>
    </div>
  );
}

function CreateProposalModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [formData, setFormData] = useState({ title: '', category: 'protocol', description: '', discussionUrl: '' });
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9' }}>Create Proposal</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px' }}
              placeholder="Brief, descriptive title"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px' }}
            >
              <option value="protocol">Protocol</option>
              <option value="treasury">Treasury</option>
              <option value="lending">Lending</option>
              <option value="community">Community</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', minHeight: '120px', resize: 'vertical' }}
              placeholder="Detailed description of the proposal..."
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={{ flex: 1, padding: '12px', background: '#22c55e', color: '#000', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>
              {submitting ? 'Creating...' : 'Create Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UnifiedDashboard;
