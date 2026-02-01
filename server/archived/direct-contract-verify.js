/**
 * Direct Contract Verification Module
 * 
 * This module provides a simplified API for verifying contracts on Polygonscan
 * using the flattened contract source approach. It automatically handles finding
 * the appropriate source code and constructing the verification request.
 * 
 * Enhanced features:
 * - Multi-method verification attempts with different compiler versions and settings
 * - Bytecode analysis for debugging verification issues
 * - Monitoring for verification status
 */

const { verifyContract, checkVerificationStatus, checkContractBytecode, smartVerifyContract } = require('./verify-direct');
const artifacts = require('./contract-artifacts');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Verify a contract using its flattened source code
 * @param {object} options - Verification options
 * @param {string} options.contractAddress - The address of the deployed contract
 * @param {string} options.contractName - The name of the contract
 * @param {string} [options.constructorArgs] - ABI-encoded constructor arguments (if needed)
 * @param {string} [options.verificationMethod] - Method to use for verification (direct, standard-json, etc.)
 * @returns {Promise<object>} - Verification result
 */
async function directVerifyContract(options) {
  const {
    contractAddress,
    contractName = 'SovranWealthFund',
    constructorArgs = '',
    verificationMethod = 'direct'
  } = options;
  
  try {
    console.log(`Starting direct verification for ${contractName} at ${contractAddress} using ${verificationMethod} method`);
    
    // Validate inputs
    if (!contractAddress || !contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return {
        success: false,
        error: 'Invalid contract address format'
      };
    }
    
    if (!process.env.POLYGONSCAN_API_KEY) {
      return {
        success: false,
        error: 'Polygonscan API key not found in environment variables'
      };
    }
    
    // Get contract source
    const sourceResult = artifacts.getContractSource(contractName);
    if (!sourceResult.success) {
      return {
        success: false,
        error: sourceResult.error || `Failed to retrieve source code for ${contractName}`
      };
    }
    
    console.log(`Retrieved source code for ${contractName} (flattened: ${sourceResult.flattened || false})`);
    
    // Determine the best verification method to use
    let method = verificationMethod;
    if (verificationMethod === 'auto') {
      method = sourceResult.flattened ? 'direct' : 'standard-json';
    }
    
    // Submit verification request
    const result = await verifyContract(contractAddress, contractName, constructorArgs, method);
    return result;
  } catch (error) {
    console.error('Error in direct contract verification:', error);
    return {
      success: false,
      error: `Verification failed: ${error.message}`
    };
  }
}

/**
 * Monitor verification status and return final result
 * @param {string} guid - The GUID from verification submission
 * @param {number} maxAttempts - Maximum number of status check attempts
 * @param {number} interval - Interval between checks in ms
 * @returns {Promise<object>} - Final verification status
 */
async function monitorVerificationStatus(guid, maxAttempts = 10, interval = 5000) {
  return new Promise((resolve) => {
    let attempts = 0;
    
    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        resolve({
          success: false,
          status: 'timeout',
          message: `Verification status check timed out after ${maxAttempts} attempts`
        });
        return;
      }
      
      attempts++;
      
      try {
        const status = await checkVerificationStatus(guid);
        console.log(`Verification status check attempt ${attempts}/${maxAttempts}: ${status.status}`);
        
        if (status.success || status.status === 'verified') {
          resolve({
            success: true,
            status: 'verified',
            message: status.message
          });
          return;
        } else if (status.status === 'failed' || (status.error && status.error.includes('Fail'))) {
          resolve({
            success: false,
            status: 'failed',
            error: status.error,
            message: status.message
          });
          return;
        }
        
        // Still pending, check again after interval
        setTimeout(checkStatus, interval);
      } catch (error) {
        console.error('Error checking verification status:', error);
        setTimeout(checkStatus, interval);
      }
    };
    
    // Start checking
    checkStatus();
  });
}

/**
 * Advanced verification with multiple attempts and methods
 * @param {object} options - Verification options
 * @param {string} options.contractAddress - The address of the deployed contract
 * @param {string} options.contractName - The name of the contract
 * @param {string} [options.constructorArgs] - ABI-encoded constructor arguments (if needed)
 * @returns {Promise<object>} - Verification result with details of all attempts
 */
async function enhancedVerifyContract(options) {
  const {
    contractAddress,
    contractName = 'SovranWealthFund',
    constructorArgs = '',
  } = options;
  
  try {
    console.log(`Starting enhanced verification for ${contractName} at ${contractAddress}`);
    
    // Validate inputs
    if (!contractAddress || !contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return {
        success: false,
        error: 'Invalid contract address format'
      };
    }
    
    if (!process.env.POLYGONSCAN_API_KEY) {
      return {
        success: false,
        error: 'Polygonscan API key not found in environment variables'
      };
    }
    
    // First, check on-chain bytecode
    const bytecodeInfo = await checkContractBytecode(contractAddress);
    if (!bytecodeInfo.success) {
      return {
        success: false,
        error: 'Failed to retrieve contract bytecode',
        details: bytecodeInfo.error
      };
    }
    
    console.log(`Contract bytecode size: ${bytecodeInfo.size} bytes`);
    
    // Try smart verification with multiple methods
    return await smartVerifyContract(contractAddress, contractName, constructorArgs);
  } catch (error) {
    console.error('Error in enhanced contract verification:', error);
    return {
      success: false,
      error: `Verification failed: ${error.message}`
    };
  }
}

/**
 * Check contract deployment bytecode to help debug verification issues
 * @param {object} options - Options
 * @param {string} options.contractAddress - The address of the deployed contract
 * @returns {Promise<object>} - Bytecode information
 */
async function checkContractDeployedBytecode(options) {
  const { contractAddress } = options;
  
  try {
    console.log(`Checking deployed bytecode for contract at ${contractAddress}`);
    
    // Validate inputs
    if (!contractAddress || !contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return {
        success: false,
        error: 'Invalid contract address format'
      };
    }
    
    return await checkContractBytecode(contractAddress);
  } catch (error) {
    console.error('Error checking contract bytecode:', error);
    return {
      success: false,
      error: `Bytecode check failed: ${error.message}`
    };
  }
}

module.exports = {
  directVerifyContract,
  monitorVerificationStatus,
  enhancedVerifyContract,
  checkContractDeployedBytecode
};