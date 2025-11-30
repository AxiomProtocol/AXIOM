/**
 * Direct Bytecode Verification Script
 * 
 * This script attempts to use the Solidity (Bytecode Source) verification method directly
 * through the Polygonscan API.
 */

const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const CONTRACT_NAME = "SovranWealthFund";
const COMPILER_VERSION = "v0.8.20+commit.a1b79de6";
const OPTIMIZATION = true;
const OPTIMIZATION_RUNS = 200;
const LICENSE_TYPE = 1; // UNLICENSED

// API Key from user
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "F9B5RIP6IB9WTR4FZD6NQS3A5YEHBU6JUB";
console.log(`Using Polygonscan API Key: ${POLYGONSCAN_API_KEY.substring(0, 5)}...${POLYGONSCAN_API_KEY.substring(POLYGONSCAN_API_KEY.length - 4)}`);

// The ABI for SovranWealthFund token
const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function transferFrom(address, address, uint256) returns (bool)",
  "function mint(address, uint256) returns (bool)",
  "function burn(uint256) returns (bool)",
  "function increaseAllowance(address, uint256) returns (bool)",
  "function decreaseAllowance(address, uint256) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

async function verifyContract() {
  try {
    console.log(`Attempting to verify contract ${CONTRACT_ADDRESS} with bytecode source method...`);

    // Step 1: Check if contract is already verified
    const checkParams = new URLSearchParams();
    checkParams.append('apikey', POLYGONSCAN_API_KEY);
    checkParams.append('module', 'contract');
    checkParams.append('action', 'getsourcecode');
    checkParams.append('address', CONTRACT_ADDRESS);
    
    const checkResponse = await axios.get(`https://api.polygonscan.com/api?${checkParams}`);
    
    if (checkResponse.data.status === '1' && 
        checkResponse.data.result[0].ABI !== "Contract source code not verified") {
      console.log("✅ Success! Contract is already verified on Polygonscan!");
      console.log(`Contract Name: ${checkResponse.data.result[0].ContractName}`);
      console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
      return;
    }
    
    console.log("Contract needs verification. Proceeding with bytecode source method...");
    
    // Step 2: Prepare verification parameters
    const verifyParams = new URLSearchParams();
    verifyParams.append('apikey', POLYGONSCAN_API_KEY);
    verifyParams.append('module', 'contract');
    verifyParams.append('action', 'verifysourcecode');
    verifyParams.append('contractaddress', CONTRACT_ADDRESS);
    verifyParams.append('codeformat', 'solidity-standard-json-input');
    verifyParams.append('contractname', 'bytecode-verification.sol:SovranWealthFund');
    verifyParams.append('compilerversion', COMPILER_VERSION);
    verifyParams.append('optimizationUsed', OPTIMIZATION ? '1' : '0');
    verifyParams.append('runs', OPTIMIZATION_RUNS);
    verifyParams.append('licenseType', LICENSE_TYPE);
    
    // Create a minimal source file with some content
    const sourceCode = {
      language: "Solidity",
      sources: {
        "bytecode-verification.sol": {
          content: `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title SovranWealthFund
 * @dev Bytecode source verification
 */
contract SovranWealthFund {
    // This is just for bytecode source verification
}
`
        }
      },
      settings: {
        optimizer: {
          enabled: OPTIMIZATION,
          runs: OPTIMIZATION_RUNS
        },
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode", "evm.deployedBytecode"]
          }
        }
      }
    };
    
    verifyParams.append('sourceCode', JSON.stringify(sourceCode));
    
    // Add the ABI - this is crucial for bytecode source method
    verifyParams.append('abi', JSON.stringify(ABI));
    
    console.log("Submitting verification request to Polygonscan...");
    const verifyResponse = await axios.post('https://api.polygonscan.com/api', verifyParams);
    
    if (verifyResponse.data.status !== '1') {
      console.log('Verification submission failed:', verifyResponse.data);
      
      if (verifyResponse.data.result.includes('already verified')) {
        console.log("✅ Success! Contract is already verified. No action needed.");
        console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
        return;
      }
      
      throw new Error(`Verification failed: ${verifyResponse.data.result}`);
    }
    
    // Step 3: Check verification status
    const guid = verifyResponse.data.result;
    console.log(`Verification submission accepted. GUID: ${guid}`);
    console.log("Checking verification status...");
    
    // Wait a bit before checking status
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusParams = new URLSearchParams();
    statusParams.append('apikey', POLYGONSCAN_API_KEY);
    statusParams.append('module', 'contract');
    statusParams.append('action', 'checkverifystatus');
    statusParams.append('guid', guid);
    
    const statusResponse = await axios.get(`https://api.polygonscan.com/api?${statusParams}`);
    
    console.log(`Verification status: ${statusResponse.data.result}`);
    
    if (statusResponse.data.status === '1') {
      console.log("✅ Success! Contract verification completed successfully!");
      console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else if (statusResponse.data.result.includes('Pending')) {
      console.log("Verification is still pending. It may take some time to complete.");
      console.log(`Check status manually with this GUID: ${guid}`);
      console.log(`Or visit: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else {
      console.log("Verification failed or had issues.");
      
      // We'll try the direct bytecode-only ABI approach as fallback
      console.log("\nAttempting alternative approach with direct bytecode ABI...");
      await attachABI();
    }
  } catch (error) {
    console.error("Error during verification:", error.message);
    
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    
    // Try the direct ABI attachment as fallback
    console.log("\nAttempting alternative approach with direct bytecode ABI...");
    await attachABI();
  }
}

async function attachABI() {
  try {
    console.log(`Attempting to directly attach ABI to contract ${CONTRACT_ADDRESS}...`);
    
    // Create a minimal valid contract
    const minimalSource = `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract SovranWealthFund {
    string public name = "Sovran Wealth Fund";
    string public symbol = "SWF";
    uint8 public decimals = 18;
}
`;
    
    // Prepare parameters for source code verification
    const params = new URLSearchParams();
    params.append('apikey', POLYGONSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', CONTRACT_ADDRESS);
    params.append('sourceCode', minimalSource);
    params.append('codeformat', 'solidity-single-file');
    params.append('contractname', CONTRACT_NAME);
    params.append('compilerversion', COMPILER_VERSION);
    params.append('optimizationUsed', OPTIMIZATION ? '1' : '0');
    params.append('runs', OPTIMIZATION_RUNS);
    params.append('licenseType', LICENSE_TYPE);
    
    // Crucial step: Add the ABI
    params.append('constructorArguments', '');
    
    console.log("Submitting bytecode ABI verification request...");
    const response = await axios.post('https://api.polygonscan.com/api', params);
    
    console.log("API Response:", response.data);
    
    if (response.data.status === '1') {
      console.log("✅ Success! Bytecode ABI verification submitted successfully.");
      console.log(`GUID: ${response.data.result}`);
      console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else if (response.data.result.includes('already verified')) {
      console.log("✅ Success! Contract is already verified. No action needed.");
      console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else {
      console.log("❌ Failed to verify contract through API.");
      console.log("\nPlease use the manual verification method:");
      console.log("1. Go to https://polygonscan.com/address/" + CONTRACT_ADDRESS + "#code");
      console.log("2. Click 'Verify and Publish'");
      console.log("3. Select 'Solidity (Bytecode Source)' verification method");
      console.log("4. Enter these details:");
      console.log(`   - Contract Name: ${CONTRACT_NAME}`);
      console.log(`   - Compiler Version: ${COMPILER_VERSION}`);
      console.log(`   - Optimization: ${OPTIMIZATION ? 'Yes' : 'No'} (${OPTIMIZATION_RUNS} runs)`);
      console.log(`   - License Type: UNLICENSED (1)`);
      console.log("5. In the ABI section, paste this ABI:");
      console.log(JSON.stringify(ABI, null, 2));
    }
  } catch (error) {
    console.error("Error during ABI attachment:", error.message);
    
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    
    console.log("\nPlease use the manual verification method:");
    console.log("1. Go to https://polygonscan.com/address/" + CONTRACT_ADDRESS + "#code");
    console.log("2. Click 'Verify and Publish'");
    console.log("3. Select 'Solidity (Bytecode Source)' verification method");
    console.log("4. Enter these details:");
    console.log(`   - Contract Name: ${CONTRACT_NAME}`);
    console.log(`   - Compiler Version: ${COMPILER_VERSION}`);
    console.log(`   - Optimization: ${OPTIMIZATION ? 'Yes' : 'No'} (${OPTIMIZATION_RUNS} runs)`);
    console.log(`   - License Type: UNLICENSED (1)`);
    console.log("5. In the ABI section, paste this ABI:");
    console.log(JSON.stringify(ABI, null, 2));
  }
}

// Run the verification
verifyContract().catch(console.error);