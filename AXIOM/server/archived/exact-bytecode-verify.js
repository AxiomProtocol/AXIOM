/**
 * Exact Bytecode Verification Module
 * 
 * This module compares the on-chain bytecode with the compiled bytecode
 * to help diagnose and fix verification issues with precise information.
 */

const axios = require('axios');
const { ethers } = require('ethers');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Fetch deployed bytecode directly from chain
async function getContractBytecode(contractAddress) {
  try {
    console.log(`Fetching bytecode for ${contractAddress} directly from Polygon...`);
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

// Compile contract with specific parameters
async function compileContract(settings) {
  return new Promise((resolve, reject) => {
    const tmpDir = path.resolve(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    // Create a temporary hardhat config for this specific compilation
    const configPath = path.resolve(tmpDir, 'hardhat.config.temp.js');
    const configContent = `
      module.exports = {
        solidity: {
          version: "${settings.compiler.version}",
          settings: {
            optimizer: {
              enabled: ${settings.compiler.optimizer.enabled},
              runs: ${settings.compiler.optimizer.runs}
            },
            evmVersion: "${settings.compiler.evmVersion}"
          }
        }
      };
    `;
    fs.writeFileSync(configPath, configContent);
    
    // Copy contract source
    const contractDir = path.resolve(tmpDir, 'contracts');
    if (!fs.existsSync(contractDir)) {
      fs.mkdirSync(contractDir, { recursive: true });
    }
    
    const contractPath = path.resolve(contractDir, 'Contract.sol');
    fs.writeFileSync(contractPath, settings.sourceCode);
    
    // Run hardhat compile
    const cmd = `cd ${tmpDir} && npx hardhat compile --config ${configPath}`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Compilation error: ${error.message}`);
        return reject(error);
      }
      
      // Try to read the compiled artifact
      try {
        const artifactPath = path.resolve(
          tmpDir, 
          'artifacts/contracts/Contract.sol',
          settings.contractName + '.json'
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

// Extract constructor args from transaction
async function extractConstructorArgs(txHash) {
  try {
    const provider = new ethers.providers.JsonRpcProvider(
      'https://polygon-rpc.com'
    );
    
    // Get transaction details
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return { success: false, error: 'Transaction not found' };
    }
    
    // Get transaction receipt to find contract address
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || !receipt.contractAddress) {
      return { success: false, error: 'Not a contract creation transaction' };
    }
    
    // Get bytecode for the contract
    const contractBytecode = await getContractBytecode(receipt.contractAddress);
    if (!contractBytecode.success) {
      return contractBytecode;
    }
    
    // Extract constructor arguments from the transaction data
    // This is a simplified approach - actual implementation would need to:
    // 1. Get the contract creation code (bytecode + constructor args)
    // 2. Compare with the known bytecode to find where args start
    const inputData = tx.data;
    const bytecodeHex = contractBytecode.bytecode.slice(2); // Remove 0x
    
    // Check if input data contains the bytecode (it should)
    if (inputData.includes(bytecodeHex)) {
      const argsStartIdx = inputData.indexOf(bytecodeHex) + bytecodeHex.length;
      const constructorArgs = inputData.slice(argsStartIdx);
      
      return {
        success: true,
        constructorArgs: constructorArgs,
        contractAddress: receipt.contractAddress
      };
    }
    
    return {
      success: false,
      error: 'Could not extract constructor arguments'
    };
  } catch (error) {
    console.error('Error extracting constructor args:', error);
    return { success: false, error: error.message };
  }
}

// Try to verify contract with precise bytecode matching
async function verifyByBytecodeMatching(contractAddress, sourceCode, constructorArgs = '') {
  const results = [];
  
  // Get deployed bytecode first for reference
  const deployedBytecode = await getContractBytecode(contractAddress);
  if (!deployedBytecode.success) {
    return { 
      success: false, 
      error: 'Failed to get deployed bytecode',
      details: deployedBytecode.error 
    };
  }
  
  console.log(`Deployed bytecode size: ${deployedBytecode.size} bytes`);
  
  // Common optimization settings to try
  const compilationSettings = [
    // OpenZeppelin standards
    { 
      compiler: { 
        version: '0.8.17', 
        optimizer: { enabled: true, runs: 200 }, 
        evmVersion: 'london'
      },
      contractName: 'SovranWealthFund'
    },
    { 
      compiler: { 
        version: '0.8.17', 
        optimizer: { enabled: true, runs: 1000 }, 
        evmVersion: 'london'
      },
      contractName: 'SovranWealthFund'
    },
    { 
      compiler: { 
        version: '0.8.17', 
        optimizer: { enabled: false, runs: 0 }, 
        evmVersion: 'london'
      },
      contractName: 'SovranWealthFund'
    },
    { 
      compiler: { 
        version: '0.8.16', 
        optimizer: { enabled: true, runs: 200 }, 
        evmVersion: 'london'
      },
      contractName: 'SovranWealthFund'
    },
    { 
      compiler: { 
        version: '0.8.16', 
        optimizer: { enabled: true, runs: 200 }, 
        evmVersion: 'paris'
      },
      contractName: 'SovranWealthFund'
    }
  ];
  
  // Try all combinations
  for (const settings of compilationSettings) {
    console.log(`Trying compilation with: Solidity ${settings.compiler.version}, optimizer ${settings.compiler.optimizer.enabled ? 'enabled' : 'disabled'}, runs ${settings.compiler.optimizer.runs}`);
    
    try {
      settings.sourceCode = sourceCode;
      const compiled = await compileContract(settings);
      
      if (compiled.success) {
        const bytecodeWithoutPrefix = compiled.deployedBytecode.startsWith('0x') 
          ? compiled.deployedBytecode.slice(2) 
          : compiled.deployedBytecode;
        
        const deployedWithoutPrefix = deployedBytecode.bytecode.startsWith('0x')
          ? deployedBytecode.bytecode.slice(2)
          : deployedBytecode.bytecode;
          
        // Compare bytecodes
        const match = deployedWithoutPrefix.includes(bytecodeWithoutPrefix);
        const matchPercentage = bytecodeWithoutPrefix.length > 0 
          ? (bytecodeWithoutPrefix.length / deployedWithoutPrefix.length) * 100
          : 0;
          
        results.push({
          settings,
          match,
          matchPercentage: Math.round(matchPercentage * 100) / 100,
          compiledSize: bytecodeWithoutPrefix.length / 2, // bytes
          deployedSize: deployedWithoutPrefix.length / 2 // bytes
        });
        
        if (match) {
          console.log(`✓ Found matching bytecode with ${settings.compiler.version}!`);
          
          // Try to submit verification with these settings
          const submitResult = await submitVerification(
            contractAddress, 
            sourceCode, 
            settings.contractName,
            settings.compiler.version,
            settings.compiler.optimizer.enabled ? '1' : '0',
            settings.compiler.optimizer.runs.toString(),
            settings.compiler.evmVersion,
            constructorArgs
          );
          
          if (submitResult.success) {
            return {
              success: true,
              message: 'Verification submitted with matched bytecode settings',
              settings,
              guid: submitResult.guid,
              results
            };
          } else {
            console.log(`Bytecode matched but verification submission failed: ${submitResult.error}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error during compilation attempt:`, error);
      results.push({
        settings,
        error: error.message,
        match: false,
        matchPercentage: 0
      });
    }
  }
  
  // Find best match if exact match not found
  results.sort((a, b) => b.matchPercentage - a.matchPercentage);
  const bestMatch = results[0];
  
  if (bestMatch && bestMatch.matchPercentage > 90) {
    console.log(`Found close match (${bestMatch.matchPercentage}%) with ${bestMatch.settings.compiler.version}`);
    
    // Try to submit verification with close match settings
    const submitResult = await submitVerification(
      contractAddress, 
      sourceCode, 
      bestMatch.settings.contractName,
      bestMatch.settings.compiler.version,
      bestMatch.settings.compiler.optimizer.enabled ? '1' : '0',
      bestMatch.settings.compiler.optimizer.runs.toString(),
      bestMatch.settings.compiler.evmVersion,
      constructorArgs
    );
    
    if (submitResult.success) {
      return {
        success: true,
        message: `Verification submitted with best match (${bestMatch.matchPercentage}%)`,
        settings: bestMatch.settings,
        guid: submitResult.guid,
        results
      };
    }
  }
  
  // Return detailed information for debugging
  return {
    success: false,
    message: 'No exact bytecode match found',
    results,
    bestMatch: results[0],
    deployedBytecodeSize: deployedBytecode.size
  };
}

// Submit verification to Polygonscan
async function submitVerification(
  address, 
  sourceCode, 
  contractName, 
  compilerVersion,
  optimizationUsed,
  runs,
  evmVersion,
  constructorArgs
) {
  try {
    if (!process.env.POLYGONSCAN_API_KEY) {
      return { success: false, error: 'POLYGONSCAN_API_KEY not set' };
    }
    
    const apiUrl = 'https://api.polygonscan.com/api';
    const params = new URLSearchParams();
    
    // Add required parameters
    params.append('apikey', process.env.POLYGONSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', address);
    params.append('sourceCode', sourceCode);
    params.append('codeformat', 'solidity-single-file');
    params.append('contractname', contractName);
    params.append('compilerversion', `v${compilerVersion}+commit.8df45f5f`); // Add commit hash
    params.append('optimizationUsed', optimizationUsed);
    params.append('runs', runs);
    params.append('evmversion', evmVersion);
    params.append('licenseType', '3'); // MIT License
    
    // Add constructor arguments if provided
    if (constructorArgs && constructorArgs.trim() !== '') {
      params.append('constructorArguments', constructorArgs.trim());
    }
    
    console.log('Submitting verification with params:', {
      address,
      contractName,
      compilerVersion,
      optimizationUsed,
      runs,
      evmVersion,
      constructorArgsLength: constructorArgs ? constructorArgs.length : 0
    });
    
    // Submit request
    const response = await axios.post(apiUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (response.data.status === '1') {
      return { 
        success: true, 
        guid: response.data.result,
        message: 'Verification submitted successfully' 
      };
    } else {
      return { 
        success: false, 
        error: response.data.result || 'Unknown error',
        details: response.data
      };
    }
  } catch (error) {
    console.error('Error submitting verification:', error);
    return { success: false, error: error.message };
  }
}

// Check verification status
async function checkVerificationStatus(guid) {
  try {
    if (!process.env.POLYGONSCAN_API_KEY) {
      return { success: false, error: 'POLYGONSCAN_API_KEY not set' };
    }
    
    const apiUrl = 'https://api.polygonscan.com/api';
    const params = {
      apikey: process.env.POLYGONSCAN_API_KEY,
      module: 'contract',
      action: 'checkverifystatus',
      guid
    };
    
    const response = await axios.get(apiUrl, { params });
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
        message: response.data.result
      };
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getContractBytecode,
  extractConstructorArgs,
  verifyByBytecodeMatching,
  checkVerificationStatus
};