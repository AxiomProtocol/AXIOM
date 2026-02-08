"use client";

import React from 'react';
import { StewardStatus, getStewardStatusLabel, getStewardStatusColor } from '../../lib/stewardCorps';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';

interface StewardStatusIndicatorProps {
  status: StewardStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StewardStatusIndicator({ 
  status, 
  showLabel = true,
  size = 'md' 
}: StewardStatusIndicatorProps) {
  const { bg, text } = getStewardStatusColor(status);
  const label = getStewardStatusLabel(status);

  const sizeStyles = {
    sm: { padding: '2px 8px', fontSize: '11px', dotSize: 6 },
    md: { padding: '4px 12px', fontSize: '13px', dotSize: 8 },
    lg: { padding: '6px 16px', fontSize: '14px', dotSize: 10 }
  };

  const { padding, fontSize, dotSize } = sizeStyles[size];

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding,
      background: bg,
      borderRadius: web3Theme.radii.full,
      fontSize,
      fontWeight: 500,
      color: text
    }}>
      <div style={{
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        background: text,
        animation: status === 'probationary' ? 'pulse 2s infinite' : undefined
      }} />
      {showLabel && label}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
