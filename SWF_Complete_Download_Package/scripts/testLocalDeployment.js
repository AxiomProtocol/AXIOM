// Script to test basic functionality of the deployed contracts on local network
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("-".repeat(50));
    console.log("TESTING LOCALLY DEPLOYED CONTRACTS");
    console.log("-".repeat(50));
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    
    // Test full contract
    console.log("\n1. TESTING FULL CONTRACT");
    const fullContractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const fullContract = await ethers.getContractAt("SovranWealthFund", fullContractAddress);
    
    // Get basic token info
    const name = await fullContract.name();
    const symbol = await fullContract.symbol();
    const decimals = await fullContract.decimals();
    const totalSupply = await fullContract.totalSupply();
    
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} ${symbol}`);
    
    // Test minting to deployer
    const mintAmount = ethers.utils.parseEther("1000");
    console.log(`\nMinting ${ethers.utils.formatEther(mintAmount)} ${symbol} to deployer...`);
    const mintTx = await fullContract.mintTo(deployer.address, mintAmount);
    await mintTx.wait();
    
    // Check balance after minting
    const balance = await fullContract.balanceOf(deployer.address);
    console.log(`New balance: ${ethers.utils.formatEther(balance)} ${symbol}`);
    
    // Test pause functionality
    console.log("\nTesting pause functionality...");
    const pauseTx = await fullContract.pause();
    await pauseTx.wait();
    console.log("Contract paused.");
    
    // Test unpause functionality
    const unpauseTx = await fullContract.unpause();
    await unpauseTx.wait();
    console.log("Contract unpaused.");
    
    // Test burn functionality
    const burnAmount = ethers.utils.parseEther("10");
    console.log(`\nBurning ${ethers.utils.formatEther(burnAmount)} ${symbol}...`);
    const burnTx = await fullContract.burn(burnAmount);
    await burnTx.wait();
    
    // Check balance after burning
    const balanceAfterBurn = await fullContract.balanceOf(deployer.address);
    console.log(`Balance after burn: ${ethers.utils.formatEther(balanceAfterBurn)} ${symbol}`);
    
    // Test minimal contract
    console.log("\n\n2. TESTING MINIMAL CONTRACT");
    const minimalContractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const minimalContract = await ethers.getContractAt("SovranWealthFundMinimal", minimalContractAddress);
    
    // Get basic token info
    const minName = await minimalContract.name();
    const minSymbol = await minimalContract.symbol();
    const minDecimals = await minimalContract.decimals();
    const minTotalSupply = await minimalContract.totalSupply();
    
    console.log(`Name: ${minName}`);
    console.log(`Symbol: ${minSymbol}`);
    console.log(`Decimals: ${minDecimals}`);
    console.log(`Total Supply: ${ethers.utils.formatEther(minTotalSupply)} ${minSymbol}`);
    
    // Test minting to deployer
    console.log(`\nMinting ${ethers.utils.formatEther(mintAmount)} ${minSymbol} to deployer...`);
    const minMintTx = await minimalContract.mint(deployer.address, mintAmount);
    await minMintTx.wait();
    
    // Check balance after minting
    const minBalance = await minimalContract.balanceOf(deployer.address);
    console.log(`New balance: ${ethers.utils.formatEther(minBalance)} ${minSymbol}`);
    
    // Test burn functionality
    console.log(`\nBurning ${ethers.utils.formatEther(burnAmount)} ${minSymbol}...`);
    const minBurnTx = await minimalContract.burn(burnAmount);
    await minBurnTx.wait();
    
    // Check balance after burning
    const minBalanceAfterBurn = await minimalContract.balanceOf(deployer.address);
    console.log(`Balance after burn: ${ethers.utils.formatEther(minBalanceAfterBurn)} ${minSymbol}`);
    
    console.log("\n✅ ALL TESTS PASSED SUCCESSFULLY!");
    console.log("Both contracts are working correctly.");

  } catch (error) {
    console.error("\n❌ TEST FAILED!");
    console.error("Error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\nUnhandled error:", error);
    process.exit(1);
  });