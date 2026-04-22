require('dotenv').config({ path: __dirname + '/../.env' });
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const SWF_ABI = require('../abis/SWF_abi.json');
const config = require('../config/config');

/**
 * SovranWealthFund Fee Tracker
 * 
 * This script monitors and tracks fees collected by the SWF token contract.
 * It records:
 * - Base fees
 * - Burn fees
 * - Liquidity fees
 * - Hold fees
 * - Marketing fees
 * - Total fees collected over time
 */

const HISTORY_FILE = path.join(__dirname, '../data/fee-history.json');
const POLL_INTERVAL = 60 * 1000; // Poll every minute
const MAX_HISTORY = 24 * 60; // Keep 24 hours of data at minute intervals

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '../data'))) {
  fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
}

// Load fee history
let feeHistory = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    feeHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    console.log(`Loaded ${feeHistory.length} historical fee records.`);
  } catch (error) {
    console.error('Error loading fee history:', error);
  }
}

// Connect to contract
let provider;
let contract;
let monitoring = false;

async function connectToContract() {
  try {
    provider = new ethers.providers.JsonRpcProvider(config.providerUrl);
    console.log('Connected to provider.');
    
    contract = new ethers.Contract(
      config.contractAddress,
      SWF_ABI,
      provider
    );
    console.log('Connected to SWF contract at:', config.contractAddress);
    
    return true;
  } catch (error) {
    console.error('Error connecting to contract:', error);
    return false;
  }
}

// Get current fee configuration
async function getContractFees() {
  try {
    const [baseFee, burnFee, liquidityFee, holdFee, marketingFee, totalFee] = await Promise.all([
      contract.baseFee(),
      contract.burnFee(),
      contract.liquidityFee(),
      contract.holdFee(),
      contract.marketingFee(),
      contract.totalFee()
    ]);
    
    return {
      baseFee: baseFee.toNumber(),
      burnFee: burnFee.toNumber(),
      liquidityFee: liquidityFee.toNumber(),
      holdFee: holdFee.toNumber(),
      marketingFee: marketingFee.toNumber(),
      totalFee: totalFee.toNumber()
    };
  } catch (error) {
    console.error('Error getting fees:', error);
    return null;
  }
}

// Get wallet balances for fee destinations
async function getWalletBalances() {
  try {
    const [burnWallet, liquidityWallet, holdingWallet, marketingWallet] = await Promise.all([
      contract.burnWallet(),
      contract.liquidityWallet(),
      contract.holdingWallet(),
      contract.marketingWallet()
    ]);
    
    // Get token balance for each wallet
    const [burnBalance, liquidityBalance, holdingBalance, marketingBalance] = await Promise.all([
      contract.balanceOf(burnWallet),
      contract.balanceOf(liquidityWallet),
      contract.balanceOf(holdingWallet),
      contract.balanceOf(marketingWallet)
    ]);
    
    // Get decimals for proper formatting
    const decimals = await contract.decimals();
    
    return {
      burnWallet: {
        address: burnWallet,
        balance: ethers.utils.formatUnits(burnBalance, decimals)
      },
      liquidityWallet: {
        address: liquidityWallet,
        balance: ethers.utils.formatUnits(liquidityBalance, decimals)
      },
      holdingWallet: {
        address: holdingWallet,
        balance: ethers.utils.formatUnits(holdingBalance, decimals)
      },
      marketingWallet: {
        address: marketingWallet,
        balance: ethers.utils.formatUnits(marketingBalance, decimals)
      }
    };
  } catch (error) {
    console.error('Error getting wallet balances:', error);
    return null;
  }
}

// Main monitoring function
async function monitorFees() {
  if (!contract) {
    const connected = await connectToContract();
    if (!connected) {
      console.log('Retrying in 30 seconds...');
      setTimeout(monitorFees, 30 * 1000);
      return;
    }
  }
  
  try {
    // Get current timestamp
    const now = new Date();
    const timestamp = now.toISOString();
    
    // Get current fee configuration
    const fees = await getContractFees();
    
    // Get wallet balances
    const wallets = await getWalletBalances();
    
    if (fees && wallets) {
      // Create record
      const record = {
        timestamp,
        fees,
        wallets
      };
      
      // Add to history
      feeHistory.push(record);
      
      // Trim history if too large
      if (feeHistory.length > MAX_HISTORY) {
        feeHistory = feeHistory.slice(feeHistory.length - MAX_HISTORY);
      }
      
      // Save history to file
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(feeHistory, null, 2));
      
      // Log current status
      console.log('\n===== SWF Fee Monitor =====');
      console.log(`Time: ${now.toLocaleString()}`);
      console.log('\nFee Configuration:');
      console.log(`Base Fee: ${fees.baseFee / 100}%`);
      console.log(`Burn Fee: ${fees.burnFee / 100}%`);
      console.log(`Liquidity Fee: ${fees.liquidityFee / 100}%`);
      console.log(`Hold Fee: ${fees.holdFee / 100}%`);
      console.log(`Marketing Fee: ${fees.marketingFee / 100}%`);
      console.log(`Total Fee: ${fees.totalFee / 100}%`);
      
      console.log('\nWallet Balances:');
      console.log(`Burn Wallet: ${wallets.burnWallet.balance} SWF`);
      console.log(`Liquidity Wallet: ${wallets.liquidityWallet.balance} SWF`);
      console.log(`Holding Wallet: ${wallets.holdingWallet.balance} SWF`);
      console.log(`Marketing Wallet: ${wallets.marketingWallet.balance} SWF`);
      
      // Check for changes since last record (if available)
      if (feeHistory.length > 1) {
        const previousRecord = feeHistory[feeHistory.length - 2];
        
        console.log('\nChanges since last check:');
        
        const burnChange = parseFloat(wallets.burnWallet.balance) - parseFloat(previousRecord.wallets.burnWallet.balance);
        const liquidityChange = parseFloat(wallets.liquidityWallet.balance) - parseFloat(previousRecord.wallets.liquidityWallet.balance);
        const holdingChange = parseFloat(wallets.holdingWallet.balance) - parseFloat(previousRecord.wallets.holdingWallet.balance);
        const marketingChange = parseFloat(wallets.marketingWallet.balance) - parseFloat(previousRecord.wallets.marketingWallet.balance);
        
        console.log(`Burn Wallet: ${burnChange > 0 ? '+' : ''}${burnChange.toFixed(2)} SWF`);
        console.log(`Liquidity Wallet: ${liquidityChange > 0 ? '+' : ''}${liquidityChange.toFixed(2)} SWF`);
        console.log(`Holding Wallet: ${holdingChange > 0 ? '+' : ''}${holdingChange.toFixed(2)} SWF`);
        console.log(`Marketing Wallet: ${marketingChange > 0 ? '+' : ''}${marketingChange.toFixed(2)} SWF`);
        
        const totalChange = burnChange + liquidityChange + holdingChange + marketingChange;
        console.log(`Total Fees Collected: ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(2)} SWF`);
      }
    }
  } catch (error) {
    console.error('Error during fee monitoring:', error);
  }
  
  // Schedule next update if still monitoring
  if (monitoring) {
    setTimeout(monitorFees, POLL_INTERVAL);
  }
}

// Start monitoring
async function startMonitoring() {
  monitoring = true;
  console.log('Starting SWF fee monitoring...');
  await monitorFees();
  console.log(`Monitoring active. Polling every ${POLL_INTERVAL / 1000} seconds.`);
}

// Stop monitoring
function stopMonitoring() {
  monitoring = false;
  console.log('Fee monitoring stopped.');
}

// Handle process shutdown
process.on('SIGINT', () => {
  console.log('\nStopping fee monitoring...');
  stopMonitoring();
  process.exit(0);
});

// If run directly, start monitoring
if (require.main === module) {
  startMonitoring();
}

module.exports = {
  startMonitoring,
  stopMonitoring,
  getContractFees,
  getWalletBalances,
  feeHistory
};