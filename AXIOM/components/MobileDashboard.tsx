import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { usePersonalization, INTEREST_CONFIGS, InterestConfig } from '../lib/usePersonalization';

interface MobileNavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const DEFAULT_NAV_ITEMS: MobileNavItem[] = [
  { id: 'home', label: 'Home', icon: '🏠', path: '/' },
  { id: 'land', label: 'Land', icon: '🌍', path: '/land' },
  { id: 'products', label: 'Products', icon: '💰', path: '/products' },
  { id: 'more', label: 'More', icon: '☰', path: '' }
];

export function MobileBottomNav() {
  const router = useRouter();
  const { preferences, getQuickActions, isLoading } = usePersonalization();
  const [showMore, setShowMore] = useState(false);

  const getNavItems = (): MobileNavItem[] => {
    if (!preferences.onboardingComplete || preferences.interests.length === 0) {
      return DEFAULT_NAV_ITEMS;
    }

    const items: MobileNavItem[] = [
      { id: 'home', label: 'Home', icon: '🏠', path: '/dashboard' }
    ];

    preferences.interests.slice(0, 2).forEach(interestId => {
      const config = INTEREST_CONFIGS[interestId];
      if (config) {
        items.push({
          id: config.id,
          label: config.label.split(' ')[0],
          icon: config.icon,
          path: config.path
        });
      }
    });

    items.push({ id: 'more', label: 'More', icon: '☰', path: '' });
    
    return items;
  };

  const navItems = getNavItems();

  const handleNavClick = (item: MobileNavItem) => {
    if (item.id === 'more') {
      setShowMore(!showMore);
    } else {
      router.push(item.path);
      setShowMore(false);
    }
  };

  return (
    <>
      {showMore && (
        <MobileMoreMenu 
          onClose={() => setShowMore(false)} 
          currentInterests={preferences.interests}
        />
      )}

      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
        zIndex: 1000
      }}
      className="mobile-bottom-nav"
      >
        {navItems.map(item => {
          const isActive = router.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                minWidth: '64px'
              }}
            >
              <span style={{ 
                fontSize: '24px',
                opacity: isActive ? 1 : 0.6
              }}>
                {item.icon}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#00A389' : '#6B7280'
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

function MobileMoreMenu({ onClose, currentInterests }: { onClose: () => void; currentInterests: string[] }) {
  const router = useRouter();

  const allOptions = Object.values(INTEREST_CONFIGS);
  const primaryOptions = allOptions.filter(opt => currentInterests.includes(opt.id));
  const otherOptions = allOptions.filter(opt => !currentInterests.includes(opt.id));

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999
        }}
      />
      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '16px',
        right: '16px',
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        zIndex: 1001,
        maxHeight: '60vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
            Navigate
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280'
            }}
          >
            ×
          </button>
        </div>

        {primaryOptions.length > 0 && (
          <>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', marginBottom: '8px', textTransform: 'uppercase' }}>
              Your Interests
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {primaryOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleNavigate(option.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{option.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1F2937' }}>
                    {option.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <p style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', marginBottom: '8px', textTransform: 'uppercase' }}>
          All Features
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {otherOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handleNavigate(option.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '20px' }}>{option.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                {option.label.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        <div style={{
          borderTop: '1px solid #E5E7EB',
          marginTop: '16px',
          paddingTop: '16px',
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => handleNavigate('/journey')}
            style={{
              flex: 1,
              padding: '12px',
              background: '#EEF2FF',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: '#4F46E5'
            }}
          >
            📊 My Journey
          </button>
          <button
            onClick={() => handleNavigate('/badges')}
            style={{
              flex: 1,
              padding: '12px',
              background: '#FEF3C7',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: '#D97706'
            }}
          >
            🏆 Badges
          </button>
        </div>
      </div>
    </>
  );
}

export function MobileHeader({ title, showBack = false }: { title: string; showBack?: boolean }) {
  const router = useRouter();
  const { preferences } = usePersonalization();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      background: 'white',
      borderBottom: '1px solid #E5E7EB',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 100
    }}
    className="mobile-header"
    >
      {showBack && (
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
            marginLeft: '-8px'
          }}
        >
          ←
        </button>
      )}
      <div style={{ flex: 1 }}>
        <h1 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#1F2937',
          margin: 0
        }}>
          {title}
        </h1>
        {preferences.name && (
          <p style={{ 
            fontSize: '12px', 
            color: '#6B7280',
            margin: 0
          }}>
            Welcome, {preferences.name}
          </p>
        )}
      </div>
      <button
        onClick={() => router.push('/notifications')}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '8px',
          position: 'relative'
        }}
      >
        🔔
      </button>
    </header>
  );
}

export function MobileCard({ 
  children, 
  onClick,
  style = {}
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {children}
    </div>
  );
}

export function SwipeableActions({
  onSwipeLeft,
  onSwipeRight,
  leftLabel,
  rightLabel,
  children
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  children: React.ReactNode;
}) {
  const [startX, setStartX] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setOffset(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    if (offset > 50 && onSwipeRight) {
      onSwipeRight();
    } else if (offset < -50 && onSwipeLeft) {
      onSwipeLeft();
    }
    setOffset(0);
    setIsSwiping(false);
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {leftLabel && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '100px',
          background: '#EF4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 500
        }}>
          {leftLabel}
        </div>
      )}
      {rightLabel && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '100px',
          background: '#10B981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 500
        }}>
          {rightLabel}
        </div>
      )}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease',
          background: 'white',
          position: 'relative',
          zIndex: 1
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PullToRefresh({
  onRefresh,
  children
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff * 0.5, threshold + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    setStartY(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '100vh' }}
    >
      <div style={{
        height: pullDistance,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: isRefreshing ? 'none' : 'height 0.3s ease',
        overflow: 'hidden'
      }}>
        {pullDistance > 0 && (
          <div style={{
            fontSize: '24px',
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
          }}>
            {isRefreshing ? '⟳' : pullDistance >= threshold ? '↓' : '↑'}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export function useMobileDetect() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export default MobileBottomNav;
