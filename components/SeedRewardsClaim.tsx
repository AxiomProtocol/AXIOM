import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';
import { ethers } from 'ethers';
import { V2_SOVEREIGN_BANKING_CONTRACTS } from '../shared/contracts';

const SEED_ABI = [
  "function claimRewards(uint256 epochId)",
  "function getClaimableRewards(address user) view returns (uint256)",
  "function currentRewardEpoch() view returns (uint256)"
];

interface RewardsData {
  claimableRewards: string;
  currentEpoch: number;
  totalRewardsDistributed: string;
}

export default function SeedRewardsClaim() {
  const { walletState } = useWallet();
  const address = walletState.address;
  const isConnected = walletState.isConnected;
  const [data, setData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [txMessage, setTxMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      fetchRewards();
    } else {
      setLoading(false);
    }
  }, [address]);

  const fetchRewards = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/v2/seed-rewards?address=${address}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      if (result.success) {
        setData({
          claimableRewards: result.position.claimableRewards,
          currentEpoch: result.globalStats.currentEpoch,
          totalRewardsDistributed: result.globalStats.totalRewardsDistributed
        });
      } else {
        setError(result.error || 'Failed to load');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!window.ethereum || !data) return;
    
    setClaiming(true);
    setTxMessage('');
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        V2_SOVEREIGN_BANKING_CONTRACTS.SEED,
        SEED_ABI,
        signer
      );

      setTxMessage('Confirm transaction in your wallet...');
      const tx = await contract.claimRewards(data.currentEpoch);
      
      setTxMessage('Transaction submitted. Waiting for confirmation...');
      await tx.wait();
      
      setTxMessage('Rewards claimed successfully!');
      fetchRewards();
    } catch (err: any) {
      console.error('Claim error:', err);
      setError(err.reason || err.message || 'Failed to claim rewards');
    } finally {
      setClaiming(false);
    }
  };

  const formatNumber = (val: string) => {
    const num = parseFloat(val);
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(4);
  };

  const hasClaimable = data && parseFloat(data.claimableRewards) > 0;

  if (!isConnected) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="text-center text-gray-400">
          Connect wallet to view rewards
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-12 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">💰</span> veAXM Rewards
        </h3>
        <span className="text-xs text-gray-400">Epoch {data?.currentEpoch || 0}</span>
      </div>

      <div className="bg-gradient-to-r from-purple-900/30 to-gray-800 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-sm">Claimable Rewards</p>
            <p className="text-2xl font-bold text-purple-400">
              {formatNumber(data?.claimableRewards || '0')} AXM
            </p>
          </div>
          {hasClaimable && (
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-xl">✨</span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleClaimRewards}
        disabled={claiming || !hasClaimable}
        className={`w-full py-3 rounded-lg font-semibold transition-all ${
          hasClaimable 
            ? 'bg-purple-500 hover:bg-purple-600 text-white' 
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {claiming ? 'Processing...' : hasClaimable ? 'Claim Rewards' : 'No Rewards Available'}
      </button>

      {txMessage && (
        <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-400">{txMessage}</p>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total Distributed</span>
          <span className="text-white">{formatNumber(data?.totalRewardsDistributed || '0')} AXM</span>
        </div>
      </div>
    </div>
  );
}
