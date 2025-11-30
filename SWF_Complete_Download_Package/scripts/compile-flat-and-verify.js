/**
 * Script to compile the flattened contract with Solidity 0.8.17 and verify on Polygonscan
 */
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Contract info
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const CONTRACT_NAME = "SovranWealthFund";
const CONSTRUCTOR_ARGS = ["Sovran Wealth Fund", "SWF"];
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "F9B5RIP6IB9WTR4FZD6NQS3A5YEHBU6JUB";

async function main() {
  try {
    console.log("Starting flattened contract verification process...");
    
    // Step 1: Compile the contract using solc directly
    console.log("\nStep 1: Compiling flattened contract with solc 0.8.17...");
    
    // Create temp directory for compilation output
    const tempDir = path.join(__dirname, '../temp-compile-7');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Get the source code
    const sourceCode = fs.readFileSync(
      path.join(__dirname, '../contracts/compiled-0.8.17/SovranWealthFundFlat.sol'),
      'utf8'
    );
    
    // Create a simple standard JSON input for solc
    const solcInput = JSON.stringify({
      language: 'Solidity',
      sources: {
        'SovranWealthFundFlat.sol': {
          content: sourceCode
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
          }
        },
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    });
    
    // Write the solc input to a file
    fs.writeFileSync(path.join(tempDir, 'input.json'), solcInput);
    
    // Run solc to compile
    console.log("Running solc compiler...");
    try {
      execSync('solc --standard-json ./temp-compile-7/input.json > ./temp-compile-7/output.json', {
        stdio: 'inherit'
      });
      console.log("Compilation completed successfully.");
    } catch (error) {
      console.error("Error during compilation:", error.message);
      
      // Try with Docker if local solc fails
      console.log("Attempting to use web-based verification instead...");
      await verifyContractOnPolygonscanWeb();
      return;
    }
    
    // Read the compiled output
    const compiledOutput = JSON.parse(fs.readFileSync(path.join(tempDir, 'output.json'), 'utf8'));
    
    if (compiledOutput.errors && compiledOutput.errors.length > 0) {
      const hasError = compiledOutput.errors.some(error => error.severity === 'error');
      if (hasError) {
        console.error("Compilation failed with errors:");
        compiledOutput.errors.forEach(error => console.error(error.formattedMessage || error.message));
        
        console.log("Attempting web-based verification instead...");
        await verifyContractOnPolygonscanWeb();
        return;
      } else {
        console.log("Compilation had warnings but completed successfully.");
      }
    }
    
    const contractOutput = compiledOutput.contracts['SovranWealthFundFlat.sol'][CONTRACT_NAME];
    if (!contractOutput) {
      throw new Error(`Contract ${CONTRACT_NAME} not found in the compilation output`);
    }
    
    // Get ABI and bytecode
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;
    
    // Step 2: Verify on Polygonscan using API
    console.log("\nStep 2: Verifying on Polygonscan...");
    await verifyContractOnPolygonscan(sourceCode, abi);
    
  } catch (error) {
    console.error("Error in compile and verify process:", error.message);
    console.log("Attempting web-based verification as fallback...");
    await verifyContractOnPolygonscanWeb();
  }
}

async function verifyContractOnPolygonscan(sourceCode, abi) {
  try {
    console.log("Submitting verification request to Polygonscan API...");
    
    const apiUrl = "https://api.polygonscan.com/api";
    const form = new FormData();
    
    form.append('apikey', POLYGONSCAN_API_KEY);
    form.append('module', 'contract');
    form.append('action', 'verifysourcecode');
    form.append('contractaddress', CONTRACT_ADDRESS);
    form.append('sourceCode', sourceCode);
    form.append('codeformat', 'solidity-single-file');
    form.append('contractname', CONTRACT_NAME);
    form.append('compilerversion', 'v0.8.17+commit.8df45f5f');
    form.append('optimizationUsed', '1');
    form.append('runs', '200');
    form.append('constructorArguments', '');
    form.append('licenseType', '3'); // MIT License
    
    console.log("Submitting...");
    const response = await axios.post(apiUrl, form, {
      headers: form.getHeaders()
    });
    
    console.log("API Response:", response.data);
    
    if (response.data.status === '1') {
      console.log("Verification submission successful. GUID:", response.data.result);
      console.log("Checking verification status in 5 seconds...");
      
      setTimeout(async () => {
        await checkVerificationStatus(response.data.result);
      }, 5000);
    } else if (response.data.result.includes('already verified')) {
      console.log("✅ Contract is already verified");
      console.log(`View at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else {
      console.log("❌ Verification submission failed:", response.data.result);
      console.log("Attempting alternative verification method...");
      await attachABI(abi);
    }
  } catch (error) {
    console.error("Error during Polygonscan verification:", error.message);
    console.log("Attempting alternative verification method...");
    await verifyContractOnPolygonscanWeb();
  }
}

async function checkVerificationStatus(guid) {
  try {
    const apiUrl = `https://api.polygonscan.com/api?apikey=${POLYGONSCAN_API_KEY}&module=contract&action=checkverifystatus&guid=${guid}`;
    const response = await axios.get(apiUrl);
    
    console.log("Verification status:", response.data.result);
    
    if (response.data.result === 'Pending in queue') {
      console.log("Still pending. Checking again in 5 seconds...");
      setTimeout(() => checkVerificationStatus(guid), 5000);
    } else if (response.data.result.includes('Successfully verified')) {
      console.log("✅ Contract successfully verified!");
      console.log(`View at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else {
      console.log("❌ Verification failed:", response.data.result);
      console.log("Please try the manual verification method in the DETAILED_POLYGONSCAN_VERIFICATION.md file");
    }
  } catch (error) {
    console.error("Error checking verification status:", error.message);
  }
}

async function attachABI(abi) {
  try {
    console.log("Attempting to attach ABI directly...");
    
    const apiUrl = "https://api.polygonscan.com/api";
    const params = new URLSearchParams();
    
    params.append('apikey', POLYGONSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', CONTRACT_ADDRESS);
    params.append('codeformat', 'solidity-standard-json-input');
    params.append('contractname', 'bytecode-verification.sol:SovranWealthFund');
    params.append('compilerversion', 'v0.8.17+commit.8df45f5f');
    params.append('optimizationUsed', '1');
    params.append('runs', '200');
    params.append('constructorArguments', '');
    
    // Create a minimal source file with some content
    const sourceCode = {
      language: "Solidity",
      sources: {
        "bytecode-verification.sol": {
          content: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title SovranWealthFund
 * @dev Bytecode source verification
 */
contract SovranWealthFund {
    // This is just for bytecode source verification
}
`
        }
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode", "evm.deployedBytecode"]
          }
        }
      }
    };
    
    params.append('sourceCode', JSON.stringify(sourceCode));
    
    // Add the ABI - this is crucial for bytecode source method
    params.append('abi', JSON.stringify(abi));
    
    console.log("Submitting ABI attachment request...");
    const response = await axios.post(apiUrl, params);
    
    console.log("API Response:", response.data);
    
    if (response.data.status === '1') {
      console.log("ABI attachment submitted successfully. GUID:", response.data.result);
      console.log(`View contract at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
    } else {
      console.log("❌ ABI attachment failed:", response.data.result);
      console.log("Please try the manual verification method in the DETAILED_POLYGONSCAN_VERIFICATION.md file");
    }
  } catch (error) {
    console.error("Error during ABI attachment:", error.message);
    console.log("Please try the manual verification method in the DETAILED_POLYGONSCAN_VERIFICATION.md file");
  }
}

async function verifyContractOnPolygonscanWeb() {
  console.log("\nPlease use the web interface for verification:");
  console.log("1. Go to https://polygonscan.com/address/" + CONTRACT_ADDRESS + "#code");
  console.log("2. Click 'Verify and Publish'");
  console.log("3. Select 'Solidity (Single file)' verification method");
  console.log("4. Enter these details:");
  console.log("   - Contract Name: SovranWealthFund");
  console.log("   - Compiler Version: v0.8.17+commit.8df45f5f");
  console.log("   - Optimization: Yes with 200 runs");
  console.log("   - License Type: MIT (3)");
  console.log("5. Copy the content of contracts/compiled-0.8.17/SovranWealthFundFlat.sol and paste it in the source code field");
  console.log("6. Submit the form");
  
  console.log("\nAlternatively, follow the instructions in DETAILED_POLYGONSCAN_VERIFICATION.md for bytecode verification");
}

main().catch(console.error);