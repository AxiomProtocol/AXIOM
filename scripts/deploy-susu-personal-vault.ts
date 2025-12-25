import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying SusuPersonalVault with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const TREASURY_VAULT = "0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d";

  console.log("Treasury Vault:", TREASURY_VAULT);

  const SusuPersonalVault = await ethers.getContractFactory("SusuPersonalVault");
  const contract = await SusuPersonalVault.deploy(TREASURY_VAULT);

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("SusuPersonalVault deployed to:", address);

  console.log("\nWaiting for block confirmations...");
  const deployTx = contract.deploymentTransaction();
  if (deployTx) {
    await deployTx.wait(5);
  }

  console.log("\nVerification command:");
  console.log(`npx hardhat verify --network arbitrum ${address} "${TREASURY_VAULT}"`);

  return address;
}

main()
  .then((address) => {
    console.log("\nDeployment successful!");
    console.log("Contract address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
