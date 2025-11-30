/**
 * Script to help with manual Polygonscan verification of ThirdWeb-based contracts
 * 
 * This script prepares the necessary verification parameters for Polygonscan
 * and provides guidance for verifying the SovranWealthFund contract.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

async function main() {
  try {
    console.log('=====================================================');
    console.log('SovranWealthFund Contract Verification Helper');
    console.log('=====================================================');

    // Contract information
    const contractAddress = '0xa0b0AaCbf4E7261691689e5F240C278fB295edF7';
    const contractName = 'SovranWealthFund';
    
    // Load the flattened contract
    const flattenedPath = path.join(__dirname, '../contracts/SovranWealthFundThirdWebFlat.sol');
    if (!fs.existsSync(flattenedPath)) {
      console.error('ERROR: Flattened contract file not found. Please make sure the file exists at:', flattenedPath);
      return;
    }
    
    const contractSource = fs.readFileSync(flattenedPath, 'utf8');
    console.log(`✓ Loaded flattened contract (${contractSource.length} bytes)`);
    
    // Verification parameters
    console.log('\nPolygonscan Verification Parameters:');
    console.log('------------------------------------------');
    console.log('Contract Address:', contractAddress);
    console.log('Contract Name:', contractName);
    console.log('Compiler Version: v0.8.20+commit.a1b79de6');
    console.log('Optimization: Yes');
    console.log('Optimization Runs: 200');
    console.log('License Type: MIT');
    
    // Manual verification instructions
    console.log('\nManual Verification Instructions:');
    console.log('------------------------------------------');
    console.log('1. Go to https://polygonscan.com/address/' + contractAddress + '#code');
    console.log('2. Click on "Verify and Publish"');
    console.log('3. Select "Solidity (Single file)" option');
    console.log('4. Fill in the form with the parameters shown above');
    console.log('5. Paste the ENTIRE content of SovranWealthFundThirdWebFlat.sol');
    console.log('6. Select the Contract Name: "SovranWealthFund"');
    console.log('7. Leave the Constructor Arguments field empty');
    console.log('8. Click "Verify and Publish"');
    
    // Automatic verification attempt (if API key is provided)
    if (process.env.POLYGONSCAN_API_KEY) {
      console.log('\nAttempting automatic verification with Polygonscan API...');
      
      try {
        // Note: This is simplified. Complete API verification requires more complex handling
        const apiUrl = 'https://api.polygonscan.com/api';
        const response = await axios.post(apiUrl, {
          apikey: process.env.POLYGONSCAN_API_KEY,
          module: 'contract',
          action: 'verifysourcecode',
          contractaddress: contractAddress,
          sourceCode: contractSource,
          codeformat: 'solidity-single-file',
          contractname: contractName,
          compilerversion: 'v0.8.20+commit.a1b79de6',
          optimizationUsed: 1,
          runs: 200,
          licenseType: 3, // MIT License
        });
        
        console.log('API Response:', response.data);
        if (response.data.status === '1') {
          console.log('✓ Verification submitted successfully. Check status on Polygonscan.');
        } else {
          console.log('✗ Verification submission failed. Please try manual verification.');
        }
      } catch (error) {
        console.error('Error during automatic verification:', error.message);
        console.log('Please proceed with manual verification instead.');
      }
    } else {
      console.log('\nNote: POLYGONSCAN_API_KEY not found in .env file.');
      console.log('To enable automatic verification, add your Polygonscan API key to the .env file.');
    }

    console.log('\nIf you encounter any issues, please refer to the VERIFICATION_THIRDWEB_GUIDE.md');
    console.log('=====================================================');
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });