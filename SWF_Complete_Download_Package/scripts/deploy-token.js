const { ethers } = require("hardhat");
const fs = require("fs");
require('dotenv').config();

/**
 * Script to deploy or use existing Sovran Wealth Fund (SWF) token on Polygon Mainnet
 */
async function main() {
  console.log("Starting SWF token process...");
  
  // Check if we already have a deployed token
  const existingTokenAddress = process.env.SWF_TOKEN_ADDRESS;
  
  if (existingTokenAddress && existingTokenAddress !== "") {
    console.log("Found existing SWF token address:", existingTokenAddress);
    console.log("Connecting to existing token instead of deploying a new one...");
    
    // Connect to the existing token
    const SovranWealthFund = await ethers.getContractFactory("contracts/SovranWealthFund.sol:SovranWealthFund");
    const token = await SovranWealthFund.attach(existingTokenAddress);
    
    try {
      // Verify it's the correct token by checking name and symbol
      const name = await token.name();
      const symbol = await token.symbol();
      
      if (name === "Sovran Wealth Fund" && symbol === "SWF") {
        console.log("Successfully connected to existing SWF token!");
        console.log("\nToken Info:");
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Decimals:", await token.decimals());
        
        // Get the total supply
        const totalSupply = await token.totalSupply();
        console.log("Total Supply:", ethers.utils.formatUnits(totalSupply, 18), "SWF");
        
        // Log the deployer's balance
        const signer = (await ethers.getSigners())[0];
        const balance = await token.balanceOf(signer.address);
        console.log("\nCurrent wallet address:", signer.address);
        console.log("SWF Balance:", ethers.utils.formatUnits(balance, 18), "SWF");
        
        // Log main distributor balance
        if (process.env.MAIN_DISTRIBUTOR_ADDRESS) {
          const distributorBalance = await token.balanceOf(process.env.MAIN_DISTRIBUTOR_ADDRESS);
          console.log("\nMain Distributor address:", process.env.MAIN_DISTRIBUTOR_ADDRESS);
          console.log("Main Distributor balance:", ethers.utils.formatUnits(distributorBalance, 18), "SWF");
        }
        
        console.log("\nNo new deployment needed. Using existing token.");
        return;
      } else {
        console.warn("WARNING: The token at the provided address doesn't match SWF token details!");
        console.warn("Found:", name, symbol);
        console.warn("Expected: Sovran Wealth Fund SWF");
      }
    } catch (error) {
      console.error("Error connecting to existing token:", error.message);
      console.log("Will proceed with new token deployment...");
    }
  }
  
  try {
    console.log("Proceeding with new SWF token deployment...");
    
    // Get the contract factory
    const SovranWealthFundFactory = await ethers.getContractFactory("contracts/SovranWealthFund.sol:SovranWealthFund");
    console.log("Contract factory initialized.");

    // Deploy the contract
    console.log("Deploying SovranWealthFund token...");
    const token = await SovranWealthFundFactory.deploy();
    
    // Wait for the deployment transaction to be mined
    await token.deployed();
    
    // Log the deployment details
    console.log("SovranWealthFund deployed successfully!");
    console.log("Token address:", token.address);
    console.log("Transaction hash:", token.deployTransaction.hash);
    
    console.log("\nToken Info:");
    console.log("Name:", await token.name());
    console.log("Symbol:", await token.symbol());
    console.log("Decimals:", await token.decimals());
    
    // Get the total supply
    const totalSupply = await token.totalSupply();
    console.log("Total Supply:", ethers.utils.formatUnits(totalSupply, 18), "SWF");
    
    // Log the deployer's balance
    const deployer = (await ethers.getSigners())[0];
    const deployerBalance = await token.balanceOf(deployer.address);
    console.log("\nDeployer address:", deployer.address);
    console.log("Deployer balance:", ethers.utils.formatUnits(deployerBalance, 18), "SWF");
    
    // Update deployment info in a JSON file for tracking
    const deploymentInfo = {
      network: "polygon",
      tokenAddress: token.address,
      transactionHash: token.deployTransaction.hash,
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      tokenDetails: {
        name: "Sovran Wealth Fund",
        symbol: "SWF",
        decimals: 18,
        totalSupply: "1000000000"
      }
    };
    
    fs.writeFileSync(
      "token-deployment-info.json", 
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\nDeployment info saved to token-deployment-info.json");
    
    // Update the .env file with the new token address
    try {
      let envContent = fs.readFileSync('.env', 'utf8');
      envContent = envContent.replace(
        /SWF_TOKEN_ADDRESS=.*/,
        `SWF_TOKEN_ADDRESS=${token.address}`
      );
      fs.writeFileSync('.env', envContent);
      console.log("Updated .env file with new token address");
    } catch (err) {
      console.warn("Warning: Could not update .env file:", err.message);
    }
    
    console.log("\nNext steps:");
    console.log("1. Verify the contract on PolygonScan");
    console.log("2. Add SWF to your wallet using the token address");
    console.log("3. Submit the logo to PolygonScan and wallet providers");
    
  } catch (error) {
    console.error("Error during deployment:", error);
    process.exit(1);
  }
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });