/**
 * Sovran Wealth Fund Contract Verification Helper
 * 
 * This script helps verify deployed contracts on Polygonscan
 * using the Polygonscan API and ethers.js
 */

const express = require('express');
const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const router = express.Router();

// Verify contract on Polygonscan
router.post('/verify', async (req, res) => {
  try {
    const { 
      contractAddress, 
      contractName,
      network
    } = req.body;
    
    if (!contractAddress || !contractName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Check if address is valid
    if (!ethers.utils.isAddress(contractAddress)) {
      return res.status(400).json({ error: 'Invalid contract address' });
    }
    
    // Determine network API URL and API key
    const networkName = network || 'polygon';
    const isMainnet = networkName === 'polygon';
    
    const apiUrl = isMainnet 
      ? 'https://api.polygonscan.com/api'
      : 'https://api-testnet.polygonscan.com/api';
    
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'POLYGONSCAN_API_KEY not found in environment' });
    }
    
    // Get contract info from deployment
    let deploymentInfo = {};
    try {
      const deploymentFilePath = path.join(process.cwd(), 'deployment-info.json');
      if (fs.existsSync(deploymentFilePath)) {
        const deploymentData = fs.readFileSync(deploymentFilePath, 'utf8');
        deploymentInfo = JSON.parse(deploymentData);
      }
    } catch (err) {
      console.error('Failed to read deployment info:', err);
    }
    
    // Prepare verification request
    const verificationParams = {
      apikey: apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractAddress,
      sourceCode: '', // Will be populated with source code
      codeformat: 'solidity-standard-json-input',
      contractname: contractName,
      compilerversion: 'v0.8.17+commit.8df45f5f', // Must match compiler version in contract
      optimizationUsed: 1,
      runs: 200,
      evmversion: 'london'
    };
    
    // Get compiled output from Hardhat artifacts
    const artifactsDir = path.join(process.cwd(), 'SWF_Verified_Token', 'artifacts');
    const contractArtifactPath = path.join(
      artifactsDir, 
      'contracts', 
      `${contractName}.sol`, 
      `${contractName}.json`
    );
    
    if (!fs.existsSync(contractArtifactPath)) {
      return res.status(404).json({
        error: 'Contract artifact not found. Make sure the contract is compiled.',
        path: contractArtifactPath
      });
    }
    
    const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
    
    // Get input JSON for verification
    const inputJsonPath = path.join(
      artifactsDir,
      '..',
      'cache',
      'solidity-files-cache.json'
    );
    
    if (!fs.existsSync(inputJsonPath)) {
      return res.status(404).json({
        error: 'Solidity files cache not found. Make sure the contract is compiled.',
        path: inputJsonPath
      });
    }
    
    // Send to API
    try {
      const response = await axios.post(apiUrl, null, {
        params: verificationParams
      });
      
      if (response.data.status === '1') {
        const guid = response.data.result;
        
        // Store verification info
        const verificationInfo = {
          contractAddress,
          contractName,
          network: networkName,
          verificationGuid: guid,
          timestamp: new Date().toISOString(),
          status: 'Pending'
        };
        
        const verificationFilePath = path.join(process.cwd(), 'verification-info.json');
        fs.writeFileSync(verificationFilePath, JSON.stringify(verificationInfo, null, 2));
        
        return res.json({
          success: true,
          message: 'Verification submission successful',
          guid,
          explorerUrl: isMainnet 
            ? `https://polygonscan.com/address/${contractAddress}#code`
            : `https://mumbai.polygonscan.com/address/${contractAddress}#code`
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `API Error: ${response.data.result}`
        });
      }
    } catch (error) {
      console.error('API error:', error);
      return res.status(500).json({
        success: false,
        error: `API request failed: ${error.message}`
      });
    }
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: `Verification error: ${err.message}` });
  }
});

// Check verification status
router.get('/status/:guid', async (req, res) => {
  try {
    const { guid } = req.params;
    
    if (!guid) {
      return res.status(400).json({ error: 'Missing verification GUID' });
    }
    
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'POLYGONSCAN_API_KEY not found in environment' });
    }
    
    // Determine network by loading verification-info.json
    let verificationInfo = {};
    let apiUrl = 'https://api.polygonscan.com/api'; // Default to mainnet
    
    try {
      const verificationFilePath = path.join(process.cwd(), 'verification-info.json');
      if (fs.existsSync(verificationFilePath)) {
        const verificationData = fs.readFileSync(verificationFilePath, 'utf8');
        verificationInfo = JSON.parse(verificationData);
        
        if (verificationInfo.network === 'mumbai') {
          apiUrl = 'https://api-testnet.polygonscan.com/api';
        }
      }
    } catch (err) {
      console.error('Failed to read verification info:', err);
    }
    
    // Check status on Polygonscan
    try {
      const response = await axios.get(apiUrl, {
        params: {
          apikey: apiKey,
          module: 'contract',
          action: 'checkverifystatus',
          guid
        }
      });
      
      // Update verification info
      if (verificationInfo.verificationGuid === guid) {
        if (response.data.status === '1') {
          verificationInfo.status = 'Verified';
        } else if (response.data.result.includes('Pending')) {
          verificationInfo.status = 'Pending';
        } else {
          verificationInfo.status = 'Failed';
          verificationInfo.error = response.data.result;
        }
        
        verificationInfo.lastChecked = new Date().toISOString();
        
        const verificationFilePath = path.join(process.cwd(), 'verification-info.json');
        fs.writeFileSync(verificationFilePath, JSON.stringify(verificationInfo, null, 2));
      }
      
      return res.json({
        guid,
        status: response.data.status,
        result: response.data.result,
        contractAddress: verificationInfo.contractAddress,
        explorerUrl: verificationInfo.network === 'mumbai'
          ? `https://mumbai.polygonscan.com/address/${verificationInfo.contractAddress}#code`
          : `https://polygonscan.com/address/${verificationInfo.contractAddress}#code`
      });
    } catch (error) {
      console.error('API error:', error);
      res.status(500).json({
        error: `API request failed: ${error.message}`
      });
    }
  } catch (err) {
    console.error('Status check error:', err);
    res.status(500).json({ error: `Status check error: ${err.message}` });
  }
});

// Get current token info
router.get('/token-info', (req, res) => {
  try {
    const tokenInfoPath = path.join(process.cwd(), 'SovranWealthFund.token.json');
    if (fs.existsSync(tokenInfoPath)) {
      const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf8'));
      res.json(tokenInfo);
    } else {
      res.json({
        message: 'Token not yet deployed or info not available'
      });
    }
  } catch (err) {
    console.error('Error getting token info:', err);
    res.status(500).json({ error: `Error getting token info: ${err.message}` });
  }
});

module.exports = router;