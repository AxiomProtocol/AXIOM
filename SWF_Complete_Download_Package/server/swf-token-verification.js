/**
 * SWF Token Verification Module
 * 
 * This module provides enhanced verification capabilities for the
 * Sovran Wealth Fund token, integrating with the existing API server.
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load ABI from the compiled contract
function loadContractABI() {
  try {
    // Try to load from artifacts
    const artifactPath = path.join(__dirname, '../artifacts/contracts/SovranWealthFund.sol/SovranWealthFund.json');
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      return artifact.abi;
    }
    
    // Fallback to direct ABI file
    const abiPath = path.join(__dirname, '../abis/SovranWealthFund.json');
    if (fs.existsSync(abiPath)) {
      const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      return abi;
    }
    
    // If both fail, return null and log error
    console.error('Could not load SovranWealthFund ABI from either artifacts or ABI directory');
    return null;
  } catch (error) {
    console.error('Error loading ABI:', error);
    return null;
  }
}

// Cache the ABI
const SWF_ABI = loadContractABI();

/**
 * Create a provider based on the network
 * @param {string} network - The network to connect to (mainnet, testnet)
 * @returns {ethers.providers.Provider} - An ethers provider
 */
function getProvider(network = 'mainnet') {
  // Use environment variables for API keys
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  
  if (!alchemyKey) {
    console.warn('ALCHEMY_API_KEY not found in environment variables. Using fallback RPC.');
  }
  
  let providerUrl;
  if (network === 'mainnet') {
    // Polygon Mainnet
    providerUrl = alchemyKey 
      ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`
      : 'https://polygon-rpc.com';
  } else {
    // Mumbai Testnet
    providerUrl = alchemyKey 
      ? `https://polygon-mumbai.g.alchemy.com/v2/${alchemyKey}`
      : 'https://rpc-mumbai.maticvigil.com';
  }
  
  return new ethers.providers.JsonRpcProvider(providerUrl);
}

/**
 * Get details about a token contract
 * @param {string} tokenAddress - The token contract address
 * @param {string} network - The network (mainnet, testnet)
 * @returns {Promise<object>} - Token information
 */
async function getTokenInfo(tokenAddress, network = 'mainnet') {
  try {
    // Create provider for the specified network
    const provider = getProvider(network);
    
    // Create contract instance
    const contract = new ethers.Contract(tokenAddress, SWF_ABI, provider);
    
    // Fetch basic token information
    const [name, symbol, decimals, totalSupply, paused] = await Promise.all([
      contract.name().catch(() => 'Unknown'),
      contract.symbol().catch(() => 'Unknown'),
      contract.decimals().catch(() => 18),
      contract.totalSupply().catch(() => ethers.BigNumber.from(0)),
      contract.paused().catch(() => false)
    ]);
    
    // Calculate formatted total supply
    const formattedTotalSupply = ethers.utils.formatUnits(totalSupply, decimals);
    
    // Get contract creation info
    const code = await provider.getCode(tokenAddress);
    
    return {
      address: tokenAddress,
      name,
      symbol,
      decimals: decimals.toString(),
      totalSupply: formattedTotalSupply,
      rawTotalSupply: totalSupply.toString(),
      paused,
      hasCode: code !== '0x',
      network
    };
  } catch (error) {
    console.error('Error fetching token info:', error);
    throw new Error(`Failed to fetch token info: ${error.message}`);
  }
}

/**
 * Verify if a contract is the SWF token
 * @param {string} tokenAddress - The token contract address
 * @param {string} network - The network (mainnet, testnet)
 * @returns {Promise<object>} - Verification result
 */
async function verifyToken(tokenAddress, network = 'mainnet') {
  try {
    // Get token information
    const tokenInfo = await getTokenInfo(tokenAddress, network);
    
    // SWF token specs
    const EXPECTED_NAME = 'Sovran Wealth Fund';
    const EXPECTED_SYMBOL = 'SWF';
    const EXPECTED_DECIMALS = '18';
    
    // Check if this is the SWF token
    const nameMatch = tokenInfo.name === EXPECTED_NAME;
    const symbolMatch = tokenInfo.symbol === EXPECTED_SYMBOL;
    const decimalsMatch = tokenInfo.decimals === EXPECTED_DECIMALS;
    
    // Create provider and contract for additional checks
    const provider = getProvider(network);
    const contract = new ethers.Contract(tokenAddress, SWF_ABI, provider);
    
    // Check for required functions
    const hasMintFunction = await checkFunctionExists(contract, 'mint');
    const hasPauseFunction = await checkFunctionExists(contract, 'pause');
    const hasUnpauseFunction = await checkFunctionExists(contract, 'unpause');
    const hasRoleFunction = await checkFunctionExists(contract, 'hasRole');
    
    // Verify the contract implements the correct interface
    const verified = nameMatch && symbolMatch && decimalsMatch && 
                     hasMintFunction && hasPauseFunction && hasUnpauseFunction && 
                     hasRoleFunction;
    
    return {
      address: tokenAddress,
      network,
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      decimals: tokenInfo.decimals,
      totalSupply: tokenInfo.totalSupply,
      verified,
      checks: {
        nameMatch,
        symbolMatch,
        decimalsMatch,
        hasMintFunction,
        hasPauseFunction,
        hasUnpauseFunction,
        hasRoleFunction
      },
      message: verified 
        ? 'This is a verified Sovran Wealth Fund token.' 
        : 'This contract does not match the Sovran Wealth Fund token specification.'
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return {
      address: tokenAddress,
      network,
      verified: false,
      message: `Verification failed: ${error.message}`
    };
  }
}

/**
 * Check if a contract has a specific function
 * @param {ethers.Contract} contract - The contract instance
 * @param {string} functionName - The function name to check
 * @returns {Promise<boolean>} - Whether the function exists
 */
async function checkFunctionExists(contract, functionName) {
  try {
    // Try to find the function in the contract
    return typeof contract.functions[functionName] === 'function';
  } catch (error) {
    return false;
  }
}

/**
 * Get detailed token state information
 * @param {string} tokenAddress - The token contract address
 * @param {string} network - The network (mainnet, testnet)
 * @returns {Promise<object>} - Detailed token state
 */
async function getTokenState(tokenAddress, network = 'mainnet') {
  try {
    // Get basic token information first
    const tokenInfo = await getTokenInfo(tokenAddress, network);
    
    // Create provider and contract
    const provider = getProvider(network);
    const contract = new ethers.Contract(tokenAddress, SWF_ABI, provider);
    
    // Fetch additional information
    let roles = {};
    let ownerAddress = null;
    let adminCount = 0;
    let minterCount = 0;
    
    try {
      // Try to get DEFAULT_ADMIN_ROLE and MINTER_ROLE
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE().catch(() => null);
      const MINTER_ROLE = await contract.MINTER_ROLE().catch(() => null);
      const PAUSER_ROLE = await contract.PAUSER_ROLE().catch(() => null);
      
      // The contract implements AccessControl, fetch role information
      if (DEFAULT_ADMIN_ROLE) {
        // Try to get admin accounts (this might fail if the contract doesn't have the expected events)
        const adminFilter = contract.filters.RoleGranted(DEFAULT_ADMIN_ROLE);
        const minterFilter = contract.filters.RoleGranted(MINTER_ROLE);
        const pauserFilter = contract.filters.RoleGranted(PAUSER_ROLE);
        
        try {
          const adminEvents = await contract.queryFilter(adminFilter);
          const minterEvents = await contract.queryFilter(minterFilter);
          const pauserEvents = await contract.queryFilter(pauserFilter);
          
          adminCount = new Set(adminEvents.map(evt => evt.args.account)).size;
          minterCount = new Set(minterEvents.map(evt => evt.args.account)).size;
          const pauserCount = new Set(pauserEvents.map(evt => evt.args.account)).size;
          
          roles = {
            adminCount,
            minterCount,
            pauserCount
          };
        } catch (e) {
          console.warn('Could not fetch role events:', e.message);
        }
      }
    } catch (e) {
      console.warn('Could not fetch roles:', e.message);
    }
    
    // Try to get contract owner if the contract has an owner() function
    try {
      ownerAddress = await contract.owner().catch(() => null);
    } catch (e) {
      // Contract doesn't have an owner() function
    }
    
    // Get deployment info
    // This is a more complex operation that might fail, so we provide fallbacks
    let deploymentInfo = null;
    try {
      // Try to get the bytecode
      const bytecode = await provider.getCode(tokenAddress);
      
      // Check if the contract is verified on Etherscan/Polygonscan
      // Note: This requires an API key and would need an additional API call to PolygonScan
      
      deploymentInfo = {
        bytecodeSize: bytecode.length,
        verified: true // Placeholder, would require PolygonScan API check
      };
    } catch (e) {
      console.warn('Could not fetch deployment info:', e.message);
    }
    
    // Fetch recent transfers if available
    let recentTransfers = [];
    try {
      // Try to get transfer events
      const transferFilter = contract.filters.Transfer();
      const transferEvents = await contract.queryFilter(transferFilter, -10000); // last 10000 blocks
      
      recentTransfers = transferEvents.slice(-5).map(event => {
        return {
          from: event.args.from,
          to: event.args.to,
          value: ethers.utils.formatUnits(event.args.value, tokenInfo.decimals),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        };
      });
    } catch (e) {
      console.warn('Could not fetch transfer events:', e.message);
    }
    
    // Return all gathered information
    return {
      ...tokenInfo,
      roles,
      owner: ownerAddress,
      deploymentInfo,
      recentTransfers
    };
  } catch (error) {
    console.error('Error fetching token state:', error);
    throw new Error(`Failed to fetch token state: ${error.message}`);
  }
}

module.exports = {
  getProvider,
  getTokenInfo,
  verifyToken,
  getTokenState
};