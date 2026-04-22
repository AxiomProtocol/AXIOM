import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { usePersonalization, INTEREST_CONFIGS } from '../lib/usePersonalization';

export function PersonalizedNavigation() {
  const router = useRouter();
  const { preferences, getQuickActions, isLoading } = usePersonalization();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading || !preferences.onboardingComplete) {
    return null;
  }

  const quickActions = getQuickActions();
  
  if (quickActions.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '20px',
      zIndex: 1000
    }}>
      {isExpanded && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '16px',
          marginBottom: '12px',
          minWidth: '220px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#6B7280',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Quick Access
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  router.push(action.path);
                  setIsExpanded(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: router.pathname === action.path ? '#ECFDF5' : '#F9FAFB',
                  border: router.pathname === action.path ? '1px solid #10B981' : '1px solid transparent',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '20px' }}>{action.icon}</span>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  color: router.pathname === action.path ? '#059669' : '#374151'
                }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
          
          <div style={{
            borderTop: '1px solid #E5E7EB',
            marginTop: '12px',
            paddingTop: '12px'
          }}>
            <button
              onClick={() => {
                router.push('/dashboard');
                setIsExpanded(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '13px',
                color: '#6B7280'
              }}
            >
              <span>🏠</span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00A389 0%, #00897B 100%)',
          border: 'none',
          boxShadow: '0 4px 16px rgba(0, 163, 137, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="Quick Access"
      >
        {isExpanded ? '✕' : '⚡'}
      </button>
    </div>
  );
}

export function PersonalizedSidebar() {
  const router = useRouter();
  const { preferences, getRecommendedFeatures, isLoading } = usePersonalization();

  if (isLoading || !preferences.onboardingComplete) {
    return null;
  }

  const { primary, suggested } = getRecommendedFeatures();

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid #E5E7EB'
    }}>
      <h3 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#1F2937',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>🧭</span> Your Journey
      </h3>

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          marginBottom: '10px',
          letterSpacing: '0.5px'
        }}>
          Your Interests
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {primary.map(interest => (
            <button
              key={interest.id}
              onClick={() => router.push(interest.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: router.pathname === interest.path ? '#ECFDF5' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '16px' }}>{interest.icon}</span>
              <span style={{
                fontSize: '13px',
                fontWeight: router.pathname === interest.path ? 600 : 400,
                color: router.pathname === interest.path ? '#059669' : '#374151'
              }}>
                {interest.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {suggested.length > 0 && (
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            marginBottom: '10px',
            letterSpacing: '0.5px'
          }}>
            Suggested for You
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {suggested.map(interest => (
              <button
                key={interest.id}
                onClick={() => router.push(interest.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: '1px dashed #E5E7EB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  opacity: 0.7
                }}
              >
                <span style={{ fontSize: '16px' }}>{interest.icon}</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  {interest.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonalizedNavigation;
