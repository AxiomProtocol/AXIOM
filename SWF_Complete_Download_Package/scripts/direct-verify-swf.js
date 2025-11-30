/**
 * Direct SWF Token Verification Script
 * 
 * This script attempts to verify the SWF token with multiple compiler settings
 * to find the right combination that matches the deployed bytecode.
 */
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');

// The contract address of the deployed SWF token
const SWF_CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";

// Constructor arguments from the deployment (if any)
// If there are no constructor args, leave as empty string
const CONSTRUCTOR_ARGS = "";

// Contract name as defined in the source file
const CONTRACT_NAME = "SovranWealthFund";

// Path to the main contract file
const CONTRACT_PATH = "contracts/verified/SovranWealthFund.sol";

// Settings to try (these cover most common combinations)
const settings = [
  // Try with different compiler versions
  { version: "0.8.17", optimization: true, runs: 200, evmVersion: "london" },
  { version: "0.8.17", optimization: false, runs: 0, evmVersion: "london" },
  { version: "0.8.16", optimization: true, runs: 200, evmVersion: "london" },
  { version: "0.8.18", optimization: true, runs: 200, evmVersion: "london" },
  
  // Try different optimizer settings
  { version: "0.8.17", optimization: true, runs: 1000, evmVersion: "london" },
  { version: "0.8.17", optimization: true, runs: 100, evmVersion: "london" },
  
  // Try different EVM versions
  { version: "0.8.17", optimization: true, runs: 200, evmVersion: "paris" },
  { version: "0.8.17", optimization: true, runs: 200, evmVersion: "berlin" },
];

// Create a temporary hardhat config file with the specific settings
function createTempHardhatConfig(setting) {
  const configContent = `
module.exports = {
  solidity: {
    version: "${setting.version}",
    settings: {
      optimizer: {
        enabled: ${setting.optimization},
        runs: ${setting.runs}
      },
      evmVersion: "${setting.evmVersion}"
    }
  },
  networks: {
    polygon: {
      url: process.env.ALCHEMY_API_KEY 
        ? "https://polygon-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY
        : "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY
    }
  }
};`;

  fs.writeFileSync("hardhat.config.temp.js", configContent);
  return "hardhat.config.temp.js";
}

// Attempt verification with a specific setting
async function attemptVerification(setting) {
  console.log(`\n\n==== Attempting verification with settings: ====`);
  console.log(`Compiler version: ${setting.version}`);
  console.log(`Optimization: ${setting.optimization ? 'Enabled' : 'Disabled'}`);
  console.log(`Runs: ${setting.runs}`);
  console.log(`EVM version: ${setting.evmVersion}`);
  
  const configPath = createTempHardhatConfig(setting);
  
  try {
    // Build the verification command
    let command = `npx hardhat verify --config ${configPath} --network polygon ${SWF_CONTRACT_ADDRESS}`;
    
    // Add constructor args if needed
    if (CONSTRUCTOR_ARGS && CONSTRUCTOR_ARGS.trim() !== "") {
      command += ` ${CONSTRUCTOR_ARGS}`;
    }
    
    // Run the verification command
    console.log(`Running command: ${command}`);
    const output = execSync(command, { encoding: 'utf8' });
    console.log(`✅ VERIFICATION SUCCEEDED with settings:`);
    console.log(setting);
    console.log(output);
    
    // Save the successful settings for future use
    fs.writeFileSync('successful-verify-settings.json', JSON.stringify(setting, null, 2));
    
    return true;
  } catch (error) {
    console.log(`❌ Verification failed with these settings:`);
    console.log(`Error: ${error.message}`);
    return false;
  }
}

// Main function to try all settings
async function main() {
  console.log(`Starting verification attempts for SWF token (${SWF_CONTRACT_ADDRESS})`);
  
  // Check for API key
  if (!process.env.POLYGONSCAN_API_KEY) {
    console.error("ERROR: POLYGONSCAN_API_KEY not set in .env file");
    process.exit(1);
  }
  
  let success = false;
  
  for (const setting of settings) {
    try {
      const result = await attemptVerification(setting);
      if (result) {
        success = true;
        console.log("\n✅ Found working verification settings!");
        break;
      }
    } catch (error) {
      console.error(`Error during verification attempt:`, error);
    }
  }
  
  if (!success) {
    console.log("\n❌ All verification attempts failed. Try the following:");
    console.log("1. Check that the contract source code matches the deployed contract exactly");
    console.log("2. Verify the constructor arguments are correct");
    console.log("3. Try manual verification through Polygonscan UI with the source code");
  }
  
  // Clean up temp file
  try {
    fs.unlinkSync("hardhat.config.temp.js");
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });