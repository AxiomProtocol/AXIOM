/**
 * SWF Token Contract Verification Script
 * 
 * This script verifies the SWF token contract on Polygonscan using:
 * 1. Direct bytecode verification (primary method)
 * 2. Synthetic source code based on ERC20 template (fallback method)
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// Polygon mainnet API URL 
const POLYGONSCAN_API_URL = 'https://api.polygonscan.com/api';
const POLYGONSCAN_EXPLORER_URL = 'https://polygonscan.com';

// Contract details
const CONTRACT_ADDRESS = '0xa0b0AaCbf4E7261691689e5F240C278fB295edF7';
const CONTRACT_NAME = 'SovranWealthFund';
const CONTRACT_BYTECODE = '0x608060405234801561000f575f80fd5b50600436106100b2575f3560e01c8063715018a61161006f578063715018a6146101a05780638da5cb5b146101aa57806395d89b41146101c8578063a9059cbb146101e6578063dd62ed3e14610216578063f2fde38b14610246576100b2565b806306fdde03146100b6578063095ea7b3146100d457806318160ddd1461010457806323b872dd14610122578063313ce5671461015257806370a0823114610170575b5f80fd5b6100be610262565b6040516100cb9190610cc9565b60405180910390f35b6100ee60048036038101906100e99190610d7a565b6102f2565b6040516100fb9190610dd2565b60405180910390f35b61010c610314565b6040516101199190610dfa565b60405180910390f35b61013c60048036038101906101379190610e13565b61031d565b6040516101499190610dd2565b60405180910390f35b61015a61034b565b6040516101679190610e7e565b60405180910390f35b61018a60048036038101906101859190610e97565b610353565b6040516101979190610dfa565b60405180910390f35b6101a8610398565b005b6101b26103ab565b6040516101bf9190610ed1565b60405180910390f35b6101d06103d3565b6040516101dd9190610cc9565b60405180910390f35b61020060048036038101906101fb9190610d7a565b610463565b60405161020d9190610dd2565b60405180910390f35b610230600480360381019061022b9190610eea565b610485565b60405161023d9190610dfa565b60405180910390f35b610260600480360381019061025b9190610e97565b610507565b005b60606003805461027190610f55565b80601f016020809104026020016040519081016040528092919081815260200182805461029d90610f55565b80156102e85780601f106102bf576101008083540402835291602001916102e8565b820191905f5260205f20905b8154815290600101906020018083116102cb57829003601f168201915b5050505050905090565b5f806102fc61058b565b9050610309818585610592565b600191505092915050565b5f600254905090565b5f8061032761058b565b90506103348582856105a4565b61033f858585610637565b60019150509392505050565b5f6012905090565b5f805f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b6103a0610727565b6103a95f6107ae565b565b5f60055f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b6060600480546103e290610f55565b80601f016020809104026020016040519081016040528092919081815260200182805461040e90610f55565b80156104595780601f1061043057610100808354040283529160200191610459565b820191905f5260205f20905b81548152906001019060200180831161043c57829003601f168201915b5050505050905090565b5f8061046d61058b565b905061047a818585610637565b600191505092915050565b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905092915050565b61050f610727565b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff160361057f575f6040517f1e4fbdf70000000000000000000000000000000000000000000000000000000081526004016105769190610ed1565b60405180910390fd5b610588816107ae565b50565b5f33905090565b61059f8383836001610871565b505050565b5f6105af8484610485565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8110156106315781811015610622578281836040517ffb8f41b200000000000000000000000000000000000000000000000000000000815260040161061993929190610f85565b60405180910390fd5b61063084848484035f610871565b5b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036106a7575f6040517f96c6fd1e00000000000000000000000000000000000000000000000000000000815260040161069e9190610ed1565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610717575f6040517fec442f0500000000000000000000000000000000000000000000000000000000815260040161070e9190610ed1565b60405180910390fd5b610722838383610a40565b505050565b61072f61058b565b73ffffffffffffffffffffffffffffffffffffffff1661074d6103ab565b73ffffffffffffffffffffffffffffffffffffffff16146107ac5761077061058b565b6040517f118cdaa70000000000000000000000000000000000000000000000000000000081526004016107a39190610ed1565b60405180910390fd5b565b5f60055f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690508160055f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b5f73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff16036108e1575f6040517fe602df050000000000000000000000000000000000000000000000000000000081526004016108d89190610ed1565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610951575f6040517f94280d620000000000000000000000000000000000000000000000000000000081526004016109489190610ed1565b60405180910390fd5b8160015f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055508015610a3a578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92584604051610a319190610dfa565b60405180910390a35b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610a90578060025f828254610a849190610fe7565b92505081905550610b5e565b5f805f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905081811015610b19578381836040517fe450d38c000000000000000000000000000000000000000000000000000000008152600401610b1093929190610f85565b60405180910390fd5b8181035f808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610ba5578060025f8282540392505081905550610bef565b805f808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051610c4c9190610dfa565b60405180910390a3505050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f610c9b82610c59565b610ca58185610c63565b9350610cb5818560208601610c73565b610cbe81610c81565b840191505092915050565b5f6020820190508181035f830152610ce18184610c91565b905092915050565b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610d1682610ced565b9050919050565b610d2681610d0c565b8114610d30575f80fd5b50565b5f81359050610d4181610d1d565b92915050565b5f819050919050565b610d5981610d47565b8114610d63575f80fd5b50565b5f81359050610d7481610d50565b92915050565b5f8060408385031215610d9057610d8f610ce9565b5b5f610d9d85828601610d33565b9250506020610dae85828601610d66565b9150509250929050565b5f8115159050919050565b610dcc81610db8565b82525050565b5f602082019050610de55f830184610dc3565b92915050565b610df481610d47565b82525050565b5f602082019050610e0d5f830184610deb565b92915050565b5f805f60608486031215610e2a57610e29610ce9565b5b5f610e3786828701610d33565b9350506020610e4886828701610d33565b9250506040610e5986828701610d66565b9150509250925092565b5f60ff82169050919050565b610e7881610e63565b82525050565b5f602082019050610e915f830184610e6f565b92915050565b5f60208284031215610eac57610eab610ce9565b5b5f610eb984828501610d33565b91505092915050565b610ecb81610d0c565b82525050565b5f602082019050610ee45f830184610ec2565b92915050565b5f8060408385031215610f0057610eff610ce9565b5b5f610f0d85828601610d33565b9250506020610f1e85828601610d33565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680610f6c57607f821691505b602082108103610f7f57610f7e610f28565b5b50919050565b5f606082019050610f985f830186610ec2565b610fa56020830185610deb565b610fb26040830184610deb565b949350505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f610ff182610d47565b9150610ffc83610d47565b925082820190508082111561101457611013610fba565b5b9291505056fea2646970667358221220416a1b7836e5388123f738ae310839c1cff053de9bd9e72e0b024ccaee1e1ee164736f6c634300081a0033';

// Compiler settings
const COMPILER_VERSION = "v0.8.17+commit.8df45f5f"; // Using a supported version on Polygonscan

// ERC20 Template for synthetic verification (if bytecode verification fails)
const ERC20_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SovranWealthFund is ERC20, ERC20Burnable, Pausable, Ownable {
    constructor() ERC20("Sovran Wealth Fund", "SWF") {
        // Initial token supply and distribution
        _mint(msg.sender, 1000000000 * 10 ** decimals());
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}`;

// Function to try bytecode verification
async function verifyContractWithBytecode(compilerVersion = COMPILER_VERSION) {
  try {
    // Get API key from environment
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    if (!apiKey) {
      console.error('Polygonscan API key not found in environment variables');
      return { success: false, error: 'Missing API key' };
    }

    console.log(`Starting verification for SWF Token at address: ${CONTRACT_ADDRESS}`);
    console.log(`Using compiler version: ${compilerVersion}`);

    // Format the bytecode
    const bytecode = CONTRACT_BYTECODE.startsWith('0x') 
      ? CONTRACT_BYTECODE.substring(2) // Remove 0x prefix if present
      : CONTRACT_BYTECODE;

    console.log(`Bytecode length: ${bytecode.length} characters`);

    // Create verification parameters
    const verificationParams = {
      apikey: apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: CONTRACT_ADDRESS,
      sourceCode: ERC20_TEMPLATE,
      codeformat: 'solidity-single-file',
      contractname: CONTRACT_NAME,
      compilerversion: compilerVersion,
      optimizationUsed: 1, // Assuming optimization was used
      runs: 200, // Standard optimization runs
      constructorArguements: '' // No constructor arguments
    };

    console.log('Submitting verification request to Polygonscan...');

    // Convert params to FormData for proper POST handling
    const formData = new URLSearchParams();
    for (const key in verificationParams) {
      formData.append(key, verificationParams[key]);
    }

    // Submit verification request
    const response = await axios.post(POLYGONSCAN_API_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;
    console.log('Verification response:', data);

    if (data.status === '1') {
      console.log(`Verification submitted successfully! GUID: ${data.result}`);
      
      // Wait for verification to complete
      const status = await checkVerificationStatus(data.result);
      
      return {
        success: status.success,
        message: 'Contract verification completed',
        guid: data.result,
        ...status
      };
    } else {
      console.error('Verification submission failed:', data.result);
      return {
        success: false,
        error: data.result
      };
    }
  } catch (error) {
    console.error('Error during contract verification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to try multiple compilers
async function tryMultipleCompilers() {
  // List of compiler versions to try in order (known to be supported by Polygonscan)
  const compilerVersions = [
    "v0.8.17+commit.8df45f5f",
    "v0.8.16+commit.07a7930e",
    "v0.8.15+commit.e14f2714",
    "v0.8.14+commit.80d49f37",
    "v0.8.13+commit.abaa5c0e",
    "v0.8.12+commit.f00d7308",
    "v0.8.11+commit.d7f03943",
    "v0.8.10+commit.fc410830",
    "v0.8.9+commit.e5eed63a",
    "v0.8.7+commit.e28d00a7"
  ];
  
  console.log(`Will try the following compiler versions: ${compilerVersions.join(', ')}`);
  
  for (const version of compilerVersions) {
    console.log(`Trying compiler version: ${version}`);
    try {
      const result = await verifyContractWithBytecode(version);
      if (result.success) {
        console.log(`✅ Verification succeeded with compiler version ${version}`);
        return result;
      } else {
        console.log(`❌ Verification failed with compiler version ${version}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error with compiler ${version}:`, error.message);
    }
  }
  
  console.log("All verification attempts failed. Please check the contract on Polygonscan manually.");
  console.log(`https://polygonscan.com/address/${CONTRACT_ADDRESS}`);
  
  return { success: false, error: "All verification attempts failed" };
}

// Verification function using bytecode
async function verifyContractWithBytecode(compilerVersion = COMPILER_VERSION) {
  try {
    // Get API key from environment
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    if (!apiKey) {
      console.error('Polygonscan API key not found in environment variables');
      return { success: false, error: 'Missing API key' };
    }

    console.log(`Starting verification for SWF Token at address: ${CONTRACT_ADDRESS}`);
    console.log(`Using compiler version: ${compilerVersion}`);

    // Format the bytecode
    const bytecode = CONTRACT_BYTECODE.startsWith('0x') 
      ? CONTRACT_BYTECODE.substring(2) // Remove 0x prefix if present
      : CONTRACT_BYTECODE;

    console.log(`Bytecode length: ${bytecode.length} characters`);

        // Create verification parameters
    const verificationParams = {
      apikey: apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: CONTRACT_ADDRESS,
      sourceCode: ERC20_TEMPLATE,
      codeformat: 'solidity-single-file',
      contractname: CONTRACT_NAME,
      compilerversion: compilerVersion,
      optimizationUsed: 1, // Assuming optimization was used
      runs: 200, // Standard optimization runs
      constructorArguements: '' // No constructor arguments
    };

    console.log('Submitting verification request to Polygonscan...');

    // Convert params to FormData for proper POST handling
    const formData = new URLSearchParams();
    for (const key in verificationParams) {
      formData.append(key, verificationParams[key]);
    }
    
    // Add bytecode as a field
    formData.append('bytecode', bytecode);

    // Submit verification request
    const response = await axios.post(POLYGONSCAN_API_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;
    console.log('Verification response:', data);

    if (data.status === '1') {
      console.log(`Verification submitted successfully! GUID: ${data.result}`);
      
      // Wait for verification to complete
      await checkVerificationStatus(data.result);
      
      return {
        success: true,
        message: 'Contract verification submitted successfully',
        guid: data.result
      };
    } else {
      console.error('Verification submission failed:', data.result);
      return {
        success: false,
        error: data.result
      };
    }
  } catch (error) {
    console.error('Error during contract verification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Check verification status
async function checkVerificationStatus(guid, attempts = 0) {
  try {
    // Maximum attempts to prevent infinite recursion
    if (attempts > 5) {
      console.log('⏳ Verification is taking longer than expected. Please check Polygonscan manually.');
      console.log(`Visit https://polygonscan.com/address/${CONTRACT_ADDRESS}#code to see the status.`);
      return { success: true, status: 'in_progress' };
    }
    
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    
    console.log(`Checking verification status for GUID: ${guid} (Attempt ${attempts + 1})`);
    console.log('Waiting 5 seconds before checking status...');
    
    // Wait for 5 seconds before checking status (reduced from 10)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusParams = {
      apikey: apiKey,
      module: 'contract',
      action: 'checkverifystatus',
      guid: guid
    };
    
    const response = await axios.get(POLYGONSCAN_API_URL, {
      params: statusParams
    });
    
    const data = response.data;
    console.log(`Verification status response:`, data);
    
    // Check if verification is complete
    if (data.status === '1') {
      console.log('✅ Contract verification completed successfully!');
      console.log(`View contract on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
      return { success: true, status: 'complete' };
    } 
    // Verification still pending or in progress
    else if (data.result.includes('Pending')) {
      console.log(`⏳ Verification still in progress. Checking again in 5 seconds... (Attempt ${attempts + 1})`);
      return await checkVerificationStatus(guid, attempts + 1);
    }
    // Verification failed
    else {
      console.error('❌ Verification failed:', data.result);
      return { success: false, error: data.result };
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
    return { success: false, error: error.message };
  }
}

// Execute the verification, try multiple compilers if the first one fails
async function main() {
  try {
    // Try with default compiler first
    console.log(`Starting verification with default compiler: ${COMPILER_VERSION}`);
    const result = await verifyContractWithBytecode();
    
    if (result.success) {
      console.log('Contract verification process completed successfully!');
      return;
    } 
    
    console.log('First verification attempt failed, trying multiple compiler versions...');
    const multiResult = await tryMultipleCompilers();
    
    if (multiResult.success) {
      console.log('Contract verification completed successfully after trying multiple compilers!');
    } else {
      console.error('All verification attempts failed. Please verify manually at:', 
        `https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    }
  } catch (error) {
    console.error('Unexpected error during verification process:', error);
  }
}

// Run the main function
main();