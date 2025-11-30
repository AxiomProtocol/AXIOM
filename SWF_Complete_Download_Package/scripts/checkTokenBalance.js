const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  // The wallet address you want to check
  const walletAddressToCheck = process.argv[2]; // Pass as command line argument
  
  if (!walletAddressToCheck) {
    console.error("Please provide a wallet address to check");
    console.log("Usage: npx hardhat run scripts/checkTokenBalance.js --network polygon <walletAddress>");
    return;
  }

  // SWF Token contract address from mainnet-contract-info.json
  const swfTokenAddress = "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
  
  try {
    // Connect to the network
    const alchemyUrl = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.providers.JsonRpcProvider(alchemyUrl);
    
    // Get the ABI for the SWF token contract
    // We'll use a minimal ABI for an ERC20 token since we only need to check balances
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
    console.log("\n===== Balance Information =====");
    console.log(`Wallet Address: ${walletAddressToCheck}`);
    console.log(`Balance: ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`);
    
    if (balance.isZero()) {
      console.log("\nNOTE: This wallet has 0 SWF tokens. You may need to:");
      console.log("1. Mint tokens to this wallet using the minter role");
      console.log("2. Transfer tokens from another wallet that has SWF");
      console.log("\nTo mint tokens (if you have the minter role):");
      console.log(`npx hardhat run scripts/mint.js --network polygon ${walletAddressToCheck} <amount>`);
    }
    
  } catch (error) {
    console.error("Error checking token balance:", error);
    console.log("\nPossible issues:");
    console.log("- The contract might not be deployed on the Polygon network");
    console.log("- RPC URL might be incorrect or unavailable");
    console.log("- The wallet address format might be invalid");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });