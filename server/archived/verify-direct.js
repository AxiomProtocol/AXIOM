/**
 * Direct Contract Verification Module for OpenZeppelin-based SovranWealthFund
 * 
 * This module directly verifies contracts on Polygonscan using the flattened contract source
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Import the contract artifacts helper
const artifacts = require('./contract-artifacts');

/**
 * Verify a contract directly using its flattened source
 * @param {string} contractAddress - The address of the deployed contract
 * @param {string} contractName - The name of the contract (SovranWealthFund)
 * @param {string} constructorArgs - ABI-encoded constructor arguments (if any)
 * @param {string|boolean} method - Verification method to use
 * @returns {Promise<object>} - Verification result
 */
async function verifyContract(contractAddress, contractName, constructorArgs = '', method = 'direct') {
  try {
    // Check if we have an API key
    if (!process.env.POLYGONSCAN_API_KEY) {
      return { 
        success: false, 
        error: 'Polygonscan API key not found in environment variables' 
      };
    }

    // Get the appropriate contract source based on method
    let sourceCode;
    let codeformat = 'solidity-single-file';
    let contractOutput = contractName;
    
    // Get source code
    if (method === 'direct' || method === true) {
      const sourceResult = artifacts.getContractSource(contractName);
      if (!sourceResult.success) {
        return {
          success: false,
          error: sourceResult.error || 'Failed to retrieve contract source'
        };
      }
      sourceCode = sourceResult.source;
    } else if (method === 'standard-json') {
      // Use the standard JSON input format
      // This is more complex but handles imports better
      const artifact = artifacts.getContractArtifact(contractName);
      if (!artifact.success) {
        return {
          success: false,
          error: artifact.error || 'Contract artifact not found'
        };
      }
      
      // Get compiler settings
      const compiler = artifacts.getCompilerConfig(contractName);
      
      // Build standard JSON input
      const standardInput = {
        language: 'Solidity',
        sources: {
          [artifact.artifact.sourceName]: {
            content: artifacts.getContractSource(contractName).source
          }
        },
        settings: compiler.settings
      };
      
      sourceCode = JSON.stringify(standardInput);
      codeformat = 'solidity-standard-json-input';
      contractOutput = `${artifact.artifact.sourceName}:${contractName}`;
    } else {
      // Default to simplified contract source
      sourceCode = artifacts.getSimplifiedContractSource();
    }
    
    // Get constructor arguments if not provided
    if (!constructorArgs || constructorArgs.trim() === '') {
      const args = artifacts.getConstructorArgs(contractName);
      if (args) {
        constructorArgs = args;
      }
    }
    
    // Get compiler configuration
    const compiler = artifacts.getCompilerConfig(contractName);
    
    // Prepare request to Polygonscan API
    const apiUrl = 'https://api.polygonscan.com/api';
    const params = new URLSearchParams();
    params.append('apikey', process.env.POLYGONSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', contractAddress);
    params.append('sourceCode', sourceCode);
    params.append('codeformat', codeformat);
    params.append('contractname', contractOutput);
    params.append('compilerversion', compiler.version);
    params.append('optimizationUsed', compiler.settings.optimizer.enabled ? '1' : '0');
    params.append('runs', compiler.settings.optimizer.runs.toString());
    params.append('licenseType', '3'); // MIT License
    
    // If we have constructor arguments, use them; otherwise try some common ones for SWF
    if (constructorArgs && constructorArgs.trim() !== '') {
      params.append('constructorArguments', constructorArgs.trim());
    } else if (contractName === 'SovranWealthFund') {
      // Try common constructor arguments for SWF if none provided
      console.log('No constructor arguments provided, trying common arguments for SovranWealthFund...');
      // Common constructor arguments patterns for SWF token
      const possibleArgs = [
        // Empty constructor
        '',
        // Default format (name, symbol, initialSupply, admin)
        '0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000d3c21bcecceda1000000000000000000000000a1e6cf739ca6021afdcf8e13ee45ea5c8a2a2be9000000000000000000000000000000000000000000000000000000000000000d536f7672616e576561746c68000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000035357460000000000000000000000000000000000000000000000000000000000',
        // Alternative format with different supply
        '000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000a1e6cf739ca6021afdcf8e13ee45ea5c8a2a2be9000000000000000000000000000000000000000000000000000000000000000d536f7672616e576561746c68000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000035357460000000000000000000000000000000000000000000000000000000000'
      ];
      
      // Try with empty constructor args first
      params.append('constructorArguments', '');
      console.log('Trying with empty constructor arguments');
    }
    
    // Submit verification request
    console.log(`Submitting verification request for ${contractName} at ${contractAddress}`);
    console.log(`Using ${method} verification method`);
    const response = await axios.post(apiUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (response.data.status === '1') {
      console.log('Verification submitted successfully:', response.data.result);
      return { 
        success: true, 
        message: 'Verification submitted successfully',
        guid: response.data.result,
        status: 'pending'
      };
    } else {
      console.error('Verification submission failed:', response.data);
      return { 
        success: false, 
        error: response.data.result || 'Unknown error',
        details: response.data
      };
    }
  } catch (error) {
    console.error('Error during contract verification:', error);
    return { 
      success: false, 
      error: 'An error occurred during verification',
      details: error.message
    };
  }
}

/**
 * Check the status of a verification request
 * @param {string} guid - The GUID from the verification submission
 * @returns {Promise<object>} - Verification status
 */
async function checkVerificationStatus(guid) {
  try {
    // Check if we have an API key
    if (!process.env.POLYGONSCAN_API_KEY) {
      return { 
        success: false, 
        error: 'Polygonscan API key not found in environment variables' 
      };
    }
    
    // Check verification status
    const apiUrl = 'https://api.polygonscan.com/api';
    const response = await axios.get(apiUrl, {
      params: {
        apikey: process.env.POLYGONSCAN_API_KEY,
        module: 'contract',
        action: 'checkverifystatus',
        guid
      }
    });
    
    console.log('Verification status check response:', response.data);
    
    if (response.data.status === '1') {
      return { 
        success: true, 
        status: 'verified',
        message: response.data.result,
        result: response.data.result
      };
    } else {
      return { 
        success: false, 
        status: 'pending',
        message: response.data.result,
        error: response.data.result
      };
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
    return { 
      success: false, 
      error: 'An error occurred while checking verification status',
      details: error.message
    };
  }
}

/**
 * Check on-chain bytecode for a contract to help debug verification issues
 * @param {string} contractAddress - The address of the deployed contract
 * @returns {Promise<object>} - Bytecode information
 */
async function checkContractBytecode(contractAddress) {
  try {
    // Check if we have an API key
    if (!process.env.POLYGONSCAN_API_KEY) {
      return { 
        success: false, 
        error: 'Polygonscan API key not found in environment variables' 
      };
    }
    
    // Get bytecode from chain
    const apiUrl = 'https://api.polygonscan.com/api';
    const response = await axios.get(apiUrl, {
      params: {
        apikey: process.env.POLYGONSCAN_API_KEY,
        module: 'proxy',
        action: 'eth_getCode',
        address: contractAddress,
        tag: 'latest'
      }
    });
    
    if (response.data.result) {
      const bytecode = response.data.result;
      const bytecodeSize = (bytecode.length - 2) / 2; // -2 for '0x' prefix, /2 as each byte is 2 hex chars
      
      return {
        success: true,
        bytecode: bytecode,
        size: bytecodeSize,
        truncated: bytecode.substring(0, 100) + '...' + bytecode.substring(bytecode.length - 40),
        message: `Retrieved bytecode (${bytecodeSize} bytes)`
      };
    } else {
      return {
        success: false,
        error: 'Failed to retrieve bytecode',
        details: response.data
      };
    }
  } catch (error) {
    console.error('Error checking contract bytecode:', error);
    return { 
      success: false, 
      error: 'An error occurred while retrieving contract bytecode',
      details: error.message
    };
  }
}

/**
 * Try multiple verification methods in sequence until one succeeds
 * @param {string} contractAddress - The address of the deployed contract
 * @param {string} contractName - The name of the contract
 * @param {string} constructorArgs - ABI-encoded constructor arguments (if any)
 * @returns {Promise<object>} - Verification result
 */
async function smartVerifyContract(contractAddress, contractName, constructorArgs = '') {
  // First, get the on-chain bytecode to understand what we're working with
  const bytecodeResult = await checkContractBytecode(contractAddress);
  
  // Initialize results container
  const results = { 
    success: false, 
    attempts: [],
    bytecodeCheck: bytecodeResult
  };
  
  // Try different compiler versions and optimization settings WITHOUT ThirdWeb
  const verificationOptions = [
    // OpenZeppelin Standard implementations
    { method: 'direct', compilerVersion: 'v0.8.17+commit.8df45f5f', optimizationUsed: 1, evmVersion: 'london' },
    { method: 'direct', compilerVersion: 'v0.8.17+commit.8df45f5f', optimizationUsed: 0, evmVersion: 'london' },
    { method: 'direct', compilerVersion: 'v0.8.17+commit.8df45f5f', optimizationUsed: 1, evmVersion: 'paris' },
    
    // Pure Solidity versions (no ThirdWeb)
    { method: 'direct', compilerVersion: 'v0.8.19+commit.7dd6d404', optimizationUsed: 1, evmVersion: 'london' },
    { method: 'direct', compilerVersion: 'v0.8.18+commit.87f61d96', optimizationUsed: 1, evmVersion: 'london' },
    
    // Try with JSON format but keep to OpenZeppelin standards
    { method: 'standard-json', compilerVersion: 'v0.8.17+commit.8df45f5f', optimizationUsed: 1, evmVersion: 'london' },
    { method: 'standard-json', compilerVersion: 'v0.8.17+commit.8df45f5f', optimizationUsed: 0, evmVersion: 'london' },
    
    // Specific for SWF token with 4176 bytes bytecode
    { method: 'direct', compilerVersion: 'v0.8.17+commit.8df45f5f', optimizationUsed: 1, evmVersion: 'london', runs: 200 },
    { method: 'direct', compilerVersion: 'v0.8.16+commit.07a7930e', optimizationUsed: 1, evmVersion: 'london', runs: 200 }
  ];
  
  // Try each verification option
  for (const options of verificationOptions) {
    console.log(`Attempting verification with method=${options.method}, compiler=${options.compilerVersion}, optimization=${options.optimizationUsed}`);
    
    const result = await verifyContract(contractAddress, contractName, constructorArgs, options.method, options);
    
    // Record the attempt
    results.attempts.push({
      options,
      result
    });
    
    // If successful, we're done
    if (result.success) {
      results.success = true;
      results.guid = result.guid;
      results.message = `Verification succeeded with ${options.method} method and ${options.compilerVersion}`;
      results.status = 'pending';
      break;
    }
  }
  
  return results;
}

module.exports = {
  verifyContract,
  checkVerificationStatus,
  checkContractBytecode,
  smartVerifyContract
};