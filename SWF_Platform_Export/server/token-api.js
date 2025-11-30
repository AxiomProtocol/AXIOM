/**
 * Sovran Wealth Fund Token API Endpoints
 * 
 * Implements the API endpoints for SWF token verification, info retrieval, and management.
 */

const express = require('express');
const { verifyToken, getTokenInfo, getTokenState } = require('./swf-token-verification');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Helper to get the current token address
function getCurrentTokenAddress() {
  try {
    const tokenPath = path.join(__dirname, '../SovranWealthFund.token.json');
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    console.log('Retrieved token data:', JSON.stringify(tokenData, null, 2));
    return tokenData.token.address;
  } catch (error) {
    console.error('Error reading token address:', error);
    return null;
  }
}

/**
 * @route GET /api/token/info
 * @description Get information about the current SWF token
 * @access Public
 */
router.get('/info', async (req, res) => {
  try {
    const tokenAddress = getCurrentTokenAddress();
    
    if (!tokenAddress) {
      return res.status(404).json({
        success: false,
        message: 'SWF token address not found. The token may not be deployed yet.'
      });
    }
    
    const tokenInfo = await getTokenInfo(tokenAddress, req.query.network || 'mainnet');
    
    res.json({
      success: true,
      token: tokenInfo
    });
  } catch (error) {
    console.error('Error fetching token info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve token information',
      error: error.message
    });
  }
});

/**
 * @route GET /api/token/state
 * @description Get detailed state information about the current SWF token
 * @access Public
 */
router.get('/state', async (req, res) => {
  try {
    const tokenAddress = getCurrentTokenAddress();
    
    if (!tokenAddress) {
      return res.status(404).json({
        success: false,
        message: 'SWF token address not found. The token may not be deployed yet.'
      });
    }
    
    const tokenState = await getTokenState(tokenAddress, req.query.network || 'mainnet');
    
    res.json({
      success: true,
      token: tokenState
    });
  } catch (error) {
    console.error('Error fetching token state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve token state',
      error: error.message
    });
  }
});

/**
 * @route POST /api/token/verify
 * @description Verify a token contract against the SWF token spec
 * @access Public
 */
router.post('/verify', async (req, res) => {
  try {
    const { address, network } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Token address is required'
      });
    }
    
    const verificationResult = await verifyToken(address, network || 'mainnet');
    
    res.json({
      success: verificationResult.verified,
      result: verificationResult
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/token/set
 * @description Set the current token address (admin only)
 * @access Admin
 */
router.post('/set', async (req, res) => {
  try {
    // Check if user is admin
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const { address, network } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Token address is required'
      });
    }
    
    // Verify this is actually the SWF token
    const verificationResult = await verifyToken(address, network || 'mainnet');
    
    if (!verificationResult.verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token address. Verification failed.',
        details: verificationResult.message
      });
    }
    
    // Update the token file
    const tokenPath = path.join(__dirname, '../SovranWealthFund.token.json');
    const tokenData = {
      network: network || 'mainnet',
      token: {
        address,
        name: verificationResult.name,
        symbol: verificationResult.symbol,
        totalSupply: verificationResult.totalSupply,
        decimals: verificationResult.decimals,
        updatedAt: new Date().toISOString()
      }
    };
    
    fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));
    
    res.json({
      success: true,
      message: 'Token address updated successfully',
      token: tokenData.token
    });
  } catch (error) {
    console.error('Error setting token address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set token address',
      error: error.message
    });
  }
});

/**
 * @route GET /api/token/source
 * @description Get the flattened source code for the SWF token
 * @access Public
 */
router.get('/source', (req, res) => {
  try {
    // Get the contract source from the artifacts helper
    const artifacts = require('./contract-artifacts');
    const contractName = req.query.contract || 'SovranWealthFund';
    
    const sourceResult = artifacts.getContractSource(contractName);
    
    if (sourceResult.success) {
      res.json({
        success: true,
        source: sourceResult.source,
        contractName
      });
    } else {
      // Fallback if the function is not available
      res.status(404).json({
        success: false,
        message: sourceResult.error || 'Source code not available',
        contractName
      });
    }
  } catch (error) {
    console.error('Error fetching token source:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve token source',
      error: error.message
    });
  }
});

/**
 * @route GET /api/token/verification-status
 * @description Check if a token is verified on Polygonscan
 * @access Public
 */
router.get('/verification-status', async (req, res) => {
  try {
    const address = req.query.address || getCurrentTokenAddress();
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Token address is required'
      });
    }
    
    // Simple check by fetching the contract code from Polygonscan API
    const apiUrl = 'https://api.polygonscan.com/api';
    const axios = require('axios');
    
    const response = await axios.get(apiUrl, {
      params: {
        module: 'contract',
        action: 'getabi',
        address: address,
        apikey: process.env.POLYGONSCAN_API_KEY
      }
    });
    
    const isVerified = response.data.status === '1';
    
    res.json({
      success: isVerified,
      address,
      status: isVerified ? 'verified' : 'not verified',
      message: response.data.result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/token/artifact
 * @description Get the contract artifact for the SWF token
 * @access Public
 */
router.get('/artifact', (req, res) => {
  try {
    const artifacts = require('./contract-artifacts');
    const contractName = req.query.contract || 'SovranWealthFund';
    
    const artifactResult = artifacts.getContractArtifact(contractName);
    
    if (artifactResult.success) {
      res.json({
        success: true,
        artifact: artifactResult.artifact,
        contractName
      });
    } else {
      res.status(404).json({
        success: false,
        message: artifactResult.error || 'Contract artifact not available',
        contractName
      });
    }
  } catch (error) {
    console.error('Error fetching token artifact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve token artifact',
      error: error.message
    });
  }
});

module.exports = router;