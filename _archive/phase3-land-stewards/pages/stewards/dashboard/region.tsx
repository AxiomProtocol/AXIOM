import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { DashboardShell, RegionHealthScore } from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

interface RegionData {
  id: number;
  name: string;
  coverage: string;
  status: 'onTrack' | 'atRisk' | 'blocked';
  pickupPoints: Array<{ name: string; address: string }>;
  stewards: Array<{ wallet: string; role: string; status: string }>;
}

export default function StewardRegionPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [region, setRegion] = useState<RegionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track(StewardEvents.DASHBOARD_VIEW, { page: 'region' });
    setLoading(false);
  }, []);

  return (
    <>
      <Head>
        <title>Region | Steward Dashboard | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Region Management">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
            Your Region
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            View and manage your assigned region
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
            Loading region data...
          </div>
        ) : region ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            <RegionHealthScore
              regionName={region.name}
              status={region.status}
              metrics={{
                dropCompletion: 85,
                participantGrowth: 72,
                taskCompletion: 90,
                reportSubmission: 100
              }}
            />

            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                Pickup Points
              </h3>
              {region.pickupPoints.length === 0 ? (
                <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
                  No pickup points configured yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {region.pickupPoints.map((point, idx) => (
                    <div key={idx} style={{
                      padding: '12px',
                      background: 'rgba(0,0,0,0.02)',
                      borderRadius: '8px'
                    }}>
                      <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
                        {point.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                        {point.address}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                Region Stewards
              </h3>
              {region.stewards.length === 0 ? (
                <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
                  No stewards assigned yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {region.stewards.map((steward, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'rgba(0,0,0,0.02)',
                      borderRadius: '8px'
                    }}>
                      <span style={{ fontSize: '13px', color: '#1a1a2e' }}>
                        {steward.wallet.slice(0, 6)}...{steward.wallet.slice(-4)}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        background: 'rgba(0,212,170,0.1)',
                        color: '#00D4AA',
                        textTransform: 'capitalize'
                      }}>
                        {steward.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,184,0,0.08)',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            border: '1px solid rgba(255,184,0,0.2)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
            <h3 style={{ margin: '0 0 8px', color: '#B8860B' }}>No Region Assigned</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              You are not yet assigned to a region. Contact a Lead or Council member for assignment.
            </p>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
