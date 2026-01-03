import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { 
  accessTiers, 
  holderBenefitsCopy, 
  calculateTier,
  disclaimers
} from '../lib/axiomHolderValue';
import { AccessTierCard, EligibilityBadge, ParticipationQueueCard } from '../components/holderValue';
import { web3Theme } from '../components/axiomRebuild/styles/web3Theme';
import { trackOnce, track } from '../components/axiomRebuild/analytics';
import { RebuildNav } from '../components/axiomRebuild/RebuildNav';

export default function HoldersPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  const [userTier, setUserTier] = useState(0);
  const [daysHeld, setDaysHeld] = useState(0);
  const [actionsCompleted, setActionsCompleted] = useState(0);

  useEffect(() => {
    trackOnce('holder_section_view', 'holders_page_view', { page: 'holders' });
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      const firstSeen = localStorage.getItem(`axiom_first_seen_${address.toLowerCase()}`);
      if (!firstSeen) {
        localStorage.setItem(`axiom_first_seen_${address.toLowerCase()}`, Date.now().toString());
      }
      const firstSeenTime = parseInt(firstSeen || Date.now().toString());
      const days = Math.floor((Date.now() - firstSeenTime) / (1000 * 60 * 60 * 24));
      setDaysHeld(days);

      const actions = parseInt(localStorage.getItem(`axiom_actions_${address.toLowerCase()}`) || '0');
      setActionsCompleted(actions);

      const tier = calculateTier({
        isConnected: true,
        hasAXM: true,
        daysHeld: days,
        actionsCompleted: actions
      });
      setUserTier(tier);
    } else {
      setUserTier(0);
    }
  }, [isConnected, address]);

  const handleQueueAction = async (type: string) => {
    if (!address) return;
    
    const endpoint = type === 'land-cohort' 
      ? '/api/participation/interest'
      : type === 'produce-box'
        ? '/api/participation/reserve-produce'
        : '/api/participation/join-stewards';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: address, cycleId: 'spring-2026' })
    });

    if (!res.ok) throw new Error('Queue action failed');

    const newActions = actionsCompleted + 1;
    setActionsCompleted(newActions);
    localStorage.setItem(`axiom_actions_${address.toLowerCase()}`, newActions.toString());
  };

  return (
    <>
      <Head>
        <title>Holder Benefits | Axiom Protocol</title>
        <meta name="description" content={holderBenefitsCopy.pageSubtitle} />
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
          <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
            <Link href="/" style={{ 
              color: web3Theme.colors.primary, 
              fontSize: '14px', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '24px'
            }}>
              ← Back to Home
            </Link>
            
            <h1 style={{ 
              fontSize: '42px', 
              fontWeight: 700, 
              color: '#1F2937',
              marginBottom: '16px'
            }}>
              {holderBenefitsCopy.pageTitle}
            </h1>
            
            <p style={{ 
              fontSize: '18px', 
              color: '#6B7280', 
              maxWidth: '600px', 
              margin: '0 auto 24px',
              lineHeight: 1.6
            }}>
              {holderBenefitsCopy.heroDescription}
            </p>

            {isConnected && (
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '16px',
                padding: '16px 24px',
                background: 'rgba(255,255,255,0.9)',
                borderRadius: web3Theme.radii.lg,
                boxShadow: web3Theme.shadows.card
              }}>
                <EligibilityBadge tier={userTier} compact />
                <span style={{ fontSize: '14px', color: '#6B7280' }}>
                  {daysHeld} days held • {actionsCompleted} actions
                </span>
              </div>
            )}
          </div>
        </section>

        <section style={{ padding: '40px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
              {holderBenefitsCopy.sections.accessTiers.title}
            </h2>
            <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '32px' }}>
              {holderBenefitsCopy.sections.accessTiers.description}
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '24px' 
            }}>
              {accessTiers.map((tier) => (
                <AccessTierCard 
                  key={tier.tier} 
                  tier={tier} 
                  currentTier={userTier} 
                />
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '40px 24px', background: 'rgba(0,0,0,0.02)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
              {holderBenefitsCopy.sections.participationQueues.title}
            </h2>
            <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '32px' }}>
              {holderBenefitsCopy.sections.participationQueues.description}
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', 
              gap: '24px' 
            }}>
              <ParticipationQueueCard
                title="Land Project Cohort"
                description="Express interest in the next land acquisition and development cohort"
                icon="🌾"
                queueType="land-cohort"
                minTierRequired={2}
                currentTier={userTier}
                isConnected={isConnected}
                onAction={() => handleQueueAction('land-cohort')}
                page="holders"
              />
              <ParticipationQueueCard
                title="Produce Box Reservation"
                description="Reserve your slot for seasonal farm produce boxes"
                icon="📦"
                queueType="produce-box"
                totalSlots={100}
                filledSlots={23}
                minTierRequired={2}
                currentTier={userTier}
                isConnected={isConnected}
                onAction={() => handleQueueAction('produce-box')}
                page="holders"
              />
              <ParticipationQueueCard
                title="Steward Cohort"
                description="Join the waitlist for the next Steward training cohort"
                icon="🛡️"
                queueType="steward-cohort"
                minTierRequired={3}
                currentTier={userTier}
                isConnected={isConnected}
                onAction={() => handleQueueAction('steward-cohort')}
                page="holders"
              />
            </div>
          </div>
        </section>

        <section style={{ padding: '40px 24px 60px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '16px', 
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <Link href="/produce" style={{
                padding: '14px 28px',
                background: web3Theme.colors.gradientPrimary,
                color: '#FFF',
                borderRadius: web3Theme.radii.md,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '15px'
              }}>
                View Produce Cycles →
              </Link>
              <Link href="/stewards" style={{
                padding: '14px 28px',
                background: '#FFF',
                color: web3Theme.colors.primary,
                border: `2px solid ${web3Theme.colors.primary}`,
                borderRadius: web3Theme.radii.md,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '15px'
              }}>
                Stewardship Program →
              </Link>
              <Link href="/partners" style={{
                padding: '14px 28px',
                background: '#FFF',
                color: '#4B5563',
                border: '2px solid rgba(0,0,0,0.1)',
                borderRadius: web3Theme.radii.md,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '15px'
              }}>
                Partner Network →
              </Link>
            </div>

            <p style={{ 
              fontSize: '13px', 
              color: '#9CA3AF', 
              fontStyle: 'italic',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              {disclaimers.general} {disclaimers.eligibility}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
