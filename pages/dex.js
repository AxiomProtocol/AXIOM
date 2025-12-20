import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';
import toast, { Toaster } from 'react-hot-toast';
import { ethers } from 'ethers';
import DisclosureBanner from '../components/DisclosureBanner';

const AdvancedTradingChart = dynamic(() => import('../components/AdvancedTradingChart'), { ssr: false });

const EXCHANGE_HUB_ADDRESS = '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D';
const AXM_TOKEN_ADDRESS = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

const EXCHANGE_ABI = [
  "function totalPools() external view returns (uint256)",
  "function totalSwaps() external view returns (uint256)",
  "function swapFee() external view returns (uint256)",
  "function getPool(uint256 poolId) external view returns (tuple(uint256 poolId, address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, uint256 totalLiquidity, uint256 lockedLiquidity, bool isActive, uint256 createdAt, uint256 totalVolume, uint256 totalFees))",
  "function getPoolByPair(address tokenA, address tokenB) external view returns (uint256)",
  "function getUserLiquidity(uint256 poolId, address provider) external view returns (uint256)",
  "function getUserPools(address user) external view returns (uint256[])",
  "function getAmountOut(uint256 poolId, address tokenIn, uint256 amountIn) external view returns (uint256)",
  "function getPriceImpact(uint256 poolId, address tokenIn, uint256 amountIn) external view returns (uint256)",
  "function createPool(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external returns (uint256)",
  "function addLiquidity(uint256 poolId, uint256 amountA, uint256 amountB, uint256 minLiquidity) external returns (uint256)",
  "function removeLiquidity(uint256 poolId, uint256 liquidity, uint256 minAmountA, uint256 minAmountB) external returns (uint256, uint256)",
  "function swap(uint256 poolId, address tokenIn, uint256 amountIn, uint256 minAmountOut) external returns (uint256)",
  "function pairToPoolId(address, address) external view returns (uint256)",
  "function liquidityBalances(uint256, address) external view returns (uint256)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const WETH_ABI = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)"
];

const TOKENS = [
  { symbol: 'AXM', name: 'Axiom Protocol Token', address: AXM_TOKEN_ADDRESS, decimals: 18, logo: '/images/axiom-token.png' },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, logo: null },
  { symbol: 'WBNB', name: 'Wrapped BNB', address: '0xa9004A5421372E1D83fB1f85b0fc986c912f91f3', decimals: 18, logo: null },
  { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, logo: null },
  { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, logo: null },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, logo: null },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, logo: null },
  { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, logo: null },
  { symbol: 'LINK', name: 'Chainlink', address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals: 18, logo: null },
  { symbol: 'wstETH', name: 'Lido Wrapped Staked ETH', address: '0x5979D7b546E38E414F7E9822514be443A4800529', decimals: 18, logo: null },
  { symbol: 'FRAX', name: 'Frax Stablecoin', address: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F', decimals: 18, logo: null },
  { symbol: 'PENDLE', name: 'Pendle', address: '0x0c880f6761F1af8d9Aa9C466984b80Dab9a8c9e8', decimals: 18, logo: null },
  { symbol: 'GNS', name: 'Gains Network', address: '0x18c11FD286C5EC11c3b683Caa813B77f5163A122', decimals: 18, logo: null },
  { symbol: 'MAGIC', name: 'Treasure', address: '0x539bDE0d7Dbd336b79148AA742883198BBF60342', decimals: 18, logo: null },
  { symbol: 'GMX', name: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', decimals: 18, logo: null },
];

const MAX_UINT256 = ethers.MaxUint256;

export default function DexPage() {
  const { walletState, connectMetaMask } = useWallet();
  const [activeTab, setActiveTab] = useState('swap');
  const [stats, setStats] = useState({ totalPools: 0, totalSwaps: 0, swapFee: 30, tvl: '0' });
  const [pools, setPools] = useState([]);
  const [userPositions, setUserPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState({});
  const [showCreatePool, setShowCreatePool] = useState(false);
  
  const [swapForm, setSwapForm] = useState({
    tokenIn: TOKENS[0],
    tokenOut: TOKENS[1],
    amountIn: '',
    amountOut: '0',
    priceImpact: 0,
    slippage: 0.5,
    poolId: null
  });
  
  const [liquidityForm, setLiquidityForm] = useState({
    tokenA: TOKENS[0],
    tokenB: TOKENS[1],
    amountA: '',
    amountB: '',
    poolId: null,
    poolExists: false
  });

  const [createPoolForm, setCreatePoolForm] = useState({
    tokenA: TOKENS[0],
    tokenB: TOKENS[2],
    amountA: '',
    amountB: ''
  });

  const [showWrapModal, setShowWrapModal] = useState(false);
  const [wrapAmount, setWrapAmount] = useState('');
  const [wrapMode, setWrapMode] = useState('wrap');
  const [ethBalance, setEthBalance] = useState('0');
  const [wethBalance, setWethBalance] = useState('0');
  const [wrapping, setWrapping] = useState(false);
  
  const [showAddToPoolModal, setShowAddToPoolModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [addToPoolForm, setAddToPoolForm] = useState({ amountA: '', amountB: '' });
  
  const account = walletState.address;
  const isConnected = walletState.isConnected;

  const getProvider = useCallback(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return new ethers.JsonRpcProvider(ARBITRUM_RPC);
  }, []);

  const getReadOnlyProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(ARBITRUM_RPC);
  }, []);

  const loadEthWethBalances = useCallback(async () => {
    if (!account) return;
    try {
      const provider = getProvider();
      const ethBal = await provider.getBalance(account);
      setEthBalance(ethers.formatEther(ethBal));
      
      const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, provider);
      const wethBal = await wethContract.balanceOf(account);
      setWethBalance(ethers.formatEther(wethBal));
    } catch (error) {
      console.error('Failed to load ETH/WETH balances:', error);
    }
  }, [account, getProvider]);

  const handleWrap = async () => {
    if (!wrapAmount || parseFloat(wrapAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    setWrapping(true);
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, signer);

      if (wrapMode === 'wrap') {
        const amountWei = ethers.parseEther(wrapAmount);
        toast.loading('Wrapping ETH to WETH...', { id: 'wrap' });
        const tx = await wethContract.deposit({ value: amountWei });
        await tx.wait();
        toast.success(
          <div>
            Successfully wrapped {wrapAmount} ETH to WETH!
            <a 
              href={`https://arbiscan.io/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-amber-600 hover:underline text-sm mt-1"
            >
              View on Arbiscan
            </a>
          </div>,
          { id: 'wrap', duration: 5000 }
        );
      } else {
        const amountWei = ethers.parseEther(wrapAmount);
        toast.loading('Unwrapping WETH to ETH...', { id: 'wrap' });
        const tx = await wethContract.withdraw(amountWei);
        await tx.wait();
        toast.success(
          <div>
            Successfully unwrapped {wrapAmount} WETH to ETH!
            <a 
              href={`https://arbiscan.io/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-amber-600 hover:underline text-sm mt-1"
            >
              View on Arbiscan
            </a>
          </div>,
          { id: 'wrap', duration: 5000 }
        );
      }

      setWrapAmount('');
      loadEthWethBalances();
      loadBalances();
    } catch (error) {
      console.error('Wrap/Unwrap failed:', error);
      toast.error(error.reason || error.message || 'Transaction failed', { id: 'wrap' });
    } finally {
      setWrapping(false);
    }
  };

  const loadOnChainStats = useCallback(async () => {
    try {
      const provider = getReadOnlyProvider();
      const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, provider);
      
      const [totalPools, totalSwaps, swapFee] = await Promise.all([
        contract.totalPools(),
        contract.totalSwaps(),
        contract.swapFee()
      ]);

      let tvl = BigInt(0);
      const poolsData = [];
      const poolCount = Number(totalPools);

      for (let i = 1; i <= poolCount; i++) {
        try {
          const pool = await contract.getPool(i);
          if (pool.isActive) {
            poolsData.push({
              poolId: Number(pool.poolId),
              tokenA: pool.tokenA,
              tokenB: pool.tokenB,
              reserveA: pool.reserveA.toString(),
              reserveB: pool.reserveB.toString(),
              totalLiquidity: pool.totalLiquidity.toString(),
              totalVolume: pool.totalVolume.toString(),
              totalFees: pool.totalFees.toString(),
              isActive: pool.isActive
            });
          }
        } catch (e) {
          console.error(`Failed to load pool ${i}:`, e);
        }
      }

      setPools(poolsData);
      setStats({
        totalPools: poolCount,
        totalSwaps: Number(totalSwaps),
        swapFee: Number(swapFee),
        tvl: ethers.formatEther(tvl)
      });
    } catch (error) {
      console.error('Failed to load on-chain stats:', error);
    }
  }, [getReadOnlyProvider]);

  const loadBalances = useCallback(async () => {
    if (!account) return;
    
    try {
      const provider = getReadOnlyProvider();
      const newBalances = {};
      
      for (const token of TOKENS) {
        try {
          const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const balance = await tokenContract.balanceOf(account);
          newBalances[token.address] = ethers.formatUnits(balance, token.decimals);
        } catch (e) {
          newBalances[token.address] = '0';
        }
      }
      
      setBalances(newBalances);
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  }, [account, getReadOnlyProvider]);

  const loadUserPositions = useCallback(async () => {
    if (!account) return;
    
    try {
      const provider = getReadOnlyProvider();
      const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, provider);
      
      const positions = [];
      for (const pool of pools) {
        try {
          const liquidity = await contract.getUserLiquidity(pool.poolId, account);
          if (liquidity > 0n) {
            const tokenAInfo = TOKENS.find(t => t.address.toLowerCase() === pool.tokenA.toLowerCase());
            const tokenBInfo = TOKENS.find(t => t.address.toLowerCase() === pool.tokenB.toLowerCase());
            
            positions.push({
              poolId: pool.poolId,
              liquidity: liquidity.toString(),
              tokenA: tokenAInfo || { symbol: 'Unknown', address: pool.tokenA },
              tokenB: tokenBInfo || { symbol: 'Unknown', address: pool.tokenB },
              reserveA: pool.reserveA,
              reserveB: pool.reserveB,
              totalLiquidity: pool.totalLiquidity
            });
          }
        } catch (e) {
          console.error(`Failed to load position for pool ${pool.poolId}:`, e);
        }
      }
      
      setUserPositions(positions);
    } catch (error) {
      console.error('Failed to load user positions:', error);
    }
  }, [account, pools, getReadOnlyProvider]);

  const findPoolForPair = useCallback(async (tokenA, tokenB) => {
    try {
      const provider = getReadOnlyProvider();
      const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, provider);
      
      let poolId = await contract.pairToPoolId(tokenA, tokenB);
      if (Number(poolId) === 0) {
        poolId = await contract.pairToPoolId(tokenB, tokenA);
      }
      
      return Number(poolId);
    } catch (error) {
      console.error('Failed to find pool:', error);
      return 0;
    }
  }, [getReadOnlyProvider]);

  const calculateSwapOutput = useCallback(async () => {
    if (!swapForm.amountIn || parseFloat(swapForm.amountIn) <= 0) {
      setSwapForm(prev => ({ ...prev, amountOut: '0', priceImpact: 0, poolId: null }));
      return;
    }

    try {
      const poolId = await findPoolForPair(swapForm.tokenIn.address, swapForm.tokenOut.address);
      
      if (poolId === 0) {
        setSwapForm(prev => ({ ...prev, amountOut: '0', priceImpact: 0, poolId: null }));
        return;
      }

      const provider = getReadOnlyProvider();
      const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, provider);
      
      const amountInWei = ethers.parseUnits(swapForm.amountIn, swapForm.tokenIn.decimals);
      
      const [amountOut, priceImpact] = await Promise.all([
        contract.getAmountOut(poolId, swapForm.tokenIn.address, amountInWei),
        contract.getPriceImpact(poolId, swapForm.tokenIn.address, amountInWei)
      ]);

      setSwapForm(prev => ({
        ...prev,
        amountOut: ethers.formatUnits(amountOut, swapForm.tokenOut.decimals),
        priceImpact: Number(priceImpact) / 100,
        poolId
      }));
    } catch (error) {
      console.error('Failed to calculate swap output:', error);
      setSwapForm(prev => ({ ...prev, amountOut: '0', priceImpact: 0, poolId: null }));
    }
  }, [swapForm.amountIn, swapForm.tokenIn, swapForm.tokenOut, findPoolForPair, getReadOnlyProvider]);

  const validateNumericInput = (value) => {
    if (!value || value === '') return false;
    const num = parseFloat(value);
    return !isNaN(num) && num > 0 && isFinite(num);
  };

  const checkAndApproveToken = async (tokenAddress, amount, decimals, spender, tokenSymbol = 'token') => {
    if (!validateNumericInput(amount)) {
      throw new Error(`Invalid amount for ${tokenSymbol}`);
    }

    const provider = getProvider();
    const signer = await provider.getSigner();
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    let amountWei;
    try {
      amountWei = ethers.parseUnits(amount.toString(), decimals);
    } catch (e) {
      throw new Error(`Invalid amount format for ${tokenSymbol}`);
    }

    if (amountWei <= 0n) {
      throw new Error(`Amount must be greater than 0 for ${tokenSymbol}`);
    }

    const currentAllowance = await tokenContract.allowance(account, spender);
    
    if (currentAllowance < amountWei) {
      toast.loading(`Approving ${tokenSymbol}...`, { id: 'approve' });
      const approveTx = await tokenContract.approve(spender, MAX_UINT256);
      await approveTx.wait();
      toast.success(`${tokenSymbol} approved!`, { id: 'approve' });
    }
    
    return amountWei;
  };

  const calculateMinAmountWithSlippage = (amountWei, slippagePercent) => {
    const slippageBps = Math.round(slippagePercent * 100);
    const multiplier = 10000n - BigInt(slippageBps);
    return (amountWei * multiplier) / 10000n;
  };

  const handleSwap = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    if (!validateNumericInput(swapForm.amountIn)) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!swapForm.poolId) {
      toast.error('No liquidity pool exists for this pair. Create one first!');
      return;
    }
    
    setLoading(true);
    const loadingToast = toast.loading('Processing swap...');
    
    try {
      const amountInWei = await checkAndApproveToken(
        swapForm.tokenIn.address,
        swapForm.amountIn,
        swapForm.tokenIn.decimals,
        EXCHANGE_HUB_ADDRESS,
        swapForm.tokenIn.symbol
      );

      toast.loading('Getting fresh quote...', { id: loadingToast });
      const provider = getReadOnlyProvider();
      const readContract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, provider);
      const freshAmountOut = await readContract.getAmountOut(swapForm.poolId, swapForm.tokenIn.address, amountInWei);
      
      if (freshAmountOut <= 0n) {
        throw new Error('Cannot get output amount. Pool may have insufficient liquidity.');
      }

      const minAmountOut = calculateMinAmountWithSlippage(freshAmountOut, swapForm.slippage);

      const walletProvider = getProvider();
      const signer = await walletProvider.getSigner();
      const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, signer);

      toast.loading('Confirming swap...', { id: loadingToast });
      const tx = await contract.swap(
        swapForm.poolId,
        swapForm.tokenIn.address,
        amountInWei,
        minAmountOut
      );

      toast.loading('Waiting for confirmation...', { id: loadingToast });
      const receipt = await tx.wait();

      toast.success(
        <div>
          Swap successful!
          <a 
            href={`https://arbitrum.blockscout.com/tx/${receipt.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-amber-600 underline text-sm mt-1"
          >
            View on Blockscout
          </a>
        </div>,
        { id: loadingToast, duration: 5000 }
      );

      setSwapForm(prev => ({ ...prev, amountIn: '', amountOut: '0', poolId: null }));
      await loadBalances();
      await loadOnChainStats();
    } catch (error) {
      console.error('Swap failed:', error);
      const errorMessage = error.reason || error.message || 'Swap failed';
      toast.error(errorMessage.includes('user rejected') ? 'Transaction cancelled' : errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    if (!validateNumericInput(liquidityForm.amountA) || !validateNumericInput(liquidityForm.amountB)) {
      toast.error('Please enter valid amounts for both tokens');
      return;
    }
    
    setLoading(true);
    const loadingToast = toast.loading('Adding liquidity...');
    
    try {
      const poolId = await findPoolForPair(liquidityForm.tokenA.address, liquidityForm.tokenB.address);
      
      if (poolId === 0) {
        toast.error('No pool exists for this pair. Use "Create Pool" to create one first.', { id: loadingToast });
        setLoading(false);
        return;
      }

      toast.loading(`Approving ${liquidityForm.tokenA.symbol}...`, { id: loadingToast });
      const amountAWei = await checkAndApproveToken(
        liquidityForm.tokenA.address,
        liquidityForm.amountA,
        liquidityForm.tokenA.decimals,
        EXCHANGE_HUB_ADDRESS,
        liquidityForm.tokenA.symbol
      );

      toast.loading(`Approving ${liquidityForm.tokenB.symbol}...`, { id: loadingToast });
      const amountBWei = await checkAndApproveToken(
        liquidityForm.tokenB.address,
        liquidityForm.amountB,
        liquidityForm.tokenB.decimals,
        EXCHANGE_HUB_ADDRESS,
        liquidityForm.tokenB.symbol
      );

      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, signer);

      toast.loading('Adding liquidity...', { id: loadingToast });
      const tx = await contract.addLiquidity(poolId, amountAWei, amountBWei, 0);

      toast.loading('Waiting for confirmation...', { id: loadingToast });
      const receipt = await tx.wait();

      toast.success(
        <div>
          Liquidity added successfully!
          <a 
            href={`https://arbitrum.blockscout.com/tx/${receipt.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-amber-600 underline text-sm mt-1"
          >
            View on Blockscout
          </a>
        </div>,
        { id: loadingToast, duration: 5000 }
      );

      setLiquidityForm(prev => ({ ...prev, amountA: '', amountB: '' }));
      await loadBalances();
      await loadOnChainStats();
      await loadUserPositions();
    } catch (error) {
      console.error('Add liquidity failed:', error);
      const errorMessage = error.reason || error.message || 'Failed to add liquidity';
      toast.error(errorMessage.includes('user rejected') ? 'Transaction cancelled' : errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPool = async () => {
    if (!isConnected || !selectedPool) {
      toast.error('Please connect your wallet');
      return;
    }
    if (!validateNumericInput(addToPoolForm.amountA) || !validateNumericInput(addToPoolForm.amountB)) {
      toast.error('Please enter valid amounts for both tokens');
      return;
    }
    
    const tokenA = TOKENS.find(t => t.address.toLowerCase() === selectedPool.tokenA.toLowerCase());
    const tokenB = TOKENS.find(t => t.address.toLowerCase() === selectedPool.tokenB.toLowerCase());
    
    if (!tokenA || !tokenB) {
      toast.error('Token not found');
      return;
    }
    
    setLoading(true);
    const loadingToast = toast.loading('Adding liquidity...');
    
    try {
      toast.loading(`Approving ${tokenA.symbol}...`, { id: loadingToast });
      const amountAWei = await checkAndApproveToken(
        tokenA.address,
        addToPoolForm.amountA,
        tokenA.decimals,
        EXCHANGE_HUB_ADDRESS,
        tokenA.symbol
      );

      toast.loading(`Approving ${tokenB.symbol}...`, { id: loadingToast });
      const amountBWei = await checkAndApproveToken(
        tokenB.address,
        addToPoolForm.amountB,
        tokenB.decimals,
        EXCHANGE_HUB_ADDRESS,
        tokenB.symbol
      );

      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, signer);

      toast.loading('Adding liquidity...', { id: loadingToast });
      const tx = await contract.addLiquidity(selectedPool.poolId, amountAWei, amountBWei, 0);

      toast.loading('Waiting for confirmation...', { id: loadingToast });
      const receipt = await tx.wait();

      toast.success(
        <div>
          Liquidity added successfully!
          <a 
            href={`https://arbitrum.blockscout.com/tx/${receipt.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-amber-600 underline text-sm mt-1"
          >
            View on Blockscout
          </a>
        </div>,
        { id: loadingToast, duration: 5000 }
      );

      setShowAddToPoolModal(false);
      setSelectedPool(null);
      setAddToPoolForm({ amountA: '', amountB: '' });
      await loadBalances();
      await loadOnChainStats();
      await loadUserPositions();
    } catch (error) {
      console.error('Add liquidity failed:', error);
      const errorMessage = error.reason || error.message || 'Failed to add liquidity';
      toast.error(errorMessage.includes('user rejected') ? 'Transaction cancelled' : errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    if (!validateNumericInput(createPoolForm.amountA) || !validateNumericInput(createPoolForm.amountB)) {
      toast.error('Please enter valid amounts for both tokens');
      return;
    }
    if (createPoolForm.tokenA.address === createPoolForm.tokenB.address) {
      toast.error('Cannot create pool with identical tokens');
      return;
    }
    
    setLoading(true);
    const loadingToast = toast.loading('Creating pool...');
    
    try {
      const existingPoolId = await findPoolForPair(createPoolForm.tokenA.address, createPoolForm.tokenB.address);
      if (existingPoolId > 0) {
        toast.error('Pool already exists for this pair!', { id: loadingToast });
        setLoading(false);
        return;
      }

      toast.loading(`Approving ${createPoolForm.tokenA.symbol}...`, { id: loadingToast });
      const amountAWei = await checkAndApproveToken(
        createPoolForm.tokenA.address,
        createPoolForm.amountA,
        createPoolForm.tokenA.decimals,
        EXCHANGE_HUB_ADDRESS,
        createPoolForm.tokenA.symbol
      );

      toast.loading(`Approving ${createPoolForm.tokenB.symbol}...`, { id: loadingToast });
      const amountBWei = await checkAndApproveToken(
        createPoolForm.tokenB.address,
        createPoolForm.amountB,
        createPoolForm.tokenB.decimals,
        EXCHANGE_HUB_ADDRESS,
        createPoolForm.tokenB.symbol
      );

      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, signer);

      toast.loading('Creating pool...', { id: loadingToast });
      const tx = await contract.createPool(
        createPoolForm.tokenA.address,
        createPoolForm.tokenB.address,
        amountAWei,
        amountBWei
      );

      toast.loading('Waiting for confirmation...', { id: loadingToast });
      const receipt = await tx.wait();

      toast.success(
        <div>
          Pool created successfully!
          <a 
            href={`https://arbitrum.blockscout.com/tx/${receipt.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-amber-600 underline text-sm mt-1"
          >
            View on Blockscout
          </a>
        </div>,
        { id: loadingToast, duration: 5000 }
      );

      setShowCreatePool(false);
      setCreatePoolForm(prev => ({ ...prev, amountA: '', amountB: '' }));
      await loadBalances();
      await loadOnChainStats();
      await loadUserPositions();
    } catch (error) {
      console.error('Create pool failed:', error);
      const errorMessage = error.reason || error.message || 'Failed to create pool';
      toast.error(errorMessage.includes('user rejected') ? 'Transaction cancelled' : errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async (poolId, liquidity) => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    
    setLoading(true);
    const loadingToast = toast.loading('Removing liquidity...');
    
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, signer);

      const tx = await contract.removeLiquidity(poolId, liquidity, 0, 0);

      toast.loading('Waiting for confirmation...', { id: loadingToast });
      const receipt = await tx.wait();

      toast.success(
        <div>
          Liquidity removed successfully!
          <a 
            href={`https://arbitrum.blockscout.com/tx/${receipt.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-amber-600 underline text-sm mt-1"
          >
            View on Blockscout
          </a>
        </div>,
        { id: loadingToast, duration: 5000 }
      );

      await loadBalances();
      await loadOnChainStats();
      await loadUserPositions();
    } catch (error) {
      console.error('Remove liquidity failed:', error);
      const errorMessage = error.reason || error.message || 'Failed to remove liquidity';
      toast.error(errorMessage.includes('user rejected') ? 'Transaction cancelled' : errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOnChainStats();
    const interval = setInterval(loadOnChainStats, 30000);
    return () => clearInterval(interval);
  }, [loadOnChainStats]);

  useEffect(() => {
    if (isConnected && account) {
      loadBalances();
    }
  }, [isConnected, account, loadBalances]);

  useEffect(() => {
    if (isConnected && account && pools.length > 0) {
      loadUserPositions();
    }
  }, [isConnected, account, pools, loadUserPositions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateSwapOutput();
    }, 500);
    return () => clearTimeout(timer);
  }, [swapForm.amountIn, swapForm.tokenIn, swapForm.tokenOut, calculateSwapOutput]);

  useEffect(() => {
    if (showWrapModal && isConnected) {
      loadEthWethBalances();
    }
  }, [showWrapModal, isConnected, loadEthWethBalances]);

  const switchTokens = () => {
    setSwapForm(prev => ({
      ...prev,
      tokenIn: prev.tokenOut,
      tokenOut: prev.tokenIn,
      amountIn: '',
      amountOut: '0',
      poolId: null
    }));
  };

  const getTokenBalance = (tokenAddress) => {
    return balances[tokenAddress] || '0';
  };

  const tabs = [
    { id: 'swap', label: 'Swap', icon: '🔄' },
    { id: 'liquidity', label: 'Liquidity', icon: '💧' },
    { id: 'pools', label: 'All Pools', icon: '🏊' },
    { id: 'my-positions', label: 'My Positions', icon: '📊' },
    { id: 'learn', label: 'Learn', icon: '📚' },
  ];

  const TokenSelector = ({ token, tokens, onChange, label }) => (
    <div className="relative flex-shrink-0">
      <select
        value={token.address}
        onChange={(e) => {
          const selected = tokens.find(t => t.address === e.target.value);
          if (selected) onChange(selected);
        }}
        className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-3 pr-8 sm:px-4 sm:pr-10 font-medium cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm sm:text-base min-w-[90px] sm:min-w-[110px]"
      >
        {tokens.map(t => (
          <option key={t.address} value={t.address}>{t.symbol}</option>
        ))}
      </select>
      <svg className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  return (
    <Layout>
      <Toaster position="top-right" />
      
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Axiom Exchange</h1>
          <p className="text-gray-600 text-sm sm:text-lg px-2">Decentralized trading on America's first on-chain smart city</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500">Total Pools</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalPools}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500">Total Swaps</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalSwaps.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500">Swap Fee</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{(stats.swapFee / 100).toFixed(2)}%</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500">Network</div>
            <div className="text-lg sm:text-2xl font-bold text-amber-600">Arbitrum One</div>
          </div>
        </div>

        <DisclosureBanner 
          featureId="dex" 
          walletAddress={account}
          compact={true}
        />

        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium whitespace-nowrap transition-all text-sm sm:text-base min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="text-base sm:text-lg">{tab.icon}</span>
              <span className="hidden xs:inline sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'swap' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {pools.length > 0 && (
              <AdvancedTradingChart
                poolId={swapForm.poolId || pools[0]?.poolId || 1}
                tokenA={swapForm.poolId ? swapForm.tokenIn : (TOKENS.find(t => t.address.toLowerCase() === pools[0]?.tokenA?.toLowerCase()) || swapForm.tokenIn)}
                tokenB={swapForm.poolId ? swapForm.tokenOut : (TOKENS.find(t => t.address.toLowerCase() === pools[0]?.tokenB?.toLowerCase()) || swapForm.tokenOut)}
                currentPrice={swapForm.amountIn && swapForm.amountOut && parseFloat(swapForm.amountIn) > 0
                  ? parseFloat(swapForm.amountOut) / parseFloat(swapForm.amountIn)
                  : null
                }
              />
            )}
            
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0 mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Swap Tokens</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-500">Slippage:</span>
                  <select
                    value={swapForm.slippage}
                    onChange={(e) => setSwapForm(prev => ({ ...prev, slippage: parseFloat(e.target.value) }))}
                    className="bg-gray-100 border-0 rounded-lg px-2 py-1 text-sm min-h-[36px]"
                  >
                    <option value="0.1">0.1%</option>
                    <option value="0.5">0.5%</option>
                    <option value="1">1%</option>
                    <option value="3">3%</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-2">
                <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-2">
                  <span>You Pay</span>
                  <span className="truncate ml-2">Balance: {parseFloat(getTokenBalance(swapForm.tokenIn.address)).toFixed(4)}</span>
                </div>
                <div className="flex gap-2 sm:gap-3 items-center">
                  <input
                    type="number"
                    value={swapForm.amountIn}
                    onChange={(e) => setSwapForm(prev => ({ ...prev, amountIn: e.target.value }))}
                    placeholder="0.0"
                    className="flex-1 min-w-0 bg-transparent text-xl sm:text-2xl font-medium outline-none"
                  />
                  <TokenSelector
                    token={swapForm.tokenIn}
                    tokens={TOKENS}
                    onChange={(t) => setSwapForm(prev => ({ ...prev, tokenIn: t }))}
                  />
                </div>
                <button
                  onClick={() => setSwapForm(prev => ({ ...prev, amountIn: getTokenBalance(swapForm.tokenIn.address) }))}
                  className="text-amber-600 text-sm font-medium mt-2 hover:underline min-h-[32px]"
                >
                  MAX
                </button>
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                <button
                  onClick={switchTokens}
                  className="bg-white border-4 border-gray-50 rounded-xl p-2 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mt-2 mb-4">
                <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-2">
                  <span>You Receive</span>
                  <span className="truncate ml-2">Balance: {parseFloat(getTokenBalance(swapForm.tokenOut.address)).toFixed(4)}</span>
                </div>
                <div className="flex gap-2 sm:gap-3 items-center">
                  <input
                    type="text"
                    value={parseFloat(swapForm.amountOut).toFixed(6)}
                    readOnly
                    placeholder="0.0"
                    className="flex-1 min-w-0 bg-transparent text-xl sm:text-2xl font-medium outline-none text-gray-400"
                  />
                  <TokenSelector
                    token={swapForm.tokenOut}
                    tokens={TOKENS}
                    onChange={(t) => setSwapForm(prev => ({ ...prev, tokenOut: t }))}
                  />
                </div>
              </div>

              {swapForm.amountIn && parseFloat(swapForm.amountIn) > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                  {!swapForm.poolId ? (
                    <div className="text-red-500 font-medium">No liquidity pool exists for this pair</div>
                  ) : (
                    <>
                      <div className="flex justify-between text-gray-600 mb-1">
                        <span>Price Impact</span>
                        <span className={swapForm.priceImpact > 3 ? 'text-red-500 font-medium' : 'text-green-600'}>
                          {swapForm.priceImpact.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600 mb-1">
                        <span>Minimum Received</span>
                        <span>{(parseFloat(swapForm.amountOut) * (1 - swapForm.slippage / 100)).toFixed(6)} {swapForm.tokenOut.symbol}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Swap Fee (0.3%)</span>
                        <span>{(parseFloat(swapForm.amountIn) * 0.003).toFixed(6)} {swapForm.tokenIn.symbol}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {swapForm.priceImpact > 5 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <span>⚠️</span>
                    <span className="font-medium">High Price Impact!</span>
                  </div>
                  <p className="text-red-600 text-sm mt-1">This trade will move the price significantly. Consider trading a smaller amount.</p>
                </div>
              )}

              {!isConnected ? (
                <button
                  onClick={connectMetaMask}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
                >
                  Connect Wallet
                </button>
              ) : (
                <button
                  onClick={handleSwap}
                  disabled={loading || !swapForm.amountIn || !swapForm.poolId}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  {loading ? 'Processing...' : !swapForm.poolId ? 'No Pool Available' : 'Swap'}
                </button>
              )}
            </div>
          </div>
          </div>
        )}

        {activeTab === 'liquidity' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-0 mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Add Liquidity</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowWrapModal(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm sm:text-base min-h-[44px]"
                  >
                    🔄 Wrap ETH
                  </button>
                  <button
                    onClick={() => setShowCreatePool(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors text-sm sm:text-base min-h-[44px]"
                  >
                    + Create Pool
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">Provide liquidity to earn 0.3% fees on all trades proportional to your share of the pool.</p>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-2">
                    <span>Token A</span>
                    <span className="truncate ml-2">Balance: {parseFloat(getTokenBalance(liquidityForm.tokenA.address)).toFixed(4)}</span>
                  </div>
                  <div className="flex gap-2 sm:gap-3 items-center">
                    <input
                      type="number"
                      value={liquidityForm.amountA}
                      onChange={(e) => setLiquidityForm(prev => ({ ...prev, amountA: e.target.value }))}
                      placeholder="0.0"
                      className="flex-1 min-w-0 bg-transparent text-lg sm:text-xl font-medium outline-none"
                    />
                    <TokenSelector
                      token={liquidityForm.tokenA}
                      tokens={TOKENS}
                      onChange={(t) => setLiquidityForm(prev => ({ ...prev, tokenA: t }))}
                    />
                  </div>
                  <button
                    onClick={() => setLiquidityForm(prev => ({ ...prev, amountA: getTokenBalance(liquidityForm.tokenA.address) }))}
                    className="text-amber-600 text-sm font-medium mt-2 hover:underline min-h-[32px]"
                  >
                    MAX
                  </button>
                </div>

                <div className="flex justify-center">
                  <div className="bg-gray-200 rounded-full p-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-4-4m4 4l4-4" />
                    </svg>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-2">
                    <span>Token B</span>
                    <span className="truncate ml-2">Balance: {parseFloat(getTokenBalance(liquidityForm.tokenB.address)).toFixed(4)}</span>
                  </div>
                  <div className="flex gap-2 sm:gap-3 items-center">
                    <input
                      type="number"
                      value={liquidityForm.amountB}
                      onChange={(e) => setLiquidityForm(prev => ({ ...prev, amountB: e.target.value }))}
                      placeholder="0.0"
                      className="flex-1 min-w-0 bg-transparent text-lg sm:text-xl font-medium outline-none"
                    />
                    <TokenSelector
                      token={liquidityForm.tokenB}
                      tokens={TOKENS}
                      onChange={(t) => setLiquidityForm(prev => ({ ...prev, tokenB: t }))}
                    />
                  </div>
                  <button
                    onClick={() => setLiquidityForm(prev => ({ ...prev, amountB: getTokenBalance(liquidityForm.tokenB.address) }))}
                    className="text-amber-600 text-sm font-medium mt-2 hover:underline min-h-[32px]"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4 mb-4">
                <h4 className="font-medium text-amber-900 mb-2">Important</h4>
                <p className="text-sm text-amber-800">
                  If no pool exists for this pair, you'll need to create one first using the "Create New Pool" button. 
                  The first liquidity provider sets the initial exchange rate.
                </p>
              </div>

              {!isConnected ? (
                <button
                  onClick={connectMetaMask}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
                >
                  Connect Wallet
                </button>
              ) : (
                <button
                  onClick={handleAddLiquidity}
                  disabled={loading || !liquidityForm.amountA || !liquidityForm.amountB}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                  {loading ? 'Adding Liquidity...' : 'Add Liquidity'}
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-bold text-green-900 mb-3">Benefits of Providing Liquidity</h3>
                <ul className="text-sm text-green-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Earn 0.3% fee on every trade in the pool</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Fees are automatically reinvested</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Withdraw your liquidity anytime</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Support the Axiom ecosystem</span>
                  </li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h3 className="font-bold text-orange-900 mb-3">Understanding Impermanent Loss</h3>
                <p className="text-sm text-orange-800 mb-2">
                  When you provide liquidity, you may experience impermanent loss if the price ratio of your deposited tokens changes.
                </p>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Greater price change = more impermanent loss</li>
                  <li>• Fees earned can offset impermanent loss</li>
                  <li>• Loss becomes permanent only when you withdraw</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pools' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Liquidity Pools</h2>
              <button 
                onClick={() => setShowCreatePool(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors min-h-[44px] w-full sm:w-auto"
              >
                + Create Pool
              </button>
            </div>

            {pools.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 sm:p-12 text-center">
                <div className="text-4xl sm:text-5xl mb-4">🏊</div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Pools Yet</h3>
                <p className="text-gray-600 text-sm sm:text-base mb-4">Be the first to create a liquidity pool and start earning fees!</p>
                <button
                  onClick={() => setShowCreatePool(true)}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors min-h-[48px]"
                >
                  Create First Pool
                </button>
              </div>
            ) : (
              <>
                <div className="hidden md:block bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-4 px-6 font-medium text-gray-600">Pool</th>
                        <th className="text-left py-4 px-6 font-medium text-gray-600">Reserves</th>
                        <th className="text-left py-4 px-6 font-medium text-gray-600">Total Volume</th>
                        <th className="text-left py-4 px-6 font-medium text-gray-600">Fees Earned</th>
                        <th className="text-right py-4 px-6 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pools.map(pool => {
                        const tokenA = TOKENS.find(t => t.address.toLowerCase() === pool.tokenA.toLowerCase());
                        const tokenB = TOKENS.find(t => t.address.toLowerCase() === pool.tokenB.toLowerCase());
                        return (
                          <tr key={pool.poolId} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                  {tokenA?.logo ? (
                                    <img src={tokenA.logo} alt={tokenA.symbol} className="w-8 h-8 rounded-full border-2 border-white" />
                                  ) : (
                                    <div className="w-8 h-8 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                                      {tokenA?.symbol?.[0] || '?'}
                                    </div>
                                  )}
                                  {tokenB?.logo ? (
                                    <img src={tokenB.logo} alt={tokenB.symbol} className="w-8 h-8 rounded-full border-2 border-white" />
                                  ) : (
                                    <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                                      {tokenB?.symbol?.[0] || '?'}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{tokenA?.symbol || '?'} / {tokenB?.symbol || '?'}</div>
                                  <div className="text-sm text-gray-500">Pool #{pool.poolId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-gray-900">
                                {parseFloat(ethers.formatUnits(pool.reserveA, tokenA?.decimals || 18)).toFixed(4)} {tokenA?.symbol}
                              </div>
                              <div className="text-gray-500 text-sm">
                                {parseFloat(ethers.formatUnits(pool.reserveB, tokenB?.decimals || 18)).toFixed(4)} {tokenB?.symbol}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-gray-900">
                              {parseFloat(ethers.formatEther(pool.totalVolume)).toFixed(4)}
                            </td>
                            <td className="py-4 px-6 text-green-600 font-medium">
                              {parseFloat(ethers.formatEther(pool.totalFees)).toFixed(6)}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button 
                                onClick={() => {
                                  setSelectedPool(pool);
                                  setAddToPoolForm({ amountA: '', amountB: '' });
                                  setShowAddToPoolModal(true);
                                }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg text-sm transition-colors"
                              >
                                Add Liquidity
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {pools.map(pool => {
                    const tokenA = TOKENS.find(t => t.address.toLowerCase() === pool.tokenA.toLowerCase());
                    const tokenB = TOKENS.find(t => t.address.toLowerCase() === pool.tokenB.toLowerCase());
                    return (
                      <div key={pool.poolId} className="bg-white rounded-xl shadow border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              <div className="w-7 h-7 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                                {tokenA?.symbol?.[0] || '?'}
                              </div>
                              <div className="w-7 h-7 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                                {tokenB?.symbol?.[0] || '?'}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{tokenA?.symbol || '?'} / {tokenB?.symbol || '?'}</div>
                              <div className="text-xs text-gray-500">Pool #{pool.poolId}</div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <div className="text-gray-500 text-xs">Reserves</div>
                            <div className="text-gray-900 text-xs">
                              {parseFloat(ethers.formatUnits(pool.reserveA, tokenA?.decimals || 18)).toFixed(2)} {tokenA?.symbol}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {parseFloat(ethers.formatUnits(pool.reserveB, tokenB?.decimals || 18)).toFixed(2)} {tokenB?.symbol}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-500 text-xs">Fees</div>
                            <div className="text-green-600 font-medium text-xs">
                              {parseFloat(ethers.formatEther(pool.totalFees)).toFixed(4)}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedPool(pool);
                            setAddToPoolForm({ amountA: '', amountB: '' });
                            setShowAddToPoolModal(true);
                          }}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg text-sm transition-colors min-h-[44px]"
                        >
                          Add Liquidity
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'my-positions' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">My Liquidity Positions</h2>

            {!isConnected ? (
              <div className="bg-gray-50 rounded-xl p-8 sm:p-12 text-center">
                <div className="text-4xl sm:text-5xl mb-4">🔗</div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
                <p className="text-gray-600 text-sm sm:text-base mb-4">Connect your wallet to view your liquidity positions</p>
                <button
                  onClick={connectMetaMask}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors min-h-[48px]"
                >
                  Connect Wallet
                </button>
              </div>
            ) : userPositions.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 sm:p-12 text-center">
                <div className="text-4xl sm:text-5xl mb-4">💧</div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Liquidity Positions</h3>
                <p className="text-gray-600 text-sm sm:text-base mb-4">You haven't provided liquidity to any pools yet</p>
                <button
                  onClick={() => setActiveTab('liquidity')}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors min-h-[48px]"
                >
                  Add Liquidity
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {userPositions.map(position => {
                  const sharePercent = position.totalLiquidity > 0 
                    ? (BigInt(position.liquidity) * 10000n / BigInt(position.totalLiquidity))
                    : 0n;
                  return (
                    <div key={position.poolId} className="bg-white rounded-xl shadow border border-gray-200 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex -space-x-2">
                            {position.tokenA.logo ? (
                              <img src={position.tokenA.logo} alt={position.tokenA.symbol} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white" />
                            ) : (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                                {position.tokenA.symbol?.[0] || '?'}
                              </div>
                            )}
                            {position.tokenB.logo ? (
                              <img src={position.tokenB.logo} alt={position.tokenB.symbol} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white" />
                            ) : (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                                {position.tokenB.symbol?.[0] || '?'}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm sm:text-base">{position.tokenA.symbol} / {position.tokenB.symbol}</div>
                            <div className="text-xs sm:text-sm text-gray-500">Pool #{position.poolId}</div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-gray-900 text-sm sm:text-base">{(Number(sharePercent) / 100).toFixed(2)}% share</div>
                          <div className="text-xs sm:text-sm text-gray-500">{parseFloat(ethers.formatEther(position.liquidity)).toFixed(4)} LP</div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                        <button 
                          onClick={() => {
                            setLiquidityForm({
                              tokenA: position.tokenA,
                              tokenB: position.tokenB,
                              amountA: '',
                              amountB: '',
                              poolId: position.poolId
                            });
                            setActiveTab('liquidity');
                          }}
                          className="flex-1 py-2.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors min-h-[44px]"
                        >
                          Add More
                        </button>
                        <button 
                          onClick={() => handleRemoveLiquidity(position.poolId, position.liquidity)}
                          disabled={loading}
                          className="flex-1 py-2.5 sm:py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors min-h-[44px]"
                        >
                          {loading ? 'Removing...' : 'Remove All'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'learn' && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Learn About Axiom Exchange</h2>
            <p className="text-gray-600 mb-8">Master decentralized trading with our comprehensive learning resources</p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <Link href="/dex/how-amm-works" className="group bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 hover:shadow-xl hover:border-amber-400 transition-all">
                <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  🔄
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600">How AMMs Work</h3>
                <p className="text-gray-600 text-sm mb-4">Deep dive into automated market maker mechanics, the constant product formula, and price discovery.</p>
                <div className="flex items-center gap-2 text-amber-600 font-medium text-sm">
                  Learn More
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <Link href="/dex/liquidity-guide" className="group bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 hover:shadow-xl hover:border-blue-400 transition-all">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  💧
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600">Liquidity Provider Guide</h3>
                <p className="text-gray-600 text-sm mb-4">Complete walkthrough of adding liquidity, earning fees, and managing your LP positions.</p>
                <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                  Learn More
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <Link href="/dex/impermanent-loss" className="group bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 hover:shadow-xl hover:border-red-400 transition-all">
                <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  📉
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-red-600">Impermanent Loss</h3>
                <p className="text-gray-600 text-sm mb-4">Understand IL with interactive calculators and learn strategies to minimize its impact.</p>
                <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
                  Learn More
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <Link href="/dex/fees-rewards" className="group bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 hover:shadow-xl hover:border-green-400 transition-all">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  💰
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600">Fees & Rewards</h3>
                <p className="text-gray-600 text-sm mb-4">Calculate your earning potential and learn how to maximize returns from providing liquidity.</p>
                <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                  Learn More
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <Link href="/dex/security" className="group bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-6 hover:shadow-xl hover:border-purple-400 transition-all">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  🛡️
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600">Security & Safety</h3>
                <p className="text-gray-600 text-sm mb-4">Best practices for staying safe, understanding contract security, and protecting your assets.</p>
                <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
                  Learn More
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6">
                <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center text-3xl mb-4">
                  📊
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Analytics</h3>
                <p className="text-gray-600 text-sm mb-4">Track pool performance, trading volume, and historical data across Axiom Exchange.</p>
                <div className="flex items-center gap-2 text-gray-400 font-medium text-sm">
                  Coming Soon
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white mb-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Quick Stats</h3>
                  <p className="text-amber-100">Key information about Axiom Exchange</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold">0.3%</div>
                    <div className="text-amber-100 text-sm">Swap Fee</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">100%</div>
                    <div className="text-amber-100 text-sm">To LPs</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">L2</div>
                    <div className="text-amber-100 text-sm">Arbitrum</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">x*y=k</div>
                    <div className="text-amber-100 text-sm">AMM Model</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">What is the minimum amount to provide liquidity?</h4>
                  <p className="text-gray-600 text-sm">There's no minimum, but transaction fees may make small positions unprofitable. We recommend at least $100 worth of tokens.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Can I withdraw my liquidity anytime?</h4>
                  <p className="text-gray-600 text-sm">Yes, you can withdraw your liquidity at any time. There are no lock-up periods.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">How are fees distributed?</h4>
                  <p className="text-gray-600 text-sm">Fees are automatically added to the pool reserves. Your LP tokens represent a growing share of the pool as fees accumulate.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">What tokens can I trade?</h4>
                  <p className="text-gray-600 text-sm">Any ERC-20 token on Arbitrum One can be traded, as long as a liquidity pool exists for that pair.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gray-100 rounded-xl text-center text-xs sm:text-sm text-gray-500">
          <p className="break-all">Exchange Hub: <a href={`https://arbitrum.blockscout.com/address/${EXCHANGE_HUB_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline"><code className="bg-gray-200 px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">{EXCHANGE_HUB_ADDRESS.slice(0, 10)}...{EXCHANGE_HUB_ADDRESS.slice(-8)}</code></a></p>
          <p className="mt-1">Arbitrum One (42161) | Fee: 0.3%</p>
        </div>
      </div>

      {showCreatePool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Create New Pool</h2>
              <button
                onClick={() => setShowCreatePool(false)}
                className="p-2 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">Create a new liquidity pool by providing initial liquidity. You'll set the initial exchange rate.</p>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-2">
                  <span>Token A</span>
                  <span className="truncate ml-2">Balance: {parseFloat(getTokenBalance(createPoolForm.tokenA.address)).toFixed(4)}</span>
                </div>
                <div className="flex gap-2 sm:gap-3 items-center">
                  <input
                    type="number"
                    value={createPoolForm.amountA}
                    onChange={(e) => setCreatePoolForm(prev => ({ ...prev, amountA: e.target.value }))}
                    placeholder="0.0"
                    className="flex-1 min-w-0 bg-transparent text-lg sm:text-xl font-medium outline-none"
                  />
                  <TokenSelector
                    token={createPoolForm.tokenA}
                    tokens={TOKENS}
                    onChange={(t) => setCreatePoolForm(prev => ({ ...prev, tokenA: t }))}
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <div className="bg-gray-200 rounded-full p-2">
                  <span className="text-gray-500 font-bold">+</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-2">
                  <span>Token B</span>
                  <span className="truncate ml-2">Balance: {parseFloat(getTokenBalance(createPoolForm.tokenB.address)).toFixed(4)}</span>
                </div>
                <div className="flex gap-2 sm:gap-3 items-center">
                  <input
                    type="number"
                    value={createPoolForm.amountB}
                    onChange={(e) => setCreatePoolForm(prev => ({ ...prev, amountB: e.target.value }))}
                    placeholder="0.0"
                    className="flex-1 min-w-0 bg-transparent text-lg sm:text-xl font-medium outline-none"
                  />
                  <TokenSelector
                    token={createPoolForm.tokenB}
                    tokens={TOKENS}
                    onChange={(t) => setCreatePoolForm(prev => ({ ...prev, tokenB: t }))}
                  />
                </div>
              </div>
            </div>

            {createPoolForm.amountA && createPoolForm.amountB && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 mt-4">
                <h4 className="font-medium text-amber-900 mb-2 text-sm sm:text-base">Initial Price</h4>
                <p className="text-xs sm:text-sm text-amber-800">
                  1 {createPoolForm.tokenA.symbol} = {(parseFloat(createPoolForm.amountB) / parseFloat(createPoolForm.amountA)).toFixed(6)} {createPoolForm.tokenB.symbol}
                </p>
                <p className="text-xs sm:text-sm text-amber-800">
                  1 {createPoolForm.tokenB.symbol} = {(parseFloat(createPoolForm.amountA) / parseFloat(createPoolForm.amountB)).toFixed(6)} {createPoolForm.tokenA.symbol}
                </p>
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 mt-4">
              <h4 className="font-medium text-red-900 mb-1 text-sm sm:text-base">Important</h4>
              <p className="text-xs sm:text-sm text-red-800">
                The ratio of tokens you provide sets the initial price. Make sure this matches the market rate to avoid arbitrage losses.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => setShowCreatePool(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePool}
                disabled={loading || !createPoolForm.amountA || !createPoolForm.amountB}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors min-h-[48px]"
              >
                {loading ? 'Creating...' : 'Create Pool'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWrapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Wrap / Unwrap ETH</h2>
              <button
                onClick={() => setShowWrapModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Convert between ETH and WETH. WETH (Wrapped ETH) is required for DEX liquidity pools.
            </p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setWrapMode('wrap')}
                className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                  wrapMode === 'wrap' 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Wrap ETH → WETH
              </button>
              <button
                onClick={() => setWrapMode('unwrap')}
                className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                  wrapMode === 'unwrap' 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unwrap WETH → ETH
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>{wrapMode === 'wrap' ? 'ETH Balance' : 'WETH Balance'}</span>
                <span 
                  className="cursor-pointer hover:text-amber-600"
                  onClick={() => setWrapAmount(wrapMode === 'wrap' ? ethBalance : wethBalance)}
                >
                  Max: {parseFloat(wrapMode === 'wrap' ? ethBalance : wethBalance).toFixed(6)}
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  value={wrapAmount}
                  onChange={(e) => setWrapAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-xl font-medium outline-none"
                />
                <span className="bg-white border border-gray-200 rounded-xl px-4 py-2 font-medium">
                  {wrapMode === 'wrap' ? 'ETH' : 'WETH'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center my-3">
              <div className="bg-amber-100 rounded-full p-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>You will receive</span>
              </div>
              <div className="flex gap-3 items-center">
                <span className="flex-1 text-xl font-medium">
                  {wrapAmount || '0.0'}
                </span>
                <span className="bg-white border border-gray-200 rounded-xl px-4 py-2 font-medium">
                  {wrapMode === 'wrap' ? 'WETH' : 'ETH'}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-800">
                <strong>1 ETH = 1 WETH</strong> - Wrapping/unwrapping is always 1:1 with no fees (except gas).
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWrapModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWrap}
                disabled={wrapping || !wrapAmount || parseFloat(wrapAmount) <= 0}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
              >
                {wrapping ? 'Processing...' : wrapMode === 'wrap' ? 'Wrap ETH' : 'Unwrap WETH'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddToPoolModal && selectedPool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Liquidity</h2>
              <button
                onClick={() => {
                  setShowAddToPoolModal(false);
                  setSelectedPool(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {(() => {
              const tokenA = TOKENS.find(t => t.address.toLowerCase() === selectedPool.tokenA.toLowerCase());
              const tokenB = TOKENS.find(t => t.address.toLowerCase() === selectedPool.tokenB.toLowerCase());
              
              return (
                <>
                  <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                        {tokenA?.symbol?.[0] || '?'}
                      </div>
                      <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                        {tokenB?.symbol?.[0] || '?'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{tokenA?.symbol || '?'} / {tokenB?.symbol || '?'}</div>
                      <div className="text-xs text-gray-500">Pool #{selectedPool.poolId}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span>{tokenA?.symbol || 'Token A'}</span>
                        <span>Balance: {parseFloat(getTokenBalance(tokenA?.address)).toFixed(4)}</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <input
                          type="number"
                          value={addToPoolForm.amountA}
                          onChange={(e) => setAddToPoolForm(prev => ({ ...prev, amountA: e.target.value }))}
                          placeholder="0.0"
                          className="flex-1 bg-transparent text-xl font-medium outline-none"
                        />
                        <span className="bg-white border border-gray-200 rounded-xl px-4 py-2 font-medium">
                          {tokenA?.symbol || '?'}
                        </span>
                      </div>
                      <button
                        onClick={() => setAddToPoolForm(prev => ({ ...prev, amountA: getTokenBalance(tokenA?.address) }))}
                        className="text-amber-600 text-sm font-medium mt-2 hover:underline"
                      >
                        MAX
                      </button>
                    </div>

                    <div className="flex justify-center">
                      <div className="bg-gray-200 rounded-full p-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-4-4m4 4l4-4" />
                        </svg>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span>{tokenB?.symbol || 'Token B'}</span>
                        <span>Balance: {parseFloat(getTokenBalance(tokenB?.address)).toFixed(4)}</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <input
                          type="number"
                          value={addToPoolForm.amountB}
                          onChange={(e) => setAddToPoolForm(prev => ({ ...prev, amountB: e.target.value }))}
                          placeholder="0.0"
                          className="flex-1 bg-transparent text-xl font-medium outline-none"
                        />
                        <span className="bg-white border border-gray-200 rounded-xl px-4 py-2 font-medium">
                          {tokenB?.symbol || '?'}
                        </span>
                      </div>
                      <button
                        onClick={() => setAddToPoolForm(prev => ({ ...prev, amountB: getTokenBalance(tokenB?.address) }))}
                        className="text-amber-600 text-sm font-medium mt-2 hover:underline"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 my-4">
                    <p className="text-xs text-amber-800">
                      <strong>Pool Reserves:</strong> {parseFloat(ethers.formatUnits(selectedPool.reserveA, tokenA?.decimals || 18)).toFixed(4)} {tokenA?.symbol} / {parseFloat(ethers.formatUnits(selectedPool.reserveB, tokenB?.decimals || 18)).toFixed(4)} {tokenB?.symbol}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAddToPoolModal(false);
                        setSelectedPool(null);
                      }}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors min-h-[48px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddToPool}
                      disabled={loading || !addToPoolForm.amountA || !addToPoolForm.amountB}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors min-h-[48px]"
                    >
                      {loading ? 'Adding...' : 'Add Liquidity'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
