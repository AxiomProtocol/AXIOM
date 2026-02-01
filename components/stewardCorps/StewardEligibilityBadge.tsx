"use client";

import React from 'react';
import { eligibilityRules, EligibilityRule } from '../../lib/stewardCorps';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';

interface StewardEligibilityBadgeProps {
  checks: { ruleId: string; passed: boolean }[];
  compact?: boolean;
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function StewardEligibilityBadge({ checks, compact = false }: StewardEligibilityBadgeProps) {
  const allPassed = checks.every(c => c.passed);
  const passedCount = checks.filter(c => c.passed).length;

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        background: allPassed 
          ? 'rgba(16, 185, 129, 0.1)' 
          : 'rgba(245, 158, 11, 0.1)',
        borderRadius: web3Theme.radii.full,
        fontSize: '13px',
        fontWeight: 500,
        color: allPassed ? '#10B981' : '#F59E0B'
      }}>
        {allPassed ? (
          <>
            <CheckIcon /> Eligible
          </>
        ) : (
          <>
            {passedCount}/{checks.length} Requirements
          </>
        )}
      </div>
    );
  }

  const getRuleById = (id: string): EligibilityRule | undefined => 
    eligibilityRules.find(r => r.id === id);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: web3Theme.radii.lg,
      padding: '20px',
      boxShadow: web3Theme.shadows.card
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h4 style={{ 
          fontSize: '14px', 
          fontWeight: 600, 
          color: '#1F2937',
          margin: 0
        }}>
          Eligibility Status
        </h4>
        <div style={{
          padding: '4px 10px',
          background: allPassed 
            ? 'rgba(16, 185, 129, 0.1)' 
            : 'rgba(245, 158, 11, 0.1)',
          borderRadius: web3Theme.radii.full,
          fontSize: '12px',
          fontWeight: 600,
          color: allPassed ? '#10B981' : '#F59E0B'
        }}>
          {allPassed ? 'Eligible' : `${passedCount}/${checks.length} Met`}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {checks.map(check => {
          const rule = getRuleById(check.ruleId);
          if (!rule) return null;

          return (
            <div 
              key={check.ruleId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: check.passed 
                  ? 'rgba(16, 185, 129, 0.05)' 
                  : 'rgba(239, 68, 68, 0.05)',
                borderRadius: web3Theme.radii.md,
                border: `1px solid ${check.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: check.passed ? '#10B981' : '#EF4444',
                color: '#FFFFFF'
              }}>
                {check.passed ? <CheckIcon /> : <XIcon />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: 500, 
                  color: '#1F2937'
                }}>
                  {rule.label}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6B7280'
                }}>
                  {rule.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
