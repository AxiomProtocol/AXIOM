# AXAG Kinesis Go-Live Path — Feasibility and Architecture

Document class: Feasibility and Architecture Assessment
Framework: Commodity Expansion Framework v1.0.0
Candidate: Axiom Silver (AXAG) — KAG-backed path
Stage: 2 — Technical Diligence (Research and Planning Phase)
Version: 1.0
Prepared: 2026-05-01
Status: RESEARCH AND PLANNING ONLY — no contracts deployed, no token launched

---

## AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT.

This document is a feasibility and architecture assessment. It does not authorize, initiate, or imply the deployment of any AXAG instrument, automated control layer, token, liquidity pool, or banking integration. AXAG has not been minted. AXAG has not been listed. No KAG has been acquired or held by any Axiom Protocol automated control layer. This document is research and planning only. Verdict definitions are at Section 11.

---

## Table of Contents

1. [Kinesis / KAG Overview](#1-kinesis--kag-overview)
2. [KAG-Backed AXAG Model](#2-kag-backed-axag-model)
3. [Legal Distinction: KAG-Backed vs. Direct Silver-Backed](#3-legal-distinction-kag-backed-vs-direct-silver-backed)
4. [Reserve Architecture](#4-reserve-architecture)
5. [Smart Contract Architecture](#5-smart-contract-architecture)
6. [Mint / Redeem Flow](#6-mint--redeem-flow)
7. [Disclosure Language](#7-disclosure-language)
8. [Risk Scoring Impact](#8-risk-scoring-impact)
9. [Architecture Options](#9-architecture-options)
10. [Launch Blockers](#10-launch-blockers)
11. [No-Go Conditions](#11-no-go-conditions)
12. [Recommended Output](#12-recommended-output)

---

## 1. Kinesis / KAG Overview

### 1.1 What is Kinesis Money

Kinesis Money is a digital asset monetary system operated by KMS Labs AG, a company registered in Liechtenstein. KMS Labs is authorized under the Liechtenstein Blockchain Act (Token and Trustworthy Technology Service Providers Act — TVTG), which provides a regulated legal framework for tokenized assets and token issuers. KMS Labs is not regulated by the New York Department of Financial Services (NYDFS), the U.S. OCC, or any U.S. prudential regulator. Its regulatory standing is that of a European token issuer under Liechtenstein law.

Kinesis operates two monetary metals tokens:
- **KAU** — Kinesis Gold: 1 KAU = 1 gram of LBMA Good Delivery fine gold (999.9)
- **KAG** — Kinesis Silver: 1 KAG = 1 gram of LBMA Good Delivery fine silver (999)

Both are backed by physical metals held in LBMA-accredited vaults.

### 1.2 KAG — Kinesis Silver token

**Reserve asset:** Physical LBMA Good Delivery fine silver, 999 fineness (not troy ounces — grams). This is a material difference from the PAXG analogy: PAXG = 1 troy ounce of gold (31.1 grams); KAG = 1 gram of silver. Pricing must account for this unit difference.

**Unit conversion (informational, for architecture planning):**
- 1 troy ounce = 31.1035 grams
- At XAG = $32.00 / troy oz → 1 KAG ≈ $1.03 at launch reference
- Minimum deposit and redemption terms denominated in grams

**ERC-20 on Ethereum mainnet:** KAG has a published ERC-20 token contract on Ethereum mainnet. This contract enables KAG to be held by externally owned accounts (EOAs) and smart contracts on Ethereum.

**CRITICAL OPEN ITEM — Contract address:** The official KAG ERC-20 contract address on Ethereum mainnet must be confirmed from KMS Labs developer documentation or the official Kinesis developer portal. This document does not assert a specific contract address. The address must be verified against the KMS Labs canonical source before any architectural integration begins. Blocker registered as KIN-01.

**Arbitrum One status:** Whether an official KAG ERC-20 deployment exists on Arbitrum One, or whether a canonical bridge from Ethereum to Arbitrum One is supported by KMS Labs, is unconfirmed. This is a critical architectural question. If no native Arbitrum deployment exists, a bridge path must be evaluated and KMS Labs permission must be confirmed. Blocker registered as KIN-02.

**Supported chains (public information basis):**
- Ethereum mainnet: confirmed (ERC-20)
- Kinesis Blockchain (proprietary): KAG is the native monetary instrument on the Kinesis network
- Arbitrum One: requires verification (KIN-02)
- Other EVM chains: unconfirmed; requires KMS Labs documentation review

### 1.3 KMS Labs issuer role

KMS Labs AG is the issuer of KAG. It holds:
1. Title to the physical silver in LBMA-accredited vaults on behalf of KAG token holders
2. Redemption authority — KAG holders can request physical silver delivery through the KMS Labs platform
3. Attestation responsibility — KMS Labs publishes reserve attestations

**Issuer characteristics vs. Paxos (PAXG analogy):**

| Dimension | Paxos Trust (PAXG) | KMS Labs (KAG) |
| --------- | :----------------: | :-------------: |
| Regulator | NYDFS (New York) | Liechtenstein TVTG |
| Charter type | Trust company | Technology service provider (token issuer) |
| U.S. regulated | Yes | No |
| Physical vault | Brink's London | LBMA-accredited (partner vaults) |
| Redemption | Physical gold delivery | Physical silver delivery |
| Attestation | Monthly, public (Paxos.com) | Periodic (KMS Labs platform — cadence requires confirmation) |
| Reserve standard | LBMA Good Delivery gold | LBMA Good Delivery silver 999 |

KMS Labs holds a stronger institutional standing than a self-custody arrangement but does not match Paxos Trust's NYDFS charter on U.S. regulatory equivalence.

### 1.4 Physical vault custody

KMS Labs holds silver in LBMA-accredited vault facilities. The specific vault operators (Brink's, Loomis, Malca-Amit, or proprietary) are not publicly confirmed in detail. Public attestations reference LBMA accreditation. Specific vault operators must be confirmed from KMS Labs attestation reports. Blocker registered as KIN-05.

### 1.5 Proof-of-reserves / audit cadence

KMS Labs publishes reserve attestations for KAG holdings. Specific details to be confirmed:
- Exact cadence (monthly, quarterly, or real-time)
- Auditor identity (Big 4, LBMA-accredited, or proprietary)
- Whether attestations are machine-readable or PDF-only
- Whether an API or on-chain PoR feed is available

Blocker registered as KIN-05. This directly affects the Custody Risk score under the CEF rubric.

### 1.6 Whether KAG can be held by smart contracts

As an ERC-20 token, KAG can be transferred to and held by smart contract addresses by design. ERC-20 transfer mechanics do not restrict receiving addresses to EOAs. The relevant question is not technical but legal: whether KMS Labs' terms of service permit:
1. Holding KAG in an automated control layer (smart contract vault)
2. Using KAG as backing for a third-party derivative instrument (AXAG)
3. Issuing a wrapper token (AXAG) that represents a claim on KAG held in a vault

These are terms-of-service questions that require direct legal review of the KMS Labs Kinesis Terms and Conditions and any applicable IP or usage restrictions. Blocker registered as KIN-03.

### 1.7 Redemption requirements and minimums

KMS Labs provides physical silver redemption for KAG holders. Publicly known parameters:
- Physical delivery requires meeting a minimum silver quantity (exact minimum to be confirmed from current KMS Labs terms — historical references suggest minimums in the range of 200–1,000 grams; exact current terms require verification)
- Delivery is available to KYC-verified account holders on the KMS Labs platform
- Redemption through the KMS Labs platform requires an account; smart contract holders cannot redeem directly through the platform — only through a KMS Labs registered account

**Critical architectural implication:** If AXAG burns return KAG to the redeemer, the redeemer then needs a KMS Labs account to convert KAG to physical silver. This is a two-step redemption: AXAG → KAG (on-chain, immediate) → physical silver (through KMS Labs, with minimum and KYC requirements).

Blocker registered as KIN-04.

---

## 2. KAG-Backed AXAG Model

### 2.1 Model overview

The KAG-backed AXAG model replaces the direct physical silver custody path (AXAG_STAGE_2_OPTIONS_PACKAGE.md, Options 1–3) with KAG as the reserve asset. Under this model:

- Axiom Protocol does not take direct custody of physical silver
- Axiom Protocol does not contract with a vault operator (Brink's, Loomis, Malca-Amit)
- The physical silver custody responsibility rests with KMS Labs / KAG
- AXAG becomes a wrapper or reserve instrument backed by ERC-20 KAG
- The custody chain is: Physical silver → KMS Labs vaults → KAG ERC-20 → AXAG smart contract → AXAG token holders

### 2.2 Structural analogy to AXAU/PAXG

The KAG-backed AXAG model is structurally analogous to the existing AXAU/PAXG model:

| Element | AXAU (gold) | AXAG / KAG (silver) |
| ------- | ----------- | ------------------- |
| Reserve token | PAXG (ERC-20) | KAG (ERC-20) |
| Issuer | Paxos Trust Company | KMS Labs AG |
| Issuer regulator | NYDFS | Liechtenstein TVTG |
| Vault | Brink's London | LBMA vault (KMS Labs partner) |
| Unit | 1 troy oz gold | 1 gram silver |
| Oracle | Chainlink XAU/USD | Chainlink XAG/USD (+ gram conversion) |
| Vault contract | AXGoldVault | AXSilverVault (to be designed) |
| Token | AXAU (ERC-3643) | AXAG (ERC-3643, planned) |

Key difference: KAG is gram-denominated; XAG/USD Chainlink price is per troy ounce. The NAV engine for AXAG must apply a grams-per-troy-ounce conversion (1/31.1035) to correctly price KAG holdings in USD. This is a contract-level engineering requirement, not a blocker, but it must be specified before smart contract drafting begins.

### 2.3 What this model does NOT mean

Under the KAG-backed model:

- Axiom Protocol does not own physical silver
- Axiom Protocol does not claim to hold silver bars
- AXAG is not directly backed by physical silver — it is backed by KAG, which is in turn backed by physical silver held by KMS Labs
- All public disclosure must clearly state the two-layer custody structure
- The legal distance between AXAG and physical silver is greater than the distance between AXAU and physical gold (because PAXG's issuer, Paxos, is NYDFS-regulated, while KAG's issuer, KMS Labs, is Liechtenstein-regulated)

---

## 3. Legal Distinction: KAG-Backed vs. Direct Silver-Backed

### 3.1 Direct silver-backed (Options 1–3 from options package)

| Element | Direct silver-backed |
| ------- | -------------------- |
| Custodian | Axiom-contracted vault operator (Brink's / Malca-Amit / Loomis) |
| Legal relationship | Axiom Protocol holds a custodial agreement; token holders have a direct or indirect claim on specific silver bars |
| Regulatory framework | Commodity delivery, commercial custody law in the vault's jurisdiction |
| Attestation source | Vault operator + independent auditor under Axiom's custody agreement |
| Redemption | Token holders redeem for physical bars through Axiom's vault agreement |
| Disclosure | "AXAG is backed by physical LBMA silver bars held by [Custodian] in [Location] under Axiom's custody agreement" |

### 3.2 KAG-backed (Kinesis path)

| Element | KAG-backed |
| ------- | ---------- |
| Custodian | KMS Labs AG (as KAG issuer); KMS Labs holds physical silver via LBMA vault partners |
| Legal relationship | Axiom Protocol holds KAG tokens; KAG token holders have a claim on KMS Labs for silver; AXAG holders have a claim on Axiom for KAG |
| Regulatory framework | Liechtenstein TVTG (KMS Labs); Arbitrum One smart contract law; commodity law for the silver |
| Attestation source | KMS Labs reserve attestations (cadence and auditor to be confirmed) |
| Redemption | AXAG → burn → KAG returned to redeemer → KAG holder redeems via KMS Labs platform (2-step) |
| Disclosure | "AXAG is backed by KAG (Kinesis Silver), an ERC-20 token issued by KMS Labs AG and backed by physical LBMA silver held in KMS Labs' vault network. AXAG holders do not have a direct claim on physical silver — redemption of physical silver requires a KMS Labs account and is subject to KMS Labs' current redemption terms, minimums, and KYC requirements." |

### 3.3 Key legal distinctions

**a) Intermediary counterparty risk.** The KAG-backed model introduces an additional counterparty: KMS Labs. If KMS Labs were to become insolvent, be subject to regulatory action, or halt redemptions, AXAG holders would be exposed even if the physical silver exists in the vault. Under a direct custody arrangement, this risk sits with the vault operator, not a digital-asset issuer.

**b) Regulatory jurisdiction.** Paxos Trust (PAXG) is regulated by NYDFS, which is well-understood by U.S. institutional allocators and legal counsel. KMS Labs is regulated under Liechtenstein TVTG, which is less familiar to U.S. allocators and counsel. Legal opinion must address whether KMS Labs' regulatory framework provides equivalent protection for the purposes of CEF Dimension 2 (Custody Risk) scoring.

**c) Terms-of-service dependency.** The KAG-backed model depends on KMS Labs' terms permitting wrapper use. If the terms prohibit derivative instruments backed by KAG, the model fails regardless of technical feasibility. This is the highest-priority legal blocker (KIN-03).

**d) Two-step redemption disclosure.** Under the direct silver path, Axiom Protocol controls the redemption SLA end-to-end (within the custody agreement). Under the KAG path, Axiom controls only the first step (AXAG → KAG); the second step (KAG → physical silver) is controlled by KMS Labs. Axiom cannot make representations about the KMS Labs redemption timeline, minimums, or availability.

**e) "Directly silver-backed" claim.** Under the KAG model, AXAG must NOT be described as "directly backed by silver." The accurate disclosure is "backed by KAG, which is backed by physical silver held by KMS Labs." Any claim that AXAG is directly silver-backed would be materially misleading under the KAG architecture.

---

## 4. Reserve Architecture

### 4.1 Reserve asset definition

Under the KAG-backed model:

| Parameter | Value |
| --------- | ----- |
| Reserve asset | KAG (ERC-20, Kinesis Silver) |
| Reserve unit | 1 gram of LBMA Good Delivery 999 fine silver |
| Reserve custodian | KMS Labs AG (issuer) via LBMA vault partners |
| Reserve chain (KAG) | Ethereum mainnet (confirmed); Arbitrum One (unconfirmed — KIN-02) |
| Reserve chain (AXAG) | Arbitrum One (per Axiom Protocol standard) |
| Coverage ratio floor | 105% (per CEF; same as AXAU) |
| Haircut | 8% (matching AXAU spec silver layer; adjustable by governance) |
| Max basket weight | 30% of AXAU reserve basket (per lib/axau/spec.ts silver layer) |
| Oracle | Chainlink XAG/USD (Arbitrum One) + gram conversion factor (1/31.1035) |
| NAV update cadence | Real-time (on-chain oracle heartbeat) |
| PoR source | KMS Labs published reserve attestation (cadence — KIN-05) |

### 4.2 Chain architecture decision

The KAG-backed path faces a chain architecture decision that does not exist for the direct physical silver path:

**KAG on Ethereum; AXAG on Arbitrum One.**

If KAG does not have a native Arbitrum One contract, one of the following architectures is required:

**Option R-A: Bridge KAG from Ethereum to Arbitrum One**

KAG is bridged using the Arbitrum Official Bridge (canonical L1→L2 bridge) or a trusted third-party bridge. The AXSilverVault on Arbitrum One holds bridged KAG. AXAG is minted and redeemed on Arbitrum One.

Risks:
- Bridge smart contract risk (additional attack surface)
- KMS Labs permission required for bridging (terms review — KIN-03)
- Bridge liquidity constraints: large KAG bridge events require sufficient liquidity on the Arbitrum bridge
- Withdrawal finalization delay: Arbitrum Official Bridge withdrawal from L2→L1 takes ~7 days

**Option R-B: Operate AXSilverVault on Ethereum mainnet; bridge AXAG to Arbitrum**

The reserve vault and KAG holding remain on Ethereum mainnet. AXAG tokens are issued on Ethereum and bridged to Arbitrum One for trading. Significantly more complex; introduces two separate smart contract deployments.

**Option R-C: Wait for official KAG on Arbitrum One**

If KMS Labs deploys KAG natively on Arbitrum One, no bridge is needed. This would be the cleanest architecture. Feasibility requires KMS Labs confirmation.

**Recommended: Pursue Option R-C first (confirm with KMS Labs); use Option R-A as fallback.**

### 4.3 Reserve vault design

The reserve vault follows the AXGoldVault pattern established in lib/axau/spec.ts (id: 'silver-xag' layer):

```
AXSilverVault (Arbitrum One contract — to be designed)
│
├── Holds: KAG ERC-20 tokens (native or bridged)
├── Exposes: depositKAG(amount) → mints AXAG (via MintRedeemController)
├── Exposes: redeemKAG(amount) → burns AXAG, returns KAG to redeemer
├── Reads: Chainlink XAG/USD × (1/31.1035) → KAG USD price
├── Enforces: 105% coverage ratio floor
└── Emits: VaultDeposit, VaultWithdraw events for Solvency Console
```

This vault architecture is an extension of the existing AXAU codebase pattern and does not require a fundamentally new design — it replaces PAXG with KAG and XAU/USD with XAG/USD (with gram conversion).

### 4.4 NAV engine modification

The existing NAVEngine must be extended to support a multi-component basket that includes a gram-denominated silver token. Required modifications:

1. Add a `reserveAsset: 'KAG'` component configuration
2. Apply gram conversion: `kagPriceUsd = xagUsdChainlink / 31.1035`
3. Compute silver component NAV: `kagBalance × kagPriceUsd × (1 − 0.08 haircut)`
4. Sum with gold component: `totalBackingUsd = goldNAV + silverNAV`
5. Recompute coverage ratio: `coverageRatioBps = totalBackingUsd / (axauOutstanding × mintNAV)`

No new oracle is required — Chainlink XAG/USD on Arbitrum One is the existing oracle (verified at O-01 in the evidence tracker). The gram conversion is a deterministic arithmetic operation.

---

## 5. Smart Contract Architecture

### 5.1 Contract scope for the KAG-backed path

The following contracts are required or modified. No contracts are deployed under this document — this is architectural planning only.

**New contracts (to be designed):**

| Contract | Purpose | Chain |
| -------- | ------- | ----- |
| AXSilverVault | Holds KAG; issues/redeems AXAG via MintRedeemController | Arbitrum One |
| AXAGToken | ERC-3643 silver reserve token (if Option A — standalone AXAG) | Arbitrum One |

**Existing contracts requiring modification:**

| Contract | Required modification |
| -------- | --------------------- |
| NAVEngine | Add silver component with gram conversion factor |
| CommodityRegistry | Register KAG as an approved reserve asset for the silver layer |
| MintRedeemController | Route silver layer mint/redeem through AXSilverVault |

**Existing contracts that are reused without modification (or with configuration changes only):**

| Contract | Reuse basis |
| -------- | ----------- |
| AXAUToken (ERC-3643) | AXAG can follow the same token standard |
| GovernanceTimelock | Commodity admission via existing 72-hour timelock |
| Chainlink oracle integration | XAG/USD feed reused; gram conversion added in NAVEngine |

### 5.2 Vault contract interface (design sketch — not implementation)

```solidity
// DESIGN SKETCH ONLY — NOT FOR DEPLOYMENT

interface IAXSilverVault {
    // Deposit KAG; NAV engine mints AXAG to msg.sender
    function deposit(uint256 kagAmount) external;

    // Burn AXAG; vault releases KAG to msg.sender
    function redeem(uint256 axagAmount) external;

    // Returns current KAG balance in vault (18 decimals)
    function kagBalance() external view returns (uint256);

    // Returns current KAG/USD price (gram-denominated, 8 decimals)
    // kagPriceUsd = xagUsdChainlink / 31.1035 (scaled)
    function kagPriceUsd() external view returns (uint256);

    // Returns current coverage ratio in basis points
    function coverageRatioBps() external view returns (uint256);

    // Pauses deposit/redeem (emergency guardian authority)
    function pause() external;
    function unpause() external;
}
```

### 5.3 Security constraints

All of the following must be satisfied before any AXSilverVault contract is submitted for external security audit:

1. Reentrancy protection on deposit() and redeem() (ReentrancyGuard or CEI pattern)
2. Access control: only MintRedeemController may call deposit/redeem on behalf of users
3. Oracle manipulation resistance: TWAP validation or Chainlink deviation check on XAG/USD
4. Gram conversion uses fixed-point arithmetic; overflow/underflow tested
5. Emergency pause is the emergency guardian multi-party authorization (3-of-5) — not a single key
6. No admin key can drain the vault unilaterally
7. Bridge contract risk addressed: if KAG is bridged, bridge integrity is verified and bridge contract audited

### 5.4 What this document does NOT authorize

This architectural design does NOT authorize:
- Deployment of AXSilverVault or AXAGToken on any mainnet or testnet
- Acquisition of KAG for any purpose
- Execution of any mint or redeem transaction
- Any modification to existing deployed AXAU contracts
- Any bridge transaction involving KAG

All of the above require governance vote, legal review completion, and launch readiness gate sign-off.

---

## 6. Mint / Redeem Flow

### 6.1 Mint flow (AXAG from KAG)

```
User                  AXSilverVault          NAVEngine         MintRedeemController
  │                        │                     │                      │
  │─── approve KAG ────────▶                     │                      │
  │─── deposit(kagAmt) ────▶                     │                      │
  │                        │─── getKagPrice ─────▶                      │
  │                        │◀── kagPriceUsd ──────                      │
  │                        │─── checkCoverage ────────────────────────▶ │
  │                        │◀── coverageOK ───────────────────────────── │
  │                        │─── mintAXAG(axagAmt) ───────────────────▶  │
  │                        │◀── AXAG minted ──────────────────────────── │
  │◀── AXAG transferred ───                      │                      │
```

Mint amount calculation:
```
kagValueUsd  = kagAmount × (xagUsdChainlink / 31.1035)
axagMintable = kagValueUsd / mintNAV
axagMinted   = axagMintable × (1 − haircut)  // 8% haircut applied
```

Coverage ratio check before mint:
```
newCoverage = (kagBalance + kagAmount) × kagPriceUsd / ((axauOutstanding + axagMinted) × mintNAV)
// Must be ≥ 10,500 bps (105%) before mint is permitted
```

### 6.2 Redeem flow (KAG from AXAG burn)

```
User                  AXSilverVault          NAVEngine         MintRedeemController
  │                        │                     │                      │
  │─── approve AXAG ───────▶                     │                      │
  │─── redeem(axagAmt) ────▶                     │                      │
  │                        │─── burnAXAG ─────────────────────────────▶ │
  │                        │◀── burned ───────────────────────────────── │
  │                        │─── getKagPrice ─────▶                      │
  │                        │◀── kagPriceUsd ──────                      │
  │                        │─── transferKAG to user                     │
  │◀── KAG transferred ────                      │                      │
```

KAG return amount calculation:
```
axagValueUsd = axagAmount × backingNAV
kagReturned  = axagValueUsd / kagPriceUsd  // grams of KAG returned
```

### 6.3 Second-step redemption (KAG → physical silver, via KMS Labs)

This step is entirely outside Axiom Protocol's control:

```
User (holds KAG on Arbitrum or Ethereum)
  │
  │── Transfer KAG to Ethereum mainnet (if bridged) ──▶ Ethereum wallet
  │
  │── Log in to KMS Labs platform (KYC-verified account) ──▶ KMS Labs
  │
  │── Submit silver redemption request ──▶ KMS Labs
  │       (must meet minimum gram threshold — confirm KIN-04)
  │
  │── KMS Labs arranges delivery via LBMA vault ──▶ User
```

Axiom Protocol disclosure must explicitly state that it does not control the second step. Axiom cannot represent the timeline, minimum, cost, or availability of physical silver delivery through KMS Labs.

### 6.4 Redemption disclosure (required)

All AXAG redemption interfaces must display the following notice before a redemption transaction is confirmed:

> "Redemption returns KAG (Kinesis Silver) to your wallet, not USD or physical silver. KAG is issued by KMS Labs AG and may be redeemed for physical LBMA silver through the KMS Labs platform, subject to KMS Labs' current terms, minimum quantities, KYC requirements, and availability. Axiom Protocol does not control the physical silver redemption process. Fiat conversion is the redeemer's responsibility through a third-party venue."

---

## 7. Disclosure Language

### 7.1 Required AXAG instrument disclosure (KAG-backed model)

Per CEF Section 9.3 and the institutional vocabulary in lib/glossary.ts:

**Reserve description:**
> "AXAG is backed by KAG (Kinesis Silver), an ERC-20 token issued by KMS Labs AG and backed by physical LBMA Good Delivery silver (999 fine) held in KMS Labs' vault network. Each KAG represents 1 gram of LBMA silver. AXAG holders do not have a direct claim on physical silver."

**Redemption description:**
> "Redemption of AXAG returns KAG to the redeemer's wallet. Physical silver delivery requires a KMS Labs platform account and is subject to KMS Labs' current redemption terms, minimum gram thresholds, and KYC requirements. Axiom Protocol does not control, guarantee, or represent the terms of the KMS Labs redemption process."

**Issuer description:**
> "KAG is issued by KMS Labs AG, authorized under the Liechtenstein Token and Trustworthy Technology Service Providers Act (TVTG). KMS Labs AG is not regulated by the U.S. Securities and Exchange Commission, the U.S. Commodity Futures Trading Commission, or the New York Department of Financial Services."

**Coverage and backing:**
> "AXAG maintains a minimum reserve coverage ratio of 105% of outstanding tokens, measured against the KAG holdings in the AXSilverVault, priced in USD using the Chainlink XAG/USD price feed on Arbitrum One adjusted for the gram-to-troy-ounce conversion factor. Coverage ratio is published in the Axiom Protocol Solvency Console."

**Deferred rails (CEF Section 9.3, item 9):**
> "The following redemption pathways are not supported for AXAG: USD wire transfer, ACH, fiat bank payout, direct physical silver delivery arranged by Axiom Protocol. Physical silver delivery is available only through the KMS Labs platform, subject to KMS Labs' terms."

**GENIUS Act language (CEF Section 9.1):**
> "Structured with reference to applicable stablecoin and digital asset regulatory frameworks. Compliance posture remains subject to legal and operational review. External attestation has not been completed."

### 7.2 Prohibited language (KAG-backed model)

The following statements are prohibited and must not appear in any AXAG communication under the KAG-backed model:

| Prohibited | Reason |
| --------- | ------ |
| "AXAG is backed by physical silver" | Inaccurate — AXAG is backed by KAG, which is backed by silver |
| "Axiom holds silver" | Inaccurate — KMS Labs holds silver, not Axiom |
| "Directly redeemable for silver" | Inaccurate — redemption is two-step; Axiom controls only the first step |
| "KMS Labs compliant" or "TVTG compliant" | No definitive legal conclusion; use "designed with reference to" |
| "Guaranteed redemption" | No guarantee language; Axiom controls only KAG return, not physical delivery |
| "Bankless" | Prohibited per institutional vocabulary rules |
| Fixed APY or return promises | Prohibited per CEF Section 9.5 |

---

## 8. Risk Scoring Impact

### 8.1 Scoring scenario — KAG-backed model

Under the KAG-backed model, the five CEF dimensions are re-evaluated:

**Dimension 1 — Oracle Risk (current: 2)**

The Chainlink XAG/USD price feed on Arbitrum One is the oracle source. This dimension is unchanged from the direct silver path — the KAG-backed model uses the same oracle. The gram conversion factor is a deterministic arithmetic operation applied in the NAVEngine, not an oracle dependency.

| Factor | Assessment |
| ------ | ---------- |
| Chainlink XAG/USD on Arbitrum One | Requires O-01 verification (currently IN PROGRESS) |
| Gram conversion | Arithmetic; no oracle dependency |
| KAG/USD price | Derived from XAG/USD ÷ 31.1035 — deterministic |
| Score impact | No change (remains 2 pending O-01 confirmation) |

**Score: 2 (unchanged)**

---

**Dimension 2 — Custody Risk (current: 3)**

This is the dimension most materially affected by the KAG-backed model. Under the CEF rubric (Section 10.4):

| CEF Score | Criteria | KAG-backed status |
| :-------: | -------- | ----------------- |
| 1 | Regulated qualified custodian issuing a directly redeemable on-chain receipt token (AXAU pattern: Paxos / PAXG) | **KAG qualifies** if KMS Labs is treated as an equivalent qualified custodian. KAG is directly redeemable for physical silver through the KMS Labs platform. Legal opinion required on whether TVTG regulation = "regulated qualified custodian" under the CEF. |
| 2 | Regulated custodian with segregated account and quarterly PoR, but no directly redeemable on-chain receipt token | KAG has on-chain redeemability (to physical silver via KMS Labs), but the issuer is Liechtenstein-regulated, not NYDFS/OCC |

**Custody Risk scoring range under KAG-backed model:**
- **Score 1 (best case):** Legal opinion confirms KMS Labs TVTG = "regulated qualified custodian" equivalent; KAG's redemption mechanism is treated as equivalent to PAXG. This requires a legal opinion from external counsel. If achieved, Custody Risk = 1 — the same as AXAU.
- **Score 2 (base case):** Legal opinion confirms KMS Labs is a regulated entity with qualified silver custody and periodic PoR, but not a U.S.-equivalent qualified custodian. This is the most likely result without a positive legal opinion. Custody Risk = 2.
- **Score 3 (adverse case):** Legal opinion finds that KMS Labs TVTG does not satisfy CEF qualified custodian standards; attestation cadence is insufficient; or the wrapper permission issue (KIN-03) is unresolved. No improvement over direct physical custody path if this score holds.

**Score range: 1–3. Base case: 2. Requires legal opinion to confirm.**

---

**Dimension 3 — Liquidity Risk (current: 3)**

| Factor | Assessment |
| ------ | ---------- |
| KAG global market volume | KAG is traded on Kinesis Exchange and third-party venues. Market depth is smaller than PAXG. Estimated daily volume is in the range of $1M–$10M — placing it in the CEF score-3 band for spot market volume alone |
| On-chain redemption path | KAG-backed AXAG has an on-chain redemption path (burn AXAG → receive KAG). This satisfies the CEF "on-chain redemption path" criterion for score 2, assuming the path is operational and KAG is liquid enough for redeemers to sell on-chain |
| AMM pool (L-01) | A functioning AMM pool for AXAG on Arbitrum One is still required (L-01 workstream). The KAG-backed model does not resolve this blocker. |
| KAG/USD AMM depth | No confirmed AMM pool for KAG on Arbitrum One. Redemption through KMS Labs is off-chain. |

**Liquidity Risk scoring range:**
- **Score 2 (achievable):** If O-01 confirms Chainlink XAG/USD is operational, L-01 AMM bootstrap is completed, and KAG on-chain redemption path is documented. Physical silver's global spot market ($4B+ daily) is not the constraint — KAG's market depth is.
- **Score 3 (current):** No AMM, no confirmed on-chain redemption path operational. Remains unchanged until L-01 and L-03 close.

**Score range: 2–3. Unchanged by KAG path alone; L-01 and L-03 still required.**

---

**Dimension 4 — Reserve Risk (current: 1)**

KAG is backed by LBMA Good Delivery 999 fine silver — the same physical commodity that the direct silver path targets. The reserve quality is identical. Score 1 is preserved.

| Factor | Assessment |
| ------ | ---------- |
| Physical silver standard | LBMA Good Delivery 999 fine — same standard as direct silver path |
| Non-perishable | Yes |
| Fungible | Yes |
| LBMA accreditation | KMS Labs holds silver in LBMA-accredited vaults |
| Score impact | No change |

**Score: 1 (unchanged)**

---

**Dimension 5 — Regulatory Risk (current: 2)**

| Factor | Assessment |
| ------ | ---------- |
| Silver commodity precedent | Strong; CFTC-recognized commodity; same as direct silver path |
| KMS Labs TVTG | Less familiar to U.S. counsel than NYDFS/OCC. Liechtenstein is an EEA member; TVTG is a recognized framework in Europe. U.S. equivalence is a legal question (KIN-03 legal component) |
| Legal review in progress | REG-01 is IN PROGRESS — engagement letter pending |
| U.S. securities analysis | Howey / Reves analysis still required for AXAG instrument |
| Score impact | Could improve to 1 if legal opinion is clean; could stay at 2 if TVTG equivalence is uncertain |

**Score range: 1–2. Base case: 2 (unchanged). Positive legal opinion could move to 1.**

---

### 8.2 Re-scoring scenarios under KAG-backed model

| Scenario | Oracle | Custody | Liquidity | Reserve | Regulatory | **Composite** | **Band** |
| -------- | :----: | :-----: | :-------: | :-----: | :--------: | :-----------: | :------: |
| Current (no change) | 2 | 3 | 3 | 1 | 2 | **11** | CONDITIONAL |
| KAG base case (custody 2, liquidity 2) | 2 | 2 | 2 | 1 | 2 | **9** | **APPROVED** |
| KAG best case (custody 1, liquidity 2) | 2 | 1 | 2 | 1 | 2 | **8** | **APPROVED** |
| KAG adverse (custody 3, liquidity 3) | 2 | 3 | 3 | 1 | 2 | **11** | CONDITIONAL |
| KAG + Oracle confirmed (custody 2, liquidity 2, oracle 1) | 1 | 2 | 2 | 1 | 2 | **8** | **APPROVED** |

**The KAG-backed path, at base case, moves AXAG from 11 (CONDITIONAL) to 9 (APPROVED) — two full bands of improvement — if legal opinion confirms custody score 2 and the L-01 AMM bootstrap closes liquidity to score 2.**

**The KAG-backed path is superior to the direct physical silver path (Path B, best composite 10) if KMS Labs receives a custody score of 2 or better AND the L-01/L-03 liquidity workstreams close.**

---

## 9. Architecture Options

### Option A — AXAG Wrapper Vault Backed 1:1 by ERC-20 KAG

**Description:** A new AXAG ERC-3643 token is issued on Arbitrum One. The AXSilverVault holds KAG ERC-20 tokens as backing. 1 AXAG represents a proportional claim on the KAG held in the vault, priced at the current XAG/USD Chainlink rate with gram conversion. Users deposit KAG to mint AXAG; users burn AXAG to receive KAG.

**How it works:**
- AXAG is a standalone token with its own MintRedeemController
- AXSilverVault holds KAG as a single-asset reserve
- AXAG supply is fully backed by KAG; no other reserve component
- Physical silver backing is two layers removed: AXAG → KAG → Physical silver (KMS Labs)

**Pros:**
| Pro | Detail |
| --- | ------ |
| Cleanest instrument definition | AXAG = one thing: a KAG-backed silver unit |
| Easiest disclosure | Reserve is a single asset (KAG); coverage calculation is simple |
| Follows AXAU/PAXG precedent exactly | Architecture mirrors AXGoldVault + AXAU with minimal modification |
| No multi-asset NAV complexity | Only one vault, one reserve asset, one oracle |
| Fastest to implement | Leverages existing AXAU contract architecture |

**Cons:**
| Con | Detail |
| --- | ------ |
| New token introduces complexity | Another ERC-3643 token requires its own KYC/compliance layer, transfer agent, and disclosure endpoint |
| KAG bridge risk (if no Arbitrum native) | If KAG must be bridged from Ethereum, bridge contract risk is introduced |
| Two-step redemption for physical silver | Users must bridge KAG back to Ethereum and then use the KMS Labs platform |
| Requires KMS Labs wrapper permission | If terms prohibit AXAG wrapper, this option fails (KIN-03) |

**Required evidence before Option A implementation begins:**
1. KIN-01: KAG contract address confirmed
2. KIN-02: KAG on Arbitrum One confirmed (or bridge path approved)
3. KIN-03: KMS Labs terms confirm wrapper tokens permitted
4. KIN-04: Redemption flow documented with minimum thresholds
5. KIN-05: PoR attestation cadence confirmed
6. Legal opinion on KMS Labs custody scoring (REG-01 / REG-02 scope)
7. Oracle confirmation (O-01 closed — Chainlink XAG/USD verified)

**Expected scoring impact:** Custody 3 → 2 (base case) or → 1 (best case). Composite 11 → 9 or 8.

---

### Option B — No AXAG Token; Integrate KAG Directly into Axiom as Supported Reserve Asset

**Description:** AXAG as a standalone token is not created. Instead, KAG is admitted as a reserve component of the existing AXAU basket (the Phase 2 silver layer defined in lib/axau/spec.ts as id: 'silver-xag'). The AXSilverVault holds KAG; the NAVEngine adds the silver component to the AXAU backing calculation. AXAU token holders benefit from the enhanced silver backing; there is no separate silver token.

**How it works:**
- KAG is approved via AXM governance vote as a reserve component (per AXAU spec Phase 2)
- AXSilverVault is deployed; KAG deposited as the silver reserve layer
- NAVEngine updated to include the silver component (gram conversion applied)
- AXAU Backing NAV increases; AXAU's reserve basket now includes gold + silver
- No new token is issued; AXAU holders benefit from silver backing without a new instrument

**Pros:**
| Pro | Detail |
| --- | ------ |
| Simplest architecture | No new token; no new compliance layer |
| Follows the AXAU Phase 2 specification exactly | lib/axau/spec.ts already defines this path (silver-xag layer) |
| Enriches AXAU rather than fragmenting the product | Existing AXAU holders benefit immediately |
| Avoids new token regulatory analysis | No Howey/Reves analysis required for a new token |
| Governance-ready | Phase 2 silver admission is already in the AXAU governance pipeline |

**Cons:**
| Con | Detail |
| --- | ------ |
| No AXAG-specific product | Users cannot hold a pure-silver instrument; only the basket |
| Silver exposure is diluted by gold | AXAU backers care about the basket; silver-specific allocators cannot express a pure-silver position |
| AXAG diligence work becomes AXAU Phase 2 work | The CEF Stage 2 process for AXAG is redirected to the AXAU Phase 2 admission process |
| Still requires KMS Labs terms review | KAG wrapper in the AXAU context still requires terms confirmation |

**Required evidence:** Same as Option A, except KIN-03 (wrapper permission) is reframed as "KAG as AXAU reserve asset" rather than "KAG as AXAG wrapper backing."

**Expected scoring impact:** AXAU silver component is added; AXAU Backing NAV increases. AXAG as a standalone instrument is not scored — this option terminates the AXAG Stage 2 CEF process and routes the work to the AXAU Phase 2 admission process.

---

### Option C — Hybrid: KAG Now, Direct Physical Silver Later

**Description:** Launch with Option A (KAG-backed AXAG wrapper) immediately. In parallel, pursue the direct physical silver custody path (Options 1–3 from AXAG_STAGE_2_OPTIONS_PACKAGE.md). When a direct custody arrangement is secured (C-03 through C-07 closed), upgrade the AXSilverVault's reserve asset from KAG to direct physical silver backed by Axiom's own custody agreement.

**Phases:**
- Phase 1: AXSilverVault holds KAG → AXAG launched with KAG backing
- Phase 2: Direct custody arrangement with Brink's / Malca-Amit / Loomis established
- Phase 3: Governance-approved migration of AXSilverVault from KAG to direct physical silver
- Phase 4: KAG position unwound as direct silver custody becomes operational

**Pros:**
| Pro | Detail |
| --- | ------ |
| Fastest viable go-live path | KAG availability is faster than securing direct custody (which requires C-03 through C-07) |
| Preserves long-term architecture | Direct custody path is still pursued; KAG is a bridge solution |
| Improved short-term scoring | KAG base case moves to score 9 (APPROVED); direct custody can later move to 8 |
| No dependency on BitGo product development | Unlike Path A in the options package, KAG is available today (pending chain confirmation) |

**Cons:**
| Con | Detail |
| --- | ------ |
| Two custody changes require two governance votes | Admission of KAG, then migration to direct silver — each requires governance |
| Disclosure complexity during migration | Token holders must be notified of the reserve asset change at each phase |
| Double operational overhead | Running KAG custodianship AND direct physical custody in parallel during transition |
| KAG bridge risk in Phase 1 | All Option A cons apply during Phase 1 |
| Regulatory review must cover both models | Legal opinion must address KAG-backed and direct-silver models separately |

**Recommended triggers for Phase 3 upgrade:**
1. C-03 closed (direct custodian selected)
2. C-04 through C-07 closed (term sheet, vault, attestation, chain-of-custody documented)
3. Governance vote approving the migration plan
4. AXSilverVault upgrade to accept direct silver verified by independent auditor
5. 30-day token holder notice period

---

### Option comparison

| Factor | Option A (KAG wrapper) | Option B (AXAU reserve) | Option C (Hybrid) |
| ------ | :--------------------: | :---------------------: | :---------------: |
| Time to go-live | Fastest (pending blockers) | Fast (AXAU Phase 2) | Fastest (same as A) |
| New token | Yes (AXAG) | No | Yes (AXAG) |
| CEF Stage 2 process | Continues | Terminates → AXAU admission | Continues |
| Score improvement | 11 → 9 or 8 | N/A (AXAU basket) | 11 → 9 or 8 (Phase 1) |
| Disclosure complexity | Medium | Low | High |
| Long-term architecture | KAG-only until upgrade | AXAU basket | KAG → Direct silver |
| Governance votes required | 1 (admission) | 1 (AXAU Phase 2) | 2+ (admission + migration) |
| Physical silver custody | No (KMS Labs holds it) | No (KMS Labs holds it) | Yes (Phase 3) |
| KIN-01 through KIN-05 blockers | All required | All required (reframed) | All required |

---

## 10. Launch Blockers

All of the following must be resolved before smart contract work begins, regardless of which option is selected.

### KIN-01 — Official KAG contract address required

**Blocker:** The official KAG ERC-20 contract address on Ethereum mainnet has not been confirmed from a canonical KMS Labs source. Without the confirmed contract address, no integration can begin.

**Resolution:** Obtain from KMS Labs developer documentation, the official Kinesis developer portal, or direct communication with KMS Labs.
**Priority:** CRITICAL — gate on all options
**Evidence required:** KMS Labs developer documentation or direct written confirmation

---

### KIN-02 — KAG on Arbitrum One availability

**Blocker:** It is unconfirmed whether KAG has a native ERC-20 deployment on Arbitrum One, or whether KMS Labs supports an official bridge path from Ethereum to Arbitrum One. If neither exists, a bridge architecture must be designed and KMS Labs permission confirmed.

**Resolution:** Confirm from KMS Labs whether Arbitrum One deployment exists or is on the roadmap. If bridging is required, confirm KMS Labs terms permit it and evaluate bridge security.
**Priority:** CRITICAL — gate on all options
**Evidence required:** KMS Labs written confirmation or published developer documentation

---

### KIN-03 — KMS Labs terms review: wrapper token and vault-holding permission

**Blocker:** KMS Labs' Terms and Conditions for KAG must be reviewed to confirm:
1. Holding KAG in a smart contract vault is permitted
2. Issuing a third-party token (AXAG) backed by KAG is permitted
3. Using KAG as a reserve asset in a tokenized instrument is not restricted
4. No IP or usage restrictions prevent the described architecture

**Resolution:** Legal counsel reviews KMS Labs Terms and Conditions; direct confirmation from KMS Labs recommended.
**Priority:** CRITICAL — if KIN-03 resolves negatively, all KAG-backed options fail
**Evidence required:** Legal memo confirming wrapper permission; ideally a written statement from KMS Labs

---

### KIN-04 — Redemption terms review: minimums, KYC, timeline, platform access

**Blocker:** KMS Labs redemption minimums, KYC requirements, platform access terms, and physical delivery timeline have not been confirmed from current KMS Labs documentation. This information is required to:
1. Write accurate disclosure language for AXAG
2. Design the L-03 redemption SLA (two-step flow)
3. Determine whether institutional-grade redemption is available

**Resolution:** Review current KMS Labs Terms and Conditions; document minimum gram thresholds, delivery timeline, and KYC requirements.
**Priority:** HIGH — required for disclosure and SLA design
**Evidence required:** Current KMS Labs redemption terms; confirmed minimum quantities

---

### KIN-05 — KAG proof-of-reserves / audit cadence and format

**Blocker:** KMS Labs' PoR attestation cadence, auditor identity, report format (machine-readable vs. PDF), and availability of an on-chain PoR feed have not been confirmed. This information is required to:
1. Determine the Custody Risk score (1, 2, or 3) under the CEF rubric
2. Satisfy launch readiness gate HB-04 (custody attestation within 30 days)

**Resolution:** Review KMS Labs published attestation reports; contact KMS Labs directly to confirm cadence, auditor, and format.
**Priority:** HIGH — directly determines custody score and launch gate eligibility
**Evidence required:** Most recent KMS Labs PoR report; auditor name; confirmation of cadence

---

### KIN-06 — Legal review: KMS Labs TVTG custody scoring equivalence

**Blocker:** Legal opinion from external counsel is required on whether KMS Labs' authorization under Liechtenstein TVTG satisfies the CEF Dimension 2 (Custody Risk) rubric for score 1 (regulated qualified custodian) or score 2. This determination directly controls the re-scoring outcome.

**Resolution:** Expand REG-01 / REG-02 scope to include KAG-backed model analysis alongside direct silver analysis.
**Priority:** HIGH — controls custody score
**Evidence required:** External legal opinion memo addressing KMS Labs TVTG qualification

---

### KIN-07 — Oracle verification: Chainlink XAG/USD on Arbitrum One (O-01 dependency)

**Blocker:** Whether the Chainlink XAG/USD price feed exists and is operational on Arbitrum One is unconfirmed (O-01 is currently IN PROGRESS). The KAG-backed model uses the same oracle as the direct silver path — this blocker is shared.

**Resolution:** O-01 closes when the oracle address is verified and the freshness probe result is captured.
**Priority:** HIGH (shared with direct silver path)
**Evidence required:** O-01 CLOSED with Chainlink aggregator address and freshness probe result

---

### KIN-08 — Smart contract work cannot begin until KIN-01 through KIN-06 resolve

No smart contract design, drafting, or testing may begin for AXSilverVault or AXAGToken until:
- KIN-01: contract address confirmed
- KIN-02: chain availability confirmed
- KIN-03: wrapper terms confirmed
- KIN-04: redemption terms documented
- KIN-05: PoR cadence and format confirmed
- KIN-06: legal opinion on custody scoring received

This is not a governance restriction — it is an architectural necessity. Smart contract work without confirmed contract addresses, chain deployments, and terms review would produce designs that may require complete rework.

---

## 11. No-Go Conditions

The Kinesis / KAG path is NOT viable if any of the following conditions is true:

| No-go ID | Condition | Consequence |
| -------- | --------- | ----------- |
| KNG-01 | KMS Labs Terms and Conditions prohibit holding KAG in a third-party smart contract vault or issuing a derivative token (AXAG) backed by KAG | All KAG-backed options fail. Revert to direct physical silver path (Options 1–3). |
| KNG-02 | KAG does not exist as an ERC-20 on Ethereum mainnet (KIN-01 not resolvable) | Architecture cannot proceed. No official KAG ERC-20 to build against. |
| KNG-03 | No viable path to KAG on Arbitrum One (no native deployment; no permitted bridge) | AXAG must operate on Ethereum mainnet or the KAG path is abandoned for Arbitrum One. |
| KNG-04 | Legal opinion determines KMS Labs TVTG does not satisfy CEF Custody Risk score 2 or better | Custody score remains at 3; composite does not improve; KAG path provides no scoring benefit over the current state. |
| KNG-05 | KMS Labs PoR attestation does not meet the CEF Minimum Custody Standards (MC-04: quarterly or better PoR from independent auditor) | Custody score cannot be confirmed; launch readiness gate HB-04 cannot pass. |
| KNG-06 | Oracle verification (O-01) finds no Chainlink XAG/USD on Arbitrum One AND no Tier 2 plan is approved | Oracle Risk rises to 3+; composite does not improve below CONDITIONAL band. |
| KNG-07 | KMS Labs suspends KAG redemptions or is subject to regulatory enforcement during the design period | KAG-backed model introduces unresolvable counterparty risk; revert to direct silver path. |

If any no-go condition is triggered: the KAG-backed path is abandoned and the direct physical silver path (AXAG_STAGE_2_OPTIONS_PACKAGE.md, Option 1 — Path B) becomes the sole active execution path.

---

## 12. Recommended Output

### 12.1 Best model

**Option A (AXAG wrapper vault backed by KAG) is the best model for a standalone AXAG instrument** if blockers KIN-01 through KIN-06 resolve affirmatively.

Rationale:
- Directly analogous to AXAU/PAXG — the proven architecture already running in the Axiom codebase
- Requires the least new engineering (AXSilverVault + NAVEngine modification)
- Produces a clean, standalone silver instrument that silver-specific allocators can hold
- Provides the strongest scoring improvement path (custody 3 → 1 or 2; composite 11 → 8 or 9)

**Option B (KAG as AXAU reserve asset) is the best model if a standalone AXAG instrument is not the goal.** It is the fastest path to silver backing for AXAU basket holders and follows the Phase 2 spec exactly.

**Option C (Hybrid) is recommended if the decision is made to launch AXAG quickly while the direct physical silver custody path (C-03) continues.** It maximizes optionality but requires two governance votes and complex disclosure.

### 12.2 Whether KAG can move AXAG from CONDITIONAL toward APPROVED

**Yes — the KAG-backed path, at base case, moves AXAG composite from 11 (CONDITIONAL) to 9 (APPROVED).**

This is a superior scoring outcome compared to the direct physical silver Path B (composite 10) because KAG provides on-chain redeemability (characteristic of a CEF Custody Risk score 1 or 2 instrument), whereas Path B provides physical custody with periodic attestation only (score 2 at best).

The improvement is conditional on:
1. KIN-01 through KIN-06 resolving affirmatively (especially KIN-03 terms and KIN-06 legal opinion)
2. L-01 AMM bootstrap closing (Liquidity Risk → 2)
3. O-01 confirming Chainlink XAG/USD (Oracle Risk confirmed at 2 or confirmed as 1)

### 12.3 What still blocks launch

In order of priority:

| Rank | Blocker | Required for |
| :--: | ------- | ------------ |
| 1 | KIN-03 — KMS Labs terms confirm wrapper permission | All options |
| 2 | KIN-01 — Official KAG contract address confirmed | All options |
| 3 | KIN-02 — KAG on Arbitrum One confirmed | Option A, C |
| 4 | KIN-06 — Legal opinion on TVTG custody scoring | Custody score |
| 5 | KIN-05 — PoR attestation cadence confirmed | Custody score, HB-04 |
| 6 | KIN-04 — Redemption terms documented | Disclosure, L-03 |
| 7 | O-01 — Oracle verified | Oracle score |
| 8 | L-01 — AMM bootstrap design complete | Liquidity score |
| 9 | REG-01 — Legal opinion engagement | Stage 3 gate |
| 10 | Governance vote — KAG admitted as reserve asset | Launch authorization |
| 11 | Launch readiness gate HB-01–HB-10 — all pass | AXAG live |

### 12.4 Whether smart contract work should begin

**No. Smart contract work must not begin until KIN-01 through KIN-06 are resolved.**

Rationale: Smart contract architecture depends on the confirmed KAG contract address (KIN-01), the target chain and bridge architecture (KIN-02), terms permissions (KIN-03), and custody scoring (KIN-06). Beginning smart contract work before these are confirmed creates a high probability of material rework. The correct sequencing is:

1. Resolve KIN-01 through KIN-06 (legal and external verification)
2. Architecture specification approved by Treasury Lead and Compliance Lead
3. Smart contract draft prepared against confirmed specifications
4. Internal testnet deployment and validation
5. External security audit (pre-launch requirement)
6. Launch readiness gate

---

## Verdict

**AXAG KINESIS PATH READY FOR LEGAL REVIEW**

The Kinesis / KAG architecture is technically viable, structurally sound, and consistent with the existing AXAU/PAXG codebase pattern. The go-live path requires legal review to resolve the six key blockers (KIN-01 through KIN-06). If legal review resolves affirmatively, the KAG-backed path moves AXAG to the APPROVED scoring band (composite 9) and is the fastest available route to AXAG launch. Smart contract work does not begin until legal review is complete.

AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT. This assessment does not authorize any contract deployment, token mint, KAG acquisition, or public AXAG claim.

---

End of Kinesis go-live path assessment.
