import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

function MetricCard({ label, value, change, changeType = 'neutral', icon }: MetricCardProps) {
  const changeColors = {
    positive: '#00D4AA',
    negative: '#FF6B6B',
    neutral: '#666'
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 4px', color: '#666', fontSize: '13px' }}>{label}</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }}>{value}</p>
          {change && (
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: changeColors[changeType] }}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <span style={{ fontSize: '24px', opacity: 0.6 }}>{icon}</span>
        )}
      </div>
    </div>
  );
}

interface OverviewCardsProps {
  metrics: {
    nextDrop?: { date: string; reservations: number; capacity: number };
    openTasks?: { due: number; overdue: number };
    participants?: { total: number; newThisWeek: number };
    landLeads?: { total: number; qualified: number };
  };
}

export function OverviewCards({ metrics }: OverviewCardsProps) {
  const { nextDrop, openTasks, participants, landLeads } = metrics;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {nextDrop && (
        <MetricCard
          label="Next Drop"
          value={nextDrop.date}
          change={`${nextDrop.reservations}/${nextDrop.capacity} reserved`}
          changeType="neutral"
          icon="📦"
        />
      )}
      {openTasks && (
        <MetricCard
          label="Open Tasks"
          value={openTasks.due + openTasks.overdue}
          change={openTasks.overdue > 0 ? `${openTasks.overdue} overdue` : 'All on track'}
          changeType={openTasks.overdue > 0 ? 'negative' : 'positive'}
          icon="✓"
        />
      )}
      {participants && (
        <MetricCard
          label="Participants"
          value={participants.total}
          change={`+${participants.newThisWeek} this week`}
          changeType="positive"
          icon="👥"
        />
      )}
      {landLeads && (
        <MetricCard
          label="Land Leads"
          value={landLeads.total}
          change={`${landLeads.qualified} qualified`}
          changeType="neutral"
          icon="🌱"
        />
      )}
    </div>
  );
}

export default OverviewCards;
