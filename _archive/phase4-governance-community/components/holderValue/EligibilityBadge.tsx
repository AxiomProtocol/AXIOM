"use client";

import React from 'react';
import { accessTiers, calculateTier } from '../../lib/axiomHolderValue';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';

interface EligibilityBadgeProps {
  tier: number;
  compact?: boolean;
  showRequirements?: boolean;
}

export function EligibilityBadge({ tier, compact = false, showRequirements = false }: EligibilityBadgeProps) {
  const tierData = accessTiers[tier] || accessTiers[0];
  
  const tierColors: Record<number, { bg: string; border: string; text: string }> = {
    0: { bg: 'rgba(156, 163, 175, 0.1)', border: 'rgba(156, 163, 175, 0.3)', text: '#6B7280' },
    1: { bg: 'rgba(0, 212, 170, 0.1)', border: 'rgba(0, 212, 170, 0.3)', text: web3Theme.colors.primary },
    2: { bg: 'rgba(0, 212, 170, 0.15)', border: 'rgba(0, 212, 170, 0.4)', text: web3Theme.colors.primary },
    3: { bg: 'rgba(123, 104, 238, 0.1)', border: 'rgba(123, 104, 238, 0.3)', text: web3Theme.colors.accent },
    4: { bg: 'rgba(255, 215, 0, 0.1)', border: 'rgba(255, 215, 0, 0.3)', text: web3Theme.colors.secondary }
  };

  const colors = tierColors[tier] || tierColors[0];

  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: web3Theme.radii.full,
          fontSize: '13px',
          fontWeight: 500,
          color: colors.text
        }}
      >
        <span>{tierData.icon}</span>
        <span>{tierData.name}</span>
      </span>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: web3Theme.radii.lg
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>{tierData.icon}</span>
        <div>
          <div style={{ fontWeight: 600, color: colors.text, fontSize: '16px' }}>
            Tier {tier}: {tierData.name}
          </div>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            {tierData.description}
          </div>
        </div>
      </div>
      
      {showRequirements && (
        <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginBottom: '6px' }}>
            Requirements
          </div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: '#4B5563' }}>
            {tierData.requirements.map((req, i) => (
              <li key={i} style={{ marginBottom: '2px' }}>{req}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
