"use client";

import React from 'react';
import { probationCriteria, ProbationCriterion } from '../../lib/stewardCorps';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../axiomRebuild/ImmersiveCard';

interface MetricProgress {
  criterionId: string;
  value: number;
  target: number;
}

interface StewardMetricsPanelProps {
  metrics?: MetricProgress[];
  daysProbation?: number;
  totalProbationDays?: number;
}

export function StewardMetricsPanel({ 
  metrics = [], 
  daysProbation = 0,
  totalProbationDays = 90
}: StewardMetricsPanelProps) {
  const getCriterionById = (id: string): ProbationCriterion | undefined =>
    probationCriteria.find(c => c.id === id);

  const probationProgress = Math.min((daysProbation / totalProbationDays) * 100, 100);

  const defaultMetrics: MetricProgress[] = probationCriteria.map(c => ({
    criterionId: c.id,
    value: 0,
    target: 100
  }));

  const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics;

  return (
    <ImmersiveCard variant="glass" hover3D={false}>
      <h3 style={{ 
        fontSize: '16px', 
        fontWeight: 600, 
        color: '#1F2937',
        margin: '0 0 20px 0'
      }}>
        Probation Progress
      </h3>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>
            Time in Probation
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: web3Theme.colors.primary }}>
            {daysProbation} / {totalProbationDays} days
          </span>
        </div>
        <div style={{
          height: '8px',
          background: 'rgba(0,0,0,0.06)',
          borderRadius: web3Theme.radii.full,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${probationProgress}%`,
            background: `linear-gradient(90deg, ${web3Theme.colors.primary}, ${web3Theme.colors.accent})`,
            borderRadius: web3Theme.radii.full,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayMetrics.map(metric => {
          const criterion = getCriterionById(metric.criterionId);
          if (!criterion) return null;

          const progress = Math.min((metric.value / metric.target) * 100, 100);
          const isComplete = progress >= 100;

          return (
            <div key={metric.criterionId}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#1F2937'
                  }}>
                    {criterion.label}
                  </span>
                  {isComplete && (
                    <span style={{
                      padding: '1px 6px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#10B981',
                      borderRadius: web3Theme.radii.full,
                      fontSize: '10px',
                      fontWeight: 600
                    }}>
                      Complete
                    </span>
                  )}
                </div>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#6B7280'
                }}>
                  {metric.value}/{metric.target}
                </span>
              </div>
              <div style={{
                height: '6px',
                background: 'rgba(0,0,0,0.04)',
                borderRadius: web3Theme.radii.full,
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: isComplete ? '#10B981' : web3Theme.colors.accent,
                  borderRadius: web3Theme.radii.full,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <p style={{
                fontSize: '11px',
                color: '#9CA3AF',
                margin: '4px 0 0 0'
              }}>
                {criterion.description}
              </p>
            </div>
          );
        })}
      </div>
    </ImmersiveCard>
  );
}
