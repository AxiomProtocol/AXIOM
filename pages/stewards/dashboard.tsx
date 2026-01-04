import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../../components/WalletConnect/WalletContext';
import { 
  publicCopy,
  StewardStatus,
  getStewardStatusLabel
} from '../../lib/stewardCorps';
import { web3Theme } from '../../components/axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../../components/axiomRebuild/ImmersiveCard';
import { 
  StewardStatusIndicator,
  StewardMetricsPanel
} from '../../components/stewardCorps';
import { track } from '../../components/axiomRebuild/analytics';
import { RebuildNav } from '../../components/axiomRebuild/RebuildNav';

export default function StewardDashboardPage() {
  const router = useRouter();
  const { walletState } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  
  const [stewardStatus, setStewardStatus] = useState<StewardStatus>('none');
  const [loading, setLoading] = useState(true);
  const [daysProbation, setDaysProbation] = useState(0);

  useEffect(() => {
    track('steward_dashboard_view', { page: 'steward-dashboard' });
  }, []);

  useEffect(() => {
    async function fetchStewardData() {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/stewards/status?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setStewardStatus(data.status || 'none');
          setDaysProbation(data.daysProbation || 0);
        }
      } catch (err) {
        console.error('Failed to fetch steward status:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStewardData();
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <>
        <Head>
          <title>Steward Dashboard | Axiom Protocol</title>
        </Head>
        <RebuildNav />
        
        <main style={{ 
          minHeight: '100vh', 
          background: '#FAFBFC',
          paddingTop: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ImmersiveCard variant="glass">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
                Connect Your Wallet
              </h2>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                Connect your wallet to access the Steward Dashboard
              </p>
            </div>
          </ImmersiveCard>
        </main>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Steward Dashboard | Axiom Protocol</title>
        </Head>
        <RebuildNav />
        
        <main style={{ 
          minHeight: '100vh', 
          background: '#FAFBFC',
          paddingTop: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: `3px solid ${web3Theme.colors.primary}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#6B7280' }}>Loading dashboard...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </main>
      </>
    );
  }

  if (stewardStatus === 'none' || stewardStatus === 'applicant') {
    return (
      <>
        <Head>
          <title>Steward Dashboard | Axiom Protocol</title>
        </Head>
        <RebuildNav />
        
        <main style={{ 
          minHeight: '100vh', 
          background: '#FAFBFC',
          paddingTop: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ maxWidth: '500px', padding: '24px', textAlign: 'center' }}>
            <ImmersiveCard variant="glass">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {stewardStatus === 'applicant' ? '📨' : '🛡️'}
              </div>
              
              {stewardStatus === 'applicant' && (
                <StewardStatusIndicator status="applicant" size="lg" />
              )}
              
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: 600, 
                color: '#1F2937',
                margin: '16px 0 12px'
              }}>
                {stewardStatus === 'applicant' 
                  ? 'Application Under Review'
                  : 'Dashboard Access Restricted'
                }
              </h2>
              
              <p style={{ 
                fontSize: '14px', 
                color: '#6B7280',
                marginBottom: '24px'
              }}>
                {stewardStatus === 'applicant' 
                  ? 'Your application is being reviewed. You will gain dashboard access once approved for probation.'
                  : 'The Steward Dashboard is only available to probationary and full stewards.'
                }
              </p>

              <Link 
                href={stewardStatus === 'applicant' ? '/stewards' : '/stewards/apply'}
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: web3Theme.colors.primary,
                  color: '#FFFFFF',
                  borderRadius: web3Theme.radii.md,
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                {stewardStatus === 'applicant' ? 'Back to Steward Corps' : 'Apply to Become a Steward'}
              </Link>
            </ImmersiveCard>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Steward Dashboard | Axiom Protocol</title>
        <meta name="description" content="Manage your steward responsibilities" />
      </Head>
      <RebuildNav />
      
      <main style={{ 
        minHeight: '100vh', 
        background: '#FAFBFC',
        paddingTop: '80px'
      }}>
        <section style={{
          padding: '40px 24px',
          background: 'linear-gradient(180deg, rgba(123, 104, 238, 0.08) 0%, transparent 100%)'
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ 
                  fontSize: '28px', 
                  fontWeight: 700, 
                  color: '#1F2937',
                  margin: '0 0 8px 0'
                }}>
                  Steward Dashboard
                </h1>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                  Manage your steward responsibilities and track progress
                </p>
              </div>
              <StewardStatusIndicator status={stewardStatus} size="lg" />
            </div>
          </div>
        </section>

        <section style={{ padding: '40px 24px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px'
            }}>
              <StewardMetricsPanel 
                daysProbation={daysProbation}
                totalProbationDays={90}
              />

              <ImmersiveCard variant="glass" hover3D={false}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#1F2937',
                  margin: '0 0 20px 0'
                }}>
                  Coordinator Tools
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    padding: '16px',
                    background: 'rgba(0,0,0,0.02)',
                    borderRadius: web3Theme.radii.md,
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>📋</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
                          Regional Coordination
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          Coming soon
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '16px',
                    background: 'rgba(0,0,0,0.02)',
                    borderRadius: web3Theme.radii.md,
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>🌾</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
                          Produce Distribution
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          Coming soon
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '16px',
                    background: 'rgba(0,0,0,0.02)',
                    borderRadius: web3Theme.radii.md,
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>🗺️</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
                          Land Opportunities
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          Coming soon
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ImmersiveCard>
            </div>

            <div style={{ marginTop: '40px' }}>
              <ImmersiveCard variant="glass" hover3D={false}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#1F2937',
                  margin: '0 0 16px 0'
                }}>
                  Recent Activity
                </h3>
                
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#9CA3AF'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    No recent activity. Your coordination actions will appear here.
                  </p>
                </div>
              </ImmersiveCard>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
