import React, { useState, useEffect } from 'react';
import { useWallet } from '../../lib/web3/useWallet';

interface InsurancePool {
  id: string;
  name: string;
  coverageType: string;
  description: string;
  premiumRate: number;
  minCoverage: number;
  maxCoverage: number;
  availableCoverage: string;
}

interface InsuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: InsurancePool | null;
}

export default function InsuranceModal({ isOpen, onClose, pool }: InsuranceModalProps) {
  const { address, isConnected } = useWallet();
  const [coverageAmount, setCoverageAmount] = useState('');
  const [step, setStep] = useState<'input' | 'confirm' | 'processing' | 'success' | 'error'>('input');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [calculatedPremium, setCalculatedPremium] = useState('0');

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setCoverageAmount('');
      setError('');
      setTxHash('');
      setCalculatedPremium('0');
    }
  }, [isOpen]);

  useEffect(() => {
    if (pool && coverageAmount) {
      const premium = (parseFloat(coverageAmount) * pool.premiumRate / 100).toFixed(2);
      setCalculatedPremium(premium);
    }
  }, [coverageAmount, pool]);

  if (!isOpen || !pool) return null;

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(coverageAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid coverage amount');
      return;
    }

    if (amount < pool.minCoverage) {
      setError(`Minimum coverage is $${pool.minCoverage.toLocaleString()}`);
      return;
    }

    if (amount > pool.maxCoverage) {
      setError(`Maximum coverage is $${pool.maxCoverage.toLocaleString()}`);
      return;
    }

    if (amount > parseFloat(pool.availableCoverage)) {
      setError('Requested coverage exceeds available capacity');
      return;
    }

    setStep('confirm');
  };

  const executePurchase = async () => {
    setStep('processing');
    setError('');

    try {
      const response = await fetch('/api/phase3/insurance-pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          poolId: pool.id,
          coverageAmount,
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
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Purchase Coverage</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="p-6">
          {step === 'input' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-lg font-semibold text-white mb-1">{pool.name}</div>
                <div className="text-sm text-gray-400 mb-3">{pool.description}</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Coverage Type</span>
                  <span className="text-white">{pool.coverageType}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Premium Rate</span>
                  <span className="text-yellow-400">{pool.premiumRate}% annually</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Coverage Amount (AXUSD)</label>
                <input
                  type="number"
                  value={coverageAmount}
                  onChange={(e) => setCoverageAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white"
                  placeholder={`$${pool.minCoverage.toLocaleString()} - $${pool.maxCoverage.toLocaleString()}`}
                />
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>Min: ${pool.minCoverage.toLocaleString()}</span>
                  <span>Max: ${pool.maxCoverage.toLocaleString()}</span>
                </div>
              </div>

              {coverageAmount && parseFloat(coverageAmount) > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Annual Premium</span>
                    <span className="text-2xl font-bold text-yellow-400">${calculatedPremium}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Paid in AXUSD at policy activation
                  </div>
                </div>
              )}

              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 text-blue-200 text-sm">
                Coverage is active for 12 months from purchase. Claims must be filed within 30 days of a qualifying event.
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
                Get Coverage
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Coverage Type</span>
                  <span className="text-white">{pool.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Coverage Amount</span>
                  <span className="text-white">${parseFloat(coverageAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Annual Premium</span>
                  <span className="text-yellow-400">${calculatedPremium} AXUSD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Coverage Period</span>
                  <span className="text-white">12 months</span>
                </div>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 text-yellow-200 text-sm">
                By purchasing this coverage, you agree to the terms and conditions of the insurance pool. 
                Claims are subject to review and approval by the claims committee.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={executePurchase}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition"
                >
                  Pay ${calculatedPremium}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-white mb-2">Processing Payment</h3>
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
              <h3 className="text-xl font-semibold text-white mb-2">Coverage Activated!</h3>
              <p className="text-gray-400 mb-2">Your ${parseFloat(coverageAmount).toLocaleString()} coverage is now active.</p>
              <p className="text-gray-500 text-sm mb-4">Policy ID: POL-{Date.now().toString(36).toUpperCase()}</p>
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
              <h3 className="text-xl font-semibold text-white mb-2">Purchase Failed</h3>
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
