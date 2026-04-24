/**
 * deploy-axau.ts
 * Deploys the complete AXAU Reserve Unit smart contract suite to Arbitrum One.
 *
 * Deployment order (respects constructor dependencies):
 *   1. AXAUTokenLite3643      — ERC-20 / ERC-3643 token (gate disabled at launch)
 *   2. CommodityRegistry      — on-chain component registry
 *   3. AXGoldVault            — Phase 1 gold reserve vault
 *   4. LandNAVOracleMultiSig  — Phase 3 multi-sig NAV oracle
 *   5. AXLandVault            — Phase 3 land sleeve vault
 *   6. NAVEngine              — deterministic valuation engine
 *   7. MintRedeemController   — mint / redeem gateway
 *
 * Post-deployment wiring:
 *   a. Token  → grant MINTER_ROLE + BURNER_ROLE to Controller
 *   b. Vault  → grant CONTROLLER_ROLE to Controller (GoldVault)
 *   c. Registry.addComponent("XAU", GoldVault, XAU/USD feed, 500 bps, 10000 bps, liquid, phase 1)
 *   d. Registry.addComponent("LAND", LandVault, address(0), 4000 bps, 1000 bps, illiquid, phase 3)
 *   e. Controller.pauseMint(true)   — safety hold until canonical gold token is confirmed
 *   f. Controller.pauseRedeem(true) — safety hold
 *
 * Gold vault reserve asset:
 *   PAXG has no canonical Arbitrum One bridge as of this deployment. WETH is used as
 *   a placeholder (18-dec ERC-20). Governor must call GoldVault.setReserveAsset(paxgAddress)
 *   + Registry.updateComponent(XAU_ID, goldVault, newOracle, haircut) and then
 *   Controller.pauseMint(false) once the canonical gold token is confirmed.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-axau.ts --network arbitrum
 */

import { ethers, run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── Arbitrum One canonical addresses ──────────────────────────────────────────
const CHAINLINK_XAU_USD  = "0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c"; // 8 dec
const WETH_ARB_ONE       = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"; // 18 dec placeholder

// ─── Oracle signer 2 ───────────────────────────────────────────────────────────
// Deterministic second signer for LandNAVOracleMultiSig (threshold = 2-of-2 at genesis).
// Derived from: keccak256("axiom-land-oracle-signer-2-2026")
// Private key must be stored offline. Rotate to hardware wallet via addSigner/removeSigner.
const ORACLE_SIGNER_2    = "0x9bE7FCEa316D8e9a09fdD6a67E158A16Acf64f3f";

// ─── Reserve layer parameters (from spec.ts RESERVE_LAYERS) ──────────────────
const XAU_HAIRCUT_BPS    = 500;    //  5% — Tier 1 liquid gold
const XAU_MAX_WEIGHT_BPS = 10_000; // 100% — sole Phase 1 component
const LAND_HAIRCUT_BPS   = 4_000;  // 40% — illiquid land sleeve
const LAND_MAX_WEIGHT_BPS = 1_000; // 10% — caps illiquid exposure

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getNonce(provider: any, address: string): Promise<number> {
  return await provider.getTransactionCount(address, "pending");
}

async function deployContract(
  factory: any,
  args: any[],
  deployer: any,
  label: string
): Promise<any> {
  const nonce = await getNonce(deployer.provider, deployer.address);
  console.log(`\n   [nonce ${nonce}] Deploying ${label} ...`);
  const contract = await factory.deploy(...args, { nonce });
  const addr = await contract.getAddress();
  const tx = contract.deploymentTransaction();
  console.log(`   ↳ tx   : ${tx?.hash}`);
  await contract.waitForDeployment();
  console.log(`   ✓ addr : ${addr}`);
  await sleep(3000);
  return contract;
}

async function sendTx(
  contract: any,
  method: string,
  args: any[],
  deployer: any,
  label: string
): Promise<string> {
  const nonce = await getNonce(deployer.provider, deployer.address);
  const tx = await contract[method](...args, { nonce });
  await tx.wait();
  console.log(`   ✓ ${label}  (tx: ${tx.hash.slice(0, 18)}...)`);
  await sleep(2000);
  return tx.hash;
}

async function verifyContract(
  address: string,
  constructorArguments: any[],
  label: string
): Promise<void> {
  console.log(`\n   Verifying ${label} at ${address} ...`);
  try {
    await run("verify:verify", { address, constructorArguments });
    console.log(`   ✓ ${label} verified`);
  } catch (e: any) {
    if (e.message?.includes("Already Verified") || e.message?.includes("already verified")) {
      console.log(`   ✓ ${label} already verified`);
    } else {
      console.warn(`   ⚠ ${label} verification failed: ${e.message}`);
    }
  }
  await sleep(2000);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = deployer.address;
  const deployerBal = await deployer.provider!.getBalance(deployerAddr);

  const isMainnet = (await deployer.provider!.getNetwork()).chainId === 42161n;

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  AXAU RESERVE UNIT — Full Suite Deployment");
  console.log("  Network : " + (isMainnet ? "Arbitrum One (MAINNET)" : "local fork"));
  console.log("  Deployer: " + deployerAddr);
  console.log("  Balance : " + ethers.formatEther(deployerBal) + " ETH");
  console.log("  Gold placeholder: WETH (setReserveAsset required before activating mint)");
  console.log("═══════════════════════════════════════════════════════════════════");

  if (isMainnet && deployerBal < ethers.parseEther("0.001")) {
    throw new Error("Deployer ETH balance below 0.001 ETH — top up before deploying");
  }

  // ── Phase 1: Deploy contracts ──────────────────────────────────────────────

  console.log("\n── PHASE 1: Contract Deployments ─────────────────────────────────");

  const TokenFactory      = await ethers.getContractFactory("AXAUTokenLite3643");
  const RegistryFactory   = await ethers.getContractFactory("CommodityRegistry");
  const GoldVaultFactory  = await ethers.getContractFactory("AXGoldVault");
  const LandOracleFactory = await ethers.getContractFactory("LandNAVOracleMultiSig");
  const LandVaultFactory  = await ethers.getContractFactory("AXLandVault");
  const NAVEngineFactory  = await ethers.getContractFactory("NAVEngine");
  const ControllerFactory = await ethers.getContractFactory("MintRedeemController");

  // 1. Token — gate disabled at genesis (address(0) = no identity registry)
  const token = await deployContract(
    TokenFactory,
    [deployerAddr, ethers.ZeroAddress],
    deployer,
    "AXAUTokenLite3643"
  );
  const tokenAddr = await token.getAddress();

  // 2. Registry
  const registry = await deployContract(
    RegistryFactory,
    [deployerAddr],
    deployer,
    "CommodityRegistry"
  );
  const registryAddr = await registry.getAddress();

  // 3. GoldVault — WETH placeholder (governor calls setReserveAsset when PAXG is bridged)
  const goldVault = await deployContract(
    GoldVaultFactory,
    [deployerAddr, WETH_ARB_ONE],
    deployer,
    "AXGoldVault (reserveAsset=WETH placeholder)"
  );
  const goldVaultAddr = await goldVault.getAddress();

  // 4. LandNAVOracleMultiSig — deployer + ORACLE_SIGNER_2, threshold = 2
  //    Minimum 2-of-2 multisig enforced by contract. ORACLE_SIGNER_2 is a
  //    deterministic offline key; rotate to hardware wallet via addSigner/removeSigner.
  const landOracle = await deployContract(
    LandOracleFactory,
    [deployerAddr, [deployerAddr, ORACLE_SIGNER_2], 2],
    deployer,
    "LandNAVOracleMultiSig (2-of-2)"
  );
  const landOracleAddr = await landOracle.getAddress();

  // 5. LandVault — wired to landOracle
  const landVault = await deployContract(
    LandVaultFactory,
    [deployerAddr, landOracleAddr],
    deployer,
    "AXLandVault"
  );
  const landVaultAddr = await landVault.getAddress();

  // 6. NAVEngine
  const navEngine = await deployContract(
    NAVEngineFactory,
    [deployerAddr, registryAddr, tokenAddr],
    deployer,
    "NAVEngine"
  );
  const navEngineAddr = await navEngine.getAddress();

  // 7. MintRedeemController — deployer as initial feeRecipient
  const controller = await deployContract(
    ControllerFactory,
    [deployerAddr, tokenAddr, navEngineAddr, registryAddr, deployerAddr],
    deployer,
    "MintRedeemController"
  );
  const controllerAddr = await controller.getAddress();

  // ── Phase 2: Wiring ────────────────────────────────────────────────────────

  console.log("\n── PHASE 2: Post-Deployment Wiring ───────────────────────────────");

  const MINTER_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));

  await sendTx(token, "grantRole", [MINTER_ROLE, controllerAddr], deployer,
    "Token.grantRole(MINTER_ROLE, controller)");

  await sendTx(token, "grantRole", [BURNER_ROLE, controllerAddr], deployer,
    "Token.grantRole(BURNER_ROLE, controller)");

  await sendTx(goldVault, "grantRole", [CONTROLLER_ROLE, controllerAddr], deployer,
    "GoldVault.grantRole(CONTROLLER_ROLE, controller)");

  // Grant CONSUMER_ROLE on the oracle to the land vault so it can call markConsumed()
  const CONSUMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONSUMER_ROLE"));
  await sendTx(landOracle, "grantRole", [CONSUMER_ROLE, landVaultAddr], deployer,
    "LandOracle.grantRole(CONSUMER_ROLE, landVault)");

  // Register Phase 1 — XAU (gold via WETH placeholder, Chainlink XAU/USD oracle)
  const xauId = ethers.keccak256(ethers.toUtf8Bytes("XAU"));
  await sendTx(
    registry,
    "addComponent",
    [
      "XAU",
      goldVaultAddr,
      CHAINLINK_XAU_USD,
      XAU_HAIRCUT_BPS,
      XAU_MAX_WEIGHT_BPS,
      true,   // isLiquid
      1,      // phase
    ],
    deployer,
    "Registry.addComponent(XAU)"
  );

  console.log(`   ↳ XAU component id: ${xauId}`);

  // Register Phase 3 — LAND (illiquid, no oracle — NAV from multisig)
  const landId = ethers.keccak256(ethers.toUtf8Bytes("LAND"));
  await sendTx(
    registry,
    "addComponent",
    [
      "LAND",
      landVaultAddr,
      ethers.ZeroAddress,  // no Chainlink oracle — attested NAV via LandNAVOracleMultiSig
      LAND_HAIRCUT_BPS,
      LAND_MAX_WEIGHT_BPS,
      false,  // isLiquid = false
      3,      // phase
    ],
    deployer,
    "Registry.addComponent(LAND)"
  );

  console.log(`   ↳ LAND component id: ${landId}`);

  // Safety hold — pause mint + redeem until PAXG token is confirmed on Arbitrum
  await sendTx(controller, "pauseMint",   [true], deployer, "Controller.pauseMint(true)");
  await sendTx(controller, "pauseRedeem", [true], deployer, "Controller.pauseRedeem(true)");

  // ── Phase 3: Verify ────────────────────────────────────────────────────────

  console.log("\n── PHASE 3: Blockscout Verification ──────────────────────────────");

  if (isMainnet) {
    await verifyContract(tokenAddr,      [deployerAddr, ethers.ZeroAddress],                              "AXAUTokenLite3643");
    await verifyContract(registryAddr,   [deployerAddr],                                                  "CommodityRegistry");
    await verifyContract(goldVaultAddr,  [deployerAddr, WETH_ARB_ONE],                                    "AXGoldVault");
    await verifyContract(landOracleAddr, [deployerAddr, [deployerAddr, ORACLE_SIGNER_2], 2],              "LandNAVOracleMultiSig");
    await verifyContract(landVaultAddr,  [deployerAddr, landOracleAddr],                                   "AXLandVault");
    await verifyContract(navEngineAddr,  [deployerAddr, registryAddr, tokenAddr],                          "NAVEngine");
    await verifyContract(controllerAddr, [deployerAddr, tokenAddr, navEngineAddr, registryAddr, deployerAddr], "MintRedeemController");
  } else {
    console.log("   (fork/local — skipping Blockscout verification)");
  }

  // ── Save deployment manifest ───────────────────────────────────────────────

  const manifest = {
    network:     isMainnet ? "arbitrum-one" : "hardhat-fork",
    chainId:     isMainnet ? 42161 : 31337,
    deployedAt:  new Date().toISOString(),
    deployer:    deployerAddr,
    contracts: {
      AXAUTokenLite3643:     tokenAddr,
      CommodityRegistry:     registryAddr,
      AXGoldVault:           goldVaultAddr,
      LandNAVOracleMultiSig: landOracleAddr,
      AXLandVault:           landVaultAddr,
      NAVEngine:             navEngineAddr,
      MintRedeemController:  controllerAddr,
    },
    externalAddresses: {
      chainlinkXauUsd:   CHAINLINK_XAU_USD,
      goldReserveAsset:  WETH_ARB_ONE,
      goldReserveNote:   "WETH placeholder — call GoldVault.setReserveAsset(paxgAddress) before activating mint",
      oracleSigner1:     deployerAddr,
      oracleSigner2:     ORACLE_SIGNER_2,
      oracleSigner2Note: "Deterministic offline key (keccak256('axiom-land-oracle-signer-2-2026')). Rotate to hardware wallet via addSigner/removeSigner governance call.",
    },
    componentIds: {
      XAU:  xauId,
      LAND: landId,
    },
    activationChecklist: [
      "1. Confirm canonical gold token address on Arbitrum One (PAXG bridge or equivalent)",
      "2. Call GoldVault.setReserveAsset(<goldTokenAddress>) — vault must be empty",
      "3. Call Registry.updateComponent(XAU_ID, goldVaultAddr, <oracle>, XAU_HAIRCUT_BPS)",
      "4. Transfer GOVERNOR_ROLE to multisig wallet",
      "5. Add additional LandNAVOracle signers and raise threshold to 2-of-3",
      "6. Call Controller.pauseMint(false) + Controller.pauseRedeem(false)",
      "7. Call Token.enableTransferGate(<identityRegistryAddress>) when ERC-3643 registry is deployed",
    ],
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, isMainnet ? "axau-arbitrum.json" : "axau-fork.json");
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  AXAU RESERVE UNIT — Deployment Complete");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("\n  Contract addresses:");
  console.log(`    AXAUTokenLite3643     : ${tokenAddr}`);
  console.log(`    CommodityRegistry     : ${registryAddr}`);
  console.log(`    AXGoldVault           : ${goldVaultAddr}`);
  console.log(`    LandNAVOracleMultiSig : ${landOracleAddr}`);
  console.log(`    AXLandVault           : ${landVaultAddr}`);
  console.log(`    NAVEngine             : ${navEngineAddr}`);
  console.log(`    MintRedeemController  : ${controllerAddr}`);
  console.log(`\n  Manifest saved to: ${outPath}`);
  console.log("\n  IMPORTANT: Mint and redeem are PAUSED. Complete activation checklist");
  console.log("  in the manifest before opening the instrument to participants.");
  console.log("═══════════════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
