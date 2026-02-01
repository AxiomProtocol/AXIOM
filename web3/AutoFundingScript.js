/**
 * AutoFundingScript.js
 * 
 * Automatically distribute SWF from SWF Bank Wallet to Solo Plan wallets
 * according to their allocation percentages.
 */

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Setup provider and contract
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
const bankWalletPK = process.env.SWF_BANK_PRIVATE_KEY;
const wallet = new ethers.Wallet(bankWalletPK, provider);

// SWF Token ABI (minimal for transfer functionality)
const swfTokenABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const swfTokenContract = new ethers.Contract(swfTokenAddress, swfTokenABI, wallet);

// Total amount to distribute (changed from 87.4M to 5,000 SWF as requested)
const TOTAL_DISTRIBUTION = ethers.utils.parseUnits("5000", 9);

/**
 * Distribute SWF tokens to all Solo Plan wallets
 * based on their allocation percentages
 */
async function distributeSWF() {
  console.log("Starting SWF distribution from Bank Wallet...");
  console.log(`Bank Wallet Address: ${wallet.address}`);
  
  try {
    // Check bank wallet balance
    const bankBalance = await swfTokenContract.balanceOf(wallet.address);
    console.log(`Bank Wallet Balance: ${ethers.utils.formatUnits(bankBalance, 9)} SWF`);
    
    if (bankBalance.lt(TOTAL_DISTRIBUTION)) {
      console.error(`❌ Error: Bank wallet has insufficient funds. Required: ${ethers.utils.formatUnits(TOTAL_DISTRIBUTION, 9)} SWF, Available: ${ethers.utils.formatUnits(bankBalance, 9)} SWF`);
      return;
    }
    
    console.log(`Total to distribute: ${ethers.utils.formatUnits(TOTAL_DISTRIBUTION, 9)} SWF`);
    console.log("---------------------------------------------------");
    
    // Load wallet data from wallets.json
    const walletsPath = path.join(__dirname, '..', 'wallets.json');
    const walletsData = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
    
    // Prepare wallet data with allocations as numbers and staticBalance
    const soloPlanWallets = walletsData.map(wallet => {
      // Convert allocation from string (e.g., "5%") to number (e.g., 5)
      let allocation = 0;
      if (wallet.allocation) {
        if (typeof wallet.allocation === 'string') {
          allocation = parseFloat(wallet.allocation.replace('%', ''));
        } else {
          allocation = parseFloat(wallet.allocation);
        }
      }
      
      return {
        name: wallet.name,
        address: wallet.address,
        allocation: allocation,
        staticBalance: wallet.staticBalance || 0
      };
    });
    
    console.log("Loaded wallet data:", soloPlanWallets);
    
    // Distribute to each wallet
    for (const entry of soloPlanWallets) {
      // Use static balance instead of calculating based on percentage
      // This ensures we use the exact amounts from the Wallets_Funding_Plan.xlsx file
      if (!entry.staticBalance || entry.staticBalance === 0) {
        console.log(`Skipping ${entry.name} (${entry.address}) - No static balance defined`);
        console.log("---------------------------------------------------");
        continue;
      }
      
      // Only distribute a small portion (0.1%) of the static balance for testing
      // This way we don't need to have the full amount in the bank wallet
      const testAmount = entry.staticBalance * 0.001; // 0.1% of the target amount
      const amount = ethers.utils.parseUnits(testAmount.toString(), 9);
      
      console.log(`Sending ${ethers.utils.formatUnits(amount, 9)} SWF to ${entry.name} (${entry.address})`);
      console.log(`(This is 0.1% of the target ${entry.staticBalance.toLocaleString()} SWF)`);
      
      try {
        const tx = await swfTokenContract.transfer(entry.address, amount);
        console.log(`✅ Success: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Transaction confirmed`);
      } catch (err) {
        console.error(`❌ Failed for ${entry.name}:`, err.message);
      }
      
      console.log("---------------------------------------------------");
    }
    
    console.log("Distribution complete!");
    
    // Check remaining balance
    const remainingBalance = await swfTokenContract.balanceOf(wallet.address);
    console.log(`Remaining Bank Wallet Balance: ${ethers.utils.formatUnits(remainingBalance, 9)} SWF`);
    
  } catch (error) {
    console.error("Error during distribution:", error.message);
  }
}

// Execute the distribution if this script is run directly
if (require.main === module) {
  distributeSWF()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Unhandled error:", error);
      process.exit(1);
    });
}

module.exports = { default: distributeSWF };