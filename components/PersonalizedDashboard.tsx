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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          color: '#1F2937',
          marginBottom: '8px'
        }}>
          {greeting}
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280' }}>
          Here's what's happening in your Axiom community today.
        </p>
      </div>

      {shouldShowTutorials() && (
        <div style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <span style={{ fontSize: '32px' }}>💡</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#3730A3', marginBottom: '4px' }}>
              Getting Started Tip
            </h3>
            <p style={{ fontSize: '14px', color: '#4338CA', margin: 0 }}>
              {preferences.interests.includes('land') 
                ? 'Check out the Land Stewardship page to see active community campaigns and contribute to land acquisition.'
                : preferences.interests.includes('susu')
                ? 'Join a SUSU savings circle to start building wealth together with your community.'
                : 'Explore the features you selected during onboarding to get started with your journey.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/learn')}
            style={{
              padding: '10px 20px',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Learn More
          </button>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {overallStats.map((stat, index) => (
          <div
            key={index}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #E5E7EB'
            }}
          >
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              {stat.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#1F2937' }}>
                {stat.value}
              </span>
              {stat.change && (
                <span style={{ 
                  fontSize: '12px', 
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

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#1F2937',
          marginBottom: '16px'
        }}>
          Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => router.push(action.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                background: 'white',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151'
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

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#1F2937',
          marginBottom: '16px'
        }}>
          Your Interests
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {widgets.map((widget) => (
            <div
              key={widget.id}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${widget.interest.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  {widget.interest.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                    {widget.interest.label}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                    {widget.interest.description}
                  </p>
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '12px',
                marginBottom: '16px'
              }}>
                {widget.stats.map((stat, idx) => (
                  <div key={idx} style={{
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    padding: '12px'
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
      padding: '24px'
    }}>
      <h3 style={{ 
        fontSize: '16px', 
        fontWeight: 600, 
        color: '#92400E',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>✨</span> You might also like
      </h3>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {suggestions.map(suggestion => (
          <button
            key={suggestion.id}
            onClick={() => onExplore(suggestion.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              cursor: 'pointer',
              flex: '1',
              minWidth: '250px',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: '28px' }}>{suggestion.icon}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                {suggestion.label}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
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
