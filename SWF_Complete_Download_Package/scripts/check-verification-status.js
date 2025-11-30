/**
 * Check Verification Status Script
 * 
 * This script checks the status of a verification request on Polygonscan.
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const GUID = "q8p6c74jqsnrcy82ybw6bq3yldttgt238gggrlsndsp4ewchqb";

// Get Polygonscan API key
if (!process.env.POLYGONSCAN_API_KEY) {
  console.error("ERROR: POLYGONSCAN_API_KEY not found in .env file");
  console.log("Please add your Polygonscan API key to the .env file:");
  console.log("POLYGONSCAN_API_KEY=your_api_key_here");
  process.exit(1);
}

const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const POLYGONSCAN_API_URL = "https://api.polygonscan.com/api";

async function checkVerificationStatus() {
  console.log(`Checking verification status for contract ${CONTRACT_ADDRESS}...`);
  
  try {
    // First check if contract is already verified
    const contractParams = new URLSearchParams();
    contractParams.append('apikey', POLYGONSCAN_API_KEY);
    contractParams.append('module', 'contract');
    contractParams.append('action', 'getsourcecode');
    contractParams.append('address', CONTRACT_ADDRESS);
    
    const contractResponse = await axios.get(`${POLYGONSCAN_API_URL}?${contractParams}`);
    
    if (contractResponse.data.status === '1') {
      if (contractResponse.data.result[0].ABI !== "Contract source code not verified") {
        console.log("✅ SUCCESS: Contract is already verified on Polygonscan!");
        console.log(`Contract Name: ${contractResponse.data.result[0].ContractName}`);
        console.log(`Compiler Version: ${contractResponse.data.result[0].CompilerVersion}`);
        console.log(`You can view it at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
        return;
      } else {
        console.log("Contract is not yet verified on Polygonscan.");
      }
    }
    
    // Check status of specific verification request
    console.log(`Checking status of verification request with GUID: ${GUID}`);
    
    const statusParams = new URLSearchParams();
    statusParams.append('apikey', POLYGONSCAN_API_KEY);
    statusParams.append('module', 'contract');
    statusParams.append('action', 'checkverifystatus');
    statusParams.append('guid', GUID);
    
    const statusResponse = await axios.get(`${POLYGONSCAN_API_URL}?${statusParams}`);
    
    console.log(`Verification Status: ${statusResponse.data.result}`);
    
    if (statusResponse.data.status === '1') {
      console.log('✅ SUCCESS: Contract verification completed successfully!');
      console.log(`View the verified contract at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else if (statusResponse.data.result.includes('Pending')) {
      console.log('⏳ Verification still in progress... Check back later.');
    } else {
      console.log('❌ Verification failed or has issues.');
      console.log('Please try another verification method as described in MANUAL_BYTECODE_VERIFICATION_GUIDE.md');
    }
  } catch (error) {
    console.error('Error checking verification status:', error.message);
    process.exit(1);
  }
}

checkVerificationStatus().catch(console.error);