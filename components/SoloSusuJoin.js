import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletConnect/WalletContext';
import { COMMUNITY_SAVINGS_CONTRACTS, CORE_CONTRACTS, NETWORK_CONFIG } from '../shared/contracts';

const SUSU_PERSONAL_VAULT = COMMUNITY_SAVINGS_CONTRACTS.SUSU_PERSONAL_VAULT;
const AXM_TOKEN = CORE_CONTRACTS.AXM_TOKEN;
const BLOCK_EXPLORER = NETWORK_CONFIG.blockExplorer;

const VAULT_ABI = [
  "function getCircle(uint256 circleId) external view returns (tuple(uint256 circleId, address organizer, address token, uint256 targetMembers, uint256 contributionPerCycle, uint256 totalCycles, uint256 cycleDuration, uint256 startTime, uint256 currentCycle, uint16 protocolFeeBps, uint16 earlyExitPenaltyBps, uint8 status, uint256 createdAt, uint256 totalCommitted, uint256 totalPaidOut))",
  "function getVault(uint256 circleId, address member) external view returns (tuple(address owner, uint256 lockedAmount, uint256 availableForPayout, uint256 payoutPosition, uint256 committedAt, uint256 totalReceived, bool hasReceivedPayout, uint8 status))",
  "function getRequiredCommitment(uint256 circleId) external view returns (uint256)",
  "function commitToVault(uint256 circleId, uint256 preferredPosition) external",
  "function getCircleMembers(uint256 circleId) external view returns (address[])"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

const STATUS_LABELS = {
  0: 'Forming',
  1: 'Active', 
  2: 'Completed',
  3: 'Cancelled'
};

export default function SoloSusuJoin({ circleId, onSuccess, onCancel }) {
  const { walletState } = useWallet();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [circleData, setCircleData] = useState(null);
  const [requiredCommitment, setRequiredCommitment] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const [currentAllowance, setCurrentAllowance] = useState(null);
  const [preferredPosition, setPreferredPosition] = useState(0);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (circleId && walletState?.address) {
      fetchCircleData();
    }
  }, [circleId, walletState?.address]);

  const getProvider = async () => {
    const { walletService } = await import('../lib/services/WalletService');
    const provider = walletService.getProvider();
    if (!provider) {
      throw new Error('Wallet not connected');
    }
    return provider;
  };

  const getSigner = async () => {
    const { walletService } = await import('../lib/services/WalletService');
    const signer = walletService.getSigner();
    if (!signer) {
      throw new Error('Signer not available - please connect your wallet');
    }
    return signer;
  };

  const fetchCircleData = async () => {
    try {
      setLoading(true);
      const provider = await getProvider();
      const vaultContract = new ethers.Contract(SUSU_PERSONAL_VAULT, VAULT_ABI, provider);
      const tokenContract = new ethers.Contract(AXM_TOKEN, ERC20_ABI, provider);

      const [circle, commitment, balance, allowance] = await Promise.all([
        vaultContract.getCircle(circleId),
        vaultContract.getRequiredCommitment(circleId),
        tokenContract.balanceOf(walletState.address),
        tokenContract.allowance(walletState.address, SUSU_PERSONAL_VAULT)
      ]);

      setCircleData({
        circleId: Number(circle.circleId),
        organizer: circle.organizer,
        targetMembers: Number(circle.targetMembers),
        contributionPerCycle: circle.contributionPerCycle,
        cycleDuration: Number(circle.cycleDuration),
        startTime: Number(circle.startTime),
        status: Number(circle.status),
        totalCommitted: circle.totalCommitted
      });
      setRequiredCommitment(commitment);
      setUserBalance(balance);
      setCurrentAllowance(allowance);

      if (allowance >= commitment) {
        setStep(2);
      }
    } catch (err) {
      console.error('Error fetching circle data:', err);
      setError('Failed to load circle details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!walletState?.address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const signer = await getSigner();
      const tokenContract = new ethers.Contract(AXM_TOKEN, ERC20_ABI, signer);

      const tx = await tokenContract.approve(SUSU_PERSONAL_VAULT, requiredCommitment);
      setTxHash(tx.hash);
      await tx.wait();

      setCurrentAllowance(requiredCommitment);
      setStep(2);
      setTxHash('');
    } catch (err) {
      console.error('Approval error:', err);
      setError(err.message || 'Failed to approve tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!walletState?.address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const signer = await getSigner();
      const vaultContract = new ethers.Contract(SUSU_PERSONAL_VAULT, VAULT_ABI, signer);

      const tx = await vaultContract.commitToVault(circleId, preferredPosition);
      setTxHash(tx.hash);
      await tx.wait();

      setStep(3);
      if (onSuccess) {
        onSuccess(tx.hash);
      }
    } catch (err) {
      console.error('Commit error:', err);
      setError(err.message || 'Failed to commit to vault');
    } finally {
      setLoading(false);
    }
  };

  const formatAXM = (wei) => {
    if (!wei) return '0';
    return parseFloat(ethers.formatEther(wei)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatDuration = (seconds) => {
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  const hasEnoughBalance = userBalance && requiredCommitment && userBalance >= requiredCommitment;

  if (loading && !circleData) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading circle details...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔐</span>
          <div>
            <h2 className="text-xl font-bold">Join The Wealth Practice</h2>
            <p className="text-blue-100">Personal Vault Circle #{circleId}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>1</div>
            <span className={step >= 1 ? 'text-blue-700 font-medium' : 'text-gray-400'}>Approve</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2">
            <div className={`h-full bg-blue-500 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>2</div>
            <span className={step >= 2 ? 'text-blue-700 font-medium' : 'text-gray-400'}>Commit</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2">
            <div className={`h-full bg-blue-500 transition-all ${step >= 3 ? 'w-full' : 'w-0'}`}></div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>✓</div>
            <span className={step >= 3 ? 'text-green-700 font-medium' : 'text-gray-400'}>Done</span>
          </div>
        </div>

        {circleData && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-3">Circle Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-600">Members</span>
                <p className="font-medium text-gray-900">{circleData.targetMembers}</p>
              </div>
              <div>
                <span className="text-blue-600">Per Cycle</span>
                <p className="font-medium text-gray-900">{formatAXM(circleData.contributionPerCycle)} AXM</p>
              </div>
              <div>
                <span className="text-blue-600">Cycle Duration</span>
                <p className="font-medium text-gray-900">{formatDuration(circleData.cycleDuration)}</p>
              </div>
              <div>
                <span className="text-blue-600">Status</span>
                <p className="font-medium text-gray-900">{STATUS_LABELS[circleData.status]}</p>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="font-semibold text-amber-800 mb-2">Step 1: Approve Token Access</h4>
              <p className="text-sm text-amber-700 mb-3">
                Before you can lock your funds, you need to approve the Personal Vault contract to access your AXM tokens.
                This is a one-time approval for this commitment amount.
              </p>
              <div className="bg-white rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Your Balance</span>
                  <span className={`font-medium ${hasEnoughBalance ? 'text-green-600' : 'text-red-600'}`}>
                    {formatAXM(userBalance)} AXM
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Required Commitment</span>
                  <span className="font-bold text-blue-700">{formatAXM(requiredCommitment)} AXM</span>
                </div>
              </div>
            </div>

            {!hasEnoughBalance && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">
                  <strong>Insufficient balance.</strong> You need {formatAXM(requiredCommitment)} AXM but only have {formatAXM(userBalance)} AXM.
                  <a href="/onramp" className="text-red-800 underline ml-1">Get more AXM</a>
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleApprove}
                disabled={loading || !hasEnoughBalance}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Approving...' : `Approve ${formatAXM(requiredCommitment)} AXM`}
              </button>
            </div>

            {txHash && (
              <p className="text-xs text-gray-500 text-center">
                Transaction: <a href={`${BLOCK_EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{txHash.slice(0, 10)}...</a>
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Step 2: Lock Funds in Your Personal Vault</h4>
              <p className="text-sm text-blue-700 mb-3">
                Your tokens are approved! Now lock them in your personal vault to join the circle.
                Your funds will stay segregated from other members until payout.
              </p>
              
              <div className="bg-white rounded-lg p-3 space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount to Lock</span>
                  <span className="font-bold text-blue-700">{formatAXM(requiredCommitment)} AXM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Early Exit Penalty</span>
                  <span className="font-medium text-amber-600">10%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Preferred Payout Position (optional)
                </label>
                <select
                  value={preferredPosition}
                  onChange={(e) => setPreferredPosition(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                >
                  <option value="0">Any available position</option>
                  {circleData && Array.from({ length: circleData.targetMembers }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Position {i + 1}</option>
                  ))}
                </select>
                <p className="text-xs text-blue-600 mt-1">Position 1 receives first, Position {circleData?.targetMembers} receives last.</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h5 className="font-semibold text-green-800 mb-2">What Happens Next</h5>
              <ul className="text-sm text-green-700 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  Your funds are locked in YOUR vault (not mixed with others)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  When the circle fills, payouts start automatically
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  You receive the full pot when it's your turn
                </li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleCommit}
                disabled={loading}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Locking Funds...' : 'Lock Funds in My Vault'}
              </button>
            </div>

            {txHash && (
              <p className="text-xs text-gray-500 text-center">
                Transaction: <a href={`${BLOCK_EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{txHash.slice(0, 10)}...</a>
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">You're In!</h3>
            <p className="text-gray-600 mb-4">
              Your funds are now safely locked in your Personal Vault.
              You'll automatically receive your payout when it's your turn.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-700">
                <strong>Your commitment:</strong> {formatAXM(requiredCommitment)} AXM locked
              </p>
            </div>
            <button
              onClick={onCancel || (() => window.location.reload())}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600"
            >
              View Circle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
