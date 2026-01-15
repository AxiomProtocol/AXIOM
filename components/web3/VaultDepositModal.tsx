import React, { useState, useEffect } from 'react';
import { useWallet } from '../../lib/web3/useWallet';
import { getVaultPosition, approveVault, depositToVault, withdrawFromVault, PRODUCT_VAULTS } from '../../lib/web3/vaultService';
import { NETWORK_CONFIG } from '../../shared/contracts';

interface VaultDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  productKey: 'mortgage-notes' | 'savings' | 'rent-streams' | 'lending-fund';
  productName: string;
  targetApy?: string;
  minDeposit?: string;
  onSuccess?: () => void;
}

type TransactionStep = 'input' | 'approve' | 'deposit' | 'withdraw' | 'success' | 'error';
type ModalMode = 'deposit' | 'withdraw';

export default function VaultDepositModal({
  isOpen,
  onClose,
  productKey,
  productName,
  targetApy = '10-14%',
  minDeposit = '100',
  onSuccess
}: VaultDepositModalProps) {
  const { isConnected, isCorrectChain, address, connect, switchToArbitrum } = useWallet();
  const [mode, setMode] = useState<ModalMode>('deposit');
  const [amount, setAmount] = useState('');
  const [position, setPosition] = useState<any>(null);
  const [step, setStep] = useState<TransactionStep>('input');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedRisks, setAcceptedRisks] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && isConnected && address) {
      loadPosition();
    }
  }, [isOpen, isConnected, address]);

  const loadPosition = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const pos = await getVaultPosition(productKey, address);
      setPosition(pos);
    } catch (e) {
      console.error('Error loading position:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!address || !amount) return;

    const amountNum = parseFloat(amount);
    if (amountNum < parseFloat(minDeposit)) {
      setError(`Minimum deposit is ${minDeposit} AXUSD`);
      return;
    }
    if (position && amountNum > parseFloat(position.assetBalance)) {
      setError('Insufficient AXUSD balance');
      return;
    }

    setError(null);

    try {
      const currentAllowance = position ? parseFloat(position.allowance) : 0;
      const needsApprovalForAmount = currentAllowance < amountNum;
      
      if (needsApprovalForAmount) {
        setStep('approve');
        await approveVault(productKey, amount);
      }

      setStep('deposit');
      const result = await depositToVault(productKey, amount, address);
      setTxHash(result.txHash);
      setStep('success');
      if (onSuccess) onSuccess();
      loadPosition();
    } catch (e: any) {
      console.error('Deposit error:', e);
      setError(e.message || 'Transaction failed');
      setStep('error');
    }
  };

  const handleWithdraw = async () => {
    if (!address || !amount || !position) return;

    const amountNum = parseFloat(amount);
    if (amountNum > parseFloat(position.positionValue)) {
      setError('Withdrawal amount exceeds position value');
      return;
    }

    setError(null);
    setStep('withdraw');

    try {
      const sharesToWithdraw = (amountNum / parseFloat(position.positionValue)) * parseFloat(position.shares);
      const result = await withdrawFromVault(productKey, sharesToWithdraw.toString(), address);
      setTxHash(result.txHash);
      setStep('success');
      if (onSuccess) onSuccess();
      loadPosition();
    } catch (e: any) {
      console.error('Withdraw error:', e);
      setError(e.message || 'Withdrawal failed');
      setStep('error');
    }
  };

  const resetModal = () => {
    setAmount('');
    setStep('input');
    setTxHash(null);
    setError(null);
    setAcceptedRisks(false);
    setMode('deposit');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getExplorerUrl = (hash: string) => `https://arbiscan.io/tx/${hash}`;

  if (!isOpen) return null;

  const vault = PRODUCT_VAULTS[productKey];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: '#ffffff', borderRadius: 16, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: 24, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{productName}</h2>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg style={{ width: 24, height: 24, color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Target APY: {targetApy}</p>
        </div>

        <div style={{ padding: 24 }}>
          {!isConnected ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <svg style={{ width: 48, height: 48, color: '#d4af37', margin: '0 auto 16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Connect Your Wallet</h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Connect your wallet to invest in this product</p>
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
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Please switch to Arbitrum One</p>
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
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
                {mode === 'deposit' ? 'Deposit Successful!' : 'Withdrawal Successful!'}
              </h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>{amount} AXUSD has been {mode === 'deposit' ? 'deposited' : 'withdrawn'}</p>
              {txHash && (
                <a href={getExplorerUrl(txHash)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none', fontSize: 14 }}>
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
          ) : step === 'approve' || step === 'deposit' || step === 'withdraw' ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ width: 64, height: 64, border: '4px solid #e5e7eb', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
                {step === 'approve' ? 'Approving AXUSD...' : step === 'deposit' ? 'Processing Deposit...' : 'Processing Withdrawal...'}
              </h3>
              <p style={{ color: '#6b7280' }}>Please confirm in your wallet</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {position && parseFloat(position.positionValue) > 0 && (
                <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)', padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: '#92400e', fontWeight: 500 }}>Your Position</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>${parseFloat(position.positionValue).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#78716c' }}>
                    <span>Vault Shares</span>
                    <span>{parseFloat(position.shares).toFixed(4)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button
                  onClick={() => setMode('deposit')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: mode === 'deposit' ? '#111827' : '#f3f4f6',
                    color: mode === 'deposit' ? '#ffffff' : '#6b7280',
                    borderRadius: 8,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setMode('withdraw')}
                  disabled={!position || parseFloat(position?.positionValue || '0') === 0}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: mode === 'withdraw' ? '#111827' : '#f3f4f6',
                    color: mode === 'withdraw' ? '#ffffff' : '#6b7280',
                    borderRadius: 8,
                    fontWeight: 600,
                    border: 'none',
                    cursor: (!position || parseFloat(position?.positionValue || '0') === 0) ? 'not-allowed' : 'pointer',
                    opacity: (!position || parseFloat(position?.positionValue || '0') === 0) ? 0.5 : 1
                  }}
                >
                  Withdraw
                </button>
              </div>

              <div style={{ background: '#fef3c7', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                  <svg style={{ width: 20, height: 20, color: '#92400e', flexShrink: 0, marginTop: 2 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p style={{ fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>SEC Reg D 506(c) | Accredited Investors</p>
                    <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                      This is a high-risk investment. Past performance does not guarantee future results.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  {mode === 'deposit' ? 'Deposit' : 'Withdraw'} Amount (AXUSD)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={mode === 'deposit' ? `Min ${minDeposit} AXUSD` : 'Enter amount'}
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
                    onClick={() => setAmount(mode === 'deposit' ? position?.assetBalance || '0' : position?.positionValue || '0')}
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
                  {mode === 'deposit' 
                    ? `Wallet Balance: ${parseFloat(position?.assetBalance || '0').toFixed(2)} AXUSD`
                    : `Available: ${parseFloat(position?.positionValue || '0').toFixed(2)} AXUSD`
                  }
                </p>
              </div>

              <div style={{ marginBottom: 20, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Vault Contract</span>
                  <a 
                    href={`https://arbiscan.io/address/${vault?.address}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#3b82f6', fontSize: 12, textDecoration: 'none' }}
                  >
                    {vault?.address?.slice(0, 6)}...{vault?.address?.slice(-4)}
                  </a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Network</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 500 }}>Arbitrum One</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>Target APY</span>
                  <span style={{ color: '#10b981', fontSize: 14, fontWeight: 600 }}>{targetApy}</span>
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
                  I understand this is a high-risk investment and I may lose my entire investment.
                </span>
              </label>

              {error && (
                <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>
                </div>
              )}

              <button
                onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
                disabled={!amount || !acceptedRisks || loading}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: !amount || !acceptedRisks ? '#9ca3af' : mode === 'deposit' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  borderRadius: 8,
                  fontWeight: 600,
                  border: 'none',
                  cursor: !amount || !acceptedRisks ? 'not-allowed' : 'pointer',
                  fontSize: 16
                }}
              >
                {mode === 'deposit' ? `Deposit ${amount || '0'} AXUSD` : `Withdraw ${amount || '0'} AXUSD`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
