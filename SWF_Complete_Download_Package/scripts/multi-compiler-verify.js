/**
 * Multi-Compiler SWF Token Verification Script
 * 
 * This script correctly handles the mix of Solidity 0.8.17 and 0.8.20 code
 * to properly verify the SWF token contract.
 */
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// The contract address to verify
const SWF_CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";

// The contract name and path
const CONTRACT_NAME = "SovranWealthFund";
const CONTRACT_PATH = "contracts/verified/SovranWealthFund.sol";
const CONTRACT_PATH_FLAT = "contracts/verified/SovranWealthFund.flat.sol";

/**
 * Attempt verification directly with Hardhat's verify task
 */
function verifyWithHardhat() {
  console.log(`\nAttempting verification with Hardhat's multi-compiler setup...`);
  console.log(`Contract: ${CONTRACT_NAME} at ${SWF_CONTRACT_ADDRESS}`);
  
  try {
    // Configure a more detailed logger to see verification progress
    process.env.HARDHAT_VERBOSE = true;
    
    // Execute hardhat verify
    const output = execSync(
      `npx hardhat verify --contract ${CONTRACT_PATH}:${CONTRACT_NAME} --network polygon ${SWF_CONTRACT_ADDRESS}`,
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
 * Try verification with flattened source
 */
function verifyWithFlattened() {
  console.log(`\nAttempting verification with flattened source...`);
  
  try {
    // First, check if flattened source exists
    if (!fs.existsSync(CONTRACT_PATH_FLAT)) {
      console.log(`Flattened source file not found. Generating...`);
      
      // Generate flattened source
      const flatOutput = execSync(
        `npx hardhat flatten ${CONTRACT_PATH} > ${CONTRACT_PATH_FLAT}`,
        { encoding: 'utf8' }
      );
      
      console.log(`Flattened source generated.`);
    }
    
    // Clean up license identifiers in the flattened file
    console.log('Cleaning up duplicate license identifiers...');
    
    let source = fs.readFileSync(CONTRACT_PATH_FLAT, 'utf8');
    const licensePattern = /\/\/ SPDX-License-Identifier: MIT\n/g;
    const matches = source.match(licensePattern) || [];
    
    if (matches.length > 1) {
      // Keep the first one, remove the rest
      let firstOccurrence = true;
      source = source.replace(licensePattern, match => {
        if (firstOccurrence) {
          firstOccurrence = false;
          return match;
        }
        return '';
      });
      
      fs.writeFileSync(CONTRACT_PATH_FLAT, source);
      console.log(`Removed ${matches.length - 1} duplicate license identifiers.`);
    }
    
    // Fix pragma statements
    console.log('Harmonizing pragma statements...');
    
    // Replace all pragma statements with the version needed for verification
    const pragmaPattern = /pragma solidity \^0\.8\.\d+;/g;
    source = source.replace(pragmaPattern, 'pragma solidity ^0.8.17;');
    
    fs.writeFileSync(CONTRACT_PATH_FLAT, source);
    console.log(`Harmonized pragmas to use ^0.8.17`);
    
    // Now verify with the flattened source
    console.log('Submitting flattened source for verification...');
    
    const verifyCommand = `npx hardhat verify --contract ${CONTRACT_PATH_FLAT}:${CONTRACT_NAME} --network polygon ${SWF_CONTRACT_ADDRESS}`;
    
    console.log(`Running: ${verifyCommand}`);
    
    const output = execSync(verifyCommand, { encoding: 'utf8' });
    
    console.log('\n===== FLATTENED VERIFICATION OUTPUT =====\n');
    console.log(output);
    
    if (output.includes('Successfully verified') || output.includes('Already verified')) {
      console.log('\n✅ Verification successful with flattened source!');
      return true;
    } else {
      console.log('\n❌ Verification failed with flattened source. See output above for details.');
      return false;
    }
  } catch (error) {
    console.error(`Error during flattened verification: ${error.message}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

/**
 * Create a manual verification data file to use with Polygonscan UI
 */
function createManualVerificationData() {
  console.log(`\nCreating manual verification data file for Polygonscan UI submission...`);
  
  try {
    // Make sure we have a flattened file
    if (!fs.existsSync(CONTRACT_PATH_FLAT)) {
      console.log(`Flattened source file not found. Generate it first.`);
      return false;
    }
    
    // Create a JSON file with all the data needed for manual verification
    const verificationData = {
      contractAddress: SWF_CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      compilerVersion: 'v0.8.17+commit.8df45f5f',
      optimizationUsed: true,
      runs: 200,
      constructorArguments: '',
      evmVersion: 'london',
      licenseType: '3' // MIT License
    };
    
    // Read the flattened source
    const source = fs.readFileSync(CONTRACT_PATH_FLAT, 'utf8');
    
    // Create the verification package
    const outputPath = path.join(__dirname, '../manual-verification-data.json');
    
    fs.writeFileSync(
      outputPath,
      JSON.stringify({
        ...verificationData,
        sourceCode: source
      }, null, 2)
    );
    
    console.log(`\n✅ Manual verification data saved to: ${outputPath}`);
    console.log('\nUse this file for manual verification through Polygonscan UI:');
    console.log('1. Go to https://polygonscan.com/address/' + SWF_CONTRACT_ADDRESS + '#code');
    console.log('2. Click "Verify & Publish"');
    console.log('3. Select "Solidity (Single file)" as Contract Type');
    console.log('4. Fill in the form with the information in manual-verification-data.json');
    console.log('5. Copy the source code from manual-verification-data.json into the editor');
    console.log('6. Submit and verify');
    
    return true;
  } catch (error) {
    console.error(`Error creating manual verification data: ${error.message}`);
    return false;
  }
}

/**
 * Main function to run all verification methods
 */
async function main() {
  console.log('SWF Multi-Compiler Token Verification');
  console.log('-------------------------------------');
  
  // Check environment
  if (!process.env.POLYGONSCAN_API_KEY) {
    console.error('❌ POLYGONSCAN_API_KEY not set in .env file');
    process.exit(1);
  }
  
  // Try verification methods in order
  console.log('\n1️⃣ Trying direct verification with multi-compiler setup');
  const directResult = verifyWithHardhat();
  
  if (!directResult) {
    console.log('\n2️⃣ Trying verification with flattened source');
    const flattenedResult = verifyWithFlattened();
    
    if (!flattenedResult) {
      console.log('\n3️⃣ Creating data for manual verification');
      createManualVerificationData();
    }
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });