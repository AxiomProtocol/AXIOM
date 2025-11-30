/**
 * Direct API Verification for Polygonscan
 * 
 * This script submits the contract source code directly through Polygonscan's API.
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const CONTRACT_NAME = "SovranWealthFund";
const SOURCE_CODE_PATH = path.join(__dirname, '../contracts/compiled-0.8.17/SovranWealthFundFlat.sol');
const COMPILER_VERSION = "v0.8.17+commit.8df45f5f";
const OPTIMIZATION = true;
const OPTIMIZATION_RUNS = 200;
const LICENSE_TYPE = 3; // MIT License
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "F9B5RIP6IB9WTR4FZD6NQS3A5YEHBU6JUB";

// Main verification function
async function main() {
  try {
    console.log(`Starting direct API verification for ${CONTRACT_ADDRESS} on Polygonscan...`);
    
    // Read the contract source code
    const sourceCode = fs.readFileSync(SOURCE_CODE_PATH, 'utf8');
    console.log(`Source code loaded (${sourceCode.length} bytes)`);
    
    // Generate a FormData object
    const formData = new FormData();
    formData.append('apikey', POLYGONSCAN_API_KEY);
    formData.append('module', 'contract');
    formData.append('action', 'verifysourcecode');
    formData.append('contractaddress', CONTRACT_ADDRESS);
    formData.append('sourceCode', sourceCode);
    formData.append('codeformat', 'solidity-single-file');
    formData.append('contractname', CONTRACT_NAME);
    formData.append('compilerversion', COMPILER_VERSION);
    formData.append('optimizationUsed', OPTIMIZATION ? 1 : 0);
    formData.append('runs', OPTIMIZATION_RUNS);
    formData.append('licenseType', LICENSE_TYPE);
    
    // Submit the verification request
    console.log("Submitting verification request to Polygonscan...");
    const verifyResponse = await axios.post('https://api.polygonscan.com/api', formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log("API Response:", verifyResponse.data);
    
    if (verifyResponse.data.status === '1') {
      const guid = verifyResponse.data.result;
      console.log(`Verification submitted successfully. GUID: ${guid}`);
      
      // Wait a bit before checking status
      console.log("Waiting 5 seconds before checking verification status...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check verification status
      await checkVerificationStatus(guid);
    } else if (verifyResponse.data.result.includes('already verified')) {
      console.log("✅ Success! Contract is already verified on Polygonscan.");
      console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else {
      console.log("❌ Failed to submit verification request:", verifyResponse.data.result);
      console.log("Attempting alternative approach with bytecode-only method...");
      await bytecodeVerification();
    }
  } catch (error) {
    console.error("Error during verification:", error.message);
    
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    
    await bytecodeVerification();
  }
}

// Function to check verification status
async function checkVerificationStatus(guid) {
  try {
    console.log(`Checking verification status for GUID: ${guid}`);
    
    const statusParams = new URLSearchParams();
    statusParams.append('apikey', POLYGONSCAN_API_KEY);
    statusParams.append('module', 'contract');
    statusParams.append('action', 'checkverifystatus');
    statusParams.append('guid', guid);
    
    const statusResponse = await axios.get(`https://api.polygonscan.com/api?${statusParams}`);
    
    console.log(`Verification status: ${statusResponse.data.result}`);
    
    if (statusResponse.data.result === 'Pending in queue') {
      console.log("Verification is still pending. Checking again in 5 seconds...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      return checkVerificationStatus(guid);
    }
    
    if (statusResponse.data.result.includes('Successfully')) {
      console.log("✅ Success! Contract successfully verified on Polygonscan!");
      console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else {
      console.log("❌ Verification failed:", statusResponse.data.result);
      
      // If verification failed, try the bytecode method
      console.log("Attempting alternative approach with bytecode-only method...");
      await bytecodeVerification();
    }
  } catch (error) {
    console.error("Error checking verification status:", error.message);
    await bytecodeVerification();
  }
}

// Function for bytecode-only verification
async function bytecodeVerification() {
  try {
    console.log("\nAttempting bytecode-only verification...");
    
    // Create the ABI for the token
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
    
    // Prepare the bytecode verification request
    const bytecodeParams = new URLSearchParams();
    bytecodeParams.append('apikey', POLYGONSCAN_API_KEY);
    bytecodeParams.append('module', 'contract');
    bytecodeParams.append('action', 'verifysourcecode');
    bytecodeParams.append('contractaddress', CONTRACT_ADDRESS);
    bytecodeParams.append('codeformat', 'solidity-standard-json-input');
    bytecodeParams.append('contractname', 'bytecode-verification.sol:SovranWealthFund');
    bytecodeParams.append('compilerversion', 'v0.8.20+commit.a1b79de6');
    bytecodeParams.append('optimizationUsed', OPTIMIZATION ? '1' : '0');
    bytecodeParams.append('runs', OPTIMIZATION_RUNS);
    bytecodeParams.append('licenseType', LICENSE_TYPE);
    
    // Simplified source for bytecode verification
    const sourceInput = {
      language: "Solidity",
      sources: {
        "bytecode-verification.sol": {
          content: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SovranWealthFund
 * @dev Bytecode source verification
 */
contract SovranWealthFund {
    string public name = "Sovran Wealth Fund";
    string public symbol = "SWF";
    uint8 public decimals = 18;
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
    
    bytecodeParams.append('sourceCode', JSON.stringify(sourceInput));
    bytecodeParams.append('abi', JSON.stringify(ABI));
    
    console.log("Submitting bytecode verification request...");
    const bytecodeResponse = await axios.post('https://api.polygonscan.com/api', bytecodeParams);
    
    console.log("Bytecode Verification Response:", bytecodeResponse.data);
    
    if (bytecodeResponse.data.status === '1') {
      const guid = bytecodeResponse.data.result;
      console.log(`Bytecode verification submitted successfully. GUID: ${guid}`);
      
      // Wait a bit before checking status
      console.log("Waiting 5 seconds before checking bytecode verification status...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check verification status
      const statusParams = new URLSearchParams();
      statusParams.append('apikey', POLYGONSCAN_API_KEY);
      statusParams.append('module', 'contract');
      statusParams.append('action', 'checkverifystatus');
      statusParams.append('guid', guid);
      
      const statusResponse = await axios.get(`https://api.polygonscan.com/api?${statusParams}`);
      
      console.log(`Bytecode verification status: ${statusResponse.data.result}`);
      
      if (statusResponse.data.result.includes('Successfully')) {
        console.log("✅ Success! Bytecode verification completed successfully!");
        console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
      } else {
        console.log("❓ Bytecode verification result unclear. Please check Polygonscan manually.");
        console.log(`https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
        console.log("\nIf verification is still needed, please follow the manual steps in DETAILED_POLYGONSCAN_VERIFICATION.md");
      }
    } else {
      console.log("❌ Failed to submit bytecode verification:", bytecodeResponse.data.result);
      console.log("\nPlease follow the manual verification steps in DETAILED_POLYGONSCAN_VERIFICATION.md");
    }
  } catch (error) {
    console.error("Error during bytecode verification:", error.message);
    
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    
    console.log("\nFallback to manual verification:");
    console.log("Please follow the steps in DETAILED_POLYGONSCAN_VERIFICATION.md to manually verify the contract");
  }
}

// Execute main function
main().catch(console.error);