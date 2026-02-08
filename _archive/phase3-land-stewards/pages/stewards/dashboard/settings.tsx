import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { DashboardShell } from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

export default function StewardSettingsPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [loading, setLoading] = useState(true);
  const [stewardRole, setStewardRole] = useState<string | null>(null);

  useEffect(() => {
    track(StewardEvents.DASHBOARD_VIEW, { page: 'settings' });
    setLoading(false);
  }, []);

  const isAdmin = stewardRole === 'admin' || stewardRole === 'council';

  return (
    <>
      <Head>
        <title>Settings | Steward Dashboard | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Dashboard Settings">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
            Settings
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            Configure your dashboard and region preferences
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
            Loading settings...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                Notification Preferences
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '13px', color: '#1a1a2e' }}>New reservation notifications</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '13px', color: '#1a1a2e' }}>Task assignment notifications</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '13px', color: '#1a1a2e' }}>Land lead updates</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '13px', color: '#1a1a2e' }}>Weekly report reminders</span>
                </label>
              </div>
            </div>

            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                Region Profile
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: '#666' }}>
                    Default Pickup Location
                  </label>
                  <input
                    type="text"
                    placeholder="Enter default location..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: '#666' }}>
                    Default Drop Capacity
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>
            </div>

            {isAdmin && (
              <>
                <div style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.06)'
                }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                    Role Assignment
                  </h3>
                  <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#666' }}>
                    Assign or reassign steward roles within your jurisdiction.
                  </p>
                  <button
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(123,104,238,0.1)',
                      color: '#7B68EE',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Manage Roles
                  </button>
                </div>

                <div style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.06)'
                }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                    Region Management
                  </h3>
                  <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#666' }}>
                    Configure region boundaries, capacity limits, and policies.
                  </p>
                  <button
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(0,212,170,0.1)',
                      color: '#00D4AA',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Configure Regions
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </DashboardShell>
    </>
  );
}
