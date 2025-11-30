require('dotenv').config();
const { initialize, getBalance, transfer } = require('./scripts/connectSWF');

/**
 * Sovran Wealth Fund (SWF) Main Application
 * 
 * This is the main entry point for the SWF token interaction library.
 * It provides access to token functionality through a simple interface.
 */

// Initialize the connection to the SWF contract
let contract;

async function init() {
  try {
    console.log('Initializing SovranWealthFund interface...');
    contract = await initialize();
    return contract;
  } catch (error) {
    console.error('Failed to initialize SWF interface:');
    console.error(error);
    throw error;
  }
}

// Export the API functions
module.exports = {
  // Initialize the connection
  initialize: init,
  
  // Get token balance for an address
  getBalance,
  
  // Transfer tokens from the connected wallet to another address
  transfer,
  
  // Check if interface is initialized
  isInitialized: () => !!contract
};

// If this script is run directly, initialize the connection
if (require.main === module) {
  init()
    .then(() => {
      console.log('SWF interface initialized successfully.');
    })
    .catch(error => {
      console.error('Initialization failed:');
      console.error(error);
      process.exit(1);
    });
}