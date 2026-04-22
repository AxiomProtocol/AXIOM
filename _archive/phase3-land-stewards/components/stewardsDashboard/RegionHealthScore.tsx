import React from 'react';

type HealthStatus = 'onTrack' | 'atRisk' | 'blocked';

interface RegionHealthScoreProps {
  regionName: string;
  status: HealthStatus;
  metrics?: {
    dropCompletion?: number;
    participantGrowth?: number;
    taskCompletion?: number;
    reportSubmission?: number;
  };
}

export function RegionHealthScore({ regionName, status, metrics }: RegionHealthScoreProps) {
  const statusConfig = {
    onTrack: { color: '#00D4AA', bg: 'rgba(0,212,170,0.1)', label: 'On Track', icon: '✓' },
    atRisk: { color: '#FFB800', bg: 'rgba(255,184,0,0.1)', label: 'At Risk', icon: '⚠' },
    blocked: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.1)', label: 'Blocked', icon: '✗' }
  };

  const config = statusConfig[status];

  const renderMetricBar = (label: string, value: number) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#666' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a2e' }}>{value}%</span>
      </div>
      <div style={{
        height: '6px',
        background: 'rgba(0,0,0,0.06)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          background: value >= 80 ? '#00D4AA' : value >= 50 ? '#FFB800' : '#FF6B6B',
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: '#1a1a2e' }}>
            {regionName}
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Region Health</p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          background: config.bg,
          color: config.color,
          fontSize: '13px',
          fontWeight: 600
        }}>
          <span>{config.icon}</span>
          <span>{config.label}</span>
        </div>
      </div>

      {metrics && (
        <div>
          {metrics.dropCompletion !== undefined && renderMetricBar('Drop Completion', metrics.dropCompletion)}
          {metrics.participantGrowth !== undefined && renderMetricBar('Participant Growth', metrics.participantGrowth)}
          {metrics.taskCompletion !== undefined && renderMetricBar('Task Completion', metrics.taskCompletion)}
          {metrics.reportSubmission !== undefined && renderMetricBar('Report Submission', metrics.reportSubmission)}
        </div>
      )}
    </div>
  );
}

export default RegionHealthScore;
