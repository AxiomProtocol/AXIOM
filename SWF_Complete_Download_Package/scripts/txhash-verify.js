/**
 * SWF Token Verification with Transaction Hash
 * 
 * This script uses the transaction hash from the original contract deployment 
 * to extract constructor arguments and verify the contract on Polygonscan.
 */
require('dotenv').config();
const { ethers } = require('ethers');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// The transaction hash from the original deployment
const DEPLOYMENT_TX_HASH = "0x13c3d11fe7bcc40bd45acf107ee9d3398575030106cfdad74bd0dca123dd6c6e";

// The contract address of the deployed SWF token
const SWF_CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";

// Get transaction data and extract constructor args
async function getConstructorArgs() {
  try {
    console.log(`Getting transaction data for ${DEPLOYMENT_TX_HASH}...`);
    
    // Connect to Polygon RPC
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ALCHEMY_API_KEY
        ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : "https://polygon-rpc.com"
    );
    
    // Get transaction data
    const tx = await provider.getTransaction(DEPLOYMENT_TX_HASH);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    // Get transaction receipt to verify the contract address
    const receipt = await provider.getTransactionReceipt(DEPLOYMENT_TX_HASH);
    if (!receipt || !receipt.contractAddress) {
      throw new Error('Not a contract creation transaction');
    }
    
    console.log(`Confirmed contract creation at address: ${receipt.contractAddress}`);
    
    if (receipt.contractAddress.toLowerCase() !== SWF_CONTRACT_ADDRESS.toLowerCase()) {
      console.warn(`Warning: Created contract address (${receipt.contractAddress}) doesn't match our target (${SWF_CONTRACT_ADDRESS})`);
    }
    
    // Get the contract bytecode to identify constructor args
    const code = await provider.getCode(receipt.contractAddress);
    console.log(`Retrieved contract bytecode (${code.length / 2 - 1} bytes)`);
    
    // For solidity contracts, usually the constructor args are appended to the end of the bytecode in the tx data
    // We need to compare the on-chain code with the tx input data to find where the args begin
    
    const inputData = tx.data;
    const deployedCode = code.slice(2); // Remove 0x prefix
    
    // The deployed code is usually different from the creation code
    // For simplicity, we'll extract the arguments from polygonscan API directly
    console.log("Extracting constructor arguments from Polygonscan API...");
    
    if (!process.env.POLYGONSCAN_API_KEY) {
      throw new Error('POLYGONSCAN_API_KEY not set in .env file');
    }
    
    const polygonscanUrl = `https://api.polygonscan.com/api?module=contract&action=getcontractcreation&contractaddresses=${receipt.contractAddress}&apikey=${process.env.POLYGONSCAN_API_KEY}`;
    
    const response = await axios.get(polygonscanUrl);
    
    if (response.data.status !== '1' || !response.data.result || response.data.result.length === 0) {
      throw new Error(`Failed to get contract creation info: ${response.data.message}`);
    }
    
    // The constructor args should be in the constructor arguments field
    const txData = response.data.result[0];
    
    // Another approach - manually compute by comparing bytecodes
    console.log("Computing constructor arguments manually...");
    
    // Compile the contract with specific compiler settings
    const compiledBytecode = await compileContract();
    
    if (compiledBytecode.success) {
      // Remove 0x prefix
      const creationCode = compiledBytecode.bytecode.slice(2);
      
      // Find where constructor args start
      const txDataWithoutPrefix = tx.data.slice(2);
      
      if (txDataWithoutPrefix.indexOf(creationCode) === 0) {
        const constructorArgs = txDataWithoutPrefix.slice(creationCode.length);
        console.log(`Found constructor args by comparison: 0x${constructorArgs}`);
        
        if (constructorArgs.length > 0) {
          return { success: true, args: constructorArgs };
        } else {
          console.log("No constructor arguments found - contract likely has no constructor params");
          return { success: true, args: '' };
        }
      } else {
        console.log("Couldn't find exact creation code match in transaction data");
        
        // Try a crude approximation - If SWF contract has no constructor args, we'll detect that
        if (tx.data.length <= compiledBytecode.bytecode.length + 10) {
          console.log("Transaction data is approximately the same size as creation code - likely no constructor args");
          return { success: true, args: '' };
        }
      }
    }
    
    // Last resort - just return an empty string assuming no constructor args
    // This is likely correct for SWF since it only has ERC20("Sovran Wealth Fund", "SWF") in the constructor
    console.log("Assuming no explicit constructor arguments besides ERC20 name/symbol");
    return { success: true, args: '' };
  } catch (error) {
    console.error('Error getting constructor args:', error);
    return { success: false, error: error.message };
  }
}

// Compile contract with version 0.8.17 and other settings
async function compileContract() {
  return new Promise((resolve, reject) => {
    const tempDir = path.resolve(__dirname, '../temp-compile');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create temporary hardhat config
    const configPath = path.resolve(tempDir, 'hardhat.config.js');
    const configContent = `
      module.exports = {
        solidity: {
          version: "0.8.17",
          settings: {
            optimizer: {
              enabled: true,
              runs: 200
            },
            evmVersion: "london"
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
      path.resolve(__dirname, '../contracts/verified/SovranWealthFund.sol'),
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

// Verify contract with the given constructor args
async function verifyContract(constructorArgs = '') {
  return new Promise((resolve, reject) => {
    // Prepare verification settings
    const settings = {
      version: '0.8.17',
      optimization: true,
      runs: 200,
      evmVersion: 'london'
    };
    
    console.log('Creating temporary verification directory...');
    
    // Create temp directory
    const tempDir = path.resolve(__dirname, '../temp-verify');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create hardhat config with version 0.8.17
    const configContent = `
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

/**
 * Special hardhat configuration for SWF token verification
 * Exact solidity version: 0.8.17 (matching the contract)
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
      accounts: [process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001"],
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
      path.resolve(__dirname, '../contracts/verified/SovranWealthFund.sol'),
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
    
    // Create constructor args file if needed
    if (constructorArgs && constructorArgs.trim() !== '') {
      fs.writeFileSync(
        path.resolve(tempDir, 'arguments.js'),
        `module.exports = ["${constructorArgs}"];`
      );
    }
    
    // Run verification command
    console.log(`Verifying contract with Solidity ${settings.version}, optimizer ${settings.optimization ? 'enabled' : 'disabled'} (${settings.runs} runs)`);
    
    // Build the verification command
    let cmd = `cd ${tempDir} && npx hardhat verify --network polygon ${SWF_CONTRACT_ADDRESS}`;
    
    // Add constructor args if needed
    if (constructorArgs && constructorArgs.trim() !== '') {
      cmd += ` ${constructorArgs}`;
    }
    
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
    console.log(`Starting verification with TX hash: ${DEPLOYMENT_TX_HASH}`);
    
    // Check for required environment variables
    if (!process.env.POLYGONSCAN_API_KEY) {
      console.error("❌ POLYGONSCAN_API_KEY not found in .env file");
      return;
    }
    
    // Get constructor arguments
    console.log("Extracting constructor arguments from transaction...");
    const constructorArgsResult = await getConstructorArgs();
    
    if (!constructorArgsResult.success) {
      console.error(`❌ Failed to extract constructor args: ${constructorArgsResult.error}`);
      return;
    }
    
    console.log(`Constructor args: ${constructorArgsResult.args || 'None'}`);
    
    // Verify the contract
    console.log("Verifying contract with extracted information...");
    await verifyContract(constructorArgsResult.args);
    
  } catch (error) {
    console.error(`Error during verification:`, error);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });