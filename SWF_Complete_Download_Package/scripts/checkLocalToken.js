const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  // Connect to local network
  console.log("Connecting to local Hardhat network...");
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  
  // Get accounts from local network
  const accounts = await provider.listAccounts();
  console.log("Local accounts:", accounts);
  
  // Try to connect to the SWF token address from mainnet-contract-info.json
  const swfTokenAddress = "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
  
  // Minimal ABI for ERC20 token
  const erc20Abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)"
  ];
  
  // Try with hardhat standard addresses
  try {
    console.log("Attempting to connect to token at address:", swfTokenAddress);
    const tokenContract = new ethers.Contract(swfTokenAddress, erc20Abi, provider);
    
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.totalSupply()
    ]);
    
    console.log("===== SWF Token Information =====");
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)} ${symbol}`);
  } catch (error) {
    console.log("Failed to connect to token at", swfTokenAddress);
    console.log("Error:", error.message);
    
    // Try with hardhat default deployment address
    console.log("\nTrying with Hardhat default deployment address...");
    const hardhatTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    try {
      const tokenContract = new ethers.Contract(hardhatTokenAddress, erc20Abi, provider);
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply()
      ]);
      
      console.log("===== Local Token Information =====");
      console.log(`Token Name: ${name}`);
      console.log(`Token Symbol: ${symbol}`);
      console.log(`Decimals: ${decimals}`);
      console.log(`Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)} ${symbol}`);
    } catch (error) {
      console.log("Failed to connect to token at", hardhatTokenAddress);
      console.log("Error:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });