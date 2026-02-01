import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useWallet } from '../contexts/WalletContext';
import { useNotificationHelpers } from '../components/NotificationSystem';
import { getContract, getProvider } from '../contracts/utils/contractHelpers';
import AxiomExchangeHubABI from '../contracts/abis/AxiomExchangeHub.json';

interface Pool {
  poolId: number;
  tokenA: string;
  tokenB: string;
  reserveA: string;
  reserveB: string;
  totalLiquidity: string;
  isActive: boolean;
  totalVolume: string;
  totalFees: string;
}

const DEX_CONTRACT_ADDRESS = "0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D";

const COMMON_TOKENS = [
  { symbol: 'AXM', address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', decimals: 18, name: 'Axiom Token' },
  { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, name: 'USD Coin' },
  { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, name: 'Tether USD' },
  { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, name: 'Wrapped Ether' },
  { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, name: 'Arbitrum' },
];

function InfoTooltip({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block ml-2">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="text-blue-400 hover:text-blue-300 transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 w-80 p-4 bg-gray-900 border border-gray-700 rounded-lg shadow-xl bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <h4 className="font-bold text-yellow-400 mb-2">{title}</h4>
          <div className="text-sm text-gray-300">{children}</div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

function InstructionCard({ title, steps, icon }: { title: string; steps: string[]; icon: string }) {
  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-gray-800/30 border-2 border-blue-500/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-4xl">{icon}</div>
          <h3 className="text-2xl font-bold text-blue-400">{title}</h3>
        </div>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <p className="text-gray-300 flex-1">{step}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export default function AxiomDEXPage() {
  const { account, isLoggedIn } = useWallet();
  const { showSuccess, showError, showWarning } = useNotificationHelpers();

  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'pools'>('swap');
  const [showInstructions, setShowInstructions] = useState(true);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [tokenInAddress, setTokenInAddress] = useState(COMMON_TOKENS[0].address);
  const [tokenOutAddress, setTokenOutAddress] = useState(COMMON_TOKENS[1].address);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  
  const [addLiqTokenA, setAddLiqTokenA] = useState(COMMON_TOKENS[0].address);
  const [addLiqTokenB, setAddLiqTokenB] = useState(COMMON_TOKENS[1].address);
  const [addLiqAmountA, setAddLiqAmountA] = useState('');
  const [addLiqAmountB, setAddLiqAmountB] = useState('');
  
  const [selectedPool, setSelectedPool] = useState<number | null>(null);
  const [priceImpact, setPriceImpact] = useState('0');
  
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLoggedIn && account) {
      loadPools();
      loadBalances();
    }
  }, [isLoggedIn, account]);

  useEffect(() => {
    if (amountIn && tokenInAddress && tokenOutAddress && selectedPool !== null) {
      calculateAmountOut();
    }
  }, [amountIn, tokenInAddress, tokenOutAddress, selectedPool]);

  const loadPools = async () => {
    const provider = await getProvider();
    if (!provider) return;
    
    setLoading(true);
    try {
      const dexContract = getContract(DEX_CONTRACT_ADDRESS, AxiomExchangeHubABI, provider);
      const nextPoolId = await dexContract.nextPoolId();
      
      const poolsData: Pool[] = [];
      for (let i = 0; i < nextPoolId.toNumber(); i++) {
        try {
          const pool = await dexContract.getPool(i);
          if (pool.isActive) {
            poolsData.push({
              poolId: pool.poolId.toNumber(),
              tokenA: pool.tokenA,
              tokenB: pool.tokenB,
              reserveA: ethers.utils.formatUnits(pool.reserveA, 18),
              reserveB: ethers.utils.formatUnits(pool.reserveB, 18),
              totalLiquidity: ethers.utils.formatUnits(pool.totalLiquidity, 18),
              isActive: pool.isActive,
              totalVolume: ethers.utils.formatUnits(pool.totalVolume, 18),
              totalFees: ethers.utils.formatUnits(pool.totalFees, 18),
            });
          }
        } catch (err) {
          console.log(`Pool ${i} not found or inactive`);
        }
      }
      
      setPools(poolsData);
      
      if (poolsData.length > 0) {
        setSelectedPool(poolsData[0].poolId);
      }
    } catch (error: any) {
      console.error('Error loading pools:', error);
      showError('Pool Loading Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    const provider = await getProvider();
    if (!provider || !account) return;
    
    const newBalances: Record<string, string> = {};
    
    for (const token of COMMON_TOKENS) {
      try {
        if (token.symbol === 'ETH') {
          const balance = await provider.getBalance(account);
          newBalances[token.address] = ethers.utils.formatEther(balance);
        } else {
          const tokenContract = new ethers.Contract(
            token.address,
            ['function balanceOf(address) view returns (uint256)'],
            provider
          );
          const balance = await tokenContract.balanceOf(account);
          newBalances[token.address] = ethers.utils.formatUnits(balance, token.decimals);
        }
      } catch (error) {
        console.error(`Error loading balance for ${token.symbol}:`, error);
        newBalances[token.address] = '0';
      }
    }
    
    setBalances(newBalances);
  };

  const calculateAmountOut = async () => {
    if (!amountIn || selectedPool === null) {
      setAmountOut('');
      return;
    }
    
    const provider = await getProvider();
    if (!provider) return;
    
    try {
      const dexContract = getContract(DEX_CONTRACT_ADDRESS, AxiomExchangeHubABI, provider);
      const tokenIn = COMMON_TOKENS.find(t => t.address.toLowerCase() === tokenInAddress.toLowerCase());
      
      if (!tokenIn) return;
      
      const amountInWei = ethers.utils.parseUnits(amountIn, tokenIn.decimals);
      const amountOutWei = await dexContract.getAmountOut(selectedPool, tokenInAddress, amountInWei);
      
      const tokenOut = COMMON_TOKENS.find(t => t.address.toLowerCase() === tokenOutAddress.toLowerCase());
      if (!tokenOut) return;
      
      const amountOutFormatted = ethers.utils.formatUnits(amountOutWei, tokenOut.decimals);
      setAmountOut(amountOutFormatted);
      
      const pool = pools.find(p => p.poolId === selectedPool);
      if (pool) {
        const impact = (parseFloat(amountIn) / parseFloat(pool.reserveA)) * 100;
        setPriceImpact(impact.toFixed(2));
      }
    } catch (error: any) {
      console.error('Error calculating amount out:', error);
      setAmountOut('0');
      setPriceImpact('0');
    }
  };

  const handleSwap = async () => {
    if (!account || selectedPool === null || !amountIn || !amountOut) {
      showWarning('Missing Information', 'Please fill in all swap fields');
      return;
    }
    
    const provider = await getProvider();
    if (!provider) {
      showError('Provider Error', 'Could not connect to wallet');
      return;
    }
    
    setLoading(true);
    try {
      const signer = provider.getSigner();
      const dexContract = getContract(DEX_CONTRACT_ADDRESS, AxiomExchangeHubABI, signer);
      
      const tokenIn = COMMON_TOKENS.find(t => t.address.toLowerCase() === tokenInAddress.toLowerCase());
      if (!tokenIn) throw new Error('Token not found');
      
      const amountInWei = ethers.utils.parseUnits(amountIn, tokenIn.decimals);
      const slippageFactor = 1 - (parseFloat(slippage) / 100);
      const minAmountOut = ethers.utils.parseUnits((parseFloat(amountOut) * slippageFactor).toFixed(6), 18);
      
      const tokenContract = new ethers.Contract(
        tokenInAddress,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );
      
      const approveTx = await tokenContract.approve(DEX_CONTRACT_ADDRESS, amountInWei);
      showSuccess('Approval Pending', 'Approving token spending...');
      await approveTx.wait();
      
      const swapTx = await dexContract.swap(selectedPool, tokenInAddress, amountInWei, minAmountOut);
      showSuccess('Swap Initiated', `Transaction: ${swapTx.hash}`);
      
      await swapTx.wait();
      showSuccess('Swap Successful', `Swapped ${amountIn} tokens successfully!`);
      
      setAmountIn('');
      setAmountOut('');
      await loadPools();
      await loadBalances();
    } catch (error: any) {
      console.error('Swap error:', error);
      showError('Swap Failed', error.message || 'Transaction rejected');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!account || !addLiqAmountA || !addLiqAmountB) {
      showWarning('Missing Information', 'Please fill in all liquidity fields');
      return;
    }
    
    const provider = await getProvider();
    if (!provider) {
      showError('Provider Error', 'Could not connect to wallet');
      return;
    }
    
    setLoading(true);
    try {
      const signer = provider.getSigner();
      const dexContract = getContract(DEX_CONTRACT_ADDRESS, AxiomExchangeHubABI, signer);
      
      const poolResult = await dexContract.getPoolByTokens(addLiqTokenA, addLiqTokenB);
      const poolExists = poolResult[1];
      
      const amountAWei = ethers.utils.parseUnits(addLiqAmountA, 18);
      const amountBWei = ethers.utils.parseUnits(addLiqAmountB, 18);
      
      const tokenAContract = new ethers.Contract(
        addLiqTokenA,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );
      const tokenBContract = new ethers.Contract(
        addLiqTokenB,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );
      
      const approveTxA = await tokenAContract.approve(DEX_CONTRACT_ADDRESS, amountAWei);
      await approveTxA.wait();
      
      const approveTxB = await tokenBContract.approve(DEX_CONTRACT_ADDRESS, amountBWei);
      await approveTxB.wait();
      
      let tx;
      if (poolExists) {
        const poolId = poolResult[0].toNumber();
        tx = await dexContract.addLiquidity(poolId, amountAWei, amountBWei, 0);
        showSuccess('Adding Liquidity', `Transaction: ${tx.hash}`);
      } else {
        tx = await dexContract.createPool(addLiqTokenA, addLiqTokenB, amountAWei, amountBWei);
        showSuccess('Creating Pool', `Transaction: ${tx.hash}`);
      }
      
      await tx.wait();
      showSuccess('Success', poolExists ? 'Liquidity added successfully!' : 'Pool created successfully!');
      
      setAddLiqAmountA('');
      setAddLiqAmountB('');
      await loadPools();
      await loadBalances();
    } catch (error: any) {
      console.error('Add liquidity error:', error);
      showError('Operation Failed', error.message || 'Transaction rejected');
    } finally {
      setLoading(false);
    }
  };

  const getTokenSymbol = (address: string) => {
    const token = COMMON_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
    return token?.symbol || 'UNKNOWN';
  };

  const getTokenBalance = (address: string) => {
    return balances[address] || '0';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header with Instructions Toggle */}
        <div className="text-center mb-12">
          <div className="inline-block bg-yellow-500/20 border border-yellow-400 rounded-full px-6 py-2 mb-4">
            <span className="text-yellow-400 font-semibold">⚡ Built on Arbitrum One</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
              Axiom Exchange Hub
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-6">
            Trade tokenized assets, provide liquidity, and earn fees on America's first sovereign smart city DEX
          </p>
          
          {/* Instructions Toggle */}
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            {showInstructions ? '📖 Hide Instructions' : '📖 Show Instructions'}
          </button>
          
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-4xl mx-auto">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{pools.length}</div>
              <div className="text-sm text-gray-400">Active Pools</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">
                ${pools.reduce((sum, p) => sum + parseFloat(p.totalVolume), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-sm text-gray-400">Total Volume</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">0.3%</div>
              <div className="text-sm text-gray-400">Trading Fee</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">
                ${pools.reduce((sum, p) => sum + parseFloat(p.totalFees), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-400">Fees Collected</div>
            </div>
          </div>
        </div>

        {/* Educational Section */}
        {showInstructions && (
          <div className="mb-12 space-y-6">
            <Card className="bg-gradient-to-br from-yellow-900/30 to-gray-800/30 border-2 border-yellow-500/30">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-yellow-400 mb-6 flex items-center gap-3">
                  <span>📚</span> What is a DEX (Decentralized Exchange)?
                </h2>
                <div className="space-y-4 text-gray-300">
                  <p className="text-lg leading-relaxed">
                    A DEX is a cryptocurrency exchange that operates without a central authority. Instead of relying on a company to hold your funds, 
                    <strong className="text-white"> you maintain full control of your assets at all times</strong>. Trades happen directly between users (peer-to-peer) 
                    through automated smart contracts on the blockchain.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                      <div className="text-2xl mb-2">✅</div>
                      <h3 className="font-bold text-green-400 mb-2">Your Keys, Your Crypto</h3>
                      <p className="text-sm">You keep complete control of your funds. No company can freeze or access your assets.</p>
                    </div>
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                      <div className="text-2xl mb-2">🔒</div>
                      <h3 className="font-bold text-blue-400 mb-2">Transparent & Secure</h3>
                      <p className="text-sm">All transactions are recorded on the blockchain. Anyone can verify the smart contract code.</p>
                    </div>
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                      <div className="text-2xl mb-2">💰</div>
                      <h3 className="font-bold text-purple-400 mb-2">Earn While You Hold</h3>
                      <p className="text-sm">Become a liquidity provider and earn a share of trading fees from every swap.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tab-Specific Instructions */}
            {activeTab === 'swap' && (
              <InstructionCard
                title="How to Swap Tokens"
                icon="🔄"
                steps={[
                  "Connect your wallet by clicking the 'Connect Wallet' button in the top right corner.",
                  "Select the token you want to trade FROM in the top dropdown (e.g., AXM).",
                  "Enter the amount you want to swap in the 'From' field.",
                  "Select the token you want to receive in the bottom dropdown (e.g., USDC).",
                  "Review the estimated amount you'll receive and the price impact.",
                  "Adjust slippage tolerance if needed (default 0.5% works for most trades).",
                  "Click 'Swap Tokens' and approve the transaction in your wallet.",
                  "Wait for confirmation - your tokens will appear in your wallet within seconds!"
                ]}
              />
            )}

            {activeTab === 'liquidity' && (
              <InstructionCard
                title="How to Add Liquidity & Earn Fees"
                icon="💧"
                steps={[
                  "Connect your wallet to access liquidity features.",
                  "Select two tokens you want to pair (e.g., AXM and USDC).",
                  "Enter the amount for Token A - the interface will suggest Token B amount based on the current ratio.",
                  "Review your liquidity position - you'll receive LP (Liquidity Provider) tokens representing your share.",
                  "Click 'Add Liquidity' and approve both token spending in your wallet.",
                  "Earn 0.3% of all trading fees proportional to your share of the pool!",
                  "Track your earnings in the Pools tab and withdraw anytime."
                ]}
              />
            )}

            {activeTab === 'pools' && (
              <InstructionCard
                title="Understanding Liquidity Pools"
                icon="📊"
                steps={[
                  "Each pool contains two tokens (a trading pair) like AXM/USDC.",
                  "Reserves show how much of each token is currently in the pool.",
                  "Total Volume indicates all-time trading activity in the pool.",
                  "Fees Collected are distributed to liquidity providers based on their share.",
                  "Higher volume pools typically generate more fees for providers.",
                  "Click 'Refresh' to see the latest pool statistics.",
                  "Choose pools with good volume and balanced reserves for best returns."
                ]}
              />
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-2 inline-flex gap-2">
            <button
              onClick={() => setActiveTab('swap')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'swap'
                  ? 'bg-yellow-500 text-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              🔄 Swap
            </button>
            <button
              onClick={() => setActiveTab('liquidity')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'liquidity'
                  ? 'bg-yellow-500 text-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              💧 Liquidity
            </button>
            <button
              onClick={() => setActiveTab('pools')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'pools'
                  ? 'bg-yellow-500 text-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              📊 Pools
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'swap' && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30">
              <CardContent className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold text-yellow-400">Swap Tokens</h2>
                  <InfoTooltip title="What is Token Swapping?">
                    Token swapping lets you instantly exchange one cryptocurrency for another at the current market rate. 
                    The price is determined by the ratio of tokens in the liquidity pool (automated market maker algorithm).
                  </InfoTooltip>
                </div>
                
                {!isLoggedIn ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔗</div>
                    <p className="text-gray-400 mb-6 text-lg">Connect your wallet to start trading</p>
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mb-6">
                      <h4 className="font-bold text-blue-400 mb-3">First time using a DEX?</h4>
                      <ul className="text-sm text-gray-300 space-y-2 text-left">
                        <li>• You'll need a Web3 wallet like MetaMask</li>
                        <li>• Make sure you're on the Arbitrum One network</li>
                        <li>• Have some ETH for gas fees (~$0.15-$5 per transaction)</li>
                        <li>• Your wallet, your keys - you maintain full control</li>
                      </ul>
                    </div>
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg px-8 py-4">
                      Connect Wallet to Trade
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pool Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2 flex items-center">
                        Select Trading Pool
                        <InfoTooltip title="Trading Pools">
                          Each pool represents a pair of tokens available for trading. The pool must have sufficient liquidity 
                          for your trade. Choose the pool that matches the tokens you want to swap.
                        </InfoTooltip>
                      </label>
                      <select
                        value={selectedPool !== null ? selectedPool : ''}
                        onChange={(e) => setSelectedPool(parseInt(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                      >
                        {pools.length === 0 ? (
                          <option>No pools available - Add liquidity first</option>
                        ) : (
                          pools.map(pool => (
                            <option key={pool.poolId} value={pool.poolId}>
                              {getTokenSymbol(pool.tokenA)} / {getTokenSymbol(pool.tokenB)} 
                              {' '}(Vol: ${parseFloat(pool.totalVolume).toLocaleString()})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* From Token */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-400">You Pay</label>
                        <span className="text-sm text-gray-400">
                          Balance: {parseFloat(getTokenBalance(tokenInAddress)).toFixed(4)}
                          <button 
                            onClick={() => setAmountIn(getTokenBalance(tokenInAddress))}
                            className="ml-2 text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            MAX
                          </button>
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={amountIn}
                          onChange={(e) => setAmountIn(e.target.value)}
                          className="flex-1 bg-gray-700 border-gray-600 text-white text-2xl"
                        />
                        <select
                          value={tokenInAddress}
                          onChange={(e) => setTokenInAddress(e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white font-semibold min-w-[120px]"
                        >
                          {COMMON_TOKENS.map(token => (
                            <option key={token.address} value={token.address}>
                              {token.symbol}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {COMMON_TOKENS.find(t => t.address === tokenInAddress)?.name}
                      </div>
                    </div>

                    {/* Swap Direction Arrow */}
                    <div className="text-center">
                      <button 
                        onClick={() => {
                          const temp = tokenInAddress;
                          setTokenInAddress(tokenOutAddress);
                          setTokenOutAddress(temp);
                        }}
                        className="bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-full p-3 transition-colors"
                        title="Reverse swap direction"
                      >
                        <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                    </div>

                    {/* To Token */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-400">You Receive (estimated)</label>
                        <span className="text-sm text-gray-400">
                          Balance: {parseFloat(getTokenBalance(tokenOutAddress)).toFixed(4)}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={amountOut}
                          readOnly
                          className="flex-1 bg-gray-700 border-gray-600 text-white text-2xl"
                        />
                        <select
                          value={tokenOutAddress}
                          onChange={(e) => setTokenOutAddress(e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white font-semibold min-w-[120px]"
                        >
                          {COMMON_TOKENS.map(token => (
                            <option key={token.address} value={token.address}>
                              {token.symbol}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {COMMON_TOKENS.find(t => t.address === tokenOutAddress)?.name}
                      </div>
                    </div>

                    {/* Swap Details */}
                    {amountOut && (
                      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 flex items-center">
                            Price Impact
                            <InfoTooltip title="Price Impact">
                              How much your trade affects the token price. Large trades have higher impact. 
                              If impact is over 5%, consider splitting into smaller trades.
                            </InfoTooltip>
                          </span>
                          <span className={parseFloat(priceImpact) > 5 ? 'text-red-400 font-bold' : 'text-green-400'}>
                            {priceImpact}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 flex items-center">
                            Slippage Tolerance
                            <InfoTooltip title="Slippage Tolerance">
                              Maximum price movement you'll accept. If the price changes more than this percentage, 
                              your transaction will fail to protect you. Default 0.5% is safe for most trades.
                            </InfoTooltip>
                          </span>
                          <input
                            type="number"
                            value={slippage}
                            onChange={(e) => setSlippage(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-20 text-right"
                            step="0.1"
                            min="0.1"
                            max="50"
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Minimum Received</span>
                          <span className="text-white font-semibold">
                            {(parseFloat(amountOut) * (1 - parseFloat(slippage) / 100)).toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 flex items-center">
                            Trading Fee
                            <InfoTooltip title="Trading Fee">
                              0.3% of your trade goes to liquidity providers who make trading possible. 
                              This is automatically deducted from your swap amount.
                            </InfoTooltip>
                          </span>
                          <span className="text-white font-semibold">0.3%</span>
                        </div>
                      </div>
                    )}

                    {parseFloat(priceImpact) > 5 && (
                      <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
                        <p className="text-red-400 font-bold text-sm flex items-start gap-2">
                          <span className="text-xl">⚠️</span>
                          <span>
                            <strong>High Price Impact Warning:</strong> This trade will significantly move the market price. 
                            You may receive much less than expected. Consider splitting into smaller trades or waiting for more liquidity.
                          </span>
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleSwap}
                      disabled={loading || !amountIn || !amountOut || pools.length === 0}
                      className="w-full py-6 text-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : pools.length === 0 ? 'No Pools Available' : 'Swap Tokens'}
                    </Button>

                    {pools.length === 0 && (
                      <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 text-center">
                        <p className="text-orange-400">
                          ℹ️ No liquidity pools exist yet. Switch to the <strong>Liquidity</strong> tab to create the first pool!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'liquidity' && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-blue-500/30">
              <CardContent className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold text-blue-400">Add Liquidity</h2>
                  <InfoTooltip title="What is Liquidity?">
                    Liquidity providers deposit pairs of tokens into pools. These pools enable other users to trade. 
                    In return, you earn 0.3% of all trading fees proportional to your share of the pool.
                  </InfoTooltip>
                </div>
                
                {!isLoggedIn ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔗</div>
                    <p className="text-gray-400 mb-6 text-lg">Connect your wallet to provide liquidity</p>
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mb-6">
                      <h4 className="font-bold text-blue-400 mb-3">Why become a liquidity provider?</h4>
                      <ul className="text-sm text-gray-300 space-y-2 text-left">
                        <li>✓ Earn passive income from trading fees (0.3% of every trade)</li>
                        <li>✓ Higher returns than traditional savings accounts</li>
                        <li>✓ Support the Axiom ecosystem and enable trading</li>
                        <li>✓ Withdraw your liquidity anytime</li>
                      </ul>
                    </div>
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg px-8 py-4">
                      Connect Wallet to Provide Liquidity
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Educational Notice */}
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                      <h4 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                        <span>💡</span> How Liquidity Provision Works
                      </h4>
                      <ul className="text-sm text-gray-300 space-y-2">
                        <li><strong>1. Deposit Equal Value:</strong> You must provide equal dollar value of both tokens (e.g., $100 of AXM + $100 of USDC)</li>
                        <li><strong>2. Receive LP Tokens:</strong> You get Liquidity Provider tokens representing your share of the pool</li>
                        <li><strong>3. Earn Fees:</strong> Every trade in this pool generates a 0.3% fee that's distributed to all LP holders</li>
                        <li><strong>4. Withdraw Anytime:</strong> Burn your LP tokens to withdraw your share plus accumulated fees</li>
                      </ul>
                    </div>

                    {/* Token A */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-400">Token A</label>
                        <span className="text-sm text-gray-400">
                          Balance: {parseFloat(getTokenBalance(addLiqTokenA)).toFixed(4)}
                          <button 
                            onClick={() => setAddLiqAmountA(getTokenBalance(addLiqTokenA))}
                            className="ml-2 text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            MAX
                          </button>
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={addLiqAmountA}
                          onChange={(e) => setAddLiqAmountA(e.target.value)}
                          className="flex-1 bg-gray-700 border-gray-600 text-white text-2xl"
                        />
                        <select
                          value={addLiqTokenA}
                          onChange={(e) => setAddLiqTokenA(e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white font-semibold min-w-[120px]"
                        >
                          {COMMON_TOKENS.map(token => (
                            <option key={token.address} value={token.address}>
                              {token.symbol}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {COMMON_TOKENS.find(t => t.address === addLiqTokenA)?.name}
                      </div>
                    </div>

                    <div className="text-center text-gray-500 font-bold text-2xl">+</div>

                    {/* Token B */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-400">Token B</label>
                        <span className="text-sm text-gray-400">
                          Balance: {parseFloat(getTokenBalance(addLiqTokenB)).toFixed(4)}
                          <button 
                            onClick={() => setAddLiqAmountB(getTokenBalance(addLiqTokenB))}
                            className="ml-2 text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            MAX
                          </button>
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={addLiqAmountB}
                          onChange={(e) => setAddLiqAmountB(e.target.value)}
                          className="flex-1 bg-gray-700 border-gray-600 text-white text-2xl"
                        />
                        <select
                          value={addLiqTokenB}
                          onChange={(e) => setAddLiqTokenB(e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white font-semibold min-w-[120px]"
                        >
                          {COMMON_TOKENS.map(token => (
                            <option key={token.address} value={token.address}>
                              {token.symbol}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {COMMON_TOKENS.find(t => t.address === addLiqTokenB)?.name}
                      </div>
                    </div>

                    {/* Important Risks Warning */}
                    <div className="bg-yellow-900/20 border-2 border-yellow-500 rounded-lg p-6">
                      <h4 className="font-bold text-yellow-400 mb-3 flex items-center gap-2">
                        <span>⚠️</span> Impermanent Loss Risk
                      </h4>
                      <p className="text-sm text-gray-300 mb-3">
                        <strong>Important:</strong> If the price ratio between your two tokens changes significantly, you may experience "impermanent loss." 
                        This means you could have more value by simply holding the tokens instead of providing liquidity.
                      </p>
                      <details className="text-sm text-gray-400">
                        <summary className="cursor-pointer font-semibold text-yellow-400 hover:text-yellow-300">
                          Click to learn more about impermanent loss
                        </summary>
                        <p className="mt-3 leading-relaxed">
                          Example: You deposit $100 of AXM and $100 of USDC. If AXM price doubles, the automated algorithm rebalances the pool. 
                          You end up with less AXM and more USDC than you started with. The "loss" is impermanent because if prices return to the original ratio, it disappears. 
                          <strong className="text-white"> Trading fees often compensate for small price changes</strong>, but large movements can result in overall loss.
                        </p>
                      </details>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                      <p className="text-blue-400 text-sm">
                        💡 <strong>Earn Fees:</strong> Liquidity providers earn 0.3% of all trades proportional to their share of the pool. 
                        High-volume pools generate more fees. Your earnings compound automatically!
                      </p>
                    </div>

                    <Button
                      onClick={handleAddLiquidity}
                      disabled={loading || !addLiqAmountA || !addLiqAmountB}
                      className="w-full py-6 text-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : 'Add Liquidity & Earn Fees'}
                    </Button>

                    <div className="text-center text-xs text-gray-500">
                      You will need to approve both tokens before adding liquidity. This requires two separate transactions.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'pools' && (
          <div className="max-w-6xl mx-auto">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-purple-500/30">
              <CardContent className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-purple-400">Liquidity Pools</h2>
                    <InfoTooltip title="Pool Statistics">
                      This shows all active trading pairs on the DEX. Reserves indicate how much of each token is available. 
                      Higher reserves mean better prices and lower slippage for traders. Total volume shows all-time trading activity.
                    </InfoTooltip>
                  </div>
                  <Button
                    onClick={loadPools}
                    disabled={loading}
                    variant="outline"
                    className="border-purple-400 text-purple-400 hover:bg-purple-400/10"
                  >
                    {loading ? 'Refreshing...' : '🔄 Refresh Pools'}
                  </Button>
                </div>

                {/* Educational Notice for Pools */}
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 mb-8">
                  <h4 className="font-bold text-purple-400 mb-3">📊 Understanding Pool Metrics</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>
                      <p className="mb-2"><strong className="text-white">Reserve A & B:</strong> Amount of each token currently in the pool. More reserves = better liquidity.</p>
                      <p><strong className="text-white">Total Volume:</strong> All-time trading activity. High volume pools are more active and generate more fees.</p>
                    </div>
                    <div>
                      <p className="mb-2"><strong className="text-white">Fees Collected:</strong> Total trading fees earned by all liquidity providers in this pool.</p>
                      <p><strong className="text-white">APY Potential:</strong> Higher volume relative to liquidity means better returns for providers.</p>
                    </div>
                  </div>
                </div>

                {pools.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-6">🌊</div>
                    <h3 className="text-2xl font-bold text-purple-400 mb-4">No Active Pools Yet</h3>
                    <p className="text-gray-400 text-lg mb-6">Be the first to create a liquidity pool and start earning trading fees!</p>
                    
                    <div className="max-w-2xl mx-auto bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-left">
                      <h4 className="font-bold text-white mb-4 text-lg">How to Create the First Pool:</h4>
                      <ol className="space-y-3 text-gray-300">
                        <li className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                          <span>Click the <strong className="text-white">"Liquidity"</strong> tab above</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                          <span>Select two tokens you want to create a trading pair for (e.g., AXM + USDC)</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                          <span>Enter equal dollar value of both tokens</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                          <span>Click "Add Liquidity" - the pool will be created automatically!</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                          <span>You'll start earning 0.3% of all trading fees immediately</span>
                        </li>
                      </ol>
                    </div>
                    
                    <Button
                      onClick={() => setActiveTab('liquidity')}
                      className="mt-8 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg px-10 py-4"
                    >
                      Go to Liquidity Tab →
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {pools.map(pool => (
                      <div
                        key={pool.poolId}
                        className="bg-gray-800/50 border-2 border-gray-700 hover:border-purple-500 rounded-xl p-6 transition-all"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="text-3xl font-bold text-white mb-2">
                              {getTokenSymbol(pool.tokenA)} / {getTokenSymbol(pool.tokenB)}
                            </h3>
                            <p className="text-sm text-gray-400">Pool ID: {pool.poolId}</p>
                          </div>
                          <div className="bg-green-500/20 border border-green-400 rounded-full px-5 py-2">
                            <span className="text-green-400 font-semibold text-sm flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                              Active
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="bg-gray-900/50 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-2">Reserve A</p>
                            <p className="text-2xl font-bold text-white mb-1">
                              {parseFloat(pool.reserveA).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-purple-400">{getTokenSymbol(pool.tokenA)}</p>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-2">Reserve B</p>
                            <p className="text-2xl font-bold text-white mb-1">
                              {parseFloat(pool.reserveB).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-purple-400">{getTokenSymbol(pool.tokenB)}</p>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-2">Total Volume</p>
                            <p className="text-2xl font-bold text-green-400 mb-1">
                              ${parseFloat(pool.totalVolume).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-gray-500">All-time</p>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-2">Fees Earned</p>
                            <p className="text-2xl font-bold text-yellow-400 mb-1">
                              ${parseFloat(pool.totalFees).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500">For LPs</p>
                          </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-700">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-400">
                              💡 <strong>Liquidity providers</strong> in this pool earn {((parseFloat(pool.totalFees) / parseFloat(pool.totalVolume)) * 100).toFixed(3)}% returns from fees
                            </div>
                            <Button
                              onClick={() => {
                                setAddLiqTokenA(pool.tokenA);
                                setAddLiqTokenB(pool.tokenB);
                                setActiveTab('liquidity');
                              }}
                              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold"
                            >
                              Add Liquidity to This Pool
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security & Risk Disclosure Footer */}
        <div className="max-w-6xl mx-auto mt-16 space-y-6">
          {/* Security Notice */}
          <Card className="bg-gray-800/30 border border-gray-700">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">🔒 Security & Transparency</h3>
              <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-400">
                <div>
                  <h4 className="font-bold text-white mb-2">Smart Contract Security</h4>
                  <p className="mb-2">✅ Deployed on Arbitrum One mainnet</p>
                  <p className="mb-2">✅ Verified source code on Blockscout</p>
                  <p>✅ Reentrancy protection enabled</p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2">Your Control</h4>
                  <p className="mb-2">✅ Non-custodial - you control your keys</p>
                  <p className="mb-2">✅ All transactions on-chain & verifiable</p>
                  <p>✅ Withdraw liquidity anytime</p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2">Fee Structure</h4>
                  <p className="mb-2">✅ 0.3% trading fee (industry standard)</p>
                  <p className="mb-2">✅ 100% of fees go to liquidity providers</p>
                  <p>✅ No hidden charges</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Disclosure */}
          <Card className="bg-red-900/10 border-2 border-red-500/30">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Risk Disclosure</h3>
              <div className="text-sm text-gray-300 space-y-3">
                <p>
                  <strong className="text-white">Smart Contract Risk:</strong> While our contracts are audited and tested, all smart contracts carry inherent risk. 
                  Only invest what you can afford to lose.
                </p>
                <p>
                  <strong className="text-white">Impermanent Loss:</strong> Providing liquidity exposes you to impermanent loss if token prices diverge significantly. 
                  Trading fees may not always compensate for this loss.
                </p>
                <p>
                  <strong className="text-white">Market Volatility:</strong> Cryptocurrency prices are highly volatile. The value of your holdings can fluctuate dramatically.
                </p>
                <p>
                  <strong className="text-white">No Guarantees:</strong> Past performance does not guarantee future results. APY estimates are not guaranteed and can change based on market conditions.
                </p>
                <p className="text-red-400 font-semibold">
                  By using this DEX, you acknowledge that you understand these risks and accept full responsibility for your trading decisions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="bg-gray-800/30 border border-gray-700">
            <CardContent className="p-6">
              <h3 className="text-2xl font-bold text-blue-400 mb-6">❓ Frequently Asked Questions</h3>
              <div className="space-y-4">
                <details className="bg-gray-900/30 rounded-lg p-4 cursor-pointer">
                  <summary className="font-bold text-white hover:text-blue-400 transition">
                    How long does a swap take?
                  </summary>
                  <p className="mt-3 text-gray-300 text-sm">
                    On Arbitrum One, transactions typically confirm within 1-5 seconds. You'll see your new tokens in your wallet almost instantly. 
                    Gas fees are very low (usually $0.15-$5) compared to Ethereum mainnet.
                  </p>
                </details>
                
                <details className="bg-gray-900/30 rounded-lg p-4 cursor-pointer">
                  <summary className="font-bold text-white hover:text-blue-400 transition">
                    What is slippage and why does it matter?
                  </summary>
                  <p className="mt-3 text-gray-300 text-sm">
                    Slippage is the difference between the expected price and the actual price you get. In volatile markets or low-liquidity pools, 
                    prices can change between when you submit your transaction and when it confirms. Setting slippage tolerance protects you from 
                    unexpected price movements.
                  </p>
                </details>
                
                <details className="bg-gray-900/30 rounded-lg p-4 cursor-pointer">
                  <summary className="font-bold text-white hover:text-blue-400 transition">
                    How are liquidity provider fees calculated?
                  </summary>
                  <p className="mt-3 text-gray-300 text-sm">
                    Every trade pays a 0.3% fee. If you own 1% of a pool's liquidity, you earn 1% of all fees generated by that pool. 
                    For example, if $100,000 is traded in a pool where you own 1% of liquidity, you earn $30 (0.3% of $100,000 × 1% ownership). 
                    Fees compound automatically as they're added to the pool.
                  </p>
                </details>
                
                <details className="bg-gray-900/30 rounded-lg p-4 cursor-pointer">
                  <summary className="font-bold text-white hover:text-blue-400 transition">
                    Can I lose money providing liquidity?
                  </summary>
                  <p className="mt-3 text-gray-300 text-sm">
                    Yes. Impermanent loss occurs when token prices change relative to each other. If one token increases significantly in value, 
                    you may have been better off simply holding both tokens instead of providing liquidity. However, trading fees often compensate 
                    for small price movements. Consider providing liquidity for stable pairs or tokens you believe will maintain similar price ratios.
                  </p>
                </details>
                
                <details className="bg-gray-900/30 rounded-lg p-4 cursor-pointer">
                  <summary className="font-bold text-white hover:text-blue-400 transition">
                    What tokens are supported?
                  </summary>
                  <p className="mt-3 text-gray-300 text-sm">
                    Currently we support: AXM (Axiom token), USDC, USDT, WETH (Wrapped Ether), and ARB (Arbitrum). All tokens are on the Arbitrum One network. 
                    You can create pools for any combination of these tokens. More tokens may be added based on community governance.
                  </p>
                </details>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
