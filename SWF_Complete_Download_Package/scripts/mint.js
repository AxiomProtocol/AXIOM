// Script for minting tokens from the deployed SovranWealthFund contract
require("dotenv").config();
const { ethers } = require("hardhat");

// Set these values before running
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; // Replace after deployment
const RECIPIENT_ADDRESS = "ADDRESS_TO_RECEIVE_TOKENS"; // Replace with recipient address
const AMOUNT_TO_MINT = "1000"; // Amount in tokens (will be converted to wei)

async function main() {
  try {
    // Get the deployment account (must have MINTER_ROLE)
    const [deployer] = await ethers.getSigners();
    console.log("Minter address:", deployer.address);
    
    // Get balance and display in a readable format
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "POL");
    
    // Get the contract instance
    console.log(`Connecting to contract at ${CONTRACT_ADDRESS}...`);
    const token = await ethers.getContractAt("SovranWealthFund", CONTRACT_ADDRESS);
    
    // Verify contract details
    const name = await token.name();
    const symbol = await token.symbol();
    console.log(`Contract verified: ${name} (${symbol})`);
    
    // Check if the deployer has minter role
    const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
    const hasMinterRole = await token.hasRole(MINTER_ROLE, deployer.address);
    
    if (!hasMinterRole) {
      console.error(`ERROR: ${deployer.address} does not have the MINTER_ROLE`);
      return;
    }
    
    // Convert amount to wei (with 18 decimals)
    const mintAmount = ethers.utils.parseEther(AMOUNT_TO_MINT);
    console.log(`Minting ${AMOUNT_TO_MINT} tokens to ${RECIPIENT_ADDRESS}...`);
    
    // Execute the mint transaction
    const tx = await token.mintTo(RECIPIENT_ADDRESS, mintAmount, {
      gasPrice: ethers.utils.parseUnits("25", "gwei"), // Minimum required on Amoy
    });
    
    console.log("Mint transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    // Wait for the transaction to be confirmed
    const receipt = await tx.wait();
    
    console.log("-----------------------------------------------");
    console.log("TOKENS MINTED SUCCESSFULLY!");
    console.log("-----------------------------------------------");
    console.log("Transaction hash:", receipt.transactionHash);
    console.log("Block number:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Get new balance of the recipient
    const recipientBalance = await token.balanceOf(RECIPIENT_ADDRESS);
    console.log(`New balance of ${RECIPIENT_ADDRESS}: ${ethers.utils.formatEther(recipientBalance)} ${symbol}`);
    
  } catch (error) {
    console.error("Minting failed with error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.transaction) {
      console.error("Transaction data:", error.transaction);
    }
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });