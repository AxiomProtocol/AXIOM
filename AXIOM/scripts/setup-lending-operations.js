const { ethers } = require("hardhat");

async function main() {
  console.log("=== AXUSD Lending Operations Setup ===\n");

  const [deployer] = await ethers.getSigners();
  console.log("Operator:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  
  const FIXFLIP_VAULT = "0xe39dCDf4C703BdA4527a7368a1E513DB2316F6b4";
  const FIXFLIP_MANAGER = "0x0d249eea77Efd1977731c9CF421797E291e0971E";
  
  const DSCR_VAULT = "0x1E2ae36ffab9b0f0811B404E7b55FbD6824Cb504";
  const DSCR_MANAGER = "0x2657F688Af2fF327987dd7A8d4CCf1E781349052";

  const erc20Abi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
  ];

  const vaultAbi = [
    "function grantRole(bytes32 role, address account) external",
    "function hasRole(bytes32 role, address account) external view returns (bool)",
    "function UNDERWRITER_ROLE() external view returns (bytes32)",
    "function totalAssets() external view returns (uint256)"
  ];

  const axusd = new ethers.Contract(AXUSD_ADDRESS, erc20Abi, deployer);

  console.log("=== Step 1: Vault Approvals ===");
  
  const fixflipVaultContract = new ethers.Contract(FIXFLIP_VAULT, [...erc20Abi, "function approve(address,uint256) external returns (bool)"], deployer);
  const dscrVaultContract = new ethers.Contract(DSCR_VAULT, [...erc20Abi, "function approve(address,uint256) external returns (bool)"], deployer);

  const MAX_APPROVAL = ethers.MaxUint256;

  console.log("\nChecking FixFlip vault approval...");
  let fixflipAllowance = await axusd.allowance(FIXFLIP_VAULT, FIXFLIP_MANAGER);
  console.log("Current allowance:", ethers.formatUnits(fixflipAllowance, 18), "AXUSD");
  
  if (fixflipAllowance < ethers.parseUnits("1000000", 18)) {
    console.log("Approval needed - but must be called from vault contract itself");
    console.log("NOTE: Vault owner must call: vault.approveSpender(AXUSD, FixFlipManager, MAX_UINT256)");
  } else {
    console.log("FixFlip vault already approved!");
  }

  console.log("\nChecking DSCR vault approval...");
  let dscrAllowance = await axusd.allowance(DSCR_VAULT, DSCR_MANAGER);
  console.log("Current allowance:", ethers.formatUnits(dscrAllowance, 18), "AXUSD");
  
  if (dscrAllowance < ethers.parseUnits("1000000", 18)) {
    console.log("Approval needed - but must be called from vault contract itself");
    console.log("NOTE: Vault owner must call: vault.approveSpender(AXUSD, DSCRManager, MAX_UINT256)");
  } else {
    console.log("DSCR vault already approved!");
  }

  console.log("\n=== Step 2: Check Vault Liquidity ===");
  
  const fixflipVaultBalance = await axusd.balanceOf(FIXFLIP_VAULT);
  console.log("FixFlip Vault Balance:", ethers.formatUnits(fixflipVaultBalance, 18), "AXUSD");
  
  const dscrVaultBalance = await axusd.balanceOf(DSCR_VAULT);
  console.log("DSCR Vault Balance:", ethers.formatUnits(dscrVaultBalance, 18), "AXUSD");

  console.log("\n=== Step 3: Role Assignments ===");
  
  const UNDERWRITER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UNDERWRITER_ROLE"));
  
  const fixflipManagerContract = new ethers.Contract(FIXFLIP_MANAGER, vaultAbi, deployer);
  const dscrManagerContract = new ethers.Contract(DSCR_MANAGER, vaultAbi, deployer);

  const hasFixFlipRole = await fixflipManagerContract.hasRole(UNDERWRITER_ROLE, deployer.address);
  console.log("Deployer has UNDERWRITER_ROLE on FixFlip:", hasFixFlipRole);
  
  if (!hasFixFlipRole) {
    console.log("Granting UNDERWRITER_ROLE on FixFlipManager...");
    const tx1 = await fixflipManagerContract.grantRole(UNDERWRITER_ROLE, deployer.address);
    await tx1.wait();
    console.log("Granted! TX:", tx1.hash);
  }

  const hasDscrRole = await dscrManagerContract.hasRole(UNDERWRITER_ROLE, deployer.address);
  console.log("Deployer has UNDERWRITER_ROLE on DSCR:", hasDscrRole);
  
  if (!hasDscrRole) {
    console.log("Granting UNDERWRITER_ROLE on DSCRManager...");
    const tx2 = await dscrManagerContract.grantRole(UNDERWRITER_ROLE, deployer.address);
    await tx2.wait();
    console.log("Granted! TX:", tx2.hash);
  }

  console.log("\n=== Setup Summary ===");
  console.log("FixFlip Vault:", FIXFLIP_VAULT);
  console.log("FixFlip Manager:", FIXFLIP_MANAGER);
  console.log("DSCR Vault:", DSCR_VAULT);
  console.log("DSCR Manager:", DSCR_MANAGER);
  console.log("\nRemaining Actions:");
  console.log("1. Vault owners must approve managers to spend AXUSD (call approveSpender on each vault)");
  console.log("2. Deposit AXUSD liquidity into vaults for loan origination");
  console.log("\n=== Setup Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
