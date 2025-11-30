require('dotenv').config({ path: __dirname + '/../.env' });
const ethers = require('ethers');
const config = require('../config/config');
const SWF_ABI = require('../abis/SWF_abi.json');

/**
 * SovranWealthFund Token Interface
 * 
 * This script connects to the SWF token contract on Ethereum Mainnet
 * and provides functionality to interact with the contract.
 */

// Setup provider and signer
let provider;
let contract;
let wallet;

async function initialize() {
  try {
    console.log('Initializing connection to SovranWealthFund token...');
    
    // Connect to the provider
    provider = new ethers.providers.JsonRpcProvider(config.providerUrl);
    
    // Create contract instance
    contract = new ethers.Contract(
      config.contractAddress,
      SWF_ABI,
      provider
    );
    
    // Set up wallet if private key is available
    if (config.privateKey) {
      wallet = new ethers.Wallet(config.privateKey, provider);
      contract = contract.connect(wallet);
      console.log('Wallet connected successfully.');
    }
    
    // Get basic token information
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply()
    ]);
    
    console.log('\nToken Information:');
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)}`);
    
    // Get fee information
    const [baseFee, burnFee, liquidityFee, holdFee, marketingFee, totalFee] = await Promise.all([
      contract.baseFee(),
      contract.burnFee(),
      contract.liquidityFee(),
      contract.holdFee(),
      contract.marketingFee(),
      contract.totalFee()
    ]);
    
    console.log('\nFee Structure:');
    console.log(`Base Fee: ${baseFee / 100}%`);
    console.log(`Burn Fee: ${burnFee / 100}%`);
    console.log(`Liquidity Fee: ${liquidityFee / 100}%`);
    console.log(`Hold Fee: ${holdFee / 100}%`);
    console.log(`Marketing Fee: ${marketingFee / 100}%`);
    console.log(`Total Fee: ${totalFee / 100}%`);
    
    // Get wallet information
    if (wallet) {
      const address = wallet.address;
      const balance = await contract.balanceOf(address);
      
      console.log('\nWallet Information:');
      console.log(`Address: ${address}`);
      console.log(`SWF Balance: ${ethers.utils.formatUnits(balance, decimals)}`);
    }
    
    // Get SOLO Plan wallet information
    const walletCount = await contract.getSoloWalletCount();
    console.log('\nSOLO Plan Wallets:');
    console.log(`Total Wallets: ${walletCount}`);
    
    for (let i = 0; i < Math.min(walletCount.toNumber(), 12); i++) {
      const walletInfo = await contract.getSoloWalletInfo(i);
      console.log(`Wallet ${i}: ${walletInfo.name} - ${walletInfo.walletAddress} (${walletInfo.allocation / 100}%)`);
    }
    
    console.log('\nConnection established successfully!');
    return contract;
  } catch (error) {
    console.error('Error connecting to SovranWealthFund token:');
    console.error(error);
    throw error;
  }
}

// Function to get token balance for an address
async function getBalance(address) {
  try {
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return ethers.utils.formatUnits(balance, decimals);
  } catch (error) {
    console.error(`Error getting balance for ${address}:`, error);
    throw error;
  }
}

// Function to transfer tokens
async function transfer(to, amount) {
  if (!wallet) {
    throw new Error('Wallet not initialized. Private key required for transactions.');
  }
  
  try {
    const decimals = await contract.decimals();
    const amountWei = ethers.utils.parseUnits(amount.toString(), decimals);
    
    // Get gas price and estimate gas
    const gasPrice = await provider.getGasPrice();
    const adjustedGasPrice = gasPrice.mul(Math.floor(config.gasPriceMultiplier * 100)).div(100);
    
    // Create transaction
    const tx = await contract.transfer(to, amountWei, {
      gasLimit: config.gasLimit,
      gasPrice: adjustedGasPrice
    });
    
    console.log(`Transaction hash: ${tx.hash}`);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
    
    return tx;
  } catch (error) {
    console.error('Error transferring tokens:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await initialize();
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
}

// Export functions for use in other scripts
module.exports = {
  initialize,
  getBalance,
  transfer
};

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}