// Test script for local hardhat network
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Testing SovranWealthFund token on local Hardhat network...");
    
    // Get accounts
    const [owner, user1, user2] = await ethers.getSigners();
    console.log("Owner address:", owner.address);
    console.log("Test user 1:", user1.address);
    console.log("Test user 2:", user2.address);
    
    // Deploy contract
    console.log("\nDeploying contract...");
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    const token = await SovranWealthFund.deploy();
    await token.deployed();
    console.log("Contract deployed to:", token.address);
    
    // Verify contract details
    console.log("\nContract details:");
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Initial total supply:", ethers.utils.formatEther(totalSupply));
    
    // Test minting
    console.log("\nTesting mint functionality...");
    const mintAmount = ethers.utils.parseEther("1000");
    let tx = await token.mint(user1.address, mintAmount);
    await tx.wait();
    console.log(`Minted ${ethers.utils.formatEther(mintAmount)} tokens to ${user1.address}`);
    
    const user1Balance = await token.balanceOf(user1.address);
    console.log(`User 1 balance: ${ethers.utils.formatEther(user1Balance)} ${symbol}`);
    
    // Test transfers
    console.log("\nTesting token transfer...");
    const transferAmount = ethers.utils.parseEther("100");
    await token.connect(user1).transfer(user2.address, transferAmount);
    
    const user2Balance = await token.balanceOf(user2.address);
    console.log(`Transferred ${ethers.utils.formatEther(transferAmount)} tokens from User 1 to User 2`);
    console.log(`User 2 balance: ${ethers.utils.formatEther(user2Balance)} ${symbol}`);
    
    // Test pause functionality
    console.log("\nTesting pause functionality...");
    await token.pause();
    console.log("Contract paused");
    
    try {
      await token.connect(user1).transfer(user2.address, transferAmount);
      console.log("ERROR: Transfer succeeded while paused!");
    } catch (error) {
      console.log("Successfully blocked transfer while paused ✓");
    }
    
    // Unpause and try again
    await token.unpause();
    console.log("Contract unpaused");
    
    await token.connect(user1).transfer(user2.address, transferAmount);
    const newUser2Balance = await token.balanceOf(user2.address);
    console.log(`Successfully transferred ${ethers.utils.formatEther(transferAmount)} more tokens after unpausing ✓`);
    console.log(`User 2 new balance: ${ethers.utils.formatEther(newUser2Balance)} ${symbol}`);
    
    // Test burning
    console.log("\nTesting burn functionality...");
    const burnAmount = ethers.utils.parseEther("50");
    await token.connect(user2).burn(burnAmount);
    
    const finalUser2Balance = await token.balanceOf(user2.address);
    console.log(`User 2 burned ${ethers.utils.formatEther(burnAmount)} tokens ✓`);
    console.log(`User 2 final balance: ${ethers.utils.formatEther(finalUser2Balance)} ${symbol}`);
    
    // Check final total supply
    const finalSupply = await token.totalSupply();
    console.log(`\nFinal total supply: ${ethers.utils.formatEther(finalSupply)} ${symbol}`);
    
    // Check MINTER_ROLE
    const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
    const treasuryAddress = "0x26A8401287cE33CC4aeb5a106cd6D282a92Cf51d";
    
    const ownerHasRole = await token.hasRole(MINTER_ROLE, owner.address);
    const treasuryHasRole = await token.hasRole(MINTER_ROLE, treasuryAddress);
    
    console.log("\nChecking MINTER_ROLE assignments:");
    console.log(`Owner has MINTER_ROLE: ${ownerHasRole ? "Yes ✓" : "No ✗"}`);
    console.log(`Treasury has MINTER_ROLE: ${treasuryHasRole ? "Yes ✓" : "No ✗"}`);
    
    // Test non-minter trying to mint
    console.log("\nTesting unauthorized minting (should fail)...");
    try {
      await token.connect(user1).mint(user1.address, mintAmount);
      console.log("ERROR: User without MINTER_ROLE was able to mint!");
    } catch (error) {
      console.log("Successfully blocked unauthorized minting ✓");
    }
    
    console.log("\n✅ All tests completed successfully!");
    
  } catch (error) {
    console.error("Error during testing:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });