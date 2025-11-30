/**
 * Polygonscan-Specific Verification Script
 * 
 * This script specifically targets Polygonscan's version 0.8.20 with the exact compiler commit.
 */
require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const CONTRACT_CREATOR = "0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6";
const TX_HASH = "0xf6d4c55c82faa26c99dbbf1fb3982a10e1a84cc7c3bfc13f184362790d2ef145";
const COMPILER_VERSION = "v0.8.20+commit.a1b79de6"; // As seen in your screenshot

async function main() {
  console.log("Creating Polygonscan-specific verification package...");
  
  try {
    // Generate verification package with corrected information
    const verificationPackage = {
      contractAddress: CONTRACT_ADDRESS,
      contractCreator: CONTRACT_CREATOR, 
      deploymentTx: TX_HASH,
      compilerVersion: COMPILER_VERSION,
      optimization: true,
      optimizationRuns: 200,
      fixedCompilationIssue: "_setupRole is deprecated, use _grantRole instead",
      verificationInstructions: [
        "For Polygonscan verification:",
        "1. Go to https://polygonscan.com/address/" + CONTRACT_ADDRESS + "#code",
        "2. Click 'Verify and Publish'",
        "3. Select 'Solidity (Single file)' as the verification method",
        "4. Enter 'SovranWealthFund' as the Contract Name",
        "5. Choose compiler version " + COMPILER_VERSION,
        "6. Set optimization to 'Yes' with 200 runs",
        "7. Enter UNLICENSED (1) as license type",
        "8. Use the special fixed source code provided in 'contracts/verified/SovranWealthFund.polygonscan.sol'",
        "9. Submit verification"
      ]
    };
    
    // Fix the source code
    // Read the original source file
    let sourcePath = path.join(__dirname, '../contracts/verified/SovranWealthFund.flat.sol');
    if (!fs.existsSync(sourcePath)) {
      // Try finding alternatives
      const alternatives = [
        '../contracts/SovranWealthFund.sol',
        '../contracts/verified/SovranWealthFund.sol',
        '../contracts/SovranWealthFund.flat.sol'
      ];
      
      for (const alt of alternatives) {
        const altPath = path.join(__dirname, alt);
        if (fs.existsSync(altPath)) {
          sourcePath = altPath;
          console.log(`Found alternative source file: ${alt}`);
          break;
        }
      }
    }
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error("Could not find source file to modify.");
    }
    
    let sourceCode = fs.readFileSync(sourcePath, 'utf8');
    
    // Replace _setupRole with _grantRole
    sourceCode = sourceCode.replace(/_setupRole/g, '_grantRole');
    
    // Change pragma to match required compiler
    sourceCode = sourceCode.replace(/pragma solidity .*?;/, `pragma solidity ^0.8.20;`);
    
    // Check for other AccessControl imports
    if (!sourceCode.includes('@openzeppelin/contracts/access/AccessControl.sol')) {
      // If needed, add import statements
      sourceCode = sourceCode.replace(
        'pragma solidity',
        `pragma solidity ^0.8.20;\n\nimport "@openzeppelin/contracts/access/AccessControl.sol"`
      );
    }
    
    // Save the fixed source code
    const outputSourcePath = path.join(__dirname, '../contracts/verified/SovranWealthFund.polygonscan.sol');
    // Ensure directory exists
    const dir = path.dirname(outputSourcePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputSourcePath, sourceCode);
    
    // Save to file
    const outputPath = path.join(__dirname, '../polygonscan-verification-package.json');
    fs.writeFileSync(
      outputPath,
      JSON.stringify(verificationPackage, null, 2)
    );
    
    // Create human-readable instructions
    const instructionsPath = path.join(__dirname, '../POLYGONSCAN_VERIFICATION_INSTRUCTIONS.md');
    fs.writeFileSync(
      instructionsPath,
      `# Polygonscan-Specific Verification Instructions\n\n` +
      `## Contract Information\n\n` +
      `- Contract Address: ${CONTRACT_ADDRESS}\n` +
      `- Contract Creator: ${CONTRACT_CREATOR}\n` +
      `- Deployment Transaction: ${TX_HASH}\n` +
      `- Contract Name: SovranWealthFund\n` +
      `- Compiler Version: ${COMPILER_VERSION}\n\n` +
      `## Fixed Compilation Issue\n\n` +
      `- ${verificationPackage.fixedCompilationIssue}\n\n` +
      `## Verification Steps\n\n` +
      verificationPackage.verificationInstructions.map(line => `${line}`).join('\n\n') +
      `\n\n## Important Notes\n\n` +
      `- The source code has been modified to fix the \`_setupRole\` deprecation issue.\n` +
      `- If verification fails, try the Bytecode-Only method as a fallback option.\n`
    );
    
    console.log(`\nPolygonscan-specific verification package saved to ${outputPath}`);
    console.log(`Fixed source code saved to ${outputSourcePath}`);
    console.log(`Human-readable instructions saved to ${instructionsPath}`);
    console.log(`\nFollow the instructions in POLYGONSCAN_VERIFICATION_INSTRUCTIONS.md for verification.`);
  } catch (error) {
    console.error(`Error:`, error.message);
    process.exit(1);
  }
}

main().catch(console.error);