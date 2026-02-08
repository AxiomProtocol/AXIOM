import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { produceCyclesCopy, disclaimers } from '../lib/axiomHolderValue';
import { ProduceCycleCard } from '../components/holderValue';
import { web3Theme } from '../components/axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../components/axiomRebuild/ImmersiveCard';
import { trackOnce, track } from '../components/axiomRebuild/analytics';
import { RebuildNav } from '../components/axiomRebuild/RebuildNav';

export default function ProducePage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  const [userCredits, setUserCredits] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackOnce('holder_section_view', 'produce_page_view', { page: 'produce' });
  }, []);

  useEffect(() => {
    async function fetchCredits() {
      if (!isConnected || !address) {
        setUserCredits(0);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/participation/credits?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setUserCredits(data.credits);
        }
      } catch (err) {
        console.error('Failed to fetch credits:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCredits();
  }, [isConnected, address]);

  const handleReserve = async (cycleId: string) => {
    if (!address) return;
    
    track('produce_redeem_attempt', { cycleId, page: 'produce' });

    const res = await fetch('/api/participation/reserve-produce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        wallet: address, 
        cycleId, 
        credits: produceCyclesCopy.currentCycles.find(c => c.id === cycleId)?.creditsRequired 
      })
    });

    if (!res.ok) throw new Error('Reservation failed');
    
    track('produce_redeem_success', { cycleId, page: 'produce' });
  };

  return (
    <>
      <Head>
        <title>Produce Box Program | Axiom Protocol</title>
        <meta name="description" content={produceCyclesCopy.pageSubtitle} />
      </Head>
      <RebuildNav />
      
      <main style={{ 
        minHeight: '100vh', 
        background: '#FAFBFC',
        paddingTop: '80px'
      }}>
        <section style={{
          padding: '60px 24px 40px',
          background: 'linear-gradient(180deg, rgba(0, 212, 170, 0.08) 0%, transparent 100%)'
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
              {produceCyclesCopy.pageTitle}
            </h1>
            
            <p style={{ 
              fontSize: '18px', 
              color: '#6B7280', 
              maxWidth: '650px', 
              margin: '0 auto 32px',
              lineHeight: 1.6
            }}>
              {produceCyclesCopy.description}
            </p>

            {isConnected && (
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '12px',
                padding: '16px 28px',
                background: 'rgba(255,255,255,0.95)',
                borderRadius: web3Theme.radii.lg,
                boxShadow: web3Theme.shadows.card
              }}>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>Your Credits:</span>
                <span style={{ 
                  fontSize: '24px', 
                  fontWeight: 700, 
                  color: web3Theme.colors.primary 
                }}>
                  {loading ? '...' : userCredits}
                </span>
              </div>
            )}
          </div>
        </section>

        <section style={{ padding: '40px 24px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937', marginBottom: '24px' }}>
              How It Works
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '20px',
              marginBottom: '48px'
            }}>
              {produceCyclesCopy.howItWorks.map((step) => (
                <ImmersiveCard key={step.step} variant="glass" hover3D={false}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${web3Theme.colors.primary}15`,
                    borderRadius: web3Theme.radii.full,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: web3Theme.colors.primary,
                    marginBottom: '12px'
                  }}>
                    {step.step}
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', marginBottom: '6px' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.5, margin: 0 }}>
                    {step.description}
                  </p>
                </ImmersiveCard>
              ))}
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937', marginBottom: '24px' }}>
              Available Cycles
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', 
              gap: '24px' 
            }}>
              {produceCyclesCopy.currentCycles.map((cycle) => (
                <ProduceCycleCard
                  key={cycle.id}
                  cycle={cycle}
                  userCredits={userCredits}
                  onReserve={handleReserve}
                  isConnected={isConnected}
                />
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '40px 24px 60px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ 
              fontSize: '13px', 
              color: '#9CA3AF', 
              fontStyle: 'italic',
              padding: '16px',
              background: 'rgba(251, 191, 36, 0.08)',
              borderRadius: web3Theme.radii.md,
              border: '1px solid rgba(251, 191, 36, 0.2)'
            }}>
              ⚠️ {produceCyclesCopy.disclaimer}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
