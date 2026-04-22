"use client";

import React, { useState } from 'react';
import { pledgeText, stewardCharter } from '../../lib/stewardCorps';
import { web3Theme } from '../axiomRebuild/styles/web3Theme';
import { track } from '../axiomRebuild/analytics';

interface StewardPledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => Promise<void>;
}

export function StewardPledgeModal({ isOpen, onClose, onAccept }: StewardPledgeModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!accepted || loading) return;
    
    setLoading(true);
    track('steward_pledge_accept', { timestamp: Date.now() });
    
    try {
      await onAccept();
      onClose();
    } catch (err) {
      console.error('Failed to accept pledge:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: web3Theme.radii.xl,
        maxWidth: '560px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: 700, 
                color: '#1F2937',
                margin: '0 0 4px 0'
              }}>
                Steward Pledge
              </h2>
              <p style={{ 
                fontSize: '14px', 
                color: '#6B7280',
                margin: 0
              }}>
                Please read and accept to proceed
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#6B7280'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{
            background: 'rgba(123, 104, 238, 0.05)',
            border: '1px solid rgba(123, 104, 238, 0.15)',
            borderRadius: web3Theme.radii.lg,
            padding: '20px',
            marginBottom: '24px'
          }}>
            <p style={{
              fontSize: '15px',
              lineHeight: 1.7,
              color: '#1F2937',
              fontStyle: 'italic',
              margin: 0,
              textAlign: 'center'
            }}>
              "{pledgeText}"
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: '#1F2937',
              marginBottom: '12px'
            }}>
              By accepting, you acknowledge:
            </h4>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px'
            }}>
              {stewardCharter.authorityDoNot.map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#4B5563'
                }}>
                  <span style={{ color: '#EF4444' }}>•</span>
                  <span>Stewards do not: {item}</span>
                </div>
              ))}
            </div>
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            background: accepted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0,0,0,0.02)',
            border: `1px solid ${accepted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: web3Theme.radii.md,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                accentColor: web3Theme.colors.primary,
                cursor: 'pointer',
                marginTop: '2px'
              }}
            />
            <span style={{ 
              fontSize: '14px', 
              color: '#1F2937',
              lineHeight: 1.5
            }}>
              I have read and understand the Steward Pledge. I accept responsibility and acknowledge that this role grants access, not entitlement.
            </span>
          </label>
        </div>

        <div style={{
          padding: '16px 24px 24px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: web3Theme.radii.md,
              fontSize: '14px',
              fontWeight: 500,
              color: '#4B5563',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!accepted || loading}
            style={{
              padding: '12px 24px',
              background: accepted ? web3Theme.colors.primary : '#E5E7EB',
              border: 'none',
              borderRadius: web3Theme.radii.md,
              fontSize: '14px',
              fontWeight: 600,
              color: accepted ? '#FFFFFF' : '#9CA3AF',
              cursor: accepted && !loading ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Processing...' : 'Accept Pledge'}
          </button>
        </div>
      </div>
    </div>
  );
}
