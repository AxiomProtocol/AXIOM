"use client";

import React from 'react';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../axiomRebuild/ImmersiveCard';

interface PartnerCardProps {
  type: string;
  icon: string;
  description: string;
  benefits: string[];
  minTierRequired?: number;
  currentTier?: number;
}

export function PartnerCard({ 
  type, 
  icon, 
  description, 
  benefits, 
  minTierRequired = 1,
  currentTier = 0 
}: PartnerCardProps) {
  const isAccessible = currentTier >= minTierRequired;

  return (
    <ImmersiveCard variant="glass" hover3D={true}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${web3Theme.colors.primary}10`,
            borderRadius: web3Theme.radii.lg,
            fontSize: '28px',
            opacity: isAccessible ? 1 : 0.5
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#1F2937', 
            margin: 0,
            opacity: isAccessible ? 1 : 0.7
          }}>
            {type}
          </h3>
          {!isAccessible && (
            <span 
              style={{ 
                display: 'inline-block',
                marginTop: '4px',
                padding: '2px 8px',
                background: 'rgba(251, 191, 36, 0.15)',
                borderRadius: web3Theme.radii.sm,
                fontSize: '11px',
                color: '#92400E'
              }}
            >
              Tier {minTierRequired}+ Required
            </span>
          )}
        </div>
      </div>

      <p style={{ 
        fontSize: '14px', 
        color: '#6B7280', 
        marginBottom: '16px', 
        lineHeight: 1.5,
        opacity: isAccessible ? 1 : 0.7
      }}>
        {description}
      </p>

      <div>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginBottom: '8px' }}>
          Partner Benefits
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {benefits.map((benefit, i) => (
            <li 
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: isAccessible ? '#1F2937' : '#9CA3AF',
                marginBottom: '6px'
              }}
            >
              <span style={{ color: isAccessible ? web3Theme.colors.primary : '#D1D5DB' }}>
                {isAccessible ? '✓' : '○'}
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {!isAccessible && (
        <div 
          style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'rgba(0,0,0,0.03)', 
            borderRadius: web3Theme.radii.sm,
            textAlign: 'center'
          }}
        >
          <span style={{ fontSize: '13px', color: '#6B7280' }}>
            🔒 Upgrade to Tier {minTierRequired} to access partner network
          </span>
        </div>
      )}
    </ImmersiveCard>
  );
}
