"use client";

import React from 'react';
import { stewardReputationCopy, calculateReputationLevel } from '../../lib/axiomHolderValue';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../axiomRebuild/ImmersiveCard';

interface ReputationCardProps {
  points: number;
  breakdown?: {
    holdingPeriods: number;
    actionsCompleted: number;
    onboardingComplete: boolean;
    susuCycles: number;
    votes: number;
  };
}

export function ReputationCard({ points, breakdown }: ReputationCardProps) {
  const currentLevel = calculateReputationLevel(points);
  const nextLevel = stewardReputationCopy.levels.find(l => l.pointsRequired > points);
  
  const pointsToNext = nextLevel ? nextLevel.pointsRequired - points : 0;
  const progressToNext = nextLevel 
    ? ((points - currentLevel.pointsRequired) / (nextLevel.pointsRequired - currentLevel.pointsRequired)) * 100
    : 100;

  const levelIcons: Record<number, string> = {
    1: '🌱',
    2: '🌿',
    3: '🌳',
    4: '🏡',
    5: '⭐'
  };

  return (
    <ImmersiveCard variant="glow" glowColor={`${web3Theme.colors.accent}20`} hover3D={true}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>
          {levelIcons[currentLevel.level] || '🌱'}
        </div>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: web3Theme.colors.accent,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '4px'
        }}>
          Level {currentLevel.level}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1F2937' }}>
          {currentLevel.name}
        </div>
        <div style={{ 
          fontSize: '32px', 
          fontWeight: 700, 
          color: web3Theme.colors.primary,
          marginTop: '8px'
        }}>
          {points} <span style={{ fontSize: '16px', fontWeight: 500, color: '#6B7280' }}>points</span>
        </div>
      </div>

      {nextLevel && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: '#6B7280' }}>Progress to {nextLevel.name}</span>
            <span style={{ fontWeight: 600, color: web3Theme.colors.accent }}>
              {pointsToNext} points needed
            </span>
          </div>
          <div style={{ 
            height: '8px', 
            background: 'rgba(0,0,0,0.06)', 
            borderRadius: web3Theme.radii.full,
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${Math.min(progressToNext, 100)}%`, 
              height: '100%', 
              background: web3Theme.colors.gradientAccent,
              borderRadius: web3Theme.radii.full,
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563', marginBottom: '10px' }}>
          Unlocked Benefits
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {currentLevel.unlocks.map((unlock, i) => (
            <li 
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#1F2937',
                marginBottom: '6px'
              }}
            >
              <span style={{ color: web3Theme.colors.primary }}>✓</span>
              {unlock}
            </li>
          ))}
        </ul>
      </div>

      {breakdown && (
        <div style={{ 
          padding: '16px', 
          background: 'rgba(0,0,0,0.03)', 
          borderRadius: web3Theme.radii.md 
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563', marginBottom: '12px' }}>
            Points Breakdown
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: '#6B7280' }}>Holding periods: </span>
              <span style={{ fontWeight: 600 }}>{breakdown.holdingPeriods}</span>
            </div>
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: '#6B7280' }}>Actions: </span>
              <span style={{ fontWeight: 600 }}>{breakdown.actionsCompleted}</span>
            </div>
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: '#6B7280' }}>SUSU cycles: </span>
              <span style={{ fontWeight: 600 }}>{breakdown.susuCycles}</span>
            </div>
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: '#6B7280' }}>Votes cast: </span>
              <span style={{ fontWeight: 600 }}>{breakdown.votes}</span>
            </div>
          </div>
        </div>
      )}
    </ImmersiveCard>
  );
}
