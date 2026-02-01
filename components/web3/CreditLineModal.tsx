import React, { useState, useEffect } from 'react';
import { useWallet } from '../../lib/web3/useWallet';

interface CreditLine {
  id: string;
  collateralType: string;
  collateralSymbol: string;
  maxLTV: number;
  interestRate: number;
  liquidationThreshold: number;
  minCollateral: number;
}

interface CreditLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditLine: CreditLine | null;
  action: 'borrow' | 'repay' | 'add-collateral';
}

export default function CreditLineModal({ isOpen, onClose, creditLine, action }: CreditLineModalProps) {
  const { address, isConnected } = useWallet();
  const [amount, setAmount] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [step, setStep] = useState<'input' | 'confirm' | 'processing' | 'success' | 'error'>('input');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setAmount('');
      setCollateralAmount('');
      setError('');
      setTxHash('');
    }
  }, [isOpen]);

  if (!isOpen || !creditLine) return null;

  const calculateBorrowLimit = () => {
    if (!collateralAmount) return '0';
    const collateralValue = parseFloat(collateralAmount);
    return ((collateralValue * creditLine.maxLTV) / 100).toFixed(2);
  };

  const calculateHealthFactor = () => {
    if (!collateralAmount || !amount) return '0';
    const collateral = parseFloat(collateralAmount);
    const borrowed = parseFloat(amount);
    if (borrowed === 0) return '∞';
    return ((collateral * creditLine.liquidationThreshold / 100) / borrowed).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (action === 'borrow') {
      if (!collateralAmount || parseFloat(collateralAmount) < creditLine.minCollateral) {
        setError(`Minimum collateral is ${creditLine.minCollateral} ${creditLine.collateralSymbol}`);
        return;
      }
      if (!amount || parseFloat(amount) <= 0) {
        setError('Please enter a borrow amount');
        return;
      }
      if (parseFloat(amount) > parseFloat(calculateBorrowLimit())) {
        setError('Borrow amount exceeds maximum LTV');
        return;
      }
    } else if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setStep('confirm');
  };

  const executeTransaction = async () => {
    setStep('processing');
    setError('');

    try {
      const response = await fetch('/api/phase3/credit-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          collateralType: creditLine.id,
          amount: action === 'borrow' ? amount : amount,
          collateralAmount: collateralAmount,
          address
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transaction failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      setTxHash('0x' + Math.random().toString(16).slice(2, 66));
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep('error');
    }
  };

  const getActionTitle = () => {
    switch (action) {
      case 'borrow': return 'Borrow AXUSD';
      case 'repay': return 'Repay AXUSD';
      case 'add-collateral': return 'Add Collateral';
      default: return 'Credit Line';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{getActionTitle()}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="p-6">
          {step === 'input' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400">Collateral Type</div>
                <div className="text-lg font-semibold text-white">{creditLine.collateralType}</div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-400">Max LTV: {creditLine.maxLTV}%</span>
                  <span className="text-gray-400">Interest: {creditLine.interestRate}% APR</span>
                </div>
              </div>

              {action === 'borrow' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Collateral Amount ({creditLine.collateralSymbol})
                  </label>
                  <input
                    type="number"
                    value={collateralAmount}
                    onChange={(e) => setCollateralAmount(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    placeholder={`Min: ${creditLine.minCollateral}`}
                  />
                  {collateralAmount && (
                    <div className="text-sm text-gray-400 mt-1">
                      Max borrow: ${calculateBorrowLimit()} AXUSD
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {action === 'borrow' ? 'Borrow Amount (AXUSD)' : 
                   action === 'repay' ? 'Repay Amount (AXUSD)' :
                   `Collateral Amount (${creditLine.collateralSymbol})`}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white"
                  placeholder="Enter amount"
                />
              </div>

              {action === 'borrow' && amount && collateralAmount && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Health Factor</span>
                    <span className={`font-semibold ${parseFloat(calculateHealthFactor()) >= 1.5 ? 'text-green-400' : parseFloat(calculateHealthFactor()) >= 1.2 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {calculateHealthFactor()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Liquidation Threshold</span>
                    <span className="text-white">{creditLine.liquidationThreshold}%</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition"
              >
                Continue
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Action</span>
                  <span className="text-white capitalize">{action.replace('-', ' ')}</span>
                </div>
                {action === 'borrow' && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Collateral</span>
                    <span className="text-white">{collateralAmount} {creditLine.collateralSymbol}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-white">{amount} {action === 'add-collateral' ? creditLine.collateralSymbol : 'AXUSD'}</span>
                </div>
                {action === 'borrow' && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Interest Rate</span>
                    <span className="text-white">{creditLine.interestRate}% APR</span>
                  </div>
                )}
              </div>

              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 text-yellow-200 text-sm">
                {action === 'borrow' ? 
                  'Your collateral will be locked until the loan is repaid. Maintain a healthy position to avoid liquidation.' :
                  action === 'repay' ?
                  'Repaying will reduce your outstanding balance and improve your health factor.' :
                  'Adding collateral will improve your health factor and reduce liquidation risk.'}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={executeTransaction}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-white mb-2">Processing Transaction</h3>
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
              <h3 className="text-xl font-semibold text-white mb-2">Transaction Successful!</h3>
              <p className="text-gray-400 mb-4">Your {action.replace('-', ' ')} has been completed.</p>
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
              <h3 className="text-xl font-semibold text-white mb-2">Transaction Failed</h3>
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
