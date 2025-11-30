const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Deploying Test Token...");
    
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying from address: ${deployer.address}`);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");
    console.log("");
    
    // Deploy SovranWealthFundMinimal token for testing
    console.log("Deploying SovranWealthFundMinimal token...");
    const SWFMinimal = await ethers.getContractFactory("SovranWealthFundMinimal");
    const swfToken = await SWFMinimal.deploy();
    await swfToken.deployed();
    console.log(`SWF token deployed to: ${swfToken.address}`);
    
    // Simple test
    console.log("\nPerforming simple test...");
    const name = await swfToken.name();
    const symbol = await swfToken.symbol();
    const decimals = await swfToken.decimals();
    
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Token Decimals: ${decimals}`);
    
    // Mint some tokens
    console.log("\nMinting 1000 tokens to deployer...");
    const mintAmount = ethers.utils.parseUnits("1000", 18);
    const tx = await swfToken.mint(deployer.address, mintAmount);
    await tx.wait();
    
    const balance = await swfToken.balanceOf(deployer.address);
    console.log(`Deployer Balance: ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`);
    
    console.log("\n✅ Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });