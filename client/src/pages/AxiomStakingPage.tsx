import React, { useState, useEffect } from 'react';
import { CONTRACTS, ABIS, formatAddress } from '../contracts';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import { WalletConnect } from '../components/web3/wallet-connect';
import { getProvider } from '../contracts/utils/contractHelpers';

interface Pool {
  id: number;
  stakingToken: string;
  rewardToken: string;
  rewardRate: bigint;
  totalStaked: bigint;
  active: boolean;
}

interface UserStake {
  balance: bigint;
  rewards: bigint;
}

export default function AxiomStakingPage() {
  const { account, isConnected, isLoggedIn } = useWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [userStakes, setUserStakes] = useState<Map<number, UserStake>>(new Map());
  const [selectedPool, setSelectedPool] = useState<number>(0);
  const [stakeAmount, setStakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [poolsLoaded, setPoolsLoaded] = useState(false);

  useEffect(() => {
    // Load pool data immediately on mount (no wallet needed)
    loadPoolsData();
  }, []);

  useEffect(() => {
    // Reload data when wallet connects to fetch user-specific data
    if (account && isConnected) {
      loadPoolsData();
    }
  }, [account, isConnected]);

  const loadPoolsData = async () => {
    try {
      console.log('🔄 Loading staking pools from Arbitrum One...');
      // Use public RPC provider to load pool data (no wallet needed)
      const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');

      const stakingContract = new ethers.Contract(
        CONTRACTS.STAKING_HUB.address,
        ABIS.StakingHub,
        provider
      );

      console.log('📍 Staking contract address:', CONTRACTS.STAKING_HUB.address);
      const nextPoolId = await stakingContract.nextPoolId();
      console.log('📊 Next pool ID:', Number(nextPoolId));
      const poolsData: Pool[] = [];
      const stakesData = new Map<number, UserStake>();

      for (let i = 0; i < Number(nextPoolId); i++) {
        try {
          const poolInfo = await stakingContract.pools(i);
          poolsData.push({
            id: i,
            stakingToken: poolInfo[0],
            rewardToken: poolInfo[1],
            rewardRate: poolInfo[2],
            totalStaked: poolInfo[5],
            active: poolInfo[6],
          });

          // Only fetch user-specific data if wallet is connected
          if (account && isConnected) {
            try {
              const web3Provider = await getProvider();
              if (web3Provider) {
                const userContract = new ethers.Contract(
                  CONTRACTS.STAKING_HUB.address,
                  ABIS.StakingHub,
                  web3Provider
                );
                const userStake = await userContract.userStakes(i, account);
                const earned = await userContract.earned(i, account);
                stakesData.set(i, {
                  balance: userStake[0],
                  rewards: earned,
                });
              }
            } catch (err) {
              console.log(`Could not fetch user stake data for pool ${i}:`, err);
            }
          }
        } catch (error) {
          console.log(`Pool ${i} not active or error:`, error);
        }
      }

      console.log(`✅ Loaded ${poolsData.length} pools`);
      setPools(poolsData);
      setUserStakes(stakesData);
      setPoolsLoaded(true);
    } catch (error) {
      console.error('❌ Error loading pools:', error);
      setPoolsLoaded(true);
    }
  };

  const handleStake = async () => {
    if (!stakeAmount || Number(stakeAmount) <= 0) {
      setTxStatus('Please enter a valid amount');
      return;
    }

    if (!isConnected || !account) {
      setTxStatus('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setTxStatus('Preparing transaction...');

    try {
      const provider = await getProvider();
      if (!provider) {
        setTxStatus('Could not connect to wallet provider');
        setLoading(false);
        return;
      }
      const signer = provider.getSigner();

      const stakingContract = new ethers.Contract(
        CONTRACTS.STAKING_HUB.address,
        ABIS.StakingHub,
        signer
      );

      const pool = pools[selectedPool];
      const tokenContract = new ethers.Contract(
        pool.stakingToken,
        ABIS.AXMToken,
        signer
      );

      const amount = ethers.utils.parseUnits(stakeAmount, 18);

      setTxStatus('Approving tokens...');
      const approveTx = await tokenContract.approve(
        CONTRACTS.STAKING_HUB.address,
        amount
      );
      await approveTx.wait();

      setTxStatus('Staking tokens...');
      const stakeTx = await stakingContract.stake(selectedPool, amount);
      await stakeTx.wait();

      setTxStatus('Success! Tokens staked.');
      setStakeAmount('');
      await loadPoolsData();
    } catch (error: any) {
      console.error('Staking error:', error);
      setTxStatus(`Error: ${error.message || 'Transaction failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!stakeAmount || Number(stakeAmount) <= 0) {
      setTxStatus('Please enter a valid amount');
      return;
    }

    if (!isConnected || !account) {
      setTxStatus('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setTxStatus('Unstaking...');

    try {
      const provider = await getProvider();
      if (!provider) {
        setTxStatus('Could not connect to wallet provider');
        setLoading(false);
        return;
      }
      const signer = provider.getSigner();

      const stakingContract = new ethers.Contract(
        CONTRACTS.STAKING_HUB.address,
        ABIS.StakingHub,
        signer
      );

      const amount = ethers.utils.parseUnits(stakeAmount, 18);
      const tx = await stakingContract.withdraw(selectedPool, amount);
      await tx.wait();

      setTxStatus('Success! Tokens unstaked.');
      setStakeAmount('');
      await loadPoolsData();
    } catch (error: any) {
      console.error('Unstaking error:', error);
      setTxStatus(`Error: ${error.message || 'Transaction failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async (poolId: number) => {
    if (!isConnected || !account) {
      setTxStatus('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setTxStatus('Claiming rewards...');

    try {
      const provider = await getProvider();
      if (!provider) {
        setTxStatus('Could not connect to wallet provider');
        setLoading(false);
        return;
      }
      const signer = provider.getSigner();

      const stakingContract = new ethers.Contract(
        CONTRACTS.STAKING_HUB.address,
        ABIS.StakingHub,
        signer
      );

      const tx = await stakingContract.claimReward(poolId);
      await tx.wait();

      setTxStatus('Success! Rewards claimed.');
      await loadPoolsData();
    } catch (error: any) {
      console.error('Claim error:', error);
      setTxStatus(`Error: ${error.message || 'Transaction failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTokens = (amount: bigint): string => {
    try {
      const formatted = Number(amount) / 1e18;
      return formatted.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      });
    } catch {
      return '0';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-yellow-400 mb-4">AXM Staking Hub</h1>
          <p className="text-xl text-gray-300 mb-2">Earn Passive Rewards by Supporting Axiom Smart City</p>
          <p className="text-gray-400 max-w-3xl mx-auto">
            Stake your AXM tokens to earn rewards while helping secure and grow America's first on-chain sovereign smart city economy. 
            No lock-up periods, withdraw anytime.
          </p>
        </div>

        {/* What is Staking Section */}
        <div className="mb-8 bg-gradient-to-br from-yellow-900/20 to-gray-800 rounded-lg p-8 border border-yellow-500/30">
          <h2 className="text-3xl font-bold text-yellow-400 mb-4">💎 What is Staking?</h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-lg">
              <strong className="text-white">Staking</strong> is like putting your AXM tokens to work in a savings account that pays you rewards. 
              When you stake, you temporarily lock your tokens in a smart contract to help support the Axiom ecosystem.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🔒</div>
                <h3 className="font-semibold text-yellow-400 mb-2">Secure & Safe</h3>
                <p className="text-sm">Your tokens are held in audited smart contracts on Arbitrum One. You maintain full control and can unstake anytime.</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-2xl mb-2">💰</div>
                <h3 className="font-semibold text-yellow-400 mb-2">Earn Rewards</h3>
                <p className="text-sm">Receive AXM rewards automatically based on how much you stake and how long you participate.</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🌱</div>
                <h3 className="font-semibold text-yellow-400 mb-2">Support Growth</h3>
                <p className="text-sm">Help build the foundation of Axiom Smart City's digital economy while earning passive income.</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mb-8 bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-yellow-400 mb-6">🔧 How Staking Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-yellow-500 text-black rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-3">1</div>
              <h3 className="font-semibold text-white mb-2">Connect Wallet</h3>
              <p className="text-sm text-gray-400">Connect your wallet to Arbitrum One network. We support MetaMask and other Web3 wallets.</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-500 text-black rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-3">2</div>
              <h3 className="font-semibold text-white mb-2">Choose Pool</h3>
              <p className="text-sm text-gray-400">Select a staking pool based on reward rates and terms that work for you.</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-500 text-black rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-3">3</div>
              <h3 className="font-semibold text-white mb-2">Stake AXM</h3>
              <p className="text-sm text-gray-400">Enter the amount of AXM you want to stake and confirm the transaction.</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-500 text-black rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-3">4</div>
              <h3 className="font-semibold text-white mb-2">Earn Rewards</h3>
              <p className="text-sm text-gray-400">Watch your rewards accumulate! Claim them anytime or let them compound.</p>
            </div>
          </div>
        </div>

        {/* Pools Overview */}
        <div className="mb-8 bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-yellow-400 mb-6">📊 Available Staking Pools</h2>
          
          {!poolsLoaded ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading pools from Arbitrum One blockchain...</p>
              </div>
            </div>
          ) : pools.length === 0 ? (
            <div className="text-center py-12 bg-gray-900/50 rounded-lg">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-2xl font-semibold text-white mb-2">Staking Pools Coming Soon!</h3>
              <p className="text-gray-400 mb-4 max-w-2xl mx-auto">
                Our staking pools are being prepared and will launch shortly. Get your AXM tokens ready! 
                Follow our announcements to be notified when staking goes live.
              </p>
              <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Expected Launch</p>
                  <p className="text-lg font-semibold text-yellow-400">Q1 2025</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Initial APY Target</p>
                  <p className="text-lg font-semibold text-green-400">12-25%</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Lock Period</p>
                  <p className="text-lg font-semibold text-blue-400">Flexible</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-yellow-500/30">
                  <tr className="text-left">
                    <th className="py-4 px-4 text-gray-400 font-semibold">Pool</th>
                    <th className="py-4 px-4 text-gray-400 font-semibold">Total Staked</th>
                    <th className="py-4 px-4 text-gray-400 font-semibold">Reward Rate</th>
                    <th className="py-4 px-4 text-gray-400 font-semibold">Est. APY</th>
                    <th className="py-4 px-4 text-gray-400 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((pool, idx) => (
                    <tr key={idx} className="border-b border-gray-700 hover:bg-gray-750 transition">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-yellow-400">Pool #{pool.id}</div>
                        <div className="text-xs text-gray-500 font-mono">{formatAddress(pool.stakingToken)}</div>
                      </td>
                      <td className="py-4 px-4 text-white font-semibold">{formatTokens(pool.totalStaked)} AXM</td>
                      <td className="py-4 px-4 text-gray-300">{formatTokens(pool.rewardRate)} / block</td>
                      <td className="py-4 px-4 text-green-400 font-semibold">~15%</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pool.active ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
                          {pool.active ? '✓ Active' : '✗ Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="mb-8 bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-yellow-400 mb-6">❓ Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="bg-gray-900/50 rounded-lg p-4 cursor-pointer group">
              <summary className="font-semibold text-white group-hover:text-yellow-400 transition">
                Is my AXM safe when staking?
              </summary>
              <p className="mt-3 text-gray-400 text-sm pl-4">
                Yes! Your AXM tokens are secured in audited smart contracts deployed on Arbitrum One. The contracts have been thoroughly tested 
                and follow industry best practices. You maintain full ownership and can unstake at any time.
              </p>
            </details>
            <details className="bg-gray-900/50 rounded-lg p-4 cursor-pointer group">
              <summary className="font-semibold text-white group-hover:text-yellow-400 transition">
                Can I unstake anytime?
              </summary>
              <p className="mt-3 text-gray-400 text-sm pl-4">
                Yes! There are no lock-up periods. You can unstake your AXM tokens at any time. Simply connect your wallet, 
                select the amount you want to unstake, and confirm the transaction. Your tokens will be returned to your wallet immediately.
              </p>
            </details>
            <details className="bg-gray-900/50 rounded-lg p-4 cursor-pointer group">
              <summary className="font-semibold text-white group-hover:text-yellow-400 transition">
                How are rewards calculated?
              </summary>
              <p className="mt-3 text-gray-400 text-sm pl-4">
                Rewards are calculated based on: (1) The amount of AXM you stake, (2) How long you keep it staked, and (3) The pool's reward rate. 
                Rewards accumulate every block on Arbitrum (approximately every 0.25 seconds) and can be claimed at any time.
              </p>
            </details>
            <details className="bg-gray-900/50 rounded-lg p-4 cursor-pointer group">
              <summary className="font-semibold text-white group-hover:text-yellow-400 transition">
                What network should I use?
              </summary>
              <p className="mt-3 text-gray-400 text-sm pl-4">
                AXM staking operates on <strong className="text-yellow-400">Arbitrum One</strong>, a Layer 2 scaling solution for Ethereum. 
                Make sure your wallet is connected to Arbitrum One (Chain ID: 42161). This ensures low gas fees and fast transactions.
              </p>
            </details>
            <details className="bg-gray-900/50 rounded-lg p-4 cursor-pointer group">
              <summary className="font-semibold text-white group-hover:text-yellow-400 transition">
                What are the fees?
              </summary>
              <p className="mt-3 text-gray-400 text-sm pl-4">
                There are no platform fees for staking. You only pay standard Arbitrum One gas fees (typically less than $0.10) when 
                staking, unstaking, or claiming rewards. No hidden fees or commissions.
              </p>
            </details>
            <details className="bg-gray-900/50 rounded-lg p-4 cursor-pointer group">
              <summary className="font-semibold text-white group-hover:text-yellow-400 transition">
                Where do the rewards come from?
              </summary>
              <p className="mt-3 text-gray-400 text-sm pl-4">
                Staking rewards come from the Axiom Protocol's ecosystem revenue and emissions schedule. This includes transaction fees, 
                protocol revenue, and allocated token emissions designed to incentivize early supporters of the Axiom Smart City ecosystem.
              </p>
            </details>
          </div>
        </div>

        {/* Risk Disclosure */}
        <div className="mb-8 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-3">⚠️ Important Information</h3>
          <div className="text-sm text-gray-300 space-y-2">
            <p>
              • <strong>Smart Contract Risk:</strong> While our contracts are audited, all DeFi protocols carry inherent smart contract risks.
            </p>
            <p>
              • <strong>Rewards Variability:</strong> APY estimates are not guaranteed and may fluctuate based on pool participation and market conditions.
            </p>
            <p>
              • <strong>Network Requirements:</strong> You must use Arbitrum One network. Always verify you're on the correct network before transacting.
            </p>
            <p>
              • <strong>Not Financial Advice:</strong> Staking rewards are not guaranteed. Only stake what you can afford to have locked in the protocol.
            </p>
          </div>
        </div>

        {/* Wallet Connection & Staking Interface */}
        {!isConnected ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Connect to Start Staking</h2>
            <p className="text-gray-400 mb-6">Connect your wallet to Arbitrum One to stake AXM and earn rewards</p>
            <div className="max-w-md mx-auto" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}>
              <WalletConnect variant="default" showUserInfo={false} />
            </div>
          </div>
        ) : (
          <>
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Connected:</span>
                <span className="text-yellow-400 font-mono">{formatAddress(account)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4 text-yellow-400">Stake / Unstake</h2>
                
                {pools.length === 0 ? (
                  <p className="text-gray-400">No staking pools available yet.</p>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-gray-300 mb-2">Select Pool</label>
                      <select
                        value={selectedPool}
                        onChange={(e) => setSelectedPool(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                      >
                        {pools.map((pool, idx) => (
                          <option key={idx} value={idx} disabled={!pool.active}>
                            Pool #{pool.id} {!pool.active && '(Inactive)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {pools[selectedPool] && (
                      <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Your Staked:</span>
                            <span className="text-yellow-400 font-semibold">
                              {formatTokens(userStakes.get(selectedPool)?.balance || BigInt(0))} AXM
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pending Rewards:</span>
                            <span className="text-green-400 font-semibold">
                              {formatTokens(userStakes.get(selectedPool)?.rewards || BigInt(0))} AXM
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Pool Staked:</span>
                            <span className="text-white">
                              {formatTokens(pools[selectedPool].totalStaked)} AXM
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-gray-300 mb-2">Amount (AXM)</label>
                      <input
                        type="number"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                        disabled={loading}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleStake}
                        disabled={loading || !pools[selectedPool]?.active}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 px-6 rounded-lg transition"
                      >
                        Stake
                      </button>
                      <button
                        onClick={handleUnstake}
                        disabled={loading || !pools[selectedPool]?.active}
                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition"
                      >
                        Unstake
                      </button>
                    </div>

                    {txStatus && (
                      <div className={`mt-4 p-3 rounded-lg ${loading ? 'bg-blue-900' : txStatus.includes('Error') ? 'bg-red-900' : 'bg-green-900'}`}>
                        <p className="text-sm">{txStatus}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4 text-yellow-400">Your Stakes</h2>
                
                {pools.length === 0 ? (
                  <p className="text-gray-400">No pools available.</p>
                ) : (
                  <div className="space-y-4">
                    {pools.map((pool, idx) => {
                      const stake = userStakes.get(idx);
                      const hasStake = stake && stake.balance > BigInt(0);
                      const hasRewards = stake && stake.rewards > BigInt(0);

                      if (!hasStake && !hasRewards) return null;

                      return (
                        <div key={idx} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-yellow-400">Pool #{pool.id}</h3>
                              <p className="text-xs text-gray-400 font-mono mt-1">
                                {formatAddress(pool.stakingToken)}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${pool.active ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
                              {pool.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Staked:</span>
                              <span className="text-white font-semibold">
                                {formatTokens(stake?.balance || BigInt(0))} AXM
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Rewards:</span>
                              <span className="text-green-400 font-semibold">
                                {formatTokens(stake?.rewards || BigInt(0))} AXM
                              </span>
                            </div>
                          </div>

                          {hasRewards && (
                            <button
                              onClick={() => handleClaimRewards(idx)}
                              disabled={loading}
                              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                            >
                              Claim Rewards
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
