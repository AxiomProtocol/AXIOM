import React from 'react';
import { useTheme } from '../lib/theme';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ThemeToggle({ size = 'md', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  
  const sizes = {
    sm: { track: 'w-10 h-5', knob: 'w-4 h-4', translate: 'translate-x-5', icon: 'text-xs' },
    md: { track: 'w-14 h-7', knob: 'w-5 h-5', translate: 'translate-x-7', icon: 'text-sm' },
    lg: { track: 'w-16 h-8', knob: 'w-6 h-6', translate: 'translate-x-8', icon: 'text-base' }
  };
  
  const s = sizes[size];
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {showLabel && (
        <span style={{ 
          fontSize: '14px', 
          color: theme === 'dark' ? '#94A3B8' : '#6B7280',
          fontWeight: 500
        }}>
          {theme === 'dark' ? 'Dark' : 'Light'} Mode
        </span>
      )}
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        style={{
          position: 'relative',
          width: size === 'sm' ? '40px' : size === 'md' ? '56px' : '64px',
          height: size === 'sm' ? '20px' : size === 'md' ? '28px' : '32px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, #1E293B 0%, #334155 100%)'
            : 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
          boxShadow: theme === 'dark'
            ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
            : 'inset 0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: theme === 'dark' 
              ? `calc(100% - ${size === 'sm' ? '18px' : size === 'md' ? '26px' : '30px'})` 
              : '2px',
            width: size === 'sm' ? '16px' : size === 'md' ? '24px' : '28px',
            height: size === 'sm' ? '16px' : size === 'md' ? '24px' : '28px',
            borderRadius: '50%',
            background: theme === 'dark'
              ? 'linear-gradient(135deg, #64748B 0%, #475569 100%)'
              : 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
            boxShadow: theme === 'dark'
              ? '0 2px 4px rgba(0,0,0,0.3)'
              : '0 2px 8px rgba(245, 158, 11, 0.4)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ 
            fontSize: size === 'sm' ? '10px' : size === 'md' ? '12px' : '14px',
            lineHeight: 1
          }}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </span>
        </div>
        
        {theme === 'dark' && (
          <>
            <span style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '6px', opacity: 0.6 }}>✨</span>
            <span style={{ position: 'absolute', top: '12px', left: '14px', fontSize: '4px', opacity: 0.4 }}>⭐</span>
          </>
        )}
      </button>
    </div>
  );
}

export default ThemeToggle;
