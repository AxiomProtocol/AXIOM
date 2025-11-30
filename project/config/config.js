require('dotenv').config({ path: __dirname + '/../.env' });

/**
 * SovranWealthFund Configuration
 * 
 * This file contains all configuration settings for connecting to
 * and interacting with the SWF token contract on Ethereum Mainnet.
 */
module.exports = {
  // Ethereum Mainnet Connection
  providerUrl: process.env.PROVIDER_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
  
  // Contract Information
  contractAddress: process.env.CONTRACT_ADDRESS || '0xa0b0AaCbf4E7261691689e5F240C278fB295edF7',
  
  // Wallet Settings (for transactions that require signing)
  privateKey: process.env.PRIVATE_KEY || '',
  
  // Fee Settings (in percentage points, 100 = 1%)
  fees: {
    baseFee: 50,      // 0.5%
    burnFee: 25,      // 0.25%
    liquidityFee: 25, // 0.25%
    holdFee: 25,      // 0.25%
    marketingFee: 25, // 0.25%
    totalFee: 150,    // 1.5%
  },
  
  // Transaction Settings
  gasLimit: 300000,
  gasPriceMultiplier: 1.2, // Multiply estimated gas price by this factor
  
  // API Settings
  apiTimeout: 30000, // 30 seconds
  
  // Log Settings
  logLevel: 'info', // error, warn, info, debug
  
  // SOLO Plan Wallet Categories
  soloWalletCategories: [
    'Development Fund',
    'Marketing Fund',
    'Ecosystem Growth',
    'Team Allocation',
    'Advisor Pool',
    'Community Rewards',
    'Partner Integrations',
    'Reserve Fund',
    'Liquidity Provision',
    'Public Sale',
    'Private Sale',
    'Staking Rewards'
  ]
};