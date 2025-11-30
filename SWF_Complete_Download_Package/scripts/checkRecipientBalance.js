const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  // The recipient wallet address we're checking
  const walletAddressToCheck = "0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6";
  
  // SWF Token contract address
  const swfTokenAddress = "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
  
  try {
    // Connect to the network
    console.log("Connecting to Polygon network...");
    const alchemyUrl = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.providers.JsonRpcProvider(alchemyUrl);
    
    // Get the ABI for the SWF token contract
    // We'll use a minimal ABI for an ERC20 token
    const erc20Abi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)"
    ];
    
    // Create contract instance
    const tokenContract = new ethers.Contract(swfTokenAddress, erc20Abi, provider);
    
    // Get token information
    const [name, symbol, decimals, totalSupply, balance] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.totalSupply(),
      tokenContract.balanceOf(walletAddressToCheck)
    ]);
    
    // Format the results
    console.log("===== SWF Token Information =====");
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)} ${symbol}`);
    console.log("\n===== Recipient Balance Information =====");
    console.log(`Wallet Address: ${walletAddressToCheck}`);
    console.log(`Balance: ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`);
    
    if (balance.isZero()) {
      console.log("\nNOTE: This wallet has 0 SWF tokens.");
      console.log("The mint transaction may not have been processed yet or might have failed.");
      console.log("Check the transaction status or try minting again with a higher gas price.");
    } else {
      console.log("\n🎉 SUCCESS! The recipient has tokens in their wallet.");
      console.log("The mint transaction has been successfully processed.");
    }
    
  } catch (error) {
    console.error("Error checking token balance:", error);
    console.log("\nPossible issues:");
    console.log("- The contract might not be deployed correctly on the Polygon network");
    console.log("- RPC URL might be incorrect or unavailable");
    console.log("- There might be network connectivity issues");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });