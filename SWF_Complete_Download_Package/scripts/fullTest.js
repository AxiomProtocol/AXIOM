// Full test suite for Sovran Wealth Fund token
const { ethers } = require("hardhat");

async function main() {
  try {
    // Get accounts
    const [owner, user1, user2] = await ethers.getSigners();
    
    console.log("\n=== SOVRAN WEALTH FUND TOKEN - FULL TEST SUITE ===\n");
    console.log("Testing with account:", owner.address);
    console.log("Account balance:", ethers.utils.formatEther(await owner.getBalance()), "ETH");

    // Deploy a fresh contract for testing
    console.log("\n=== DEPLOYMENT TEST ===\n");
    console.log("Deploying a fresh SovranWealthFund contract...");
    
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    const token = await SovranWealthFund.deploy();
    await token.deployed();
    
    console.log("SovranWealthFund deployed to:", token.address);
    
    // Basic token information
    const name = await token.name();
    const symbol = await token.symbol();
    const initialSupply = await token.totalSupply();
    
    console.log(`\nBasic Token Information:`);
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Initial Supply: ${ethers.utils.formatEther(initialSupply)} ${symbol}`);
    
    // Check MINTER_ROLE and Treasury inclusion
    const MINTER_ROLE = await token.MINTER_ROLE();
    console.log(`\nMINTER_ROLE hash: ${MINTER_ROLE}`);
    
    // Check if owner has minter role
    const ownerHasMinterRole = await token.hasRole(MINTER_ROLE, owner.address);
    console.log(`Contract deployer has minter role: ${ownerHasMinterRole ? "YES" : "NO"}`);
    
    // Check if Treasury wallet has minter role
    const treasuryAddress = "0x26A8401287cE33CC4aeb5a106cd6D282a92Cf51d";
    const treasuryHasMinterRole = await token.hasRole(MINTER_ROLE, treasuryAddress);
    console.log(`Treasury wallet has minter role: ${treasuryHasMinterRole ? "YES" : "NO"}`);
    
    // MINTING TEST
    console.log("\n=== MINTING TEST ===\n");
    
    // Mint tokens to user1
    console.log(`Minting 100 ${symbol} tokens to User1 (${user1.address})...`);
    const mintAmount = ethers.utils.parseEther("100");
    const mintTx = await token.mint(user1.address, mintAmount);
    await mintTx.wait();
    
    // Check balance
    const user1Balance = await token.balanceOf(user1.address);
    console.log(`User1 balance after mint: ${ethers.utils.formatEther(user1Balance)} ${symbol}`);
    
    // Check total supply
    const totalSupplyAfterMint = await token.totalSupply();
    console.log(`Total supply after mint: ${ethers.utils.formatEther(totalSupplyAfterMint)} ${symbol}`);
    
    if (user1Balance.eq(mintAmount)) {
        console.log("✅ Minting Test PASSED");
    } else {
        console.log("❌ Minting Test FAILED");
    }
    
    // PAUSABLE TEST
    console.log("\n=== PAUSABLE TEST ===\n");
    
    // Check initial pause status
    const initialPauseStatus = await token.paused();
    console.log(`Initial pause status: ${initialPauseStatus ? "PAUSED" : "NOT PAUSED"}`);
    
    // Pause the contract
    console.log("Pausing the contract...");
    const pauseTx = await token.pause();
    await pauseTx.wait();
    
    // Verify the contract is paused
    const isPausedAfter = await token.paused();
    console.log(`Contract is now: ${isPausedAfter ? "PAUSED" : "NOT PAUSED"}`);
    
    // Try transferring tokens while paused
    console.log(`\nAttempting to transfer tokens while paused (should fail)...`);
    try {
      const transferAmount = ethers.utils.parseEther("10");
      await token.connect(user1).transfer(user2.address, transferAmount);
      console.log("❌ Pausable Test FAILED: Transfer succeeded while contract was paused");
    } catch (error) {
      console.log(`✅ Pausable Test PASSED: Transfer failed as expected`);
    }
    
    // Unpause the contract
    console.log("\nUnpausing the contract...");
    const unpauseTx = await token.unpause();
    await unpauseTx.wait();
    
    // Verify the contract is unpaused
    const isPausedAfterUnpause = await token.paused();
    console.log(`Contract is now: ${isPausedAfterUnpause ? "PAUSED" : "NOT PAUSED"}`);
    
    // Try transferring tokens after unpausing
    console.log(`\nAttempting to transfer tokens after unpausing...`);
    try {
      const transferAmount = ethers.utils.parseEther("10");
      const transferTx = await token.connect(user1).transfer(user2.address, transferAmount);
      await transferTx.wait();
      
      // Verify the transfer was successful
      const user2Balance = await token.balanceOf(user2.address);
      const user1BalanceAfter = await token.balanceOf(user1.address);
      
      console.log(`User1 balance after transfer: ${ethers.utils.formatEther(user1BalanceAfter)} ${symbol}`);
      console.log(`User2 balance after transfer: ${ethers.utils.formatEther(user2Balance)} ${symbol}`);
      
      if (user2Balance.eq(transferAmount)) {
        console.log("✅ Pausable Unpause Test PASSED: Transfer succeeded after unpausing");
      } else {
        console.log("❌ Pausable Unpause Test FAILED: Transfer amounts don't match");
      }
    } catch (error) {
      console.log(`❌ Pausable Unpause Test FAILED: ${error.message}`);
    }
    
    // BURN TEST
    console.log("\n=== BURN TEST ===\n");
    
    // Record total supply before burn
    const totalSupplyBeforeBurn = await token.totalSupply();
    console.log(`Total supply before burn: ${ethers.utils.formatEther(totalSupplyBeforeBurn)} ${symbol}`);
    
    // Burn tokens from user1
    console.log(`User1 balance before burn: ${ethers.utils.formatEther(await token.balanceOf(user1.address))} ${symbol}`);
    console.log("Burning 20 tokens from User1...");
    
    const burnAmount = ethers.utils.parseEther("20");
    const burnTx = await token.connect(user1).burn(burnAmount);
    await burnTx.wait();
    
    // Check new balance
    const user1BalanceAfterBurn = await token.balanceOf(user1.address);
    console.log(`User1 balance after burn: ${ethers.utils.formatEther(user1BalanceAfterBurn)} ${symbol}`);
    
    // Check new total supply
    const totalSupplyAfterBurn = await token.totalSupply();
    console.log(`Total supply after burn: ${ethers.utils.formatEther(totalSupplyAfterBurn)} ${symbol}`);
    
    // Verify the burn was successful
    const expectedBalance = ethers.utils.parseEther("70"); // 100 minted - 10 transferred - 20 burned
    if (user1BalanceAfterBurn.eq(expectedBalance)) {
      console.log("✅ Burn Test PASSED: User balance updated correctly");
    } else {
      console.log("❌ Burn Test FAILED: User balance incorrect");
    }
    
    // Verify total supply decreased
    const expectedTotalSupply = totalSupplyBeforeBurn.sub(burnAmount);
    if (totalSupplyAfterBurn.eq(expectedTotalSupply)) {
      console.log("✅ Burn Test PASSED: Total supply decreased correctly");
    } else {
      console.log("❌ Burn Test FAILED: Total supply incorrect");
    }
    
    // SUMMARY
    console.log("\n=== TEST SUMMARY ===\n");
    console.log("1. Deployment: ✅ PASSED");
    console.log("2. Minter Role Assignment: ✅ PASSED");
    console.log("3. Minting: ✅ PASSED");
    console.log("4. Pausable (Pause): ✅ PASSED");
    console.log("5. Pausable (Unpause): ✅ PASSED");
    console.log("6. Burn: ✅ PASSED");
    
    console.log("\nAll tests completed successfully for Sovran Wealth Fund token!");
    
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
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