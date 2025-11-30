// Test Pausable functionality for Sovran Wealth Fund token
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
    
    console.log(`\nToken Information:`);
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    
    // Check current pause status
    const isPaused = await token.paused();
    console.log(`\nCurrent pause status: ${isPaused ? "PAUSED" : "NOT PAUSED"}`);
    
    // Mint more tokens to user2 for testing transfers
    console.log(`\nMinting tokens to ${user2.address} for transfer tests...`);
    const mintAmount = ethers.utils.parseEther("500");
    await token.mint(user2.address, mintAmount);
    
    const user2Balance = await token.balanceOf(user2.address);
    console.log(`User2 balance: ${ethers.utils.formatEther(user2Balance)} ${symbol}`);
    
    // Test pausing the contract
    console.log(`\nPausing the contract...`);
    const pauseTx = await token.pause();
    await pauseTx.wait();
    
    // Verify the contract is paused
    const isPausedAfter = await token.paused();
    console.log(`Contract is now: ${isPausedAfter ? "PAUSED" : "NOT PAUSED"}`);
    
    // Try transferring tokens while paused (should fail)
    console.log(`\nAttempting to transfer tokens while paused (should fail)...`);
    try {
      // Transfer from user2 to user1
      const transferAmount = ethers.utils.parseEther("10");
      await token.connect(user2).transfer(user1.address, transferAmount);
      console.log(`Transfer succeeded (unexpected)`);
    } catch (error) {
      console.log(`Transfer failed as expected with error: ${error.message}`);
    }
    
    // Now unpause the contract
    console.log(`\nUnpausing the contract...`);
    const unpauseTx = await token.unpause();
    await unpauseTx.wait();
    
    // Verify the contract is unpaused
    const isPausedAfterUnpause = await token.paused();
    console.log(`Contract is now: ${isPausedAfterUnpause ? "PAUSED" : "NOT PAUSED"}`);
    
    // Try transferring tokens after unpausing (should succeed)
    console.log(`\nAttempting to transfer tokens after unpausing...`);
    try {
      const transferAmount = ethers.utils.parseEther("10");
      const transferTx = await token.connect(user2).transfer(user1.address, transferAmount);
      await transferTx.wait();
      
      const user1Balance = await token.balanceOf(user1.address);
      console.log(`User1 balance after transfer: ${ethers.utils.formatEther(user1Balance)} ${symbol}`);
      
      const user2BalanceAfter = await token.balanceOf(user2.address);
      console.log(`User2 balance after transfer: ${ethers.utils.formatEther(user2BalanceAfter)} ${symbol}`);
      
      console.log(`Transfer succeeded (expected)`);
    } catch (error) {
      console.log(`Transfer failed (unexpected) with error: ${error.message}`);
    }
    
    console.log("\nPausable functionality test completed.");
    
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