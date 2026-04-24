const { ethers } = require("hardhat");

async function main() {
  console.log("=== Complete Vault Approval for 200M AXUSD ===\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  const FIXFLIP_MANAGER = "0x0d249eea77Efd1977731c9CF421797E291e0971E";
  const DSCR_MANAGER = "0x2657F688Af2fF327987dd7A8d4CCf1E781349052";
  
  const NEW_FIXFLIP_VAULT = "0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5";
  const NEW_DSCR_VAULT = "0x5a09cb67518e6E28d8307D75174430939C044A7d";
  
  const APPROVAL_AMOUNT = ethers.parseUnits("200000000", 18);

  const DSCR_MANAGER_ABI = [
    "function setDSCRVault(address _vault) external",
    "function dscrVault() view returns (address)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function ADMIN_ROLE() view returns (bytes32)"
  ];

  const VAULT_ABI = [
    "function approveSpender(address spender, uint256 amount) external",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function grantRole(bytes32 role, address account) external",
    "function ADMIN_ROLE() view returns (bytes32)",
    "function MANAGER_ROLE() view returns (bytes32)"
  ];

  const AXUSD_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  const dscrManager = new ethers.Contract(DSCR_MANAGER, DSCR_MANAGER_ABI, deployer);
  const dscrVault = new ethers.Contract(NEW_DSCR_VAULT, VAULT_ABI, deployer);
  const fixflipVault = new ethers.Contract(NEW_FIXFLIP_VAULT, VAULT_ABI, deployer);
  const axusd = new ethers.Contract(AXUSD_ADDRESS, AXUSD_ABI, deployer);

  console.log("=== Architecture Notes ===");
  console.log("FixFlipManager uses safeTransferFrom → needs vault ERC20 approval");
  console.log("DSCRLoanManager uses vault.disburse() → needs MANAGER_ROLE on vault only\n");

  console.log("=== Step 1: Update DSCR Manager to Use New Vault ===");
  try {
    const currentDscrVault = await dscrManager.dscrVault();
    console.log("Current DSCR vault:", currentDscrVault);
    
    if (currentDscrVault.toLowerCase() !== NEW_DSCR_VAULT.toLowerCase()) {
      console.log("Updating to new DSCR vault:", NEW_DSCR_VAULT);
      const tx = await dscrManager.setDSCRVault(NEW_DSCR_VAULT);
      await tx.wait();
      console.log("DSCR Manager vault updated! TX:", tx.hash);
    } else {
      console.log("DSCR Manager already using correct vault");
    }
  } catch (e) {
    console.log("Error updating DSCR vault:", e.message);
  }

  console.log("\n=== Step 2: Grant MANAGER_ROLE to DSCR Manager on New Vault ===");
  try {
    const MANAGER_ROLE = await dscrVault.MANAGER_ROLE();
    const hasManagerRole = await dscrVault.hasRole(MANAGER_ROLE, DSCR_MANAGER);
    console.log("DSCR Manager has MANAGER_ROLE on new vault:", hasManagerRole);
    
    if (!hasManagerRole) {
      console.log("Granting MANAGER_ROLE...");
      const tx = await dscrVault.grantRole(MANAGER_ROLE, DSCR_MANAGER);
      await tx.wait();
      console.log("MANAGER_ROLE granted! TX:", tx.hash);
    }
  } catch (e) {
    console.log("Error granting MANAGER_ROLE:", e.message);
  }

  console.log("\n=== Step 3: Execute 200M AXUSD Approval for FixFlip ===");
  console.log("(DSCR doesn't need approval - uses disburse() directly)");
  
  try {
    console.log("Approving FixFlipManager to spend 200M AXUSD from vault...");
    const tx = await fixflipVault.approveSpender(FIXFLIP_MANAGER, APPROVAL_AMOUNT);
    await tx.wait();
    console.log("FixFlip Approval TX:", tx.hash);
  } catch (e) {
    console.log("FixFlip approval error:", e.message);
  }

  console.log("\n=== Step 4: Verify Final State ===");
  
  const fixflipAllowance = await axusd.allowance(NEW_FIXFLIP_VAULT, FIXFLIP_MANAGER);
  console.log("FixFlip Vault -> Manager Allowance:", ethers.formatUnits(fixflipAllowance, 18), "AXUSD");
  
  try {
    const finalDscrVault = await dscrManager.dscrVault();
    console.log("DSCR Manager vault:", finalDscrVault);
    
    const MANAGER_ROLE = await dscrVault.MANAGER_ROLE();
    const hasRole = await dscrVault.hasRole(MANAGER_ROLE, DSCR_MANAGER);
    console.log("DSCR Manager has MANAGER_ROLE on vault:", hasRole);
  } catch (e) {
    console.log("Error checking DSCR state:", e.message);
  }

  console.log("\n=== SUMMARY ===");
  console.log("NEW FixFlipPoolVault:", NEW_FIXFLIP_VAULT, "- 200M approval set");
  console.log("NEW DSCRPoolVault:", NEW_DSCR_VAULT, "- MANAGER_ROLE granted");
  console.log("\nBoth vaults are ready for loan origination!");
  
  const fs = require('fs');
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: "arbitrum-one",
    chainId: 42161,
    action: "vault_approval_complete",
    vaults: {
      fixFlipVault: NEW_FIXFLIP_VAULT,
      dscrVault: NEW_DSCR_VAULT
    },
    managers: {
      fixFlipManager: FIXFLIP_MANAGER,
      dscrManager: DSCR_MANAGER
    },
    fixFlipApproval: {
      amount: "200000000",
      amountWei: APPROVAL_AMOUNT.toString()
    },
    notes: {
      fixFlip: "Uses safeTransferFrom - needs ERC20 approval",
      dscr: "Uses vault.disburse() - needs MANAGER_ROLE only"
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
