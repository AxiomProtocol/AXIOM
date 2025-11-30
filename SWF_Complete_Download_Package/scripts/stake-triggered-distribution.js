/**
 * Stake-Triggered Distribution
 * 
 * This script monitors staking events and triggers distribution when certain thresholds are met.
 * It can be run as a background process to automatically distribute tokens based on staking activity.
 * 
 * Usage:
 * - Ensure your .env file has the required variables
 * - Run with: node scripts/stake-triggered-distribution.js
 * - For production, use PM2: pm2 start scripts/stake-triggered-distribution.js --name "swf-staking-monitor"
 */

require('dotenv').config();
const { ethers } = require("ethers");
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Minimum staking threshold to trigger distribution (in SWF tokens)
  STAKING_THRESHOLD: 5000, 
  
  // Minimum time between distributions (24 hours in milliseconds)
  DISTRIBUTION_COOLDOWN: 24 * 60 * 60 * 1000,
  
  // Check frequency (in milliseconds)
  CHECK_INTERVAL: 15 * 60 * 1000, // 15 minutes
  
  // Log file path
  LOG_FILE: path.join(__dirname, '../logs/stake-triggered-distribution.log')
};

// Ensure log directory exists
const logDir = path.dirname(CONFIG.LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Load state if it exists
let STATE = {
  lastDistributionTimestamp: 0,
  totalStakedSinceLastDistribution: ethers.BigNumber.from(0)
};

const STATE_FILE = path.join(__dirname, '../logs/distribution-state.json');
if (fs.existsSync(STATE_FILE)) {
  try {
    const savedState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    STATE.lastDistributionTimestamp = savedState.lastDistributionTimestamp || 0;
    STATE.totalStakedSinceLastDistribution = ethers.BigNumber.from(savedState.totalStakedSinceLastDistribution || "0");
    
    log(`Loaded previous state: Last distribution at ${new Date(STATE.lastDistributionTimestamp).toISOString()}`);
    log(`Total staked since last distribution: ${ethers.utils.formatEther(STATE.totalStakedSinceLastDistribution)} SWF`);
  } catch (error) {
    log(`Error loading state: ${error.message}. Starting with fresh state.`);
  }
}

// Helper for logging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
}

// Connect to provider and contracts
async function connect() {
  try {
    // Set up provider
    const provider = process.env.ALCHEMY_API_KEY 
      ? new ethers.providers.AlchemyProvider("matic", process.env.ALCHEMY_API_KEY)
      : new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
    
    // Set up wallet
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is not set in the environment variables");
    }
    
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Load token contract
    if (!process.env.SWF_TOKEN_ADDRESS) {
      throw new Error("SWF_TOKEN_ADDRESS is not set in the environment variables");
    }
    
    const token = new ethers.Contract(
      process.env.SWF_TOKEN_ADDRESS,
      ["event Transfer(address indexed from, address indexed to, uint256 value)"],
      provider
    );
    
    // Load staking contract
    if (!process.env.SOLO_METHOD_ENGINE_ADDRESS) {
      throw new Error("SOLO_METHOD_ENGINE_ADDRESS is not set in the environment variables");
    }
    
    const stakingContract = new ethers.Contract(
      process.env.SOLO_METHOD_ENGINE_ADDRESS,
      [
        "event Deposit(address indexed user, uint256 amount)",
        "function getTotalStaked(address user) view returns (uint256)"
      ],
      provider
    );
    
    return { provider, wallet, token, stakingContract };
  } catch (error) {
    log(`Error during connection: ${error.message}`);
    throw error;
  }
}

// Listen for staking events
async function monitorStakingEvents(stakingContract) {
  log('Starting to monitor staking events...');
  
  // Listen for new deposits
  stakingContract.on("Deposit", async (user, amount, event) => {
    const formattedAmount = ethers.utils.formatEther(amount);
    log(`New stake detected: ${formattedAmount} SWF from ${user}`);
    
    // Update our accumulator
    STATE.totalStakedSinceLastDistribution = STATE.totalStakedSinceLastDistribution.add(amount);
    saveState();
    
    log(`Total staked since last distribution: ${ethers.utils.formatEther(STATE.totalStakedSinceLastDistribution)} SWF`);
    
    // Check if we've reached the threshold and cooldown has passed
    checkAndTriggerDistribution();
  });
}

// Check if we should trigger a distribution
function checkAndTriggerDistribution() {
  const now = Date.now();
  const thresholdReached = STATE.totalStakedSinceLastDistribution.gte(
    ethers.utils.parseEther(CONFIG.STAKING_THRESHOLD.toString())
  );
  const cooldownPassed = (now - STATE.lastDistributionTimestamp) > CONFIG.DISTRIBUTION_COOLDOWN;
  
  log(`Checking distribution conditions:`);
  log(`- Threshold reached: ${thresholdReached} (${ethers.utils.formatEther(STATE.totalStakedSinceLastDistribution)}/${CONFIG.STAKING_THRESHOLD} SWF)`);
  log(`- Cooldown passed: ${cooldownPassed} (${Math.floor((now - STATE.lastDistributionTimestamp) / (1000 * 60 * 60))} hours since last distribution)`);
  
  if (thresholdReached && cooldownPassed) {
    triggerDistribution();
  }
}

// Execute the distribution
function triggerDistribution() {
  log('Distribution threshold reached! Triggering distribution...');
  
  const distributionCommand = `cd ${path.resolve(__dirname, '..')} && npx hardhat run scripts/distribute.js --network polygon`;
  
  exec(distributionCommand, (error, stdout, stderr) => {
    if (error) {
      log(`Distribution failed with error: ${error.message}`);
      if (stderr) log(`stderr: ${stderr}`);
      return;
    }
    
    log('Distribution executed successfully:');
    log(stdout);
    
    // Update state
    STATE.lastDistributionTimestamp = Date.now();
    STATE.totalStakedSinceLastDistribution = ethers.BigNumber.from(0);
    saveState();
    
    log(`State reset. Next distribution will be possible after ${new Date(STATE.lastDistributionTimestamp + CONFIG.DISTRIBUTION_COOLDOWN).toISOString()}`);
  });
}

// Save current state
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    lastDistributionTimestamp: STATE.lastDistributionTimestamp,
    totalStakedSinceLastDistribution: STATE.totalStakedSinceLastDistribution.toString()
  }, null, 2));
}

// Periodic check function
function setupPeriodicChecks() {
  log(`Setting up periodic checks every ${CONFIG.CHECK_INTERVAL / (60 * 1000)} minutes`);
  
  setInterval(() => {
    log('Running periodic check...');
    checkAndTriggerDistribution();
  }, CONFIG.CHECK_INTERVAL);
}

// Main function
async function main() {
  try {
    log('Starting Stake-Triggered Distribution monitor...');
    
    const { stakingContract } = await connect();
    
    // Start monitoring staking events
    await monitorStakingEvents(stakingContract);
    
    // Set up periodic checks
    setupPeriodicChecks();
    
    log('Monitor is now running. Keep this process alive to maintain monitoring.');
    log('Press Ctrl+C to stop the monitor.');
    
  } catch (error) {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();