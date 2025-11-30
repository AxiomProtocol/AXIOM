/**
 * SWF Token Verification Script (Version 0.8.26 Fix)
 * 
 * This script addresses the version mismatch issue where the deployed contract
 * was compiled with Solidity 0.8.26 but our source was using 0.8.17.
 * 
 * Steps:
 * 1. Confirms all files use ^0.8.26
 * 2. Verifies hardhat.config.js includes a 0.8.26 compiler
 * 3. Attempts verification with updated source
 */
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const CONTRACT_NAME = "SovranWealthFund";
const CONTRACT_PATH = "contracts/verified/SovranWealthFund.sol";

/**
 * Checks if all source files have been updated to use 0.8.26
 */
function checkSourceVersions() {
  console.log('\nChecking source file versions...');
  
  const files = [
    'contracts/verified/SovranWealthFund.sol',
    'contracts/verified/interfaces/ISovranWealthFund.sol',
    'contracts/verified/interfaces/IPegManagement.sol',
    'contracts/verified/interfaces/IAggregatorV3Interface.sol'
  ];
  
  const expectedVersion = 'pragma solidity ^0.8.26;';
  let allCorrect = true;
  
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log(`❌ File not found: ${file}`);
      allCorrect = false;
      continue;
    }
    
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes(expectedVersion)) {
      console.log(`❌ File ${file} does not use version 0.8.26`);
      allCorrect = false;
    } else {
      console.log(`✅ File ${file} uses correct version`);
    }
  }
  
  return allCorrect;
}

/**
 * Checks if hardhat.config.js includes 0.8.26 compiler
 */
function checkHardhatConfig() {
  console.log('\nChecking hardhat.config.js...');
  
  const configPath = 'hardhat.config.js';
  
  if (!fs.existsSync(configPath)) {
    console.log('❌ hardhat.config.js not found');
    return false;
  }
  
  const content = fs.readFileSync(configPath, 'utf8');
  
  if (!content.includes('version: "0.8.26"')) {
    console.log('❌ hardhat.config.js does not include a 0.8.26 compiler');
    return false;
  }
  
  console.log('✅ hardhat.config.js includes 0.8.26 compiler');
  
  // Check if the contract override is correct
  if (!content.includes('"contracts/verified/SovranWealthFund.sol": {') || 
      !content.includes('version: "0.8.26",')) {
    console.log('❌ hardhat.config.js does not override SovranWealthFund.sol to use 0.8.26');
    return false;
  }
  
  console.log('✅ hardhat.config.js correctly overrides SovranWealthFund.sol to use 0.8.26');
  return true;
}

/**
 * Attempt verification with the updated config
 */
function attemptVerification() {
  console.log('\nAttempting verification with updated source and config...');
  
  try {
    // Set verbose logging
    process.env.HARDHAT_VERBOSE = true;
    
    // Run the verification
    console.log(`Verifying ${CONTRACT_NAME} at ${CONTRACT_ADDRESS}...`);
    
    const output = execSync(
      `npx hardhat verify --contract ${CONTRACT_PATH}:${CONTRACT_NAME} --network polygon ${CONTRACT_ADDRESS}`,
      { encoding: 'utf8' }
    );
    
    console.log('\n===== VERIFICATION OUTPUT =====\n');
    console.log(output);
    
    if (output.includes('Successfully verified') || output.includes('Already verified')) {
      console.log('\n✅ Verification successful!');
      return true;
    } else {
      console.log('\n❌ Verification failed. See output above for details.');
      return false;
    }
  } catch (error) {
    console.error(`Error during verification: ${error.message}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

/**
 * Create a manual verification file
 */
function createManualVerificationFile() {
  console.log('\nCreating manual verification data for Polygonscan UI...');
  
  try {
    // Generate flattened source if it doesn't exist
    const flattenedPath = "contracts/verified/SovranWealthFund.flat.sol";
    
    if (!fs.existsSync(flattenedPath)) {
      console.log('Flattening source code...');
      execSync(`npx hardhat flatten ${CONTRACT_PATH} > ${flattenedPath}`, { encoding: 'utf8' });
      
      // Fix license headers
      console.log('Fixing license headers...');
      let flattened = fs.readFileSync(flattenedPath, 'utf8');
      const licensePattern = /\/\/ SPDX-License-Identifier: MIT\n/g;
      const matches = flattened.match(licensePattern) || [];
      
      if (matches.length > 1) {
        let firstOccurrence = true;
        flattened = flattened.replace(licensePattern, match => {
          if (firstOccurrence) {
            firstOccurrence = false;
            return match;
          }
          return '';
        });
        
        fs.writeFileSync(flattenedPath, flattened);
        console.log(`Removed ${matches.length - 1} duplicate license identifiers.`);
      }
      
      // Ensure all pragma statements use 0.8.26
      console.log('Harmonizing pragma statements...');
      const pragmaPattern = /pragma solidity \^0\.8\.\d+;/g;
      flattened = flattened.replace(pragmaPattern, 'pragma solidity ^0.8.26;');
      fs.writeFileSync(flattenedPath, flattened);
    }
    
    // Read the flattened source
    const source = fs.readFileSync(flattenedPath, 'utf8');
    
    // Create verification data JSON
    const verificationData = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      compilerVersion: 'v0.8.26+commit.5922562c', // This might need to be adjusted to match the exact version
      optimizationUsed: true,
      runs: 200,
      constructorArguments: '',
      evmVersion: 'london',
      licenseType: '3', // MIT = 3
      sourceCode: source
    };
    
    // Write to file
    const outputPath = 'version-fixed-verification-data.json';
    fs.writeFileSync(outputPath, JSON.stringify(verificationData, null, 2));
    
    console.log(`\n✅ Manual verification data saved to: ${outputPath}`);
    console.log('\nTo manually verify the contract:');
    console.log('1. Go to https://polygonscan.com/address/' + CONTRACT_ADDRESS + '#code');
    console.log('2. Click "Verify & Publish"');
    console.log('3. Select "Solidity (Single file)" as Contract Type');
    console.log('4. Fill in the form with the information in version-fixed-verification-data.json');
    console.log('5. Copy the source code from version-fixed-verification-data.json into the editor');
    console.log('6. Submit and verify');
    
    return true;
  } catch (error) {
    console.error(`Error creating manual verification data: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('SWF Token Verification - Version 0.8.26 Fix');
  console.log('===========================================');
  
  // Check if API key is available
  if (!process.env.POLYGONSCAN_API_KEY) {
    console.error('❌ POLYGONSCAN_API_KEY not set in .env file');
    process.exit(1);
  }
  
  // Step 1: Check all source files for correct version
  const sourcesCorrect = checkSourceVersions();
  if (!sourcesCorrect) {
    console.log('⚠️ Please update all source files to use ^0.8.26 before continuing');
    process.exit(1);
  }
  
  // Step 2: Check hardhat config
  const configCorrect = checkHardhatConfig();
  if (!configCorrect) {
    console.log('⚠️ Please update hardhat.config.js before continuing');
    process.exit(1);
  }
  
  // Step 3: Attempt verification
  const verificationSuccess = attemptVerification();
  
  // If verification failed, create manual verification data
  if (!verificationSuccess) {
    console.log('\nAutomatic verification failed. Creating manual verification data...');
    createManualVerificationFile();
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });