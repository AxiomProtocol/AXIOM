"use client";

import React, { useState } from 'react';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../axiomRebuild/ImmersiveCard';
import { ctaLabels } from '../../lib/axiomHolderValue';
import { trackOnce, track } from '../axiomRebuild/analytics';

interface ParticipationQueueCardProps {
  title: string;
  description: string;
  icon: string;
  queueType: 'land-cohort' | 'produce-box' | 'steward-cohort';
  totalSlots?: number;
  filledSlots?: number;
  minTierRequired: number;
  currentTier: number;
  isConnected: boolean;
  onAction: () => Promise<void>;
  page?: string;
}

export function ParticipationQueueCard({
  title,
  description,
  icon,
  queueType,
  totalSlots,
  filledSlots,
  minTierRequired,
  currentTier,
  isConnected,
  onAction,
  page = 'holders'
}: ParticipationQueueCardProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const isEligible = currentTier >= minTierRequired;
  const canAct = isConnected && isEligible;
  
  const slotsAvailable = totalSlots && filledSlots !== undefined ? totalSlots - filledSlots : null;
  const fillPercentage = totalSlots && filledSlots !== undefined ? (filledSlots / totalSlots) * 100 : 0;

  const handleAction = async () => {
    if (!canAct || loading) return;
    
    setLoading(true);
    track('queue_action_attempt', { queueType, page });
    
    try {
      await onAction();
      setStatus('success');
      track('queue_action_success', { queueType, page });
    } catch (err) {
      setStatus('error');
      console.error('Queue action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getButtonLabel = () => {
    if (!isConnected) return ctaLabels.connectWallet;
    if (!isEligible) return `Tier ${minTierRequired}+ Required`;
    if (loading) return 'Processing...';
    if (status === 'success') return 'Reserved!';
    
    switch (queueType) {
      case 'land-cohort': return ctaLabels.expressInterest;
      case 'produce-box': return ctaLabels.reserveSlot;
      case 'steward-cohort': return ctaLabels.joinWaitlist;
      default: return ctaLabels.expressInterest;
    }
  };

  return (
    <ImmersiveCard variant="glass" hover3D={true}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${web3Theme.colors.primary}15`,
            borderRadius: web3Theme.radii.lg,
            fontSize: '28px'
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
            {title}
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            {description}
          </p>
        </div>
      </div>

      {totalSlots && slotsAvailable !== null && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: '#6B7280' }}>Available Slots</span>
            <span style={{ fontWeight: 600, color: slotsAvailable > 0 ? web3Theme.colors.primary : '#EF4444' }}>
              {slotsAvailable} / {totalSlots}
            </span>
          </div>
          <div style={{ 
            height: '6px', 
            background: 'rgba(0,0,0,0.06)', 
            borderRadius: web3Theme.radii.full,
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${fillPercentage}%`, 
              height: '100%', 
              background: web3Theme.colors.gradientPrimary,
              borderRadius: web3Theme.radii.full,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {!isEligible && (
        <div 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: web3Theme.radii.sm,
            marginBottom: '16px'
          }}
        >
          <span>⚠️</span>
          <span style={{ fontSize: '13px', color: '#92400E' }}>
            Requires Tier {minTierRequired} ({['Visitor', 'Holder', 'Participant', 'Steward', 'Founding Steward'][minTierRequired]})
          </span>
        </div>
      )}

      <button
        onClick={handleAction}
        disabled={!canAct || loading || status === 'success'}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: canAct && status !== 'success' 
            ? web3Theme.colors.gradientPrimary 
            : status === 'success' 
              ? '#10B981' 
              : 'rgba(156, 163, 175, 0.3)',
          border: 'none',
          borderRadius: web3Theme.radii.md,
          fontSize: '15px',
          fontWeight: 600,
          color: canAct || status === 'success' ? '#FFFFFF' : '#9CA3AF',
          cursor: canAct && status !== 'success' ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease'
        }}
      >
        {getButtonLabel()}
      </button>

      {status === 'success' && (
        <p style={{ fontSize: '12px', color: '#10B981', textAlign: 'center', marginTop: '10px' }}>
          Your interest has been recorded. We'll notify you when spots become available.
        </p>
      )}
    </ImmersiveCard>
  );
}
