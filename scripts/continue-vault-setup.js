const { ethers } = require("hardhat");

async function main() {
  console.log("=== Continue Vault Setup ===\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  const FIXFLIP_MANAGER = "0x0d249eea77Efd1977731c9CF421797E291e0971E";
  const DSCR_MANAGER = "0x2657F688Af2fF327987dd7A8d4CCf1E781349052";
  
  const NEW_FIXFLIP_VAULT = "0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5";
  const NEW_DSCR_VAULT = "0x5a09cb67518e6E28d8307D75174430939C044A7d";
  
  const APPROVAL_AMOUNT = ethers.parseUnits("200000000", 18);

  const MANAGER_ABI = [
    "function setVault(address _vault) external",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function ADMIN_ROLE() view returns (bytes32)",
    "function grantRole(bytes32 role, address account) external",
    "function vault() view returns (address)"
  ];

  const VAULT_ABI = [
    "function approveSpender(address spender, uint256 amount) external",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function ADMIN_ROLE() view returns (bytes32)"
  ];

  const dscrManager = new ethers.Contract(DSCR_MANAGER, MANAGER_ABI, deployer);
  const dscrVault = new ethers.Contract(NEW_DSCR_VAULT, VAULT_ABI, deployer);
  const fixflipVault = new ethers.Contract(NEW_FIXFLIP_VAULT, VAULT_ABI, deployer);

  console.log("=== Checking DSCR Manager State ===");
  const dscrAdminRole = await dscrManager.ADMIN_ROLE();
  const hasDscrAdmin = await dscrManager.hasRole(dscrAdminRole, deployer.address);
  console.log("Deployer has ADMIN_ROLE on DSCRManager:", hasDscrAdmin);

  const currentVault = await dscrManager.vault();
  console.log("Current DSCR vault:", currentVault);

  if (!hasDscrAdmin) {
    console.log("\nDeployer doesn't have ADMIN_ROLE. Checking DEFAULT_ADMIN_ROLE...");
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const hasDefaultAdmin = await dscrManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    console.log("Deployer has DEFAULT_ADMIN_ROLE:", hasDefaultAdmin);
    
    if (hasDefaultAdmin) {
      console.log("Granting ADMIN_ROLE to deployer...");
      const tx = await dscrManager.grantRole(dscrAdminRole, deployer.address);
      await tx.wait();
      console.log("ADMIN_ROLE granted!");
    }
  }

  console.log("\n=== Updating DSCR Manager Vault ===");
  try {
    const tx = await dscrManager.setVault(NEW_DSCR_VAULT);
    await tx.wait();
    console.log("DSCRManager now uses new vault:", NEW_DSCR_VAULT);
  } catch (e) {
    console.log("setVault failed:", e.message);
    console.log("Skipping - may need different admin");
  }

  console.log("\n=== Executing 200M AXUSD Approvals ===");
  
  console.log("1. Approving FixFlipManager...");
  try {
    const tx1 = await fixflipVault.approveSpender(FIXFLIP_MANAGER, APPROVAL_AMOUNT);
    await tx1.wait();
    console.log("FixFlip Approval TX:", tx1.hash);
  } catch (e) {
    console.log("FixFlip approval error:", e.message);
  }
  
  console.log("\n2. Approving DSCRManager...");
  try {
    const tx2 = await dscrVault.approveSpender(DSCR_MANAGER, APPROVAL_AMOUNT);
    await tx2.wait();
    console.log("DSCR Approval TX:", tx2.hash);
  } catch (e) {
    console.log("DSCR approval error:", e.message);
  }

  console.log("\n=== Verifying Approvals ===");
  const axusd = await ethers.getContractAt("IERC20", AXUSD_ADDRESS);
  
  const fixflipAllowance = await axusd.allowance(NEW_FIXFLIP_VAULT, FIXFLIP_MANAGER);
  console.log("FixFlip Vault -> Manager Allowance:", ethers.formatUnits(fixflipAllowance, 18), "AXUSD");
  
  const dscrAllowance = await axusd.allowance(NEW_DSCR_VAULT, DSCR_MANAGER);
  console.log("DSCR Vault -> Manager Allowance:", ethers.formatUnits(dscrAllowance, 18), "AXUSD");

  console.log("\n=== SUMMARY ===");
  console.log("NEW FixFlipPoolVault:", NEW_FIXFLIP_VAULT);
  console.log("NEW DSCRPoolVault:", NEW_DSCR_VAULT);
  
  const fs = require('fs');
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: "arbitrum-one",
    chainId: 42161,
    action: "vault_upgrade_with_approval",
    newVaults: {
      fixFlipVault: NEW_FIXFLIP_VAULT,
      dscrVault: NEW_DSCR_VAULT
    },
    managers: {
      fixFlipManager: FIXFLIP_MANAGER,
      dscrManager: DSCR_MANAGER
    },
    approval: {
      amount: "200000000",
      amountWei: APPROVAL_AMOUNT.toString()
    }
  };
  
  fs.writeFileSync(
    'stablecoin-deploy/vault-upgrade.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to stablecoin-deploy/vault-upgrade.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
