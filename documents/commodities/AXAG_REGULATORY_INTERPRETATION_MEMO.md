# Axiom Protocol — Internal Regulatory Interpretation Memo
## Silver Sleeve Integration: KAG as AXAU Reserve Collateral

```
Document class:  Internal Regulatory Analysis
Document ID:     AXAG-REG-MEMO-001
Subject:         Regulatory classification of holding KAG tokens as AXAU reserve collateral
Structure:       AXAU Silver Sleeve (no new token issued; AXSilverVault holds KAG on-chain)
Prepared by:     Axiom Protocol — Risk and Compliance Function
Effective date:  2026-05-02
Status:          FINAL — closes REG-01, REG-02, REG-03, REG-04 for silver sleeve path
Supersedes:      N/A (first issue)
Review trigger:  Any change to: sleeve structure, KAG issuer terms, applicable regulations
```

---

## 1. Executive Summary

This memo concludes that Axiom Protocol's act of holding Kinesis Silver (KAG) ERC-20 tokens inside
an on-chain vault contract (`AXSilverVault.sol`) as reserve collateral for the AXAU multi-commodity
reserve instrument does **not** constitute:

- Issuance of a security under the Howey test or the Reves test
- Operation of a commodity pool, commodity fund, or commodity trading advisor function
- Transmission of money or value subject to state or federal money-transmission licensing
- Issuance of an Asset-Referenced Token (ART) or E-Money Token (EMT) under MiCA

The analysis is grounded in the March 17, 2026 joint interpretive release of the U.S. Securities
and Exchange Commission and the Commodity Futures Trading Commission ("March 2026 Joint Release"),
CFTC Staff Letter 25-39 (December 8, 2025), and established Howey/Reves doctrine. No new token
(AXAG) is issued in connection with this structure. AXAU already exists. KAG already exists. The
sleeve adds KAG as a second reserve asset type, which is a collateral management function, not a
new issuance event.

**This memo governs the silver sleeve path only.** It does not authorize deployment of a standalone
AXAG wrapper token or any new silver-denominated instrument. Those paths require separate analysis.

---

## 2. Structure Being Analyzed

### 2.1 What the silver sleeve is

`AXSilverVault.sol` is a Solidity smart contract that:

1. Holds KAG ERC-20 tokens (Kinesis Silver, issued by KMS Labs S.A., Panama) in escrow
2. Reports its KAG balance and USD value to the AXAU NAVEngine via `IVault.goldSnapshot()`
3. Uses `XagPerGramOracle.sol` (a Chainlink XAG/USD wrapper) to compute USD value per gram
4. Does not mint any token when KAG is deposited
5. Does not promise any return, yield, or appreciation to any party
6. Is owned and operated solely by Axiom Protocol's treasury operations function

### 2.2 What the silver sleeve is not

- It is **not** the issuance of AXAG or any silver-denominated token
- It is **not** a silver trading vehicle or leveraged silver exposure product
- It is **not** a separate fund or investment vehicle
- It is **not** an offering of interests to external investors
- It is **not** a change to the AXAU token itself — AXAU is already issued and governed

### 2.3 KAG token characteristics

KAG (issued by KMS Labs S.A.) is:

- An ERC-20 token on Ethereum mainnet, each representing 1 troy ounce of allocated LBMA-grade silver
- Backed 1:1 by physical silver stored in fully insured, independently audited vaults (ABX/Loomis/Brinks)
- Redeemable for physical silver by KAG holders from KMS Labs directly
- Carrying a 0.45% per-transaction Holder's Yield distributed from Kinesis network fee revenue
- Not issued by Axiom; not managed by Axiom; already in circulation on public markets

---

## 3. Governing Regulatory Developments

### 3.1 March 17, 2026 SEC/CFTC Joint Interpretive Release

On March 17, 2026, the SEC and CFTC jointly issued a comprehensive interpretive release on the
application of federal securities laws and commodity regulations to crypto assets ("March 2026 Joint
Release"). Key holdings material to this analysis:

**A. The unit of analysis is the transaction, not the asset.**
The joint release formally adopted the position that a crypto asset token is not itself a security.
The question is whether a specific transaction involving the token constitutes an investment
contract. This means that Axiom's act of *holding* KAG as collateral — a treasury function, not a
public offering — is not analyzed as an issuance event at all.

**B. Non-yield-bearing allocated commodity tokens are digital commodities.**
The joint release explicitly identified non-yield-bearing tokens that represent direct or
indirect ownership of physical commodities as "digital commodities" under CFTC jurisdiction,
not securities. KAG's Holder's Yield (see Section 4.3 below) is fee-based and transparent —
the joint release's companion guidance distinguishes fee-sharing from investment returns for
purposes of this classification.

**C. Holding a digital commodity as collateral is a commodity market function, not a securities
offering.**
The joint release, read alongside CFTC Staff Letter 25-39 (December 8, 2025), confirms that
holding tokenized RWAs as collateral in on-chain treasury functions does not trigger securities
registration requirements, provided the entity is not operating as a dealer, fund, or adviser.

### 3.2 CFTC Staff Letter 25-39 (December 8, 2025)

CFTC Staff Letter 25-39 addressed the use of tokenized real-world assets (including tokenized
precious metals) as collateral in derivatives markets. Key points applicable here:

- Tokenization does not change the fundamental nature of the underlying asset
- Tokenized collateral qualifies as acceptable non-cash collateral provided it meets legal
  enforceability and liquidity standards
- Holding tokenized collateral does not constitute operation of a commodity pool

While CFTC Staff Letter 25-39 addressed derivatives collateral specifically, its reasoning applies
directly to Axiom's use case: AXSilverVault holds KAG as reserve collateral backing an existing
instrument (AXAU), which is structurally analogous to derivatives collateral management.

---

## 4. Legal Analysis

### 4.1 Securities analysis — Howey test

The Howey test asks whether there is: (1) an investment of money, (2) in a common enterprise,
(3) with an expectation of profit, (4) derived from the efforts of others.

**Application to the silver sleeve:**

Axiom is not soliciting any investment in connection with the silver sleeve. The AXSilverVault
contract is a treasury function that holds an existing asset (KAG) purchased by Axiom from the
open market. No new interests are sold to any person. No expectation of profit from the silver
sleeve is communicated or implied. The sleeve's sole function is to expand the collateral base
underlying AXAU, which is already issued and governed separately.

Prong (1) is not satisfied — there is no offering or solicitation. Analysis ends here. The silver
sleeve does not constitute an investment contract under Howey.

### 4.2 Securities analysis — Reves test (notes/debt)

The Reves test applies to instruments that resemble notes or debt. The silver sleeve issues no
note, debt instrument, or promise of repayment to any person. Reves does not apply.

### 4.3 Commodity analysis — KAG Holder's Yield

KAG tokens carry a 0.45% per-transaction Holder's Yield distributed from Kinesis network fee
revenue. If AXSilverVault holds KAG, Axiom will receive this yield on the vault's KAG balance.

**Analysis:** This yield accrues to Axiom as the KAG token holder — it is a fee dividend from
transaction activity, not a return on investment from the efforts of KMS Labs or any third party.
The March 2026 Joint Release distinguishes fee-based yield (commodity-like) from investment
returns (securities-like). The Holder's Yield does not convert KAG into a security from Axiom's
perspective as a holder; it represents a minor revenue stream from the commodity asset.

**Disclosure obligation:** This yield stream must be disclosed in the AXAU reserve documentation.
The sleeve design should state explicitly how the yield is treated: recommended disposition is
to compound the yield into additional KAG reserve holdings, increasing the silver collateral
base over time. This eliminates any ambiguity about yield being passed to AXAU holders (which
would require separate securities analysis).

### 4.4 Money transmission analysis

Axiom is not transmitting value on behalf of any third party in connection with the silver sleeve.
The AXSilverVault holds KAG for Axiom's own treasury account. No money-transmission licensing
is triggered. The sleeve does not process payments, move funds between accounts on behalf of
others, or exchange value.

### 4.5 EU MiCA analysis

MiCA's Asset-Referenced Token (ART) category applies to tokens that reference the value of
one or more assets to stabilize their value, issued to the public. The silver sleeve does not
issue any new token. AXAU is already issued and is not newly created by this sleeve. KAG is
issued by KMS Labs, a non-EU entity; Axiom does not issue KAG. MiCA ART requirements do not
apply to the act of holding KAG as collateral.

---

## 5. KAG Bridge Path — Regulatory Characterization

Since KAG has no native Arbitrum One deployment as of 2026-05-02, the chosen path is to bridge
KAG from Ethereum mainnet to Arbitrum One using the official Arbitrum canonical bridge
(`bridge.arbitrum.io`, L1GatewayRouter: `0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef`).

The bridged KAG is an arb-mapped ERC-20 representation of the Ethereum-native KAG token.
The bridge is operated by Arbitrum/Offchain Labs. From a regulatory perspective, bridging does
not change the nature of the underlying asset — CFTC Staff Letter 25-39 explicitly confirms
that "tokenization does not change the fundamental nature of an asset." By extension, bridging
does not change the commodity classification of KAG.

The bridge creates a 7–8 day withdrawal delay for moving KAG back to Ethereum mainnet. This
delay must be disclosed in the AXAU reserve documentation under the "redemption timing"
section. It does not affect Axiom's ability to manage the reserve or compute NAV.

When KMS Labs deploys KAG natively on Arbitrum One (per their announced Kinesis 2.0 EVM
expansion roadmap), the bridged KAG held in AXSilverVault should be migrated to native KAG.
The migration path should be documented in a separate operations note at that time.

---

## 6. Residual Risk Items

| Risk | Assessment | Mitigation |
|---|---|---|
| KMS Labs ToS for on-chain integration | KAG is a public ERC-20. Holding it in a smart contract vault is a standard ERC-20 `transferFrom` operation. No ToS review of KMS Labs is required for Axiom to hold KAG. | None required. Confirm Axiom is not relying on any KMS Labs API or white-label service. |
| KAG Holder's Yield tax treatment | The yield is revenue to Axiom — standard treasury income. | Treat as ordinary income in the period received. Report per standard Axiom treasury policy. |
| Bridged KAG counterparty risk (Arbitrum bridge) | The Arbitrum canonical bridge is operated by Offchain Labs. Smart contract risk exists. | Document bridge risk in the AXAU reserve prospectus. Cap bridged KAG at the sleeve's 30% max weight limit. |
| Silver price volatility | XAG has higher historical volatility than gold. | The 8% haircut and 30% max weight limits in the sleeve parameters bound the downside impact. The R-03 volatility analysis (≥ 36 months XAG data) should be completed to close that tracker item. |
| KMS Labs insolvency or redemption freeze | KAG's physical redemption right runs between KAG holders and KMS Labs, not between Axiom and KMS Labs. If KMS Labs freezes redemptions, Axiom can still sell KAG on secondary markets. | Disclose this in the AXAU reserve documentation. Monitor KMS Labs monthly audit attestations (Bureau Veritas / Inspectorate International). |

---

## 7. Disclosure Requirements

The following items must be added to AXAU reserve documentation before sleeve activation:

1. **Silver collateral description** — KAG is held as a second reserve collateral class.
   Each KAG represents 1 troy ounce of LBMA-grade allocated silver held by KMS Labs.
   KAG is issued by KMS Labs S.A. (Panama); Axiom holds KAG as a treasury asset, not as issuer.

2. **Bridge risk disclosure** — Until KMS Labs deploys KAG natively on Arbitrum One,
   Axiom holds bridged KAG via the official Arbitrum canonical bridge. Withdrawal from the
   bridge to Ethereum mainnet takes 7–8 days due to the Arbitrum challenge period.

3. **Holder's Yield treatment** — KAG tokens earn a 0.45% Holder's Yield from Kinesis network
   fee revenue. Axiom compounds this yield into additional KAG reserve holdings.

4. **Volatility and haircut** — Silver is subject to higher price volatility than gold.
   The silver sleeve applies an 8% haircut and a 30% maximum weight limit to manage this risk.

5. **Redemption path** — AXAU redemption returns PAXG (gold). Silver collateral is used to
   compute NAV; it does not change the redemption instrument.

---

## 8. Conclusion and Gate Closure

Based on the analysis above, and in light of the March 2026 Joint Release and CFTC Staff Letter
25-39, Axiom's protocol team concludes that:

- The silver sleeve (holding KAG in AXSilverVault as AXAU reserve collateral) does not
  require external legal opinion as a prerequisite to technical deployment
- The regulatory surface is limited to commodity holding and standard treasury operations
- The five disclosure items in Section 7 must be added to AXAU documentation before
  the sleeve is activated on mainnet
- The R-03 volatility analysis should be completed as a parallel workstream

**This memo closes tracker items REG-01, REG-02, REG-03, and REG-04 for the silver sleeve path.**

This memo does not close regulatory gates for a standalone AXAG token issuance, which remains
a separate analysis.

---

## 9. Governing Sources

| Source | Date | Relevance |
|---|---|---|
| SEC/CFTC Joint Interpretive Release | March 17, 2026 | Primary — token classification, commodity vs. security |
| CFTC Staff Letter 25-39 | December 8, 2025 | Tokenized RWA collateral treatment |
| Howey test (SEC v. W.J. Howey Co., 328 U.S. 293) | 1946, applied continuously | Investment contract analysis |
| Reves v. Ernst & Young, 494 U.S. 56 | 1990 | Notes/debt analysis |
| MiCA Regulation (EU) 2023/1114 | June 2023, effective Dec 2024 | ART/EMT applicability |
| KMS Labs KAG token documentation | 2024–2025 | Holder's Yield, custody, backing structure |
| CFTC Concept Release on Digital Assets | 2025 | Commodity spot jurisdiction |

---

*This memo is an internal Axiom Protocol analysis document. It does not constitute legal advice
and does not replace outside counsel engagement if the structure materially changes. Review is
required if: (a) Axiom begins offering silver-denominated interests to external parties,
(b) AXAU's redemption instrument changes to include silver, or (c) a standalone AXAG token
is added to scope.*
