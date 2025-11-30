/**
 * Direct ThirdWeb Contract Verification Script for Polygonscan
 * 
 * This script handles verification of ThirdWeb contracts using the Polygonscan API
 * and specialized handling to work with ThirdWeb's extension system.
 */

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Function to read ThirdWeb contract source
async function getThirdWebContractSource() {
  try {
    // First, try to read from extracted contracts (if they exist)
    const contractPath = path.join(__dirname, '../contracts/SovranWealthFundThirdWeb.sol');
    if (fs.existsSync(contractPath)) {
      console.log('Reading ThirdWeb contract from extracted contracts directory');
      return fs.readFileSync(contractPath, 'utf8');
    }

    // If file doesn't exist in that location, try to read from the ThirdWeb contract template
    const templatePath = path.join(__dirname, '../contracts/SovranWealthFundThirdWeb.sol');
    if (fs.existsSync(templatePath)) {
      console.log('Reading ThirdWeb contract from template file');
      return fs.readFileSync(templatePath, 'utf8');
    }

    // If all else fails, return a predefined string
    console.warn('Could not find ThirdWeb contract file, using embedded template');
    
    // This is a simplified ThirdWeb contract template
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@thirdweb-dev/contracts/base/ERC20Base.sol";
import "@thirdweb-dev/contracts/extension/PermissionsEnumerable.sol";
import "@thirdweb-dev/contracts/extension/ContractMetadata.sol";

contract SovranWealthFund is ERC20Base, PermissionsEnumerable, ContractMetadata {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    constructor()
        ERC20Base(
            "Sovran Wealth Fund",
            "SWF",
            msg.sender
        )
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(TRANSFER_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);

        // Mint initial supply to deployer
        _mint(msg.sender, 1000000000 * 10**18);
    }

    function _canSetContractURI() internal view virtual override returns (bool) {
        return msg.sender == owner();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC20Base, PermissionsEnumerable)
        returns (bool)
    {
        return
            ERC20Base.supportsInterface(interfaceId) ||
            PermissionsEnumerable.supportsInterface(interfaceId);
    }
}`;
  } catch (error) {
    console.error('Error reading ThirdWeb contract source:', error);
    throw error;
  }
}

/**
 * Verify ThirdWeb contract on Polygonscan
 * 
 * @param {string} contractAddress The contract address to verify
 * @param {string} contractName The name of the contract (e.g., "SovranWealthFund")
 * @param {string} constructorArguments Constructor arguments (optional, empty for many ThirdWeb contracts)
 * @returns {Promise<object>} Result object with success status and details
 */
async function verifyThirdWebContract(contractAddress, contractName, constructorArguments = '') {
  try {
    console.log(`Starting ThirdWeb contract verification for ${contractAddress}...`);
    
    if (!process.env.POLYGONSCAN_API_KEY) {
      throw new Error('POLYGONSCAN_API_KEY environment variable is not set');
    }

    // Get the contract source code
    const sourceCode = await getThirdWebContractSource();
    if (!sourceCode) {
      throw new Error('Could not retrieve ThirdWeb contract source code');
    }
    
    // Compile settings specific for ThirdWeb contracts
    const compilerVersion = 'v0.8.20+commit.a1b79de6'; // Use exact compiler version used by ThirdWeb
    
    // Submit verification request to Polygonscan API
    console.log('Submitting verification request to Polygonscan API...');
    
    const verifyUrl = 'https://api.polygonscan.com/api';
    const postBody = new URLSearchParams({
      apikey: process.env.POLYGONSCAN_API_KEY,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractAddress,
      sourceCode: sourceCode,
      codeformat: 'solidity-single-file', // Use single-file format for ThirdWeb
      contractname: contractName,
      compilerversion: compilerVersion,
      optimizationUsed: 1, // ThirdWeb uses optimization
      runs: 200, // Standard optimization runs
      constructorArguements: constructorArguments.startsWith('0x') ? constructorArguments.slice(2) : constructorArguments
    });

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postBody
    });

    const data = await response.json();
    console.log('Verification submission response:', data);

    if (data.status === '1') {
      return {
        success: true,
        message: 'ThirdWeb contract verification submitted successfully',
        guid: data.result,
        status: 'pending'
      };
    } else {
      return {
        success: false,
        error: `ThirdWeb contract verification failed: ${data.result}`,
        details: data
      };
    }
  } catch (error) {
    console.error('Error verifying ThirdWeb contract:', error);
    return {
      success: false,
      error: 'ThirdWeb contract verification error',
      details: error.message
    };
  }
}

/**
 * Check verification status on Polygonscan
 * 
 * @param {string} guid The GUID returned from verification submission
 * @returns {Promise<object>} Status result object
 */
async function checkVerificationStatus(guid) {
  try {
    if (!process.env.POLYGONSCAN_API_KEY) {
      throw new Error('POLYGONSCAN_API_KEY environment variable is not set');
    }

    console.log(`Checking verification status for GUID: ${guid}`);
    
    const verifyUrl = 'https://api.polygonscan.com/api';
    const queryParams = new URLSearchParams({
      apikey: process.env.POLYGONSCAN_API_KEY,
      module: 'contract',
      action: 'checkverifystatus',
      guid: guid
    });

    const response = await fetch(`${verifyUrl}?${queryParams}`);
    const data = await response.json();
    
    console.log('Verification status response:', data);

    if (data.status === '1') {
      return {
        success: true,
        status: 'verified',
        message: data.result,
        result: data
      };
    } else {
      return {
        success: false,
        status: 'pending',
        error: data.result,
        details: data
      };
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
    return {
      success: false,
      status: 'error',
      error: 'Error checking verification status',
      details: error.message
    };
  }
}

// Export the verification functions
module.exports = {
  verifyThirdWebContract,
  checkVerificationStatus
};

// Direct invocation for command line use
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node direct-thirdweb-verify.js <contract-address> <contract-name> [constructor-args]');
    process.exit(1);
  }

  const contractAddress = args[0];
  const contractName = args[1];
  const constructorArgs = args[2] || '';

  console.log(`Verifying ThirdWeb contract ${contractName} at ${contractAddress}...`);
  verifyThirdWebContract(contractAddress, contractName, constructorArgs)
    .then(result => {
      console.log('Verification result:', result);
      if (result.success && result.guid) {
        console.log(`\nTo check verification status, run:\nnode direct-thirdweb-verify.js check-status ${result.guid}`);
      }
    })
    .catch(error => {
      console.error('Verification failed:', error);
    });
}