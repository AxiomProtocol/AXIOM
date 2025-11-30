/**
 * Check Verification Progress
 * 
 * This script checks the status of a pending contract verification on Polygonscan.
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const GUID = "db9c6gnpynqvxewhl8z3zjxz3vxkck1xyaeahikn8mhtw5vlag";

// API Key
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "F9B5RIP6IB9WTR4FZD6NQS3A5YEHBU6JUB";
console.log(`Using Polygonscan API Key: ${POLYGONSCAN_API_KEY.substring(0, 5)}...${POLYGONSCAN_API_KEY.substring(POLYGONSCAN_API_KEY.length - 4)}`);

async function checkVerificationStatus() {
  try {
    console.log(`Checking verification status for contract ${CONTRACT_ADDRESS}...`);

    // First, check if contract is already verified
    const contractParams = new URLSearchParams();
    contractParams.append('apikey', POLYGONSCAN_API_KEY);
    contractParams.append('module', 'contract');
    contractParams.append('action', 'getsourcecode');
    contractParams.append('address', CONTRACT_ADDRESS);
    
    const contractResponse = await axios.get(`https://api.polygonscan.com/api?${contractParams}`);
    
    if (contractResponse.data.status === '1') {
      console.log("Contract details from Polygonscan:");
      console.log(` - Contract Name: ${contractResponse.data.result[0].ContractName}`);
      console.log(` - Compiler Version: ${contractResponse.data.result[0].CompilerVersion}`);
      
      if (contractResponse.data.result[0].ABI !== "Contract source code not verified") {
        console.log("\n✅ SUCCESS: Contract is already verified on Polygonscan!");
        console.log(`You can view it at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
        return;
      } else {
        console.log("\nContract is not yet verified on Polygonscan.");
      }
    }
    
    // Then check status of specific verification request
    console.log(`\nChecking status of verification request with GUID: ${GUID}`);
    
    const statusParams = new URLSearchParams();
    statusParams.append('apikey', POLYGONSCAN_API_KEY);
    statusParams.append('module', 'contract');
    statusParams.append('action', 'checkverifystatus');
    statusParams.append('guid', GUID);
    
    const statusResponse = await axios.get(`https://api.polygonscan.com/api?${statusParams}`);
    
    console.log(`\nVerification Status: ${statusResponse.data.result}`);
    
    if (statusResponse.data.status === '1') {
      console.log('\n✅ SUCCESS: Contract verification completed successfully!');
      console.log(`View the verified contract at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else if (statusResponse.data.result.includes('Pending')) {
      console.log('\n⏳ Verification still in progress... Check back later.');
      console.log(`You can periodically check: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else {
      console.log('\n❌ Verification failed or has issues.');
      console.log('Please try the manual bytecode verification method:');
      console.log('1. Go to https://polygonscan.com/address/' + CONTRACT_ADDRESS + '#code');
      console.log('2. Click "Verify and Publish"');
      console.log('3. Select "Solidity (Bytecode Source)" as the verification method');
      console.log('4. Fill in the contract details and submit');
    }
  } catch (error) {
    console.error('Error checking verification status:', error.message);
    process.exit(1);
  }
}

checkVerificationStatus().catch(console.error);