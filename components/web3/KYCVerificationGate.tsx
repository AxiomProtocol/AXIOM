import React, { useState, useEffect } from 'react';
import { useWallet } from '../../lib/web3/useWallet';

interface KYCVerificationGateProps {
  children: React.ReactNode;
  onVerified?: () => void;
}

export default function KYCVerificationGate({ children, onVerified }: KYCVerificationGateProps) {
  const { isConnected, address, connect } = useWallet();
  const [kycStatus, setKycStatus] = useState<'loading' | 'unverified' | 'pending' | 'verified'>('loading');
  const [showKYCForm, setShowKYCForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    country: 'US',
    accredited: false,
    annualIncome: '',
    netWorth: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      checkKYCStatus();
    } else {
      setKycStatus('unverified');
    }
  }, [isConnected, address]);

  const checkKYCStatus = async () => {
    try {
      const res = await fetch(`/api/kyc/status?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        if (data.verified) {
          setKycStatus('verified');
          if (onVerified) onVerified();
        } else if (data.pending) {
          setKycStatus('pending');
        } else {
          setKycStatus('unverified');
        }
      } else {
        setKycStatus('unverified');
      }
    } catch (e) {
      setKycStatus('unverified');
    }
  };

  const handleSubmitKYC = async () => {
    if (!address) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, walletAddress: address })
      });
      
      if (res.ok) {
        setKycStatus('pending');
        setShowKYCForm(false);
      }
    } catch (e) {
      console.error('KYC submission error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (kycStatus === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ width: 48, height: 48, border: '3px solid #e5e7eb', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6b7280' }}>Checking verification status...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (kycStatus === 'verified') {
    return <>{children}</>;
  }

  if (kycStatus === 'pending') {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: 48 }}>
        <div style={{ width: 64, height: 64, background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg style={{ width: 32, height: 32, color: '#d97706' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Verification In Progress</h3>
        <p style={{ color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
          Your identity verification is being reviewed. This typically takes 1-2 business days. 
          You'll receive an email once your verification is complete.
        </p>
        <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 8 }}>
          <p style={{ fontSize: 14, color: '#0369a1' }}>
            <strong>Status:</strong> Under Review
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: 48 }}>
        <svg style={{ width: 64, height: 64, color: '#d4af37', margin: '0 auto 24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Connect Your Wallet</h3>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>Connect your wallet to begin the verification process</p>
        <button onClick={connect} style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)', color: '#111827', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 16 }}>
          Connect Wallet
        </button>
      </div>
    );
  }

  if (showKYCForm) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Identity Verification</h3>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>Complete this form to verify your identity for SEC-compliant investments</p>

        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Full Legal Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter your full legal name"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Country of Residence</label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box', background: '#ffffff' }}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Annual Income (USD)</label>
            <select
              value={formData.annualIncome}
              onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box', background: '#ffffff' }}
            >
              <option value="">Select range</option>
              <option value="0-50000">Less than $50,000</option>
              <option value="50000-100000">$50,000 - $100,000</option>
              <option value="100000-200000">$100,000 - $200,000</option>
              <option value="200000+">More than $200,000</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Net Worth (USD)</label>
            <select
              value={formData.netWorth}
              onChange={(e) => setFormData({ ...formData, netWorth: e.target.value })}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box', background: '#ffffff' }}
            >
              <option value="">Select range</option>
              <option value="0-100000">Less than $100,000</option>
              <option value="100000-500000">$100,000 - $500,000</option>
              <option value="500000-1000000">$500,000 - $1,000,000</option>
              <option value="1000000+">More than $1,000,000</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'start', gap: 12, cursor: 'pointer', padding: 16, background: '#f9fafb', borderRadius: 8 }}>
            <input
              type="checkbox"
              checked={formData.accredited}
              onChange={(e) => setFormData({ ...formData, accredited: e.target.checked })}
              style={{ marginTop: 4 }}
            />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>I am an accredited investor</p>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                Income over $200K/year ($300K joint) for 2 years, OR net worth over $1M (excluding primary residence)
              </p>
            </div>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            onClick={handleSubmitKYC}
            disabled={!formData.fullName || !formData.email || !formData.annualIncome || submitting}
            style={{
              flex: 1,
              padding: '14px 24px',
              background: !formData.fullName || !formData.email || !formData.annualIncome ? '#9ca3af' : 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
              color: '#111827',
              borderRadius: 8,
              fontWeight: 600,
              border: 'none',
              cursor: !formData.fullName || !formData.email ? 'not-allowed' : 'pointer',
              fontSize: 16
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Verification'}
          </button>
          <button
            onClick={() => setShowKYCForm(false)}
            style={{ padding: '14px 24px', background: '#f3f4f6', color: '#374151', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 16 }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: 48 }}>
      <div style={{ width: 64, height: 64, background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <svg style={{ width: 32, height: 32, color: '#d97706' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Verification Required</h3>
      <p style={{ color: '#6b7280', marginBottom: 8, lineHeight: 1.6 }}>
        To invest in SEC-compliant offerings, you must complete identity verification.
      </p>
      <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>This helps us comply with federal securities regulations.</p>
      <button
        onClick={() => setShowKYCForm(true)}
        style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)', color: '#111827', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 16 }}
      >
        Begin Verification
      </button>
    </div>
  );
}
