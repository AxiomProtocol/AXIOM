"use client";

import React from 'react';
import { ProduceCycle } from '../../lib/axiomHolderValue';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../axiomRebuild/ImmersiveCard';
import { ctaLabels } from '../../lib/axiomHolderValue';

interface ProduceCycleCardProps {
  cycle: ProduceCycle;
  userCredits: number;
  onReserve: (cycleId: string) => Promise<void>;
  isConnected: boolean;
}

export function ProduceCycleCard({ cycle, userCredits, onReserve, isConnected }: ProduceCycleCardProps) {
  const [loading, setLoading] = React.useState(false);
  const [reserved, setReserved] = React.useState(false);
  
  const canAfford = userCredits >= cycle.creditsRequired;
  const slotsAvailable = cycle.totalSlots - cycle.reservedSlots;
  const fillPercentage = (cycle.reservedSlots / cycle.totalSlots) * 100;
  
  const statusColors: Record<string, { bg: string; text: string }> = {
    upcoming: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
    active: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
    completed: { bg: 'rgba(156, 163, 175, 0.1)', text: '#6B7280' }
  };

  const seasonIcons: Record<string, string> = {
    Spring: '🌸',
    Summer: '☀️',
    Fall: '🍂',
    Winter: '❄️'
  };

  const handleReserve = async () => {
    if (!isConnected || !canAfford || loading || reserved || slotsAvailable <= 0) return;
    
    setLoading(true);
    try {
      await onReserve(cycle.id);
      setReserved(true);
    } catch (err) {
      console.error('Reservation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImmersiveCard variant="glass" hover3D={true}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>{seasonIcons[cycle.season] || '🌱'}</span>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
              {cycle.name}
            </h3>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
              {cycle.startDate} - {cycle.endDate}
            </p>
          </div>
        </div>
        <span
          style={{
            padding: '4px 10px',
            background: statusColors[cycle.status].bg,
            color: statusColors[cycle.status].text,
            borderRadius: web3Theme.radii.full,
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'capitalize'
          }}
        >
          {cycle.status}
        </span>
      </div>

      <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '16px', lineHeight: 1.5 }}>
        {cycle.description}
      </p>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
          <span style={{ color: '#6B7280' }}>Slots Reserved</span>
          <span style={{ fontWeight: 600, color: slotsAvailable > 0 ? '#1F2937' : '#EF4444' }}>
            {cycle.reservedSlots} / {cycle.totalSlots}
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
            background: slotsAvailable > 0 ? web3Theme.colors.gradientPrimary : '#EF4444',
            borderRadius: web3Theme.radii.full
          }} />
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '12px', 
        background: 'rgba(0,0,0,0.03)', 
        borderRadius: web3Theme.radii.sm,
        marginBottom: '16px'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Credits Required</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: web3Theme.colors.primary }}>
            {cycle.creditsRequired}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Your Credits</div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: canAfford ? '#10B981' : '#EF4444' 
          }}>
            {userCredits}
          </div>
        </div>
      </div>

      <button
        onClick={handleReserve}
        disabled={!isConnected || !canAfford || loading || reserved || slotsAvailable <= 0}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: reserved 
            ? '#10B981' 
            : (isConnected && canAfford && slotsAvailable > 0)
              ? web3Theme.colors.gradientPrimary 
              : 'rgba(156, 163, 175, 0.3)',
          border: 'none',
          borderRadius: web3Theme.radii.md,
          fontSize: '15px',
          fontWeight: 600,
          color: (isConnected && canAfford && slotsAvailable > 0) || reserved ? '#FFFFFF' : '#9CA3AF',
          cursor: (isConnected && canAfford && !loading && !reserved && slotsAvailable > 0) ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease'
        }}
      >
        {reserved 
          ? 'Reserved!' 
          : loading 
            ? 'Processing...' 
            : !isConnected 
              ? ctaLabels.connectWallet
              : slotsAvailable <= 0
                ? 'Fully Reserved'
                : !canAfford 
                  ? 'Insufficient Credits' 
                  : ctaLabels.reserveSlot}
      </button>
    </ImmersiveCard>
  );
}
