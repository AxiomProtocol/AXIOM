// Script for minting SovranWealthFund tokens on mainnet
require("dotenv").config();
const { ethers } = require("hardhat");

// Contract address from deployment
const TOKEN_ADDRESS = "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";

// The amount to mint (1000 tokens with 18 decimals)
const MINT_AMOUNT = ethers.utils.parseEther("1000");

// Address to receive the tokens - change this to the desired recipient
// By default, we'll mint to the deployer (Treasury)
const RECIPIENT = ""; // Leave empty to mint to deployer

async function main() {
  try {
    console.log("-".repeat(50));
    console.log("MINTING SWF TOKENS ON MAINNET");
    console.log("-".repeat(50));
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    const recipient = RECIPIENT || deployer.address;
    
    console.log("Minter address:", deployer.address);
    console.log("Recipient address:", recipient);
    console.log(`Amount to mint: ${ethers.utils.formatEther(MINT_AMOUNT)} SWF`);
    
    // Get contract instance
    const SovranWealthFund = await ethers.getContractAt("SovranWealthFund", TOKEN_ADDRESS);
    
    // Check total supply before minting
    const initialSupply = await SovranWealthFund.totalSupply();
    console.log(`Initial total supply: ${ethers.utils.formatEther(initialSupply)} SWF`);
    
    // Mint tokens
    console.log("\nMinting tokens...");
    const tx = await SovranWealthFund.mintTo(recipient, MINT_AMOUNT);
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    // Wait for transaction to be mined
    await tx.wait();
    
    // Check new total supply
    const newSupply = await SovranWealthFund.totalSupply();
    console.log(`\nNew total supply: ${ethers.utils.formatEther(newSupply)} SWF`);
    
    // Check recipient balance
    const balance = await SovranWealthFund.balanceOf(recipient);
    console.log(`Recipient balance: ${ethers.utils.formatEther(balance)} SWF`);
    
    console.log("\n✅ TOKENS MINTED SUCCESSFULLY!");
    console.log(`https://polygonscan.com/tx/${tx.hash}`);
    
  } catch (error) {
    console.error("\n❌ MINTING FAILED!");
    console.error("Error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\nUnhandled error:", error);
    process.exit(1);
  });