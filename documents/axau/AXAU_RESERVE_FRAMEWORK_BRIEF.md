# AXAU Reserve Framework Brief

Document class: Architectural and Product Definition Brief
Status: Definition and consolidation only — no contracts deployed, no logic changed, no assets issued
Prepared: 2026-05-02
Source of truth: AXAU_EVOLUTION_BOUNDARY_REPORT.md, documents/axau-whitepaper.md, COMMODITY_EXPANSION_FRAMEWORK.md, AXAG diligence documents, lib/axau/spec.ts, lib/glossary.ts

---

## 1. Executive Definition

**At the system level:** AXAU is a multi-component reserve framework on Arbitrum One. It defines a registry-driven architecture in which each approved reserve component is held in a dedicated vault, priced through a dedicated oracle, and gated through a unified mint and redeem controller that enforces a 105% coverage floor. The framework supports up to 20 simultaneously active components and distinguishes between liquid components (eligible for spot mint and redemption) and illiquid components (contribute to backing only).

**Today:** AXAU is a single-module instance of that framework. The only enabled component is gold, held as PAXG in `AXGoldVault`, priced by the Chainlink XAU/USD aggregator. The land vault and land oracle are deployed but disabled. The silver sleeve is in technical and regulatory diligence but is not registered.

**What AXAU is not:** Not a stablecoin. Not a yield instrument. Not a synthetic or derivatives product. Not an investment fund. Not permissionlessly transferable — the token is ERC-3643 with identity-gated transfers. Not a basket-redemption token; redemption returns the asset of the chosen vault, never a pro-rata slice of all sleeves.

---

## 2. Current Live Module — Gold

**Backing truth.** Each AXAU token outstanding is backed, at minimum, by haircut-adjusted PAXG held in `AXGoldVault` (`0xaCc9BFf5...4CF8`). The XAU component is registered in `CommodityRegistry` with `haircutBps = 0` in production. The protocol's only buffer between Backing NAV and Mint NAV is the 5% mint premium baked into `NAVEngine.MINT_PREMIUM_BPS`. Coverage is enforced at 105% pre- and post-mint by `MintRedeemController`.

**Redemption truth.** A holder may burn AXAU through `MintRedeemController.redeemAXAU(vaultId, amount)` and receive PAXG back from `AXGoldVault` at Backing NAV, subject to the redeem-paused flag and vault solvency. PAXG itself is redeemable for physical gold only through Paxos under Paxos's terms — Axiom does not custody physical gold.

**Governance and control truth.** All `CommodityRegistry` changes, governor-privilege calls, fee changes, and pause toggles execute through the Axiom Gnosis Safe behind the documented 72-hour governance timelock. The deployer holds `GOVERNOR_ROLE` on all live AXAU contracts. Emergency circuit-breakers exist independently of governance: stale oracle, non-positive price, or coverage breach causes the affected mint or redeem call to revert without a governance action.

---

## 3. Inactive and Deferred Modules

### 3.1 Silver Sleeve (XAG, KAG-backed)

**Current status:** In technical diligence. Selected path is Option B — silver sleeve inside AXAU, not a standalone AXAG token. AXAG is not live and not issued.

**Already deployed vs. not active.** Drafts only: `AXSilverVault.sol` and `XagPerGramOracle.sol` exist in `contracts/axau/drafts/`. Internal audit closed (AXAG-AUDIT-001). Regulatory interpretation memo filed (AXAG-REG-MEMO-001). Chainlink XAG/USD on Arbitrum (`0xC56765f04B248394CF1619D20dB8082Edbfa75b1`) and L2 sequencer uptime feed verified. KAG bridge path confirmed (Ethereum L1: `0xf94d9B6Dc4Eacd89fE3235d9A3C2465fEA405157`). No silver vault is deployed on Arbitrum One. No KAG is held by any Axiom automated control layer. Component `XAG` is not registered in `CommodityRegistry`.

**Gates remaining (per AXAG_STAGE_2_EVIDENCE_TRACKER.md):**
- G-01 Gnosis Safe quorum for `addComponent("XAG", ...)`
- G-03 KAG bridged from Ethereum to Arbitrum One
- G-04a/b Bridged KAG address recorded; decimals = 18 verified; not fee-on-transfer
- G-06 Reserve KAG staged in deployer wallet
- G-07 Atomic disclosure flip across six surfaces
- C-02 through C-07 Custody RFP responses, custodian selection, term sheet, attestation, chain-of-custody (custody is the primary bottleneck)
- L-01 through L-05 AMM bootstrap, market maker, redemption SLA, fallback path, liquidity projections
- R-01 through R-03 LBMA spec, insurance and chain-of-custody documentation, volatility floor analysis
- P-01 through P-05 Stage 2 packet completion, re-scoring, Stage 3 scheduling
- Pre-deployment governance call: `NAVEngine.setOracleStaleSecs(97200)` must execute before silver registration to accommodate the 24-hour XAG/USD heartbeat

### 3.2 Land Sleeve (Phase 3)

**Current status:** Infrastructure deployed; component disabled; no NAV ever submitted.

**Already deployed vs. not active.** `AXLandVault` (`0x66Aadce6...449cf`) and `LandNAVOracleMultiSig` (`0x8FF5D66d...A0Fc`) are live on Arbitrum One. The LAND component is registered in `CommodityRegistry` with `enabled = false`, `haircutBps = 4000` (40%), `maxWeightBps = 1000` (10%), `isLiquid = false`. `lastNavTimestamp = 0`. `totalValueUsdWad = 0`.

**Gates remaining:**
- Authorized appraiser signers configured on the multi-sig oracle (threshold ≥ 2)
- `CONSUMER_ROLE` granted to AXLandVault on the oracle
- First NAV proposal created and confirmed by ≥ threshold signers within the 7-day validity window
- AXLandVault consumes the first NAV via `markConsumed()`
- Governor calls `CommodityRegistry.setEnabled(keccak256("LAND"), true)`
- Operational pipeline: titled property acquired, appraisal cadence established (20-day minimum cooldown, 35-day staleness window), single NAV move capped at 30% by `MAX_CHANGE_BPS`
- Stage 1 CEF scoring filed for land — not yet on file

### 3.3 Future Commodity Sleeves

Per `COMMODITY_EXPANSION_FRAMEWORK.md`:
- Category A (additional precious metals — platinum, palladium): viable; replicates the gold pattern. No vault drafts exist. Requires the full 4-stage CEF workflow.
- Category B (energy — WTI, LNG): deferred. The whitepaper categorically excludes synthetic or derivatives-based exposure. No physically-backed tokenized energy instrument with acceptable custody exists on Arbitrum One.
- Category C (agriculture): deferred.
- Category D (industrial metals): deferred.
- Each new component requires Stage 1 screening, Stage 2 technical diligence, Stage 3 governance vote, Stage 4 launch readiness gate. None of these are in motion outside the silver path.

A standalone AXAG token (Option A) is not a sleeve — it is a separate instrument and has been deferred behind Option B. AXAG is not live and not issued.

---

## 4. Architectural Constants

Every reserve module — current, inactive, or future — inherits the following from the framework. These are enforced in deployed code.

| Constant | Source | Value or Behavior |
| -------- | ------ | ----------------- |
| Single AXAU token contract | `AXAUTokenLite3643` | Every module backs the same ERC-3643 token; no per-sleeve token issuance |
| Single mint and redeem gateway | `MintRedeemController` | Every liquid module routes through the same controller |
| Single NAV engine | `NAVEngine` | All component values aggregate into one `totalBackingUsdWad` |
| Coverage floor 105% | `NAVEngine.MIN_COVERAGE_BPS = 10500` | Pre- and post-check on every mint and redeem |
| Mint premium 5% | `NAVEngine.MINT_PREMIUM_BPS = 500` | Mint NAV is always Backing NAV × 1.05 |
| Maximum 20 components | `NAVEngine.MAX_COMPONENTS = 20` | Hard ceiling on simultaneously registered components |
| Component registry as single source of truth | `CommodityRegistry` | Vault, oracle, haircut, weight cap, liquidity flag, enabled flag stored per component |
| Governor-only registry mutations | `onlyGovernor` modifier | All `addComponent`, `setHaircut`, `setMaxWeight`, `setEnabled` calls execute through Axiom Gnosis Safe |
| 72-hour governance timelock | Whitepaper §8 | All governor-privilege calls subject to timelock delay |
| Oracle interface contract | `IChainlinkOracle` | Every oracle returns `(roundId, answer, startedAt, updatedAt, answeredInRound)` and `decimals()` |
| Vault interface contract | `IVaultSnapshot` | Every vault exposes a snapshot of its reserve asset and units held |
| Circuit-breaker on oracle staleness, non-positive price, or coverage breach | `NAVEngine` reverts; `MintRedeemController` propagates | Affected operation pauses without governance action |
| ERC-3643 identity gate on all transfers | `AXAUTokenLite3643` | Sender and receiver must hold valid ONCHAINID |
| Single-asset return per redemption | `MintRedeemController.redeemAXAU(vaultId, …)` | Redemption returns the asset of the chosen vault; no basket proration |
| Disclosure language under glossary discipline | `lib/glossary.ts` | All public language uses approved institutional vocabulary; no absolutist or yield-promise claims |

---

## 5. Architectural Variables

These are configured per component at registration time or by subsequent governor calls. None require contract redeployment.

| Variable | Configured Where | Notes |
| -------- | ---------------- | ----- |
| Reserve asset address | `CommodityRegistry.Component.vault → vault.reserveAsset()` | One ERC-20 per vault; cached `assetDecimals` at registration |
| Vault contract | `CommodityRegistry.Component.vault` | Must implement `IVaultSnapshot`; one vault per component |
| Oracle contract | `CommodityRegistry.Component.oracle` | Must implement `IChainlinkOracle` with 8-decimal answer |
| Haircut | `CommodityRegistry.setHaircut(symbol, haircutBps)` | Per-component; XAU is constrained to 0 until NAVEngine v2 (see Red Lines) |
| Maximum basket weight | `CommodityRegistry.setMaxWeight(symbol, maxWeightBps)` | Per-component; 0 = uncapped |
| Liquidity status | `Component.isLiquid` | Determines mint and redeem eligibility through `MintRedeemController` |
| Enabled status | `CommodityRegistry.setEnabled(symbol, bool)` | Components can be disabled without removal |
| Phase label | `Component.phase` | Documentary tag (1, 2, 3, …) |
| Redemption path | Implicit in vault choice | Holder selects `vaultId`; vault's reserve asset is what comes back |
| Disclosure specifics | `lib/axau/spec.ts` and surfaces (`pages/axau.tsx`, etc.) | Per-module description, custody notes, regulatory notes |
| Oracle staleness window (NAVEngine) | `NAVEngine.setOracleStaleSecs(uint256)` | Global, not per-component; current default 3600s; must widen to 97,200s before silver registration |

---

## 6. AXAU Evolution Model

The recommended model is **AXAU as a reserve framework**, not as a single-asset gold token. The framework defines the contract architecture, the coverage discipline, the oracle and governance controls, and the disclosure language. Each module is a governed instance of that framework.

| Module | Status | Role |
| ------ | ------ | ---- |
| Gold (PAXG) | Live module 1 | The active reserve component; the only one in production |
| Silver (KAG-backed) | Likely module 2 | Deployment-ready in design; gates remain; AXM vote waived as operational addition |
| Land (RWA) | Illiquid module | Deployed inactive; participates in NAV only; never a redemption asset |
| Future precious metals | Governed sleeves | Replicate gold pattern; require full CEF workflow |
| Future categories (energy, agriculture, industrial) | Governed sleeves, deferred | No infrastructure exists; categorical exclusion of synthetics |

The framework's value is that adding a module does not change the token, the controller, the engine, or the registry — it adds a row. Each new component is additive to backing without diluting supply (an Expansion Event in whitepaper §4.2 terms).

**What this model does not mean.** It does not mean all listed modules are live. It does not mean all are committed for activation on a fixed timeline. It does not mean approval of any specific module is implied by the existence of the framework. Each module independently progresses through the CEF workflow.

---

## 7. Product Truth Rules

These statements are consistent with current code and current documents. They may be used in disclosure, marketing, and institutional communication.

1. **AXAU is the reserve framework.** It is the architecture by which Axiom Protocol holds and reports a multi-component reserve basket on Arbitrum One.
2. **Gold is the current live reserve module.** Held as PAXG in `AXGoldVault`. No other module is active.
3. **Each AXAU outstanding is backed by reserves at or above 105% coverage**, enforced on every mint and redeem by automated control layers.
4. **Additional reserve sleeves may be added through governance and launch gates.** Each sleeve passes through the four-stage Commodity Expansion Framework before activation.
5. **AXAU is an ERC-3643 token.** Transfers require on-chain identity registration. AXAU is not a permissionless ERC-20.
6. **Redemption returns the asset of the chosen vault.** A holder redeems against a specific reserve sleeve and receives that sleeve's reserve asset (currently only PAXG is available).
7. **AXAG is not live and not issued.** No silver-related token exists. The silver sleeve, if activated, will be a component inside AXAU, not a standalone token.
8. **The land sleeve is deployed but inactive.** No land NAV has been submitted; the component is disabled in the registry.
9. **AXAU is not a stablecoin.** The token's USD-denominated value moves with its reserve basket.
10. **AXAU does not generate yield by default.** Any future yield mechanics require separate governance approval and separate implementation.
11. **AXAU does not hold synthetic or derivatives-based commodity exposure.** Only physically-backed tokenized reserve assets qualify under AXAU admission criteria.

---

## 8. Red Lines

Under current deployed architecture, AXAU must not become any of the following without contract redeployment, governance rewrite, or both.

| Red Line | Evidence | Why It Cannot Cross |
| -------- | -------- | ------------------- |
| Stablecoin | Whitepaper §2.2; no PSM, no peg-stability logic in any deployed contract | Would require a new instrument class — peg stability module, fiat-redemption controller — none of which exist in the codebase |
| Synthetic or derivatives-backed commodity product | Whitepaper §4.4 categorical exclusion | Admission criteria amendment required at governance level; even then, no qualifying instrument exists on-chain |
| Permissionless transfer token | `AXAUTokenLite3643` is ERC-3643 with identity-gated transfers | Requires full token replacement and migration |
| Basket-redemption token | `MintRedeemController.redeemAXAU(vaultId, …)` is single-vault by design | Requires a new cross-vault settlement controller; none exists |
| Yield-bearing instrument | Whitepaper §2.2; no rebase, no distribution, no revenue routing exists | Requires new yield contract, revenue source, and governance approval |
| Vague mixed-asset token | Every component is named, registered, haircutted, weight-capped, and disclosed individually | Conflicts with the registry architecture itself; the framework's whole point is per-component transparency |
| XAU haircut > 0 | `NAVEngine.MINT_PREMIUM_BPS = 500` (constant) | Any non-zero XAU haircut breaks the 105% coverage on mint with the current 5% premium; requires new NAVEngine with higher MINT_PREMIUM_BPS |
| More than 20 simultaneously active components | `NAVEngine.MAX_COMPONENTS = 20` (constant) | Requires new NAVEngine — not a near-term concern (current use: 2 of 20) |

---

## 9. Recommended Direction

1. **Deepen AXAU as the reserve framework.** Public language, institutional documentation, and product surfaces should consistently position AXAU as a multi-component reserve framework with gold as the live module — not as a single-asset gold token. The framework framing is already true in the contracts; it should be true in the words.

2. **Keep the silver-inside-AXAU path active.** Option B (silver as a component of AXAU) is the chosen path; AXM vote has been waived because adding silver as collateral is operational, not a protocol change. The remaining gates are operational (custody, bridge, liquidity, disclosure flip), not architectural. Continue executing the AXAG_STAGE_2_EVIDENCE_TRACKER workstream. Do not reopen Option A (standalone AXAG token) without a documented reason that overrides the audit recommendation.

3. **Avoid unnecessary fragmentation into separate reserve assets.** Issuing AXAG, AXLAND, AXPT, or any other per-commodity token would fragment liquidity, multiply audit surface, and weaken the framework story. Prefer one AXAU with many sleeves over many tokens with one sleeve each. The framework was built for this — use it.

4. **Treat each new module like a registry row, not a product launch.** When a sleeve is added through governance, the user-facing product remains AXAU; the new module is an additive disclosure event, not a separate token launch. This keeps marketing surface, legal surface, and integration surface bounded.

5. **Hold land at "deployed but inactive" until pipeline evidence exists.** Activation requires titled property, appraiser signers, and a first confirmed NAV. None of these are in motion. Maintain Phase 3 status; do not move land to "active" in any disclosure surface until the on-chain `lastNavTimestamp > 0` and `enabled = true`.

---

## 10. Final Summary

**What AXAU is.** A multi-component reserve framework on Arbitrum One. One ERC-3643 token, one controller, one engine, one registry. One live module today: gold via PAXG.

**What it can evolve into.** A two- to twenty-module reserve instrument adding silver (KAG-backed, gates pending), land (deployed inactive, awaiting pipeline), and additional precious metals (replicate the gold pattern through CEF). All within the existing contracts; each new module is a registry row.

**What it cannot evolve into.** A stablecoin, a synthetic product, a permissionlessly transferable token, a basket-redemption token, a yield instrument, or a vague mixed-asset token. Crossing any of those requires contract redeployment or governance rewrite.

**What Axiom should do next.** Position AXAU publicly as the reserve framework. Finish the silver gates (custody, bridge, disclosure). Hold land at deployed-inactive until the pipeline produces a first appraisal. Do not fragment by issuing per-commodity tokens.

---

**FINAL VERDICT: AXAU RESERVE FRAMEWORK BRIEF READY**
