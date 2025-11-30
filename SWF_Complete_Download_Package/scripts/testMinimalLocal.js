// Script to test the minimal contract on a local network
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Testing SovranWealthFundMinimal on local network...");
    
    // Get signers for testing
    const [owner, user1, user2] = await ethers.getSigners();
    console.log("Owner:", owner.address);
    console.log("User1:", user1.address);
    console.log("User2:", user2.address);
    
    // Get the contract instance - assuming it was deployed with the deploy script
    const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
    const SovranWealthFundMinimal = await ethers.getContractFactory("SovranWealthFundMinimal");
    const token = await SovranWealthFundMinimal.attach(contractAddress);
    
    console.log("\nChecking token details:");
    console.log("Name:", await token.name());
    console.log("Symbol:", await token.symbol());
    console.log("Owner:", await token.owner());
    console.log("Treasury:", await token.treasury());
    
    // Test minting as owner
    const mintAmount = ethers.utils.parseEther("1000");
    console.log("\nTesting mint function as owner...");
    await token.mint(user1.address, mintAmount);
    console.log(`Minted ${ethers.utils.formatEther(mintAmount)} SWF to ${user1.address}`);
    
    // Check balances
    const user1Balance = await token.balanceOf(user1.address);
    console.log(`User1 balance: ${ethers.utils.formatEther(user1Balance)} SWF`);
    
    // Test burning
    console.log("\nTesting burn function...");
    const burnAmount = ethers.utils.parseEther("100");
    await token.connect(user1).burn(burnAmount);
    console.log(`User1 burned ${ethers.utils.formatEther(burnAmount)} SWF`);
    
    // Check updated balance
    const user1BalanceAfterBurn = await token.balanceOf(user1.address);
    console.log(`User1 balance after burn: ${ethers.utils.formatEther(user1BalanceAfterBurn)} SWF`);
    
    // Transfer tokens
    console.log("\nTesting transfer function...");
    const transferAmount = ethers.utils.parseEther("200");
    await token.connect(user1).transfer(user2.address, transferAmount);
    console.log(`User1 transferred ${ethers.utils.formatEther(transferAmount)} SWF to User2`);
    
    // Check final balances
    const finalUser1Balance = await token.balanceOf(user1.address);
    const finalUser2Balance = await token.balanceOf(user2.address);
    console.log(`User1 final balance: ${ethers.utils.formatEther(finalUser1Balance)} SWF`);
    console.log(`User2 final balance: ${ethers.utils.formatEther(finalUser2Balance)} SWF`);
    
    console.log("\nAll tests passed successfully!");
    
  } catch (error) {
    console.error("Test failed:", error.message);
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });