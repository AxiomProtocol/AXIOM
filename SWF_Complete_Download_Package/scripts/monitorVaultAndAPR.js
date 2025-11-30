// Script to monitor vault deposits and APR changes
require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration
const POLL_INTERVAL = process.env.MONITOR_INTERVAL || 3600000; // Default: 1 hour
const LOG_FILE = path.join(__dirname, "../logs/vault-apr-monitor.log");

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Helper to write to log file
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  fs.appendFileSync(LOG_FILE, logMessage);
  console.log(message);
}

async function checkAndRecord() {
  try {
    // Get the current timestamp
    const timestamp = new Date().toISOString();
    logToFile("=== VAULT & APR MONITOR ===");
    
    // Get contract addresses from .env file
    const vaultAddress = process.env.SWF_BASKET_VAULT_ADDRESS;
    const stakingAddress = process.env.SOLO_METHOD_ENGINE_ADDRESS;
    const aprControllerAddress = process.env.DYNAMIC_APR_CONTROLLER_ADDRESS;
    
    if (!vaultAddress || !stakingAddress || !aprControllerAddress) {
      throw new Error("Missing contract addresses in .env file");
    }
    
    // Connect to the contracts
    const vault = await ethers.getContractAt("SWFBasketVault", vaultAddress);
    const stakingEngine = await ethers.getContractAt("SoloMethodEngine", stakingAddress);
    const aprController = await ethers.getContractAt("DynamicAPRController", aprControllerAddress);
    
    // Get current metrics
    const totalDeposited = await vault.totalDeposited();
    const totalBasketSupply = await vault.totalSupply();
    const totalStaked = await stakingEngine.totalStaked();
    const currentAPR = await stakingEngine.aprBasisPoints();
    const aprInfo = await aprController.getAPRInfo();
    const nextAdjustmentTime = aprInfo[1];
    
    // Record the data
    const metrics = {
      timestamp,
      totalDeposited: ethers.utils.formatEther(totalDeposited),
      totalBasketSupply: ethers.utils.formatEther(totalBasketSupply),
      totalStaked: ethers.utils.formatEther(totalStaked),
      currentAPR: currentAPR.toNumber() / 100,
      nextAdjustmentTime: new Date(nextAdjustmentTime.toNumber() * 1000).toISOString()
    };
    
    // Log the metrics
    logToFile(`Total deposited in vault: ${metrics.totalDeposited} SWF`);
    logToFile(`Total SWF-BASKET supply: ${metrics.totalBasketSupply}`);
    logToFile(`Total tokens staked: ${metrics.totalStaked} SWF`);
    logToFile(`Current APR: ${metrics.currentAPR}%`);
    logToFile(`Next APR adjustment: ${metrics.nextAdjustmentTime}`);
    
    // Save metrics to JSON file
    const metricsFile = path.join(__dirname, "../logs/latest-metrics.json");
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    
    // Check APR thresholds and log recommendations
    if (totalDeposited.gt(ethers.utils.parseEther("90000"))) {
      logToFile("ALERT: Vault deposits approaching high threshold - APR will decrease to minimum soon");
    } else if (totalDeposited.lt(ethers.utils.parseEther("15000"))) {
      logToFile("INFO: Vault deposits near low threshold - APR is near maximum");
    }
    
    logToFile("Monitoring completed successfully");
    
  } catch (error) {
    logToFile(`ERROR: ${error.message}`);
    console.error(error);
  }
}

// Run once immediately
checkAndRecord();

// Then set up interval if running as main script
if (require.main === module) {
  console.log(`Starting monitor with ${POLL_INTERVAL / 1000} second interval`);
  console.log(`Logs will be written to ${LOG_FILE}`);
  
  setInterval(checkAndRecord, POLL_INTERVAL);
  
  // Keep the process running
  process.stdin.resume();
} else {
  // Export for use in other scripts
  module.exports = { checkAndRecord };
}