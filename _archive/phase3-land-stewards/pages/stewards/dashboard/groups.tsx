import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { DashboardShell } from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

interface Group {
  id: number;
  name: string;
  purpose: string;
  targetSize: number;
  memberCount: number;
  status: string;
  cadence: string;
}

export default function StewardGroupsPage() {
  const { walletState } = useWallet();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track(StewardEvents.DASHBOARD_VIEW, { page: 'groups' });
    setLoading(false);
  }, []);

  return (
    <>
      <Head>
        <title>Groups | Steward Dashboard | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Group Formation">
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
              Community Groups
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              Create and manage participant groups in your region
            </p>
          </div>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: '#00D4AA',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Create Group
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
            Loading groups...
          </div>
        ) : groups.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤝</div>
            <h3 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>No Groups Yet</h3>
            <p style={{ margin: '0 0 20px', color: '#666', fontSize: '14px' }}>
              Create groups to organize participants for onboarding, meetings, or cohort activities
            </p>
            <button
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(0,212,170,0.1)',
                color: '#00D4AA',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Create First Group
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {groups.map(group => (
              <div key={group.id} style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1a1a2e' }}>
                    {group.name}
                  </h4>
                  <span style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    background: 'rgba(0,212,170,0.1)',
                    color: '#00D4AA',
                    textTransform: 'capitalize'
                  }}>
                    {group.status}
                  </span>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#666' }}>
                  {group.purpose}
                </p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#999' }}>
                  <span>{group.memberCount}/{group.targetSize} members</span>
                  <span>{group.cadence}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardShell>
    </>
  );
}
