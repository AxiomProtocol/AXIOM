/**
 * Bytecode-Only Verification Script
 * 
 * This script extracts deployed bytecode and helps with the bytecode-only
 * verification approach on Polygonscan.
 */
require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
const TX_HASH = "0xf6d4c55c82faa26c99dbbf1fb3982a10e1a84cc7c3bfc13f184362790d2ef145";

async function main() {
  // Initialize provider
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ALCHEMY_API_KEY
      ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      : "https://polygon-rpc.com"
  );
  
  console.log(`Getting contract bytecode at ${CONTRACT_ADDRESS}...`);
  
  try {
    // Get transaction data
    const tx = await provider.getTransaction(TX_HASH);
    
    // Get contract bytecode
    const bytecode = await provider.getCode(CONTRACT_ADDRESS);
    const bytecodeSize = (bytecode.length - 2) / 2;
    
    console.log(`Contract bytecode size: ${bytecodeSize} bytes`);
    
    // First part of bytecode for identification
    console.log(`\nBytecode starts with: ${bytecode.substring(0, 100)}...`);
    
    // Generate ABI based on known functions
    const basicAbi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address, uint256) returns (bool)",
      "function allowance(address, address) view returns (uint256)",
      "function approve(address, uint256) returns (bool)",
      "function transferFrom(address, address, uint256) returns (bool)",
      "function mint(address, uint256) returns (bool)",
      "function burn(uint256) returns (bool)",
      "function increaseAllowance(address, uint256) returns (bool)",
      "function decreaseAllowance(address, uint256) returns (bool)",
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "event Approval(address indexed owner, address indexed spender, uint256 value)"
    ];
    
    // Create bytecode verification package
    const verificationPackage = {
      contractAddress: CONTRACT_ADDRESS,
      deploymentTx: TX_HASH,
      bytecode: bytecode,
      bytecodeSize,
      abi: basicAbi,
      instructions: [
        "For bytecode verification on Polygonscan:",
        "1. Go to https://polygonscan.com/address/" + CONTRACT_ADDRESS + "#code",
        "2. Click 'Verify and Publish'",
        "3. Select 'Solidity (Bytecode Source)' as the verification method",
        "4. Enter 'SovranWealthFund' as the Contract Name",
        "5. Choose compiler version v0.8.17+commit.8df45f5f",
        "6. Set optimization to 'Yes' with 200 runs",
        "7. Enter UNLICENSED (1) as license type",
        "8. Paste the ABI below in the ABI section",
        "9. Submit verification"
      ]
    };
    
    // Format ABI for easy copying
    const abiString = JSON.stringify(basicAbi, null, 2);
    
    // Save to file
    const outputPath = path.join(__dirname, '../bytecode-verification-package.json');
    fs.writeFileSync(
      outputPath,
      JSON.stringify(verificationPackage, null, 2)
    );
    
    // Create human-readable instructions
    const instructionsPath = path.join(__dirname, '../BYTECODE_VERIFICATION_INSTRUCTIONS.md');
    fs.writeFileSync(
      instructionsPath,
      `# Bytecode-Only Verification Instructions\n\n` +
      `## Contract Information\n\n` +
      `- Contract Address: ${CONTRACT_ADDRESS}\n` +
      `- Deployment Transaction: ${TX_HASH}\n` +
      `- Contract Name: SovranWealthFund\n\n` +
      `## Verification Steps\n\n` +
      verificationPackage.instructions.map(line => `${line}`).join('\n\n') +
      `\n\n## ABI for Verification\n\n` +
      '```json\n' +
      abiString +
      '\n```\n'
    );
    
    console.log(`\nVerification package saved to ${outputPath}`);
    console.log(`Human-readable instructions saved to ${instructionsPath}`);
    console.log(`\nFollow the instructions in BYTECODE_VERIFICATION_INSTRUCTIONS.md for bytecode-only verification.`);
  } catch (error) {
    console.error(`Error:`, error.message);
    process.exit(1);
  }
}

main().catch(console.error);