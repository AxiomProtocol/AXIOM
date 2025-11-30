// Deploy script for SWFBasketVault and DynamicAPRController
require("dotenv").config();
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    // Get the account that will deploy the contract
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "MATIC");
    console.log("Network:", network.name);

    // Get the SWF token address from the .env file
    const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
    if (!swfTokenAddress) {
      throw new Error("SWF_TOKEN_ADDRESS environment variable is not set");
    }
    console.log("Using SWF token address:", swfTokenAddress);

    // Get optimal gas price for the network (adding 10% buffer over current price)
    const currentGasPrice = await ethers.provider.getGasPrice();
    const gasPrice = currentGasPrice.mul(110).div(100); // Adding 10% buffer
    console.log(`Current gas price: ${ethers.utils.formatUnits(currentGasPrice, "gwei")} gwei`);
    console.log(`Using gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);

    // 1. Deploy SWFBasketVault
    console.log("\n1. Deploying SWFBasketVault...");
    const SWFBasketVault = await ethers.getContractFactory("contracts/SWFBasketVault.sol:SWFBasketVault");
    
    // Estimate gas
    const basketVaultDeploymentData = SWFBasketVault.getDeployTransaction(swfTokenAddress);
    const basketVaultEstimatedGas = await ethers.provider.estimateGas(basketVaultDeploymentData);
    console.log(`Estimated gas for SWFBasketVault: ${basketVaultEstimatedGas.toString()}`);
    
    // Deploy with gas parameters
    const basketVault = await SWFBasketVault.deploy(swfTokenAddress, {
      gasPrice: gasPrice,
      gasLimit: Math.ceil(basketVaultEstimatedGas.toNumber() * 1.2) // Add 20% buffer
    });
    
    console.log("Waiting for SWFBasketVault to be deployed...");
    await basketVault.deployed();
    console.log("SWFBasketVault deployed to:", basketVault.address);
    console.log("Transaction hash:", basketVault.deployTransaction.hash);

    // 2. Deploy SoloMethodEngine (staking contract)
    console.log("\n2. Deploying SoloMethodEngine...");
    const SoloMethodEngine = await ethers.getContractFactory("contracts/SoloMethodEngine.sol:SoloMethodEngine");
    
    // Estimate gas
    const stakingEngineDeploymentData = SoloMethodEngine.getDeployTransaction(swfTokenAddress, deployer.address);
    const stakingEngineEstimatedGas = await ethers.provider.estimateGas(stakingEngineDeploymentData);
    console.log(`Estimated gas for SoloMethodEngine: ${stakingEngineEstimatedGas.toString()}`);
    
    // Deploy with gas parameters
    const stakingEngine = await SoloMethodEngine.deploy(swfTokenAddress, deployer.address, {
      gasPrice: gasPrice,
      gasLimit: Math.ceil(stakingEngineEstimatedGas.toNumber() * 1.2) // Add 20% buffer
    });
    
    console.log("Waiting for SoloMethodEngine to be deployed...");
    await stakingEngine.deployed();
    console.log("SoloMethodEngine deployed to:", stakingEngine.address);
    console.log("Transaction hash:", stakingEngine.deployTransaction.hash);

    // 3. Deploy DynamicAPRController
    console.log("\n3. Deploying DynamicAPRController...");
    const initialAPR = 2000; // 20% initial APR
    const DynamicAPRController = await ethers.getContractFactory("contracts/DynamicAPRController.sol:DynamicAPRController");
    
    // Estimate gas
    const aprControllerDeploymentData = DynamicAPRController.getDeployTransaction(
      basketVault.address,
      stakingEngine.address,
      initialAPR,
      deployer.address
    );
    const aprControllerEstimatedGas = await ethers.provider.estimateGas(aprControllerDeploymentData);
    console.log(`Estimated gas for DynamicAPRController: ${aprControllerEstimatedGas.toString()}`);
    
    // Deploy with gas parameters
    const aprController = await DynamicAPRController.deploy(
      basketVault.address,
      stakingEngine.address,
      initialAPR,
      deployer.address,
      {
        gasPrice: gasPrice,
        gasLimit: Math.ceil(aprControllerEstimatedGas.toNumber() * 1.2) // Add 20% buffer
      }
    );
    
    console.log("Waiting for DynamicAPRController to be deployed...");
    await aprController.deployed();
    console.log("DynamicAPRController deployed to:", aprController.address);
    console.log("Transaction hash:", aprController.deployTransaction.hash);

    // 4. Transfer ownership of staking engine to DynamicAPRController
    console.log("\n4. Transferring ownership of SoloMethodEngine to DynamicAPRController...");
    const transferTx = await stakingEngine.transferOwnership(aprController.address, {
      gasPrice: gasPrice
    });
    console.log("Waiting for ownership transfer transaction to be mined...");
    await transferTx.wait();
    console.log("Ownership transferred, transaction hash:", transferTx.hash);

    // Verify ownership transfer
    const newOwner = await stakingEngine.owner();
    if (newOwner.toLowerCase() === aprController.address.toLowerCase()) {
      console.log("Ownership transfer confirmed successfully");
    } else {
      throw new Error("Ownership transfer failed: new owner doesn't match expected address");
    }

    // Save deployment information
    const deploymentInfo = {
      network: network.name,
      deploymentTime: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        swfToken: {
          address: swfTokenAddress,
          notes: "Pre-existing SWF token"
        },
        swfBasketVault: {
          address: basketVault.address,
          deployTransaction: basketVault.deployTransaction.hash
        },
        soloMethodEngine: {
          address: stakingEngine.address,
          deployTransaction: stakingEngine.deployTransaction.hash
        },
        dynamicAPRController: {
          address: aprController.address,
          deployTransaction: aprController.deployTransaction.hash,
          initialAPR: initialAPR
        }
      },
      transactions: {
        ownershipTransfer: transferTx.hash
      }
    };
    
    // Save to timestamped file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const deploymentPath = path.join(__dirname, `../dynamic-system-deployment-${timestamp}.json`);
    fs.writeFileSync(
      deploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`\nDeployment information saved to: ${deploymentPath}`);
    
    // Save to latest deployment file
    const latestDeploymentPath = path.join(__dirname, "../dynamic-system-latest.json");
    fs.writeFileSync(
      latestDeploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`Latest deployment information saved to: ${latestDeploymentPath}`);
    
    // Update .env file with new contract addresses
    console.log("\nUpdating .env file with new contract addresses...");
    const envPath = path.join(__dirname, "../.env");
    let envContent = fs.readFileSync(envPath, "utf8");
    
    // Update SWF_BASKET_VAULT_ADDRESS
    if (envContent.includes("SWF_BASKET_VAULT_ADDRESS=")) {
      envContent = envContent.replace(/SWF_BASKET_VAULT_ADDRESS=.*/g, `SWF_BASKET_VAULT_ADDRESS=${basketVault.address}`);
    } else {
      envContent += `\nSWF_BASKET_VAULT_ADDRESS=${basketVault.address}`;
    }
    
    // Update SOLO_METHOD_ENGINE_ADDRESS
    if (envContent.includes("SOLO_METHOD_ENGINE_ADDRESS=")) {
      envContent = envContent.replace(/SOLO_METHOD_ENGINE_ADDRESS=.*/g, `SOLO_METHOD_ENGINE_ADDRESS=${stakingEngine.address}`);
    } else {
      envContent += `\nSOLO_METHOD_ENGINE_ADDRESS=${stakingEngine.address}`;
    }
    
    // Update DYNAMIC_APR_CONTROLLER_ADDRESS
    if (envContent.includes("DYNAMIC_APR_CONTROLLER_ADDRESS=")) {
      envContent = envContent.replace(/DYNAMIC_APR_CONTROLLER_ADDRESS=.*/g, `DYNAMIC_APR_CONTROLLER_ADDRESS=${aprController.address}`);
    } else {
      envContent += `\nDYNAMIC_APR_CONTROLLER_ADDRESS=${aprController.address}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(".env file updated successfully");

    // Deployment summary
    console.log("\n=== DEPLOYMENT SUMMARY ===");
    console.log("Network:", network.name);
    console.log("SWF Token Address:", swfTokenAddress);
    console.log("SWFBasketVault Address:", basketVault.address);
    console.log("SoloMethodEngine Address:", stakingEngine.address);
    console.log("DynamicAPRController Address:", aprController.address);
    console.log("Initial APR: 20%");
    console.log("==========================");
    
    console.log("\nDynamic APR System deployment finished successfully!");
    
  } catch (error) {
    console.error("Deployment failed with error:", error);
    process.exitCode = 1;
  }
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error during deployment:", error);
    process.exit(1);
  });