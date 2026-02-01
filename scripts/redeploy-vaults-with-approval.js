const { ethers } = require("hardhat");

async function main() {
  console.log("=== Redeploy Vaults with approveSpender + Update Managers ===\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  const FIXFLIP_MANAGER = "0x0d249eea77Efd1977731c9CF421797E291e0971E";
  const DSCR_MANAGER = "0x2657F688Af2fF327987dd7A8d4CCf1E781349052";
  
  const APPROVAL_AMOUNT = ethers.parseUnits("200000000", 18);
  console.log("Approval Amount: 200,000,000 AXUSD (18 decimals)");

  const MANAGER_ABI = [
    "function setVault(address _vault) external",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function ADMIN_ROLE() view returns (bytes32)"
  ];

  console.log("\n=== Step 1: Deploy New FixFlipPoolVault ===");
  const FixFlipPoolVault = await ethers.getContractFactory("FixFlipPoolVault");
  const fixflipVault = await FixFlipPoolVault.deploy(
    AXUSD_ADDRESS,
    "AXUSD Fix&Flip Vault Shares V2",
    "axffVAULT2"
  );
  await fixflipVault.waitForDeployment();
  const fixflipVaultAddr = await fixflipVault.getAddress();
  console.log("New FixFlipPoolVault deployed:", fixflipVaultAddr);

  console.log("\n=== Step 2: Deploy New DSCRPoolVault ===");
  const DSCRPoolVault = await ethers.getContractFactory("DSCRPoolVault");
  const dscrVault = await DSCRPoolVault.deploy(
    AXUSD_ADDRESS,
    "AXUSD DSCR Vault Shares V2",
    "axdscrVAULT2"
  );
  await dscrVault.waitForDeployment();
  const dscrVaultAddr = await dscrVault.getAddress();
  console.log("New DSCRPoolVault deployed:", dscrVaultAddr);

  console.log("\n=== Step 3: Grant MANAGER_ROLE to Loan Managers ===");
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
  
  console.log("Granting MANAGER_ROLE to FixFlipManager on new vault...");
  let tx = await fixflipVault.grantRole(MANAGER_ROLE, FIXFLIP_MANAGER);
  await tx.wait();
  console.log("FixFlipManager has MANAGER_ROLE on new vault");
  
  console.log("Granting MANAGER_ROLE to DSCRManager on new vault...");
  tx = await dscrVault.grantRole(MANAGER_ROLE, DSCR_MANAGER);
  await tx.wait();
  console.log("DSCRManager has MANAGER_ROLE on new vault");

  console.log("\n=== Step 4: Update Managers to Use New Vaults ===");
  const fixflipManager = new ethers.Contract(FIXFLIP_MANAGER, MANAGER_ABI, deployer);
  const dscrManager = new ethers.Contract(DSCR_MANAGER, MANAGER_ABI, deployer);

  console.log("Updating FixFlipManager vault reference...");
  tx = await fixflipManager.setVault(fixflipVaultAddr);
  await tx.wait();
  console.log("FixFlipManager now uses new vault:", fixflipVaultAddr);

  console.log("Updating DSCRLoanManager vault reference...");
  tx = await dscrManager.setVault(dscrVaultAddr);
  await tx.wait();
  console.log("DSCRLoanManager now uses new vault:", dscrVaultAddr);

  console.log("\n=== Step 5: Execute 200M AXUSD Approvals ===");
  
  console.log("Approving FixFlipManager to spend 200M AXUSD from new vault...");
  tx = await fixflipVault.approveSpender(FIXFLIP_MANAGER, APPROVAL_AMOUNT);
  await tx.wait();
  console.log("FixFlip Approval TX:", tx.hash);
  
  console.log("Approving DSCRManager to spend 200M AXUSD from new vault...");
  tx = await dscrVault.approveSpender(DSCR_MANAGER, APPROVAL_AMOUNT);
  await tx.wait();
  console.log("DSCR Approval TX:", tx.hash);

  console.log("\n=== Step 6: Verify Approvals ===");
  const axusd = await ethers.getContractAt("IERC20", AXUSD_ADDRESS);
  
  const fixflipAllowance = await axusd.allowance(fixflipVaultAddr, FIXFLIP_MANAGER);
  console.log("FixFlip Vault -> Manager Allowance:", ethers.formatUnits(fixflipAllowance, 18), "AXUSD");
  
  const dscrAllowance = await axusd.allowance(dscrVaultAddr, DSCR_MANAGER);
  console.log("DSCR Vault -> Manager Allowance:", ethers.formatUnits(dscrAllowance, 18), "AXUSD");

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("NEW FixFlipPoolVault:", fixflipVaultAddr);
  console.log("NEW DSCRPoolVault:", dscrVaultAddr);
  console.log("\nBoth managers updated to use new vaults");
  console.log("Both vaults approved managers for 200M AXUSD spending\n");
  
  const fs = require('fs');
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: "arbitrum-one",
    chainId: 42161,
    action: "vault_upgrade_with_approval",
    newVaults: {
      fixFlipVault: fixflipVaultAddr,
      dscrVault: dscrVaultAddr
    },
    oldVaults: {
      fixFlipVault: "0xe39dCDf4C703BdA4527a7368a1E513DB2316F6b4",
      dscrVault: "0x1E2ae36ffab9b0f0811B404E7b55FbD6824Cb504"
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
  console.log("Deployment info saved to stablecoin-deploy/vault-upgrade.json");
  console.log("\nREMEMBER: Update shared/contracts.ts with new vault addresses!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
