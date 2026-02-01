import React, { useState, useEffect } from 'react';
import { Achievement, achievements, rarityColors, calculateTotalPoints, getNextAchievements } from '../lib/achievements';

interface AchievementBadgeProps {
  achievement: Achievement;
  earned?: boolean;
  earnedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export function AchievementBadge({ achievement, earned = false, earnedAt, size = 'md', showDetails = false }: AchievementBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const sizes = {
    sm: { badge: 40, icon: '20px', ring: 3 },
    md: { badge: 56, icon: '28px', ring: 4 },
    lg: { badge: 72, icon: '36px', ring: 5 }
  };
  
  const s = sizes[size];
  
  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        style={{
          width: `${s.badge}px`,
          height: `${s.badge}px`,
          borderRadius: '50%',
          background: earned 
            ? `linear-gradient(135deg, ${rarityColors[achievement.rarity]}20 0%, ${rarityColors[achievement.rarity]}40 100%)`
            : 'linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)',
          border: `${s.ring}px solid ${earned ? rarityColors[achievement.rarity] : '#9CA3AF'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: earned 
            ? `0 4px 12px ${rarityColors[achievement.rarity]}40`
            : '0 2px 4px rgba(0,0,0,0.1)',
          opacity: earned ? 1 : 0.5,
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
      >
        <span style={{ 
          fontSize: s.icon, 
          filter: earned ? 'none' : 'grayscale(100%)',
          opacity: earned ? 1 : 0.6
        }}>
          {achievement.icon}
        </span>
      </div>
      
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '12px 16px',
            background: '#1F2937',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            zIndex: 1000,
            minWidth: '200px',
            textAlign: 'center'
          }}
        >
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: 'white',
            marginBottom: '4px'
          }}>
            {achievement.name}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#9CA3AF',
            marginBottom: '8px'
          }}>
            {achievement.description}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <span style={{
              padding: '4px 8px',
              background: `${rarityColors[achievement.rarity]}20`,
              color: rarityColors[achievement.rarity],
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'capitalize'
            }}>
              {achievement.rarity}
            </span>
            <span style={{
              fontSize: '12px',
              color: '#D4AF37',
              fontWeight: 600
            }}>
              +{achievement.points} pts
            </span>
          </div>
          {earned && earnedAt && (
            <div style={{ 
              marginTop: '8px',
              fontSize: '11px',
              color: '#6B7280'
            }}>
              Earned {new Date(earnedAt).toLocaleDateString()}
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              width: '12px',
              height: '12px',
              background: '#1F2937',
              transform: 'translateX(-50%) rotate(45deg)'
            }}
          />
        </div>
      )}
    </div>
  );
}

interface AchievementsDisplayProps {
  earnedAchievements: Array<{ achievementId: string; earnedAt: string }>;
  showAll?: boolean;
  maxDisplay?: number;
}

export function AchievementsDisplay({ earnedAchievements, showAll = false, maxDisplay = 8 }: AchievementsDisplayProps) {
  const earnedIds = earnedAchievements.map(a => a.achievementId);
  const totalPoints = calculateTotalPoints(earnedIds);
  const nextAchievements = getNextAchievements(earnedIds, 3);
  
  const displayAchievements = showAll 
    ? achievements 
    : achievements.slice(0, maxDisplay);
  
  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>
            Achievements
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            {earnedIds.length} of {achievements.length} earned
          </p>
        </div>
        <div style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
            {totalPoints}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
            Points
          </div>
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {displayAchievements.map(achievement => {
          const earned = earnedAchievements.find(a => a.achievementId === achievement.id);
          return (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              earned={!!earned}
              earnedAt={earned?.earnedAt}
              size="md"
            />
          );
        })}
      </div>
      
      {nextAchievements.length > 0 && (
        <div style={{
          padding: '16px',
          background: '#F9FAFB',
          borderRadius: '12px',
          border: '1px solid #E5E7EB'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
            Next to Unlock
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {nextAchievements.map(achievement => (
              <div 
                key={achievement.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB'
                }}
              >
                <span style={{ fontSize: '24px' }}>{achievement.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
                    {achievement.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {achievement.description}
                  </div>
                </div>
                <span style={{
                  padding: '4px 8px',
                  background: `${rarityColors[achievement.rarity]}15`,
                  color: rarityColors[achievement.rarity],
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  +{achievement.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AchievementUnlockToast({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        zIndex: 9999,
        animation: 'slideIn 0.3s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        border: `2px solid ${rarityColors[achievement.rarity]}`
      }}
    >
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: `${rarityColors[achievement.rarity]}30`,
        border: `3px solid ${rarityColors[achievement.rarity]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px'
      }}>
        {achievement.icon}
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '2px' }}>
          ACHIEVEMENT UNLOCKED
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
          {achievement.name}
        </div>
        <div style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 600 }}>
          +{achievement.points} points
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          color: '#6B7280',
          cursor: 'pointer',
          fontSize: '18px'
        }}
      >
        ×
      </button>
    </div>
  );
}

export default AchievementBadge;
