# Axiom Internal Asset Discovery Report

Document class: Internal Discovery Report  
Status: Complete — evidence-based, repo-truth-first  
Version: 1.0  
Prepared: 2026-05-10  
Scope: All Axiom-issued, protocol-native, or protocol-adjacent assets present in the codebase  
Companion: `documents/assets/INTERNAL_ASSET_TRACKER.md`  
Registry references: `lib/commodities/registry.ts`, `lib/assets/registry.ts`, `lib/tokens.ts`, `shared/contracts.ts`, `src/config/activeContracts.generated.ts`

---

## 1. Methodology

This report was produced by a systematic scan of the repository rather than from
memory or assumption. Sources consulted:

| Source class | Files / directories inspected |
| ------------ | ----------------------------- |
| Token contracts | `contracts/axusd/`, `contracts/axau/`, `contracts/axau/drafts/`, `contracts/lending/`, `contracts/nft/`, `contracts/oracle/` |
| Deployment manifests | `deployments/axau-arbitrum.json`, `src/config/activeContracts.generated.ts`, `shared/contracts.ts` |
| Asset registries | `lib/commodities/registry.ts`, `lib/assets/registry.ts`, `lib/tokens.ts` |
| Commodity frameworks | `lib/commodities/admissions.ts`, `lib/commodities/disclosures.ts`, `lib/commodities/kagService.ts` |
| External asset service | `lib/assets/externalAssetService.ts` |
| Operator pages | `pages/operator/commodities/`, `pages/operator/reserve.tsx`, `pages/operator/index.tsx` |
| API routes | `pages/api/axau/`, `pages/api/assets/`, `pages/api/commodities/` |
| Public pages | `pages/axau.tsx` (referenced in registry), `pages/assets/`, `pages/commodities/kag` |
| Documents | `documents/axau/`, `documents/commodities/`, `documents/assets/`, `documents/axusd-earn-vault-technical-reference.md` |
| Governance config | `lib/config/governance-authority.ts`, `lib/axau/spec.ts` |
| Contract services | `lib/server/v2ContractService.ts` |
| Architecture files | `AXIOM_EXECUTIVE_SUMMARY_AND_WHITEPAPER.md`, `documents/axiom-protocol-whitepaper-v5.0.md` |

All conclusions below are derived from evidence present in the repository.  
No asset status is assumed, inferred, or invented.

---

## 2. Assets Discovered

### 2.1 AXUSD — Axiom USD Stablecoin

**Summary:** Axiom-issued peg-stability stablecoin on Arbitrum One. Live and operational.
Multiple contract generations exist; only the canonical ERC-3643 version is the active
production token.

| Field | Value |
| ----- | ----- |
| Asset name | Axiom USD |
| Symbol | AXUSD |
| Category | AXIOM_ISSUED — Reserve-Grade Stable |
| Issuer | Axiom Protocol |
| Axiom issues | Yes |
| Axiom custodies underlying | No (USDC-backed via PSM; custodied by Circle) |
| Chain | Arbitrum One (chainId 42161) |
| Status | **LIVE** |

**Deployed contracts (canonical):**

| Role | Address | Notes |
| ---- | ------- | ----- |
| Canonical AXUSD token (ERC-3643) | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | Active production token |
| Canonical PSM | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` | 1M ceiling; ERC-3643 identity-gated |
| Euler AXUSD (deprecated) | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | Euler Vault binding only — deprecated |
| Legacy GENIUS AXUSD (deprecated) | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | PSM-paired; superseded |
| GENIUS PSM (legacy) | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` | Legacy PSM, USDC reserves valid |
| Euler PSM (deprecated) | `0x4584888cB411E9cc88e3800BAB73A430D90d3793` | Paired with deprecated Euler AXUSD |
| CanonicalPSM contract source | `contracts/axusd/CanonicalPSM.sol` | 1:1 USDC ↔ AXUSD; ERC-3643 agent |
| Euler V2 AXUSD vault | `0xacdA...` (eAXUSD-6; see activeContracts) | EulerSwap pool supply vault |

**Pricing:** Protocol stablecoin — no external CoinGecko listing. Oracle parity enforced on-chain via `AXUSDPegOracleAdapter` (`contracts/oracle/AXUSDPegOracleAdapter.sol`). USD valuation service: `server/services/oracle/axusdUsdValuation.ts`.

**API routes:** `/api/axau/nav`, `/api/axau/holders`, `/api/axau/bridge-status`, and many others under `pages/api/axau/`.

**Source files (primary):**
- `lib/tokens.ts` — canonical address
- `src/config/activeContracts.generated.ts` — all contract relationships
- `shared/contracts.ts` — AXUSD_STABLECOIN_CONTRACTS, AXUSD_GENIUS_CONTRACTS, AXUSD_INTEGRATION_CONTRACTS, EULER_SWAP
- `contracts/axusd/CanonicalPSM.sol`
- `contracts/oracle/AXUSDPegOracleAdapter.sol`
- `server/services/oracle/axusdUsdValuation.ts`

**What would be required to make it more live:** Already live. Ongoing: governance migration to full multi-sig, ERC-3643 identity registry expansion.

---

### 2.2 AXAU — Axiom Gold Reserve Framework

**Summary:** Axiom-issued multi-component reserve framework on Arbitrum One. The gold
(XAU) module is live. The land (LAND) module contracts are deployed but the component
is disabled. The silver module is in draft/diligence — contracts exist but are not deployed.

| Field | Value |
| ----- | ----- |
| Asset name | Axiom Gold Reserve |
| Symbol | AXAU |
| Category | AXIOM_ISSUED — Reserve-Grade Commodity Basket |
| Issuer | Axiom Protocol |
| Axiom issues | Yes |
| Axiom custodies underlying | No (PAXG held by Paxos/Brink's; land title held by Axiom entity) |
| Chain | Arbitrum One (chainId 42161) |
| Status | **LIVE** (gold module); DEPLOYED_INACTIVE (land module) |

**Deployed contracts:**

| Contract | Address | Status |
| -------- | ------- | ------ |
| AXAUTokenLite3643 | `0xbcCA4D937d427829914498423aE6E04C846dB0Bb` | Live — ERC-3643 AXAU token |
| CommodityRegistry | `0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa` | Live — component registry |
| AXGoldVault | `0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8` | Live — PAXG reserve vault |
| AXLandVault | `0x66Aadce66a359609ec5E18fb3d8927a2363449cf` | Deployed — LAND component disabled |
| LandNAVOracleMultiSig | `0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc` | Deployed — no signers configured |
| NAVEngine | `0x80F8634a43B26a2bd403396A42465F138aeCC519` | Live |
| MintRedeemController | `0x682Ed413767b6275e29fc706391474F2C5Cc1A2A` | Live (v2; v1 at `0x036F...` deprecated) |
| IAXAU interface | `contracts/axau/interfaces/IAXAU.sol` | Interface only |

**Reserve backing (live):** PAXG (`0xfEb4DfC8...28429` on Arbitrum One, per deployment manifest).  
**Oracle:** Chainlink XAU/USD on Arbitrum One (`0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c`).  
**Pricing source:** CoinGecko pax-gold / Chainlink XAU/USD.  
**Coverage floor:** 105% enforced by `MintRedeemController`.

**Source files (primary):**
- `lib/commodities/registry.ts` — COMMODITY_REGISTRY entry
- `deployments/axau-arbitrum.json` — full deployment manifest
- `documents/axau/AXAU_RESERVE_FRAMEWORK_BRIEF.md`
- `documents/axau/AXAU_EVOLUTION_BOUNDARY_REPORT.md`
- `documents/axau-whitepaper.md`
- `lib/axau/spec.ts`
- `contracts/axau/AXAUTokenLite3643.sol`, `AXGoldVault.sol`, `CommodityRegistry.sol`, `NAVEngine.sol`, `MintRedeemController.sol`
- API routes: `pages/api/axau/nav.ts`, `/axau/holders.ts`, `/axau/paxg-quote.ts`, etc.
- Public page: `/axau` (referenced in registry)
- Operator page: `pages/operator/reserve.tsx`, `pages/operator/axau-stabilization.tsx`

---

### 2.3 AXM — Axiom Governance Token

**Summary:** Axiom's on-chain governance and utility token on Arbitrum One. Deployed and
active. Used for governance voting, DEX pool participation, and DePIN node purchase
discounts.

| Field | Value |
| ----- | ----- |
| Asset name | Axiom Governance Token |
| Symbol | AXM |
| Category | AXIOM_ISSUED — Governance/Utility Token |
| Issuer | Axiom Protocol |
| Axiom issues | Yes |
| Axiom custodies underlying | N/A (governance token, no reserve backing) |
| Chain | Arbitrum One (chainId 42161) |
| Status | **LIVE** |

**Deployed contracts:**

| Contract | Address | Notes |
| -------- | ------- | ----- |
| AXM Token (AxiomV2) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | ERC-20 governance token |
| AXM Admin Safe | `0x93696b537d814Aed5875C4490143195983AED365` | Minting authority multisig |
| AXM EVK Vault (eAXM-1) | `0x8e28ffa89d168599156004db4f4d12c2af7c250e` | Supply-only vault for AXM/AXUSD EulerSwap pool |

**Pricing:** No external CoinGecko listing. Price derived from on-chain AXM/AXUSD EulerSwap pool
(`0x981763699D269E129a08E216b1AeC7caa376A8a8`).

**Source files:**
- `lib/tokens.ts` — canonical address
- `shared/contracts.ts` — CORE_CONTRACTS.AXM_TOKEN
- `src/config/activeContracts.generated.ts` — AXM EVK vault, EulerSwap pool
- `lib/config/governance-authority.ts`
- `lib/governance/service.ts`

---

### 2.4 SEED (veAXM) — Vote-Escrowed AXM

**Summary:** Curve-style vote-escrow contract. Users lock AXM for 1–4 years to earn SEED,
which grants governance power, yield, and access to protocol cycles. Previously labeled
"veAXM"; current canonical name is SEED. Contract is deployed and the service layer
is actively integrated.

| Field | Value |
| ----- | ----- |
| Asset name | SEED (Vote-Escrowed AXM) |
| Symbol | SEED / veAXM (legacy alias) |
| Category | AXIOM_ISSUED — Governance/Yield Instrument |
| Issuer | Axiom Protocol |
| Axiom issues | Yes (locked derivative of AXM) |
| Axiom custodies underlying | AXM is locked in the SEED contract |
| Chain | Arbitrum One (chainId 42161) |
| Status | **LIVE** |

**Deployed contracts:**

| Contract | Address | Notes |
| -------- | ------- | ----- |
| SEED contract | `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046` | VE_AXM legacy alias points here |
| SEED Yield Distributor | `0x5867e1a8c77530648edF61975CBB57a8913d159F` | Distributes AXUSD yield to lockers |
| Revenue Router | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` | Routes protocol revenue to SEED holders |

**Source files:**
- `shared/contracts.ts` — V2_SOVEREIGN_BANKING_CONTRACTS.SEED, AXUSD_INTEGRATION_CONTRACTS.SEED_YIELD_DISTRIBUTOR
- `lib/server/v2ContractService.ts` — getSeedStats(), getSeedContract()
- `lib/governance/service.ts`
- `lib/rewards.ts` — veAXM Boost reward

---

### 2.5 AXAG — Axiom Silver Reserve (Not Issued)

**Summary:** AXAG is the placeholder symbol for an Axiom-branded silver wrapper token.
It has **not been issued** and **no contract has been deployed** to any mainnet or testnet.
Draft contracts exist in `contracts/axau/drafts/` for design reference only.
Two architectural paths exist: Path A (silver sleeve inside AXAU — current design target)
and Path B (standalone AXAG token — deferred). Neither is active.

| Field | Value |
| ----- | ----- |
| Asset name | Axiom Silver Reserve (Not Issued) |
| Symbol | AXAG |
| Category | AXIOM_ISSUED (would-be) |
| Issuer | N/A — not live, not issued |
| Axiom issues | No (not issued) |
| Axiom custodies underlying | No |
| Chain | N/A — not deployed |
| Contract address | None |
| Status | **NOT_LIVE_NOT_ISSUED** |

**Draft contracts (not deployed):**

| File | Role | Status |
| ---- | ---- | ------ |
| `contracts/axau/drafts/AXAGTokenLite3643.sol` | Standalone AXAG token (Path B only) | Draft — not deployed |
| `contracts/axau/drafts/AXSilverVault.sol` | KAG reserve vault (Path A and B) | Draft — not deployed |
| `contracts/axau/drafts/XagPerGramOracle.sol` | Gram-price oracle wrapper | Draft — not deployed |
| `contracts/axau/drafts/DEPLOYMENT_PLAYBOOK.md` | Step-by-step deploy guide | Documentation only |

**What would be required to make it live (Path A — silver sleeve inside AXAU):**
See `documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md` for full gate list.
Key gates:
- G-01 Gnosis Safe quorum for `addComponent("XAG", ...)`
- G-03 KAG bridged from Ethereum mainnet to Arbitrum One
- G-04a/b Bridged KAG address confirmed; decimals = 18 verified
- G-06 Reserve KAG staged in deployer wallet
- G-07 Atomic disclosure flip across six surfaces
- C-02–C-07 Custody RFP, custodian selection, term sheet, attestation
- L-01–L-05 AMM bootstrap, market maker engagement
- R-01–R-03 LBMA spec, insurance documentation
- External audit of `AXSilverVault` and `XagPerGramOracle`

**Source files:**
- `lib/commodities/registry.ts` — COMMODITY_REGISTRY entry (NOT_LIVE_NOT_ISSUED)
- `lib/assets/registry.ts` — EXTERNAL_ASSETS entry (OUT_OF_SCOPE, rejectionReason recorded)
- `contracts/axau/drafts/` — all draft contracts
- `documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md`
- `documents/commodities/AXAG_STAGE_2_DILIGENCE_PACKET.md`
- `documents/commodities/AXAG_INTERNAL_AUDIT_REPORT.md`
- `documents/commodities/AXAG_REGULATORY_INTERPRETATION_MEMO.md`
- `documents/commodities/AXAG_KINESIS_GO_LIVE_PATH.md`

---

### 2.6 AXAU / LAND Module — Land Reserve Sleeve

**Summary:** The LAND reserve component of the AXAU framework. Infrastructure is
deployed on Arbitrum One but the component is disabled (`enabled = false` in
`CommodityRegistry`). No NAV has ever been submitted. No LAND-backed AXAU has
been minted.

| Field | Value |
| ----- | ----- |
| Asset name | AXAU Land Sleeve (LAND component) |
| Symbol | Represented by AXAU (no separate token) |
| Category | AXIOM_ISSUED — Reserve Module (Illiquid) |
| Issuer | Axiom Protocol |
| Axiom issues | Indirectly (as part of AXAU) |
| Axiom custodies underlying | Yes (titled property) |
| Chain | Arbitrum One |
| Status | **DEPLOYED_INACTIVE** |

**Deployed contracts:**

| Contract | Address | Status |
| -------- | ------- | ------ |
| AXLandVault | `0x66Aadce66a359609ec5E18fb3d8927a2363449cf` | Deployed — not active |
| LandNAVOracleMultiSig | `0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc` | Deployed — no signers |

**LAND component parameters (in CommodityRegistry):**
- `enabled = false`
- `haircutBps = 4000` (40%)
- `maxWeightBps = 1000` (10% max of AXAU basket)
- `isLiquid = false`
- `lastNavTimestamp = 0`, `totalValueUsdWad = 0`

**What would be required to activate:**
- Authorized appraiser signers on `LandNAVOracleMultiSig` (threshold ≥ 2)
- CONSUMER_ROLE granted to AXLandVault on oracle
- First NAV proposal created and confirmed by ≥ threshold signers within 7-day window
- AXLandVault consumes the first NAV via `markConsumed()`
- Governor calls `CommodityRegistry.setEnabled(keccak256("LAND"), true)`
- Operational pipeline: titled property acquired, appraisal cadence established
- Stage 1 CEF scoring for land filed (not yet on file)

**Source files:**
- `deployments/axau-arbitrum.json` — LAND component IDs and addresses
- `documents/axau/AXAU_RESERVE_FRAMEWORK_BRIEF.md` — Section 3.2
- `contracts/axau/AXLandVault.sol`, `LandNAVOracleMultiSig.sol`

---

### 2.7 NFT Suite — Axiom Participation Badges and Land Receipts

**Summary:** Three NFT contract types exist in the codebase, covering participation
badges (ERC-1155), founder badges (ERC-721), and land option receipts (ERC-1155).
The contracts are compile-ready; their mainnet deployment status is not confirmed
in the canonical shared/contracts.ts — they appear in scripts and a deploy script
exists but deployed addresses are not in the canonical registry.

| Asset | Contract | Standard | Status |
| ----- | -------- | -------- | ------ |
| AxiomParticipation (Protocol badges) | `contracts/nft/AxiomParticipation.sol` | ERC-1155 | **UNKNOWN_NEEDS_REVIEW** |
| AxiomFounderBadge | `contracts/nft/AxiomFounderBadge.sol` | ERC-721 | **UNKNOWN_NEEDS_REVIEW** |
| AxiomLandReceipt | `contracts/nft/AxiomLandReceipt.sol` | ERC-1155 | **UNKNOWN_NEEDS_REVIEW** |
| Loan Receipt NFT (Fix & Flip) | N/A (shared/contracts.ts) | ERC-721 | `0x6C4181A15EAC950A2504aC63ebE7F5A0999265e9` — DEPLOYED |
| DSCR Loan Receipt NFT | N/A (shared/contracts.ts) | ERC-721 | `0x66DB145A7ac0de369da88098E8F85467cFaD7674` — DEPLOYED |
| Fixed Loan NFT | activeContracts.generated.ts | ERC-721 | `0x511A0cD642532585dc87e41C84f7f499a9755511` — DEPLOYED |

The Axiom badge NFTs (Participation, Founder, Land) do not have addresses in the
canonical `shared/contracts.ts`. A deploy script (`scripts/nft/deploy-nft.ts`) exists;
deployment output path is `scripts/nft/deployment-output.json` (not committed or not
found in scan). These should be investigated to determine whether they were deployed.

**Source files:**
- `contracts/nft/AxiomParticipation.sol`, `AxiomFounderBadge.sol`, `AxiomLandReceipt.sol`
- `scripts/nft/deploy-nft.ts`
- `lib/nft/traitEngine.ts`
- `shared/contracts.ts` — REALESTATE_LENDING_CONTRACTS (loan receipt NFTs)
- `src/config/activeContracts.generated.ts` — fixedLoanNFT, FIXED_LOAN_NFT_ADDRESS

---

### 2.8 Sovereign Banking Token Infrastructure

**Summary:** Additional protocol-level infrastructure contracts deployed as part of
the V2 Sovereign Banking system. These are not financial assets in the traditional
sense but are protocol-native instruments that carry value or entitlement.

| Instrument | Address | Status | Notes |
| ---------- | ------- | ------ | ----- |
| AxiomScoreSBT (Credit Score) | `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008` | **LIVE** | ERC-5192 soulbound; 300-850 score |
| SusuInsuranceFund | `0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F` | **LIVE** | Default protection; 5% of node rewards |
| AxiomFeeBurner | `0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94` | **LIVE** | 0.5% fee switch; buyback/burn |
| LandOptionRegistry (ERC-1155) | `0xCE0Df38260E626BA45628C4576254276B8C62A0D` | **LIVE** | Tokenized land acquisition options |

**Source files:**
- `shared/contracts.ts` — V2_SOVEREIGN_BANKING_CONTRACTS, LAND_ACQUISITION_CONTRACTS

---

### 2.9 KAG — Kinesis Silver (External Supported)

*Included for completeness as the first external commodity asset supported by Axiom.*

| Field | Value |
| ----- | ----- |
| Asset name | Kinesis Silver |
| Symbol | KAG |
| Category | DIGITAL_COMMODITY (external) |
| Issuer | KMS Labs AG (Kinesis ecosystem) |
| Axiom issues | No |
| Axiom custodies | No |
| Chain | Ethereum mainnet |
| Contract | `0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e` |
| Status | **LIVE** (EXTERNAL_SUPPORTED, read-only) |

**Source files:**
- `lib/commodities/registry.ts`, `lib/commodities/kagService.ts`
- `lib/assets/registry.ts`
- `pages/api/commodities/kag/`, `pages/commodities/kag`

---

## 3. Registry Coverage Assessment

### 3.1 Current registries and what they cover

| Registry | File | Covers | Gaps |
| -------- | ---- | ------ | ---- |
| Commodity Registry | `lib/commodities/registry.ts` | AXAU (gold, live), KAG (external), AXAG (not issued) | Missing: AXM, SEED, AXAU land module, NFTs |
| Digital Assets Registry | `lib/assets/registry.ts` | External assets only: KAG, PAXG, KAU, USDC, WBTC, cbETH, XAUT, DAI, USDT, PYUSD | No internal assets — by design |
| Canonical Tokens | `lib/tokens.ts` | AXUSD, AXM, USDC | Minimal; addresses only |
| Active Contracts | `src/config/activeContracts.generated.ts` | All AXUSD contract generations, EulerSwap, AXM vault | No classification layer |
| Shared Contracts | `shared/contracts.ts` | ~80 deployed contracts across all modules | Classification by section comment, not typed enum |

### 3.2 Structure recommendation

The existing registries serve distinct purposes and should not be merged. The recommended
structure is a **thin mapping layer** — a new `lib/assets/internalRegistry.ts` that:

- Imports and re-exports from `lib/commodities/registry.ts` (Axiom-issued commodities)
- Adds internal financial tokens not in the commodity registry (AXM, SEED)
- Cross-links to contract addresses in `shared/contracts.ts` and `src/config/activeContracts.generated.ts`
- Does NOT replace or modify any existing registry
- Adds a typed `InternalAssetStatus` enum aligned with the classification used in this report

This is implemented as the companion file: `lib/assets/internalRegistry.ts` (see task output).

---

## 4. Source Truth vs. Memory Conflicts

The following points were verified against repo truth and confirmed correct:

| Truth statement | Verified in |
| --------------- | ----------- |
| AXUSD exists as Axiom's stable asset layer | `lib/tokens.ts`, `src/config/activeContracts.generated.ts` |
| AXAU exists as the reserve framework with gold as the live module | `lib/commodities/registry.ts`, `deployments/axau-arbitrum.json` |
| KAG is external supported silver | `lib/commodities/registry.ts` (EXTERNAL_SUPPORTED), `lib/assets/registry.ts` |
| AXAG is NOT_LIVE_NOT_ISSUED | `lib/commodities/registry.ts` (NOT_LIVE_NOT_ISSUED), `lib/assets/registry.ts` (OUT_OF_SCOPE), `contracts/axau/drafts/README.md` |

No memory conflicts found.

---

## 5. Priority Recommendation

### Starting set — treat as active

| Asset | Symbol | Rationale |
| ----- | ------ | --------- |
| Axiom USD | AXUSD | Core stable layer; live; canonical ERC-3643 token in production |
| Axiom Gold Reserve | AXAU | Live gold module; operator pages, API, and disclosure active |
| Axiom Governance Token | AXM | Live; DEX pool active; fee discounts wired |
| SEED / veAXM | SEED | Live; yield distributor active; governance integration wired |
| Kinesis Silver (external) | KAG | Live external support; first read-only commodity in production |

### Stay paused — do not promote

| Asset | Symbol | Rationale |
| ----- | ------ | --------- |
| AXAU Land Sleeve | LAND | Infrastructure deployed; all activation gates open; needs appraiser signers and titled property |
| AXAG Silver Reserve | AXAG | Not live, not issued — preserve this status absolutely |

### Investigate next

| Asset | Symbol | Action |
| ----- | ------ | ------ |
| Axiom NFT Suite (badges) | n/a | Determine whether AxiomParticipation, AxiomFounderBadge, AxiomLandReceipt are deployed |
| AXAU Silver Sleeve (Path A) | XAG | Track remaining gates in AXAG_STAGE_2_EVIDENCE_TRACKER.md |

### Do not deprecate yet (monitor)

| Asset | Symbol | Rationale |
| ----- | ------ | --------- |
| Legacy GENIUS AXUSD | 0x7358... | PSM still valid for USDC reserves; do not remove from config |
| Euler AXUSD | 0xA790... | Euler Vault asset() binding; withdraw-only; keep address in config |
| MintRedeemController v1 | 0x036F... | Superseded by v2; keep in deployment manifest for audit trail |

---

## 6. Operator Page

An internal operator page has been added at `/operator/assets/internal`.

- **Gated by:** `requireOperatorCookie` (same auth as all other operator pages)
- **Read-only:** No DB writes, no contract writes, no banking rails
- **Content:** Lists all internal assets, status badges, source-of-truth references
- **Implementation:** `pages/operator/assets/internal.tsx`

---

## 7. Validation

| Check | Result |
| ----- | ------ |
| No public false exposure | ✓ — internal page is operator-gated; no new public page |
| No write paths introduced | ✓ — all new files are read-only (documents + display page) |
| No banking dependencies | ✓ — no capinfra write paths, no Increase/Plaid/Circle calls |
| Existing commodity registry intact | ✓ — `lib/commodities/registry.ts` not modified |
| Existing assets registry intact | ✓ — `lib/assets/registry.ts` not modified |
| AXAG status unchanged | ✓ — NOT_LIVE_NOT_ISSUED in all registries |
| AXUSD truth unchanged | ✓ — canonical address and active status preserved |
| AXAU truth unchanged | ✓ — LIVE with gold module; land sleeve DEPLOYED_INACTIVE |

---

*End of Internal Asset Discovery Report v1.0*
