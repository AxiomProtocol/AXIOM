/**
 * Check Bytecode Verification Status
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const GUID = "hyldrh6dxnravc1zthcfkhnfshuc8q3xquf2zx5tskjlvkdxa5";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "F9B5RIP6IB9WTR4FZD6NQS3A5YEHBU6JUB";

async function checkStatus() {
  try {
    console.log(`Checking verification status for GUID: ${GUID}`);
    
    const statusParams = new URLSearchParams();
    statusParams.append('apikey', POLYGONSCAN_API_KEY);
    statusParams.append('module', 'contract');
    statusParams.append('action', 'checkverifystatus');
    statusParams.append('guid', GUID);
    
    const statusResponse = await axios.get(`https://api.polygonscan.com/api?${statusParams}`);
    
    console.log(`Verification status: ${statusResponse.data.result}`);
    
    if (statusResponse.data.result === 'Pending in queue') {
      console.log("Verification is still pending. Try checking again in a minute.");
    } else if (statusResponse.data.result.includes('Success')) {
      console.log("\n✅ Success! Contract verification completed successfully!");
      console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else {
      console.log("\n❌ Verification failed or had issues.");
      
      // Also check if the contract is already verified by fetching contract source code
      console.log("\nChecking if contract is already verified...");
      
      const sourceParams = new URLSearchParams();
      sourceParams.append('apikey', POLYGONSCAN_API_KEY);
      sourceParams.append('module', 'contract');
      sourceParams.append('action', 'getsourcecode');
      sourceParams.append('address', CONTRACT_ADDRESS);
      
      const sourceResponse = await axios.get(`https://api.polygonscan.com/api?${sourceParams}`);
      
      if (sourceResponse.data.status === '1' && 
          sourceResponse.data.result[0].ABI !== "Contract source code not verified") {
        console.log("\n✅ Success! The contract is verified on Polygonscan!");
        console.log(`Contract Name: ${sourceResponse.data.result[0].ContractName}`);
        console.log(`View on Polygonscan: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
      } else {
        console.log("\nThe contract is not verified. Please use manual verification:");
        console.log("Follow the instructions in DETAILED_POLYGONSCAN_VERIFICATION.md");
      }
    }
  } catch (error) {
    console.error("Error checking verification status:", error.message);
  }
}

checkStatus().catch(console.error);