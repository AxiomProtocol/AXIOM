// scripts/grantMinterRoleToSoloMethodEngine.js
// Grant MINTER_ROLE to the SoloMethodEngine contract for reward distribution

const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');

async function main() {
  try {
    // Load deployment information
    if (!fs.existsSync('soloMethodEngine-deployment.json')) {
      throw new Error("soloMethodEngine-deployment.json not found. Deploy the SoloMethodEngine first.");
    }

    const deploymentInfo = JSON.parse(fs.readFileSync('soloMethodEngine-deployment.json', 'utf8'));
    const soloMethodEngineAddress = deploymentInfo.soloMethodEngine.address;
    const swfAddress = deploymentInfo.soloMethodEngine.swfTokenAddress;

    console.log("=== Granting MINTER_ROLE to SoloMethodEngine ===");
    console.log(`SWF Token Address: ${swfAddress}`);
    console.log(`SoloMethodEngine Address: ${soloMethodEngineAddress}`);

    // Get a contract instance for the SWF token
    const SWF = await hre.ethers.getContractFactory("contracts/SovranWealthEngine.sol:SovranWealthFund");
    const swfToken = await SWF.attach(swfAddress);

    // Get the current gas price from the network and increase it slightly
    const provider = hre.ethers.provider;
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = hre.ethers.utils.formatUnits(gasPrice, "gwei");
    console.log(`Current gas price: ${gasPriceGwei} gwei`);
    
    // Set higher gas price to ensure transaction goes through
    // Using at least 37.5 gwei or 1.5x current price, whichever is higher
    const minGasPrice = hre.ethers.utils.parseUnits("37.5", "gwei");
    const recommendedGasPrice = gasPrice.mul(15).div(10); // 1.5x current price
    const finalGasPrice = recommendedGasPrice.gt(minGasPrice) ? recommendedGasPrice : minGasPrice;
    const finalGasPriceGwei = hre.ethers.utils.formatUnits(finalGasPrice, "gwei");
    
    console.log(`Using gas price: ${finalGasPriceGwei} gwei`);

    // Get the MINTER_ROLE hash
    const MINTER_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("MINTER_ROLE"));
    console.log(`MINTER_ROLE hash: ${MINTER_ROLE}`);

    // Grant MINTER_ROLE to the SoloMethodEngine contract
    console.log("Granting MINTER_ROLE to SoloMethodEngine...");
    const tx = await swfToken.grantRole(MINTER_ROLE, soloMethodEngineAddress, {
      gasPrice: finalGasPrice,
      gasLimit: 300000 // Setting an appropriate gas limit
    });

    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    await tx.wait();
    
    console.log("✅ MINTER_ROLE granted to SoloMethodEngine");
    
    // Check if the role was granted correctly
    const hasRole = await swfToken.hasRole(MINTER_ROLE, soloMethodEngineAddress);
    console.log(`SoloMethodEngine has MINTER_ROLE: ${hasRole}`);
    
    // Update the deployment info to mark that the role was granted
    deploymentInfo.soloMethodEngine.hasMinterRole = true;
    deploymentInfo.soloMethodEngine.minterRoleGrantedAt = new Date().toISOString();
    
    fs.writeFileSync(
      'soloMethodEngine-deployment.json', 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("Updated deployment information saved to soloMethodEngine-deployment.json");
    console.log("=== Role Grant Complete ===");
    
  } catch (error) {
    console.error("❌ Role grant failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });