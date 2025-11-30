// Script to check SovranWealthFund token deployment status on Polygon mainnet
require("dotenv").config();
const { ethers } = require("hardhat");

// Contract address from deployment
const TOKEN_ADDRESS = "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";

async function main() {
  try {
    console.log("-".repeat(50));
    console.log("CHECKING SWF TOKEN ON POLYGON MAINNET");
    console.log("-".repeat(50));
    
    // Create a provider using Alchemy API
    const alchemyApiKey = process.env.ALCHEMY_API_KEY;
    const provider = new ethers.providers.AlchemyProvider("matic", alchemyApiKey);
    
    // Get contract instance
    const SovranWealthFund = await ethers.getContractAt("SovranWealthFund", TOKEN_ADDRESS, provider);
    
    // Get basic token information
    const name = await SovranWealthFund.name();
    const symbol = await SovranWealthFund.symbol();
    const decimals = await SovranWealthFund.decimals();
    const totalSupply = await SovranWealthFund.totalSupply();
    
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} ${symbol}`);
    
    // Check if token is paused
    const paused = await SovranWealthFund.paused();
    console.log(`Token Transfers Paused: ${paused ? "Yes" : "No"}`);
    
    // Get contract owner
    const owner = await SovranWealthFund.owner();
    console.log(`Contract Owner: ${owner}`);
    
    // Get default admin role (for role-based access control)
    const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
    const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
    
    // Check minter role for owner and treasury
    const ownerHasMinterRole = await SovranWealthFund.hasRole(MINTER_ROLE, owner);
    console.log(`Owner has minter role: ${ownerHasMinterRole ? "Yes" : "No"}`);
    
    // Check TREASURY address from our .env file (if available)
    if (process.env.TREASURY_ADDRESS) {
      const treasuryAddress = process.env.TREASURY_ADDRESS;
      const treasuryHasMinterRole = await SovranWealthFund.hasRole(MINTER_ROLE, treasuryAddress);
      console.log(`Treasury (${treasuryAddress}) has minter role: ${treasuryHasMinterRole ? "Yes" : "No"}`);
    }
    
    console.log("\n✅ TOKEN DEPLOYMENT VERIFIED!");
    console.log(`Contract is accessible and operational on Polygon mainnet.`);
    console.log(`Polygonscan: https://polygonscan.com/token/${TOKEN_ADDRESS}`);
    
  } catch (error) {
    console.error("\n❌ VERIFICATION FAILED!");
    console.error("Error:", error.message);
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\nUnhandled error:", error);
    process.exit(1);
  });