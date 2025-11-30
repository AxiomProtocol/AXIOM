/**
 * Exact Bytecode Verification for SWF Token
 * 
 * This script compares our compiled bytecode with the exact bytecode
 * provided from the chain to identify the precise differences.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { ethers } = require('ethers');

// The address of the deployed SWF token
const SWF_CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";

// The provided bytecode from the chain (exact deployed bytecode)
const PROVIDED_BYTECODE = "0x608060405234801561000f575f80fd5b50600436106100b2575f3560e01c8063715018a61161006f578063715018a6146101a05780638da5cb5b146101aa57806395d89b41146101c8578063a9059cbb146101e6578063dd62ed3e14610216578063f2fde38b14610246576100b2565b806306fdde03146100b6578063095ea7b3146100d457806318160ddd1461010457806323b872dd14610122578063313ce5671461015257806370a0823114610170575b5f80fd5b6100be610262565b6040516100cb9190610cc9565b60405180910390f35b6100ee60048036038101906100e99190610d7a565b6102f2565b60405"; // truncated for brevity

// Path to the contract source
const CONTRACT_PATH = path.resolve(__dirname, '../contracts/verified/SovranWealthFund.sol');

// Compile contract with specific settings
async function compileContract(settings) {
  return new Promise((resolve, reject) => {
    console.log(`Compiling with settings:`, settings);
    
    const tempDir = path.resolve(__dirname, '../temp-compile');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create temporary hardhat config
    const configPath = path.resolve(tempDir, 'hardhat.config.js');
    const configContent = `
      module.exports = {
        solidity: {
          version: "${settings.version}",
          settings: {
            optimizer: {
              enabled: ${settings.optimization},
              runs: ${settings.runs}
            },
            evmVersion: "${settings.evmVersion}"
          }
        }
      };
    `;
    fs.writeFileSync(configPath, configContent);
    
    // Create contract directory
    const contractsDir = path.resolve(tempDir, 'contracts');
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }
    
    // Copy contract source
    fs.copyFileSync(
      CONTRACT_PATH,
      path.resolve(contractsDir, 'SovranWealthFund.sol')
    );
    
    // Copy interfaces
    const interfacesDir = path.resolve(contractsDir, 'interfaces');
    if (!fs.existsSync(interfacesDir)) {
      fs.mkdirSync(interfacesDir, { recursive: true });
    }
    
    const interfaceFiles = [
      'IAggregatorV3Interface.sol',
      'IPegManagement.sol',
      'ISovranWealthFund.sol'
    ];
    
    for (const file of interfaceFiles) {
      fs.copyFileSync(
        path.resolve(__dirname, `../contracts/verified/interfaces/${file}`),
        path.resolve(interfacesDir, file)
      );
    }
    
    // Run hardhat compile
    const cmd = `cd ${tempDir} && npx hardhat compile`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Compilation error: ${error.message}`);
        return reject(error);
      }
      
      // Try to read the compiled artifact
      try {
        const artifactPath = path.resolve(
          tempDir, 
          'artifacts/contracts/SovranWealthFund.sol',
          'SovranWealthFund.json'
        );
        
        if (!fs.existsSync(artifactPath)) {
          return reject(new Error('Compiled artifact not found'));
        }
        
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        resolve({
          success: true,
          bytecode: artifact.bytecode,
          deployedBytecode: artifact.deployedBytecode
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Compare compiled bytecode with provided bytecode
function compareBytecodes(compiledBytecode, providedBytecode) {
  console.log(`Comparing bytecodes...`);
  
  const compiled = compiledBytecode.startsWith('0x') ? compiledBytecode : `0x${compiledBytecode}`;
  const provided = providedBytecode.startsWith('0x') ? providedBytecode : `0x${providedBytecode}`;
  
  const compiledSize = (compiled.length - 2) / 2; // -2 for '0x' prefix, /2 because 2 hex chars = 1 byte
  const providedSize = (provided.length - 2) / 2;
  
  console.log(`Compiled bytecode size: ${compiledSize} bytes`);
  console.log(`Provided bytecode size: ${providedSize} bytes`);
  
  if (compiled === provided) {
    console.log(`✅ EXACT MATCH! Bytecodes are identical.`);
    return {
      match: true,
      differences: 0,
      matchPercentage: 100
    };
  }
  
  // Count the number of matching bytes at the beginning
  let matchingPrefix = 0;
  const minLength = Math.min(compiled.length, provided.length);
  
  for (let i = 2; i < minLength; i += 2) { // Start after '0x'
    if (compiled.substring(i, i + 2) === provided.substring(i, i + 2)) {
      matchingPrefix++;
    } else {
      break;
    }
  }
  
  // Compute the percentage of matching bytes
  const totalBytes = Math.max(compiledSize, providedSize);
  const matchPercentage = (matchingPrefix / totalBytes) * 100;
  
  console.log(`First difference at byte: ${matchingPrefix}`);
  console.log(`Matching prefix percentage: ${matchPercentage.toFixed(2)}%`);
  
  // Show the exact difference
  if (matchingPrefix < totalBytes) {
    const start = Math.max(0, (matchingPrefix * 2) - 10);
    const compiledSnippet = compiled.substring(start, (matchingPrefix * 2) + 20);
    const providedSnippet = provided.substring(start, (matchingPrefix * 2) + 20);
    
    console.log(`Bytecode difference at offset ${matchingPrefix * 2}:`);
    console.log(`Compiled: ${compiledSnippet}`);
    console.log(`Provided: ${providedSnippet}`);
    console.log(`             ${''.padEnd(matchingPrefix * 2 - start, ' ')}^--- First difference here`);
  }
  
  return {
    match: false,
    matchingBytes: matchingPrefix,
    totalBytes,
    matchPercentage
  };
}

// Fetch actual on-chain bytecode
async function getOnChainBytecode() {
  try {
    console.log(`Fetching on-chain bytecode for ${SWF_CONTRACT_ADDRESS}...`);
    
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ALCHEMY_API_KEY
        ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : "https://polygon-rpc.com"
    );
    
    const bytecode = await provider.getCode(SWF_CONTRACT_ADDRESS);
    const size = (bytecode.length - 2) / 2; // -2 for '0x' prefix, /2 because 2 hex chars = 1 byte
    
    console.log(`Fetched on-chain bytecode (${size} bytes)`);
    
    return { bytecode, size };
  } catch (error) {
    console.error('Error fetching bytecode:', error);
    return { error: error.message };
  }
}

// Try different compiler settings to find the best match
async function findBestCompilerSettings() {
  // Compiler settings to try
  const settingsToTry = [
    // Try Solidity 0.8.17 with different optimization settings
    { version: "0.8.17", optimization: true, runs: 200, evmVersion: "london" },
    { version: "0.8.17", optimization: false, runs: 0, evmVersion: "london" },
    { version: "0.8.17", optimization: true, runs: 1000, evmVersion: "london" },
    { version: "0.8.17", optimization: true, runs: 200, evmVersion: "paris" },
    
    // Try Solidity 0.8.16 and 0.8.18
    { version: "0.8.16", optimization: true, runs: 200, evmVersion: "london" },
    { version: "0.8.18", optimization: true, runs: 200, evmVersion: "london" },
  ];
  
  const results = [];
  
  // Fetch on-chain bytecode for comparison
  const onChainResult = await getOnChainBytecode();
  const onChainBytecode = onChainResult.bytecode;
  
  // Truncate PROVIDED_BYTECODE if it's just a prefix
  const actualProvided = PROVIDED_BYTECODE.length < 100 
    ? onChainBytecode 
    : PROVIDED_BYTECODE;
  
  console.log(`Using actual bytecode with size: ${(actualProvided.length - 2) / 2} bytes`);
  
  // Try each compiler setting
  for (const settings of settingsToTry) {
    try {
      console.log(`\nTrying compiler settings: Solidity ${settings.version}, optimizer ${settings.optimization ? 'enabled' : 'disabled'} (${settings.runs} runs), EVM ${settings.evmVersion}`);
      
      const compiled = await compileContract(settings);
      if (!compiled.success) {
        console.log(`❌ Compilation failed with these settings`);
        continue;
      }
      
      // Compare the bytecodes
      const comparison = compareBytecodes(compiled.deployedBytecode, actualProvided);
      
      // Save results
      results.push({
        settings,
        compiled,
        comparison,
        matchPercentage: comparison.matchPercentage
      });
      
      // If we found an exact match, we're done
      if (comparison.match) {
        console.log(`\n✅ Found exact bytecode match with settings: Solidity ${settings.version}, optimizer ${settings.optimization ? 'enabled' : 'disabled'} (${settings.runs} runs), EVM ${settings.evmVersion}`);
        return { success: true, settings, exactMatch: true };
      }
    } catch (error) {
      console.error(`Error with settings ${settings.version}:`, error);
    }
  }
  
  // Sort results by match percentage
  results.sort((a, b) => b.matchPercentage - a.matchPercentage);
  
  // Return the best match
  const bestMatch = results[0];
  
  if (bestMatch && bestMatch.matchPercentage > 90) {
    console.log(`\n✅ Found close match (${bestMatch.matchPercentage.toFixed(2)}%) with settings: Solidity ${bestMatch.settings.version}, optimizer ${bestMatch.settings.optimization ? 'enabled' : 'disabled'} (${bestMatch.settings.runs} runs), EVM ${bestMatch.settings.evmVersion}`);
    return { success: true, settings: bestMatch.settings, exactMatch: false, matchPercentage: bestMatch.matchPercentage };
  }
  
  console.log(`\n❌ No good match found. Best match was ${bestMatch?.matchPercentage.toFixed(2)}% with Solidity ${bestMatch?.settings.version}`);
  return { success: false, results };
}

// Verify contract on Polygonscan
async function verifyContract(settings) {
  return new Promise((resolve, reject) => {
    const tempDir = path.resolve(__dirname, '../temp-verify');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create hardhat config with the best settings
    const configContent = `
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

/**
 * Special hardhat configuration for SWF token verification
 * Exact solidity version: ${settings.version} (found by bytecode matching)
 */
module.exports = {
  solidity: {
    version: "${settings.version}",
    settings: {
      optimizer: {
        enabled: ${settings.optimization},
        runs: ${settings.runs}
      },
      evmVersion: "${settings.evmVersion}"
    }
  },
  defaultNetwork: "polygon",
  networks: {
    polygon: {
      url: process.env.ALCHEMY_API_KEY 
        ? \`https://polygon-mainnet.g.alchemy.com/v2/\${process.env.ALCHEMY_API_KEY}\`
        : "https://polygon-rpc.com",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 137
    }
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY
    }
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts"
  }
};
    `;
    
    fs.writeFileSync(path.resolve(tempDir, 'hardhat.config.js'), configContent);
    
    // Copy contract files
    const contractsDir = path.resolve(tempDir, 'contracts');
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }
    
    // Copy contract
    fs.copyFileSync(
      CONTRACT_PATH,
      path.resolve(contractsDir, 'SovranWealthFund.sol')
    );
    
    // Copy interfaces
    const interfacesDir = path.resolve(contractsDir, 'interfaces');
    if (!fs.existsSync(interfacesDir)) {
      fs.mkdirSync(interfacesDir, { recursive: true });
    }
    
    const interfaceFiles = [
      'IAggregatorV3Interface.sol',
      'IPegManagement.sol',
      'ISovranWealthFund.sol'
    ];
    
    for (const file of interfaceFiles) {
      fs.copyFileSync(
        path.resolve(__dirname, `../contracts/verified/interfaces/${file}`),
        path.resolve(interfacesDir, file)
      );
    }
    
    // Run verification command
    console.log(`\nVerifying contract with the best match settings: Solidity ${settings.version}, optimizer ${settings.optimization ? 'enabled' : 'disabled'} (${settings.runs} runs), EVM ${settings.evmVersion}`);
    
    const cmd = `cd ${tempDir} && npx hardhat verify --network polygon ${SWF_CONTRACT_ADDRESS}`;
    
    console.log(`Running: ${cmd}`);
    
    exec(cmd, (error, stdout, stderr) => {
      console.log(stdout);
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      if (error) {
        console.error(`Verification error: ${error.message}`);
        return reject(error);
      }
      
      if (stdout.includes("Successfully verified") || stdout.includes("Already Verified")) {
        console.log("✅ Contract verified successfully!");
        resolve(true);
      } else {
        console.log("❌ Verification failed");
        resolve(false);
      }
    });
  });
}

// Main function
async function main() {
  try {
    console.log("SWF Token Exact Bytecode Verification");
    console.log("-------------------------------------");
    
    // Check for required environment variables
    if (!process.env.POLYGONSCAN_API_KEY) {
      console.error("❌ POLYGONSCAN_API_KEY not found in .env file");
      return;
    }
    
    // Find the best compiler settings based on bytecode comparison
    console.log("Finding best compiler settings based on bytecode comparison...");
    const result = await findBestCompilerSettings();
    
    if (result.success) {
      // Use the found settings to verify the contract
      console.log("\nUsing these settings to verify the contract on Polygonscan...");
      await verifyContract(result.settings);
    } else {
      console.log("\n❌ Unable to find good compiler settings match. Please try manual verification.");
    }
    
  } catch (error) {
    console.error(`Error during bytecode verification:`, error);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });