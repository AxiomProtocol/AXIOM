# Commodity Candidate Tracker

**Document:** `documents/commodities/COMMODITY_CANDIDATE_TRACKER.md`
**Status:** Internal — operator / developer reference
**Version:** 1.0.0

> **Important:** This tracker is for internal pipeline use only. No asset listed here is
> publicly supported unless it has been through the full admission pipeline,
> governance approval, launch-gate sign-off, and has been added to
> `lib/commodities/registry.ts` with `productStatus: 'EXTERNAL_SUPPORTED'` or `'LIVE'`.
>
> Do not mark any new asset as supported based on this document alone.
> Current truth: AXAU = LIVE, KAG = EXTERNAL_SUPPORTED, AXAG = NOT_LIVE_NOT_ISSUED.

---

## Legend

| Column | Description |
|---|---|
| **Symbol** | Token ticker |
| **Name** | Full asset name |
| **Issuer** | Issuing entity |
| **Chain** | Blockchain / network |
| **Contract Verified** | ✅ Verified on block explorer / ❌ Not verified / ⚠️ Unknown |
| **Market Data Source** | Canonical pricing source identified |
| **Reserve/Backing Clarity** | ✅ Fully disclosed / ⚠️ Partial / ❌ Missing |
| **Redemption/Custody Clarity** | ✅ Clear / ⚠️ Partial / ❌ Missing |
| **Read-Only Integration Friction** | LOW / MEDIUM / HIGH |
| **Status Recommendation** | READY_NOW / NEEDS_DILIGENCE / OUT_OF_SCOPE |
| **Blocker Notes** | Open blockers preventing admission |

---

## Section A — Already Classified (Reference Only)

These assets are already classified in `lib/commodities/registry.ts`.
They are listed here as reference benchmarks for the pipeline.

| Symbol | Name | Issuer | Chain | Contract Verified | Market Data Source | Reserve/Backing Clarity | Redemption/Custody Clarity | Read-Only Integration Friction | Status Recommendation | Blocker Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| AXAU | Axiom Gold Reserve | Axiom Protocol | Arbitrum One | ✅ Verified (Arbiscan) | CoinGecko pax-gold / Chainlink XAU/USD | ✅ Full (PAXG + direct gold; NAV on-chain) | ✅ Clear (KYC/AML; MintRedeemController) | LOW | READY_NOW | None — already LIVE; no admission action |
| KAG | Kinesis Silver | KMS Labs / Kinesis ecosystem | Ethereum mainnet | ✅ Verified (Etherscan) | CoinGecko kinesis-silver | ✅ Full (1 KAG = 1g LBMA silver; Kinesis PoR) | ✅ Clear (KMS Labs / Kinesis terms) | LOW | READY_NOW | None — already EXTERNAL_SUPPORTED; no admission action |
| AXAG | Axiom Silver Reserve (Not Issued) | n/a | n/a | ❌ Not deployed | n/a (not issued) | ❌ Missing (no reserve; not issued) | ❌ Missing (no custody; not issued) | HIGH | OUT_OF_SCOPE | (1) Not issued — no token; (2) Custody resolution required; (3) Governance proposal required. DO NOT ACTIVATE. |

---

## Section B — Candidate Pipeline

This section tracks future commodity candidates under evaluation.
All entries below are placeholders. No asset listed here is publicly supported.

### Candidate Template

> Copy this template when adding a new candidate.

| Field | Value |
|---|---|
| **Symbol** | `[SYMBOL]` |
| **Name** | [Full asset name] |
| **Issuer** | [Issuing entity, jurisdiction] |
| **Chain** | [Blockchain / network] |
| **Contract Address** | [Address or "None"] |
| **Contract Verified** | ⚠️ Unknown |
| **Contract Audited** | ⚠️ Unknown |
| **Market Data Source** | [Source or "TBD"] |
| **On-Chain Oracle** | ⚠️ Unknown |
| **Reserve/Backing Clarity** | ⚠️ Unknown |
| **Proof-of-Reserves** | ⚠️ Unknown |
| **Custodian Regulated** | ⚠️ Unknown |
| **Redemption/Custody Clarity** | ⚠️ Unknown |
| **Read-Only Integration Friction** | TBD |
| **Intended Product Status** | EXTERNAL_SUPPORTED |
| **Status Recommendation** | NEEDS_DILIGENCE |
| **Blocker Notes** | Evidence gathering in progress |
| **Evidence Package Ref** | TBD |
| **Operator Notes** | [Any additional context] |
| **Created** | [YYYY-MM-DD] |
| **Created By** | [operator-alias] |

---

### B1 — PAXG (PAX Gold, Paxos)

**Category:** GOLD | **Intended status:** EXTERNAL_SUPPORTED (read-only)

| Field | Value |
|---|---|
| **Symbol** | `PAXG` |
| **Name** | PAX Gold |
| **Issuer** | Paxos Trust Company (NY, USA; NYDFS regulated) |
| **Chain** | Ethereum mainnet |
| **Contract Address** | `0x45804880De22913dAFE09f4980848ECE6EcbAf78` |
| **Contract Verified** | ✅ Verified (Etherscan) |
| **Contract Audited** | ✅ Audited |
| **Market Data Source** | CoinGecko pax-gold / Chainlink XAU/USD |
| **On-Chain Oracle** | ✅ Chainlink XAU/USD available |
| **Reserve/Backing Clarity** | ✅ Full (1 PAXG = 1 troy oz LBMA gold; NYDFS-regulated) |
| **Proof-of-Reserves** | ✅ Monthly attestation by Paxos |
| **Custodian Regulated** | ✅ NYDFS-regulated; Brink's vault |
| **Redemption/Custody Clarity** | ✅ Clear (Paxos terms; KYC required) |
| **Read-Only Integration Friction** | LOW |
| **Intended Product Status** | EXTERNAL_SUPPORTED |
| **Status Recommendation** | NEEDS_DILIGENCE |
| **Blocker Notes** | Already used as a reference price source (AXAU reserve sleeve). Formal external-supported page integration pending governance decision. |
| **Evidence Package Ref** | TBD |
| **Operator Notes** | PAXG is already referenced in the AXAU reserve model via CoinGecko pax-gold. Adding a formal EXTERNAL_SUPPORTED integration requires a governance decision on whether to add a /commodities/paxg page. Currently surfaced in insightsService.ts as an external asset. |
| **Created** | 2026-05-10 |
| **Created By** | axiom-ops |

---

### B2 — XAUT (Tether Gold)

**Category:** GOLD | **Intended status:** EXTERNAL_SUPPORTED (read-only)

| Field | Value |
|---|---|
| **Symbol** | `XAUT` |
| **Name** | Tether Gold |
| **Issuer** | TG Commodities Limited (BVI) |
| **Chain** | Ethereum mainnet / TRON |
| **Contract Address** | `0x68749665FF8D2d112Fa859AA851F9660f55F83fc` (Ethereum) |
| **Contract Verified** | ✅ Verified (Etherscan) |
| **Contract Audited** | ⚠️ Partial — refer to TG Commodities |
| **Market Data Source** | CoinGecko tether-gold / Chainlink XAU/USD |
| **On-Chain Oracle** | ✅ Chainlink XAU/USD available (proxy) |
| **Reserve/Backing Clarity** | ⚠️ Partial — Tether PoR methodology differs from Paxos |
| **Proof-of-Reserves** | ⚠️ Tether-style attestation; not independently audited to NYDFS standard |
| **Custodian Regulated** | ⚠️ TG Commodities Limited (BVI); jurisdiction clarity lower than Paxos |
| **Redemption/Custody Clarity** | ⚠️ BVI entity; redemption terms less standardized |
| **Read-Only Integration Friction** | MEDIUM |
| **Intended Product Status** | EXTERNAL_SUPPORTED |
| **Status Recommendation** | NEEDS_DILIGENCE |
| **Blocker Notes** | (1) BVI jurisdiction requires additional legal review; (2) PoR methodology needs independent verification; (3) Custody risk classification pending full diligence |
| **Evidence Package Ref** | TBD |
| **Operator Notes** | XAUT is surfaced in insightsService.ts comparisons. A formal EXTERNAL_SUPPORTED page integration requires completing the PoR and jurisdiction diligence. |
| **Created** | 2026-05-10 |
| **Created By** | axiom-ops |

---

### B3 — LBMA Physical Gold Token (Generic Placeholder)

**Category:** GOLD | **Intended status:** NEEDS_DILIGENCE → TBD

| Field | Value |
|---|---|
| **Symbol** | `[TBD]` |
| **Name** | LBMA-accredited physical gold token (issuer TBD) |
| **Issuer** | TBD |
| **Chain** | TBD |
| **Contract Address** | TBD |
| **Contract Verified** | ⚠️ Unknown |
| **Contract Audited** | ⚠️ Unknown |
| **Market Data Source** | TBD |
| **On-Chain Oracle** | ⚠️ Unknown |
| **Reserve/Backing Clarity** | ⚠️ Unknown |
| **Proof-of-Reserves** | ⚠️ Unknown |
| **Custodian Regulated** | ⚠️ Unknown |
| **Redemption/Custody Clarity** | ⚠️ Unknown |
| **Read-Only Integration Friction** | TBD |
| **Intended Product Status** | EXTERNAL_SUPPORTED |
| **Status Recommendation** | NEEDS_DILIGENCE |
| **Blocker Notes** | Issuer and contract not yet identified. Placeholder only. |
| **Evidence Package Ref** | TBD |
| **Operator Notes** | Placeholder for future LBMA-accredited gold token candidates beyond PAXG/XAUT. |
| **Created** | 2026-05-10 |
| **Created By** | axiom-ops |

---

### B4 — Platinum Token Placeholder

**Category:** PLATINUM | **Intended status:** DEFERRED

| Field | Value |
|---|---|
| **Symbol** | `[TBD]` |
| **Name** | Tokenized Platinum (candidate TBD) |
| **Issuer** | TBD |
| **Chain** | TBD |
| **Contract Address** | None identified |
| **Contract Verified** | ❌ Not identified |
| **Contract Audited** | ❌ Not identified |
| **Market Data Source** | CoinGecko / Chainlink XPT/USD (limited availability) |
| **On-Chain Oracle** | ❌ No production Chainlink XPT/USD on Arbitrum One |
| **Reserve/Backing Clarity** | ❌ No candidate identified |
| **Proof-of-Reserves** | ❌ No candidate identified |
| **Custodian Regulated** | ❌ Not assessed |
| **Redemption/Custody Clarity** | ❌ Not assessed |
| **Read-Only Integration Friction** | HIGH |
| **Intended Product Status** | DEFERRED |
| **Status Recommendation** | OUT_OF_SCOPE |
| **Blocker Notes** | (1) No production on-chain oracle for XPT on Arbitrum One; (2) No suitable tokenized platinum issuer identified; (3) Low liquidity in platinum token market |
| **Evidence Package Ref** | TBD |
| **Operator Notes** | Platinum is deferred per COMMODITY_EXPANSION_FRAMEWORK.md. Return to this once a production oracle and regulated issuer can be identified. |
| **Created** | 2026-05-10 |
| **Created By** | axiom-ops |

---

### B5 — Energy Token Placeholder (Oil / Natural Gas)

**Category:** ENERGY | **Intended status:** DEFERRED

| Field | Value |
|---|---|
| **Symbol** | `[TBD]` |
| **Name** | Tokenized energy commodity (candidate TBD) |
| **Issuer** | TBD |
| **Chain** | TBD |
| **Contract Address** | None identified |
| **Contract Verified** | ❌ Not identified |
| **Contract Audited** | ❌ Not identified |
| **Market Data Source** | TBD |
| **On-Chain Oracle** | ⚠️ Limited Chainlink energy feeds; coverage varies by chain |
| **Reserve/Backing Clarity** | ❌ No candidate identified |
| **Proof-of-Reserves** | ❌ Not applicable in standard form |
| **Custodian Regulated** | ❌ Not assessed |
| **Redemption/Custody Clarity** | ❌ Physical delivery complexity; high regulatory overhead |
| **Read-Only Integration Friction** | HIGH |
| **Intended Product Status** | DEFERRED |
| **Status Recommendation** | OUT_OF_SCOPE |
| **Blocker Notes** | (1) Physical delivery complexity; (2) High regulatory overhead; (3) No suitable tokenized energy candidate identified; (4) Oracle coverage limited |
| **Evidence Package Ref** | TBD |
| **Operator Notes** | Energy commodities are explicitly deferred per COMMODITY_EXPANSION_FRAMEWORK.md. |
| **Created** | 2026-05-10 |
| **Created By** | axiom-ops |

---

### B6 — Agricultural Token Placeholder

**Category:** AGRICULTURAL | **Intended status:** DEFERRED

| Field | Value |
|---|---|
| **Symbol** | `[TBD]` |
| **Name** | Tokenized agricultural commodity (candidate TBD) |
| **Issuer** | TBD |
| **Chain** | TBD |
| **Contract Address** | None identified |
| **Contract Verified** | ❌ Not identified |
| **Contract Audited** | ❌ Not identified |
| **Market Data Source** | TBD |
| **On-Chain Oracle** | ❌ Very limited on-chain oracle coverage for agricultural commodities |
| **Reserve/Backing Clarity** | ❌ Perishability risk; complex reserve model |
| **Proof-of-Reserves** | ❌ Not applicable in standard form |
| **Custodian Regulated** | ❌ Not assessed |
| **Redemption/Custody Clarity** | ❌ Physical delivery complexity; perishability |
| **Read-Only Integration Friction** | HIGH |
| **Intended Product Status** | DEFERRED |
| **Status Recommendation** | OUT_OF_SCOPE |
| **Blocker Notes** | (1) Perishability risk incompatible with current reserve model; (2) No on-chain oracle coverage; (3) Complex custodian and delivery requirements |
| **Evidence Package Ref** | TBD |
| **Operator Notes** | Agricultural commodities are explicitly deferred per COMMODITY_EXPANSION_FRAMEWORK.md. |
| **Created** | 2026-05-10 |
| **Created By** | axiom-ops |

---

## Section C — Admission Summary Table

Quick-reference summary of all candidates. Updated manually by operator.

| Symbol | Category | Readiness | Risk | Open Blockers | Last Updated |
|---|---|---|---|---|---|
| AXAU | GOLD | READY_NOW (already LIVE) | LOW | 0 | 2026-05-10 |
| KAG | SILVER | READY_NOW (already EXTERNAL_SUPPORTED) | LOW | 0 | 2026-05-10 |
| AXAG | SILVER | OUT_OF_SCOPE (NOT_LIVE_NOT_ISSUED) | HIGH | 3 | 2026-05-10 |
| PAXG | GOLD | NEEDS_DILIGENCE | LOW | 1 | 2026-05-10 |
| XAUT | GOLD | NEEDS_DILIGENCE | MEDIUM | 3 | 2026-05-10 |
| LBMA Gold TBD | GOLD | NEEDS_DILIGENCE | TBD | — | 2026-05-10 |
| Platinum TBD | PLATINUM | OUT_OF_SCOPE | HIGH | 3 | 2026-05-10 |
| Energy TBD | ENERGY | OUT_OF_SCOPE | HIGH | 4 | 2026-05-10 |
| Agricultural TBD | AGRICULTURAL | OUT_OF_SCOPE | HIGH | 3 | 2026-05-10 |

---

## Section D — Rejected Candidates (Archive)

Assets that have been formally rejected or are prohibited by the
Commodity Expansion Framework (Section 12).

| Symbol | Name | Reason | Date |
|---|---|---|---|
| *(none yet)* | — | — | — |

---

*Axiom Protocol — Commodity Candidate Tracker — Internal Reference — v1.0.0*
