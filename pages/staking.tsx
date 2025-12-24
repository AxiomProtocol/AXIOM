import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { ethers } from 'ethers';
import { CORE_CONTRACTS, NETWORK_CONFIG } from '../shared/contracts';

const STAKING_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function stakedBalance(address account) external view returns (uint256)",
  "function getStakeInfo(address account) external view returns (uint256 amount, uint256 since, uint256 tier)",
  "function pendingRewards(address account) external view returns (uint256)",
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function claimRewards() external",
  "function totalStaked() external view returns (uint256)",
  "function rewardRate() external view returns (uint256)"
];

const AXM_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

const EMISSIONS_ABI = [
  "function currentEmissionRate() external view returns (uint256)",
  "function totalEmitted() external view returns (uint256)",
  "function halvingEpoch() external view returns (uint256)"
];

interface StakingStats {
  userStaked: string;
  userBalance: string;
  pendingRewards: string;
  stakeSince: number;
  tier: number;
  totalStaked: string;
  emissionRate: string;
  apr: string;
}

const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const TIER_COLORS = ['text-amber-600', 'text-gray-400', 'text-yellow-400', 'text-blue-400', 'text-purple-400'];

export default function StakingPage() {
  const { walletState, connectMetaMask } = useWallet();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const [txPending, setTxPending] = useState(false);
  const [txMessage, setTxMessage] = useState('');
  const [error, setError] = useState('');

  const fetchStakingData = useCallback(async () => {
    if (!walletState?.address) {
      setLoading(false);
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      
      const stakingContract = new ethers.Contract(
        CORE_CONTRACTS.STAKING_EMISSIONS,
        STAKING_ABI,
        provider
      );
      
      const axmContract = new ethers.Contract(
        CORE_CONTRACTS.AXM_TOKEN,
        AXM_TOKEN_ABI,
        provider
      );

      const emissionsContract = new ethers.Contract(
        CORE_CONTRACTS.STAKING_EMISSIONS,
        EMISSIONS_ABI,
        provider
      );

      const [
        userBalance,
        stakeInfo,
        pendingRewards,
        totalStaked,
        emissionRate
      ] = await Promise.all([
        axmContract.balanceOf(walletState.address).catch(() => BigInt(0)),
        stakingContract.getStakeInfo(walletState.address).catch(() => [BigInt(0), BigInt(0), BigInt(0)]),
        stakingContract.pendingRewards(walletState.address).catch(() => BigInt(0)),
        stakingContract.totalStaked().catch(() => BigInt(0)),
        emissionsContract.currentEmissionRate().catch(() => BigInt(0))
      ]);

      const totalStakedNum = parseFloat(ethers.formatEther(totalStaked));
      const emissionRateNum = parseFloat(ethers.formatEther(emissionRate));
      const yearlyEmissions = emissionRateNum * 365 * 24 * 60 * 60;
      const apr = totalStakedNum > 0 ? ((yearlyEmissions / totalStakedNum) * 100).toFixed(2) : '0';

      setStats({
        userStaked: ethers.formatEther(stakeInfo[0]),
        userBalance: ethers.formatEther(userBalance),
        pendingRewards: ethers.formatEther(pendingRewards),
        stakeSince: Number(stakeInfo[1]),
        tier: Number(stakeInfo[2]),
        totalStaked: ethers.formatEther(totalStaked),
        emissionRate: ethers.formatEther(emissionRate),
        apr
      });
    } catch (err) {
      console.error('Error fetching staking data:', err);
      setStats({
        userStaked: '0',
        userBalance: '0',
        pendingRewards: '0',
        stakeSince: 0,
        tier: 0,
        totalStaked: '0',
        emissionRate: '0',
        apr: '8.5'
      });
    } finally {
      setLoading(false);
    }
  }, [walletState?.address]);

  useEffect(() => {
    fetchStakingData();
    const interval = setInterval(fetchStakingData, 30000);
    return () => clearInterval(interval);
  }, [fetchStakingData]);

  const handleStake = async () => {
    if (!walletState?.address || !stakeAmount) return;
    
    setTxPending(true);
    setError('');
    setTxMessage('Preparing transaction...');

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const axmContract = new ethers.Contract(CORE_CONTRACTS.AXM_TOKEN, AXM_TOKEN_ABI, signer);
      const stakingContract = new ethers.Contract(CORE_CONTRACTS.STAKING_EMISSIONS, STAKING_ABI, signer);
      
      const amount = ethers.parseEther(stakeAmount);
      
      const allowance = await axmContract.allowance(walletState.address, CORE_CONTRACTS.STAKING_EMISSIONS);
      if (allowance < amount) {
        setTxMessage('Approving AXM tokens...');
        const approveTx = await axmContract.approve(CORE_CONTRACTS.STAKING_EMISSIONS, amount);
        await approveTx.wait();
      }
      
      setTxMessage('Staking tokens...');
      const stakeTx = await stakingContract.stake(amount);
      await stakeTx.wait();
      
      setTxMessage('Stake successful!');
      setStakeAmount('');
      await fetchStakingData();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setTxPending(false);
      setTimeout(() => setTxMessage(''), 3000);
    }
  };

  const handleUnstake = async () => {
    if (!walletState?.address || !unstakeAmount) return;
    
    setTxPending(true);
    setError('');
    setTxMessage('Preparing unstake...');

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const stakingContract = new ethers.Contract(CORE_CONTRACTS.STAKING_EMISSIONS, STAKING_ABI, signer);
      const amount = ethers.parseEther(unstakeAmount);
      
      setTxMessage('Unstaking tokens...');
      const unstakeTx = await stakingContract.unstake(amount);
      await unstakeTx.wait();
      
      setTxMessage('Unstake successful!');
      setUnstakeAmount('');
      await fetchStakingData();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setTxPending(false);
      setTimeout(() => setTxMessage(''), 3000);
    }
  };

  const handleClaimRewards = async () => {
    if (!walletState?.address) return;
    
    setTxPending(true);
    setError('');
    setTxMessage('Claiming rewards...');

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const stakingContract = new ethers.Contract(CORE_CONTRACTS.STAKING_EMISSIONS, STAKING_ABI, signer);
      
      const claimTx = await stakingContract.claimRewards();
      await claimTx.wait();
      
      setTxMessage('Rewards claimed successfully!');
      await fetchStakingData();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setTxPending(false);
      setTimeout(() => setTxMessage(''), 3000);
    }
  };

  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
    return n.toFixed(2);
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">AXM Staking</h1>
            <p className="text-gray-400">Stake your AXM tokens to earn rewards and unlock governance privileges</p>
          </div>

          {!walletState?.address ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
              <h2 className="text-xl font-semibold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">Connect your wallet to view your staking position and stake AXM tokens.</p>
              <button
                onClick={connectMetaMask}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Connect MetaMask
              </button>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-1">Your Staked</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(stats?.userStaked || '0')} AXM</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Tier: <span className={TIER_COLORS[stats?.tier || 0]}>{TIER_NAMES[stats?.tier || 0]}</span>
                  </p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-1">Pending Rewards</p>
                  <p className="text-2xl font-bold text-green-400">{formatNumber(stats?.pendingRewards || '0')} AXM</p>
                  <button
                    onClick={handleClaimRewards}
                    disabled={txPending || parseFloat(stats?.pendingRewards || '0') === 0}
                    className="mt-2 text-sm text-yellow-500 hover:text-yellow-400 disabled:text-gray-600 disabled:cursor-not-allowed"
                  >
                    Claim Rewards
                  </button>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-1">Current APR</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats?.apr || '8.5'}%</p>
                  <p className="text-sm text-gray-500 mt-1">Variable rate</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-1">Total Staked</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(stats?.totalStaked || '0')} AXM</p>
                  <p className="text-sm text-gray-500 mt-1">Protocol-wide</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <div className="flex border-b border-gray-700 mb-6">
                      <button
                        onClick={() => setActiveTab('stake')}
                        className={`px-6 py-3 font-medium transition-colors ${
                          activeTab === 'stake'
                            ? 'text-yellow-500 border-b-2 border-yellow-500'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Stake
                      </button>
                      <button
                        onClick={() => setActiveTab('unstake')}
                        className={`px-6 py-3 font-medium transition-colors ${
                          activeTab === 'unstake'
                            ? 'text-yellow-500 border-b-2 border-yellow-500'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Unstake
                      </button>
                    </div>

                    {activeTab === 'stake' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Amount to Stake</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={stakeAmount}
                              onChange={(e) => setStakeAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                            />
                            <button
                              onClick={() => setStakeAmount(stats?.userBalance || '0')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-yellow-500 hover:text-yellow-400"
                            >
                              MAX
                            </button>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Available: {formatNumber(stats?.userBalance || '0')} AXM
                          </p>
                        </div>

                        <button
                          onClick={handleStake}
                          disabled={txPending || !stakeAmount || parseFloat(stakeAmount) <= 0}
                          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors"
                        >
                          {txPending ? 'Processing...' : 'Stake AXM'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Amount to Unstake</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={unstakeAmount}
                              onChange={(e) => setUnstakeAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                            />
                            <button
                              onClick={() => setUnstakeAmount(stats?.userStaked || '0')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-yellow-500 hover:text-yellow-400"
                            >
                              MAX
                            </button>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Staked: {formatNumber(stats?.userStaked || '0')} AXM
                          </p>
                        </div>

                        <button
                          onClick={handleUnstake}
                          disabled={txPending || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
                          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                          {txPending ? 'Processing...' : 'Unstake AXM'}
                        </button>
                      </div>
                    )}

                    {txMessage && (
                      <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-400">{txMessage}</p>
                      </div>
                    )}

                    {error && (
                      <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Your Position</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Staked Since</span>
                        <span className="text-white">{formatDate(stats?.stakeSince || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Tier</span>
                        <span className={TIER_COLORS[stats?.tier || 0]}>{TIER_NAMES[stats?.tier || 0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Daily Rewards</span>
                        <span className="text-green-400">
                          ~{((parseFloat(stats?.userStaked || '0') * (parseFloat(stats?.apr || '8.5') / 100)) / 365).toFixed(4)} AXM
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Staking Benefits</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 text-gray-300">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Earn staking rewards
                      </li>
                      <li className="flex items-center gap-2 text-gray-300">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Governance voting power
                      </li>
                      <li className="flex items-center gap-2 text-gray-300">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Security deposit for SUSU
                      </li>
                      <li className="flex items-center gap-2 text-gray-300">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Priority payout positions
                      </li>
                      <li className="flex items-center gap-2 text-gray-300">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        DePIN node discounts
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
