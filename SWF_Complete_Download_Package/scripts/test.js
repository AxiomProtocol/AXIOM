// Test script for Sovran Wealth Fund token
const { ethers } = require("hardhat");

async function main() {
  try {
    // Get accounts
    const [owner, user1, user2] = await ethers.getSigners();
    
    console.log("Testing with account:", owner.address);
    console.log("Account balance:", (await owner.getBalance()).toString());

    // Get the deployed contract instance
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Already deployed contract address
    const token = await SovranWealthFund.attach(tokenAddress);
    
    console.log("Connected to SovranWealthFund at:", token.address);
    
    // Basic token information
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Initial Total Supply: ${totalSupply.toString()}`);
    
    // Test minting
    console.log("\nTesting minting functionality...");
    
    // Get the minter role hash
    const minterRole = await token.MINTER_ROLE();
    console.log(`MINTER_ROLE hash: ${minterRole}`);
    
    // Verify the owner has the minter role
    const adminRole = await token.getRoleAdmin(minterRole);
    console.log(`Admin role for MINTER_ROLE: ${adminRole}`);
    
    const hasAdminRole = await token.hasRole(adminRole, owner.address);
    console.log(`Owner has admin role: ${hasAdminRole}`);
    
    // Check hardcoded admin address in contract
    const hardcodedAdmin = "0x2A5269E92C48829fdF21D8892c23E894B11D15e3";
    const hasHardcodedAdminRole = await token.hasRole(minterRole, hardcodedAdmin);
    console.log(`Hardcoded address has minter role: ${hasHardcodedAdminRole}`);
    
    // Calculate a sample wallet address from the hardcoded admin's private key
    console.log(`\nNote: The hardcoded admin address in the contract is: ${hardcodedAdmin}`);
    console.log("If this doesn't match your wallet address, you'll need to update the contract.");
    
    // Grant minter role to owner for testing if needed
    if (!(await token.hasRole(minterRole, owner.address))) {
      // This will fail if the owner doesn't have the admin role to grant roles
      try {
        console.log("\nAttempting to grant minter role to test account...");
        const tx = await token.grantRole(minterRole, owner.address);
        await tx.wait();
        console.log("Minter role granted to test account.");
      } catch (error) {
        console.log("Failed to grant minter role. Only the admin can do this.");
        console.log("Error:", error.message);
      }
    } else {
      console.log("\nTest account already has minter role.");
    }
    
    // Try minting tokens
    try {
      const mintAmount = ethers.utils.parseEther("1000");
      console.log(`\nAttempting to mint ${ethers.utils.formatEther(mintAmount)} tokens to ${user1.address}...`);
      
      const mintTx = await token.mint(user1.address, mintAmount);
      await mintTx.wait();
      
      const userBalance = await token.balanceOf(user1.address);
      console.log(`User balance after mint: ${ethers.utils.formatEther(userBalance)} ${symbol}`);
      
      const newTotalSupply = await token.totalSupply();
      console.log(`New total supply: ${ethers.utils.formatEther(newTotalSupply)} ${symbol}`);
      
      console.log("Minting test successful!");
    } catch (error) {
      console.log("Minting test failed. Error:", error.message);
    }
    
    console.log("\nToken tests completed.");
    
  } catch (error) {
    console.error("Test failed with error:", error);
    process.exitCode = 1;
  }
}

// Run the tests
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error during test:", error);
    process.exit(1);
  });