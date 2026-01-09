import React, { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  component: React.ReactNode;
  isComplete: boolean;
}

interface EnhancedOnboardingProps {
  onComplete: () => void;
  onDismiss?: () => void;
}

export function EnhancedOnboarding({ onComplete, onDismiss }: EnhancedOnboardingProps) {
  const { walletState, connectMetaMask } = useWallet();
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const interests = [
    { id: 'land', label: 'Land Stewardship', icon: '🌍' },
    { id: 'treasury', label: 'Treasury & Savings', icon: '💰' },
    { id: 'governance', label: 'Community Governance', icon: '🗳️' },
    { id: 'training', label: 'Steward Training', icon: '📚' },
    { id: 'defi', label: 'DeFi & Staking', icon: '🌾' },
    { id: 'development', label: 'Infrastructure', icon: '🏗️' }
  ];

  const steps: OnboardingStep[] = [
    {
      id: 0,
      title: 'Welcome to Axiom',
      description: 'Let\'s get you set up in just a few steps',
      icon: '👋',
      isComplete: false,
      component: (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>🌍</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', marginBottom: '12px' }}>
            Welcome to Axiom Protocol
          </h2>
          <p style={{ fontSize: '16px', color: '#6B7280', maxWidth: '400px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            Join the movement to build sovereign, community-governed smart cities. 
            Let's personalize your experience.
          </p>
          <button
            onClick={() => setCurrentStep(1)}
            style={{
              padding: '16px 48px',
              background: 'linear-gradient(135deg, #00A389 0%, #00897B 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 163, 137, 0.3)'
            }}
          >
            Get Started
          </button>
        </div>
      )
    },
    {
      id: 1,
      title: 'Your Details',
      description: 'Tell us a bit about yourself',
      icon: '📝',
      isComplete: completedSteps.has(1),
      component: (
        <div style={{ padding: '24px 0' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00A389'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
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
                fontSize: '16px',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00A389'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
          {error && (
            <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '14px', marginBottom: '16px' }}>
              {error}
            </div>
          )}
          <button
            onClick={() => {
              if (!name.trim()) {
                setError('Please enter your name');
                return;
              }
              if (!email.includes('@')) {
                setError('Please enter a valid email');
                return;
              }
              setError('');
              setCompletedSteps(prev => new Set([...prev, 1]));
              setCurrentStep(2);
            }}
            disabled={!name || !email}
            style={{
              width: '100%',
              padding: '16px',
              background: name && email ? 'linear-gradient(135deg, #00A389 0%, #00897B 100%)' : '#E5E7EB',
              color: name && email ? 'white' : '#9CA3AF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: name && email ? 'pointer' : 'not-allowed'
            }}
          >
            Continue
          </button>
        </div>
      )
    },
    {
      id: 2,
      title: 'Connect Wallet',
      description: 'Link your Web3 wallet for on-chain features',
      icon: '🔗',
      isComplete: walletState?.isConnected || false,
      component: (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔗</div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
            Connect Your Wallet
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px', maxWidth: '350px', margin: '0 auto 24px' }}>
            Connect your MetaMask or compatible wallet to access governance, staking, and land ownership features.
          </p>
          {walletState?.isConnected ? (
            <div style={{
              padding: '16px',
              background: '#ECFDF5',
              border: '2px solid #10B981',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '14px', color: '#059669', fontWeight: 600 }}>
                ✓ Wallet Connected
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                {walletState.address?.slice(0, 6)}...{walletState.address?.slice(-4)}
              </div>
            </div>
          ) : (
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await connectMetaMask();
                  setCompletedSteps(prev => new Set([...prev, 2]));
                } catch (err) {
                  setError('Failed to connect wallet');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #7B68EE 0%, #6B5BC9 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {loading ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          )}
          <div>
            <button
              onClick={() => {
                setCompletedSteps(prev => new Set([...prev, 2]));
                setCurrentStep(3);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B7280',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {walletState?.isConnected ? 'Continue' : 'Skip for now'}
            </button>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Your Interests',
      description: 'What brings you to Axiom?',
      icon: '🎯',
      isComplete: completedSteps.has(3),
      component: (
        <div style={{ padding: '24px 0' }}>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
            Select the areas you're most interested in (choose at least one):
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {interests.map(interest => (
              <button
                key={interest.id}
                onClick={() => {
                  setSelectedInterests(prev => 
                    prev.includes(interest.id)
                      ? prev.filter(i => i !== interest.id)
                      : [...prev, interest.id]
                  );
                }}
                style={{
                  padding: '16px',
                  background: selectedInterests.includes(interest.id) ? '#ECFDF5' : 'white',
                  border: `2px solid ${selectedInterests.includes(interest.id) ? '#10B981' : '#E5E7EB'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{interest.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
                  {interest.label}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setCompletedSteps(prev => new Set([...prev, 3]));
              setCurrentStep(4);
            }}
            disabled={selectedInterests.length === 0}
            style={{
              width: '100%',
              padding: '16px',
              background: selectedInterests.length > 0 ? 'linear-gradient(135deg, #00A389 0%, #00897B 100%)' : '#E5E7EB',
              color: selectedInterests.length > 0 ? 'white' : '#9CA3AF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: selectedInterests.length > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            Continue
          </button>
        </div>
      )
    },
    {
      id: 4,
      title: 'All Set!',
      description: 'You\'re ready to explore Axiom',
      icon: '🎉',
      isComplete: false,
      component: (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>🎉</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', marginBottom: '12px' }}>
            Welcome, {name || 'Friend'}!
          </h2>
          <p style={{ fontSize: '16px', color: '#6B7280', maxWidth: '400px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            Your account is ready. Start exploring land opportunities, join savings circles, 
            or begin your steward training journey.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await fetch('/api/onboarding/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name,
                      email,
                      interests: selectedInterests,
                      walletAddress: walletState?.address
                    })
                  });
                  localStorage.setItem('axiom_onboarding_complete', 'true');
                  onComplete();
                } catch (err) {
                  console.error('Failed to save onboarding:', err);
                  onComplete();
                }
              }}
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #00A389 0%, #00897B 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 163, 137, 0.3)'
              }}
            >
              Start Exploring
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {steps.slice(1, -1).map((step, index) => (
              <div
                key={step.id}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: currentStep > index ? '#10B981' : currentStep === index + 1 ? '#00A389' : '#E5E7EB',
                  transition: 'background 0.3s'
                }}
              />
            ))}
          </div>
          {onDismiss && currentStep > 0 && currentStep < steps.length - 1 && (
            <button
              onClick={onDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ×
            </button>
          )}
        </div>
        
        <div style={{ padding: '24px' }}>
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F3F4F6',
                borderRadius: '12px',
                fontSize: '24px'
              }}>
                {steps[currentStep].icon}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937' }}>
                  {steps[currentStep].title}
                </h3>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                  {steps[currentStep].description}
                </p>
              </div>
            </div>
          )}
          
          {steps[currentStep].component}
          
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B7280',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnhancedOnboarding;
