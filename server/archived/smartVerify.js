/**
 * Smart Contract Verification Module
 * 
 * Implements advanced verification approaches to handle bytecode mismatches
 * with optimized methods for the SovranWealthFund token
 */

const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();

// Helper functions
async function fetchContractBytecode(contractAddress) {
  try {
    // Use Polygon RPC to get bytecode directly
    const provider = new ethers.providers.JsonRpcProvider(
      'https://polygon-rpc.com'
    );
    
    const bytecode = await provider.getCode(contractAddress);
    return { 
      success: true, 
      bytecode,
      size: (bytecode.length - 2) / 2 // -2 for '0x', /2 since each byte is 2 hex chars
    };
  } catch (error) {
    console.error('Error fetching bytecode:', error);
    return { success: false, error: error.message };
  }
}

// Targeted verification for SWF
async function verifySwfToken(contractAddress, constructorArgs = '') {
  try {
    // Get bytecode to determine specific approach
    const bytecodeInfo = await fetchContractBytecode(contractAddress);
    if (!bytecodeInfo.success) {
      return { success: false, error: 'Failed to fetch bytecode' };
    }
    
    console.log(`SWF Token bytecode size: ${bytecodeInfo.size} bytes`);
    
    // For SWF token with bytecode size ~4176 bytes, we need specific configurations
    // Using pure OpenZeppelin-based contract (no ThirdWeb references)
    const optimalSettings = {
      compilerVersion: 'v0.8.17+commit.8df45f5f', // Standard OpenZeppelin-compatible version
      optimizationUsed: 1,
      runs: 200,
      evmVersion: 'london', // London EVM is more compatible with most contracts
      constructorArguments: constructorArgs || ''
    };
    
    // Submit verification
    const verificationUrl = 'https://api.polygonscan.com/api';
    const params = new URLSearchParams();
    params.append('apikey', process.env.POLYGONSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', contractAddress);
    
    // Get source code from local file
    const fs = require('fs');
    const path = require('path');
    const sourceFilePath = path.resolve(__dirname, '../contracts/verified/SovranWealthFund.flat.sol');
    let sourceCode = fs.readFileSync(sourceFilePath, 'utf8');
    
    // Ensure no ThirdWeb imports or references are in the source code
    if (sourceCode.includes('@thirdweb-dev') || sourceCode.includes('thirdweb')) {
      console.log('Found ThirdWeb references in source code, removing...');
      
      // Replace any ThirdWeb imports
      sourceCode = sourceCode.replace(/import [^;]*@thirdweb-dev\/contracts[^;]*;/g, '');
      sourceCode = sourceCode.replace(/import [^;]*thirdweb[^;]*;/g, '');
      
      // Replace any ThirdWeb-specific inheritance
      sourceCode = sourceCode.replace(/\s+is\s+.*ThirdwebContract.*,/g, ' is ');
      sourceCode = sourceCode.replace(/\s+is\s+.*ThirdwebContract/g, '');
      
      console.log('ThirdWeb references removed from source code');
    }
    
    params.append('sourceCode', sourceCode);
    params.append('codeformat', 'solidity-single-file');
    params.append('contractname', 'SovranWealthFund');
    params.append('compilerversion', optimalSettings.compilerVersion);
    params.append('optimizationUsed', optimalSettings.optimizationUsed.toString());
    params.append('runs', optimalSettings.runs.toString());
    params.append('evmversion', optimalSettings.evmVersion);
    params.append('licenseType', '3'); // MIT License
    
    // Add constructor arguments if provided
    if (optimalSettings.constructorArguments) {
      params.append('constructorArguments', optimalSettings.constructorArguments);
    }
    
    // Submit verification request
    console.log('Submitting SWF-specific verification with optimized parameters');
    const response = await axios.post(verificationUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (response.data.status === '1') {
      return {
        success: true,
        guid: response.data.result,
        message: 'Verification submitted successfully with SWF-specific parameters',
        status: 'pending'
      };
    } else {
      return {
        success: false,
        error: response.data.result || 'Unknown error',
        details: response.data
      };
    }
  } catch (error) {
    console.error('Error in SWF-specific verification:', error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

// Check verification status
async function checkVerificationStatus(guid) {
  try {
    if (!process.env.POLYGONSCAN_API_KEY) {
      return { success: false, error: 'Missing API key' };
    }
    
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
        message: response.data.result
      };
    } else {
      return {
        success: false,
        status: response.data.result.toLowerCase().includes('fail') ? 'failed' : 'pending',
        message: response.data.result,
        error: response.data.result
      };
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  verifySwfToken,
  checkVerificationStatus,
  fetchContractBytecode
};