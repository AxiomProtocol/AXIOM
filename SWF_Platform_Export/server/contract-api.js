/**
 * Contract API Router
 * Provides endpoints for interacting with smart contracts, including verification
 */

const express = require('express');
const router = express.Router();
const verifyDirectModule = require('./verify-direct');
const directVerifyModule = require('./direct-contract-verify');
const solidity026VerifyModule = require('./solidity-0.8.26-verify');

// Use the verification modules
const verifyContract = verifyDirectModule.verifyContract;
const checkVerificationStatus = verifyDirectModule.checkVerificationStatus;
const directVerifyContract = directVerifyModule.directVerifyContract;
const monitorVerificationStatus = directVerifyModule.monitorVerificationStatus;
const enhancedVerifyContract = directVerifyModule.enhancedVerifyContract;
const checkContractDeployedBytecode = directVerifyModule.checkContractDeployedBytecode;
const handleSolidity026Verification = solidity026VerifyModule.handleVerificationRequest;

/**
 * Verify a contract on Polygonscan
 * 
 * Required parameters:
 * - contractAddress: The deployed contract address
 * - contractName: The name of the contract
 * 
 * Optional parameters:
 * - constructorArguments: The ABI-encoded constructor arguments (if any)
 */
router.post('/verify-contract', async (req, res) => {
  try {
    const { contractAddress, contractName, constructorArguments, verificationMethod } = req.body;
    
    // Validate required parameters
    if (!contractAddress || !contractName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: contractAddress and contractName are required'
      });
    }
    
    // Check which verification method to use
    let useFlattened;
    if (verificationMethod === 'flattened') {
      useFlattened = true;
    } else if (verificationMethod === 'thirdweb') {
      useFlattened = 'thirdweb';
    } else if (verificationMethod === 'direct') {
      useFlattened = 'direct';
    } else {
      useFlattened = false;
    }
    
    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract address format'
      });
    }

    // Check if POLYGONSCAN_API_KEY is available
    if (!process.env.POLYGONSCAN_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Missing Polygonscan API key'
      });
    }
    
    let methodMsg = '';
    if (useFlattened === true) {
      methodMsg = ' using flattened contract';
    } else if (useFlattened === 'thirdweb') {
      methodMsg = ' using specialized ThirdWeb verification';
    } else if (useFlattened === 'direct') {
      methodMsg = ' using direct fully flattened verification';
    }
    console.log(`Submitting contract verification for ${contractName} at ${contractAddress}${methodMsg}`);
    
    // Attempt to verify the contract
    const result = await verifyContract(contractAddress, contractName, constructorArguments, useFlattened);
    
    // Return the verification result
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message || 'Contract verification submitted successfully',
        guid: result.guid || null,
        status: result.status || 'pending'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Contract verification failed',
        details: result.details || null
      });
    }
  } catch (error) {
    console.error('Contract verification error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during contract verification',
      message: error.message
    });
  }
});

/**
 * Check the status of a contract verification
 * 
 * Required parameters:
 * - guid: The GUID from the verification submission
 */
router.get('/verification-status/:guid', async (req, res) => {
  try {
    const { guid } = req.params;
    
    if (!guid) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: guid'
      });
    }
    
    console.log(`Checking verification status for GUID: ${guid}`);
    
    // Check verification status using the checkVerificationStatus function
    const statusResult = await checkVerificationStatus(guid);
    
    console.log(`Received status result:`, statusResult);
    
    if (statusResult.success) {
      res.status(200).json({
        success: true,
        status: statusResult.status,
        message: statusResult.message,
        result: statusResult.result || null,
        contractAddress: statusResult.contractAddress || null
      });
    } else {
      res.status(400).json({
        success: false,
        error: statusResult.error || 'Failed to check verification status',
        details: statusResult.details || null,
        message: 'The verification process is still in progress. Please check back in a few minutes.'
      });
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while checking verification status',
      message: error.message,
      resolution: 'Please try again or check Polygonscan directly to see if verification completed.'
    });
  }
});

/**
 * @route POST /api/contract/advanced-verify
 * @description Verify a contract using the enhanced verification system
 * @access Public
 */
router.post('/advanced-verify', async (req, res) => {
  try {
    const { contractAddress, contractName, constructorArgs, verificationMethod } = req.body;
    
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        message: 'Contract address is required'
      });
    }
    
    // Prepare verification options
    const options = {
      contractAddress,
      contractName: contractName || 'SovranWealthFund',
      constructorArgs: constructorArgs || '',
      verificationMethod: verificationMethod || 'direct'
    };
    
    console.log(`Starting advanced verification for ${options.contractName} at ${options.contractAddress}`);
    
    // Attempt to verify the contract
    const result = await directVerifyContract(options);
    
    if (result.success) {
      // Start monitoring the verification status if we got a GUID
      if (result.guid) {
        // Return the initial response to the client
        res.status(200).json({
          success: true,
          message: 'Verification submitted successfully and monitoring started',
          guid: result.guid,
          status: 'pending',
          checkEndpoint: `/api/contract/verification-status/${result.guid}`
        });
        
        // Start monitoring in the background (doesn't affect response)
        monitorVerificationStatus(result.guid)
          .then(finalStatus => {
            console.log(`Verification monitoring completed for ${options.contractAddress}:`, finalStatus);
          })
          .catch(err => {
            console.error('Error monitoring verification status:', err);
          });
      } else {
        res.status(200).json(result);
      }
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in advanced verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify contract',
      error: error.message
    });
  }
});

/**
 * @route POST /api/contract/enhanced-verify
 * @description Verify a contract using multiple methods to overcome bytecode mismatch issues
 * @access Public
 */
router.post('/enhanced-verify', async (req, res) => {
  try {
    const { contractAddress, contractName, constructorArgs } = req.body;
    
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        message: 'Contract address is required'
      });
    }
    
    // Prepare verification options
    const options = {
      contractAddress,
      contractName: contractName || 'SovranWealthFund',
      constructorArgs: constructorArgs || ''
    };
    
    console.log(`Starting enhanced verification for ${options.contractName} at ${options.contractAddress}`);
    
    // Attempt to verify the contract with multiple methods
    const result = await enhancedVerifyContract(options);
    
    // If any attempt succeeded, return success
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        guid: result.guid,
        status: 'pending',
        checkEndpoint: `/api/contract/verification-status/${result.guid}`
      });
      
      // Start monitoring in the background
      if (result.guid) {
        monitorVerificationStatus(result.guid)
          .then(finalStatus => {
            console.log(`Verification monitoring completed for ${options.contractAddress}:`, finalStatus);
          })
          .catch(err => {
            console.error('Error monitoring verification status:', err);
          });
      }
    } else {
      // Return details of all verification attempts
      res.status(200).json({
        success: false,
        message: 'All verification attempts failed',
        bytecodeInfo: result.bytecodeCheck,
        attempts: result.attempts
      });
    }
  } catch (error) {
    console.error('Error in enhanced verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify contract',
      error: error.message
    });
  }
});

/**
 * @route POST /api/contract/check-bytecode
 * @description Check the bytecode of a deployed contract to help with verification
 * @access Public
 */
router.post('/check-bytecode', async (req, res) => {
  try {
    const { contractAddress } = req.body;
    
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        message: 'Contract address is required'
      });
    }
    
    // Get the on-chain bytecode
    const bytecodeResult = await checkContractDeployedBytecode({ contractAddress });
    
    res.status(200).json(bytecodeResult);
  } catch (error) {
    console.error('Error checking contract bytecode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check contract bytecode',
      error: error.message
    });
  }
});

/**
 * @route GET /api/contract/verify-solidity-0.8.26
 * @description Special verification endpoint for contracts compiled with Solidity 0.8.26
 * @access Public
 */
router.get('/verify-solidity-0.8.26', handleSolidity026Verification);

/**
 * @route POST /api/contract/verify-swf-token
 * @description Special verification endpoint optimized for SovranWealthFund tokens
 * @access Public
 */
router.post('/verify-swf-token', async (req, res) => {
  try {
    const { contractAddress, constructorArgs } = req.body;
    
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        message: 'Contract address is required'
      });
    }
    
    // Use specialized SWF token verification
    const smartVerify = require('./smartVerify');
    const result = await smartVerify.verifySwfToken(contractAddress, constructorArgs);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        guid: result.guid,
        status: 'pending',
        checkEndpoint: `/api/contract/verification-status/${result.guid}`
      });
      
      // Start monitoring in the background
      if (result.guid) {
        smartVerify.checkVerificationStatus(result.guid)
          .then(finalStatus => {
            console.log(`SWF token verification monitoring completed for ${contractAddress}:`, finalStatus);
          })
          .catch(err => {
            console.error('Error monitoring SWF token verification status:', err);
          });
      }
    } else {
      res.status(200).json({
        success: false,
        message: 'SWF token verification failed',
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Error in SWF token verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify SWF token',
      error: error.message
    });
  }
});

module.exports = router;