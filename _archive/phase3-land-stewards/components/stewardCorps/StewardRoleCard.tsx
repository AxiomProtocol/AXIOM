"use client";

import React from 'react';
import { StewardRole } from '../../lib/stewardCorps';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../axiomRebuild/ImmersiveCard';

interface StewardRoleCardProps {
  role: StewardRole;
  isFilled?: boolean;
}

const roleIcons: Record<string, string> = {
  coordinator: '🛡️',
  lead: '⚔️',
  council: '👑'
};

export function StewardRoleCard({ role, isFilled = false }: StewardRoleCardProps) {
  return (
    <ImmersiveCard variant="glass" hover3D={true}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isFilled 
              ? 'rgba(107, 114, 128, 0.1)' 
              : `${web3Theme.colors.primary}15`,
            borderRadius: web3Theme.radii.md,
            fontSize: '24px',
            opacity: isFilled ? 0.6 : 1
          }}
        >
          {roleIcons[role.type] || '🛡️'}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '4px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: '#1F2937',
              margin: 0
            }}>
              {role.title}
            </h3>
            {isFilled && (
              <span style={{
                padding: '2px 8px',
                background: 'rgba(107, 114, 128, 0.1)',
                color: '#6B7280',
                borderRadius: web3Theme.radii.full,
                fontSize: '11px',
                fontWeight: 500
              }}>
                Role Filled
              </span>
            )}
          </div>
          
          <p style={{ 
            fontSize: '14px', 
            color: '#6B7280',
            margin: '0 0 8px 0'
          }}>
            {role.description}
          </p>
          
          <div style={{
            fontSize: '12px',
            color: web3Theme.colors.primary,
            fontWeight: 500
          }}>
            Ratio: {role.ratio}
          </div>
        </div>
      </div>
    </ImmersiveCard>
  );
}
