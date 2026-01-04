import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { DashboardShell, ReputationPanel } from '../../../components/stewardsDashboard';
import { track, StewardEvents } from '../../../lib/stewardsAnalytics';

export default function StewardReputationPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track(StewardEvents.REPUTATION_VIEWED, { wallet: address });
    setLoading(false);
  }, [address]);

  const mockMetrics = {
    reliabilityScore: 85,
    responsivenessScore: 72,
    landQualityScore: 90,
    reportingScore: 100,
    compositeScore: 87
  };

  const mockUnlocks = [
    { id: 'early-land', name: 'Early Land Visibility', description: 'See qualified land leads before public signal windows', unlocked: true, requiredScore: 50 },
    { id: 'open-windows', name: 'Open Participation Windows', description: 'Ability to open participation windows for drops', unlocked: true, requiredScore: 60 },
    { id: 'propose-points', name: 'Propose Pickup Points', description: 'Suggest new pickup locations for your region', unlocked: true, requiredScore: 70 },
    { id: 'nominate-stewards', name: 'Nominate Stewards', description: 'Recommend participants for stewardship consideration', unlocked: false, requiredScore: 90 }
  ];

  return (
    <>
      <Head>
        <title>Reputation | Steward Dashboard | Axiom Protocol</title>
      </Head>
      
      <DashboardShell title="Reputation & Status">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
            Your Steward Reputation
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            Track your performance metrics and unlock new capabilities
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
            Loading reputation data...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px'
          }}>
            <ReputationPanel
              metrics={mockMetrics}
              status="active"
              unlocks={mockUnlocks}
            />

            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                How Scores Are Calculated
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
                    Reliability Score
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    Based on drop completion rate and on-time execution
                  </p>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
                    Responsiveness Score
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    Measures response time to tasks and participant inquiries
                  </p>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
                    Land Quality Score
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    Ratio of qualified leads to total leads submitted
                  </p>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}>
                    Reporting Score
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    Weekly report submission rate and completeness
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
