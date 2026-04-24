import React, { useState } from 'react';
import PaymentPlanSelector from './PaymentPlanSelector';

interface QuickSignupFlowProps {
  isOpen: boolean;
  onClose: () => void;
  parcelName?: string;
  parcelId?: string;
  onComplete?: (data: SignupData) => void;
}

interface SignupData {
  email: string;
  firstName: string;
  lastName: string;
  plan: string;
  parcelId: string;
}

type Step = 'plan' | 'info' | 'confirm';

export default function QuickSignupFlow({
  isOpen,
  onClose,
  parcelName = 'Heritage Meadows',
  parcelId = 'parcel-1',
  onComplete
}: QuickSignupFlowProps) {
  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const planInfo = {
    weekly: { label: '$25/week', amount: 25 },
    monthly: { label: '$100/month', amount: 100 },
    annual: { label: '$1,200/year', amount: 1200 }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/land-funds/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          plan: selectedPlan,
          parcelId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create subscription');
      }

      const data = await response.json();
      onComplete?.({ email, firstName, lastName, plan: selectedPlan, parcelId });
      setStep('confirm');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 24,
        maxWidth: 480,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div style={{ padding: 32 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['plan', 'info', 'confirm'].map((s, idx) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 4,
                  background: step === s || 
                    (step === 'info' && idx === 0) || 
                    (step === 'confirm' && idx < 2)
                    ? '#d4af37' 
                    : '#e5e7eb'
                }}
              />
            ))}
          </div>

          {step === 'plan' && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                Choose Your Investment Plan
              </h2>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>
                Investing in {parcelName}
              </p>

              <PaymentPlanSelector
                selectedPlan={selectedPlan}
                onPlanSelect={setSelectedPlan}
                variant="cards"
              />

              <button
                onClick={() => setStep('info')}
                style={{
                  width: '100%',
                  marginTop: 24,
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
                  color: '#111827',
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Continue with {planInfo[selectedPlan as keyof typeof planInfo].label}
              </button>
            </>
          )}

          {step === 'info' && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                Your Information
              </h2>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>
                Quick setup - just email and name
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: '2px solid #e5e7eb',
                      fontSize: 16,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: 10,
                        border: '2px solid #e5e7eb',
                        fontSize: 16,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: 10,
                        border: '2px solid #e5e7eb',
                        fontSize: 16,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <p style={{ color: '#dc2626', fontSize: 14, textAlign: 'center' }}>{error}</p>
                )}

                <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#6b7280' }}>Investment Plan</span>
                    <span style={{ fontWeight: 600 }}>{planInfo[selectedPlan as keyof typeof planInfo].label}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Land Parcel</span>
                    <span style={{ fontWeight: 600 }}>{parcelName}</span>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !email || !firstName || !lastName}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: loading || !email || !firstName || !lastName 
                      ? '#d1d5db' 
                      : 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
                    color: '#111827',
                    borderRadius: 12,
                    border: 'none',
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading || !email || !firstName || !lastName ? 0.7 : 1
                  }}
                >
                  {loading ? 'Creating Account...' : 'Start Investing'}
                </button>

                <button
                  onClick={() => setStep('plan')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'transparent',
                    color: '#6b7280',
                    border: 'none',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  ← Back to Plan Selection
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 80,
                height: 80,
                background: '#d1fae5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <svg style={{ width: 40, height: 40, color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                Welcome to the Community!
              </h2>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>
                You're now an investor in {parcelName}. Check your email for next steps.
              </p>

              <div style={{
                background: '#f9fafb',
                borderRadius: 12,
                padding: 20,
                marginBottom: 24
              }}>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Your Investment Plan</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                  {planInfo[selectedPlan as keyof typeof planInfo].label}
                </p>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
                  color: '#111827',
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                View My Investment Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
