import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../../../components/WalletConnect/WalletContext';
import { stewardCovenant, getTierById } from '../../../lib/stewardTraining';

export default function CovenantSigningPage() {
  const router = useRouter();
  const { walletState, connectMetaMask } = useWallet();
  const isConnected = walletState?.isConnected || false;
  const address = walletState?.address;

  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [acknowledgments, setAcknowledgments] = useState({
    read: false,
    understand: false,
    commit: false,
    lifetime: false,
    voluntary: false
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    async function checkEnrollment() {
      try {
        const res = await fetch(`/api/stewards/training/enrollment?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.enrollment) {
            setEnrollment(data.enrollment);
            if (data.enrollment.covenantSigned) {
              setSigned(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to check enrollment:', err);
      } finally {
        setLoading(false);
      }
    }
    checkEnrollment();
  }, [isConnected, address]);

  const allAcknowledged = Object.values(acknowledgments).every(Boolean);

  const handleSignCovenant = async () => {
    if (!allAcknowledged || !address) return;

    setSigning(true);
    setError(null);

    try {
      const res = await fetch('/api/stewards/training/sign-covenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          acknowledgments
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSigned(true);
      } else {
        setError(data.error || 'Failed to sign covenant. Please try again.');
      }
    } catch (err) {
      console.error('Sign covenant error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>Loading...</div>
        </div>
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Connect Your Wallet</h2>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>Connect your wallet to sign the Steward Covenant.</p>
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
        </div>
      </>
    );
  }

  if (signed) {
    const tier = enrollment ? getTierById(enrollment.tier) : null;
    return (
      <>
        <Head>
          <title>Welcome to the Steward Corps | Axiom Protocol</title>
        </Head>
        <main style={{ 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px'
        }}>
          <div style={{ 
            maxWidth: '600px', 
            textAlign: 'center',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🎓</div>
            <h1 style={{ 
              fontSize: '36px', 
              fontWeight: 700, 
              color: '#D4AF37',
              marginBottom: '16px'
            }}>
              Welcome to the Steward Corps
            </h1>
            <p style={{ 
              fontSize: '18px', 
              color: 'rgba(255,255,255,0.9)',
              marginBottom: '32px',
              lineHeight: 1.7
            }}>
              You have signed the Lifetime Steward Covenant. You are now a certified member of the 
              Axiom Steward Corps, entrusted with the sacred responsibility of land stewardship.
            </p>
            
            <div style={{
              background: 'rgba(212, 175, 55, 0.15)',
              border: '2px solid #D4AF37',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{tier?.badge || '⭐'}</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#D4AF37', marginBottom: '8px' }}>
                {tier?.name || 'Certified Steward'}
              </h3>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>
                {tier?.axusdReward.toLocaleString() || '2,000'} AXUSD Credited
              </p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                Your coordination credit has been added to your account
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <Link
                href="/stewards/dashboard"
                style={{
                  padding: '14px 28px',
                  background: '#D4AF37',
                  color: '#1a1a2e',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '16px'
                }}
              >
                Enter Steward Dashboard
              </Link>
              <Link
                href="/stewards/training/certificate"
                style={{
                  padding: '14px 28px',
                  background: 'transparent',
                  color: '#D4AF37',
                  border: '2px solid #D4AF37',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '16px'
                }}
              >
                View Certificate
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Sign the Steward Covenant | Axiom Protocol</title>
      </Head>

      <main style={{ minHeight: '100vh', background: '#F9FAFB', padding: '40px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link
            href="/stewards/training/dashboard"
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
            Back to Dashboard
          </Link>

          <div style={{
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📜</div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
              The Steward Covenant
            </h1>
            <p style={{ fontSize: '16px', color: '#6B7280' }}>
              A lifetime commitment to land stewardship and community service
            </p>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '20px' }}>
              Preamble
            </h2>
            <p style={{ 
              fontSize: '15px', 
              color: '#374151', 
              lineHeight: 1.8,
              marginBottom: '24px',
              fontStyle: 'italic'
            }}>
              {stewardCovenant.preamble}
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '20px' }}>
              The Six Commitments
            </h2>

            {stewardCovenant.commitments.map((commitment, i) => (
              <div 
                key={i}
                style={{
                  padding: '20px',
                  background: '#F9FAFB',
                  borderRadius: '12px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#D4AF37',
                    color: 'white',
                    borderRadius: '50%',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    {i + 1}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
                    {commitment.title}
                  </h3>
                </div>
                <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6, marginLeft: '44px' }}>
                  {commitment.text}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '20px' }}>
              Acknowledgments
            </h2>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={acknowledgments.read}
                onChange={(e) => setAcknowledgments(prev => ({ ...prev, read: e.target.checked }))}
                style={{ marginTop: '4px' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                I have read the entire Steward Covenant and understand its meaning.
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={acknowledgments.understand}
                onChange={(e) => setAcknowledgments(prev => ({ ...prev, understand: e.target.checked }))}
                style={{ marginTop: '4px' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                I understand this is a lifetime commitment that cannot be reversed.
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={acknowledgments.commit}
                onChange={(e) => setAcknowledgments(prev => ({ ...prev, commit: e.target.checked }))}
                style={{ marginTop: '4px' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                I commit to upholding all six principles of the Steward Covenant.
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={acknowledgments.lifetime}
                onChange={(e) => setAcknowledgments(prev => ({ ...prev, lifetime: e.target.checked }))}
                style={{ marginTop: '4px' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                I accept that this covenant extends for my lifetime as a Steward.
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={acknowledgments.voluntary}
                onChange={(e) => setAcknowledgments(prev => ({ ...prev, voluntary: e.target.checked }))}
                style={{ marginTop: '4px' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                I am signing this covenant voluntarily, without coercion.
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
            onClick={handleSignCovenant}
            disabled={!allAcknowledged || signing}
            style={{
              width: '100%',
              padding: '18px',
              background: allAcknowledged 
                ? 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)'
                : '#E5E7EB',
              color: allAcknowledged ? 'white' : '#9CA3AF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 700,
              cursor: allAcknowledged ? 'pointer' : 'not-allowed',
              opacity: signing ? 0.7 : 1
            }}
          >
            {signing ? 'Signing Covenant...' : 'Sign the Steward Covenant'}
          </button>

          <p style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center', marginTop: '16px' }}>
            By signing, you commit to the principles of land stewardship for life.
          </p>
        </div>
      </main>
    </>
  );
}
