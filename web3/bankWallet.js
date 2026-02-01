/**
 * SWF Bank Wallet Module
 * 
 * This module provides functionality for connecting to the Ethereum network
 * and interacting with the SWF token using the bank wallet private key.
 */
const { ethers } = require('ethers');
require('dotenv').config();

// Bank wallet configuration - use rewards wallet private key for course completion rewards
const bankWalletPK = process.env.REWARDS_WALLET_PRIVATE_KEY || process.env.SWF_BANK_PRIVATE_KEY;
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || process.env.MAINNET_RPC_URL);
const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS || process.env.TOKEN_ADDRESS;

// ABI for ERC20 token (minimal interface for basic operations)
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// Create bank wallet
let bankWallet = null;
let swfToken = null;

/**
 * Initialize the bank wallet
 * @returns {Object} The wallet and token contract instances
 */
function initializeBankWallet() {
  try {
    if (!bankWalletPK) {
      console.warn('Bank wallet private key not found in environment variables');
      return { wallet: null, token: null };
    }
    
    // Remove '0x' prefix if present
    const pk = bankWalletPK.startsWith('0x') ? bankWalletPK.substring(2) : bankWalletPK;
    
    // Create wallet
    bankWallet = new ethers.Wallet(pk, provider);
    console.log(`Bank wallet initialized: ${bankWallet.address}`);
    
    // Create token contract instance
    if (swfTokenAddress) {
      swfToken = new ethers.Contract(swfTokenAddress, ERC20_ABI, bankWallet);
      console.log(`SWF token contract connected at: ${swfTokenAddress}`);
    } else {
      console.warn('SWF token address not found in environment variables');
    }
    
    return { wallet: bankWallet, token: swfToken };
  } catch (error) {
    console.error('Error initializing bank wallet:', error);
    return { wallet: null, token: null };
  }
}

/**
 * Get the bank wallet instance
 * @returns {Object} The wallet instance
 */
function getBankWallet() {
  if (!bankWallet) {
    const { wallet } = initializeBankWallet();
    return wallet;
  }
  return bankWallet;
}

/**
 * Get the SWF token contract instance
 * @returns {Object} The token contract instance
 */
function getSWFToken() {
  if (!swfToken) {
    const { token } = initializeBankWallet();
    return token;
  }
  return swfToken;
}

/**
 * Transfer SWF tokens from the bank wallet to a recipient
 * @param {string} to - Recipient address
 * @param {number|string} amount - Amount to transfer (in token units)
 * @param {number} decimals - Token decimals (defaults to 18 for BEP20 SWF)
 * @returns {Promise<Object>} Transaction receipt
 */
async function transferSWFFromBank(to, amount, decimals = 18) {
  try {
    const token = getSWFToken();
    if (!token) {
      throw new Error('SWF token contract not initialized');
    }
    
    // Convert to token units
    const amountInWei = ethers.utils.parseUnits(amount.toString(), decimals);
    
    // Send transaction
    const tx = await token.transfer(to, amountInWei);
    console.log(`Transfer initiated: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`Transfer confirmed in block ${receipt.blockNumber}`);
    
    return receipt;
  } catch (error) {
    console.error('Error transferring SWF tokens:', error);
    throw error;
  }
}

/**
 * Get SWF token balance of the bank wallet
 * @param {number} decimals - Token decimals (defaults to 18 for BEP20 SWF)
 * @returns {Promise<string>} Balance in formatted units
 */
async function getBankSWFBalance(decimals = 18) {
  try {
    const token = getSWFToken();
    if (!token) {
      throw new Error('SWF token contract not initialized');
    }
    
    const wallet = getBankWallet();
    const balance = await token.balanceOf(wallet.address);
    return ethers.utils.formatUnits(balance, decimals);
  } catch (error) {
    console.error('Error getting SWF balance:', error);
    return '0';
  }
}

/**
 * Get ETH balance of the bank wallet
 * @returns {Promise<string>} Balance in formatted ETH
 */
async function getBankETHBalance() {
  try {
    const wallet = getBankWallet();
    const balance = await wallet.getBalance();
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error('Error getting ETH balance:', error);
    return '0';
  }
}

module.exports = {
  initializeBankWallet,
  getBankWallet,
  getSWFToken,
  transferSWFFromBank,
  getBankSWFBalance,
  getBankETHBalance
};