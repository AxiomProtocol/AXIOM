// Script to deploy Sovran Wealth Fund token to local Hardhat network for testing
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    // Get the account that will deploy the contract
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploy SovranWealthFund
    console.log("\nDeploying SovranWealthFund...");
    const SovranWealthFund = await ethers.getContractFactory("contracts/SovranWealthFund.sol:SovranWealthFund");
    const swfToken = await SovranWealthFund.deploy();
    await swfToken.deployed();
    
    console.log("SovranWealthFund deployed to:", swfToken.address);
    console.log("Transaction hash:", swfToken.deployTransaction.hash);
    
    // Get token information
    const name = await swfToken.name();
    const symbol = await swfToken.symbol();
    const decimals = await swfToken.decimals();
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    
    // Mint 500,000 tokens to the target wallet address
    const targetWallet = "0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6";
    const amountToMint = ethers.utils.parseUnits("500000", decimals);
    
    console.log(`\nMinting 500,000 ${symbol} tokens to: ${targetWallet}`);
    const mintTx = await swfToken.mintTo(targetWallet, amountToMint);
    await mintTx.wait();
    
    // Check balance
    const balance = await swfToken.balanceOf(targetWallet);
    console.log(`Balance of ${targetWallet}: ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`);
    
    console.log("\nDeployment and minting completed successfully!");
    console.log("\n============ SUMMARY ============");
    console.log(`Token Address: ${swfToken.address}`);
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Minted to: ${targetWallet}`);
    console.log(`Amount: 500,000 ${symbol}`);
    console.log("================================");
    
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });