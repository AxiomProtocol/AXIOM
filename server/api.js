/**
 * SWF Staking Module API
 * Provides endpoints for the frontend to fetch contract addresses from Polygon Mainnet deployment
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import error handling utilities
const { errorTypes, asyncHandler } = require('./error-handler');

// Try to load token info from JSON file first
let tokenInfo = {
  address: "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7", // Default to latest token address
  name: "Sovran Wealth Fund",
  symbol: "SWF",
  decimals: 18
};

try {
  const tokenJsonPath = path.join(__dirname, '../SovranWealthFund.token.json');
  if (fs.existsSync(tokenJsonPath)) {
    const loadedTokenInfo = JSON.parse(fs.readFileSync(tokenJsonPath, 'utf8'));
    if (loadedTokenInfo.token) {
      // New format structure
      tokenInfo = loadedTokenInfo.token;
    } else {
      // Old format structure
      tokenInfo = loadedTokenInfo;
    }
    console.log('Loaded token info from SovranWealthFund.token.json:', tokenInfo.address);
  }
} catch (error) {
  console.error('Error loading token info from JSON file:', error);
}

// Environment variable defaults if not set
const DEFAULT_SWF_TOKEN = process.env.SWF_TOKEN_ADDRESS || tokenInfo.address;
const DEFAULT_TREASURY = process.env.TREASURY_WALLET || "0x26a8401287ce33cc4AEb5a106cD6D282a9c2f51D";

// Initialize contract addresses with defaults
let contractAddresses = {
  swfToken: DEFAULT_SWF_TOKEN,
  liquidityVaultETH: process.env.LIQUIDITY_VAULT_ETH || null,
  liquidityVaultUSDC: process.env.LIQUIDITY_VAULT_USDC || null,
  governancePool: process.env.GOVERNANCE_POOL || null,
  vaultAdapter: process.env.VAULT_ADAPTER || null,
  lpTokenETH: process.env.LP_TOKEN_ADDRESS || null,
  lpTokenUSDC: process.env.LP_TOKEN_ADDRESS_USDC || null,
  treasury: DEFAULT_TREASURY,
  deployedAt: new Date().toISOString(),
  network: "polygon",
  chainId: 137
};

// Try to load mainnet contract information
try {
  const mainnetInfoPath = path.join(__dirname, '../mainnet-contract-info.json');
  
  if (fs.existsSync(mainnetInfoPath)) {
    const mainnetData = JSON.parse(fs.readFileSync(mainnetInfoPath, 'utf8'));
    console.log('Loaded contract addresses from mainnet-contract-info.json');
    
    // Map the mainnet data to our contract addresses structure
    contractAddresses = {
      swfToken: process.env.SWF_TOKEN_ADDRESS || mainnetData.token.address || DEFAULT_SWF_TOKEN,
      liquidityVaultETH: process.env.LIQUIDITY_VAULT_ETH || mainnetData.liquidityVaults.eth.address,
      liquidityVaultUSDC: process.env.LIQUIDITY_VAULT_USDC || mainnetData.liquidityVaults.usdc.address,
      governancePool: process.env.GOVERNANCE_POOL || mainnetData.governance.address,
      vaultAdapter: process.env.VAULT_ADAPTER || mainnetData.vaultAdapter.address,
      lpTokenETH: process.env.LP_TOKEN_ADDRESS || mainnetData.liquidityVaults.eth.lpTokenAddress,
      lpTokenUSDC: process.env.LP_TOKEN_ADDRESS_USDC || mainnetData.liquidityVaults.usdc.lpTokenAddress,
      treasury: process.env.TREASURY_WALLET || mainnetData.wallets.treasury || DEFAULT_TREASURY,
      deployedAt: mainnetData.deployment.date,
      network: mainnetData.token.network || "polygon",
      chainId: mainnetData.token.chainId || 137
    };
  } else if (fs.existsSync(path.join(__dirname, '../staking-modules-latest.json'))) {
    // Fallback to staking-modules-latest.json if mainnet file doesn't exist
    const deploymentData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../staking-modules-latest.json'), 'utf8')
    );
    console.log('Loaded contract addresses from staking-modules-latest.json');
    
    // Override with deployment data but keep environment variable values if they exist
    contractAddresses = {
      ...deploymentData,
      // Keep env vars if they exist
      swfToken: process.env.SWF_TOKEN_ADDRESS || deploymentData.swfToken || DEFAULT_SWF_TOKEN,
      liquidityVaultETH: process.env.LIQUIDITY_VAULT_ETH || deploymentData.liquidityVaultETH,
      liquidityVaultUSDC: process.env.LIQUIDITY_VAULT_USDC || deploymentData.liquidityVaultUSDC,
      governancePool: process.env.GOVERNANCE_POOL || deploymentData.governancePool,
      vaultAdapter: process.env.VAULT_ADAPTER || deploymentData.vaultAdapter,
      lpTokenETH: process.env.LP_TOKEN_ADDRESS || deploymentData.lpTokenETH,
      lpTokenUSDC: process.env.LP_TOKEN_ADDRESS_USDC || deploymentData.lpTokenUSDC,
      treasury: process.env.TREASURY_WALLET || deploymentData.treasury || DEFAULT_TREASURY
    };
  }
} catch (error) {
  console.error('Error loading contract addresses from file:', error);
}

// Helper to check if address is valid
function isValidAddress(address) {
  return address && address !== "0x0000000000000000000000000000000000000000" && address.length === 42;
}

// API endpoint for status check
router.get('/status', (req, res) => {
  try {
    res.json({ 
      status: 'online', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production'
    });
  } catch (error) {
    console.error('Error in status endpoint:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error', 
      timestamp: new Date().toISOString() 
    });
  }
});

// API endpoint for contract metadata
router.get('/metadata', (req, res) => {
  try {
    res.json({
      swfToken: {
        name: "Sovran Wealth Fund",
        symbol: "SWF",
        decimals: 18
      },
      network: {
        name: "Polygon Mainnet",
        chainId: 137,
        rpcUrl: "https://polygon-rpc.com"
      },
      deploymentInfo: {
        deployedAt: contractAddresses.deployedAt,
        version: "1.0.0"
      }
    });
  } catch (error) {
    console.error('Error in metadata endpoint:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error', 
      timestamp: new Date().toISOString() 
    });
  }
});

// API endpoint for module integrator
router.get('/modules/integrator', (req, res) => {
  try {
    res.json({
      address: isValidAddress(process.env.MODULE_INTEGRATOR) ? process.env.MODULE_INTEGRATOR : null,
      treasury: contractAddresses.treasury,
      lastReward: new Date().toISOString(),
      rewardPercentage: "50%",
      rewardFrequency: "7 days"
    });
  } catch (error) {
    console.error('Error in module integrator endpoint:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve module integrator information', 
      timestamp: new Date().toISOString() 
    });
  }
});

// API endpoint for governance pool
router.get('/modules/governance', (req, res) => {
  try {
    res.json({
      address: contractAddresses.governancePool,
      token: contractAddresses.swfToken,
      totalStaked: "0 SWF",
      apr: "12% APR",
      lpPairName: "N/A" // Not applicable for governance pool
    });
  } catch (error) {
    console.error('Error in governance pool endpoint:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve governance pool information', 
      timestamp: new Date().toISOString() 
    });
  }
});

// API endpoint for liquidity vault (supports both ETH and USDC pairs)
router.get('/modules/liquidity', (req, res) => {
  try {
    // Determine which LP pair to return (ETH or USDC)
    const pairType = req.query.pair && req.query.pair.toUpperCase() === 'USDC' ? 'USDC' : 'ETH';
    
    const address = pairType === 'USDC' ? contractAddresses.liquidityVaultUSDC : contractAddresses.liquidityVaultETH;
    const lpToken = pairType === 'USDC' ? contractAddresses.lpTokenUSDC : contractAddresses.lpTokenETH;
    const lpPairName = pairType === 'USDC' ? 'SWF/USDC' : 'SWF/ETH';
    
    res.json({
      address: address,
      lpToken: lpToken,
      lpPairName: lpPairName,
      totalStaked: "0 LP",
      pairType: pairType
    });
  } catch (error) {
    console.error('Error in liquidity vault endpoint:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve liquidity vault information', 
      timestamp: new Date().toISOString() 
    });
  }
});

// API endpoint for vault adapter
router.get('/modules/vault', (req, res) => {
  try {
    res.json({
      address: contractAddresses.vaultAdapter,
      vault: contractAddresses.treasury, // Treasury acts as the vault
      totalDeposits: "0 SWF",
      depositBonus: "10% APR bonus"
    });
  } catch (error) {
    console.error('Error in vault adapter endpoint:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve vault adapter information', 
      timestamp: new Date().toISOString() 
    });
  }
});

// API endpoint for token information
router.get('/token', (req, res) => {
  try {
    // Read the token information from the JSON file
    let tokenInfo;
    try {
      const tokenJsonPath = path.join(__dirname, '../SovranWealthFund.token.json');
      if (fs.existsSync(tokenJsonPath)) {
        const loadedData = JSON.parse(fs.readFileSync(tokenJsonPath, 'utf8'));
        
        // Check if this is the new format with token object
        if (loadedData.token) {
          tokenInfo = loadedData.token;
        } else {
          tokenInfo = loadedData;
        }
        
        console.log('Using token information from SovranWealthFund.token.json');
      } else {
        // Fallback to the contract addresses if the token JSON doesn't exist
        tokenInfo = {
          name: "Sovran Wealth Fund",
          symbol: "SWF",
          decimals: 18,
          totalSupply: "1000000000.0",
          address: contractAddresses.swfToken
        };
        console.log('Using fallback token information, token JSON file not found');
      }
    } catch (readError) {
      console.error('Error reading token JSON file:', readError);
      // Fallback if there's an error reading the file
      tokenInfo = {
        name: "Sovran Wealth Fund",
        symbol: "SWF",
        decimals: 18,
        totalSupply: "1000000000.0",
        address: contractAddresses.swfToken
      };
    }
    
    res.json({
      address: tokenInfo.address,
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      decimals: tokenInfo.decimals,
      totalSupply: tokenInfo.totalSupply,
      logo: "/swf-token.png"
    });
  } catch (error) {
    console.error('Error in token information endpoint:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve token information', 
      timestamp: new Date().toISOString() 
    });
  }
});

// API endpoint for LP token information
router.get('/lptoken', (req, res) => {
  try {
    // Determine which LP token to return (ETH or USDC)
    const pairType = req.query.pair && req.query.pair.toUpperCase() === 'USDC' ? 'USDC' : 'ETH';
    
    res.json({
      address: pairType === 'USDC' ? contractAddresses.lpTokenUSDC : contractAddresses.lpTokenETH,
      name: pairType === 'USDC' ? 'SWF-USDC LP' : 'SWF-ETH LP',
      symbol: pairType === 'USDC' ? 'SWF-USDC-LP' : 'SWF-ETH-LP',
      decimals: 18,
      pairName: pairType === 'USDC' ? 'SWF/USDC' : 'SWF/ETH'
    });
  } catch (error) {
    console.error('Error in LP token endpoint:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve LP token information', 
      timestamp: new Date().toISOString() 
    });
  }
});

module.exports = router;