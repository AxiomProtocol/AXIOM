const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  // The wallet address to check
  const walletAddressToCheck = "0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6";
  
  // SWF Token contract address
  const swfTokenAddress = "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
  
  try {
    // Connect to the network
    const alchemyUrl = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.providers.JsonRpcProvider(alchemyUrl);
    
    // Minimal ABI for ERC20 token
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
    
  } catch (error) {
    console.error("Error checking token balance:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });