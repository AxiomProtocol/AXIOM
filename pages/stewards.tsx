import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { stewardReputationCopy, disclaimers } from '../lib/axiomHolderValue';
import { ReputationCard, ParticipationQueueCard } from '../components/holderValue';
import { web3Theme } from '../components/axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../components/axiomRebuild/ImmersiveCard';
import { trackOnce, track } from '../components/axiomRebuild/analytics';
import { RebuildNav } from '../components/axiomRebuild/RebuildNav';

export default function StewardsPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  const [reputation, setReputation] = useState<{
    points: number;
    breakdown: {
      holdingPeriods: number;
      actionsCompleted: number;
      onboardingComplete: boolean;
      susuCycles: number;
      votes: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [userTier, setUserTier] = useState(0);

  useEffect(() => {
    trackOnce('steward_reputation_view', 'stewards_page_view', { page: 'stewards' });
  }, []);

  useEffect(() => {
    async function fetchReputation() {
      if (!isConnected || !address) {
        setReputation(null);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/participation/reputation?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setReputation({
            points: data.points,
            breakdown: data.breakdown
          });
          setUserTier(data.level >= 3 ? 3 : data.level >= 2 ? 2 : 1);
        }
      } catch (err) {
        console.error('Failed to fetch reputation:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReputation();
  }, [isConnected, address]);

  const handleJoinStewards = async () => {
    if (!address) return;
    
    const res = await fetch('/api/participation/join-stewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: address, tier: userTier })
    });

    if (!res.ok) throw new Error('Join failed');
  };

  return (
    <>
      <Head>
        <title>Stewardship Program | Axiom Protocol</title>
        <meta name="description" content={stewardReputationCopy.pageSubtitle} />
      </Head>
      <RebuildNav />
      
      <main style={{ 
        minHeight: '100vh', 
        background: '#FAFBFC',
        paddingTop: '80px'
      }}>
        <section style={{
          padding: '60px 24px 40px',
          background: 'linear-gradient(180deg, rgba(123, 104, 238, 0.08) 0%, transparent 100%)'
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
            <Link href="/holders" style={{ 
              color: web3Theme.colors.primary, 
              fontSize: '14px', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '24px'
            }}>
              ← Back to Holder Benefits
            </Link>
            
            <h1 style={{ 
              fontSize: '42px', 
              fontWeight: 700, 
              color: '#1F2937',
              marginBottom: '16px'
            }}>
              {stewardReputationCopy.pageTitle}
            </h1>
            
            <p style={{ 
              fontSize: '18px', 
              color: '#6B7280', 
              maxWidth: '650px', 
              margin: '0 auto',
              lineHeight: 1.6
            }}>
              {stewardReputationCopy.description}
            </p>
          </div>
        </section>

        <section style={{ padding: '40px 24px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isConnected ? '1fr 1fr' : '1fr', 
              gap: '32px',
              alignItems: 'start'
            }}>
              {isConnected && reputation && (
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937', marginBottom: '20px' }}>
                    Your Reputation
                  </h2>
                  <ReputationCard 
                    points={reputation.points} 
                    breakdown={reputation.breakdown}
                  />
                </div>
              )}

              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937', marginBottom: '20px' }}>
                  {isConnected ? 'Join Steward Cohort' : 'Steward Cohort'}
                </h2>
                <ParticipationQueueCard
                  title="Steward Training Cohort"
                  description="Become a certified Axiom Steward. Learn land operations, community governance, and earn enhanced reputation multipliers."
                  icon="🛡️"
                  queueType="steward-cohort"
                  totalSlots={25}
                  filledSlots={8}
                  minTierRequired={3}
                  currentTier={userTier}
                  isConnected={isConnected}
                  onAction={handleJoinStewards}
                  page="stewards"
                />
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '40px 24px', background: 'rgba(0,0,0,0.02)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937', marginBottom: '24px' }}>
              How Points Are Earned
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '16px',
              marginBottom: '48px'
            }}>
              {stewardReputationCopy.pointsSystem.map((item, i) => (
                <ImmersiveCard key={i} variant="glass" hover3D={false}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                        {item.action}
                      </div>
                      <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
                        {item.frequency}
                      </div>
                    </div>
                    <div style={{ 
                      padding: '6px 14px',
                      background: `${web3Theme.colors.accent}15`,
                      borderRadius: web3Theme.radii.full,
                      fontSize: '16px',
                      fontWeight: 700,
                      color: web3Theme.colors.accent
                    }}>
                      +{item.points}
                    </div>
                  </div>
                </ImmersiveCard>
              ))}
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937', marginBottom: '24px' }}>
              Reputation Levels
            </h2>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                background: '#FFF',
                borderRadius: web3Theme.radii.lg,
                overflow: 'hidden',
                boxShadow: web3Theme.shadows.card
              }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Level</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Name</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Points Required</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Unlocks</th>
                  </tr>
                </thead>
                <tbody>
                  {stewardReputationCopy.levels.map((level) => (
                    <tr key={level.level} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1F2937' }}>
                        {level.level}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: web3Theme.colors.accent }}>
                        {level.name}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6B7280' }}>
                        {level.pointsRequired}+
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4B5563' }}>
                        {level.unlocks.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section style={{ padding: '40px 24px 60px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ 
              fontSize: '13px', 
              color: '#9CA3AF', 
              fontStyle: 'italic'
            }}>
              {disclaimers.reputation}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
