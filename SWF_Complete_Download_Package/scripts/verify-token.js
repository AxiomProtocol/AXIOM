const hre = require("hardhat");
require('dotenv').config();

/**
 * Script to verify the SovranWealthFund token contract on PolygonScan
 */
async function main() {
  console.log("Starting SWF token verification process...");
  
  // Check if we have a token address
  const tokenAddress = process.env.SWF_TOKEN_ADDRESS;
  
  if (!tokenAddress || tokenAddress === "") {
    console.error("Error: SWF_TOKEN_ADDRESS not found in .env file");
    console.error("Please make sure the token is deployed and the address is set in the .env file");
    process.exit(1);
  }
  
  console.log("Verifying SWF token at address:", tokenAddress);
  
  try {
    // Verify the contract on PolygonScan
    await hre.run("verify:verify", {
      address: tokenAddress,
      contract: "contracts/SovranWealthFund.sol:SovranWealthFund",
      constructorArguments: [] // SovranWealthFund has no constructor arguments (parameters are passed directly in the contract)
    });
    
    console.log("Verification successful!");
    console.log(`Contract is now verified on PolygonScan: https://polygonscan.com/address/${tokenAddress}#code`);
    
  } catch (error) {
    // Check if it's already verified
    if (error.message.includes("already verified")) {
      console.log("Contract is already verified on PolygonScan!");
      console.log(`You can view it here: https://polygonscan.com/address/${tokenAddress}#code`);
    } else {
      console.error("Error during verification:", error);
      process.exit(1);
    }
  }
}

// Run the verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });