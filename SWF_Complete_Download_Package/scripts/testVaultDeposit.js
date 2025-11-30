// Script to test depositing into SWFBasketVault
require("dotenv").config();
const { ethers, network } = require("hardhat");

async function main() {
  try {
    // Get the account that will interact with the contracts
    const [signer] = await ethers.getSigners();
    
    console.log("Testing vault deposit with account:", signer.address);
    console.log("Account balance:", ethers.utils.formatEther(await signer.getBalance()), "MATIC");
    console.log("Network:", network.name);

    // Get contract addresses from .env file
    const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
    const vaultAddress = process.env.SWF_BASKET_VAULT_ADDRESS;
    
    if (!swfTokenAddress || !vaultAddress) {
      throw new Error("Missing contract addresses in .env file");
    }
    
    console.log("SWF Token:", swfTokenAddress);
    console.log("SWFBasketVault:", vaultAddress);
    
    // Connect to the contracts
    const swfToken = await ethers.getContractAt("IERC20", swfTokenAddress);
    const basketVault = await ethers.getContractAt("SWFBasketVault", vaultAddress);
    
    // Check SWF token balance
    const tokenBalance = await swfToken.balanceOf(signer.address);
    console.log("SWF token balance:", ethers.utils.formatEther(tokenBalance));
    
    // Check if there's enough balance for testing
    if (tokenBalance.eq(0)) {
      console.log("No SWF tokens available for testing. Please acquire some tokens first.");
      return;
    }
    
    // Check existing basket token balance
    const basketBalance = await basketVault.balanceOf(signer.address);
    console.log("Current SWF-BASKET token balance:", ethers.utils.formatEther(basketBalance));
    
    // Check vault's total deposits
    const totalDeposited = await basketVault.totalDeposited();
    console.log("Current total deposits in vault:", ethers.utils.formatEther(totalDeposited));
    
    // Determine deposit amount (1% of balance or 1 token, whichever is greater)
    const depositAmount = tokenBalance.div(100).gt(ethers.utils.parseEther("1")) 
      ? tokenBalance.div(100) 
      : ethers.utils.parseEther("1");
    
    console.log(`\nPreparing to deposit ${ethers.utils.formatEther(depositAmount)} SWF tokens...`);
    
    // Approve the vault to spend tokens
    console.log("Approving vault to spend tokens...");
    const approveTx = await swfToken.approve(vaultAddress, depositAmount);
    console.log("Waiting for approval transaction to be mined...");
    await approveTx.wait();
    console.log("Approval successful! Transaction hash:", approveTx.hash);
    
    // Deposit tokens into the vault
    console.log("\nDepositing tokens into the vault...");
    const depositTx = await basketVault.deposit(depositAmount);
    console.log("Waiting for deposit transaction to be mined...");
    await depositTx.wait();
    console.log("Deposit successful! Transaction hash:", depositTx.hash);
    
    // Check updated balances
    const newTokenBalance = await swfToken.balanceOf(signer.address);
    const newBasketBalance = await basketVault.balanceOf(signer.address);
    const newTotalDeposited = await basketVault.totalDeposited();
    
    console.log("\n=== UPDATED BALANCES ===");
    console.log("SWF token balance:", ethers.utils.formatEther(newTokenBalance));
    console.log("SWF-BASKET token balance:", ethers.utils.formatEther(newBasketBalance));
    console.log("Total deposits in vault:", ethers.utils.formatEther(newTotalDeposited));
    
    // Calculate differences
    const tokenDiff = tokenBalance.sub(newTokenBalance);
    const basketDiff = newBasketBalance.sub(basketBalance);
    const depositDiff = newTotalDeposited.sub(totalDeposited);
    
    console.log("\n=== TRANSACTION SUMMARY ===");
    console.log(`SWF tokens spent: ${ethers.utils.formatEther(tokenDiff)}`);
    console.log(`SWF-BASKET tokens received: ${ethers.utils.formatEther(basketDiff)}`);
    console.log(`Increase in vault deposits: ${ethers.utils.formatEther(depositDiff)}`);
    
    console.log("\nVault deposit test completed successfully!");
    
  } catch (error) {
    console.error("Error during vault deposit test:", error);
    process.exitCode = 1;
  }
}

// Run the test
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error during test:", error);
    process.exit(1);
  });