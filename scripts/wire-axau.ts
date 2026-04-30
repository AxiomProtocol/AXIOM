/**
 * wire-axau.ts
 * Completes the remaining AXAU wiring steps for the deployment that errored mid-wiring.
 *
 * All 7 contracts deployed successfully (nonces 603-609).
 * Completed wiring: MINTER_ROLE, BURNER_ROLE, CONTROLLER_ROLE, CONSUMER_ROLE
 * Remaining: addComponent(XAU), addComponent(LAND), pauseMint, pauseRedeem, manifest save
 *
 * Usage:
 *   npx hardhat run scripts/wire-axau.ts --network arbitrum
 */

import { ethers } from "hardhat";
import * as fs    from "fs";
import * as path  from "path";

// ─── Already-deployed addresses (nonces 603-609, Arbitrum One) ─────────────
const ADDRESSES = {
  token:      "0xbcCA4D937d427829914498423aE6E04C846dB0Bb",
  registry:   "0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa",
  goldVault:  "0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8",
  landOracle: "0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc",
  landVault:  "0x66Aadce66a359609ec5E18fb3d8927a2363449cf",
  navEngine:  "0x80F8634a43B26a2bd403396A42465F138aeCC519",
  controller: "0x682Ed413767b6275e29fc706391474F2C5Cc1A2A",
};

const CHAINLINK_XAU_USD = "0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c"; // EIP-55 corrected
const WETH_ARB_ONE      = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const ORACLE_SIGNER_2   = "0x9bE7FCEa316D8e9a09fdD6a67E158A16Acf64f3f";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getNonce(provider: any, addr: string) {
  return await provider.getTransactionCount(addr, "pending");
}

async function sendTx(contract: any, method: string, args: any[], deployer: any, label: string) {
  const nonce = await getNonce(deployer.provider, deployer.address);
  const tx = await contract[method](...args, { nonce });
  await tx.wait();
  console.log(`   ✓ ${label}  (tx: ${tx.hash.slice(0, 18)}...)`);
  await sleep(2000);
  return tx.hash;
}

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────

const REGISTRY_ABI = [
  "function addComponent(string, address, address, uint256, uint256, bool, uint8)",
  "function componentCount() view returns (uint256)",
];

const CONTROLLER_ABI = [
  "function pauseMint(bool)",
  "function pauseRedeem(bool)",
  "function mintPaused() view returns (bool)",
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const bal = await deployer.provider!.getBalance(deployer.address);
  const chainId = (await deployer.provider!.getNetwork()).chainId;

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  AXAU — Wiring Resume");
  console.log("  Deployer:", deployer.address);
  console.log("  Balance :", ethers.formatEther(bal), "ETH");
  console.log("  ChainId :", chainId.toString());
  console.log("═══════════════════════════════════════════════════════════════════");

  const registry   = new ethers.Contract(ADDRESSES.registry,   REGISTRY_ABI,   deployer);
  const controller = new ethers.Contract(ADDRESSES.controller, CONTROLLER_ABI, deployer);

  // Check if XAU component already registered
  const count = await registry.componentCount();
  console.log("\n  Current component count:", count.toString());

  if (count < 1n) {
    await sendTx(
      registry,
      "addComponent",
      [
        "XAU",
        ADDRESSES.goldVault,
        CHAINLINK_XAU_USD,
        500,     // 5% haircut
        10_000,  // 100% max weight
        true,    // isLiquid
        1,       // phase 1
      ],
      deployer,
      "Registry.addComponent(XAU)"
    );
    console.log("   ↳ XAU id:", ethers.keccak256(ethers.toUtf8Bytes("XAU")));
  } else {
    console.log("   ↷ XAU already registered — skipping");
  }

  if (count < 2n) {
    await sendTx(
      registry,
      "addComponent",
      [
        "LAND",
        ADDRESSES.landVault,
        ethers.ZeroAddress,
        4_000,  // 40% haircut
        1_000,  // 10% max weight
        false,  // illiquid
        3,      // phase 3
      ],
      deployer,
      "Registry.addComponent(LAND)"
    );
    console.log("   ↳ LAND id:", ethers.keccak256(ethers.toUtf8Bytes("LAND")));
  } else {
    console.log("   ↷ LAND already registered — skipping");
  }

  const alreadyPaused = await controller.mintPaused();
  if (!alreadyPaused) {
    await sendTx(controller, "pauseMint",   [true], deployer, "Controller.pauseMint(true)");
    await sendTx(controller, "pauseRedeem", [true], deployer, "Controller.pauseRedeem(true)");
  } else {
    console.log("   ↷ Mint already paused — skipping");
  }

  // ── Save manifest ──────────────────────────────────────────────────────────

  const xauId  = ethers.keccak256(ethers.toUtf8Bytes("XAU"));
  const landId = ethers.keccak256(ethers.toUtf8Bytes("LAND"));

  const manifest = {
    network:     "arbitrum-one",
    chainId:     42161,
    deployedAt:  new Date().toISOString(),
    deployer:    deployer.address,
    contracts: {
      AXAUTokenLite3643:     ADDRESSES.token,
      CommodityRegistry:     ADDRESSES.registry,
      AXGoldVault:           ADDRESSES.goldVault,
      LandNAVOracleMultiSig: ADDRESSES.landOracle,
      AXLandVault:           ADDRESSES.landVault,
      NAVEngine:             ADDRESSES.navEngine,
      MintRedeemController:  ADDRESSES.controller,
    },
    externalAddresses: {
      chainlinkXauUsd:   CHAINLINK_XAU_USD,
      goldReserveAsset:  WETH_ARB_ONE,
      goldReserveNote:   "WETH placeholder — call GoldVault.setReserveAsset(paxgAddress) before activating mint",
      oracleSigner1:     deployer.address,
      oracleSigner2:     ORACLE_SIGNER_2,
      oracleSigner2Note: "Deterministic offline key (keccak256('axiom-land-oracle-signer-2-2026')). Rotate to hardware wallet via addSigner/removeSigner.",
    },
    componentIds: {
      XAU:  xauId,
      LAND: landId,
    },
    activationChecklist: [
      "1. Confirm canonical gold token address on Arbitrum One (PAXG bridge or equivalent)",
      "2. Call GoldVault.setReserveAsset(<goldTokenAddress>) — vault must be empty",
      "3. Call Registry.updateComponent(XAU_ID, goldVaultAddr, <oracle>, 500)",
      "4. Transfer GOVERNOR_ROLE to multisig wallet",
      "5. Add more LandNAVOracle signers and raise threshold (addSigner + setThreshold)",
      "6. Rotate ORACLE_SIGNER_2 to hardware wallet via addSigner/removeSigner",
      "7. Call Controller.pauseMint(false) + Controller.pauseRedeem(false)",
      "8. Call Token.enableTransferGate(<identityRegistryAddress>) for ERC-3643 compliance",
    ],
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "axau-arbitrum.json");
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  AXAU Wiring Complete — manifest saved to deployments/axau-arbitrum.json");
  console.log("  AXAUTokenLite3643    :", ADDRESSES.token);
  console.log("  CommodityRegistry   :", ADDRESSES.registry);
  console.log("  AXGoldVault          :", ADDRESSES.goldVault);
  console.log("  LandNAVOracleMultiSig:", ADDRESSES.landOracle);
  console.log("  AXLandVault          :", ADDRESSES.landVault);
  console.log("  NAVEngine            :", ADDRESSES.navEngine);
  console.log("  MintRedeemController :", ADDRESSES.controller);
  console.log("═══════════════════════════════════════════════════════════════════\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
