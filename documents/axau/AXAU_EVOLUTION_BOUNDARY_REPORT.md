# AXAU Evolution Boundary Report

Document class: Architectural Analysis — Investigation Only
Scope: What AXAU can and cannot evolve into, based entirely on deployed code and filed documents
Status: INVESTIGATION COMPLETE — no new contracts, no new assets, no reserve changes
Prepared: 2026-05-02
Evidence base: contracts/axau/*, contracts/axau/drafts/*, documents/commodities/*, documents/axau-whitepaper.md, AXAG_INTERNAL_AUDIT_REPORT.md, AXAG_STAGE_2_EVIDENCE_TRACKER.md, AXAG_KINESIS_GO_LIVE_PATH.md, DEPLOYMENT_PLAYBOOK.md

---

## Status Notice

This document is a read-only architectural analysis. It authorizes nothing. It does not constitute approval for any contract deployment, token mint, reserve acquisition, or protocol change. All evolution paths described as feasible remain subject to the governance and operational gates described in their respective workstream documents.

---

## Table of Contents

1. [Baseline — Phase 1 Live Architecture](#1-baseline--phase-1-live-architecture)
2. [Structural Capabilities — What the Architecture Permits](#2-structural-capabilities--what-the-architecture-permits)
3. [Hard Constraints — What the Architecture Prohibits Without Redeployment](#3-hard-constraints--what-the-architecture-prohibits-without-redeployment)
4. [Evolution Path Inventory](#4-evolution-path-inventory)
5. [Silver Sleeve — Gate Status as of 2026-05-02](#5-silver-sleeve--gate-status-as-of-2026-05-02)
6. [Land Sleeve — Activation Boundary](#6-land-sleeve--activation-boundary)
7. [Outer Boundary — What AXAU Cannot Become](#7-outer-boundary--what-axau-cannot-become)
8. [Constraint Catalog](#8-constraint-catalog)
9. [Architecture Boundary Map](#9-architecture-boundary-map)
10. [Evidence Index](#10-evidence-index)

---

## 1. Baseline — Phase 1 Live Architecture

### 1.1 Deployed Contracts (Arbitrum One, Chain ID 42161)

| Contract | Address | Role | Status |
| -------- | ------- | ---- | ------ |
| AXAUTokenLite3643 | 0xbcCA4D...0Bb | ERC-3643 token, supply control | LIVE |
| MintRedeemController | 0x036F05a3...37792 | Mint/redeem gateway, 105% enforcement | LIVE |
| NAVEngine | 0x80F8634a...C519 | Multi-component NAV computation | LIVE |
| CommodityRegistry | 0x6D3aAa92...10bDa | Approved reserve component registry | LIVE |
| AXGoldVault | 0xaCc9BFf5...4CF8 | PAXG reserve vault | LIVE |
| AXLandVault | 0x66Aadce6...449cf | Land reserve vault | DEPLOYED — INACTIVE |
| LandNAVOracleMultiSig | 0x8FF5D66d...A0Fc | Multi-party land appraisal oracle | DEPLOYED — INACTIVE |

Source: `documents/axau-whitepaper.md` §3.1, §Appendix A

### 1.2 Registered Reserve Components

| Symbol | Vault | Oracle | HaircutBps | MaxWeightBps | isLiquid | Enabled | Phase |
| ------ | ----- | ------ | ---------- | ------------ | -------- | ------- | ----- |
| XAU | AXGoldVault | Chainlink XAU/USD | 0 (see BC-01) | uncapped | true | true | 1 |
| LAND | AXLandVault | LandNAVOracleMultiSig | 4000 (40%) | 1000 (10%) | false | false | 3 |

Source: `documents/axau-whitepaper.md` §3.2 (critical note on XAU haircutBps), `contracts/axau/CommodityRegistry.sol`

### 1.3 Live System Parameters

| Parameter | Value | Source |
| --------- | ----- | ------ |
| MINT_PREMIUM_BPS | 500 (5%) | NAVEngine constant — immutable until redeployment |
| MIN_COVERAGE_BPS | 10500 (105%) | NAVEngine constant — immutable until redeployment |
| MAX_COMPONENTS | 20 | NAVEngine constant |
| oracleStaleSecs | 3600 (1h, default) — must be updated to 97200 before silver registration | NAVEngine — settable by governor |
| oracleStaleness | 97200 (27h) | MintRedeemController — already correctly set |
| mintFeeBps | 0 | MintRedeemController — settable |
| redeemFeeBps | 0 | MintRedeemController — settable |
| AXAU genesis mint | 0.0013 PAXG → 5.789977 AXAU (Block 448396754) | Whitepaper §1.2 |

---

## 2. Structural Capabilities — What the Architecture Permits

These are capabilities verifiable directly from deployed and drafted contract code. They do not require new contract paradigms — only configuration changes, governor calls, or new vault deployments that plug into the existing interface set.

### 2.1 Multi-Component Reserve Basket (up to 20 components)

**Evidence:** `NAVEngine.sol` defines `MAX_COMPONENTS = 20`. The `totalBackingUsdWad()` function iterates over all registered components in `CommodityRegistry`, calling `vault.snapshot()` and `oracle.latestRoundData()` for each enabled component. The loop is bounded by `MAX_COMPONENTS`.

**Implication:** AXAU can hold up to 20 simultaneously active reserve components without any contract change. Each component requires a vault contract implementing `IVaultSnapshot` and an oracle implementing `IChainlinkOracle`. The registry admission (`addComponent`) is governed by `GOVERNOR_ROLE` (Gnosis Safe).

**Current usage:** 2 of 20 slots registered (XAU, LAND). 18 slots remain available for expansion.

### 2.2 Liquid and Illiquid Asset Classes

**Evidence:** `CommodityRegistry.Component.isLiquid` is a boolean stored per component. `MintRedeemController` enforces that only liquid vaults are eligible for spot mint/redeem operations. Illiquid vaults (LAND) participate in NAV computation but not in the mint/redeem routing path.

**Implication:** AXAU can carry both liquid (precious metals, tokenized commodities with real-time oracle) and illiquid (land, infrastructure, private assets with attestation-based oracle) components simultaneously. The architecture physically separates these paths — illiquid assets improve Backing NAV without becoming redeemable on-demand.

### 2.3 Per-Component Haircut and Weight Configuration

**Evidence:** `CommodityRegistry.Component` carries individual `haircutBps` and `maxWeightBps` per component. NAVEngine applies the haircut in `componentValueUsdWad(bytes32)` before summing into `totalBackingUsdWad()`. Governor can call `setHaircut(bytes32, uint256)` and `setMaxWeight(bytes32, uint256)` on CommodityRegistry without redeployment.

**Implication:** Reserve risk policy (haircut, concentration cap) is independently configurable per asset class. Adding a volatile commodity at 20% haircut and 15% max weight is a governance call, not a redeploy.

**Active configuration:** XAU haircutBps = 0 (production — see BC-01 for the critical constraint). LAND haircutBps = 4000 (40%), maxWeightBps = 1000 (10%).

### 2.4 Oracle Staleness Policy (Settable Per Governor Call)

**Evidence:** `NAVEngine.setOracleStaleSecs(uint256)` is a `onlyGovernor` function. Default: 3600s. `MintRedeemController.oracleStaleness` is immutable at 97200s (set at constructor time for the live deployment).

**Implication:** NAVEngine's oracle freshness window can be widened to accommodate assets with slower oracle heartbeats (e.g., 24h XAG/USD heartbeat) by a single governance transaction. The MintRedeemController's staleness constant cannot be changed without redeployment.

**Pending action:** `NAVEngine.setOracleStaleSecs(97200)` must be called before silver component registration (DEPLOYMENT_PLAYBOOK.md Step 2.5 — audit finding F-01 remediation).

### 2.5 Vault-Specific Oracle Architecture

**Evidence:** Each component in `CommodityRegistry` carries its own `oracle` address. NAVEngine calls `oracle.latestRoundData()` on the per-component oracle, not a shared oracle. This means different components can use different oracle designs: Chainlink aggregators, time-weighted average price feeds, multi-sig attestation oracles (LandNAVOracleMultiSig), or custom gram-conversion wrappers (XagPerGramOracle).

**Implication:** Exotic or non-standard assets that lack a direct Chainlink feed can still be integrated provided a conforming oracle wrapper is written. The wrapper must implement `latestRoundData()` → `(roundId, answer, startedAt, updatedAt, answeredInRound)` and `decimals()` returning 8.

### 2.6 Emergency Controls (Circuit-Breaker Architecture)

**Evidence:** `MintRedeemController` maintains `mintPaused` and `redeemPaused` flags settable by the governor. Individual vaults have `setVaultFrozen(bool)` callable by governor. NAVEngine reverts on stale oracle, non-positive price, or coverage ratio below floor — all of these propagate to MintRedeemController as transaction reverts, effectively pausing the affected operation without a governance call.

**Implication:** AXAU can degrade gracefully: a single component's oracle failure pauses minting/redemption for that component's vault but does not affect other vaults. A governance pause is additive on top of the automatic circuit-breaker.

### 2.7 Governance Timelock (72-Hour Delay)

**Evidence:** `documents/axau-whitepaper.md` §8 and COMMODITY_EXPANSION_FRAMEWORK.md reference a 72-hour governance timelock for all `CommodityRegistry` changes and governor-privilege calls.

**Implication:** Any reserve expansion, haircut change, or component removal is subject to a 72-hour execution delay, providing a window for community review and, if necessary, emergency intervention before the change takes effect.

### 2.8 Fees (Mint and Redeem)

**Evidence:** `MintRedeemController` exposes `mintFeeBps` and `redeemFeeBps` as mutable governor-settable values. Both are currently 0. There is no structural maximum on fees enforced in the contract code.

**Implication:** Protocol fees on mint/redeem operations can be activated by governance without redeployment. Collected fees route to the treasury address held in the controller.

---

## 3. Hard Constraints — What the Architecture Prohibits Without Redeployment

### BC-01 — XAU Haircut Cannot Be Made Non-Zero Without NAVEngine Redeployment

**Evidence:** `documents/axau-whitepaper.md` §3.2 Critical Note: "The XAU component's `haircutBps` is set to `0` in production. This is a deliberate configuration required by the current NAVEngine design. The NAVEngine's `MINT_PREMIUM_BPS` constant is set to `500` (5%). With this mint premium, any non-zero XAU haircut causes the coverage calculation to yield less than 10500 bps (105%), which prevents minting. To re-introduce a haircut on the XAU component, the NAVEngine must be redeployed with a higher `MINT_PREMIUM_BPS` constant. Do not change `haircutBps` for XAU without first deploying a new NAVEngine."

**Boundary:** Current single-asset basket (XAU only) has zero effective risk buffer on the gold component itself. The 5% mint premium is the only buffer. Adding a second component (silver) improves the structural position because silver's 8% haircut provides an additional cushion on the aggregate basket — but the XAU haircut-zero constraint remains until NAVEngine v2 is deployed.

**Required change:** New NAVEngine deployment with MINT_PREMIUM_BPS ≥ 1300 (accounting for haircuts across all active components) before XAU haircut can be set to a non-zero value.

### BC-02 — MintRedeemController Oracle Staleness Is Immutable at 97,200 Seconds

**Evidence:** `contracts/axau/MintRedeemController.sol` — `oracleStaleness` is set in the constructor and has no setter. Current value: 97,200s (27 hours).

**Boundary:** No new reserve component may use an oracle with a heartbeat longer than ~24 hours (the 27h window provides a 3-hour buffer). Assets requiring weekly or monthly price attestations (e.g., private credit, real estate) cannot be used as liquid mint/redeem assets. They may still enter the basket as illiquid components (bypass the MintRedeemController's vault routing) but cannot be the redemption asset.

**Required change for longer heartbeats:** MintRedeemController redeployment, or rearchitecting illiquid components as non-redemption-eligible in the existing router.

### BC-03 — MAX_COMPONENTS Cap at 20

**Evidence:** `contracts/axau/NAVEngine.sol` — `MAX_COMPONENTS = 20` is a constant. The loop in `totalBackingUsdWad()` is bounded by this value.

**Boundary:** Hard ceiling of 20 simultaneously registered reserve components (liquid + illiquid combined). Currently 2 of 20 are used (XAU and LAND). This cap is not expected to be a practical constraint within the 5-year planning horizon given the CEF governance friction required to admit each new component.

**Required change to lift:** New NAVEngine deployment with higher MAX_COMPONENTS.

### BC-04 — Land Sleeve Cannot Be Accessed via Spot Mint/Redeem

**Evidence:** `MintRedeemController.mintAXAU(bytes32 vaultId, uint256 amount)` calls `registry.getComponent(vaultId)` and checks `component.isLiquid`. If `isLiquid == false`, the call reverts with "not liquid". AXLandVault is registered with `isLiquid = false`.

**Boundary:** No user can mint AXAU by depositing land title units into AXLandVault, and no user can redeem AXAU for land title units through MintRedeemController. Land participates in NAV computation only — it raises Backing NAV per AXAU token and improves coverage, but the redemption path for AXAU always returns a liquid asset (currently PAXG, future: PAXG or KAG depending on the vault chosen at redeem time).

**Design intent:** This is a feature, not a limitation. Illiquid reserve components are accretive to backing without creating redemption obligations the protocol cannot service on-demand.

### BC-05 — ERC-3643 Transfer Restrictions Are Non-Negotiable Without Token Redeployment

**Evidence:** `documents/axau-whitepaper.md` §2.3 — "Token transfers can only occur between wallets holding valid on-chain identities registered with the ONCHAINID registry." `AXAUTokenLite3643` is a production ERC-3643 deployment. The compliance module is composable but the identity gate itself is baked into the token standard.

**Boundary:** AXAU cannot be freely transferred without identity registration under the current token contract. This affects protocol integrations: any AMM, lending protocol, or bridge wishing to hold or route AXAU must register an on-chain identity or AXAU cannot be transferred to its contract address. This is an explicit regulatory design choice, not a technical accident.

**Required change for permissionless transfer:** Token contract redeployment with a different standard (ERC-20 or ERC-3525). This would require a full token migration and is not contemplated in any filed planning document.

### BC-06 — Single Redemption Asset Per Vault — No Cross-Vault Redemption

**Evidence:** `MintRedeemController.redeemAXAU(bytes32 vaultId, uint256 axauAmount)` routes redemption to a specific vault by `vaultId`. Each vault holds exactly one reserve asset. There is no cross-vault redemption netting — redeeming against the gold vault returns PAXG; redeeming against the silver vault (when live) will return KAG.

**Boundary:** As the basket expands, holders must specify which vault they redeem from. There is no "basket redemption" that returns a proportional slice of all reserve assets simultaneously. This is architecturally intentional but must be communicated clearly in disclosure: redemption in a multi-sleeve AXAU returns the specific asset of the vault chosen, not a pro-rata basket.

**Required change for basket redemption:** A new controller with cross-vault settlement logic. No such contract exists in the codebase.

### BC-07 — NAVEngine MINT_PREMIUM_BPS Is Immutable at 5%

**Evidence:** `contracts/axau/NAVEngine.sol` — `MINT_PREMIUM_BPS` is a `uint256 public constant = 500`. Constants in Solidity are embedded in bytecode and cannot be changed without redeployment.

**Boundary:** The 5% mint premium above Backing NAV is hardcoded. It cannot be lowered (e.g., to tighten the spread for institutional minters) or raised (e.g., to widen the buffer during volatile market conditions) without deploying a new NAVEngine. This is the same constraint that forces XAU haircutBps to remain 0 (BC-01).

### BC-08 — KAG Bridge Withdrawal Delay: 7–8 Days (Arbitrum Challenge Period)

**Evidence:** `contracts/axau/drafts/DEPLOYMENT_PLAYBOOK.md` Step 0: "Moving KAG back to Ethereum mainnet via the canonical bridge takes 7–8 days due to the Arbitrum challenge period. This must be disclosed in AXAU reserve documentation."

**Boundary:** The silver sleeve's reserve asset (KAG on Arbitrum One, bridged from Ethereum mainnet) cannot be repatriated to Ethereum mainnet for rapid liquidation. In a forced-unwind scenario, the silver reserve is effectively Arbitrum-locked for 7–8 days. This does not affect AXAG redemption on Arbitrum One (KAG → redeemer is Arbitrum-to-Arbitrum), but it affects the issuer's ability to unwind the reserve back to the L1 ecosystem.

**Required change:** This constraint resolves if KMS Labs deploys KAG natively on Arbitrum One (Option R-C in AXAG_KINESIS_GO_LIVE_PATH.md §4.2 — preferred path). The DEPLOYMENT_PLAYBOOK.md notes this is in progress ("Kinesis 2.0 EVM expansion").

### BC-09 — Two-Step Silver Redemption — Axiom Controls Only Step One

**Evidence:** `AXAG_KINESIS_GO_LIVE_PATH.md` §1.7, §3.2, §6.3 — "The second step (KAG → physical silver) is controlled by KMS Labs. Axiom cannot make representations about the KMS Labs redemption timeline, minimums, or availability."

**Boundary:** AXAU silver sleeve redemption returns KAG (an ERC-20 token issued by KMS Labs AG, Liechtenstein TVTG). Conversion of KAG to physical silver requires a separate KMS Labs platform account, is subject to KMS Labs minimum quantities (historically 200–1,000 grams), and is outside Axiom Protocol's SLA. Disclosure must not claim direct silver backing or direct physical redemption.

---

## 4. Evolution Path Inventory

Each path is rated on three dimensions derived from repository evidence:
- **Technical Readiness**: how complete the contract and oracle code is
- **Governance Readiness**: how far along the CEF diligence process is
- **Operational Readiness**: custody, liquidity, and bridge infrastructure

### Path A — Silver Sleeve (XAG/KAG) Inside AXAU — Option B

| Dimension | Status | Key Evidence |
| --------- | ------ | ------------ |
| Technical Readiness | HIGH — drafts complete, audit closed | AXSilverVault.sol, XagPerGramOracle.sol, DEPLOYMENT_PLAYBOOK.md, AXAG-AUDIT-001 |
| Governance Readiness | HIGH — AXM vote waived; Gnosis Safe execution pending | AXAG_STAGE_2_EVIDENCE_TRACKER.md G-01 OPEN |
| Operational Readiness | MEDIUM — custody C-02 in progress, KAG bridge path confirmed | DEPLOYMENT_PLAYBOOK.md Step 0; C-02, C-03 OPEN |
| Blocking gates | G-01 (Gnosis Safe quorum), G-03 (bridge execution), G-04a/b (KAG address + decimals verify), G-06 (reserve KAG staged), G-07 (disclosure flip) | — |
| Architecture change | None to existing live contracts (except setOracleStaleSecs governance call) | DEPLOYMENT_PLAYBOOK.md Step 2.5 |
| Scope | Silver as a reserve component inside AXAU; no new top-level token | AXAG_INTERNAL_AUDIT_REPORT.md §5 Option B rationale |

**What this path evolves AXAU into:** A two-sleeve reserve instrument — gold (PAXG, uncapped) + silver (KAG-bridged, 30% max, 8% haircut). Backing NAV increases. Redemption paths split by vault: AXAU → PAXG (gold vault) or AXAU → KAG (silver vault). Coverage ratio improves. No new token is issued.

**What this path does NOT do:** It does not create a standalone AXAG token (Option A deferred). It does not change the ERC-3643 token standard. It does not alter the land sleeve timeline.

---

### Path B — Land Sleeve Activation (Phase 3)

| Dimension | Status | Key Evidence |
| --------- | ------ | ------------ |
| Technical Readiness | HIGH — AXLandVault and LandNAVOracleMultiSig deployed and inactive | Whitepaper §3.1, §4.3; LandNAVOracleMultiSig.sol |
| Governance Readiness | LOW — no Stage 1 scoring filed for land | COMMODITY_EXPANSION_FRAMEWORK.md Phase 3 designation |
| Operational Readiness | LOW — no properties acquired, no NAV submitted, lastNavTimestamp = 0 | Whitepaper §4.3 |
| Blocking gates | Land acquisition pipeline, property valuation, signers configured on LandNAVOracleMultiSig, first NAV proposal submitted and confirmed | — |
| Architecture change | None — contracts are deployed and registered (disabled) | CommodityRegistry: LAND component registered, enabled = false |
| Scope | Illiquid, 40% haircut, 10% max weight; participates in backing NAV only | AXLandVault, LandNAVOracleMultiSig |

**What this path evolves AXAU into:** A three-sleeve instrument — gold (liquid) + silver (liquid, post-Path A) + land (illiquid, 10% cap). Backing NAV has a real-estate component. Land never becomes a redemption asset under the current MintRedeemController (BC-04). Monthly appraisal cadence; 35-day staleness window in AXLandVault.

**LandNAVOracleMultiSig activation requirements (from code):**
- `threshold` must be set ≥ 2 (constructor enforces this)
- At least `threshold` signers must be added with `SIGNER_ROLE`
- `CONSUMER_ROLE` must be granted to AXLandVault so it can call `markConsumed()`
- First NAV proposal must be created, confirmed by ≥ threshold signers, within 7-day validity window
- `COOLDOWN_PERIOD = 20 days` between consumed NAV updates (minimum ~monthly attestation)
- `MAX_CHANGE_BPS = 3000` — single update cannot move land NAV more than 30% from prior value

---

### Path C — Additional Precious Metals (e.g., standalone Platinum, Palladium)

| Dimension | Status | Key Evidence |
| --------- | ------ | ------------ |
| Technical Readiness | MEDIUM — no vault or oracle drafts exist; pattern is replicable from AXGoldVault | COMMODITY_EXPANSION_FRAMEWORK.md Category A |
| Governance Readiness | LOW — not entered Stage 1 of CEF | COMMODITY_EXPANSION_FRAMEWORK.md |
| Operational Readiness | LOW — no tokenized platinum/palladium on Arbitrum One with verified liquidity | — |
| Architecture change | None to core contracts; new vault + oracle per metal | CommodityRegistry addComponent pattern |

**What this path evolves AXAU into:** A four-sleeve (or more) precious metals basket. Each metal follows the same vault-oracle pattern. CEF Category A scores this as most viable after gold and silver.

---

### Path D — Energy (WTI Crude, LNG)

| Dimension | Status | Key Evidence |
| --------- | ------ | ------------ |
| Technical Readiness | LOW — no tokenized energy instrument on Arbitrum with acceptable custody | Whitepaper §4.4: "Synthetic or derivatives-based commodity exposure does not qualify" |
| Governance Readiness | LOW — DEFERRED explicitly | COMMODITY_EXPANSION_FRAMEWORK.md Category B |
| Operational Readiness | LOW | — |

**What this path evolves AXAU into:** Energy-backed reserve layer. Explicitly deferred in the Commodity Expansion Framework. No timeline committed.

**Critical constraint:** The whitepaper explicitly bars synthetic or derivative-based commodity exposure. Energy cannot enter AXAU via a futures contract or commodity index — only via physically-backed tokenized instrument. No such instrument exists on Arbitrum One with institutional custody as of the evidence base.

---

### Path E — Agriculture and Industrial Metals

| Dimension | Status | Key Evidence |
| --------- | ------ | ------------ |
| Technical Readiness | LOW | COMMODITY_EXPANSION_FRAMEWORK.md Categories C, D |
| Governance Readiness | LOW — DEFERRED explicitly | — |
| Operational Readiness | LOW | — |

**Boundary:** Both categories deferred. No timeline. Infrastructure does not yet exist.

---

### Path F — Standalone AXAG Token (Option A — Deferred)

| Dimension | Status | Key Evidence |
| --------- | ------ | ------------ |
| Technical Readiness | MEDIUM — AXAGTokenLite3643.sol exists in drafts | contracts/axau/drafts/AXAGTokenLite3643.sol |
| Governance Readiness | DEFERRED — Option B (silver sleeve) chosen for current phase | AXAG_INTERNAL_AUDIT_REPORT.md §5 |
| Operational Readiness | LOW — requires separate custody path for standalone silver token | — |

**What this evolves AXAU into:** Nothing. A standalone AXAG token is not a change to AXAU — it is a separate instrument. It would be a second reserve instrument alongside AXAU rather than an evolution of AXAU. Option A is deferred to a future governance decision after Option B (silver sleeve) is live and operational.

---

## 5. Silver Sleeve — Gate Status as of 2026-05-02

### Closed Gates (evidence filed)

| Gate ID | Description | Evidence |
| ------- | ----------- | -------- |
| G-02 | Internal regulatory interpretation memo accepted | AXAG_REGULATORY_INTERPRETATION_MEMO.md |
| G-05 | Internal smart contract audit complete | AXAG_INTERNAL_AUDIT_REPORT.md (AXAG-AUDIT-001) |
| O-01 | Chainlink XAG/USD Arbitrum address confirmed | 0xC56765f04B248394CF1619D20dB8082Edbfa75b1 |
| O-02 | Oracle heartbeat documented (86400s) | Evidence Tracker §3 |
| O-03 | Heartbeat, deviation (0.5%), stale policy documented | XagPerGramOracle.sol NatSpec |
| O-04 | Oracle failure-mode policy documented | Evidence Tracker §3 |
| REG-01 | Legal interpretation memo filed | AXAG_REGULATORY_INTERPRETATION_MEMO.md |
| REG-02 | Scope covers commodity, securities, money-transmission | Memo §4.1–§4.5 |
| REG-03 | Disclosure draft reviewed against lib/glossary.ts | Memo §7 |
| REG-04 | Glossary alignment check completed | Evidence Tracker §5 |
| AXM vote | Governance vote WAIVED — silver sleeve is operational, not a protocol change | AXAG-AUDIT-001 §5 |

### Open Gates (blocking deployment)

| Gate ID | Description | Blocker | Tracker Ref |
| ------- | ----------- | ------- | ----------- |
| G-01 | Gnosis Safe quorum for addComponent("XAG", ...) | Pending Safe execution | Evidence Tracker §6 P-03 |
| G-03 | KAG bridged from Ethereum to Arbitrum One | Operational action — bridge.arbitrum.io | DEPLOYMENT_PLAYBOOK.md Step 0 |
| G-04a | Arb-mapped KAG ERC-20 address recorded (post-bridge) | Depends on G-03 | Playbook Step 0 |
| G-04b | KAG decimals() = 18 verified; not fee-on-transfer | Depends on G-03 | Audit F-05 |
| G-06 | Reserve KAG staged in deployer wallet | Treasury acquisition action | Playbook checklist |
| G-07 | All disclosure surfaces staged for atomic flip (6 items) | Depends on all above | Playbook Step 7 |
| C-02 | Custody RFP responses tabulated | Awaiting external responses (6 candidates) | Evidence Tracker §1 |
| C-03–C-07 | Custodian selected, term sheet, vault location, attestation cadence, chain-of-custody | Blocked on C-02 | Evidence Tracker §1 |
| L-01–L-05 | AMM bootstrap, market maker, redemption SLA, fallback path, liquidity projections | In progress / assigned | Evidence Tracker §2 |
| R-01–R-03 | LBMA spec, insurance/chain-of-custody, volatility floor analysis | Blocked on custody or independent | Evidence Tracker §4 |
| P-01–P-05 | Stage 2 packet completion, re-scoring, Stage 3 scheduling | Blocked on all sections | Evidence Tracker §6 |

### Critical Pre-Deployment Governance Call

Before silver component registration (`CommodityRegistry.addComponent("XAG", ...)`), the following governor call must execute first:

```
NAVEngine.setOracleStaleSecs(97200)
```

**Why:** NAVEngine's default `oracleStaleSecs = 3600` (1 hour). Chainlink XAG/USD heartbeat is 86,400 seconds (24 hours). Under normal conditions, the feed updates at most once per day. After 1 hour post-update, NAVEngine would revert on every `totalBackingUsdWad()` call, blocking all AXAU mint/redeem globally. Setting to 97,200 (24h + 1h buffer) matches MintRedeemController's existing `oracleStaleness = 97,200`.

**Side effect on XAU:** This change widens the gold oracle staleness guard from 1h to 25h. Chainlink XAU/USD has a 1-hour heartbeat and continuous 0.5% deviation updates. A 25-hour stale guard remains conservative for a treasury reserve instrument. (See AXAG-AUDIT-001 F-01 and F-08.)

---

## 6. Land Sleeve — Activation Boundary

### What Exists

Both `AXLandVault` (0x66Aadce6...449cf) and `LandNAVOracleMultiSig` (0x8FF5D66d...A0Fc) are deployed on Arbitrum One. The LAND component is registered in `CommodityRegistry` with `enabled = false`. `AXLandVault.lastNavTimestamp = 0`. `AXLandVault.totalValueUsdWad = 0`.

### What Is Required to Activate

1. **Signer configuration:** Governor must call `LandNAVOracleMultiSig.addSigner(address)` for each authorized appraiser and `setThreshold(uint256)` to set minimum confirmation count (≥ 2).

2. **Consumer role:** Governor must call `LandNAVOracleMultiSig.grantRole(CONSUMER_ROLE, address(AXLandVault))` so AXLandVault can call `markConsumed()` after applying a NAV update.

3. **First NAV proposal:** An authorized signer calls `propose(navUsdWad)`. Requires `navUsdWad > 0`; proposal expires after 7 days; no change-cap on first proposal (lastConsumedNavWad = 0 so the 30% guard is skipped).

4. **Threshold confirmations:** Each additional signer calls `confirm(nonce)` until `confirmations >= threshold`.

5. **NAV consumption by AXLandVault:** AXLandVault calls `getApprovedNAV()` (view) then `markConsumed()` to record the NAV. This updates `lastConsumedAt` and `lastConsumedNavWad` on the oracle.

6. **Component enabled:** Governor calls `CommodityRegistry.setEnabled(keccak256("LAND"), true)`. After this, NAVEngine includes the land component in `totalBackingUsdWad()`.

7. **35-day staleness window:** AXLandVault enforces a 35-day NAV staleness window (`lastNavTimestamp + 35 days`). After 35 days without a new confirmed NAV, the vault reports its component as stale and NAVEngine excludes it.

8. **20-day cooldown:** `LandNAVOracleMultiSig.COOLDOWN_PERIOD = 20 days` — new proposals cannot be submitted until 20 days after the last consumed NAV. Effective update cadence: at minimum every 20 days, at maximum every 35 days before staleness.

### What Land Activation Cannot Do

- Land cannot be a mint/redeem asset (MintRedeemController rejects `isLiquid == false`).
- Land NAV cannot move more than 30% from prior confirmed value in a single update (`MAX_CHANGE_BPS = 3000`).
- Land oracle cannot produce real-time prices — it is an attestation-based multi-party system.
- The 10% basket cap (`maxWeightBps = 1000`) is enforced at NAVEngine computation time; the land sleeve cannot dominate the basket.

---

## 7. Outer Boundary — What AXAU Cannot Become

These are structural limits that cannot be crossed without a fundamental architecture change — new token contract, new controller, or both.

### 7.1 AXAU Cannot Become a Stablecoin

**Evidence:** Whitepaper §2.2: "AXAU is not a stablecoin. It does not maintain a USD peg. Its value denominated in fiat currencies will fluctuate with the market value of its underlying commodity reserves." NAVEngine's `TARGET_PRICE_WAD = 1e18` is a unit-of-account denomination (each AXAU token represents one unit of composite reserve value), not a peg enforcement mechanism. There is no peg stability module, no redemption-at-parity logic, and no algorithmic supply adjustment.

**What would be required:** A fundamentally different instrument — a PSM (Peg Stability Module) contract, an algorithmic supply adjustment mechanism, or a fiat-redemption controller. None of these exist in the codebase.

### 7.2 AXAU Cannot Generate Yield Without Explicit Governance Approval and New Implementation

**Evidence:** Whitepaper §2.2: "AXAU does not generate yield by default. Any yield-bearing mechanics require explicit governance approval and separate implementation." No yield distribution contract exists. The MintRedeemController handles only mint/redeem; it has no revenue-sharing or rebasing logic.

**What would be required:** A new yield distribution contract, a rebase mechanism or ERC-4626 wrapper, a revenue source (e.g., lending market fees directed to AXAU holders), and a governance proposal approving the yield mechanics. None of these exist.

### 7.3 AXAU Cannot Hold Synthetic or Derivatives-Based Commodity Exposure

**Evidence:** Whitepaper §4.4: "Synthetic or derivatives-based commodity exposure does not qualify under AXAU admission criteria." CEF Category B (energy) is deferred precisely because no physical-delivery tokenized energy instrument exists on Arbitrum One at the required custody standard.

**What would be required:** A protocol-level amendment to the admission criteria — a new CEF version approved by governance — plus the existence of a physically-backed instrument with acceptable custody.

### 7.4 AXAU Cannot Enable Permissionless Transfer Without Token Redeployment

**Evidence:** ERC-3643 standard, `AXAUTokenLite3643` — identity gate enforced at token level. All transfers require sender and receiver ONCHAINID registration. This cannot be toggled off without redeploying a different token contract.

**Practical implication:** Major DeFi integrations (Uniswap liquidity positions holding AXAU, permissionless lending against AXAU) require either (a) those protocols registering identities or (b) a permissionless wrapper token that holds AXAU and is itself freely transferable. No such wrapper exists in the codebase.

### 7.5 AXAU Cannot Exceed 20 Reserve Components Without NAVEngine Redeployment

**Evidence:** `NAVEngine.MAX_COMPONENTS = 20` — Solidity constant, bytecode-embedded.

**Practical implication:** Not a binding constraint within foreseeable expansion plans (current use: 2 of 20). Noted for completeness.

### 7.6 AXAU Cannot Support Cross-Vault Basket Redemption Without Controller Redesign

**Evidence:** `MintRedeemController.redeemAXAU(bytes32 vaultId, uint256 axauAmount)` — single vault, single asset return. No basket-proration logic exists.

**Practical implication:** As the basket grows, the user experience for redemption requires specifying which sleeve to redeem from. A redeemer who wants proportional exposure to all reserve assets must execute multiple redemptions (one per vault). This is a UX constraint, not a safety issue.

---

## 8. Constraint Catalog

Numbered catalog of all hard architectural constraints identified in this investigation. Each entry identifies the constraint, its source in the codebase, and the minimum action required to remove it.

| ID | Constraint | Source | Removal Requires |
| -- | ---------- | ------ | ---------------- |
| BC-01 | XAU haircutBps must remain 0 with current NAVEngine | NAVEngine.MINT_PREMIUM_BPS = 500 (constant) | New NAVEngine with MINT_PREMIUM_BPS ≥ 1300 |
| BC-02 | MintRedeemController oracle staleness immutable at 97,200s | Constructor-set, no setter | MintRedeemController redeployment |
| BC-03 | MAX_COMPONENTS hard cap at 20 | NAVEngine constant | New NAVEngine |
| BC-04 | Land vault not accessible via spot mint/redeem | isLiquid = false; MintRedeemController enforces | New controller with illiquid redemption logic |
| BC-05 | ERC-3643 identity gate on all AXAU transfers | AXAUTokenLite3643 token standard | Token redeployment with different standard |
| BC-06 | Single asset returned per redemption; no basket proration | MintRedeemController single-vault routing | New cross-vault settlement controller |
| BC-07 | MINT_PREMIUM_BPS immutable at 5% | NAVEngine constant | New NAVEngine |
| BC-08 | KAG bridge withdrawal delay 7–8 days | Arbitrum challenge period | KMS Labs native Arbitrum KAG deployment |
| BC-09 | Silver redemption step 2 (KAG → physical) outside Axiom control | KMS Labs platform dependency | N/A (third-party boundary; disclose only) |
| BC-10 | Synthetics and derivatives prohibited as reserve components | Whitepaper §4.4; CEF categorical exclusion | Governance amendment to CEF admission criteria |
| BC-11 | Yield generation requires separate implementation and governance vote | Whitepaper §2.2 | New yield contract + governance approval |
| BC-12 | Land NAV cannot move >30% per attestation | LandNAVOracleMultiSig.MAX_CHANGE_BPS = 3000 | New oracle deployment with different constant |
| BC-13 | Land NAV must be attested by ≥ 2 signers (minimum threshold) | LandNAVOracleMultiSig constructor requires threshold ≥ 2 | N/A (safety invariant; not a constraint to remove) |
| BC-14 | Land component excluded from NAV if no attestation within 35 days | AXLandVault staleness window | Governance update to AXLandVault |
| BC-15 | New commodity admission requires 4-stage CEF workflow | COMMODITY_EXPANSION_FRAMEWORK.md | Governance amendment to CEF |

---

## 9. Architecture Boundary Map

```
══════════════════════════════════════════════════════════════════════════
  AXAU RESERVE ARCHITECTURE — EVOLUTION BOUNDARY MAP
  As of 2026-05-02 | Arbitrum One (Chain ID: 42161)
══════════════════════════════════════════════════════════════════════════

  LIVE (Phase 1)
  ┌─────────────────────────────────────────────────────────────────┐
  │  AXAU Token (ERC-3643)                                          │
  │  MintRedeemController ──────── NAVEngine                        │
  │           │                        │                            │
  │           ▼                        ▼                            │
  │     AXGoldVault              CommodityRegistry                  │
  │     (holds PAXG)             XAU: enabled ✓                     │
  │     Chainlink XAU/USD        LAND: enabled ✗                    │
  │     haircutBps = 0 (BC-01)                                      │
  └─────────────────────────────────────────────────────────────────┘

  DEPLOYMENT-READY — PENDING GATES (Path A — Silver Sleeve)
  ┌─────────────────────────────────────────────────────────────────┐
  │  AXSilverVault (DRAFT) ── holds bridged KAG (ERC-20)            │
  │  XagPerGramOracle (DRAFT) ── wraps Chainlink XAG/USD            │
  │           ↓ gram conversion: price ÷ 31.1035                   │
  │  CommodityRegistry.addComponent("XAG", ...)                     │
  │  haircutBps = 800 (8%), maxWeightBps = 3000 (30%), isLiquid ✓  │
  │  PREREQUISITE: NAVEngine.setOracleStaleSecs(97200) [BC-02 fix]  │
  │  GATE: G-01 Gnosis Safe quorum                                  │
  │  GATE: G-03 KAG bridge execution                                │
  │  GATE: G-04a/b KAG address + decimals verified                  │
  │  GATE: G-06 reserve KAG staged                                  │
  │  GATE: G-07 disclosure flip (6 surfaces)                        │
  │  KAG withdrawal to L1: 7–8 day delay (BC-08)                   │
  │  Redemption step 2 (KAG→silver): KMS Labs only (BC-09)          │
  └─────────────────────────────────────────────────────────────────┘

  DEPLOYED — INACTIVE (Path B — Land Sleeve, Phase 3)
  ┌─────────────────────────────────────────────────────────────────┐
  │  AXLandVault (0x66Aadce6...449cf) — lastNavTimestamp = 0        │
  │  LandNAVOracleMultiSig (0x8FF5D66d...A0Fc)                      │
  │  Requires: signer config, CONSUMER_ROLE grant, first NAV        │
  │  Haircut: 40%, Max weight: 10% of basket                        │
  │  NAV cadence: monthly attestation (20-day cooldown)             │
  │  Staleness window: 35 days                                      │
  │  NOT accessible via spot mint/redeem (BC-04)                    │
  │  Max single NAV move: 30% (BC-12)                               │
  └─────────────────────────────────────────────────────────────────┘

  FEASIBLE — REQUIRES NEW VAULTS + ORACLE (Paths C/D/E)
  ┌─────────────────────────────────────────────────────────────────┐
  │  Additional precious metals (Pt, Pd): Category A — viable        │
  │  Energy (WTI, LNG): Category B — DEFERRED, no infra (BC-10)    │
  │  Agriculture: Category C — DEFERRED                             │
  │  Industrial metals: Category D — DEFERRED                       │
  │  Standalone AXAG token: Option A — DEFERRED (post Option B)     │
  │  Each requires 4-stage CEF workflow (BC-15)                     │
  │  Physical backing required; no synthetics (BC-10)               │
  └─────────────────────────────────────────────────────────────────┘

  OUTSIDE EVOLUTION BOUNDARY (requires architectural replacement)
  ┌─────────────────────────────────────────────────────────────────┐
  │  Stablecoin / peg mechanism                                     │
  │  Native yield / rebase                                          │
  │  Permissionless transfer (no ERC-3643 identity gate)            │
  │  Basket redemption (pro-rata all sleeves)                       │
  │  Synthetic / derivatives-backed reserve                         │
  │  >20 components without NAVEngine redeployment                  │
  └─────────────────────────────────────────────────────────────────┘

  HARD CONSTANTS (immutable without redeployment)
  ┌─────────────────────────────────────────────────────────────────┐
  │  NAVEngine.MINT_PREMIUM_BPS        = 500  (5%) [BC-07]          │
  │  NAVEngine.MIN_COVERAGE_BPS        = 10500 (105%)               │
  │  NAVEngine.MAX_COMPONENTS          = 20   [BC-03]               │
  │  MintRedeemController.oracleStaleness = 97200s [BC-02]         │
  │  LandNAVOracleMultiSig.MAX_CHANGE_BPS = 3000 (30%) [BC-12]     │
  │  LandNAVOracleMultiSig.PROPOSAL_VALIDITY = 7 days              │
  │  LandNAVOracleMultiSig.COOLDOWN_PERIOD = 20 days               │
  │  XagPerGramOracle.TROY_OZ_PER_GRAM_SCALED = 31_103_500         │
  └─────────────────────────────────────────────────────────────────┘
```

---

## 10. Evidence Index

All findings in this report are derived exclusively from the following repository artifacts. No external sources are asserted as factual without codebase confirmation.

| Artifact | Role in this Report |
| -------- | ------------------- |
| `contracts/axau/NAVEngine.sol` | MAX_COMPONENTS, MINT_PREMIUM_BPS, MIN_COVERAGE_BPS, setOracleStaleSecs, component iteration |
| `contracts/axau/MintRedeemController.sol` | oracleStaleness, isLiquid enforcement, fee structure, circuit-breaker |
| `contracts/axau/CommodityRegistry.sol` | Component struct, addComponent, haircutBps, maxWeightBps, isLiquid, enabled, phase |
| `contracts/axau/AXGoldVault.sol` | PAXG holding, goldSnapshot, liquid sleeve pattern |
| `contracts/axau/AXLandVault.sol` | Illiquid sleeve pattern, 35-day staleness, land NAV consumption |
| `contracts/axau/LandNAVOracleMultiSig.sol` | PROPOSAL_VALIDITY, COOLDOWN_PERIOD, MAX_CHANGE_BPS, threshold, signer management |
| `contracts/axau/interfaces/IAXAU.sol` | IVaultSnapshot, IChainlinkOracle, ILandNAVOracle interface definitions |
| `contracts/axau/drafts/AXSilverVault.sol` | Silver sleeve architecture, KAG holding, Option B design |
| `contracts/axau/drafts/XagPerGramOracle.sol` | Gram conversion, TROY_OZ_PER_GRAM_SCALED, sequencer uptime check, Chainlink XAG/USD address |
| `contracts/axau/drafts/DEPLOYMENT_PLAYBOOK.md` | 8-gate pre-deployment checklist, Step 0 bridge, Step 2.5 setOracleStaleSecs, KAG L1 address |
| `contracts/axau/drafts/README.md` | Option A vs. Option B rationale, 7 deployment predicates |
| `documents/axau-whitepaper.md` | Phase 1–4 reserve layer design, NAV formulas, governance framework, deployed addresses |
| `documents/commodities/COMMODITY_EXPANSION_FRAMEWORK.md` | 4-stage CEF workflow, Category A–E classification, admission criteria |
| `documents/commodities/AXAG_INTERNAL_AUDIT_REPORT.md` | 8 audit findings, F-01 blocker (oracleStaleSecs), F-05 (fee-on-transfer), Option B recommendation, AXM vote waiver |
| `documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md` | Gate status (O-01–O-04 CLOSED, REG-01–REG-04 CLOSED, C/L/R/P open), AXM vote waiver |
| `documents/commodities/AXAG_KINESIS_GO_LIVE_PATH.md` | KAG/KMS Labs architecture, two-step redemption, bridge options R-A/B/C, legal distinctions |
| `lib/glossary.ts` | Institutional vocabulary compliance, forbidden phrases, maturity labels |

---

*End of AXAU Evolution Boundary Report*
*Investigation complete. No contracts deployed, no assets changed, no reserves modified.*
*All findings derived from repository evidence only.*
