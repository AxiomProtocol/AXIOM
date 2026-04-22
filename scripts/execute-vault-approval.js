const { ethers } = require("hardhat");

async function main() {
  console.log("=== Execute Vault Approvals for 200M AXUSD ===\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  const VAULT_ABI = [
    "function approveSpender(address spender, uint256 amount) external",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function ADMIN_ROLE() view returns (bytes32)"
  ];

  const AXUSD_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  const FIXFLIP_VAULT = "0xe39dCDf4C703BdA4527a7368a1E513DB2316F6b4";
  const FIXFLIP_MANAGER = "0x0d249eea77Efd1977731c9CF421797E291e0971E";
  const DSCR_VAULT = "0x1E2ae36ffab9b0f0811B404E7b55FbD6824Cb504";
  const DSCR_MANAGER = "0x2657F688Af2fF327987dd7A8d4CCf1E781349052";
  const AXUSD = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";

  const APPROVAL_AMOUNT = ethers.parseUnits("200000000", 18);

  const axusd = new ethers.Contract(AXUSD, AXUSD_ABI, deployer);

  console.log("=== Checking Current Allowances ===");
  let fixflipAllowance = await axusd.allowance(FIXFLIP_VAULT, FIXFLIP_MANAGER);
  console.log("FixFlip Vault -> Manager:", ethers.formatUnits(fixflipAllowance, 18), "AXUSD");
  
  let dscrAllowance = await axusd.allowance(DSCR_VAULT, DSCR_MANAGER);
  console.log("DSCR Vault -> Manager:", ethers.formatUnits(dscrAllowance, 18), "AXUSD");

  console.log("\n=== Checking Admin Roles ===");
  const fixflipVault = new ethers.Contract(FIXFLIP_VAULT, VAULT_ABI, deployer);
  const dscrVault = new ethers.Contract(DSCR_VAULT, VAULT_ABI, deployer);

  const adminRole = await fixflipVault.ADMIN_ROLE();
  console.log("ADMIN_ROLE hash:", adminRole);

  const hasFixFlipAdmin = await fixflipVault.hasRole(adminRole, deployer.address);
  console.log("Deployer has ADMIN_ROLE on FixFlip Vault:", hasFixFlipAdmin);

  const hasDscrAdmin = await dscrVault.hasRole(adminRole, deployer.address);
  console.log("Deployer has ADMIN_ROLE on DSCR Vault:", hasDscrAdmin);

  if (!hasFixFlipAdmin || !hasDscrAdmin) {
    console.log("\nERROR: Deployer does not have ADMIN_ROLE on one or both vaults!");
    return;
  }

  console.log("\n=== Executing Approvals ===");
  console.log("Approval Amount: 200,000,000 AXUSD");

  console.log("\n1. Approving FixFlipManager to spend from FixFlipVault...");
  try {
    const tx1 = await fixflipVault.approveSpender(FIXFLIP_MANAGER, APPROVAL_AMOUNT);
    console.log("TX Hash:", tx1.hash);
    console.log("Waiting for confirmation...");
    const receipt1 = await tx1.wait();
    console.log("Confirmed! Block:", receipt1.blockNumber);
  } catch (e) {
    console.log("Error:", e.message);
    if (e.message.includes("missing revert data")) {
      console.log("NOTE: This may mean approveSpender function doesn't exist in deployed contract");
    }
  }

  console.log("\n2. Approving DSCRManager to spend from DSCRVault...");
  try {
    const tx2 = await dscrVault.approveSpender(DSCR_MANAGER, APPROVAL_AMOUNT);
    console.log("TX Hash:", tx2.hash);
    console.log("Waiting for confirmation...");
    const receipt2 = await tx2.wait();
    console.log("Confirmed! Block:", receipt2.blockNumber);
  } catch (e) {
    console.log("Error:", e.message);
    if (e.message.includes("missing revert data")) {
      console.log("NOTE: This may mean approveSpender function doesn't exist in deployed contract");
    }
  }

  console.log("\n=== Verifying New Allowances ===");
  fixflipAllowance = await axusd.allowance(FIXFLIP_VAULT, FIXFLIP_MANAGER);
  console.log("FixFlip Vault -> Manager:", ethers.formatUnits(fixflipAllowance, 18), "AXUSD");
  
  dscrAllowance = await axusd.allowance(DSCR_VAULT, DSCR_MANAGER);
  console.log("DSCR Vault -> Manager:", ethers.formatUnits(dscrAllowance, 18), "AXUSD");

  console.log("\n=== Approval Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
