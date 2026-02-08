import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { trainingTiers, getTierById, TrainingTier } from '../../../lib/stewardTraining';

export default function TrainingEnrollPage() {
  const router = useRouter();
  const { tier: tierParam } = router.query;
  const { walletState, connectMetaMask } = useWallet();
  const isConnected = walletState?.isConnected || false;
  const address = walletState?.address;

  const [selectedTier, setSelectedTier] = useState<TrainingTier | null>(null);
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    motivation: '',
    experience: '',
    availability: ''
  });

  const [scholarshipForm, setScholarshipForm] = useState({
    reason: '',
    financialSituation: '',
    commitment: ''
  });

  const [acknowledgments, setAcknowledgments] = useState({
    commitment: false,
    nonRefundable: false,
    covenant: false
  });

  useEffect(() => {
    if (tierParam && typeof tierParam === 'string') {
      const tier = getTierById(tierParam);
      if (tier) {
        setSelectedTier(tier);
      }
    }
  }, [tierParam]);

  useEffect(() => {
    async function loadProgram() {
      try {
        const res = await fetch('/api/stewards/training/programs');
        if (res.ok) {
          const data = await res.json();
          if (data.programs && data.programs.length > 0) {
            setActiveProgram(data.programs[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load training programs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProgram();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleScholarshipChange = (field: string, value: string) => {
    setScholarshipForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAcknowledgmentChange = (field: string, checked: boolean) => {
    setAcknowledgments(prev => ({ ...prev, [field]: checked }));
  };

  const isFormComplete = 
    form.fullName.trim().length >= 2 &&
    form.email.includes('@') &&
    form.motivation.trim().length >= 50 &&
    acknowledgments.commitment &&
    acknowledgments.nonRefundable &&
    acknowledgments.covenant;

  const isScholarshipComplete = 
    isFormComplete &&
    scholarshipForm.reason.trim().length >= 50 &&
    scholarshipForm.commitment.trim().length >= 30;

  const handleEnroll = async () => {
    if (!selectedTier || !isConnected || !address) return;
    
    setEnrolling(true);
    setError(null);

    try {
      const res = await fetch('/api/stewards/training/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: activeProgram?.id || 1,
          tier: selectedTier.id,
          walletAddress: address,
          application: form,
          scholarshipInfo: selectedTier.id === 'scholarship' ? scholarshipForm : null
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else if (selectedTier.id === 'scholarship') {
          router.push('/stewards/training/scholarship-submitted');
        } else {
          router.push('/stewards/training/dashboard');
        }
      } else {
        setError(data.error || 'Enrollment failed. Please try again.');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <>
        <div style={{ 
          minHeight: '60vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Enroll in Training | Steward Corps | Axiom Protocol</title>
        <meta name="description" content="Complete your enrollment in the Steward Corps Training Program." />
      </Head>

      <main style={{ minHeight: '100vh', background: '#F9FAFB', padding: '40px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link 
            href="/stewards/training"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              color: '#00A389',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '24px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Training Overview
          </Link>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
                Enroll in Steward Corps Training
              </h1>
              {activeProgram && (
                <p style={{ fontSize: '16px', color: '#6B7280' }}>
                  {activeProgram.name}
                </p>
              )}
            </div>

            {!selectedTier ? (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
                  Select Your Training Tier
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {trainingTiers.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      style={{
                        padding: '20px',
                        background: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{tier.badge}</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>{tier.name}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: tier.color }}>{tier.displayPrice}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: `${selectedTier.color}15`,
                  borderRadius: '12px',
                  marginBottom: '32px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>{selectedTier.badge}</span>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937' }}>
                        {selectedTier.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6B7280' }}>
                        {selectedTier.id === 'scholarship' ? 'Scholarship Application' : 'Full Program Access'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: selectedTier.color }}>
                      {selectedTier.displayPrice}
                    </div>
                    <button
                      onClick={() => setSelectedTier(null)}
                      style={{
                        fontSize: '13px',
                        color: '#6B7280',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Change tier
                    </button>
                  </div>
                </div>

                {!isConnected ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
                    <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
                      Connect Your Wallet
                    </h3>
                    <p style={{ fontSize: '15px', color: '#6B7280', marginBottom: '24px' }}>
                      Connect your wallet to proceed with enrollment
                    </p>
                    <button
                      onClick={() => connectMetaMask()}
                      style={{
                        padding: '14px 28px',
                        background: '#00A389',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Connect Wallet
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
                        Your Information
                      </h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={form.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              fontSize: '15px'
                            }}
                            placeholder="Your full legal name"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                            Email *
                          </label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              fontSize: '15px'
                            }}
                            placeholder="your@email.com"
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                          Phone (Optional)
                        </label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '15px'
                          }}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                          Why do you want to become a Steward? * (min 50 characters)
                        </label>
                        <textarea
                          value={form.motivation}
                          onChange={(e) => handleInputChange('motivation', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '15px',
                            minHeight: '100px',
                            resize: 'vertical'
                          }}
                          placeholder="Describe your motivation for joining the Steward Corps..."
                        />
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                          {form.motivation.length}/50 characters minimum
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                          Relevant Experience (Optional)
                        </label>
                        <textarea
                          value={form.experience}
                          onChange={(e) => handleInputChange('experience', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '15px',
                            minHeight: '80px',
                            resize: 'vertical'
                          }}
                          placeholder="Any relevant experience in agriculture, community organizing, or land management..."
                        />
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                          Availability
                        </label>
                        <input
                          type="text"
                          value={form.availability}
                          onChange={(e) => handleInputChange('availability', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '15px'
                          }}
                          placeholder="e.g., Weekends, Evenings, Full-time available"
                        />
                      </div>
                    </div>

                    {selectedTier.id === 'scholarship' && (
                      <div style={{ 
                        marginBottom: '24px',
                        padding: '20px',
                        background: 'rgba(0, 163, 137, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 163, 137, 0.2)'
                      }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
                          Scholarship Application
                        </h3>
                        
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                            Why are you applying for a scholarship? * (min 50 characters)
                          </label>
                          <textarea
                            value={scholarshipForm.reason}
                            onChange={(e) => handleScholarshipChange('reason', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              fontSize: '15px',
                              minHeight: '80px',
                              resize: 'vertical'
                            }}
                            placeholder="Explain why you need financial assistance..."
                          />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                            How will you demonstrate your commitment? * (min 30 characters)
                          </label>
                          <textarea
                            value={scholarshipForm.commitment}
                            onChange={(e) => handleScholarshipChange('commitment', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              fontSize: '15px',
                              minHeight: '80px',
                              resize: 'vertical'
                            }}
                            placeholder="Describe how you'll demonstrate exceptional commitment..."
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ 
                      marginBottom: '24px',
                      padding: '20px',
                      background: '#FFFBEB',
                      borderRadius: '12px',
                      border: '1px solid #FCD34D'
                    }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400E', marginBottom: '16px' }}>
                        Required Acknowledgments
                      </h3>
                      
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={acknowledgments.commitment}
                          onChange={(e) => handleAcknowledgmentChange('commitment', e.target.checked)}
                          style={{ marginTop: '4px' }}
                        />
                        <span style={{ fontSize: '14px', color: '#78350F' }}>
                          I understand this is a lifetime commitment to the Steward Corps and its principles.
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={acknowledgments.nonRefundable}
                          onChange={(e) => handleAcknowledgmentChange('nonRefundable', e.target.checked)}
                          style={{ marginTop: '4px' }}
                        />
                        <span style={{ fontSize: '14px', color: '#78350F' }}>
                          I understand the training fee is non-refundable once I begin the program.
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={acknowledgments.covenant}
                          onChange={(e) => handleAcknowledgmentChange('covenant', e.target.checked)}
                          style={{ marginTop: '4px' }}
                        />
                        <span style={{ fontSize: '14px', color: '#78350F' }}>
                          I have read and agree to sign the Steward Covenant upon graduation.
                        </span>
                      </label>
                    </div>

                    {error && (
                      <div style={{
                        padding: '12px 16px',
                        background: '#FEE2E2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        color: '#DC2626',
                        fontSize: '14px',
                        marginBottom: '24px'
                      }}>
                        {error}
                      </div>
                    )}

                    <button
                      onClick={handleEnroll}
                      disabled={
                        enrolling || 
                        (selectedTier.id === 'scholarship' ? !isScholarshipComplete : !isFormComplete)
                      }
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: (selectedTier.id === 'scholarship' ? isScholarshipComplete : isFormComplete)
                          ? `linear-gradient(135deg, ${selectedTier.color} 0%, ${selectedTier.id === 'premium' ? '#B8860B' : selectedTier.color} 100%)`
                          : '#E5E7EB',
                        color: (selectedTier.id === 'scholarship' ? isScholarshipComplete : isFormComplete) ? 'white' : '#9CA3AF',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '18px',
                        fontWeight: 600,
                        cursor: (selectedTier.id === 'scholarship' ? isScholarshipComplete : isFormComplete) ? 'pointer' : 'not-allowed',
                        opacity: enrolling ? 0.7 : 1
                      }}
                    >
                      {enrolling 
                        ? 'Processing...' 
                        : selectedTier.id === 'scholarship'
                          ? 'Submit Scholarship Application'
                          : `Proceed to Payment - ${selectedTier.displayPrice}`
                      }
                    </button>

                    <p style={{ 
                      fontSize: '13px', 
                      color: '#6B7280', 
                      textAlign: 'center',
                      marginTop: '16px'
                    }}>
                      By enrolling, you agree to our Terms of Service and Privacy Policy.
                      {selectedTier.id !== 'scholarship' && ' Payments are processed securely via Stripe.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
