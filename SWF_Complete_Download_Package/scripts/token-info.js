const { ethers } = require("hardhat");
require('dotenv').config();

/**
 * Script to get information about the SWF token on Polygon
 */
async function main() {
  console.log("Fetching SWF token information from Polygon...");
  
  // Check if we have a token address
  const tokenAddress = process.env.SWF_TOKEN_ADDRESS;
  
  if (!tokenAddress || tokenAddress === "") {
    console.error("Error: SWF_TOKEN_ADDRESS not found in .env file");
    process.exit(1);
  }
  
  console.log("SWF token address:", tokenAddress);
  
  try {
    // Connect to the token contract
    const SovranWealthFund = await ethers.getContractFactory("contracts/SovranWealthFund.sol:SovranWealthFund");
    const token = await SovranWealthFund.attach(tokenAddress);
    
    // Get token info
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    
    console.log("\nToken Information:");
    console.log("------------------");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals);
    console.log("Total Supply:", ethers.utils.formatUnits(totalSupply, decimals), symbol);
    
    // Get the current wallet balance
    const signer = (await ethers.getSigners())[0];
    const balance = await token.balanceOf(signer.address);
    
    console.log("\nCurrent Wallet:");
    console.log("------------------");
    console.log("Address:", signer.address);
    console.log("Balance:", ethers.utils.formatUnits(balance, decimals), symbol);
    
    // Get main distributor balance if available
    if (process.env.MAIN_DISTRIBUTOR_ADDRESS) {
      const distributorBalance = await token.balanceOf(process.env.MAIN_DISTRIBUTOR_ADDRESS);
      console.log("\nMain Distributor:");
      console.log("------------------");
      console.log("Address:", process.env.MAIN_DISTRIBUTOR_ADDRESS);
      console.log("Balance:", ethers.utils.formatUnits(distributorBalance, decimals), symbol);
    }
    
    // Get treasury wallet balance if available
    if (process.env.TREASURY_WALLET) {
      const treasuryBalance = await token.balanceOf(process.env.TREASURY_WALLET);
      console.log("\nTreasury Wallet:");
      console.log("------------------");
      console.log("Address:", process.env.TREASURY_WALLET);
      console.log("Balance:", ethers.utils.formatUnits(treasuryBalance, decimals), symbol);
    }
    
    // Check owner of the token
    try {
      const owner = await token.owner();
      console.log("\nToken Owner:");
      console.log("------------------");
      console.log("Address:", owner);
      
      if (owner.toLowerCase() === signer.address.toLowerCase()) {
        console.log("You are the owner of the token contract ✓");
      } else {
        console.log("You are NOT the owner of the token contract");
      }
    } catch (error) {
      console.log("Could not fetch owner information");
    }
    
    console.log("\nPolygonScan:");
    console.log("------------------");
    console.log(`https://polygonscan.com/token/${tokenAddress}`);
    
  } catch (error) {
    console.error("Error fetching token information:", error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });