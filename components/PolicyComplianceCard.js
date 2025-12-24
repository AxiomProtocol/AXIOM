import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export default function PolicyComplianceCard({ poolId, contributionAmount, onComplianceCheck, compact = false }) {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const checkCompliance = async () => {
    if (!walletState?.address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/policy/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletState.address,
          poolContributionAmount: contributionAmount || 100,
          poolId
        })
      });
      
      const data = await response.json();
      setResult(data);
      
      if (onComplianceCheck) {
        onComplianceCheck(data);
      }
    } catch (err) {
      setError('Failed to check compliance');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletState?.address) {
      checkCompliance();
    }
  }, [walletState?.address, poolId, contributionAmount]);

  if (!walletState?.address) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <p className="text-gray-400 text-sm">Connect wallet to view membership status</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
          <p className="text-gray-400">Checking membership status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-red-500/30 rounded-xl p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  const getReputationColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getReputationLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Low';
    return 'Poor';
  };

  if (compact) {
    return (
      <div className={`rounded-lg p-3 ${result.passed ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {result.passed ? <CheckIcon /> : <XIcon />}
            <span className={`text-sm font-medium ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
              {result.passed ? 'Eligible to Join' : 'Not Eligible'}
            </span>
          </div>
          <span className={`text-sm ${getReputationColor(result.checks.reputationScore)}`}>
            Rep: {result.checks.reputationScore}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Member Credential Status</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${result.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {result.passed ? 'Eligible' : 'Requirements Not Met'}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            {result.checks.identityVerified ? <CheckIcon /> : <XIcon />}
            <div>
              <p className="text-sm text-gray-400">Identity Verified</p>
              <p className={`text-sm font-medium ${result.checks.identityVerified ? 'text-green-400' : 'text-red-400'}`}>
                {result.checks.identityVerified ? 'Verified' : 'Not Verified'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {result.checks.sufficientStake ? <CheckIcon /> : <XIcon />}
            <div>
              <p className="text-sm text-gray-400">Security Deposit</p>
              <p className={`text-sm font-medium ${result.checks.sufficientStake ? 'text-green-400' : 'text-red-400'}`}>
                {result.checks.sufficientStake ? 'Sufficient' : `Need ${((contributionAmount || 100) * 1.5).toFixed(0)} AXM`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {result.checks.commitmentSigned ? <CheckIcon /> : <XIcon />}
            <div>
              <p className="text-sm text-gray-400">Commitment Agreement</p>
              <p className={`text-sm font-medium ${result.checks.commitmentSigned ? 'text-green-400' : 'text-yellow-400'}`}>
                {result.checks.commitmentSigned ? 'Signed' : 'Not Signed'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getReputationColor(result.checks.reputationScore)} bg-gray-700`}>
              {result.checks.reputationScore}
            </div>
            <div>
              <p className="text-sm text-gray-400">Reputation Score</p>
              <p className={`text-sm font-medium ${getReputationColor(result.checks.reputationScore)}`}>
                {getReputationLabel(result.checks.reputationScore)}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">AXM Balance</span>
            <span className="text-white">{parseFloat(result.checks.axmBalance).toFixed(2)} AXM</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Staked Balance</span>
            <span className="text-white">{parseFloat(result.checks.stakedBalance).toFixed(2)} AXM</span>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm font-medium text-red-400 mb-2">Requirements to Meet:</p>
            <ul className="space-y-1">
              {result.errors.map((error, idx) => (
                <li key={idx} className="text-sm text-red-300 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.warnings.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-400 mb-2">Warnings:</p>
            <ul className="space-y-1">
              {result.warnings.map((warning, idx) => (
                <li key={idx} className="text-sm text-yellow-300 flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={checkCompliance}
          className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}
