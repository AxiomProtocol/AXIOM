import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../../lib/web3/useWallet';

interface KYCVerificationGateProps {
  children: React.ReactNode;
  onVerified?: () => void;
}

type GateStatus = 'loading' | 'unverified' | 'pending' | 'verified';

function mapVerificationStatus(verificationStatus: string | undefined): GateStatus {
  if (!verificationStatus) return 'unverified';
  if (verificationStatus === 'approved') return 'verified';
  if (verificationStatus === 'pending' || verificationStatus === 'under_review') return 'pending';
  return 'unverified';
}

export default function KYCVerificationGate({ children, onVerified }: KYCVerificationGateProps) {
  const { isConnected, address, connect } = useWallet();
  const [kycStatus, setKycStatus] = useState<GateStatus>('loading');

  const checkKYCStatus = useCallback(async () => {
    if (!address) {
      setKycStatus('unverified');
      return;
    }
    try {
      const res = await fetch('/api/kyc/verification');
      if (res.ok) {
        const data = await res.json();
        const next = mapVerificationStatus(data?.kycVerification?.verificationStatus);
        setKycStatus(next);
        if (next === 'verified' && onVerified) onVerified();
      } else {
        setKycStatus('unverified');
      }
    } catch {
      setKycStatus('unverified');
    }
  }, [address, onVerified]);

  // Initial check when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      checkKYCStatus();
    } else {
      setKycStatus('unverified');
    }
  }, [isConnected, address, checkKYCStatus]);

  // Re-check when the tab regains focus (user returns after completing Persona flow)
  // or when KYCVerificationPage signals completion via localStorage
  useEffect(() => {
    const onFocus = () => { if (isConnected && address) checkKYCStatus(); };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'kyc_status_dirty' && isConnected && address) checkKYCStatus();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [isConnected, address, checkKYCStatus]);

  if (kycStatus === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid #e5e7eb',
            borderTopColor: '#d4af37',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <p style={{ color: '#6b7280' }}>Checking verification status…</p>
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
        <div
          style={{
            width: 64,
            height: 64,
            background: '#fef3c7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <svg
            style={{ width: 32, height: 32, color: '#d97706' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
          Verification In Progress
        </h3>
        <p style={{ color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
          Your identity verification is being reviewed. You will receive an email once
          complete. This typically takes less than one business day.
        </p>
        <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: '#0369a1' }}>
            <strong>Status:</strong> Under Review
          </p>
        </div>
        <button
          onClick={checkKYCStatus}
          style={{
            padding: '10px 24px',
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Refresh Status
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: 48 }}>
        <svg
          style={{ width: 64, height: 64, color: '#d4af37', margin: '0 auto 24px' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
          Connect Your Wallet
        </h3>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Connect your wallet to begin the verification process.
        </p>
        <button
          onClick={connect}
          style={{
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
            color: '#111827',
            borderRadius: 8,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  // Unverified — wallet connected, no KYC
  return (
    <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: 48 }}>
      <div
        style={{
          width: 64,
          height: 64,
          background: '#fef3c7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <svg
          style={{ width: 32, height: 32, color: '#d97706' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
        Verification Required
      </h3>
      <p style={{ color: '#6b7280', marginBottom: 8, lineHeight: 1.6 }}>
        To access capital features, you must complete identity verification.
      </p>
      <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>
        This helps us comply with federal securities regulations.
      </p>
      <a
        href="/kyc"
        style={{
          display: 'inline-block',
          padding: '14px 32px',
          background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
          color: '#111827',
          borderRadius: 8,
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: 16,
        }}
      >
        Begin Verification
      </a>
    </div>
  );
}
