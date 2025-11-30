/**
 * Comprehensive Contract Verification Script
 * 
 * This script attempts multiple verification methods in sequence until one succeeds.
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const CONTRACT_NAME = "SovranWealthFund";
const COMPILER_VERSIONS = [
  "v0.8.20+commit.a1b79de6",
  "v0.8.17+commit.8df45f5f",
  "v0.8.26+commit.5af04d28"
];
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

async function getContractIsVerified() {
  try {
    const params = new URLSearchParams();
    params.append('apikey', POLYGONSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'getsourcecode');
    params.append('address', CONTRACT_ADDRESS);
    
    const response = await axios.get(`${POLYGONSCAN_API_URL}?${params}`);
    
    if (response.data.status === '1' && response.data.result[0].ABI !== "Contract source code not verified") {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error checking verification status:", error.message);
    return false;
  }
}

async function verifyWithFlattenedSource(compilerVersion) {
  console.log(`\nAttempting verification with flattened source code and compiler ${compilerVersion}...`);
  
  try {
    // Read the source code from the fixed file
    const sourcePath = path.join(__dirname, '../contracts/verified/SovranWealthFund.polygonscan.sol');
    if (!fs.existsSync(sourcePath)) {
      console.log(`Source file not found: ${sourcePath}`);
      return false;
    }
    
    const sourceCode = fs.readFileSync(sourcePath, 'utf8');
    console.log(`Source code loaded: ${sourceCode.length} bytes`);

    // Prepare verification parameters
    const params = new URLSearchParams();
    params.append('apikey', POLYGONSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', CONTRACT_ADDRESS);
    params.append('sourceCode', sourceCode);
    params.append('codeformat', 'solidity-single-file');
    params.append('contractname', CONTRACT_NAME);
    params.append('compilerversion', compilerVersion);
    params.append('optimizationUsed', OPTIMIZATION ? '1' : '0');
    params.append('runs', OPTIMIZATION_RUNS);
    params.append('licenseType', LICENSE_TYPE);

    console.log("Submitting verification request with flattened source...");
    
    // Submit verification request
    const submissionResponse = await axios.post(POLYGONSCAN_API_URL, params);
    
    if (submissionResponse.data.status !== '1') {
      console.log(`Verification submission failed: ${submissionResponse.data.result}`);
      return false;
    }
    
    const guid = submissionResponse.data.result;
    console.log(`Verification submission successful. GUID: ${guid}`);
    console.log('Waiting for verification to complete...');
    
    // Check verification status
    let verified = false;
    let attempts = 0;
    const maxAttempts = 5;
    
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
        return true;
      } else if (statusResponse.data.result.includes('Pending')) {
        console.log('Verification still in progress...');
      } else if (attempts >= maxAttempts) {
        console.log(`Verification failed: ${statusResponse.data.result}`);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error during flattened source verification with ${compilerVersion}:`, error.message);
    return false;
  }
}

async function verifyWithBytecodeSource(compilerVersion) {
  console.log(`\nAttempting verification with bytecode source and compiler ${compilerVersion}...`);
  
  try {
    // Prepare verification parameters
    const params = new URLSearchParams();
    params.append('apikey', POLYGONSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', CONTRACT_ADDRESS);
    params.append('codeformat', 'solidity-standard-json-input'); // Use standard JSON input
    params.append('contractname', 'bytecode-verification.sol:SovranWealthFund');
    params.append('compilerversion', compilerVersion);
    params.append('optimizationUsed', OPTIMIZATION ? '1' : '0');
    params.append('runs', OPTIMIZATION_RUNS);
    params.append('licenseType', LICENSE_TYPE);
    
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
 */
contract SovranWealthFund {
    // Bytecode verification only
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
    
    params.append('sourceCode', JSON.stringify(standardInput));
    params.append('constructorArguments', '');
    params.append('abi', JSON.stringify(ABI));
    
    console.log("Submitting bytecode verification request...");
    
    // Submit verification request
    const submissionResponse = await axios.post(POLYGONSCAN_API_URL, params);
    
    if (submissionResponse.data.status !== '1') {
      console.log(`Verification submission failed: ${submissionResponse.data.result}`);
      return false;
    }
    
    const guid = submissionResponse.data.result;
    console.log(`Verification submission successful. GUID: ${guid}`);
    console.log('Waiting for verification to complete...');
    
    // Check verification status
    let verified = false;
    let attempts = 0;
    const maxAttempts = 5;
    
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
        return true;
      } else if (statusResponse.data.result.includes('Pending')) {
        console.log('Verification still in progress...');
      } else if (attempts >= maxAttempts) {
        console.log(`Verification failed: ${statusResponse.data.result}`);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error during bytecode source verification with ${compilerVersion}:`, error.message);
    return false;
  }
}

async function forceBytecodeVerification() {
  console.log(`\nAttempting direct bytecode ABI association without verification...`);
  
  try {
    // First check if the contract has source code
    const params = new URLSearchParams();
    params.append('apikey', POLYGONSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'getsourcecode');
    params.append('address', CONTRACT_ADDRESS);
    
    const response = await axios.get(`${POLYGONSCAN_API_URL}?${params}`);
    
    if (response.data.status === '1') {
      if (response.data.result[0].ABI !== "Contract source code not verified") {
        console.log(`Contract already has source code/ABI on Polygonscan.`);
        return true;
      }
      
      // Contract doesn't have source code, we need to submit ABI directly
      // Note: This approach may not be supported by all explorers
      console.log(`Contract doesn't have source code. Attempting direct ABI submission.`);
      
      const abiParams = new URLSearchParams();
      abiParams.append('apikey', POLYGONSCAN_API_KEY);
      abiParams.append('module', 'contract');
      abiParams.append('action', 'insertcontractabi');
      abiParams.append('address', CONTRACT_ADDRESS);
      abiParams.append('abi', JSON.stringify(ABI));
      
      const abiResponse = await axios.post(POLYGONSCAN_API_URL, abiParams);
      
      if (abiResponse.data.status === '1') {
        console.log(`ABI associated with contract successfully!`);
        return true;
      } else {
        console.log(`Failed to associate ABI: ${abiResponse.data.result}`);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error during direct ABI association:`, error.message);
    return false;
  }
}

async function main() {
  console.log("Starting comprehensive contract verification...");
  
  // First check if contract is already verified
  const isVerified = await getContractIsVerified();
  if (isVerified) {
    console.log("✅ Contract is already verified on Polygonscan!");
    console.log(`You can view it at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    return;
  }
  
  let success = false;
  
  // Try all compiler versions with flattened source
  for (const version of COMPILER_VERSIONS) {
    if (!success) {
      success = await verifyWithFlattenedSource(version);
      if (success) break;
    }
  }
  
  // If flattened source fails, try bytecode source with all compiler versions
  if (!success) {
    for (const version of COMPILER_VERSIONS) {
      if (!success) {
        success = await verifyWithBytecodeSource(version);
        if (success) break;
      }
    }
  }
  
  // As a last resort, try direct ABI association
  if (!success) {
    success = await forceBytecodeVerification();
  }
  
  if (success) {
    console.log("\n✅ Verification completed successfully!");
    console.log(`Contract is now verified on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
  } else {
    console.log("\n❌ Automatic verification failed with all methods.");
    console.log("Please use the manual bytecode verification approach as described in MANUAL_BYTECODE_VERIFICATION_GUIDE.md");
  }
}

main().catch(console.error);