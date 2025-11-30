// Test Burn functionality for Sovran Wealth Fund token
const { ethers } = require("hardhat");

async function main() {
  try {
    // Get accounts
    const [owner, user1, user2] = await ethers.getSigners();
    
    console.log("Testing with account:", owner.address);

    // Get the deployed contract instance
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Already deployed contract address
    const token = await SovranWealthFund.attach(tokenAddress);
    
    console.log("Connected to SovranWealthFund at:", token.address);
    
    // Basic token information
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    
    console.log(`\nToken Information:`);
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Current Total Supply: ${ethers.utils.formatEther(totalSupply)} ${symbol}`);
    
    // Check balances
    const user1Balance = await token.balanceOf(user1.address);
    console.log(`\nUser1 balance before burn: ${ethers.utils.formatEther(user1Balance)} ${symbol}`);
    
    // Try burning tokens
    if (user1Balance.gt(0)) {
      console.log(`\nAttempting to burn 5 tokens from user1...`);
      const burnAmount = ethers.utils.parseEther("5");
      
      // Connect as user1 and burn tokens
      const burnTx = await token.connect(user1).burn(burnAmount);
      await burnTx.wait();
      
      // Check new balance and total supply
      const newUser1Balance = await token.balanceOf(user1.address);
      console.log(`User1 balance after burn: ${ethers.utils.formatEther(newUser1Balance)} ${symbol}`);
      
      const newTotalSupply = await token.totalSupply();
      console.log(`New total supply: ${ethers.utils.formatEther(newTotalSupply)} ${symbol}`);
      
      console.log(`Burn successful! ${ethers.utils.formatEther(burnAmount)} ${symbol} tokens were burned.`);
    } else {
      console.log(`\nUser1 has no tokens to burn. Minting some first...`);
      
      // Mint tokens to user1 first
      const mintAmount = ethers.utils.parseEther("50");
      await token.mint(user1.address, mintAmount);
      
      const newUser1Balance = await token.balanceOf(user1.address);
      console.log(`User1 balance after mint: ${ethers.utils.formatEther(newUser1Balance)} ${symbol}`);
      
      // Now burn tokens
      console.log(`\nAttempting to burn 5 tokens from user1...`);
      const burnAmount = ethers.utils.parseEther("5");
      
      // Connect as user1 and burn tokens
      const burnTx = await token.connect(user1).burn(burnAmount);
      await burnTx.wait();
      
      // Check new balance and total supply
      const finalUser1Balance = await token.balanceOf(user1.address);
      console.log(`User1 balance after burn: ${ethers.utils.formatEther(finalUser1Balance)} ${symbol}`);
      
      const newTotalSupply = await token.totalSupply();
      console.log(`New total supply: ${ethers.utils.formatEther(newTotalSupply)} ${symbol}`);
      
      console.log(`Burn successful! ${ethers.utils.formatEther(burnAmount)} ${symbol} tokens were burned.`);
    }
    
    console.log("\nBurn functionality test completed.");
    
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