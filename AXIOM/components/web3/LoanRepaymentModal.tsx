import React, { useState, useEffect } from 'react';
import { useWallet } from '../../lib/web3/useWallet';
import { makeLoanPayment, getAXUSDBalance, getExplorerTxUrl } from '../../lib/web3/transactionService';

interface Loan {
  loanId: number;
  principal: string;
  monthlyPayment: string;
  totalRepaid: string;
  paymentsCompleted: number;
  termMonths: number;
  nextPaymentDue: number;
}

interface LoanRepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
  onSuccess?: () => void;
}

type PaymentStep = 'confirm' | 'pending' | 'success' | 'error';

export default function LoanRepaymentModal({
  isOpen,
  onClose,
  loan,
  onSuccess
}: LoanRepaymentModalProps) {
  const { isConnected, isCorrectChain, signer, connect, switchToArbitrum } = useWallet();
  const [axusdBalance, setAxusdBalance] = useState('0');
  const [step, setStep] = useState<PaymentStep>('confirm');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && signer) {
      loadBalance();
    }
  }, [isOpen, signer]);

  const loadBalance = async () => {
    if (signer) {
      const balance = await getAXUSDBalance(signer);
      setAxusdBalance(balance);
    }
  };

  const handlePayment = async () => {
    if (!signer) return;

    if (parseFloat(axusdBalance) < parseFloat(loan.monthlyPayment)) {
      setError('Insufficient AXUSD balance for payment');
      return;
    }

    setStep('pending');
    setError(null);

    try {
      const result = await makeLoanPayment(signer, loan.loanId);

      if (result.success) {
        setTxHash(result.hash!);
        setStep('success');
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || 'Payment failed');
        setStep('error');
      }
    } catch (e: any) {
      setError(e.message || 'Payment failed');
      setStep('error');
    }
  };

  const resetModal = () => {
    setStep('confirm');
    setTxHash(null);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  const paymentsRemaining = loan.termMonths - loan.paymentsCompleted;
  const nextDueDate = new Date(loan.nextPaymentDue * 1000);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: '#ffffff', borderRadius: 16, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: 24, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Make Loan Payment</h2>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg style={{ width: 24, height: 24, color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Loan #{loan.loanId}</p>
        </div>

        <div style={{ padding: 24 }}>
          {!isConnected ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Connect Your Wallet</h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Connect your wallet to make a payment</p>
              <button onClick={connect} style={{ padding: '12px 32px', background: '#10b981', color: '#ffffff', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Connect Wallet
              </button>
            </div>
          ) : !isCorrectChain ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Wrong Network</h3>
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
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Payment Successful!</h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Your payment of {loan.monthlyPayment} AXUSD has been confirmed</p>
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
              <div style={{ width: 64, height: 64, border: '4px solid #e5e7eb', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Processing Payment</h3>
              <p style={{ color: '#6b7280' }}>Please wait...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 16 }}>LOAN SUMMARY</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Principal</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{parseFloat(loan.principal).toLocaleString()} AXUSD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Total Repaid</span>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>{parseFloat(loan.totalRepaid).toLocaleString()} AXUSD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Payments Made</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{loan.paymentsCompleted} / {loan.termMonths}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Payments Remaining</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{paymentsRemaining}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#ecfdf5', padding: 20, borderRadius: 12, marginBottom: 24, border: '1px solid #a7f3d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Payment Amount</p>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{parseFloat(loan.monthlyPayment).toLocaleString()} AXUSD</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Due Date</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{nextDueDate.toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                Your AXUSD Balance: <strong>{parseFloat(axusdBalance).toFixed(2)} AXUSD</strong>
              </p>

              {error && (
                <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={parseFloat(axusdBalance) < parseFloat(loan.monthlyPayment)}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: parseFloat(axusdBalance) < parseFloat(loan.monthlyPayment) ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  borderRadius: 8,
                  fontWeight: 600,
                  border: 'none',
                  cursor: parseFloat(axusdBalance) < parseFloat(loan.monthlyPayment) ? 'not-allowed' : 'pointer',
                  fontSize: 16
                }}
              >
                Pay {parseFloat(loan.monthlyPayment).toLocaleString()} AXUSD
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
