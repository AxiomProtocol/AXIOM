"use client";

import React from 'react';
import { AccessTier } from '../../lib/axiomHolderValue';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../axiomRebuild/ImmersiveCard';

interface AccessTierCardProps {
  tier: AccessTier;
  currentTier: number;
  onSelect?: () => void;
}

export function AccessTierCard({ tier, currentTier, onSelect }: AccessTierCardProps) {
  const isActive = tier.tier === currentTier;
  const isUnlocked = tier.tier <= currentTier;
  
  const tierColors: Record<number, string> = {
    0: '#6B7280',
    1: web3Theme.colors.primary,
    2: web3Theme.colors.primary,
    3: web3Theme.colors.accent,
    4: web3Theme.colors.secondary
  };

  const accentColor = tierColors[tier.tier] || tierColors[0];

  return (
    <ImmersiveCard 
      variant={isActive ? 'glow' : 'glass'} 
      glowColor={`${accentColor}33`}
      hover3D={true}
    >
      <div style={{ position: 'relative' }}>
        {isActive && (
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              padding: '4px 10px',
              background: accentColor,
              borderRadius: web3Theme.radii.full,
              fontSize: '11px',
              fontWeight: 600,
              color: '#FFFFFF'
            }}
          >
            Current
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${accentColor}15`,
              borderRadius: web3Theme.radii.md,
              fontSize: '24px',
              opacity: isUnlocked ? 1 : 0.5
            }}
          >
            {tier.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: accentColor, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              marginBottom: '4px'
            }}>
              Tier {tier.tier}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937' }}>
              {tier.name}
            </div>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px', lineHeight: 1.5 }}>
          {tier.description}
        </p>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginBottom: '8px' }}>
            Requirements
          </div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: '#4B5563' }}>
            {tier.requirements.map((req, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{req}</li>
            ))}
          </ul>
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginBottom: '8px' }}>
            Benefits
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {tier.benefits.map((benefit, i) => (
              <li 
                key={i} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '13px', 
                  color: isUnlocked ? '#1F2937' : '#9CA3AF',
                  marginBottom: '6px'
                }}
              >
                <span style={{ color: isUnlocked ? accentColor : '#D1D5DB' }}>
                  {isUnlocked ? '✓' : '○'}
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {!isUnlocked && (
          <div 
            style={{ 
              marginTop: '16px', 
              padding: '10px', 
              background: 'rgba(156, 163, 175, 0.1)', 
              borderRadius: web3Theme.radii.sm,
              fontSize: '12px',
              color: '#6B7280',
              textAlign: 'center'
            }}
          >
            🔒 Locked - Meet requirements to unlock
          </div>
        )}
      </div>
    </ImmersiveCard>
  );
}
