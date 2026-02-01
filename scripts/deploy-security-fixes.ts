import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying security-fixed contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const axmToken = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
  const treasuryVault = "0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d";

  console.log("\n=== Deploying DePINNodeSuite (Security Fixed) ===");
  const DePINNodeSuite = await ethers.getContractFactory("DePINNodeSuite");
  const depinNodeSuite = await DePINNodeSuite.deploy(
    axmToken,
    treasuryVault,
    treasuryVault
  );
  await depinNodeSuite.waitForDeployment();
  const depinAddress = await depinNodeSuite.getAddress();
  console.log("DePINNodeSuite deployed to:", depinAddress);

  console.log("\n=== Deploying LeaseAndRentEngine (Security Fixed) ===");
  const LeaseAndRentEngine = await ethers.getContractFactory("LeaseAndRentEngine");
  const leaseEngine = await LeaseAndRentEngine.deploy(
    axmToken,
    treasuryVault,
    treasuryVault
  );
  await leaseEngine.waitForDeployment();
  const leaseAddress = await leaseEngine.getAddress();
  console.log("LeaseAndRentEngine deployed to:", leaseAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("DePINNodeSuite:", depinAddress);
  console.log("LeaseAndRentEngine:", leaseAddress);
  
  console.log("\n=== Constructor Arguments for Verification ===");
  console.log("DePINNodeSuite args:", [axmToken, treasuryVault, treasuryVault]);
  console.log("LeaseAndRentEngine args:", [axmToken, treasuryVault, treasuryVault]);
  
  console.log("\n=== Old Contract Addresses (for reference) ===");
  console.log("Old DePINNodeSuite: 0x16dC3884d88b767D99E0701Ba026a1ed39a250F1");
  console.log("Old LeaseAndRentEngine: 0x26a20dEa57F951571AD6e518DFb3dC60634D5297");
  
  console.log("\n=== Verification Commands ===");
  console.log(`npx hardhat verify --network arbitrum ${depinAddress} ${axmToken} ${treasuryVault} ${treasuryVault}`);
  console.log(`npx hardhat verify --network arbitrum ${leaseAddress} ${axmToken} ${treasuryVault} ${treasuryVault}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
