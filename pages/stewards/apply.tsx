import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../../components/WalletConnect/WalletContext';
import { 
  publicCopy, 
  pledgeText,
  eligibilityRules,
  calculateStewardEligibility,
  StewardStatus
} from '../../lib/stewardCorps';
import { web3Theme } from '../../components/axiomRebuild/styles/web3Theme';
import { ImmersiveCard } from '../../components/axiomRebuild/ImmersiveCard';
import { 
  StewardEligibilityBadge,
  StewardPledgeModal,
  StewardStatusIndicator
} from '../../components/stewardCorps';
import { track } from '../../components/axiomRebuild/analytics';
import { RebuildNav } from '../../components/axiomRebuild/RebuildNav';

export default function StewardApplyPage() {
  const router = useRouter();
  const { walletState, connectMetaMask } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  
  const [eligibility, setEligibility] = useState<{ eligible: boolean; checks: { ruleId: string; passed: boolean }[] } | null>(null);
  const [stewardStatus, setStewardStatus] = useState<StewardStatus>('none');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  
  const [form, setForm] = useState({
    motivation: '',
    localKnowledge: '',
    availability: '',
    responsibility: ''
  });

  useEffect(() => {
    track('steward_apply_page_view', { page: 'steward-apply' });
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

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const isFormComplete = 
    form.motivation.trim().length >= 50 && 
    form.localKnowledge.trim().length >= 30 && 
    form.availability.trim().length >= 20 &&
    form.responsibility.trim().length >= 30;

  const handleSubmitApplication = () => {
    if (!isFormComplete || !eligibility?.eligible) return;
    setShowPledgeModal(true);
  };

  const handlePledgeAccept = async () => {
    if (!address) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/stewards/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address,
          application: form
        })
      });

      if (res.ok) {
        setApplicationSubmitted(true);
        setStewardStatus('applicant');
        track('steward_application_submitted', { wallet: address });
      } else {
        console.error('Application submission failed');
      }
    } catch (err) {
      console.error('Failed to submit application:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (applicationSubmitted || stewardStatus !== 'none') {
    return (
      <>
        <Head>
          <title>Application Status | Axiom Steward Corps</title>
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
          <div style={{ 
            maxWidth: '500px', 
            margin: '0 auto', 
            padding: '24px',
            textAlign: 'center'
          }}>
            <ImmersiveCard variant="glow" glowColor={`${web3Theme.colors.primary}20`}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                {stewardStatus === 'applicant' ? '📨' : stewardStatus === 'probationary' ? '🎓' : '🛡️'}
              </div>
              
              <StewardStatusIndicator status={stewardStatus} size="lg" />
              
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 700, 
                color: '#1F2937',
                margin: '20px 0 12px'
              }}>
                {stewardStatus === 'applicant' 
                  ? 'Application Received'
                  : stewardStatus === 'probationary'
                  ? 'Probationary Steward'
                  : 'Full Steward'
                }
              </h2>
              
              <p style={{ 
                fontSize: '15px', 
                color: '#6B7280',
                marginBottom: '24px',
                lineHeight: 1.6
              }}>
                {stewardStatus === 'applicant' 
                  ? 'Your application is under review. You will be notified of next steps.'
                  : stewardStatus === 'probationary'
                  ? 'You are in your 90-day probation period. Access your dashboard to track progress.'
                  : 'You have full steward access. Thank you for your service.'
                }
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Link 
                  href="/stewards"
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    border: `1px solid ${web3Theme.colors.primary}`,
                    color: web3Theme.colors.primary,
                    borderRadius: web3Theme.radii.md,
                    fontSize: '14px',
                    fontWeight: 500,
                    textDecoration: 'none'
                  }}
                >
                  Back to Corps
                </Link>
                {(stewardStatus === 'probationary' || stewardStatus === 'full') && (
                  <Link 
                    href="/stewards/dashboard"
                    style={{
                      padding: '12px 24px',
                      background: web3Theme.colors.primary,
                      color: '#FFFFFF',
                      borderRadius: web3Theme.radii.md,
                      fontSize: '14px',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    Steward Dashboard
                  </Link>
                )}
              </div>
            </ImmersiveCard>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Apply | Axiom Steward Corps</title>
        <meta name="description" content="Apply to join the Axiom Steward Corps" />
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
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <Link href="/stewards" style={{ 
              color: web3Theme.colors.primary, 
              fontSize: '14px', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '24px'
            }}>
              ← Back to Steward Corps
            </Link>
            
            <h1 style={{ 
              fontSize: '36px', 
              fontWeight: 700, 
              color: '#1F2937',
              marginBottom: '16px'
            }}>
              {publicCopy.howToApply.cta}
            </h1>
            
            <p style={{ 
              fontSize: '16px', 
              color: '#6B7280', 
              maxWidth: '550px', 
              margin: '0 auto',
              lineHeight: 1.6
            }}>
              Complete the application below. Steward roles are limited and require demonstrated commitment.
            </p>
          </div>
        </section>

        <section style={{ padding: '40px 24px 60px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {!isConnected ? (
              <ImmersiveCard variant="glass">
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: 600, 
                    color: '#1F2937',
                    marginBottom: '12px'
                  }}>
                    Connect Your Wallet
                  </h3>
                  <p style={{ 
                    fontSize: '14px', 
                    color: '#6B7280',
                    marginBottom: '24px'
                  }}>
                    Connect your wallet to check eligibility and begin your application.
                  </p>
                  <button
                    onClick={() => connectMetaMask()}
                    style={{
                      padding: '14px 32px',
                      background: web3Theme.colors.primary,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: web3Theme.radii.md,
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Connect Wallet
                  </button>
                </div>
              </ImmersiveCard>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {eligibility && (
                  <StewardEligibilityBadge checks={eligibility.checks} />
                )}

                {eligibility && !eligibility.eligible ? (
                  <ImmersiveCard variant="glass">
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: '#1F2937',
                        marginBottom: '8px'
                      }}>
                        Not Yet Eligible
                      </h3>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#6B7280',
                        marginBottom: '16px'
                      }}>
                        Complete the eligibility requirements above to unlock the application.
                      </p>
                      <Link 
                        href="/holders"
                        style={{
                          color: web3Theme.colors.primary,
                          fontSize: '14px',
                          fontWeight: 500,
                          textDecoration: 'none'
                        }}
                      >
                        View Holder Benefits →
                      </Link>
                    </div>
                  </ImmersiveCard>
                ) : (
                  <ImmersiveCard variant="glass">
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: 600, 
                      color: '#1F2937',
                      marginBottom: '24px'
                    }}>
                      Application Form
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <label style={{ 
                          display: 'block',
                          fontSize: '14px', 
                          fontWeight: 500, 
                          color: '#1F2937',
                          marginBottom: '8px'
                        }}>
                          Why do you want to become a Steward? *
                        </label>
                        <textarea
                          value={form.motivation}
                          onChange={(e) => handleInputChange('motivation', e.target.value)}
                          placeholder="Describe your motivation for joining the Steward Corps... (min 50 characters)"
                          style={{
                            width: '100%',
                            minHeight: '100px',
                            padding: '12px 16px',
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: web3Theme.radii.md,
                            fontSize: '14px',
                            lineHeight: 1.5,
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                          {form.motivation.length}/50 min characters
                        </div>
                      </div>

                      <div>
                        <label style={{ 
                          display: 'block',
                          fontSize: '14px', 
                          fontWeight: 500, 
                          color: '#1F2937',
                          marginBottom: '8px'
                        }}>
                          Describe your local knowledge and community connections *
                        </label>
                        <textarea
                          value={form.localKnowledge}
                          onChange={(e) => handleInputChange('localKnowledge', e.target.value)}
                          placeholder="What region are you in? What community connections do you have?..."
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '12px 16px',
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: web3Theme.radii.md,
                            fontSize: '14px',
                            lineHeight: 1.5,
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ 
                          display: 'block',
                          fontSize: '14px', 
                          fontWeight: 500, 
                          color: '#1F2937',
                          marginBottom: '8px'
                        }}>
                          What is your availability for coordination activities? *
                        </label>
                        <textarea
                          value={form.availability}
                          onChange={(e) => handleInputChange('availability', e.target.value)}
                          placeholder="Hours per week, preferred times, etc..."
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            padding: '12px 16px',
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: web3Theme.radii.md,
                            fontSize: '14px',
                            lineHeight: 1.5,
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ 
                          display: 'block',
                          fontSize: '14px', 
                          fontWeight: 500, 
                          color: '#1F2937',
                          marginBottom: '8px'
                        }}>
                          Acknowledge your willingness to accept responsibility *
                        </label>
                        <textarea
                          value={form.responsibility}
                          onChange={(e) => handleInputChange('responsibility', e.target.value)}
                          placeholder="How do you understand the responsibilities of a Steward?..."
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '12px 16px',
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: web3Theme.radii.md,
                            fontSize: '14px',
                            lineHeight: 1.5,
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ 
                      marginTop: '32px',
                      paddingTop: '24px',
                      borderTop: '1px solid rgba(0,0,0,0.06)'
                    }}>
                      <button
                        onClick={handleSubmitApplication}
                        disabled={!isFormComplete || submitting}
                        style={{
                          width: '100%',
                          padding: '16px 32px',
                          background: isFormComplete ? web3Theme.colors.primary : '#E5E7EB',
                          color: isFormComplete ? '#FFFFFF' : '#9CA3AF',
                          border: 'none',
                          borderRadius: web3Theme.radii.md,
                          fontSize: '16px',
                          fontWeight: 600,
                          cursor: isFormComplete && !submitting ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {submitting ? 'Submitting...' : 'Continue to Pledge'}
                      </button>
                      <p style={{
                        fontSize: '12px',
                        color: '#9CA3AF',
                        textAlign: 'center',
                        marginTop: '12px'
                      }}>
                        You will be asked to accept the Steward Pledge before submission
                      </p>
                    </div>
                  </ImmersiveCard>
                )}
              </div>
            )}
          </div>
        </section>

        <StewardPledgeModal
          isOpen={showPledgeModal}
          onClose={() => setShowPledgeModal(false)}
          onAccept={handlePledgeAccept}
        />
      </main>
    </>
  );
}
