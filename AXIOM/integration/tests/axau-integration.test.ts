/**
 * axau-integration.test.ts
 * Integration tests for the deployed AXAU Reserve Unit suite on Arbitrum One.
 *
 * Forks Arbitrum One at the latest block (post-deployment) and interacts
 * with the live contracts. Addresses loaded from deployments/axau-arbitrum.json.
 *
 * Run:
 *   npx hardhat test integration/tests/axau-integration.test.ts --network hardhat
 */

import { expect }              from "chai";
import { ethers, network }     from "hardhat";
import * as fs                 from "fs";
import * as path               from "path";

// ─── Load deployment manifest ─────────────────────────────────────────────────

const MANIFEST_PATH = path.join(__dirname, "../../deployments/axau-arbitrum.json");

function loadManifest(): any {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Deployment manifest not found at ${MANIFEST_PATH}.\n` +
      `Run: npx hardhat run scripts/deploy-axau.ts --network arbitrum`
    );
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────

const TOKEN_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function hasRole(bytes32, address) view returns (bool)",
  "function transferGateEnabled() view returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function grantRole(bytes32, address)",
  "function mint(address, uint256)",
];

const REGISTRY_ABI = [
  "function componentCount() view returns (uint256)",
  "function getAllComponents() view returns (tuple(bytes32 id, address vault, address oracle, uint256 haircutBps, uint256 maxWeightBps, bool isLiquid, bool enabled, string symbol, uint8 oracleDecimals, uint8 assetDecimals, uint8 phase)[])",
  "function getComponent(bytes32) view returns (tuple(bytes32 id, address vault, address oracle, uint256 haircutBps, uint256 maxWeightBps, bool isLiquid, bool enabled, string symbol, uint8 oracleDecimals, uint8 assetDecimals, uint8 phase))",
  "function addComponent(string, address, address, uint256, uint256, bool, uint8)",
];

const GOLD_VAULT_ABI = [
  "function reserveAsset() view returns (address)",
  "function totalUnits() view returns (uint256)",
  "function vaultFrozen() view returns (bool)",
  "function goldSnapshot() view returns (address, uint256)",
  "function hasRole(bytes32, address) view returns (bool)",
];

const LAND_ORACLE_ABI = [
  "function signerCount() view returns (uint256)",
  "function threshold() view returns (uint256)",
  "function hasRole(bytes32, address) view returns (bool)",
  "function nonce() view returns (uint256)",
  "function getApprovedNAV() view returns (uint256)",
  "function propose(uint256)",
  "function confirm(uint256)",
  "function currentProposal() view returns (uint256, uint256, uint256, uint256, uint256, bool, bool)",
  "function hasConfirmed(uint256, address) view returns (bool)",
];

const LAND_VAULT_ABI = [
  "function navOracle() view returns (address)",
  "function vaultFrozen() view returns (bool)",
  "function landUnits() view returns (uint256)",
  "function lastNavUsdWad() view returns (uint256)",
  "function lastNavTimestamp() view returns (uint256)",
  "function landSnapshot() view returns (uint256, bool)",
  "function bookAsset(bytes32, string, uint256)",
  "function applyApprovedNAV()",
];

const NAV_ENGINE_ABI = [
  "function totalBackingUsdWad() view returns (uint256)",
  "function backingNavPerAXAUWad() view returns (uint256)",
  "function mintNavPerAXAUWad() view returns (uint256)",
  "function coverageRatioBps() view returns (uint256)",
  "function isSolvent() view returns (bool)",
  "function oracleStaleSecs() view returns (uint256)",
  "function revertOnStaleOracle() view returns (bool)",
];

const CONTROLLER_ABI = [
  "function mintPaused() view returns (bool)",
  "function redeemPaused() view returns (bool)",
  "function mintFeeBps() view returns (uint256)",
  "function redeemFeeBps() view returns (uint256)",
  "function protocolFeeRecipient() view returns (address)",
  "function axauToken() view returns (address)",
  "function registry() view returns (address)",
  "function navEngine() view returns (address)",
  "function totalMinted() view returns (uint256)",
  "function totalRedeemed() view returns (uint256)",
  "function pauseMint(bool)",
  "function pauseRedeem(bool)",
  "function quoteMint(bytes32, uint256) view returns (uint256, uint256)",
  "function mintWithAsset(bytes32, uint256) returns (uint256)",
  "function hasRole(bytes32, address) view returns (bool)",
];

const WETH_ABI = [
  "function deposit() payable",
  "function approve(address, uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// ─── Role hashes ──────────────────────────────────────────────────────────────
const GOVERNOR_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("GOVERNOR_ROLE"));
const MINTER_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
const BURNER_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
const SIGNER_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("SIGNER_ROLE"));
const CONSUMER_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("CONSUMER_ROLE"));

// Arbitrum One WETH
const WETH_ARB_ONE = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const WAD          = ethers.parseEther("1");

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("AXAU Reserve Unit — Integration Tests (Arbitrum One fork)", function () {
  this.timeout(120_000);

  let manifest: any;
  let governor:      any; // deployer / signer 1
  let oracleSigner2: any; // second land oracle signer
  let user:          any;

  let token:      any;
  let registry:   any;
  let goldVault:  any;
  let landOracle: any;
  let landVault:  any;
  let navEngine:  any;
  let controller: any;
  let weth:       any;

  before(async function () {
    manifest = loadManifest();

    // Mine one block past the fork tip so Hardhat EDR has a known hardfork context
    // for eth_call. Without this, Arbitrum One's latest block has an unknown hardfork
    // configuration and all view calls fail.
    await network.provider.send("hardhat_mine", ["0x1"]);

    // Impersonate deployer (governor / oracle signer 1)
    await network.provider.request({ method: "hardhat_impersonateAccount", params: [manifest.deployer] });
    await network.provider.send("hardhat_setBalance", [manifest.deployer, "0x56BC75E2D63100000"]);
    governor = await ethers.getSigner(manifest.deployer);

    // Impersonate oracle signer 2
    const signer2Addr = manifest.externalAddresses.oracleSigner2;
    await network.provider.request({ method: "hardhat_impersonateAccount", params: [signer2Addr] });
    await network.provider.send("hardhat_setBalance", [signer2Addr, "0x56BC75E2D63100000"]);
    oracleSigner2 = await ethers.getSigner(signer2Addr);

    // Fund a test user
    const signers = await ethers.getSigners();
    user = signers[1];
    await network.provider.send("hardhat_setBalance", [user.address, "0x56BC75E2D63100000"]);

    // Wire contracts
    token      = new ethers.Contract(manifest.contracts.AXAUTokenLite3643,     TOKEN_ABI,       governor);
    registry   = new ethers.Contract(manifest.contracts.CommodityRegistry,     REGISTRY_ABI,    governor);
    goldVault  = new ethers.Contract(manifest.contracts.AXGoldVault,           GOLD_VAULT_ABI,  governor);
    landOracle = new ethers.Contract(manifest.contracts.LandNAVOracleMultiSig, LAND_ORACLE_ABI, governor);
    landVault  = new ethers.Contract(manifest.contracts.AXLandVault,           LAND_VAULT_ABI,  governor);
    navEngine  = new ethers.Contract(manifest.contracts.NAVEngine,             NAV_ENGINE_ABI,  governor);
    controller = new ethers.Contract(manifest.contracts.MintRedeemController,  CONTROLLER_ABI,  governor);
    weth       = new ethers.Contract(WETH_ARB_ONE,                             WETH_ABI,        user);
  });

  // ─── Suite A: Contract state verification ─────────────────────────────────

  describe("A — Contract state verification", () => {

    it("A1: token name / symbol / decimals are correct", async () => {
      expect(await token.name()).to.equal("Axiom Gold Reserve Unit");
      expect(await token.symbol()).to.equal("AXAU");
      expect(await token.decimals()).to.equal(18);
    });

    it("A2: AXAU total supply is zero at genesis", async () => {
      expect(await token.totalSupply()).to.equal(0n);
    });

    it("A3: transfer gate is disabled at genesis", async () => {
      expect(await token.transferGateEnabled()).to.equal(false);
    });

    it("A4: controller holds MINTER_ROLE and BURNER_ROLE on the token", async () => {
      const ctrl = manifest.contracts.MintRedeemController;
      expect(await token.hasRole(MINTER_ROLE, ctrl)).to.equal(true);
      expect(await token.hasRole(BURNER_ROLE, ctrl)).to.equal(true);
    });

    it("A5: controller holds CONTROLLER_ROLE on GoldVault", async () => {
      const ctrl = manifest.contracts.MintRedeemController;
      expect(await goldVault.hasRole(CONTROLLER_ROLE, ctrl)).to.equal(true);
    });

    it("A6: land vault holds CONSUMER_ROLE on LandOracle", async () => {
      const lv = manifest.contracts.AXLandVault;
      expect(await landOracle.hasRole(CONSUMER_ROLE, lv)).to.equal(true);
    });

    it("A7: registry has exactly two components (XAU and LAND)", async () => {
      expect(await registry.componentCount()).to.equal(2n);
    });

    it("A8: XAU component is registered correctly", async () => {
      const xauId = manifest.componentIds.XAU;
      const comp  = await registry.getComponent(xauId);
      expect(comp.symbol).to.equal("XAU");
      expect(comp.isLiquid).to.equal(true);
      expect(comp.enabled).to.equal(true);
      expect(comp.phase).to.equal(1);
      expect(comp.haircutBps).to.equal(500n);
      expect(comp.maxWeightBps).to.equal(10_000n);
      expect(comp.oracle.toLowerCase()).to.equal(manifest.externalAddresses.chainlinkXauUsd.toLowerCase());
      expect(comp.vault.toLowerCase()).to.equal(manifest.contracts.AXGoldVault.toLowerCase());
    });

    it("A9: LAND component is registered correctly", async () => {
      const landId = manifest.componentIds.LAND;
      const comp   = await registry.getComponent(landId);
      expect(comp.symbol).to.equal("LAND");
      expect(comp.isLiquid).to.equal(false);
      expect(comp.enabled).to.equal(true);
      expect(comp.phase).to.equal(3);
      expect(comp.haircutBps).to.equal(4_000n);
      expect(comp.maxWeightBps).to.equal(1_000n);
      expect(comp.oracle).to.equal(ethers.ZeroAddress);
      expect(comp.vault.toLowerCase()).to.equal(manifest.contracts.AXLandVault.toLowerCase());
    });

    it("A10: GoldVault is not frozen and reserve asset is WETH placeholder", async () => {
      expect(await goldVault.vaultFrozen()).to.equal(false);
      const asset = await goldVault.reserveAsset();
      expect(asset.toLowerCase()).to.equal(WETH_ARB_ONE.toLowerCase());
    });

    it("A11: Controller dependencies are correctly wired", async () => {
      expect((await controller.axauToken()).toLowerCase()).to.equal(manifest.contracts.AXAUTokenLite3643.toLowerCase());
      expect((await controller.registry()).toLowerCase()).to.equal(manifest.contracts.CommodityRegistry.toLowerCase());
      expect((await controller.navEngine()).toLowerCase()).to.equal(manifest.contracts.NAVEngine.toLowerCase());
    });

    it("A12: Mint and redeem are paused (safety hold)", async () => {
      expect(await controller.mintPaused()).to.equal(true);
      expect(await controller.redeemPaused()).to.equal(true);
    });

    it("A13: Default redeem fee is 50 bps; mint fee is 0", async () => {
      expect(await controller.mintFeeBps()).to.equal(0n);
      expect(await controller.redeemFeeBps()).to.equal(50n);
    });

    it("A14: NAVEngine oracle staleness is 1 hour and revertOnStale is true", async () => {
      expect(await navEngine.oracleStaleSecs()).to.equal(3600n);
      expect(await navEngine.revertOnStaleOracle()).to.equal(true);
    });

    it("A15: LandVault oracle address matches LandNAVOracleMultiSig", async () => {
      const oracleAddr = await landVault.navOracle();
      expect(oracleAddr.toLowerCase()).to.equal(manifest.contracts.LandNAVOracleMultiSig.toLowerCase());
    });

    it("A16: LandOracle has 2 signers (deployer + signer 2) with threshold 2", async () => {
      expect(await landOracle.signerCount()).to.equal(2n);
      expect(await landOracle.threshold()).to.equal(2n);
      expect(await landOracle.hasRole(SIGNER_ROLE, manifest.deployer)).to.equal(true);
      expect(await landOracle.hasRole(SIGNER_ROLE, manifest.externalAddresses.oracleSigner2)).to.equal(true);
    });
  });

  // ─── Suite B: NAVEngine with empty vault ──────────────────────────────────

  describe("B — NAVEngine view functions (empty vault)", () => {

    it("B1: totalBackingUsdWad = 0 when vault is empty", async () => {
      // Land NAV is stale + zero; gold vault has 0 units — both contribute 0
      expect(await navEngine.totalBackingUsdWad()).to.equal(0n);
    });

    it("B2: backingNavPerAXAUWad = TARGET_PRICE_WAD (1e18) when supply = 0", async () => {
      expect(await navEngine.backingNavPerAXAUWad()).to.equal(WAD);
    });

    it("B3: mintNavPerAXAUWad = 1.05e18 when supply = 0 (5% mint premium)", async () => {
      expect(await navEngine.mintNavPerAXAUWad()).to.equal(ethers.parseEther("1.05"));
    });

    it("B4: coverageRatioBps = max uint256 when supply = 0", async () => {
      expect(await navEngine.coverageRatioBps()).to.equal(ethers.MaxUint256);
    });

    it("B5: isSolvent returns true when supply = 0", async () => {
      expect(await navEngine.isSolvent()).to.equal(true);
    });

    it("B6: goldSnapshot returns (WETH, 0) for empty vault", async () => {
      const [asset, units] = await goldVault.goldSnapshot();
      expect(asset.toLowerCase()).to.equal(WETH_ARB_ONE.toLowerCase());
      expect(units).to.equal(0n);
    });

    it("B7: landSnapshot (stale=true) when no NAV applied and landUnits = 0", async () => {
      const [, stale] = await landVault.landSnapshot();
      // isNavStale() returns false when landUnits < 1, so stale = false initially
      expect(stale).to.equal(false);
    });

    it("B8: getAllComponents returns two elements", async () => {
      const comps = await registry.getAllComponents();
      expect(comps).to.have.length(2);
      const syms = comps.map((c: any) => c.symbol);
      expect(syms).to.include("XAU");
      expect(syms).to.include("LAND");
    });
  });

  // ─── Suite C: Land NAV oracle — 2-of-2 multisig flow ─────────────────────

  describe("C — Land NAV oracle (2-of-2 propose / confirm / apply)", () => {

    const NAV_PER_UNIT = ethers.parseEther("1000000"); // $1,000,000 per land unit

    it("C1: governor can book a land asset", async () => {
      const assetId = ethers.keccak256(ethers.toUtf8Bytes("AXIOM-LAND-001"));
      await landVault.connect(governor).bookAsset(assetId, "Test parcel — integration suite", ethers.parseEther("1"));
      expect(await landVault.landUnits()).to.equal(ethers.parseEther("1"));
    });

    it("C2: signer 1 (deployer) can propose a NAV; 1 confirmation = not yet approved", async () => {
      await landOracle.connect(governor).propose(NAV_PER_UNIT);
      const approved = await landOracle.getApprovedNAV();
      expect(approved).to.equal(0n); // threshold = 2, only 1 confirmation
    });

    it("C3: signer 2 confirms — reaches threshold; getApprovedNAV now returns the NAV", async () => {
      const currentNonce = await landOracle.nonce();
      await landOracle.connect(oracleSigner2).confirm(currentNonce);
      const approved = await landOracle.getApprovedNAV();
      expect(approved).to.equal(NAV_PER_UNIT);
    });

    it("C4: AXLandVault can apply the approved NAV (CEI: state before markConsumed)", async () => {
      await landVault.connect(governor).applyApprovedNAV();
      expect(await landVault.lastNavUsdWad()).to.equal(NAV_PER_UNIT);
      expect(await landVault.lastNavTimestamp()).to.be.greaterThan(0n);
    });

    it("C5: getApprovedNAV returns 0 after consumption (no double-apply)", async () => {
      expect(await landOracle.getApprovedNAV()).to.equal(0n);
    });

    it("C6: landSnapshot is not stale after applyApprovedNAV", async () => {
      const [valueWad, stale] = await landVault.landSnapshot();
      expect(stale).to.equal(false);
      expect(valueWad).to.equal(NAV_PER_UNIT); // 1 unit × $1M/unit
    });

    it("C7: totalBackingUsdWad reflects land contribution (60% of $1M after 40% haircut)", async () => {
      const backing  = await navEngine.totalBackingUsdWad();
      const expected = (NAV_PER_UNIT * 6_000n) / 10_000n; // $600,000
      expect(backing).to.equal(expected);
    });
  });

  // ─── Suite D: Mint / redeem flow (governance unpause) ─────────────────────

  describe("D — Mint flow (governor unpauses for test, re-pauses after)", () => {

    const MINT_AMOUNT = ethers.parseEther("1"); // 1 WETH

    before("Governor unpauses for test suite D", async function () {
      await controller.connect(governor).pauseMint(false);
      await controller.connect(governor).pauseRedeem(false);
    });

    it("D1: quoteMint returns non-zero AXAU for 1 WETH using live XAU/USD oracle", async () => {
      const xauId = manifest.componentIds.XAU;
      const [axauToUser, mintNavWad] = await controller.connect(governor).quoteMint(xauId, MINT_AMOUNT);
      expect(axauToUser).to.be.greaterThan(0n);
      expect(mintNavWad).to.be.greaterThan(0n);
      console.log(`      quoteMint : ${ethers.formatEther(axauToUser)} AXAU for 1 WETH`);
      console.log(`      mintNavWad: $${ethers.formatEther(mintNavWad)} per AXAU`);
    });

    it("D2: user wraps 1 ETH to WETH and approves controller", async () => {
      const wethUser = weth.connect(user);
      await wethUser.deposit({ value: MINT_AMOUNT });
      const bal = await weth.balanceOf(user.address);
      expect(bal).to.be.greaterThanOrEqual(MINT_AMOUNT);
      await wethUser.approve(manifest.contracts.MintRedeemController, MINT_AMOUNT);
    });

    it("D3: user mints AXAU with 1 WETH; balance matches quote", async () => {
      const xauId = manifest.componentIds.XAU;
      const [expectedAxau] = await controller.connect(governor).quoteMint(xauId, MINT_AMOUNT);
      const tx = await controller.connect(user).mintWithAsset(xauId, MINT_AMOUNT);
      await tx.wait();

      const axauBal = await token.balanceOf(user.address);
      // Allow 0.001 AXAU tolerance for block-level price movement
      expect(axauBal).to.be.closeTo(expectedAxau, ethers.parseEther("0.001"));
      console.log(`      minted   : ${ethers.formatEther(axauBal)} AXAU`);
    });

    it("D4: GoldVault.totalUnits = 1 WETH after mint", async () => {
      expect(await goldVault.totalUnits()).to.equal(MINT_AMOUNT);
    });

    it("D5: totalBackingUsdWad is positive and NAVEngine is solvent", async () => {
      const backing = await navEngine.totalBackingUsdWad();
      expect(backing).to.be.greaterThan(0n);
      expect(await navEngine.isSolvent()).to.equal(true);
    });

    it("D6: coverageRatioBps >= 10500 after mint (system is over-collateralised)", async () => {
      const cr = await navEngine.coverageRatioBps();
      console.log(`      coverage : ${Number(cr) / 100}%`);
      expect(cr).to.be.greaterThanOrEqual(10_500n);
    });

    it("D7: totalMinted on controller >= user AXAU balance (fee may have added more)", async () => {
      const userBal    = await token.balanceOf(user.address);
      const totalMinted = await controller.totalMinted();
      expect(totalMinted).to.be.greaterThanOrEqual(userBal);
    });

    after("Governor re-pauses after suite D", async function () {
      await controller.connect(governor).pauseMint(true);
      await controller.connect(governor).pauseRedeem(true);
    });
  });

  // ─── Suite E: Access control invariants ───────────────────────────────────

  describe("E — Access control invariants", () => {

    it("E1: non-governor cannot pause mint on controller", async () => {
      await expect(controller.connect(user).pauseMint(false)).to.be.reverted;
    });

    it("E2: non-governor cannot add a registry component", async () => {
      await expect(
        registry.connect(user).addComponent(
          "TEST", goldVault.target, ethers.ZeroAddress, 100n, 1_000n, false, 99
        )
      ).to.be.reverted;
    });

    it("E3: non-MINTER cannot call token.mint directly", async () => {
      await expect(token.connect(user).mint(user.address, WAD)).to.be.reverted;
    });

    it("E4: mint reverts while paused", async () => {
      const xauId = manifest.componentIds.XAU;
      await expect(controller.connect(user).mintWithAsset(xauId, WAD)).to.be.reverted;
    });

    it("E5: non-signer cannot call landOracle.propose", async () => {
      await expect(landOracle.connect(user).propose(WAD)).to.be.reverted;
    });

    it("E6: landVault.applyApprovedNAV reverts when no approved proposal", async () => {
      // Proposal was consumed in suite C; no new proposal exists
      await expect(landVault.connect(governor).applyApprovedNAV()).to.be.reverted;
    });
  });
});
