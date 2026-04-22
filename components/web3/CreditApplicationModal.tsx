import React, { useState, useEffect } from 'react';
import { useWallet } from '../../lib/web3/useWallet';
import { submitCreditApplication, getExplorerTxUrl } from '../../lib/web3/transactionService';

interface CreditApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditType: 'builder' | 'farmer';
  productName: string;
  maxLTV: number;
  interestRate: number;
  maxTermMonths: number;
  minCollateral: string;
  onSuccess?: () => void;
}

type ApplicationStep = 'form' | 'confirming' | 'pending' | 'success' | 'error';

export default function CreditApplicationModal({
  isOpen,
  onClose,
  creditType,
  productName,
  maxLTV,
  interestRate,
  maxTermMonths,
  minCollateral,
  onSuccess
}: CreditApplicationModalProps) {
  const { isConnected, isCorrectChain, signer, connect, switchToArbitrum } = useWallet();
  const [requestedAmount, setRequestedAmount] = useState('');
  const [collateralValue, setCollateralValue] = useState('');
  const [termMonths, setTermMonths] = useState('12');
  const [step, setStep] = useState<ApplicationStep>('form');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const maxBorrowable = collateralValue ? (parseFloat(collateralValue) * maxLTV / 100).toFixed(2) : '0';

  const handleSubmit = async () => {
    if (!signer || !requestedAmount || !collateralValue) return;

    const requestedNum = parseFloat(requestedAmount);
    const collateralNum = parseFloat(collateralValue);
    const termNum = parseInt(termMonths);

    if (collateralNum < parseFloat(minCollateral)) {
      setError(`Minimum collateral value is $${minCollateral}`);
      return;
    }

    if (requestedNum > collateralNum * maxLTV / 100) {
      setError(`Maximum borrowable amount is ${maxBorrowable} AXUSD (${maxLTV}% LTV)`);
      return;
    }

    if (termNum > maxTermMonths) {
      setError(`Maximum term is ${maxTermMonths} months`);
      return;
    }

    setStep('confirming');
    setError(null);

    try {
      setStep('pending');
      const result = await submitCreditApplication(
        signer,
        creditType,
        requestedAmount,
        collateralValue,
        termNum
      );

      if (result.success) {
        setTxHash(result.hash!);
        setStep('success');
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || 'Application failed');
        setStep('error');
      }
    } catch (e: any) {
      setError(e.message || 'Application failed');
      setStep('error');
    }
  };

  const resetModal = () => {
    setRequestedAmount('');
    setCollateralValue('');
    setTermMonths('12');
    setStep('form');
    setTxHash(null);
    setError(null);
    setAcceptedTerms(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  const colorScheme = creditType === 'builder' 
    ? { primary: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }
    : { primary: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: '#ffffff', borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: 24, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Apply for Credit</h2>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg style={{ width: 24, height: 24, color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p style={{ color: colorScheme.primary, fontSize: 14, marginTop: 4, fontWeight: 500 }}>{productName}</p>
        </div>

        <div style={{ padding: 24 }}>
          {!isConnected ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <svg style={{ width: 48, height: 48, color: colorScheme.primary, margin: '0 auto 16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Connect Your Wallet</h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Connect your wallet to submit a credit application</p>
              <button onClick={connect} style={{ padding: '12px 32px', background: colorScheme.gradient, color: '#ffffff', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Connect Wallet
              </button>
            </div>
          ) : !isCorrectChain ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <svg style={{ width: 48, height: 48, color: '#ef4444', margin: '0 auto 16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Wrong Network</h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Please switch to Arbitrum One to continue</p>
              <button onClick={switchToArbitrum} style={{ padding: '12px 32px', background: '#3b82f6', color: '#ffffff', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Switch to Arbitrum
              </button>
            </div>
          ) : step === 'success' ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ width: 64, height: 64, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg style={{ width: 32, height: 32, color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Application Submitted!</h3>
              <p style={{ color: '#6b7280', marginBottom: 16 }}>Your credit application for {requestedAmount} AXUSD has been submitted</p>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Our underwriting team will review your application within 2-3 business days.</p>
              {txHash && (
                <a href={getExplorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none', fontSize: 14 }}>
                  View on Arbiscan
                  <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              <button onClick={handleClose} style={{ display: 'block', width: '100%', marginTop: 24, padding: '12px 24px', background: '#111827', color: '#ffffff', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          ) : step === 'pending' ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ width: 64, height: 64, border: '4px solid #e5e7eb', borderTopColor: colorScheme.primary, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Submitting Application</h3>
              <p style={{ color: '#6b7280' }}>Please wait while your application is being recorded on-chain...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 8, marginBottom: 24, border: '1px solid #bae6fd' }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0369a1', marginBottom: 12 }}>Credit Terms</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#6b7280' }}>Max LTV</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{maxLTV}%</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#6b7280' }}>Interest Rate</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{interestRate}% APR</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#6b7280' }}>Max Term</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{maxTermMonths} months</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#6b7280' }}>Min Collateral</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>${parseFloat(minCollateral).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Collateral Value (USD)
                </label>
                <input
                  type="number"
                  value={collateralValue}
                  onChange={(e) => setCollateralValue(e.target.value)}
                  placeholder={`Min $${minCollateral}`}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
                />
                {collateralValue && (
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                    Maximum borrowable: <strong>{maxBorrowable} AXUSD</strong>
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Requested Amount (AXUSD)
                </label>
                <input
                  type="number"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Term Length (months)
                </label>
                <select
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box', background: '#ffffff' }}
                >
                  {[6, 12, 18, 24, 30, 36].filter(m => m <= maxTermMonths).map(m => (
                    <option key={m} value={m}>{m} months</option>
                  ))}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'start', gap: 12, marginBottom: 24, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  style={{ marginTop: 4 }}
                />
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                  I understand that this is a binding credit agreement. I agree to repay the loan according to the terms and acknowledge that failure to repay may result in collateral liquidation.
                </span>
              </label>

              {error && (
                <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!requestedAmount || !collateralValue || !acceptedTerms || step === 'confirming'}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: !requestedAmount || !collateralValue || !acceptedTerms ? '#9ca3af' : colorScheme.gradient,
                  color: '#ffffff',
                  borderRadius: 8,
                  fontWeight: 600,
                  border: 'none',
                  cursor: !requestedAmount || !collateralValue || !acceptedTerms ? 'not-allowed' : 'pointer',
                  fontSize: 16
                }}
              >
                {step === 'confirming' ? 'Confirm in Wallet...' : 'Submit Application'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
