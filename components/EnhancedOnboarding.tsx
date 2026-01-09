import React, { useState } from 'react';
import { useWallet } from './WalletConnect/WalletContext';
import { useRouter } from 'next/router';

interface EnhancedOnboardingProps {
  onComplete: () => void;
  onDismiss?: () => void;
}

const experienceLevels = [
  { id: 'new', label: 'New to Web3', description: 'Just getting started with blockchain and crypto', icon: '🌱' },
  { id: 'learning', label: 'Learning', description: 'Some experience, still exploring', icon: '📚' },
  { id: 'experienced', label: 'Experienced', description: 'Comfortable with DeFi and wallets', icon: '🚀' },
  { id: 'expert', label: 'Expert', description: 'Deep knowledge of blockchain tech', icon: '⭐' }
];

const interests = [
  { id: 'land', label: 'Land Stewardship', description: 'Acquire and develop land as a community', icon: '🌍', path: '/land-acquisition' },
  { id: 'keygrow', label: 'KeyGrow (Rent-to-Own)', description: 'Build ownership through monthly contributions', icon: '🏠', path: '/keygrow' },
  { id: 'susu', label: 'Savings Circles (SUSU)', description: 'Join community savings groups', icon: '💰', path: '/susu' },
  { id: 'governance', label: 'Community Governance', description: 'Vote on proposals and shape the future', icon: '🗳️', path: '/governance' },
  { id: 'training', label: 'Steward Corps Training', description: '12-month leadership development program', icon: '📚', path: '/steward-corps' },
  { id: 'staking', label: 'Staking & Rewards', description: 'Earn yields by participating in the protocol', icon: '🌾', path: '/staking' },
  { id: 'transparency', label: 'Transparency Reports', description: 'Track treasury and protocol activity', icon: '📊', path: '/transparency' },
  { id: 'nodes', label: 'Axiom Nodes', description: 'Run infrastructure and earn rewards', icon: '🖥️', path: '/nodes' }
];

const goals = [
  { id: 'ownership', label: 'Build Wealth & Ownership', icon: '🏆' },
  { id: 'community', label: 'Join a Community', icon: '🤝' },
  { id: 'learn', label: 'Learn About Web3', icon: '🎓' },
  { id: 'invest', label: 'Invest in Real Assets', icon: '💎' },
  { id: 'leadership', label: 'Develop Leadership Skills', icon: '👑' },
  { id: 'impact', label: 'Create Social Impact', icon: '🌱' }
];

export function EnhancedOnboarding({ onComplete, onDismiss }: EnhancedOnboardingProps) {
  const router = useRouter();
  const { walletState, connectMetaMask } = useWallet();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    experienceLevel: '',
    selectedInterests: [] as string[],
    selectedGoals: [] as string[],
    wantsNewsletter: true,
    referralCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 7;

  const updateFormData = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError('');
  };

  const toggleArrayItem = (key: 'selectedInterests' | 'selectedGoals', item: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter(i => i !== item)
        : [...prev[key], item]
    }));
  };

  const getRecommendedPaths = () => {
    return interests.filter(i => formData.selectedInterests.includes(i.id));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          walletAddress: walletState?.address
        })
      });
      localStorage.setItem('axiom_onboarding_complete', 'true');
      localStorage.setItem('axiom_user_interests', JSON.stringify(formData.selectedInterests));
      localStorage.setItem('axiom_user_name', formData.name);
      onComplete();
    } catch (err) {
      console.error('Failed to save onboarding:', err);
      onComplete();
    }
  };

  const navigateToPath = (path: string) => {
    handleComplete();
    router.push(path);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🌍</div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', marginBottom: '12px' }}>
              Welcome to Axiom Protocol
            </h2>
            <p style={{ fontSize: '16px', color: '#6B7280', maxWidth: '420px', margin: '0 auto 16px', lineHeight: 1.6 }}>
              Build wealth together through community land ownership, savings circles, and real economic infrastructure.
            </p>
            <div style={{ 
              background: '#F0FDF4', 
              border: '1px solid #BBF7D0', 
              borderRadius: '12px', 
              padding: '16px', 
              marginBottom: '32px',
              maxWidth: '380px',
              margin: '0 auto 32px'
            }}>
              <p style={{ fontSize: '14px', color: '#166534', margin: 0 }}>
                ✨ This quick setup takes about 2 minutes and helps us personalize your experience.
              </p>
            </div>
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
        );

      case 1:
        return (
          <div style={{ padding: '16px 0' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
              👋 Let's get to know you
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              Tell us a bit about yourself to personalize your experience.
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Your Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="What should we call you?"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Referral Code (Optional)
              </label>
              <input
                type="text"
                value={formData.referralCode}
                onChange={(e) => updateFormData('referralCode', e.target.value.toUpperCase())}
                placeholder="Enter code if you have one"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.wantsNewsletter}
                onChange={(e) => updateFormData('wantsNewsletter', e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                Send me updates about land opportunities and community news
              </span>
            </label>

            {error && (
              <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '14px', marginTop: '16px' }}>
                {error}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div style={{ padding: '16px 0' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
              📊 Your Experience Level
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              This helps us tailor content and recommendations for you.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {experienceLevels.map(level => (
                <button
                  key={level.id}
                  onClick={() => updateFormData('experienceLevel', level.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: formData.experienceLevel === level.id ? '#ECFDF5' : 'white',
                    border: `2px solid ${formData.experienceLevel === level.id ? '#10B981' : '#E5E7EB'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '32px' }}>{level.icon}</span>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>{level.label}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>{level.description}</div>
                  </div>
                  {formData.experienceLevel === level.id && (
                    <span style={{ marginLeft: 'auto', color: '#10B981', fontSize: '20px' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div style={{ padding: '16px 0' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
              🎯 What are your goals?
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              Select all that apply to help us show you the most relevant features.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {goals.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => toggleArrayItem('selectedGoals', goal.id)}
                  style={{
                    padding: '16px',
                    background: formData.selectedGoals.includes(goal.id) ? '#ECFDF5' : 'white',
                    border: `2px solid ${formData.selectedGoals.includes(goal.id) ? '#10B981' : '#E5E7EB'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{goal.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1F2937' }}>{goal.label}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div style={{ padding: '16px 0' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
              🧭 What interests you most?
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              Select the features you'd like to explore. We'll create a personalized starting point for you.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
              {interests.map(interest => (
                <button
                  key={interest.id}
                  onClick={() => toggleArrayItem('selectedInterests', interest.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px',
                    background: formData.selectedInterests.includes(interest.id) ? '#ECFDF5' : 'white',
                    border: `2px solid ${formData.selectedInterests.includes(interest.id) ? '#10B981' : '#E5E7EB'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{interest.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>{interest.label}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{interest.description}</div>
                  </div>
                  {formData.selectedInterests.includes(interest.id) && (
                    <span style={{ color: '#10B981', fontSize: '18px' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div style={{ padding: '16px 0' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
              🔗 Connect Your Wallet
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              Link your Web3 wallet to access governance voting, staking, and on-chain features.
            </p>
            
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {walletState?.isConnected ? (
                <div style={{
                  padding: '20px',
                  background: '#ECFDF5',
                  border: '2px solid #10B981',
                  borderRadius: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                  <div style={{ fontSize: '16px', color: '#059669', fontWeight: 600 }}>
                    Wallet Connected!
                  </div>
                  <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px', fontFamily: 'monospace' }}>
                    {walletState.address?.slice(0, 10)}...{walletState.address?.slice(-8)}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>🦊</div>
                  <button
                    onClick={async () => {
                      setLoading(true);
                      setError('');
                      try {
                        await connectMetaMask();
                      } catch (err) {
                        setError('Failed to connect wallet. Please try again.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    style={{
                      padding: '16px 32px',
                      background: 'linear-gradient(135deg, #F6851B 0%, #E2761B 100%)',
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
                  
                  <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
                    Don't have a wallet? You can still explore most features without one.
                  </p>
                </>
              )}
              
              {error && (
                <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '14px', marginTop: '16px' }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        );

      case 6:
        const recommendedPaths = getRecommendedPaths();
        return (
          <div style={{ padding: '16px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
                Welcome, {formData.name || 'Friend'}!
              </h2>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                Your personalized journey is ready. Here's where to start based on your interests:
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
                🚀 Recommended for You
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recommendedPaths.length > 0 ? recommendedPaths.slice(0, 3).map(item => (
                  <button
                    key={item.id}
                    onClick={() => navigateToPath(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px',
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>{item.label}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>{item.description}</div>
                    </div>
                    <span style={{ color: '#00A389', fontSize: '18px' }}>→</span>
                  </button>
                )) : (
                  <button
                    onClick={() => navigateToPath('/land-acquisition')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px',
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>🌍</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>Explore Land Opportunities</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>See available land campaigns</div>
                    </div>
                    <span style={{ color: '#00A389' }}>→</span>
                  </button>
                )}
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', 
              borderRadius: '12px', 
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#3730A3' }}>Quick Tip</div>
                  <div style={{ fontSize: '13px', color: '#4338CA' }}>
                    {formData.experienceLevel === 'new' || formData.experienceLevel === 'learning'
                      ? 'Check out the Steward Corps training program to learn the fundamentals of community wealth building.'
                      : 'Explore the Transparency page to see real-time protocol metrics and treasury activity.'}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #00A389 0%, #00897B 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 163, 137, 0.3)'
              }}
            >
              {loading ? 'Saving...' : 'Start Exploring'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() && formData.email.includes('@');
      case 2:
        return !!formData.experienceLevel;
      case 3:
        return formData.selectedGoals.length > 0;
      case 4:
        return formData.selectedInterests.length > 0;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (currentStep === 1 && !formData.email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setError('');
    setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1));
  };

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
        maxWidth: '540px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {currentStep > 0 && currentStep < totalSteps - 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>
                Step {currentStep} of {totalSteps - 2}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: totalSteps - 2 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      width: currentStep === i + 1 ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      background: i + 1 < currentStep ? '#10B981' : i + 1 === currentStep ? '#00A389' : '#E5E7EB',
                      transition: 'all 0.3s'
                    }}
                  />
                ))}
              </div>
            </div>
            {onDismiss && (
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
        )}
        
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {renderStep()}
        </div>

        {currentStep > 0 && currentStep < totalSteps - 1 && (
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB'
          }}>
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              style={{
                flex: 1,
                padding: '14px',
                background: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              style={{
                flex: 2,
                padding: '14px',
                background: canProceed() ? 'linear-gradient(135deg, #00A389 0%, #00897B 100%)' : '#E5E7EB',
                color: canProceed() ? 'white' : '#9CA3AF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: canProceed() ? 'pointer' : 'not-allowed'
              }}
            >
              {currentStep === 5 ? 'Finish Setup' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedOnboarding;
