import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { ethers } from 'ethers';
import { CORE_CONTRACTS, NETWORK_CONFIG, V2_SOVEREIGN_BANKING_CONTRACTS } from '../shared/contracts';
import VeAXMLockCalculator from '../components/VeAXMLockCalculator';

const VE_AXM_ABI = [
  "function balanceOf(address user) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function totalLocked() external view returns (uint256)",
  "function totalLockers() external view returns (uint256)",
  "function getLock(address user) external view returns (uint256 amount, uint256 unlockTime, uint256 lockStart)",
  "function getClaimableRewards(address user) external view returns (uint256)",
  "function createLock(uint256 amount, uint256 lockDuration) external",
  "function increaseLockAmount(uint256 additionalAmount) external",
  "function extendLock(uint256 newDuration) external",
  "function withdraw() external",
  "function claimRewards(uint256 epochId) external"
];

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

interface VeAXMStats {
  votingPower: string;
  lockedAmount: string;
  unlockTime: number;
  lockStart: number;
  claimableRewards: string;
  totalVotingPower: string;
  totalLocked: string;
  totalLockers: number;
}

const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const TIER_COLORS = ['text-amber-600', 'text-gray-400', 'text-yellow-400', 'text-blue-400', 'text-purple-400'];
const LOCK_DURATIONS = [
  { label: '1 Year', value: 365 * 24 * 60 * 60, multiplier: 0.25 },
  { label: '2 Years', value: 2 * 365 * 24 * 60 * 60, multiplier: 0.5 },
  { label: '3 Years', value: 3 * 365 * 24 * 60 * 60, multiplier: 0.75 },
  { label: '4 Years (Max)', value: 4 * 365 * 24 * 60 * 60, multiplier: 1.0 },
];

export default function StakingPage() {
  const { walletState, connectMetaMask } = useWallet();
  const [mode, setMode] = useState<'staking' | 'veaxm'>('staking');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [veStats, setVeStats] = useState<VeAXMStats | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [lockAmount, setLockAmount] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(LOCK_DURATIONS[3]);
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

  const fetchVeAXMData = useCallback(async () => {
    if (!walletState?.address) return;
    
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const veAXM = new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM, VE_AXM_ABI, provider);
      
      const [votingPower, lock, claimable, totalSupply, totalLocked, totalLockers] = await Promise.all([
        veAXM.balanceOf(walletState.address).catch(() => BigInt(0)),
        veAXM.getLock(walletState.address).catch(() => [BigInt(0), BigInt(0), BigInt(0)]),
        veAXM.getClaimableRewards(walletState.address).catch(() => BigInt(0)),
        veAXM.totalSupply().catch(() => BigInt(0)),
        veAXM.totalLocked().catch(() => BigInt(0)),
        veAXM.totalLockers().catch(() => BigInt(0))
      ]);
      
      setVeStats({
        votingPower: ethers.formatEther(votingPower),
        lockedAmount: ethers.formatEther(lock[0]),
        unlockTime: Number(lock[1]),
        lockStart: Number(lock[2]),
        claimableRewards: ethers.formatEther(claimable),
        totalVotingPower: ethers.formatEther(totalSupply),
        totalLocked: ethers.formatEther(totalLocked),
        totalLockers: Number(totalLockers)
      });
    } catch (err) {
      console.error('Error fetching veAXM data:', err);
    }
  }, [walletState?.address]);

  useEffect(() => {
    fetchStakingData();
    fetchVeAXMData();
    const interval = setInterval(() => {
      fetchStakingData();
      fetchVeAXMData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStakingData, fetchVeAXMData]);

  const handleCreateLock = async () => {
    if (!walletState?.address || !lockAmount) return;
    
    setTxPending(true);
    setError('');
    setTxMessage('Preparing vote-escrow lock...');

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const axmContract = new ethers.Contract(CORE_CONTRACTS.AXM_TOKEN, AXM_TOKEN_ABI, signer);
      const veAXM = new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM, VE_AXM_ABI, signer);
      
      const amount = ethers.parseEther(lockAmount);
      
      const allowance = await axmContract.allowance(walletState.address, V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM);
      if (allowance < amount) {
        setTxMessage('Approving AXM tokens...');
        const approveTx = await axmContract.approve(V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM, amount);
        await approveTx.wait();
      }
      
      setTxMessage(`Locking AXM for ${selectedDuration.label}...`);
      const lockTx = await veAXM.createLock(amount, selectedDuration.value);
      await lockTx.wait();
      
      setTxMessage('Lock created successfully!');
      setLockAmount('');
      await fetchVeAXMData();
      await fetchStakingData();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setTxPending(false);
      setTimeout(() => setTxMessage(''), 3000);
    }
  };

  const handleVeWithdraw = async () => {
    if (!walletState?.address) return;
    
    setTxPending(true);
    setError('');
    setTxMessage('Withdrawing unlocked AXM...');

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const veAXM = new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM, VE_AXM_ABI, signer);
      
      const withdrawTx = await veAXM.withdraw();
      await withdrawTx.wait();
      
      setTxMessage('Withdrawal successful!');
      await fetchVeAXMData();
      await fetchStakingData();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setTxPending(false);
      setTimeout(() => setTxMessage(''), 3000);
    }
  };

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

  const isLockExpired = veStats?.unlockTime ? veStats.unlockTime * 1000 < Date.now() : false;
  const hasActiveLock = parseFloat(veStats?.lockedAmount || '0') > 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">AXM Staking & veAXM</h1>
            <p className="text-gray-400">Earn rewards, governance power, and real yield from protocol fees</p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-1 flex">
              <button
                onClick={() => setMode('staking')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  mode === 'staking'
                    ? 'bg-yellow-500 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Regular Staking
              </button>
              <button
                onClick={() => setMode('veaxm')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  mode === 'veaxm'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                veAXM Vote Lock
              </button>
            </div>
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
          ) : mode === 'veaxm' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-1">Your Voting Power</p>
                  <p className="text-2xl font-bold text-purple-400">{formatNumber(veStats?.votingPower || '0')} veAXM</p>
                  <p className="text-sm text-gray-500 mt-1">Governance weight</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-1">Locked Amount</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(veStats?.lockedAmount || '0')} AXM</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {hasActiveLock ? `Unlocks ${formatDate(veStats?.unlockTime || 0)}` : 'No active lock'}
                  </p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-1">Total veAXM</p>
                  <p className="text-2xl font-bold text-purple-400">{formatNumber(veStats?.totalVotingPower || '0')}</p>
                  <p className="text-sm text-gray-500 mt-1">{veStats?.totalLockers || 0} lockers</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-1">Total Locked</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(veStats?.totalLocked || '0')} AXM</p>
                  <p className="text-sm text-gray-500 mt-1">Protocol-wide</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Lock AXM for veAXM</h3>
                    
                    {hasActiveLock && !isLockExpired ? (
                      <div className="text-center py-8">
                        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">🔒</span>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Lock Active</h4>
                        <p className="text-gray-400 mb-4">
                          You have {formatNumber(veStats?.lockedAmount || '0')} AXM locked until {formatDate(veStats?.unlockTime || 0)}
                        </p>
                        <p className="text-purple-400 font-semibold">
                          Current voting power: {formatNumber(veStats?.votingPower || '0')} veAXM
                        </p>
                      </div>
                    ) : hasActiveLock && isLockExpired ? (
                      <div className="space-y-4">
                        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-center">
                          <p className="text-green-400 font-semibold mb-2">Lock Expired!</p>
                          <p className="text-gray-400 text-sm">You can now withdraw your {formatNumber(veStats?.lockedAmount || '0')} AXM</p>
                        </div>
                        <button
                          onClick={handleVeWithdraw}
                          disabled={txPending}
                          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                          {txPending ? 'Processing...' : 'Withdraw AXM'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Amount to Lock</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={lockAmount}
                              onChange={(e) => setLockAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                            />
                            <button
                              onClick={() => setLockAmount(stats?.userBalance || '0')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-purple-400 hover:text-purple-300"
                            >
                              MAX
                            </button>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Available: {formatNumber(stats?.userBalance || '0')} AXM
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Lock Duration</label>
                          <div className="grid grid-cols-2 gap-2">
                            {LOCK_DURATIONS.map((duration) => (
                              <button
                                key={duration.value}
                                onClick={() => setSelectedDuration(duration)}
                                className={`p-3 rounded-lg border transition-all ${
                                  selectedDuration.value === duration.value
                                    ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                                }`}
                              >
                                <div className="font-medium">{duration.label}</div>
                                <div className="text-xs text-gray-400">{(duration.multiplier * 100).toFixed(0)}% voting power</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {lockAmount && parseFloat(lockAmount) > 0 && (
                          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-400">You will receive</span>
                              <span className="text-purple-400 font-semibold">
                                {formatNumber(parseFloat(lockAmount) * selectedDuration.multiplier)} veAXM
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Unlock date</span>
                              <span className="text-white">
                                {new Date(Date.now() + selectedDuration.value * 1000).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={handleCreateLock}
                          disabled={txPending || !lockAmount || parseFloat(lockAmount) <= 0}
                          className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                          {txPending ? 'Processing...' : 'Lock AXM'}
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
                    <h3 className="text-lg font-semibold text-white mb-4">veAXM Benefits</h3>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-2 text-gray-300">
                        <span className="text-purple-400 mt-0.5">✓</span>
                        <span><strong>Real Yield:</strong> 50% of protocol fees distributed to veAXM holders</span>
                      </li>
                      <li className="flex items-start gap-2 text-gray-300">
                        <span className="text-purple-400 mt-0.5">✓</span>
                        <span><strong>Governance Power:</strong> Vote on protocol proposals and fee allocation</span>
                      </li>
                      <li className="flex items-start gap-2 text-gray-300">
                        <span className="text-purple-400 mt-0.5">✓</span>
                        <span><strong>Longer Lock = More Power:</strong> 4-year lock gives maximum voting weight</span>
                      </li>
                      <li className="flex items-start gap-2 text-gray-300">
                        <span className="text-purple-400 mt-0.5">✓</span>
                        <span><strong>Buyback & Burn:</strong> 50% of fees used to buy back and burn AXM</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-purple-900/30 to-gray-800 border border-purple-500/30 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">How veAXM Works</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Lock your AXM tokens for 1-4 years to receive veAXM (vote-escrowed AXM). Your voting power decays linearly until unlock.
                    </p>
                    <div className="text-xs text-gray-500">
                      Inspired by Curve's veCRV tokenomics
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <VeAXMLockCalculator 
                  axmBalance={stats?.userBalance || '0'}
                  currentLockYears={hasActiveLock && !isLockExpired ? Math.ceil((veStats?.unlockTime || 0) * 1000 - Date.now()) / (365 * 24 * 60 * 60 * 1000) : undefined}
                  onSelectDuration={(years) => {
                    const duration = LOCK_DURATIONS.find(d => Math.round(d.value / (365 * 24 * 60 * 60)) === years);
                    if (duration) setSelectedDuration(duration);
                  }}
                />
              </div>
            </>
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
