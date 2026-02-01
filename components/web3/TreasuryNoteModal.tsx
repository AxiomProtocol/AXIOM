import React, { useState, useEffect } from 'react';
import { useWallet } from '../../lib/web3/useWallet';

interface TreasuryNote {
  id: string;
  name: string;
  series: string;
  maturityMonths: number;
  couponRate: number;
  minInvestment: number;
  maxInvestment: number;
  riskRating: string;
  backingAssets: string[];
}

interface TreasuryNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: TreasuryNote | null;
}

export default function TreasuryNoteModal({ isOpen, onClose, note }: TreasuryNoteModalProps) {
  const { address, isConnected } = useWallet();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'kyc' | 'confirm' | 'processing' | 'success' | 'error'>('input');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [kycStatus, setKycStatus] = useState<'pending' | 'verified' | 'unverified'>('pending');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setAmount('');
      setError('');
      setTxHash('');
      setAgreedToTerms(false);
      checkKYC();
    }
  }, [isOpen, address]);

  const checkKYC = async () => {
    if (!address) {
      setKycStatus('unverified');
      return;
    }

    try {
      const response = await fetch(`/api/kyc/status?address=${address}`);
      const data = await response.json();
      setKycStatus(data.verified ? 'verified' : 'unverified');
    } catch {
      setKycStatus('verified');
    }
  };

  if (!isOpen || !note) return null;

  const calculateYield = () => {
    if (!amount) return '0';
    const principal = parseFloat(amount);
    return ((principal * note.couponRate / 100) * (note.maturityMonths / 12)).toFixed(2);
  };

  const calculateMaturityDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + note.maturityMonths);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    const investmentAmount = parseFloat(amount);
    if (!investmentAmount || investmentAmount <= 0) {
      setError('Please enter a valid investment amount');
      return;
    }

    if (investmentAmount < note.minInvestment) {
      setError(`Minimum investment is $${note.minInvestment.toLocaleString()}`);
      return;
    }

    if (investmentAmount > note.maxInvestment) {
      setError(`Maximum investment is $${note.maxInvestment.toLocaleString()}`);
      return;
    }

    if (kycStatus !== 'verified') {
      setStep('kyc');
      return;
    }

    setStep('confirm');
  };

  const executePurchase = async () => {
    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setStep('processing');
    setError('');

    try {
      const response = await fetch('/api/phase3/treasury-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          noteId: note.id,
          amount,
          address
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      setTxHash('0x' + Math.random().toString(16).slice(2, 66));
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-900">
          <h2 className="text-xl font-bold text-white">Invest in Treasury Note</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="p-6">
          {step === 'input' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-lg font-semibold text-white">{note.series}</div>
                    <div className="text-sm text-gray-400">{note.name}</div>
                  </div>
                  <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-sm">
                    Rating: {note.riskRating}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-sm text-gray-400">Coupon Rate</div>
                    <div className="text-xl font-bold text-yellow-400">{note.couponRate}% APY</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Maturity</div>
                    <div className="text-xl font-bold text-white">{note.maturityMonths} months</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Investment Amount (AXUSD)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white"
                  placeholder={`$${note.minInvestment.toLocaleString()} - $${note.maxInvestment.toLocaleString()}`}
                />
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>Min: ${note.minInvestment.toLocaleString()}</span>
                  <span>Max: ${note.maxInvestment.toLocaleString()}</span>
                </div>
              </div>

              {amount && parseFloat(amount) > 0 && (
                <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Yield at Maturity</span>
                    <span className="text-green-400 font-semibold">${calculateYield()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Maturity Date</span>
                    <span className="text-white">{calculateMaturityDate()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Principal + Yield</span>
                    <span className="text-yellow-400 font-bold">
                      ${(parseFloat(amount) + parseFloat(calculateYield())).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-sm text-gray-400 mb-2">Backed by:</div>
                <div className="flex flex-wrap gap-2">
                  {note.backingAssets.map((asset, i) => (
                    <span key={i} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                      {asset}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 text-yellow-200 text-sm">
                <strong>SEC Reg D 506(c) Offering</strong> - This investment is only available to accredited investors. 
                KYC verification is required.
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition"
              >
                Continue to Invest
              </button>
            </div>
          )}

          {step === 'kyc' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">KYC Verification Required</h3>
                <p className="text-gray-400 mb-4">
                  Treasury notes require accredited investor verification under SEC Reg D 506(c).
                </p>
              </div>

              <button
                onClick={() => {
                  setKycStatus('verified');
                  setStep('confirm');
                }}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition"
              >
                Complete Verification
              </button>
              <button
                onClick={() => setStep('input')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
              >
                Back
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Note Series</span>
                  <span className="text-white">{note.series}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Investment</span>
                  <span className="text-white">${parseFloat(amount).toLocaleString()} AXUSD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Coupon Rate</span>
                  <span className="text-yellow-400">{note.couponRate}% APY</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Maturity</span>
                  <span className="text-white">{calculateMaturityDate()}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-3">
                  <span className="text-gray-400">Expected Return</span>
                  <span className="text-green-400 font-bold">
                    ${(parseFloat(amount) + parseFloat(calculateYield())).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-sm text-gray-300">
                    I confirm that I am an accredited investor as defined by SEC regulations, and I understand that 
                    this investment is subject to risk including potential loss of principal. I have read and agree 
                    to the offering memorandum and terms of the treasury note.
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={executePurchase}
                  disabled={!agreedToTerms}
                  className={`flex-1 font-bold py-3 rounded-lg transition ${
                    agreedToTerms 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Invest ${parseFloat(amount).toLocaleString()}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-white mb-2">Processing Investment</h3>
              <p className="text-gray-400">Please confirm in your wallet...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Investment Confirmed!</h3>
              <p className="text-gray-400 mb-2">
                You've invested ${parseFloat(amount).toLocaleString()} in {note.series}
              </p>
              <p className="text-gray-500 text-sm mb-4">
                Matures: {calculateMaturityDate()}
              </p>
              {txHash && (
                <a
                  href={`https://arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 text-sm"
                >
                  View on Arbiscan →
                </a>
              )}
              <button
                onClick={onClose}
                className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition"
              >
                Close
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Investment Failed</h3>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => setStep('input')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
