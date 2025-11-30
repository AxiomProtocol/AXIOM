const hre = require("hardhat");

/**
 * Verification script for Sovran Wealth Fund token on Polygonscan
 * Using Solidity 0.8.20 for better compatibility
 */
async function main() {
  console.log("Running verification for SovranWealthFund using Solidity 0.8.20...");
  
  const contractAddress = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";
  
  // Contract constructor arguments
  const name = "Sovran Wealth Fund";
  const symbol = "SWF";

  console.log(`Verifying SovranWealthFund at address: ${contractAddress}`);
  console.log(`Contract arguments: name="${name}", symbol="${symbol}"`);
  
  try {
    // Direct approach using source code
    console.log("Using direct verification with source code...");
    
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [name, symbol],
      contract: "contracts/compiled-0.8.20/SovranWealthFund.sol:SovranWealthFund"
    });
    
    console.log("Verification successful!");
  } catch (error) {
    console.error("Verification failed:", error);
    
    try {
      // Fallback approach - verify using our flattened file
      console.log("\nAttempting fallback verification with flattened source...");
      
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [name, symbol],
        contract: "contracts/compiled-0.8.20/SovranWealthFundFlat.sol:SovranWealthFund"
      });
      
      console.log("Fallback verification successful!");
    } catch (fallbackError) {
      console.error("Fallback verification also failed:", fallbackError);
      console.log("\nYou may need to manually verify the contract using the flattened contract file.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });