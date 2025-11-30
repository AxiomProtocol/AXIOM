const hre = require("hardhat");

async function main() {
  const SWFCore = await hre.ethers.getContractFactory("SWFCoreUpgradeable");
  const contract = await SWFCore.deploy(); // if it uses constructor args, add them here
  await contract.deployed();

  console.log("SWFCoreUpgradeable deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});