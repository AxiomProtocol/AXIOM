"use client";

import React from 'react';
import Link from 'next/link';
import { accessTiers } from '../../lib/axiomHolderValue';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';

interface EligibilityCalloutProps {
  currentTier: number;
  isConnected: boolean;
  page?: 'keygrow' | 'holders';
}

export function EligibilityCallout({ currentTier, isConnected, page = 'keygrow' }: EligibilityCalloutProps) {
  const tierData = accessTiers[currentTier] || accessTiers[0];
  const nextTier = accessTiers[Math.min(currentTier + 1, 4)];
  
  const tierColors: Record<number, string> = {
    0: '#6B7280',
    1: web3Theme.colors.primary,
    2: web3Theme.colors.primary,
    3: web3Theme.colors.accent,
    4: web3Theme.colors.secondary
  };

  if (!isConnected) {
    return (
      <div
        style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.08) 0%, rgba(123, 104, 238, 0.05) 100%)',
          borderRadius: web3Theme.radii.lg,
          border: '1px solid rgba(0, 212, 170, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>
              Connect wallet to check eligibility
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              Your tier unlocks participation in land cohorts, produce cycles, and steward programs
            </div>
          </div>
          <Link
            href="/holders"
            style={{
              padding: '10px 20px',
              background: web3Theme.colors.gradientPrimary,
              color: '#FFF',
              borderRadius: web3Theme.radii.md,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
              whiteSpace: 'nowrap'
            }}
          >
            View Holder Benefits
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px 24px',
        background: `linear-gradient(135deg, ${tierColors[currentTier]}10 0%, rgba(123, 104, 238, 0.05) 100%)`,
        borderRadius: web3Theme.radii.lg,
        border: `1px solid ${tierColors[currentTier]}30`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>{tierData.icon}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: tierColors[currentTier],
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Tier {currentTier}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                {tierData.name}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              {currentTier < 4 
                ? `Unlock ${nextTier.name} for more benefits`
                : 'Maximum tier - all benefits unlocked'}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            href="/holders"
            style={{
              padding: '10px 20px',
              background: '#FFF',
              color: tierColors[currentTier],
              border: `2px solid ${tierColors[currentTier]}`,
              borderRadius: web3Theme.radii.md,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
              whiteSpace: 'nowrap'
            }}
          >
            View Benefits
          </Link>
          {currentTier >= 2 && (
            <Link
              href="/produce"
              style={{
                padding: '10px 20px',
                background: web3Theme.colors.gradientPrimary,
                color: '#FFF',
                borderRadius: web3Theme.radii.md,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              Reserve Produce Box
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
