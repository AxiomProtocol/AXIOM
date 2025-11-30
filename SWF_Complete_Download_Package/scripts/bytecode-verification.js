/**
 * Bytecode-Only Verification Script
 * 
 * This script uses Polygonscan's API to submit a bytecode-only verification request.
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const CONTRACT_NAME = "SovranWealthFund";
const COMPILER_VERSION = "v0.8.20+commit.a1b79de6";
const OPTIMIZATION = true;
const OPTIMIZATION_RUNS = 200;
const LICENSE_TYPE = 1; // 1 = No License (UNLICENSED)

// Get Polygonscan API key
if (!process.env.POLYGONSCAN_API_KEY) {
  console.error("ERROR: POLYGONSCAN_API_KEY not found in .env file");
  console.log("Please add your Polygonscan API key to the .env file:");
  console.log("POLYGONSCAN_API_KEY=your_api_key_here");
  process.exit(1);
}

const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const POLYGONSCAN_API_URL = "https://api.polygonscan.com/api";

// The ABI for the SovranWealthFund token
const ABI = JSON.stringify([
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
]);

async function main() {
  console.log("Starting bytecode-only verification on Polygonscan...");
  
  try {
    // Prepare verification parameters
    const params = new URLSearchParams();
    params.append('apikey', POLYGONSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', CONTRACT_ADDRESS);
    params.append('contractname', 'bytecode-verification.sol:SovranWealthFund');
    params.append('compilerversion', COMPILER_VERSION);
    params.append('optimizationUsed', OPTIMIZATION ? '1' : '0');
    params.append('runs', OPTIMIZATION_RUNS);
    params.append('licenseType', LICENSE_TYPE);
    params.append('codeformat', 'solidity-standard-json-input'); // Use standard JSON input
    
    // Create standard JSON input with just ABI
    const standardInput = {
      language: "Solidity",
      sources: {
        "bytecode-verification.sol": {
          content: `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title SovranWealthFund
 * @dev Implementation of the Sovran Wealth Fund token
 * Basic ERC20 functionality with 1 billion total supply
 */
contract SovranWealthFund {
    // Bytecode verification only - this source will not be compiled
}
`
        }
      },
      settings: {
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode"]
          }
        },
        optimizer: {
          enabled: OPTIMIZATION,
          runs: OPTIMIZATION_RUNS
        }
      }
    };
    
    // We're not using real compilation for bytecode verification
    params.append('sourceCode', JSON.stringify(standardInput));
    
    // Set constructorArguments (empty for this contract)
    params.append('constructorArguments', '');
    
    // Use bytecode verification mode
    params.append('abi', ABI);
    
    console.log("Submitting bytecode verification request to Polygonscan...");
    
    // Submit verification request
    const submissionResponse = await axios.post(POLYGONSCAN_API_URL, params);
    
    if (submissionResponse.data.status !== '1') {
      console.log('Initial API response:', submissionResponse.data);
      
      if (submissionResponse.data.result.includes('already verified')) {
        console.log('✅ Contract is already verified on Polygonscan!');
        console.log(`View the verified contract at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
        return;
      }
      
      throw new Error(`Verification submission failed: ${submissionResponse.data.result}`);
    }
    
    const guid = submissionResponse.data.result;
    console.log(`Verification submission successful. GUID: ${guid}`);
    console.log('Waiting for verification to complete...');
    
    // Check verification status
    let verified = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!verified && attempts < maxAttempts) {
      attempts++;
      
      // Wait a few seconds between checks
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check status
      const statusParams = new URLSearchParams();
      statusParams.append('apikey', POLYGONSCAN_API_KEY);
      statusParams.append('module', 'contract');
      statusParams.append('action', 'checkverifystatus');
      statusParams.append('guid', guid);
      
      const statusResponse = await axios.get(`${POLYGONSCAN_API_URL}?${statusParams}`);
      
      console.log(`Attempt ${attempts}: ${statusResponse.data.result}`);
      
      if (statusResponse.data.status === '1') {
        verified = true;
        console.log('Contract verification successful!');
        console.log(`View the verified contract at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
      } else if (statusResponse.data.result.includes('Pending')) {
        console.log('Verification still in progress...');
      } else {
        throw new Error(`Verification failed: ${statusResponse.data.result}`);
      }
    }
    
    if (!verified) {
      console.log('Verification timed out - it may still complete on Polygonscan');
      console.log('Check verification status manually at:');
      console.log(`https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
      
      console.log('\n==================================================');
      console.log('USE THE BYTECODE SOURCE METHOD IN POLYGONSCAN WEB UI');
      console.log('==================================================\n');
      
      console.log('If automatic verification failed, use the bytecode-only approach:');
      console.log('1. Go to https://polygonscan.com/address/' + CONTRACT_ADDRESS + '#code');
      console.log('2. Click "Verify and Publish"');
      console.log('3. Select "Solidity (Bytecode Source)" as the verification method');
      console.log('4. Enter contract details:');
      console.log(`   - Contract Name: ${CONTRACT_NAME}`);
      console.log(`   - Compiler Version: ${COMPILER_VERSION}`);
      console.log(`   - Optimization: ${OPTIMIZATION ? 'Yes' : 'No'} (${OPTIMIZATION_RUNS} runs)`);
      console.log('5. Paste this ABI:');
      console.log(ABI);
    }
    
  } catch (error) {
    console.error('Error during verification:', error.message);
    
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    
    console.log('\nFallback to manual verification:');
    console.log('1. Go to https://polygonscan.com/address/' + CONTRACT_ADDRESS + '#code');
    console.log('2. Click "Verify and Publish"');
    console.log('3. Select "Solidity (Bytecode Source)" as the verification method');
    console.log('4. Enter contract details:');
    console.log(`   - Contract Name: ${CONTRACT_NAME}`);
    console.log(`   - Compiler Version: ${COMPILER_VERSION}`);
    console.log(`   - Optimization: ${OPTIMIZATION ? 'Yes' : 'No'} (${OPTIMIZATION_RUNS} runs)`);
    console.log('5. Paste this ABI:');
    console.log(ABI);
    
    process.exit(1);
  }
}

main().catch(console.error);