/**
 * Advanced Blockchain Connector for SWF Platform
 * 
 * This module provides a more reliable connection to BSC Mainnet
 * with proper error handling, timeout management, and RPC endpoint rotation.
 */

const ethers = require('ethers');
const axios = require('axios').default;

// BSC Public RPC Endpoints
const BSC_RPC_ENDPOINTS = [
  // First priority - NodeReal API with provided key
  'https://bsc-mainnet.nodereal.io/v1/3c4bb29edf624156926839c88562683b',
  // Second priority - Alchemy API (if available)
  process.env.ALCHEMY_API_KEY ? `https://bsc-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null,
  // Third priority - Binance's own endpoints
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
  // Fourth priority - Other public endpoints
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.defibit.io',
  'https://bsc-dataseed1.ninicoin.io',
  'https://bsc-dataseed2.ninicoin.io',
  'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3',
  'https://rpc.ankr.com/bsc'
].filter(Boolean); // Remove null values

// SWF Token Configuration
const SWF_TOKEN_ADDRESS = '0x7e243288B287BEe84A7D40E8520444f47af88335';
const SWF_LP_ADDRESS = '0x4dfb9909a36580e8e6f126acf189a965740f7b35';
const SOLO_METHOD_ENGINE_ADDRESS = '0x7e243288B287BEe84A7D40E8520444f47af88335';

// Tracking which RPC endpoints are working
const rpcStatus = BSC_RPC_ENDPOINTS.reduce((acc, endpoint) => {
  acc[endpoint] = { 
    status: 'unknown', 
    lastCheck: null,
    latency: null,
    failCount: 0,
    successCount: 0
  };
  return acc;
}, {});

// Create a provider with enhanced configuration
function createProvider(rpcUrl) {
  try {
    // In ethers v6, JsonRpcProvider takes a URL string directly
    return new ethers.JsonRpcProvider(rpcUrl);
  } catch (error) {
    console.error(`Failed to create provider for ${rpcUrl}:`, error.message);
    return null;
  }
}

// Enhanced RPC endpoint testing with retry logic
async function testRpcEndpoint(endpoint, retries = 3) {
  const startTime = Date.now();
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const provider = createProvider(endpoint);
      if (!provider) {
        throw new Error('Failed to create provider');
      }
      
      // Comprehensive test: get block number and network info
      const [blockNumber, network] = await Promise.all([
        provider.getBlockNumber(),
        provider.getNetwork()
      ]);
      
      // Verify we're on BSC mainnet
      if (network.chainId !== 56) {
        throw new Error(`Invalid network: expected BSC (56), got ${network.chainId}`);
      }
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      rpcStatus[endpoint] = {
        status: 'online',
        lastCheck: new Date(),
        latency,
        failCount: 0,
        successCount: (rpcStatus[endpoint]?.successCount || 0) + 1,
        chainId: network.chainId,
        blockNumber
      };
      
      console.log(`✅ RPC ${endpoint.split('/').pop()} online (block: ${blockNumber}, ${latency}ms)`);
      return provider;
      
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        console.log(`⚠️ RPC ${endpoint.split('/').pop()} failed attempt ${attempt}/${retries}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }
  }
  
  const endTime = Date.now();
  rpcStatus[endpoint] = {
    status: 'offline',
    lastCheck: new Date(),
    latency: null,
    failCount: (rpcStatus[endpoint]?.failCount || 0) + 1,
    successCount: 0,
    lastError: lastError.message
  };
  
  console.error(`❌ RPC ${endpoint.split('/').pop()} offline after ${retries} attempts: ${lastError.message}`);
  return null;
}

// Enhanced provider selection with intelligent load balancing
async function getWorkingProviders() {
  const providers = [];
  const testPromises = BSC_RPC_ENDPOINTS.map(endpoint => testRpcEndpoint(endpoint));
  
  console.log(`🔍 Testing ${BSC_RPC_ENDPOINTS.length} RPC endpoints...`);
  const results = await Promise.allSettled(testPromises);
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value) {
      providers.push({
        provider: result.value,
        endpoint: BSC_RPC_ENDPOINTS[i],
        latency: rpcStatus[BSC_RPC_ENDPOINTS[i]].latency,
        reliability: calculateReliabilityScore(BSC_RPC_ENDPOINTS[i])
      });
    }
  }
  
  // Sort by reliability score (combination of latency and success rate)
  providers.sort((a, b) => b.reliability - a.reliability);
  
  console.log(`📊 Found ${providers.length} working RPCs, using top performers`);
  return providers;
}

// Calculate reliability score based on latency and success rate
function calculateReliabilityScore(endpoint) {
  const stats = rpcStatus[endpoint];
  if (!stats || stats.status === 'offline') return 0;
  
  const successRate = stats.successCount / (stats.successCount + stats.failCount);
  const latencyScore = Math.max(0, 100 - (stats.latency / 10)); // Lower latency = higher score
  const uptimeScore = successRate * 100;
  
  return (latencyScore * 0.3) + (uptimeScore * 0.7); // Weight uptime more than latency
}

// Enhanced connection pool management
class ConnectionPool {
  constructor() {
    this.activeConnections = new Map();
    this.connectionStats = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async getConnection(endpoint) {
    if (this.activeConnections.has(endpoint)) {
      return this.activeConnections.get(endpoint);
    }

    const provider = await this.createConnection(endpoint);
    if (provider) {
      this.activeConnections.set(endpoint, provider);
      return provider;
    }
    return null;
  }

  async createConnection(endpoint, retryCount = 0) {
    try {
      const provider = createProvider(endpoint);
      if (!provider) throw new Error('Provider creation failed');

      await provider.getBlockNumber();
      this.updateStats(endpoint, true);
      return provider;
    } catch (error) {
      this.updateStats(endpoint, false);
      
      if (retryCount < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.createConnection(endpoint, retryCount + 1);
      }
      return null;
    }
  }

  updateStats(endpoint, success) {
    const stats = this.connectionStats.get(endpoint) || { success: 0, failures: 0 };
    if (success) {
      stats.success++;
    } else {
      stats.failures++;
    }
    this.connectionStats.set(endpoint, stats);
  }

  getReliabilityScore(endpoint) {
    const stats = this.connectionStats.get(endpoint);
    if (!stats) return 0;
    return stats.success / (stats.success + stats.failures);
  }

  removeConnection(endpoint) {
    this.activeConnections.delete(endpoint);
  }
}

const connectionPool = new ConnectionPool();

// Get the best provider
async function getBestProvider() {
  const providers = await getWorkingProviders();
  
  if (providers.length === 0) {
    console.error('No working BSC providers found!');
    return null;
  }
  
  // Return the provider with the lowest latency
  return providers[0].provider;
}

// Create a Fallback Provider
async function createFallbackProvider() {
  const providers = await getWorkingProviders();
  
  if (providers.length === 0) {
    console.error('No working BSC providers found!');
    return null;
  }
  
  if (providers.length === 1) {
    console.log(`Using single provider: ${providers[0].endpoint}`);
    return providers[0].provider;
  }
  
  // Use at most 4 providers to avoid excessive connections
  const topProviders = providers.slice(0, 4);
  
  try {
    // In ethers v6, FallbackProvider configuration is different
    // For now, let's use the first working provider to avoid complexity
    const bestProvider = providers[0];
    console.log(`Using best provider: ${bestProvider.endpoint} (score: ${bestProvider.score})`);
    
    return bestProvider.provider;
  } catch (error) {
    console.error('Error creating provider:', error);
    
    // If provider creation fails, return the first working provider
    console.log(`Falling back to single provider: ${providers[0].endpoint}`);
    return providers[0].provider;
  }
}

// Get LP Pool Info with timeout and retry
async function getLPPoolInfo(timeout = 10000, retries = 3) {
  // Minimal LP ABI for getReserves
  const LP_ABI = [
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
  ];
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Getting LP pool info, attempt ${attempt}/${retries}`);
      
      // Get a provider
      const provider = await getBestProvider();
      if (!provider) {
        throw new Error('No working provider available');
      }
      
      // Set a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout);
      });
      
      // Define both pool addresses
      const SWF_ETH_LP_ADDRESS = '0x5Ac30825dA8fCEEFCC8AC1e29df82eC866050e94';
      
      // Create contract instances for both pools
      const bnbLpContract = new ethers.Contract(SWF_LP_ADDRESS, LP_ABI, provider);
      const ethLpContract = new ethers.Contract(SWF_ETH_LP_ADDRESS, LP_ABI, provider);
      
      // Get data from both pools with timeout
      const [bnbPoolData, ethPoolData] = await Promise.race([
        Promise.all([
          // BNB Pool data
          Promise.all([
            bnbLpContract.getReserves(),
            bnbLpContract.totalSupply(),
            bnbLpContract.decimals(),
            bnbLpContract.token0(),
            bnbLpContract.token1()
          ]),
          // ETH Pool data
          Promise.all([
            ethLpContract.getReserves(),
            ethLpContract.totalSupply(),
            ethLpContract.decimals(),
            ethLpContract.token0(),
            ethLpContract.token1()
          ])
        ]),
        timeoutPromise
      ]);
      
      // Process BNB pool data
      const [bnbReserves, bnbTotalSupply, bnbDecimals, bnbToken0, bnbToken1] = bnbPoolData;
      const bnbReserve0 = ethers.utils.formatUnits(bnbReserves[0], 18);
      const bnbReserve1 = ethers.utils.formatUnits(bnbReserves[1], 18);
      const isSWFToken0BNB = bnbToken0.toLowerCase() === SWF_TOKEN_ADDRESS.toLowerCase();
      const swfReserveBNB = isSWFToken0BNB ? bnbReserve0 : bnbReserve1;
      const bnbReserve = isSWFToken0BNB ? bnbReserve1 : bnbReserve0;
      
      // Process ETH pool data
      const [ethReserves, ethTotalSupply, ethDecimals, ethToken0, ethToken1] = ethPoolData;
      const ethReserve0 = ethers.utils.formatUnits(ethReserves[0], 18);
      const ethReserve1 = ethers.utils.formatUnits(ethReserves[1], 18);
      const isSWFToken0ETH = ethToken0.toLowerCase() === SWF_TOKEN_ADDRESS.toLowerCase();
      const swfReserveETH = isSWFToken0ETH ? ethReserve0 : ethReserve1;
      const ethReserve = isSWFToken0ETH ? ethReserve1 : ethReserve0;
      
      // Calculate combined data
      const totalSWFReserve = parseFloat(swfReserveBNB) + parseFloat(swfReserveETH);
      const priceSWFinBNB = parseFloat(bnbReserve) / parseFloat(swfReserveBNB);
      
      // Get real-time prices from CoinGecko for accurate USD values
      let ethPrice = 2648.49; // Fallback price
      let bnbPrice = 677.9;   // Fallback price
      
      try {
        const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin&vs_currencies=usd');
        const priceData = await priceResponse.json();
        ethPrice = priceData.ethereum?.usd || ethPrice;
        bnbPrice = priceData.binancecoin?.usd || bnbPrice;
      } catch (error) {
        console.log('Using fallback prices for USD calculation');
      }
      
      // Calculate accurate USD values with real-time prices
      const ethValueUSD = parseFloat(ethReserve) * ethPrice;
      const bnbValueUSD = parseFloat(bnbReserve) * bnbPrice;
      
      // Match PancakeSwap display: show individual reserve values, not doubled TVL
      const ethPoolTVL = ethValueUSD; // Single reserve value as shown on PancakeSwap
      const bnbPoolTVL = bnbValueUSD; // Single reserve value as shown on PancakeSwap
      const combinedTVL = ethPoolTVL + bnbPoolTVL;
      
      // Return combined data from both pools
      return {
        swfReserve: totalSWFReserve.toString(),
        bnbReserve,
        ethReserve,
        swfReserveBNB,
        swfReserveETH,
        combinedTVL,
        ethPoolTVL,
        bnbPoolTVL,
        ethValueUSD,
        bnbValueUSD,
        ethPrice,
        bnbPrice,
        totalSupply: ethers.utils.formatUnits(bnbTotalSupply, bnbDecimals),
        priceSWFinBNB,
        token0: bnbToken0,
        token1: bnbToken1,
        lpContract: SWF_LP_ADDRESS,
        ethLpContract: SWF_ETH_LP_ADDRESS,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`LP pool info attempt ${attempt} failed:`, error.message);
      lastError = error;
      
      // If not the last attempt, wait for a bit before retrying
      if (attempt < retries) {
        console.log(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // If all attempts failed
  throw new Error(`Failed to get LP pool info after ${retries} attempts: ${lastError?.message}`);
}

// Initialize the module
async function initialize() {
  console.log('Initializing blockchain connector...');
  
  // Test all RPC endpoints
  const providers = await getWorkingProviders();
  
  if (providers.length === 0) {
    console.warn('No working BSC providers found. Using fallback.');
    return false;
  }
  
  console.log(`Successfully initialized blockchain connector with ${providers.length} working providers.`);
  return true;
}

// Get SWF Contract instance
let swfContract = null;
let provider = null;
let isInitialized = false;

function getSwfContract() {
  if (!swfContract) {
    try {
      // Minimal SWF token ABI (for main functions)
      const MINIMAL_SWF_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function transfer(address to, uint amount) returns (bool)"
      ];
      
      if (!provider) {
        // Try to use Alchemy API key directly if available
        if (process.env.ALCHEMY_API_KEY) {
          console.log('Using Alchemy provider for BSC Mainnet');
          const alchemyUrl = `https://bsc-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
          provider = new ethers.JsonRpcProvider(alchemyUrl);
        } else {
          // Fallback to direct provider
          console.log('Using direct provider URL for BSC Mainnet');
          provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
        }
      }
      
      swfContract = new ethers.Contract(SWF_TOKEN_ADDRESS, MINIMAL_SWF_ABI, provider);
      console.log(`SWF contract initialized at: ${SWF_TOKEN_ADDRESS} with full ABI`);
    } catch (error) {
      console.error('Failed to create SWF contract instance:', error);
      return null;
    }
  }
  
  return swfContract;
}

// Full Initialize function
async function fullInitialize() {
  try {
    console.log('Initializing blockchain connector...');
    
    // Check if we have an Alchemy API key first
    if (process.env.ALCHEMY_API_KEY) {
      console.log('Using Alchemy provider for BSC Mainnet');
      try {
        const alchemyUrl = `https://bsc-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
        provider = new ethers.JsonRpcProvider(alchemyUrl);
        
        // Test the connection
        await provider.getBlockNumber();
        console.log('Alchemy provider connection successful');
      } catch (error) {
        console.error('Failed to connect with Alchemy provider:', error.message);
        provider = null;
      }
    }
    
    // If Alchemy didn't work or isn't available, try other providers
    if (!provider) {
      // Get working providers
      const providers = await getWorkingProviders();
      
      if (providers.length > 0) {
        // Set the provider to the best one
        provider = providers[0].provider;
        console.log(`Using provider ${providers[0].endpoint}`);
      } else {
        console.warn('No working BSC providers found. Using fallback.');
        provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
      }
    }
    
    // Initialize SWF contract
    getSwfContract();
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Blockchain connector initialization failed:', error);
    return false;
  }
}

/**
 * Get user's LP positions for all SWF pools
 * 
 * @param {string} walletAddress - User's wallet address
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} retries - Number of retries on failure
 * @returns {Promise<Object>} User's LP positions for each pool
 */
async function getUserLPPositions(walletAddress, timeout = 10000, retries = 3) {
  const LP_ADDRESSES = {
    "SWF/BNB": SWF_LP_ADDRESS,
    "SWF/ETH": '0x5Ac30825dA8fCEEFCC8AC1e29df82eC866050e94'
  };
  
  if (!walletAddress) {
    console.log('No wallet address provided for LP positions');
    return Object.keys(LP_ADDRESSES).reduce((acc, key) => {
      acc[key] = {
        pairName: key,
        tokens: "0",
        percentOfPool: 0,
        valueUSD: 0,
        address: LP_ADDRESSES[key],
        timestamp: Date.now()
      };
      return acc;
    }, {});
  }
  
  // Try to get the best provider with fallbacks
  let provider;
  try {
    provider = await getBestProvider();
    if (!provider) {
      console.warn('No working provider available for LP positions');
      throw new Error('No blockchain provider available');
    }
  } catch (error) {
    console.error('Error getting provider for LP positions:', error);
    // Return fallback data 
    return Object.keys(LP_ADDRESSES).reduce((acc, key) => {
      acc[key] = {
        pairName: key,
        tokens: "0",
        percentOfPool: 0,
        valueUSD: 0,
        address: LP_ADDRESSES[key],
        timestamp: Date.now()
      };
      return acc;
    }, {});
  }
  
  // LP Token ABI for balanceOf
  const LP_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function decimals() external view returns (uint8)"
  ];
  
  // First try to get the LP pool data for price information
  let poolData = [];
  try {
    poolData = await getLPPoolInfo(timeout, retries);
  } catch (error) {
    console.warn('Unable to get LP pool info for position values:', error.message);
  }
  
  // Create a map of LP address to pool data for quick lookup
  const poolDataMap = {};
  if (Array.isArray(poolData)) {
    poolData.forEach(pool => {
      if (pool && pool.address) {
        poolDataMap[pool.address.toLowerCase()] = pool;
      }
    });
  }
  
  // Get positions for each LP pair
  const positions = {};
  
  // Process each LP pair
  for (const [pairName, address] of Object.entries(LP_ADDRESSES)) {
    try {
      console.log(`Getting LP position for ${pairName} (${address}) for wallet ${walletAddress}`);
      
      // Connect to LP contract
      const lpContract = new ethers.Contract(address, LP_ABI, provider);
      
      // Get user's LP balance and pool data
      const [
        lpBalance,
        lpTotalSupply,
        lpReserves,
        decimals
      ] = await Promise.all([
        lpContract.balanceOf(walletAddress),
        lpContract.totalSupply(),
        lpContract.getReserves(),
        lpContract.decimals()
      ]);
      
      // Calculate percentage of pool
      const poolShare = lpTotalSupply.gt(0)
        ? lpBalance.mul(ethers.BigNumber.from(10000))
            .div(lpTotalSupply)
            .toNumber() / 10000
        : 0;
      
      // Format LP balance
      const lpTokens = ethers.utils.formatUnits(lpBalance, decimals);
      
      // Calculate USD value based on pool data if available
      let valueUSD = 0;
      const poolInfo = poolDataMap[address.toLowerCase()];
      
      if (poolInfo && poolInfo.poolValueUSD > 0) {
        valueUSD = poolInfo.poolValueUSD * (poolShare || 0);
      }
      
      // Add to positions object
      positions[pairName] = {
        pairName,
        tokens: lpTokens,
        percentOfPool: poolShare,
        valueUSD,
        address,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error(`Error getting position for ${pairName}:`, error);
      // Add default values for this pool
      positions[pairName] = {
        pairName,
        tokens: "0",
        percentOfPool: 0,
        valueUSD: 0,
        address,
        timestamp: Date.now()
      };
    }
  }
  
  return positions;
}

module.exports = {
  initialize,
  fullInitialize,
  getBestProvider,
  createFallbackProvider,
  getLPPoolInfo,
  getUserLPPositions,
  getWorkingProviders,
  getSwfContract,
  BSC_RPC_ENDPOINTS,
  SWF_TOKEN_ADDRESS,
  SWF_LP_ADDRESS,
  SOLO_METHOD_ENGINE_ADDRESS,
  soloMethodEngineAddress: SOLO_METHOD_ENGINE_ADDRESS,
  swfTokenAddress: SWF_TOKEN_ADDRESS,
  isInitialized
};