import React, { useState, useEffect } from 'react';
import { useWallet } from '../../lib/web3/useWallet';
import { getAXUSDBalance, getAXUSDAllowance, investInCampaign, getExplorerTxUrl } from '../../lib/web3/transactionService';
import { LAND_ACQUISITION_CONTRACTS } from '../../shared/contracts';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: number;
  campaignTitle: string;
  minInvestment?: string;
  maxInvestment?: string;
  onSuccess?: () => void;
}

type TransactionStep = 'input' | 'confirming' | 'pending' | 'success' | 'error';

export default function InvestmentModal({
  isOpen,
  onClose,
  campaignId,
  campaignTitle,
  minInvestment = '100',
  maxInvestment = '10000',
  onSuccess
}: InvestmentModalProps) {
  const { isConnected, isCorrectChain, signer, address, connect, switchToArbitrum } = useWallet();
  const [amount, setAmount] = useState('');
  const [axusdBalance, setAxusdBalance] = useState('0');
  const [step, setStep] = useState<TransactionStep>('input');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kycVerified, setKycVerified] = useState(true);
  const [acceptedRisks, setAcceptedRisks] = useState(false);
  const [effectiveMin, setEffectiveMin] = useState(minInvestment);
  const [effectiveMax, setEffectiveMax] = useState(maxInvestment);

  useEffect(() => {
    if (isOpen && signer) {
      loadBalance();
      checkKYC();
      loadCampaignLimits();
    }
  }, [isOpen, signer, address]);

  const loadCampaignLimits = async () => {
    try {
      const res = await fetch(`/api/phase2/campaign/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.minInvestment) setEffectiveMin(data.minInvestment);
        if (data.maxInvestment) setEffectiveMax(data.maxInvestment);
      }
    } catch (e) {
      console.log('Using default investment limits');
    }
  };

  const loadBalance = async () => {
    if (signer) {
      const balance = await getAXUSDBalance(signer);
      setAxusdBalance(balance);
    }
  };

  const checkKYC = async () => {
    if (address) {
      try {
        const res = await fetch(`/api/kyc/status?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          setKycVerified(data.verified || false);
        }
      } catch (e) {
        setKycVerified(false);
      }
    }
  };

  const handleInvest = async () => {
    if (!signer || !amount) return;

    if (campaignId <= 0) {
      setError('Invalid campaign. Please select a valid funding campaign.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum < parseFloat(effectiveMin)) {
      setError(`Minimum investment is ${effectiveMin} AXUSD`);
      return;
    }
    if (amountNum > parseFloat(effectiveMax)) {
      setError(`Maximum investment is ${effectiveMax} AXUSD`);
      return;
    }
    if (amountNum > parseFloat(axusdBalance)) {
      setError('Insufficient AXUSD balance');
      return;
    }

    setStep('confirming');
    setError(null);

    try {
      setStep('pending');
      const result = await investInCampaign(signer, campaignId, amount);

      if (result.success) {
        setTxHash(result.hash!);
        setStep('success');
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || 'Transaction failed');
        setStep('error');
      }
    } catch (e: any) {
      setError(e.message || 'Transaction failed');
      setStep('error');
    }
  };

  const resetModal = () => {
    setAmount('');
    setStep('input');
    setTxHash(null);
    setError(null);
    setAcceptedRisks(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: '#ffffff', borderRadius: 16, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: 24, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Invest in Campaign</h2>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg style={{ width: 24, height: 24, color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{campaignTitle}</p>
        </div>

        <div style={{ padding: 24 }}>
          {!isConnected ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <svg style={{ width: 48, height: 48, color: '#d4af37', margin: '0 auto 16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Connect Your Wallet</h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Connect your wallet to invest in this campaign</p>
              <button onClick={connect} style={{ padding: '12px 32px', background: '#d4af37', color: '#111827', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
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
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Investment Successful!</h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Your investment of {amount} AXUSD has been confirmed</p>
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
              <div style={{ width: 64, height: 64, border: '4px solid #e5e7eb', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Processing Investment</h3>
              <p style={{ color: '#6b7280' }}>Please wait while your transaction is being confirmed...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              <div style={{ background: '#fef3c7', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                  <svg style={{ width: 20, height: 20, color: '#92400e', flexShrink: 0, marginTop: 2 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p style={{ fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>SEC Reg CF Risk Disclosure</p>
                    <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                      This is a high-risk investment. You may lose your entire investment. Only invest what you can afford to lose. Past performance is not indicative of future results.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Investment Amount (AXUSD)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min ${minInvestment} AXUSD`}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      paddingRight: 80,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 16,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    onClick={() => setAmount(axusdBalance)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      padding: '4px 12px',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#6b7280',
                      cursor: 'pointer'
                    }}
                  >
                    MAX
                  </button>
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                  Balance: {parseFloat(axusdBalance).toFixed(2)} AXUSD
                </p>
              </div>

              <div style={{ marginBottom: 20, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Min Investment</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 500 }}>{effectiveMin} AXUSD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Max Investment</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 500 }}>{effectiveMax} AXUSD</span>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'start', gap: 12, marginBottom: 24, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={acceptedRisks}
                  onChange={(e) => setAcceptedRisks(e.target.checked)}
                  style={{ marginTop: 4 }}
                />
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                  I understand this is a high-risk investment and I may lose my entire investment. I have read and accept the risk disclosures.
                </span>
              </label>

              {error && (
                <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>
                </div>
              )}

              <button
                onClick={handleInvest}
                disabled={!amount || !acceptedRisks || step === 'confirming'}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: !amount || !acceptedRisks ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  borderRadius: 8,
                  fontWeight: 600,
                  border: 'none',
                  cursor: !amount || !acceptedRisks ? 'not-allowed' : 'pointer',
                  fontSize: 16
                }}
              >
                {step === 'confirming' ? 'Confirm in Wallet...' : `Invest ${amount || '0'} AXUSD`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
