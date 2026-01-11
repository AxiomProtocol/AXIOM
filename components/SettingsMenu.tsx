import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '../lib/theme';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsMenu({ isOpen, onClose }: SettingsMenuProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  if (!isOpen) return null;

  const handleRestartOnboarding = () => {
    onClose();
    router.push('/purpose-group-onboarding');
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: theme === 'dark' ? '#1E293B' : 'white',
          borderRadius: '16px',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '400px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          zIndex: 9999
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: theme === 'dark' ? '#F1F5F9' : '#1F2937', margin: 0 }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: theme === 'dark' ? '#94A3B8' : '#6B7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: theme === 'dark' ? '#334155' : '#F3F4F6',
              borderRadius: '12px'
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 500, color: theme === 'dark' ? '#F1F5F9' : '#1F2937' }}>Dark Mode</p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: theme === 'dark' ? '#94A3B8' : '#6B7280' }}>
                Switch between light and dark themes
              </p>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                background: theme === 'dark' ? '#00A389' : '#D1D5DB',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s'
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: theme === 'dark' ? '27px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}
              />
            </button>
          </div>

          <button
            onClick={handleRestartOnboarding}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: theme === 'dark' ? '#334155' : '#F3F4F6',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <span style={{ fontSize: '24px' }}>🎯</span>
            <div>
              <p style={{ margin: 0, fontWeight: 500, color: theme === 'dark' ? '#F1F5F9' : '#1F2937' }}>
                Restart Onboarding
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: theme === 'dark' ? '#94A3B8' : '#6B7280' }}>
                Go through the welcome wizard again
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: theme === 'dark' ? '#334155' : '#F3F4F6',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <span style={{ fontSize: '24px' }}>🔄</span>
            <div>
              <p style={{ margin: 0, fontWeight: 500, color: theme === 'dark' ? '#F1F5F9' : '#1F2937' }}>
                Clear Local Data
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: theme === 'dark' ? '#94A3B8' : '#6B7280' }}>
                Reset all stored preferences
              </p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00A389 0%, #00897B 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 163, 137, 0.4)',
          zIndex: 1000,
          fontSize: '24px'
        }}
        title="Settings"
      >
        ⚙️
      </button>
      <SettingsMenu isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default SettingsMenu;
