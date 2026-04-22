import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../WalletConnect/WalletContext';
import { track } from '../../lib/stewardsAnalytics';

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
}

type StewardRole = 'coordinator' | 'lead' | 'council' | 'admin' | null;

interface NavItem {
  name: string;
  href: string;
  icon: string;
  roles?: StewardRole[];
}

const navItems: NavItem[] = [
  { name: 'Overview', href: '/stewards/dashboard', icon: '📊' },
  { name: 'Region', href: '/stewards/dashboard/region', icon: '📍' },
  { name: 'Drops', href: '/stewards/dashboard/drops', icon: '📦' },
  { name: 'Participants', href: '/stewards/dashboard/participants', icon: '👥' },
  { name: 'Land Pipeline', href: '/stewards/dashboard/land', icon: '🌱' },
  { name: 'Groups', href: '/stewards/dashboard/groups', icon: '🤝' },
  { name: 'Tasks', href: '/stewards/dashboard/tasks', icon: '✓' },
  { name: 'Communications', href: '/stewards/dashboard/comms', icon: '💬' },
  { name: 'Reputation', href: '/stewards/dashboard/reputation', icon: '⭐' },
  { name: 'Reports', href: '/stewards/dashboard/reports', icon: '📋' },
  { name: 'Settings', href: '/stewards/dashboard/settings', icon: '⚙️', roles: ['admin', 'council'] },
];

export function DashboardShell({ children, title = 'Steward Dashboard' }: DashboardShellProps) {
  const router = useRouter();
  const { walletState } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stewardData, setStewardData] = useState<{
    role: StewardRole;
    regionName: string;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStewardData() {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/stewards/dashboard/auth?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setStewardData(data);
        }
      } catch (err) {
        console.error('Failed to fetch steward data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStewardData();
  }, [isConnected, address]);

  const canAccessItem = (item: NavItem): boolean => {
    if (!item.roles) return true;
    if (!stewardData?.role) return false;
    return item.roles.includes(stewardData.role);
  };

  const isActivePath = (href: string): boolean => {
    if (href === '/stewards/dashboard') {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  if (!isConnected) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FAFBFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>Connect Your Wallet</h2>
          <p style={{ color: '#666', margin: 0 }}>Please connect your wallet to access the Steward Dashboard</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FAFBFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#666' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFBFC' }}>
      <aside style={{
        width: sidebarOpen ? '240px' : '64px',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        transition: 'width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 100
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          {sidebarOpen && (
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>Steward Dashboard</div>
              {stewardData?.regionName && (
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                  {stewardData.regionName}
                </div>
              )}
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {navItems.filter(canAccessItem).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: sidebarOpen ? '12px 16px' : '12px',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                borderRadius: '8px',
                marginBottom: '4px',
                textDecoration: 'none',
                color: isActivePath(item.href) ? '#00D4AA' : 'rgba(255,255,255,0.7)',
                background: isActivePath(item.href) ? 'rgba(0,212,170,0.1)' : 'transparent',
                transition: 'all 0.15s ease'
              }}
              onClick={() => track('steward_nav_click', { destination: item.href })}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {sidebarOpen && (
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.name}</span>
              )}
            </Link>
          ))}
        </nav>

        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Link
            href="/stewards"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: sidebarOpen ? '12px 16px' : '12px',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            <span>←</span>
            {sidebarOpen && <span>Back to Corps Info</span>}
          </Link>
        </div>
      </aside>

      <main style={{
        flex: 1,
        marginLeft: sidebarOpen ? '240px' : '64px',
        transition: 'margin-left 0.2s ease'
      }}>
        <header style={{
          background: '#fff',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1a1a2e' }}>
            {title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {stewardData?.role && (
              <span style={{
                background: 'rgba(0,212,170,0.1)',
                color: '#00D4AA',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}>
                {stewardData.role}
              </span>
            )}
            <span style={{
              color: '#666',
              fontSize: '13px'
            }}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
        </header>

        <div style={{ padding: '24px 32px' }}>
          {children}
        </div>

        <footer style={{
          padding: '16px 32px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          background: '#fff',
          marginTop: 'auto'
        }}>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: '#999',
            textAlign: 'center'
          }}>
            This dashboard coordinates access and stewardship operations. It does not promise financial outcomes.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default DashboardShell;
