import React from 'react';

interface ReputationMetrics {
  reliabilityScore: number;
  responsivenessScore: number;
  landQualityScore: number;
  reportingScore: number;
  compositeScore: number;
}

interface Unlock {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  requiredScore: number;
}

interface ReputationPanelProps {
  metrics: ReputationMetrics;
  status: 'applicant' | 'probationary' | 'active' | 'atRisk';
  unlocks: Unlock[];
  probationDaysRemaining?: number;
}

export function ReputationPanel({ metrics, status, unlocks, probationDaysRemaining }: ReputationPanelProps) {
  const statusConfig = {
    applicant: { color: '#666', bg: 'rgba(102,102,102,0.1)', label: 'Applicant' },
    probationary: { color: '#FFB800', bg: 'rgba(255,184,0,0.1)', label: 'Probationary' },
    active: { color: '#00D4AA', bg: 'rgba(0,212,170,0.1)', label: 'Active' },
    atRisk: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.1)', label: 'At Risk' }
  };

  const config = statusConfig[status];

  const scoreCategories = [
    { key: 'reliabilityScore', label: 'Reliability', description: 'Drop completion rate' },
    { key: 'responsivenessScore', label: 'Responsiveness', description: 'Response time SLA' },
    { key: 'landQualityScore', label: 'Land Quality', description: 'Qualified lead ratio' },
    { key: 'reportingScore', label: 'Reporting', description: 'Weekly report submission' }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#00D4AA';
    if (score >= 50) return '#FFB800';
    return '#FF6B6B';
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(0,212,170,0.05) 0%, rgba(123,104,238,0.05) 100%)',
        borderBottom: '1px solid rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: '#1a1a2e' }}>
              Steward Reputation
            </h3>
            <span style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              background: config.bg,
              color: config.color
            }}>
              {config.label}
              {status === 'probationary' && probationDaysRemaining !== undefined && (
                <span> - {probationDaysRemaining} days remaining</span>
              )}
            </span>
          </div>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: `conic-gradient(${getScoreColor(metrics.compositeScore)} ${metrics.compositeScore * 3.6}deg, rgba(0,0,0,0.06) 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e' }}>
                {metrics.compositeScore}
              </span>
              <span style={{ fontSize: '10px', color: '#666' }}>Score</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {scoreCategories.map(cat => {
            const score = metrics[cat.key as keyof ReputationMetrics];
            return (
              <div key={cat.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>{cat.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: getScoreColor(score) }}>
                    {score}
                  </span>
                </div>
                <div style={{
                  height: '6px',
                  background: 'rgba(0,0,0,0.06)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${score}%`,
                    background: getScoreColor(score),
                    borderRadius: '3px'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}>
          Unlocks
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {unlocks.map(unlock => (
            <div
              key={unlock.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: unlock.unlocked ? 'rgba(0,212,170,0.08)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${unlock.unlocked ? 'rgba(0,212,170,0.2)' : 'rgba(0,0,0,0.04)'}`
              }}
            >
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: unlock.unlocked ? '#00D4AA' : 'rgba(0,0,0,0.1)',
                color: unlock.unlocked ? '#fff' : '#999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}>
                {unlock.unlocked ? '✓' : '🔒'}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  fontWeight: 500,
                  color: unlock.unlocked ? '#1a1a2e' : '#666'
                }}>
                  {unlock.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#999' }}>
                  {unlock.description}
                </p>
              </div>
              {!unlock.unlocked && (
                <span style={{ fontSize: '10px', color: '#999' }}>
                  {unlock.requiredScore} pts
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReputationPanel;
