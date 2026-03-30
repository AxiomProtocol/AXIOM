/**
 * deploy-canonical-psm-hardhat.ts
 * Hardhat runtime deployment for CanonicalPSM (ERC-3643 AXUSD Peg Stability Module)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-canonical-psm-hardhat.ts --network arbitrum
 *
 * Parameters are live mainnet values — no placeholders.
 */
import { ethers } from "hardhat";

const AXUSD_TOKEN       = "0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7";
const USDC              = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const IDENTITY_REGISTRY = "0x58f64a1262d5434d6C7637a2309b0999bB6D1970";
const GOVERNANCE_SAFE   = "0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d";

const DEBT_CEILING_AXUSD = ethers.parseUnits("1000000", 18); // 1,000,000 AXUSD
const MINT_FEE_BPS       = 10n;  // 0.10%
const REDEEM_FEE_BPS     = 10n;  // 0.10%

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("=".repeat(60));
  console.log("CanonicalPSM — ERC-3643 AXUSD Peg Stability Module");
  console.log("=".repeat(60));
  console.log("Deployer:  ", deployer.address);
  console.log("Network:   ", network.name, `(chainId ${network.chainId})`);
  console.log("");
  console.log("Params:");
  console.log("  AXUSD Token:       ", AXUSD_TOKEN);
  console.log("  USDC:              ", USDC);
  console.log("  IdentityRegistry:  ", IDENTITY_REGISTRY);
  console.log("  Debt Ceiling:      ", ethers.formatUnits(DEBT_CEILING_AXUSD, 18), "AXUSD");
  console.log("  Mint Fee:          ", Number(MINT_FEE_BPS) / 100 + "%");
  console.log("  Redeem Fee:        ", Number(REDEEM_FEE_BPS) / 100 + "%");
  console.log("  Planned Owner:     ", GOVERNANCE_SAFE);
  console.log("");

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer ETH balance:", ethers.formatEther(balance), "ETH");
  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Insufficient ETH for deployment gas");
  }

  console.log("\nDeploying CanonicalPSM...");
  const Factory = await ethers.getContractFactory("CanonicalPSM", deployer);

  const psm = await Factory.deploy(
    AXUSD_TOKEN,
    USDC,
    IDENTITY_REGISTRY,
    DEBT_CEILING_AXUSD,
    MINT_FEE_BPS,
    REDEEM_FEE_BPS,
  );

  const tx = psm.deploymentTransaction();
  console.log("Deploy TX:    ", tx?.hash);
  console.log("Waiting for confirmation...");

  await psm.waitForDeployment();
  const psmAddress = await psm.getAddress();

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYED: CanonicalPSM");
  console.log("Address:  ", psmAddress);
  console.log("=".repeat(60));

  // Verify initial state on-chain
  const ownerOnChain  = await psm.owner();
  const axusdOnChain  = await psm.axusd();
  const collOnChain   = await psm.collateral();
  const ceilingOnChain = await psm.debtCeiling();
  const mintFeeOnChain = await psm.mintFee();

  console.log("\nOn-chain verification:");
  console.log("  owner():        ", ownerOnChain);
  console.log("  axusd():        ", axusdOnChain);
  console.log("  collateral():   ", collOnChain);
  console.log("  debtCeiling():  ", ethers.formatUnits(ceilingOnChain, 18), "AXUSD");
  console.log("  mintFee():      ", mintFeeOnChain.toString(), "bps");

  // Transfer ownership to Governance Safe
  console.log("\nTransferring ownership to Governance Safe...");
  const transferTx = await psm.transferOwnership(GOVERNANCE_SAFE);
  console.log("Transfer TX:  ", transferTx.hash);
  await transferTx.wait();

  const newOwner = await psm.owner();
  console.log("New owner:    ", newOwner);
  console.log(newOwner.toLowerCase() === GOVERNANCE_SAFE.toLowerCase() ? "✓ Ownership confirmed" : "✗ Ownership mismatch");

  console.log("\n" + "=".repeat(60));
  console.log("POST-DEPLOYMENT ACTIONS REQUIRED (manual via Governance Safe):");
  console.log("=".repeat(60));
  console.log("1. Update CANONICAL_PSM in src/config/activeContracts.generated.ts:");
  console.log(`   export const CANONICAL_PSM = '${psmAddress}' as const;`);
  console.log("");
  console.log("2. Register PSM as AXUSD agent (grants mint+burn rights):");
  console.log(`   Call: axusd.addAgent('${psmAddress}') via AXUSD owner/admin`);
  console.log("");
  console.log("3. Whitelist PSM in LendingPlatformModule (ERC-3643 compliance):");
  console.log(`   Call: LendingPlatformModule.addPlatform(AXUSD_TOKEN, '${psmAddress}')`);
  console.log("");
  console.log("4. Seed initial USDC liquidity (optional, for redemptions):");
  console.log(`   Transfer USDC directly to ${psmAddress}`);
  console.log("");
  console.log("5. Verify on Blockscout:");
  console.log(`   npx hardhat verify --network arbitrum ${psmAddress} \\`);
  console.log(`     ${AXUSD_TOKEN} ${USDC} ${IDENTITY_REGISTRY} \\`);
  console.log(`     ${DEBT_CEILING_AXUSD.toString()} ${MINT_FEE_BPS} ${REDEEM_FEE_BPS}`);

  return psmAddress;
}

main()
  .then((addr) => {
    console.log("\nDeployment complete:", addr);
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nDeployment failed:", err.message);
    process.exit(1);
  });
