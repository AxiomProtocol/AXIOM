import React, { useState, useEffect } from 'react';
import { useWallet } from '../../lib/web3/useWallet';
import { getAXUSDBalance } from '../../lib/web3/transactionService';

interface UserOnboardingProps {
  onComplete: () => void;
  requiredBalance?: number;
}

type OnboardingStep = 'wallet' | 'network' | 'balance' | 'complete';

export default function UserOnboarding({ onComplete, requiredBalance = 100 }: UserOnboardingProps) {
  const { isConnected, isCorrectChain, signer, address, connect, switchToArbitrum } = useWallet();
  const [axusdBalance, setAxusdBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (signer) {
      loadBalance();
    }
  }, [signer]);

  useEffect(() => {
    const currentStep = getCurrentStep();
    if (currentStep === 'complete') {
      onComplete();
    }
  }, [isConnected, isCorrectChain, axusdBalance]);

  const loadBalance = async () => {
    if (signer) {
      setLoading(true);
      try {
        const balance = await getAXUSDBalance(signer);
        setAxusdBalance(parseFloat(balance));
      } catch (e) {
        console.error('Error loading balance:', e);
      } finally {
        setLoading(false);
      }
    }
  };

  const getCurrentStep = (): OnboardingStep => {
    if (!isConnected) return 'wallet';
    if (!isCorrectChain) return 'network';
    if (axusdBalance < requiredBalance) return 'balance';
    return 'complete';
  };

  const step = getCurrentStep();
  const stepNumber = step === 'wallet' ? 1 : step === 'network' ? 2 : step === 'balance' ? 3 : 4;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8, textAlign: 'center' }}>
        Get Started with Axiom
      </h2>
      <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 40 }}>
        Complete these steps to start investing
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
        {[1, 2, 3].map((num) => (
          <div key={num} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 16,
              background: num < stepNumber ? '#10b981' : num === stepNumber ? 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)' : '#e5e7eb',
              color: num <= stepNumber ? '#ffffff' : '#9ca3af'
            }}>
              {num < stepNumber ? (
                <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : num}
            </div>
            {num < 3 && (
              <div style={{
                width: 60,
                height: 2,
                background: num < stepNumber ? '#10b981' : '#e5e7eb'
              }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ background: '#f9fafb', borderRadius: 16, padding: 32 }}>
        {step === 'wallet' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg style={{ width: 32, height: 32, color: '#d97706' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Connect Your Wallet</h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Connect MetaMask or another Web3 wallet to get started</p>
            </div>
            <button
              onClick={connect}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                color: '#111827',
                borderRadius: 8,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              Connect Wallet
            </button>
          </>
        )}

        {step === 'network' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg style={{ width: 32, height: 32, color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Switch to Arbitrum One</h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Axiom runs on Arbitrum One for fast, low-cost transactions</p>
            </div>
            <button
              onClick={switchToArbitrum}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                borderRadius: 8,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              Switch Network
            </button>
          </>
        )}

        {step === 'balance' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg style={{ width: 32, height: 32, color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Fund Your Wallet</h3>
              <p style={{ color: '#6b7280', marginBottom: 16 }}>You need at least {requiredBalance} AXUSD to invest</p>
              <div style={{ background: '#ffffff', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Current Balance</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: axusdBalance >= requiredBalance ? '#10b981' : '#ef4444' }}>
                  {loading ? '...' : `${axusdBalance.toFixed(2)} AXUSD`}
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <a
                href="https://app.uniswap.org"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  padding: '14px 24px',
                  background: '#111827',
                  color: '#ffffff',
                  borderRadius: 8,
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                  fontSize: 16
                }}
              >
                Get AXUSD on Uniswap
              </a>
              <button
                onClick={loadBalance}
                disabled={loading}
                style={{
                  padding: '14px 24px',
                  background: '#f3f4f6',
                  color: '#374151',
                  borderRadius: 8,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16
                }}
              >
                {loading ? 'Checking...' : 'Refresh Balance'}
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 32, padding: 20, background: '#f0f9ff', borderRadius: 12 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0369a1', marginBottom: 12 }}>What is AXUSD?</h4>
        <p style={{ fontSize: 14, color: '#0369a1', lineHeight: 1.6 }}>
          AXUSD is Axiom's stablecoin, pegged 1:1 to USD. All investments on the platform are made using AXUSD for stability and transparency.
        </p>
      </div>
    </div>
  );
}
