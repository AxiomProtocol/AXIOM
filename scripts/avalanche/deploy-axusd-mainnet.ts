/**
 * Deploy AXUSD (AxiomStable3643) to Avalanche C-Chain mainnet.
 *
 * Deploys 5 contracts in order:
 *   1. IdentityRegistry  — KYC / compliance gating
 *   2. TransferLimitModule — per-address daily transfer cap
 *   3. CountryAllowModule  — per-compliance country allowlist
 *   4. ModularCompliance   — wires modules to token
 *   5. AxiomStable3643     — AXUSD token (mainnet-hardened)
 *
 * Post-deploy configuration:
 *   6. Bind token to compliance
 *   7. Add modules to compliance
 *   8. Grant MINTER_ROLE / BURNER_ROLE / AGENT_ROLE to multisig
 *   9. Grant IdentityRegistry agent role to multisig
 *  10. Transfer Ownable ownership (modules) to multisig
 *  11. Grant DEFAULT_ADMIN_ROLE to multisig, renounce from deployer
 *
 * Security gates:
 *   - Requires AVALANCHE_MULTISIG_ADDRESS env var (non-zero, non-deployer)
 *   - Requires deployer balance >= 0.05 AVAX
 *   - allowAll is NEVER set (audit A5)
 *   - Roles NOT granted to deployer EOA beyond DEFAULT_ADMIN_ROLE (audit A3)
 *   - Deployer renounces DEFAULT_ADMIN_ROLE at end (audit A6)
 *
 * Run:
 *   npx hardhat run scripts/avalanche/deploy-axusd-mainnet.ts --network avalanche
 *
 * Dry-run (Fuji):
 *   npx hardhat run scripts/avalanche/deploy-axusd-mainnet.ts --network avalancheFuji
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const ADMIN_ADDRESS = "0xA6Ed10E752d5FACD989ee9CEd113b3a064b47493";

const TOKEN_NAME    = "Axiom USD";
const TOKEN_SYMBOL  = "AXUSD";
const TOKEN_DECIMALS = 6;

async function main() {
  console.log("=".repeat(60));
  console.log("AXUSD Mainnet Deployment — Avalanche C-Chain");
  console.log("=".repeat(60));

  const multisig = process.env.AVALANCHE_MULTISIG_ADDRESS;
  if (!multisig || !ethers.isAddress(multisig)) {
    throw new Error(
      "AVALANCHE_MULTISIG_ADDRESS env var must be set to a valid EVM address. " +
      "This is the address that will receive all admin roles post-deploy.",
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:  ", deployer.address);
  console.log("Multisig:  ", multisig);

  if (deployer.address.toLowerCase() === multisig.toLowerCase()) {
    throw new Error(
      "AVALANCHE_MULTISIG_ADDRESS must be distinct from the deployer EOA. " +
      "Using the same address defeats the post-deploy role separation.",
    );
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:   ", ethers.formatEther(balance), "AVAX");
  if (balance < ethers.parseEther("0.05")) {
    throw new Error("Insufficient AVAX — need at least 0.05 AVAX for deployment gas.");
  }

  const network = await ethers.provider.getNetwork();
  console.log("Network:    chainId", network.chainId.toString());
  if (network.chainId !== 43114n && network.chainId !== 43113n) {
    throw new Error(
      `Unexpected chainId ${network.chainId}. ` +
      "Use --network avalanche (43114) or --network avalancheFuji (43113).",
    );
  }
  const isMainnet = network.chainId === 43114n;
  console.log("Mode:      ", isMainnet ? "MAINNET" : "FUJI TESTNET (dry-run)");
  console.log();

  // ── Step 1: IdentityRegistry ────────────────────────────────────────────────
  console.log("--- Step 1: Deploy IdentityRegistry ---");
  const IdentityRegistry = await ethers.getContractFactory("AxiomIdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(deployer.address);
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("IdentityRegistry:", identityRegistryAddress);

  // ── Step 2: TransferLimitModule ─────────────────────────────────────────────
  console.log("\n--- Step 2: Deploy TransferLimitModule ---");
  const TransferLimitModule = await ethers.getContractFactory("TransferLimitModule");
  const transferLimitModule = await TransferLimitModule.deploy();
  await transferLimitModule.waitForDeployment();
  const transferLimitModuleAddress = await transferLimitModule.getAddress();
  console.log("TransferLimitModule:", transferLimitModuleAddress);

  // ── Step 3: CountryAllowModule ──────────────────────────────────────────────
  console.log("\n--- Step 3: Deploy CountryAllowModule ---");
  const CountryAllowModule = await ethers.getContractFactory("CountryAllowModule");
  const countryAllowModule = await CountryAllowModule.deploy();
  await countryAllowModule.waitForDeployment();
  const countryAllowModuleAddress = await countryAllowModule.getAddress();
  console.log("CountryAllowModule:", countryAllowModuleAddress);

  // ── Step 4: ModularCompliance ───────────────────────────────────────────────
  console.log("\n--- Step 4: Deploy ModularCompliance ---");
  const ModularCompliance = await ethers.getContractFactory("AxiomModularCompliance");
  const modularCompliance = await ModularCompliance.deploy();
  await modularCompliance.waitForDeployment();
  const modularComplianceAddress = await modularCompliance.getAddress();
  console.log("ModularCompliance:", modularComplianceAddress);

  // ── Step 5: AxiomStable3643 (AXUSD token) ───────────────────────────────────
  console.log("\n--- Step 5: Deploy AxiomStable3643 (AXUSD) ---");
  const AxiomStable3643 = await ethers.getContractFactory("AxiomStable3643");
  const token = await AxiomStable3643.deploy(
    identityRegistryAddress,
    modularComplianceAddress,
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOKEN_DECIMALS,
    ethers.ZeroAddress,
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("AxiomStable3643 (AXUSD):", tokenAddress);

  // ── Step 6: Bind token to compliance ────────────────────────────────────────
  console.log("\n--- Step 6: Bind token to ModularCompliance ---");
  const bindTx = await modularCompliance.bindToken(tokenAddress);
  await bindTx.wait();
  console.log("Token bound to compliance");

  // ── Step 7: Add modules to compliance ───────────────────────────────────────
  console.log("\n--- Step 7: Add compliance modules ---");
  const addTLMTx = await modularCompliance.addModule(transferLimitModuleAddress);
  await addTLMTx.wait();
  console.log("TransferLimitModule added");

  const addCAMTx = await modularCompliance.addModule(countryAllowModuleAddress);
  await addCAMTx.wait();
  console.log("CountryAllowModule added");

  // Audit A5: allowAll is NOT set. Country allowlist must be configured
  // explicitly by the multisig after deployment via:
  //   CountryAllowModule.addAllowedCountry(complianceAddr, countryCode)
  // Do NOT call setAllowAll(true) on mainnet.
  console.log("NOTE: CountryAllowModule allowAll=false (default). Configure allowlist via multisig.");

  // ── Step 8: Grant operational roles to multisig ─────────────────────────────
  console.log("\n--- Step 8: Grant MINTER / BURNER / AGENT roles to multisig ---");
  const minterRole = await token.MINTER_ROLE();
  const burnerRole = await token.BURNER_ROLE();
  const agentRole  = await token.AGENT_ROLE();

  const grantMinter = await token.grantRole(minterRole, multisig);
  await grantMinter.wait();
  console.log("MINTER_ROLE granted to multisig");

  const grantBurner = await token.grantRole(burnerRole, multisig);
  await grantBurner.wait();
  console.log("BURNER_ROLE granted to multisig");

  const grantAgent = await token.grantRole(agentRole, multisig);
  await grantAgent.wait();
  console.log("AGENT_ROLE granted to multisig");

  // ── Step 9: Grant IdentityRegistry agent to multisig ────────────────────────
  console.log("\n--- Step 9: Grant IdentityRegistry agent to multisig ---");
  const addAgentTx = await identityRegistry.addAgent(multisig);
  await addAgentTx.wait();
  console.log("IdentityRegistry agent granted to multisig");

  // ── Step 10: Transfer module Ownable ownership to multisig ──────────────────
  console.log("\n--- Step 10: Transfer module ownership to multisig (Audit A6) ---");
  const tlmTransfer = await transferLimitModule.transferOwnership(multisig);
  await tlmTransfer.wait();
  console.log("TransferLimitModule ownership → multisig");

  const camTransfer = await countryAllowModule.transferOwnership(multisig);
  await camTransfer.wait();
  console.log("CountryAllowModule ownership → multisig");

  // ── Step 11: Transfer DEFAULT_ADMIN_ROLE and renounce from deployer ──────────
  console.log("\n--- Step 11: Transfer DEFAULT_ADMIN_ROLE to multisig, renounce deployer (Audit A3) ---");
  const adminRole = await token.DEFAULT_ADMIN_ROLE();

  const grantAdminTx = await token.grantRole(adminRole, multisig);
  await grantAdminTx.wait();
  console.log("DEFAULT_ADMIN_ROLE granted to multisig");

  const renounceAdminTx = await token.renounceRole(adminRole, deployer.address);
  await renounceAdminTx.wait();
  console.log("DEFAULT_ADMIN_ROLE renounced by deployer EOA");

  // Same for compliance and identity registry if they have AccessControl
  // (depends on implementation — transfer ownership if Ownable)
  const irTransfer = await identityRegistry.transferOwnership(multisig);
  await irTransfer.wait();
  console.log("IdentityRegistry ownership → multisig");

  const mcTransfer = await modularCompliance.transferOwnership(multisig);
  await mcTransfer.wait();
  console.log("ModularCompliance ownership → multisig");

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("Deployment Complete");
  console.log("=".repeat(60));
  console.log("Network:            Avalanche C-Chain", isMainnet ? "(mainnet)" : "(Fuji testnet)");
  console.log("ChainId:           ", network.chainId.toString());
  console.log("AXUSD token:       ", tokenAddress);
  console.log("IdentityRegistry:  ", identityRegistryAddress);
  console.log("ModularCompliance: ", modularComplianceAddress);
  console.log("TransferLimitMod:  ", transferLimitModuleAddress);
  console.log("CountryAllowMod:   ", countryAllowModuleAddress);
  console.log("Multisig (admin):  ", multisig);
  console.log("Deployer (no roles):", deployer.address);

  const deploymentInfo = {
    network: isMainnet ? "Avalanche C-Chain Mainnet" : "Avalanche Fuji Testnet",
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    multisig,
    contracts: {
      AxiomStable3643: {
        address: tokenAddress,
        name: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        decimals: TOKEN_DECIMALS,
        auditFixes: ["A1/A2: nonReentrant on forcedTransfer", "A3: roles not granted to deployer", "A6: ownership transferred to multisig"],
      },
      IdentityRegistry: { address: identityRegistryAddress },
      ModularCompliance: { address: modularComplianceAddress },
      TransferLimitModule: { address: transferLimitModuleAddress },
      CountryAllowModule: {
        address: countryAllowModuleAddress,
        note: "allowAll=false. Configure country allowlist via multisig before enabling transfers.",
      },
    },
    postDeployChecklist: [
      "[ ] Configure CountryAllowModule country allowlist via multisig",
      "[ ] Set TransferLimitModule per-address daily limit via multisig",
      "[ ] Register initial identities in IdentityRegistry",
      "[ ] Verify all 5 contracts on Snowtrace (snowtrace.io)",
      "[ ] Confirm deployer has no remaining roles (call hasRole for each)",
      "[ ] Update cap_assets registry: chain=avalanche-cchain, chainId=43114, contractAddress=<token>",
    ],
  };

  const outputDir = path.join(__dirname, "../../contracts/avalanche");
  const outputPath = path.join(outputDir, "deployment-info-mainnet.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", outputPath);

  console.log("\nNEXT STEPS:");
  deploymentInfo.postDeployChecklist.forEach((step) => console.log(" ", step));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
