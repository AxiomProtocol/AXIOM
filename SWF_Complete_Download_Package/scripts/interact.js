// Interaction script for Sovran Wealth Fund token
// Use this script to interact with your deployed token
const { ethers } = require("hardhat");

async function main() {
  try {
    // SWF token contract on Polygon mainnet
    const contractAddress = "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
    
    // Get the account that will interact with the contract
    const [deployer, user1, user2] = await ethers.getSigners();
    
    console.log("Interacting with contract using account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Get the deployed contract instance
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    const token = await SovranWealthFund.attach(contractAddress);
    
    console.log("Connected to SovranWealthFund at:", token.address);
    
    // Basic token information
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    
    console.log(`\nToken Information:`);
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} ${symbol}`);
    
    // Check minter role
    const minterRole = await token.MINTER_ROLE();
    console.log(`\nMINTER_ROLE hash: ${minterRole}`);
    
    // Check if the deployer has the minter role
    const hasMinterRole = await token.hasRole(minterRole, deployer.address);
    console.log(`Deployer has minter role: ${hasMinterRole}`);
    
    // Menu of operations
    console.log("\nAvailable Operations:");
    console.log("1. Mint tokens");
    console.log("2. Check balance");
    console.log("3. Grant minter role");
    console.log("4. Revoke minter role");
    
    // Operation selection is via command line arguments
    // e.g., node scripts/interact.js mint 0xAddress 1000
    const operation = process.argv[2];
    
    if (operation === "mint") {
      const recipient = process.argv[3] || user1.address;
      const amount = process.argv[4] ? ethers.utils.parseEther(process.argv[4]) : ethers.utils.parseEther("100");
      
      console.log(`\nMinting ${ethers.utils.formatEther(amount)} ${symbol} to ${recipient}...`);
      const mintTx = await token.mint(recipient, amount);
      await mintTx.wait();
      console.log("Minting successful!");
      
      const balance = await token.balanceOf(recipient);
      console.log(`New balance of ${recipient}: ${ethers.utils.formatEther(balance)} ${symbol}`);
      
      const newTotalSupply = await token.totalSupply();
      console.log(`New total supply: ${ethers.utils.formatEther(newTotalSupply)} ${symbol}`);
    }
    else if (operation === "balance") {
      const account = process.argv[3] || deployer.address;
      const balance = await token.balanceOf(account);
      console.log(`\nBalance of ${account}: ${ethers.utils.formatEther(balance)} ${symbol}`);
    }
    else if (operation === "grant") {
      const account = process.argv[3];
      if (!account) {
        console.log("Error: Please provide an address to grant the minter role");
        return;
      }
      
      console.log(`\nGranting minter role to ${account}...`);
      const grantTx = await token.grantRole(minterRole, account);
      await grantTx.wait();
      
      const hasRole = await token.hasRole(minterRole, account);
      console.log(`${account} has minter role: ${hasRole}`);
    }
    else if (operation === "revoke") {
      const account = process.argv[3];
      if (!account) {
        console.log("Error: Please provide an address to revoke the minter role");
        return;
      }
      
      console.log(`\nRevoking minter role from ${account}...`);
      const revokeTx = await token.revokeRole(minterRole, account);
      await revokeTx.wait();
      
      const hasRole = await token.hasRole(minterRole, account);
      console.log(`${account} has minter role: ${hasRole}`);
    }
    else {
      console.log("\nNo operation specified or invalid operation.");
      console.log("Examples:");
      console.log("  npx hardhat run scripts/interact.js mint 0xAddress 1000 --network polygon");
      console.log("  npx hardhat run scripts/interact.js balance 0xAddress --network polygon");
      console.log("  npx hardhat run scripts/interact.js grant 0xAddress --network polygon");
      console.log("  npx hardhat run scripts/interact.js revoke 0xAddress --network polygon");
    }
    
  } catch (error) {
    console.error("Interaction failed with error:", error);
    process.exitCode = 1;
  }
}

// Run the interaction
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error during interaction:", error);
    process.exit(1);
  });