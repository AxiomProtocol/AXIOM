import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { partnerCopy, disclaimers, calculateTier } from '../lib/axiomHolderValue';
import { PartnerCard } from '../components/holderValue';
import { web3Theme } from '../components/axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../components/axiomRebuild/ImmersiveCard';
import { trackOnce } from '../components/axiomRebuild/analytics';
import { RebuildNav } from '../components/axiomRebuild/RebuildNav';

export default function PartnersPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  const [userTier, setUserTier] = useState(0);

  useEffect(() => {
    trackOnce('holder_section_view', 'partners_page_view', { page: 'partners' });
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      const firstSeen = localStorage.getItem(`axiom_first_seen_${address.toLowerCase()}`);
      const firstSeenTime = parseInt(firstSeen || Date.now().toString());
      const days = Math.floor((Date.now() - firstSeenTime) / (1000 * 60 * 60 * 24));
      const actions = parseInt(localStorage.getItem(`axiom_actions_${address.toLowerCase()}`) || '0');

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

  return (
    <>
      <Head>
        <title>Partner Network | Axiom Protocol</title>
        <meta name="description" content={partnerCopy.pageSubtitle} />
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
              {partnerCopy.pageTitle}
            </h1>
            
            <p style={{ 
              fontSize: '18px', 
              color: '#6B7280', 
              maxWidth: '650px', 
              margin: '0 auto',
              lineHeight: 1.6
            }}>
              {partnerCopy.description}
            </p>
          </div>
        </section>

        <section style={{ padding: '40px 24px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937', marginBottom: '24px' }}>
              Partner Categories
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
              {partnerCopy.partnerTypes.map((partner, i) => (
                <PartnerCard
                  key={i}
                  type={partner.type}
                  icon={partner.icon}
                  description={partner.description}
                  benefits={partner.benefits}
                  minTierRequired={i === 0 ? 2 : i === 1 ? 1 : 3}
                  currentTier={userTier}
                />
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '40px 24px', background: 'rgba(0,0,0,0.02)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <ImmersiveCard variant="glow" glowColor={`${web3Theme.colors.primary}20`} hover3D={false}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
                  {partnerCopy.becomePartner.title}
                </h2>
                <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '24px', lineHeight: 1.6 }}>
                  {partnerCopy.becomePartner.description}
                </p>
                
                <div style={{ 
                  textAlign: 'left', 
                  padding: '20px', 
                  background: 'rgba(0,0,0,0.03)', 
                  borderRadius: web3Theme.radii.md,
                  marginBottom: '24px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563', marginBottom: '12px' }}>
                    Requirements
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
                    {partnerCopy.becomePartner.requirements.map((req, i) => (
                      <li key={i} style={{ fontSize: '14px', color: '#4B5563', marginBottom: '8px', lineHeight: 1.5 }}>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href="mailto:partners@axiomprotocol.app"
                  style={{
                    display: 'inline-block',
                    padding: '14px 32px',
                    background: web3Theme.colors.gradientPrimary,
                    color: '#FFF',
                    borderRadius: web3Theme.radii.md,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '15px'
                  }}
                >
                  {partnerCopy.becomePartner.ctaLabel}
                </a>
              </div>
            </ImmersiveCard>
          </div>
        </section>

        <section style={{ padding: '40px 24px 60px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ 
              fontSize: '13px', 
              color: '#9CA3AF', 
              fontStyle: 'italic'
            }}>
              {partnerCopy.disclaimer}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
