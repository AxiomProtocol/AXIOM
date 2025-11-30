// Airdrop script for Sovran Wealth Fund token
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    // Replace with your deployed contract address after deployment
    const tokenAddress = "PASTE_DEPLOYED_CONTRACT_ADDRESS";
    
    // Get the signer account
    const [deployer] = await ethers.getSigners();
    console.log("Airdropping from account:", deployer.address);
    
    // Connect to the deployed token contract
    const SovranToken = await ethers.getContractAt("SovranWealthFund", tokenAddress);
    
    // Verify you have the minter role
    const MINTER_ROLE = await SovranToken.MINTER_ROLE();
    const hasMinterRole = await SovranToken.hasRole(MINTER_ROLE, deployer.address);
    if (!hasMinterRole) {
      console.error("The account does not have the MINTER_ROLE");
      return;
    }
    
    // List of recipient addresses for the airdrop
    // Replace these with actual recipient addresses
    const recipients = [
      "0x123...",
      "0x456...",
      "0x789..."
    ];
    
    // Amount to airdrop to each recipient (100 tokens with 18 decimals)
    const amount = ethers.utils.parseUnits("100", 18);
    
    console.log(`Starting airdrop of ${ethers.utils.formatUnits(amount, 18)} SWF tokens to ${recipients.length} recipients...`);
    
    // Mint tokens to each recipient
    for (let recipient of recipients) {
      console.log(`Airdropping to: ${recipient}...`);
      const tx = await SovranToken.mint(recipient, amount);
      await tx.wait();
      console.log(`  Transaction hash: ${tx.hash}`);
      
      // Verify recipient balance
      const balance = await SovranToken.balanceOf(recipient);
      console.log(`  New balance: ${ethers.utils.formatUnits(balance, 18)} SWF`);
    }
    
    console.log("Airdrop completed successfully!");
    
    // Get updated total supply
    const totalSupply = await SovranToken.totalSupply();
    console.log(`Total supply after airdrop: ${ethers.utils.formatUnits(totalSupply, 18)} SWF`);
    
  } catch (error) {
    console.error("Airdrop failed with error:", error);
    process.exitCode = 1;
  }
}

// Run the airdrop
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error during airdrop:", error);
    process.exit(1);
  });