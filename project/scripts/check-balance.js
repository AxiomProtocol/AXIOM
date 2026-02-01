require('dotenv').config({ path: __dirname + '/../.env' });
const ethers = require('ethers');
const { getBalance } = require('../index');

/**
 * SWF Token Balance Checker
 * 
 * Simple utility script to check the token balance of any address.
 * Usage: node check-balance.js <address>
 */

async function main() {
  try {
    // Get address from command line or use deployer address
    const address = process.argv[2] || process.env.PRIVATE_KEY ? 
      new ethers.Wallet(process.env.PRIVATE_KEY).address : 
      '0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6'; // Default to contract creator if no address is provided
    
    console.log(`Checking SWF balance for address: ${address}`);
    
    // Initialize connection
    const swf = require('../index');
    await swf.initialize();
    
    // Get balance
    const balance = await swf.getBalance(address);
    console.log(`Balance: ${balance} SWF`);
    
  } catch (error) {
    console.error('Error checking balance:');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;