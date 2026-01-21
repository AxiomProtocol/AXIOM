import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("ETH Balance:", ethers.formatEther(balance), "ETH");
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());
  
  if (balance < ethers.parseEther("0.05")) {
    console.log("\nWARNING: Balance may be insufficient for full DEX deployment!");
    console.log("Recommended: At least 0.1 ETH for all 10 contracts + initializations");
  } else {
    console.log("\nBalance should be sufficient for deployment.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
