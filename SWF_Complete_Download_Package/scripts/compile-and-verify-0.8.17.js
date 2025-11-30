/**
 * Script to compile the contract with Solidity 0.8.17 and verify on Polygonscan
 */
require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

// Contract info
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const CONTRACT_NAME = "SovranWealthFund";
const CONSTRUCTOR_ARGS = ["Sovran Wealth Fund", "SWF"];

async function main() {
  try {
    console.log("Starting 0.8.17 compilation and verification process...");
    
    // Step 1: Compile the contract with Solidity 0.8.17
    console.log("\nStep 1: Compiling contract with Solidity 0.8.17...");
    await execAsync('npx hardhat compile --config hardhat-0.8.17.config.js');
    console.log("Compilation completed successfully.");
    
    // Step 2: Check if the artifacts directory and files were created
    const artifactPath = path.join(__dirname, '../artifacts-0.8.17/contracts/SovranWealthFund.sol/SovranWealthFund.json');
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact file not found at path: ${artifactPath}`);
    }
    console.log("Contract artifact file created successfully.");
    
    // Step 3: Attempt to verify the contract on Polygonscan
    console.log("\nStep 3: Attempting Polygonscan verification...");
    try {
      const constructorArgsEncoded = CONSTRUCTOR_ARGS.map(arg => 
        typeof arg === 'string' ? `"${arg}"` : arg
      ).join(', ');
      
      const verifyCommand = `npx hardhat verify --config hardhat-0.8.17.config.js --network polygon ${CONTRACT_ADDRESS} ${constructorArgsEncoded}`;
      console.log(`Running verification command: ${verifyCommand}`);
      
      const { stdout, stderr } = await execAsync(verifyCommand);
      if (stderr) {
        console.warn("Warning during verification:", stderr);
      }
      
      console.log("Verification output:", stdout);
      
      if (stdout.includes("Successfully verified") || stdout.includes("Already Verified")) {
        console.log("\n✅ Contract successfully verified on Polygonscan!");
        console.log(`View at: https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
      } else if (stdout.includes("Bytecode does not match")) {
        console.log("\n❌ Bytecode verification failed due to bytecode mismatch.");
        console.log("This can happen when the contract was compiled with a different version or settings.");
        console.log("Proceeding with alternative verification method...");
        
        await manualVerification();
      } else {
        console.log("\n⚠️ Verification result unclear. Please check Polygonscan manually.");
        console.log(`https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
        
        await manualVerification();
      }
    } catch (error) {
      console.error("Error during verification:", error.message);
      console.log("Proceeding with alternative verification method...");
      
      await manualVerification();
    }
  } catch (error) {
    console.error("Error in compile and verify process:", error.message);
    process.exit(1);
  }
}

async function manualVerification() {
  console.log("\nStep 4: Manual Bytecode Source Verification");
  console.log("Please follow these steps on Polygonscan:");
  console.log("1. Go to https://polygonscan.com/address/" + CONTRACT_ADDRESS + "#code");
  console.log("2. Click 'Verify and Publish'");
  console.log("3. Select 'Solidity (Bytecode Source)' verification method");
  console.log("4. Enter these details:");
  console.log("   - Contract Name: SovranWealthFund");
  console.log("   - Compiler Version: v0.8.17+commit.8df45f5f");
  console.log("   - Optimization: Yes with 200 runs");
  console.log("   - License Type: MIT (3)");
  console.log("5. In the ABI section, paste this ABI:");
  
  // Read the ABI from the artifacts file
  const artifactPath = path.join(__dirname, '../artifacts-0.8.17/contracts/SovranWealthFund.sol/SovranWealthFund.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  console.log(JSON.stringify(artifact.abi, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});