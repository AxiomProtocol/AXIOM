import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { usePersonalization, INTEREST_CONFIGS, InterestConfig } from '../lib/usePersonalization';

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

export function PersonalizedDashboard() {
  const router = useRouter();
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

  useEffect(() => {
    if (!isLoading && preferences.onboardingComplete) {
      loadDashboardData();
    }
  }, [isLoading, preferences]);

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
      console.log('Using default stats');
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
      land: [
        { label: 'Active Campaigns', value: '3' },
        { label: 'Your Contributions', value: '$0' }
      ],
      keygrow: [
        { label: 'Available Properties', value: '12' },
        { label: 'Ownership Progress', value: '0%' }
      ],
      susu: [
        { label: 'Active Circles', value: '8' },
        { label: 'Your Savings', value: '$0' }
      ],
      governance: [
        { label: 'Open Proposals', value: '5' },
        { label: 'Your Voting Power', value: '0 AXM' }
      ],
      training: [
        { label: 'Available Courses', value: '12' },
        { label: 'Your Progress', value: '0%' }
      ],
      staking: [
        { label: 'Current APY', value: '12.5%' },
        { label: 'Your Staked', value: '0 AXM' }
      ],
      transparency: [
        { label: 'Treasury Balance', value: '$1.2M' },
        { label: 'Last Update', value: 'Today' }
      ],
      nodes: [
        { label: 'Active Nodes', value: '47' },
        { label: 'Your Nodes', value: '0' }
      ]
    };
    return statsMap[interestId] || [];
  };

  const quickActions = getQuickActions();
  const greeting = getPersonalizedGreeting();

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

  return (
    <div className="personalized-dashboard" style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      <style>{`
        .personalized-dashboard {
          padding: 16px;
        }
        @media (min-width: 768px) {
          .personalized-dashboard {
            padding: 24px;
          }
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }
        .tip-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (min-width: 768px) {
          .tip-card {
            flex-direction: row;
            align-items: center;
            gap: 16px;
          }
        }
        .tip-button {
          width: 100%;
        }
        @media (min-width: 768px) {
          .tip-button {
            width: auto;
          }
        }
        .greeting-title {
          font-size: 22px;
        }
        @media (min-width: 768px) {
          .greeting-title {
            font-size: 28px;
          }
        }
        .stat-value {
          font-size: 20px;
        }
        @media (min-width: 768px) {
          .stat-value {
            font-size: 24px;
          }
        }
        .stat-label {
          font-size: 12px;
        }
        @media (min-width: 768px) {
          .stat-label {
            font-size: 14px;
          }
        }
        .quick-actions-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @media (min-width: 768px) {
          .quick-actions-grid {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 12px;
          }
          .quick-actions-grid .quick-action-btn {
            width: auto;
          }
        }
        .interests-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .interests-grid {
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
          }
        }
        .suggestions-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (min-width: 768px) {
          .suggestions-grid {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 16px;
          }
        }
      `}</style>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="greeting-title" style={{ 
          fontWeight: 700, 
          color: '#1F2937',
          marginBottom: '8px'
        }}>
          {greeting}
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Here's what's happening in your Axiom community today.
        </p>
      </div>

      {shouldShowTutorials() && (
        <div className="tip-card" style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
            <span style={{ fontSize: '28px' }}>💡</span>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#3730A3', marginBottom: '4px' }}>
                Getting Started Tip
              </h3>
              <p style={{ fontSize: '13px', color: '#4338CA', margin: 0, lineHeight: 1.5 }}>
                {preferences.interests.includes('land') 
                  ? 'Check out the Land Stewardship page to see active community campaigns and contribute to land acquisition.'
                  : preferences.interests.includes('susu')
                  ? 'Join The Wealth Practice to start coordinating capital together with your community.'
                  : 'Explore the features you selected during onboarding to get started with your journey.'}
              </p>
            </div>
          </div>
          <button
            className="tip-button"
            onClick={() => router.push('/learn')}
            style={{
              padding: '10px 20px',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Learn More
          </button>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {overallStats.map((stat, index) => (
          <div
            key={index}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid #E5E7EB'
            }}
          >
            <div className="stat-label" style={{ color: '#6B7280', marginBottom: '6px' }}>
              {stat.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
              <span className="stat-value" style={{ fontWeight: 700, color: '#1F2937' }}>
                {stat.value}
              </span>
              {stat.change && (
                <span style={{ 
                  fontSize: '11px', 
                  color: stat.positive ? '#059669' : '#DC2626',
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
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: '#1F2937',
          marginBottom: '12px'
        }}>
          Quick Actions
        </h2>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => router.push(action.path)}
              className="quick-action-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: 'white',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                width: '100%',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#00A389';
                e.currentTarget.style.background = '#F0FDF4';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.background = 'white';
              }}
            >
              <span style={{ fontSize: '20px' }}>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: '#1F2937',
          marginBottom: '12px'
        }}>
          Your Interests
        </h2>
        <div className="interests-grid">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid #E5E7EB',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onClick={() => router.push(widget.interest.path)}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: `${widget.interest.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0
                }}>
                  {widget.interest.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                    {widget.interest.label}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {widget.interest.description}
                  </p>
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '10px',
                marginBottom: '14px'
              }}>
                {widget.stats.map((stat, idx) => (
                  <div key={idx} style={{
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    padding: '10px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937' }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <button
                style={{
                  width: '100%',
                  padding: '12px',
                  background: widget.interest.color,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {widget.cta.label} →
              </button>
            </div>
          ))}
        </div>
      </div>

      {preferences.interests.length > 0 && (
        <SuggestedFeatures 
          currentInterests={preferences.interests} 
          onExplore={(path) => router.push(path)}
        />
      )}
    </div>
  );
}

function SuggestedFeatures({ 
  currentInterests, 
  onExplore 
}: { 
  currentInterests: string[]; 
  onExplore: (path: string) => void;
}) {
  const suggestions = Object.values(INTEREST_CONFIGS)
    .filter(config => !currentInterests.includes(config.id))
    .slice(0, 2);

  if (suggestions.length === 0) return null;

  return (
    <div style={{
      background: '#FFFBEB',
      border: '1px solid #FDE68A',
      borderRadius: '16px',
      padding: '16px'
    }}>
      <h3 style={{ 
        fontSize: '15px', 
        fontWeight: 600, 
        color: '#92400E',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>✨</span> You might also like
      </h3>
      <div className="suggestions-grid">
        {suggestions.map(suggestion => (
          <button
            key={suggestion.id}
            onClick={() => onExplore(suggestion.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: '24px' }}>{suggestion.icon}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                {suggestion.label}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {suggestion.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default PersonalizedDashboard;
