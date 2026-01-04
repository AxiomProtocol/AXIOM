import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { 
  publicCopy, 
  stewardCharter, 
  selectionStages, 
  privileges,
  roleStructure,
  calculateStewardEligibility,
  StewardStatus
} from '../lib/stewardCorps';
import { web3Theme } from '../components/axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../components/axiomRebuild/ImmersiveCard';
import { 
  StewardRoleCard, 
  StewardEligibilityBadge,
  StewardStatusIndicator 
} from '../components/stewardCorps';
import { trackOnce, track } from '../components/axiomRebuild/analytics';
import { RebuildNav } from '../components/axiomRebuild/RebuildNav';

export default function StewardCorpsPage() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  
  const [eligibility, setEligibility] = useState<{ eligible: boolean; checks: { ruleId: string; passed: boolean }[] } | null>(null);
  const [stewardStatus, setStewardStatus] = useState<StewardStatus>('none');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackOnce('steward_page_view', 'steward_corps_page_view', { page: 'steward-corps' });
  }, []);

  useEffect(() => {
    async function checkEligibility() {
      if (!isConnected || !address) {
        setEligibility(null);
        setStewardStatus('none');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/stewards/eligibility?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setEligibility(data.eligibility);
          setStewardStatus(data.status || 'none');
        } else {
          const mockEligibility = calculateStewardEligibility({
            isConnected: true,
            axmBalance: 0,
            holdingDays: 0,
            participationCount: 0
          });
          setEligibility(mockEligibility);
        }
      } catch (err) {
        console.error('Failed to check eligibility:', err);
      } finally {
        setLoading(false);
      }
    }

    checkEligibility();
  }, [isConnected, address]);

  const handleApplyClick = () => {
    track('steward_apply_click', { page: 'steward-corps' });
  };

  return (
    <>
      <Head>
        <title>{publicCopy.pageTitle} | Axiom Protocol</title>
        <meta name="description" content={publicCopy.subtitle} />
      </Head>
      <RebuildNav />
      
      <main style={{ 
        minHeight: '100vh', 
        background: '#FAFBFC',
        paddingTop: '80px'
      }}>
        <section style={{
          padding: '80px 24px 60px',
          background: 'linear-gradient(180deg, rgba(123, 104, 238, 0.08) 0%, transparent 100%)'
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              background: 'rgba(123, 104, 238, 0.1)',
              borderRadius: web3Theme.radii.full,
              marginBottom: '24px'
            }}>
              <span style={{ fontSize: '20px' }}>🛡️</span>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 600, 
                color: web3Theme.colors.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Elite Coordination Corps
              </span>
            </div>
            
            <h1 style={{ 
              fontSize: '48px', 
              fontWeight: 700, 
              color: '#1F2937',
              marginBottom: '16px',
              lineHeight: 1.1
            }}>
              {publicCopy.pageTitle}
            </h1>
            
            <p style={{ 
              fontSize: '24px', 
              color: web3Theme.colors.primary, 
              fontWeight: 500,
              marginBottom: '24px'
            }}>
              {publicCopy.subtitle}
            </p>

            {isConnected && stewardStatus !== 'none' && (
              <div style={{ marginBottom: '20px' }}>
                <StewardStatusIndicator status={stewardStatus} size="lg" />
              </div>
            )}
            
            <p style={{ 
              fontSize: '17px', 
              color: '#6B7280', 
              maxWidth: '700px', 
              margin: '0 auto',
              lineHeight: 1.7
            }}>
              {publicCopy.whatIs.body}
            </p>
          </div>
        </section>

        <section style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: 600, 
              color: '#1F2937', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              {publicCopy.whatStewardsDo.title}
            </h2>
            <p style={{
              fontSize: '15px',
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              {publicCopy.whatStewardsDo.emphasis}
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
              gap: '16px',
              marginBottom: '48px'
            }}>
              {publicCopy.whatStewardsDo.items.map((item, i) => (
                <ImmersiveCard key={i} variant="glass" hover3D={true}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `${web3Theme.colors.primary}15`,
                      borderRadius: web3Theme.radii.md,
                      fontSize: '18px'
                    }}>
                      {['🌾', '👥', '🔄', '🗺️', '📢'][i] || '✓'}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
                      {item}
                    </span>
                  </div>
                </ImmersiveCard>
              ))}
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.05) 0%, rgba(123, 104, 238, 0.05) 100%)',
              border: '1px solid rgba(0, 212, 170, 0.15)',
              borderRadius: web3Theme.radii.xl,
              padding: '32px',
              textAlign: 'center'
            }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 600, 
                color: '#1F2937',
                marginBottom: '12px'
              }}>
                {publicCopy.whyMatters.title}
              </h3>
              <p style={{ 
                fontSize: '15px', 
                color: '#6B7280',
                marginBottom: '16px',
                lineHeight: 1.6
              }}>
                {publicCopy.whyMatters.body}
              </p>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: 600, 
                color: web3Theme.colors.primary,
                margin: 0
              }}>
                {publicCopy.whyMatters.emphasis}
              </p>
            </div>
          </div>
        </section>

        <section style={{ padding: '60px 24px', background: 'rgba(0,0,0,0.02)' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: 600, 
              color: '#1F2937', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              Corps Principles
            </h2>
            <p style={{
              fontSize: '15px',
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              The foundation of steward conduct
            </p>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px',
              marginBottom: '48px'
            }}>
              {stewardCharter.principles.map((principle, i) => (
                <ImmersiveCard key={i} variant="gradient" hover3D={true}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: web3Theme.colors.primary,
                      color: '#FFFFFF',
                      borderRadius: '50%',
                      fontSize: '14px',
                      fontWeight: 700,
                      margin: '0 auto 12px'
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ 
                      fontSize: '14px', 
                      fontWeight: 500, 
                      color: '#1F2937',
                      margin: 0,
                      lineHeight: 1.5
                    }}>
                      {principle}
                    </p>
                  </div>
                </ImmersiveCard>
              ))}
            </div>

            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: 600, 
              color: '#1F2937', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              Role Structure
            </h2>
            <p style={{
              fontSize: '15px',
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              Roles are intentionally limited to preserve accountability
            </p>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '16px'
            }}>
              {roleStructure.map(role => (
                <StewardRoleCard key={role.type} role={role} />
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: 600, 
              color: '#1F2937', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              {publicCopy.privilegesSection.title}
            </h2>
            <p style={{
              fontSize: '15px',
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              {publicCopy.privilegesSection.note}
            </p>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: '16px'
            }}>
              {privileges.map(priv => (
                <ImmersiveCard key={priv.id} variant="glass" hover3D={true}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `${web3Theme.colors.accent}15`,
                      borderRadius: web3Theme.radii.md,
                      fontSize: '22px'
                    }}>
                      {priv.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ 
                        fontSize: '15px', 
                        fontWeight: 600, 
                        color: '#1F2937',
                        margin: '0 0 4px 0'
                      }}>
                        {priv.title}
                      </h4>
                      <p style={{ 
                        fontSize: '13px', 
                        color: '#6B7280',
                        margin: 0,
                        lineHeight: 1.5
                      }}>
                        {priv.description}
                      </p>
                    </div>
                  </div>
                </ImmersiveCard>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '60px 24px', background: 'rgba(0,0,0,0.02)' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: 600, 
              color: '#1F2937', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              Selection Process
            </h2>
            <p style={{
              fontSize: '15px',
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              Meeting eligibility does not guarantee acceptance
            </p>

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px'
            }}>
              {selectionStages.map((stage, i) => (
                <ImmersiveCard key={stage.stage} variant="glass" hover3D={false}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, ${web3Theme.colors.primary} 0%, ${web3Theme.colors.accent} 100%)`,
                      color: '#FFFFFF',
                      borderRadius: '50%',
                      fontSize: '18px',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {stage.stage}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '8px' }}>
                        <h4 style={{ 
                          fontSize: '16px', 
                          fontWeight: 600, 
                          color: '#1F2937',
                          margin: 0
                        }}>
                          {stage.name}
                        </h4>
                        <span style={{ 
                          fontSize: '13px', 
                          color: web3Theme.colors.primary
                        }}>
                          {stage.description}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '8px'
                      }}>
                        {stage.details.map((detail, j) => (
                          <span key={j} style={{
                            padding: '4px 10px',
                            background: 'rgba(0,0,0,0.04)',
                            borderRadius: web3Theme.radii.full,
                            fontSize: '12px',
                            color: '#4B5563'
                          }}>
                            {detail}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </ImmersiveCard>
              ))}
            </div>
          </div>
        </section>

        <section style={{ 
          padding: '80px 24px',
          background: `linear-gradient(135deg, ${web3Theme.colors.primary} 0%, ${web3Theme.colors.secondary} 100%)`
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ 
              fontSize: '32px', 
              fontWeight: 700, 
              color: '#FFFFFF', 
              marginBottom: '16px'
            }}>
              {publicCopy.howToApply.title}
            </h2>
            <p style={{
              fontSize: '17px',
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '24px'
            }}>
              {publicCopy.howToApply.body}
            </p>

            {isConnected && eligibility && (
              <div style={{ 
                display: 'inline-block',
                marginBottom: '24px'
              }}>
                <StewardEligibilityBadge checks={eligibility.checks} compact />
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '32px'
            }}>
              {publicCopy.howToApply.steps.map((step, i) => (
                <span key={i} style={{
                  padding: '6px 14px',
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: web3Theme.radii.full,
                  fontSize: '13px',
                  color: '#FFFFFF'
                }}>
                  {i + 1}. {step}
                </span>
              ))}
            </div>

            <Link 
              href="/stewards/apply"
              onClick={handleApplyClick}
              style={{
                display: 'inline-block',
                padding: '16px 40px',
                background: '#FFFFFF',
                color: web3Theme.colors.primary,
                borderRadius: web3Theme.radii.md,
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              {publicCopy.howToApply.cta}
            </Link>
          </div>
        </section>

        <section style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ 
              fontSize: '24px', 
              fontWeight: 600, 
              color: '#1F2937',
              fontStyle: 'italic',
              marginBottom: '24px'
            }}>
              {publicCopy.closing}
            </p>
            
            <p style={{ 
              fontSize: '13px', 
              color: '#9CA3AF',
              lineHeight: 1.6
            }}>
              {publicCopy.disclaimer}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
