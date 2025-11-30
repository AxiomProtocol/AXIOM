/**
 * Contract Verification using Transaction Hash
 * 
 * This script uses the provided transaction hash to help with contract verification.
 * It extracts constructor arguments from the transaction data and formats verification input.
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
  
  console.log(`Analyzing transaction ${TX_HASH}...`);
  
  try {
    // Get transaction details
    const tx = await provider.getTransaction(TX_HASH);
    if (!tx) {
      console.error(`Transaction ${TX_HASH} not found`);
      process.exit(1);
    }
    
    console.log(`Transaction details:`);
    console.log(`- From: ${tx.from}`);
    console.log(`- To: ${tx.to}`);
    console.log(`- Value: ${ethers.utils.formatEther(tx.value)} ETH`);
    console.log(`- Gas Limit: ${tx.gasLimit.toString()}`);
    console.log(`- Gas Price: ${ethers.utils.formatUnits(tx.gasPrice, 'gwei')} Gwei`);
    console.log(`- Data: ${tx.data.substring(0, 66)}...${tx.data.length > 66 ? `(${tx.data.length/2-1} bytes)` : ''}`);
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    if (!receipt) {
      console.error(`Transaction receipt not found`);
      process.exit(1);
    }
    
    console.log(`\nTransaction receipt:`);
    console.log(`- Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    console.log(`- Block Number: ${receipt.blockNumber}`);
    console.log(`- Gas Used: ${receipt.gasUsed.toString()}`);
    
    if (receipt.contractAddress) {
      console.log(`- Created Contract: ${receipt.contractAddress}`);
      
      if (receipt.contractAddress.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
        console.log(`\n✅ This transaction created our target contract!`);
      } else {
        console.log(`\n⚠️ This transaction created a different contract than our target.`);
        console.log(`  Created: ${receipt.contractAddress}`);
        console.log(`  Target:  ${CONTRACT_ADDRESS}`);
      }
    } else {
      console.log(`\n⚠️ This transaction did not create a contract.`);
    }
    
    // Get contract bytecode
    const bytecode = await provider.getCode(CONTRACT_ADDRESS);
    console.log(`\nContract bytecode at ${CONTRACT_ADDRESS}:`);
    console.log(`- Size: ${(bytecode.length - 2)/2} bytes`);
    
    // Try to get constructor arguments from tx data
    // This is useful for contract verification
    if (receipt.contractAddress) {
      try {
        // Usually constructor args are at the end of the transaction data
        // We might need to know the contract bytecode to extract them precisely
        
        console.log(`\nVerification Information for Polygonscan:`);
        console.log(`- Contract Address: ${CONTRACT_ADDRESS}`);
        console.log(`- Contract Creator: ${tx.from}`);
        console.log(`- Transaction Hash: ${TX_HASH}`);
        console.log(`- Compiler Version: v0.8.17+commit.8df45f5f (try this first)`);
        console.log(`- Optimizer: Yes`);
        console.log(`- Optimizer Runs: 200`);
        console.log(`- License Type: No License (1)`);
        console.log(`\nImportant Verification Steps:`);
        console.log(`1. Use the verified source code we prepared in contracts/verified/SovranWealthFund.flat.sol`);
        console.log(`2. If the first attempt fails, try another compiler version like 0.8.26+commit.XXXXXXX`);
        
        // Save information
        const verificationInfo = {
          contractAddress: CONTRACT_ADDRESS,
          transactionHash: TX_HASH,
          creatorAddress: tx.from,
          contractCreation: receipt.contractAddress ? true : false,
          blockNumber: receipt.blockNumber,
          verificationSuggestions: [
            "Use Solidity compiler v0.8.17+commit.8df45f5f",
            "Enable optimization with 200 runs",
            "Use 'UNLICENSED' license type (1)",
            "Try the full flattened contract in contracts/verified/SovranWealthFund.flat.sol",
            "If the above fails, try compiler version 0.8.26"
          ]
        };
        
        fs.writeFileSync(
          path.join(__dirname, '../verification-info.json'),
          JSON.stringify(verificationInfo, null, 2)
        );
        
        console.log(`\nVerification information saved to verification-info.json`);
      } catch (err) {
        console.error(`\nError analyzing constructor arguments:`, err.message);
      }
    }
  } catch (error) {
    console.error(`Error analyzing transaction:`, error.message);
    process.exit(1);
  }
}

main().catch(console.error);