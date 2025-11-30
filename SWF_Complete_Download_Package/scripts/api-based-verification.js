/**
 * Polygonscan API-Based Contract Verification Script
 * 
 * This script attempts to verify a contract on Polygonscan using
 * their API directly instead of the web interface.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const API_URL = "https://api.polygonscan.com/api";
const CONTRACT_CODE_PATH = path.resolve(__dirname, '../contracts/verified/SovranWealthFund.flat.sol');

async function main() {
  if (!POLYGONSCAN_API_KEY) {
    console.error("Error: POLYGONSCAN_API_KEY is not set in .env file");
    process.exit(1);
  }

  console.log("Reading contract source from", CONTRACT_CODE_PATH);
  const sourceCode = fs.readFileSync(CONTRACT_CODE_PATH, 'utf8');
  console.log(`Source code loaded (${sourceCode.length} characters)`);

  console.log("\nPreparing API verification request...");
  
  // Create form data
  const formData = new FormData();
  formData.append('apikey', POLYGONSCAN_API_KEY);
  formData.append('module', 'contract');
  formData.append('action', 'verifysourcecode');
  formData.append('contractaddress', CONTRACT_ADDRESS);
  formData.append('sourceCode', sourceCode);
  formData.append('codeformat', 'solidity-single-file');
  formData.append('contractname', 'SovranWealthFund');
  formData.append('compilerversion', 'v0.8.17+commit.8df45f5f');
  formData.append('optimizationUsed', '1'); // 1 for yes, 0 for no
  formData.append('runs', '200');
  formData.append('licenseType', '1'); // 1 = No License (None)
  
  console.log("API request configuration:");
  console.log("- Contract address:", CONTRACT_ADDRESS);
  console.log("- Compiler version: v0.8.17+commit.8df45f5f");
  console.log("- Optimization: Yes (200 runs)");
  console.log("- License type: No License (None)");
  
  try {
    console.log("\nSubmitting verification request to Polygonscan API...");
    const response = await axios.post(API_URL, formData, {
      headers: formData.getHeaders()
    });
    
    console.log("\nAPI Response:", JSON.stringify(response.data, null, 2));
    
    if (response.data.status === '1') {
      console.log("\n✅ Verification submission successful!");
      console.log("Verification GUID:", response.data.result);
      console.log("Wait a few moments and check the verification status with:");
      console.log(`node check-verification-status.js ${response.data.result}`);
      
      // Create verification status checker script
      const checkerScriptPath = path.resolve(__dirname, 'check-verification-status.js');
      const checkerScript = `
/**
 * Polygonscan Contract Verification Status Checker
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const API_URL = "https://api.polygonscan.com/api";

async function checkStatus(guid) {
  if (!POLYGONSCAN_API_KEY) {
    console.error("Error: POLYGONSCAN_API_KEY is not set in .env file");
    process.exit(1);
  }
  
  try {
    console.log(\`Checking verification status for GUID: \${guid}...\`);
    
    const response = await axios.get(API_URL, {
      params: {
        apikey: POLYGONSCAN_API_KEY,
        module: 'contract',
        action: 'checkverifystatus',
        guid: guid
      }
    });
    
    console.log("Response:", JSON.stringify(response.data, null, 2));
    
    if (response.data.status === '1') {
      console.log("\\n✅ Contract verification successful!");
      console.log("View the verified contract at:");
      console.log(\`https://polygonscan.com/address/${CONTRACT_ADDRESS}#code\`);
    } else {
      console.log("\\n❌ Contract verification not complete or failed.");
      console.log("Message:", response.data.result);
      console.log("You can check again in a moment, or view the status on Polygonscan.");
    }
  } catch (error) {
    console.error("Error checking verification status:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

// Get GUID from command line argument or use default
const guid = process.argv[2];
if (!guid) {
  console.error("Error: Please provide the verification GUID as a command line argument");
  console.error("Usage: node check-verification-status.js <guid>");
  process.exit(1);
}

checkStatus(guid).catch(console.error);
      `.replace('${CONTRACT_ADDRESS}', CONTRACT_ADDRESS);
      
      fs.writeFileSync(checkerScriptPath, checkerScript);
      console.log(`\nCreated verification status checker script at ${checkerScriptPath}`);
    } else {
      console.log("\n❌ Verification submission failed");
      console.log("Error:", response.data.result);
    }
  } catch (error) {
    console.error("Error submitting verification:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

main().catch(console.error);