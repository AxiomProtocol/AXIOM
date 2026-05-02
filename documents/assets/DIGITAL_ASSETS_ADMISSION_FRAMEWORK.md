# Axiom Digital Assets Admission Framework

Document class: Operational Framework
Status: Active — governs all read-only external digital-asset admission
Version: 1.0
Effective: 2026-05-02
Implementation: `lib/assets/registry.ts`
Companion: `documents/assets/DIGITAL_ASSETS_CANDIDATE_LIST.md`

---

## Status Notice

This Framework governs read-only support for external digital assets in Axiom. It does not authorize custody, issuance, lending, swaps, banking rails, or write paths of any kind. It applies the same disclosure-first, read-only pattern already in production for KAG (`lib/commodities/kagService.ts`).

---

## 1. Purpose

The Axiom Digital Assets Admission Framework (the "Framework") defines how external digital assets are admitted into Axiom for read-only support. It generalizes the pattern proven for KAG so that additional digital commodities, reserve-grade stable assets, and strategic crypto assets can be supported with the same discipline.

The Framework defines:

- What "admission" means for an external asset
- The criteria each candidate must satisfy
- A six-dimension readiness scoring model
- The disclosure, pricing, custody, and risk requirements that apply at each tier
- Conditions that disqualify a candidate outright

The Framework does NOT govern:

- Reserve admission into AXAU — that workflow is governed by `documents/commodities/COMMODITY_EXPANSION_FRAMEWORK.md`
- Issuance of any Axiom-branded wrapper, derivative, or synthetic of an external asset
- Banking, payment, or custodial integration of an external asset
- Lending markets, vaults, or swap pools backed by an external asset

**Read-only admission means:** the asset is recognized within Axiom for portfolio visibility, balance display, spot-price disclosure, and educational/disclosure surfaces. No write paths are introduced. No funds move under Axiom control. No Axiom contract holds the asset. No Axiom service custodies the asset's underlying reserves.

**Truth statements preserved by this Framework:**
- AXUSD is the Axiom-issued stable asset layer.
- AXAU is the Axiom reserve framework, with gold as the live module.
- KAG is an externally supported silver asset.
- AXAG is not live and is not issued.

Admission of any asset under this Framework cannot change any of the above.

---

## 2. Admission Criteria

A candidate must satisfy all of the following before admission to any tier above OUT OF SCOPE.

| # | Criterion | Verification Required |
| - | --------- | --------------------- |
| A | Verified issuer | Issuer is named, legally existing, and publishes contract addresses through an official channel |
| B | Verified contract | Canonical contract address published by the issuer; bytecode present at the address; verified source on a block explorer |
| C | Public market data source | Spot price available from at least one institutional-grade public source (Chainlink, CoinGecko, CoinMarketCap, or equivalent), with a documented failure mode |
| D | Custody/redeemability clarity | Custody model is publicly disclosed and consistent across issuer documentation; redemption rights (if any) are documented and not in dispute |
| E | Regulatory framework named | The jurisdiction and legal framework under which the asset is issued is publicly stated |
| F | Disclosure compatibility | Axiom can describe the asset in compliant language without absolutist claims, yield promises, or misrepresentation of issuer relationship — passes `lib/glossary.ts` review |
| G | Read-only integration is possible | Spot price + ERC-20 (or equivalent) `balanceOf` reads are sufficient; no oracle deployment, no contract authorship, no custody onboarding required |

Failure on any single criterion blocks admission to READY NOW. Failure on multiple criteria moves the candidate to NEEDS DILIGENCE or OUT OF SCOPE depending on remediation feasibility.

---

## 3. Readiness Scoring Model

Each candidate is scored across six dimensions. Each dimension is scored 0–3, where **lower scores mean less friction**. Total possible score: 0 (perfect) to 18 (worst).

| Dimension | 0 — Best | 1 | 2 | 3 — Worst |
| --------- | -------- | - | - | --------- |
| **D1 — Issuer verification** | Regulated by NYDFS, OCC, or equivalent US prudential regulator | Regulated under named non-US prudential framework (TVTG, MiCA, FCA) | Issuer disclosed but unregulated | Anonymous or pseudonymous |
| **D2 — Contract confirmation** | Verified source, official issuer publication of address | Verified source, third-party publication | Bytecode present, source unverified | No on-chain contract |
| **D3 — Market data** | Chainlink + at least one secondary | Chainlink only | CoinGecko or CoinMarketCap only | No public spot price |
| **D4 — Custody / redeemability** | Custodian named + redemption clear | Custodian named, redemption conditional | Custodian opaque OR no redemption | Reserves disputed or unproven |
| **D5 — Regulatory clarity** | Recognized as commodity, payment instrument, or regulated stable | Recognized as crypto-asset under named framework | Categorization uncertain | Subject to enforcement action or sanctions concern |
| **D6 — Disclosure compatibility** | Pre-existing institutional disclosure language available | Compatible with minor adaptation | Requires new disclosure pattern | Cannot be described under Axiom glossary |

### Tier Thresholds

| Status | Condition |
| ------ | --------- |
| **READY NOW** | Total ≤ 6 AND no single dimension scores 3 |
| **NEEDS DILIGENCE** | Total 7–10 AND no single dimension scores 3 |
| **OUT OF SCOPE** | Total > 10 OR any single dimension scores 3 |

The READY NOW threshold of 6 is calibrated against the live KAG profile — KAG totals 5 across the six dimensions and is in production. An asset that reaches the KAG profile has, by construction, satisfied the disclosure-first read-only pattern.

Scoring is documentary. Each candidate's score must be supported by cited sources before admission. Scores are reviewed annually or on material change.

The scoring is implemented in `lib/assets/registry.ts` via `deriveAdmissionStatus(score)` and `deriveRiskLabel(score)`.

**Conservative downgrades are permitted.** A reviewer may hold an asset more conservatively than its score suggests when there is a documented diligence item open — for example, an asset whose score derives `READY_NOW` may be stored as `NEEDS_DILIGENCE` while a contract address verification or a custodian attestation review is pending. The rationale must be recorded in the asset's `notes` field.

**Manual upgrades are never permitted.** The stored `admissionStatus` must never be more permissive than the derived value. `checkAdmissionConsistency` enforces this asymmetry: it allows downgrades silently and flags upgrades as dangerous mismatches.

---

## 4. Categories

### 4.1 READY NOW

Read-only support may be activated through the standard pattern established by KAG:

- Asset registered in `lib/assets/registry.ts` with `admissionStatus: 'READY_NOW'` and `readOnlySupported: true`
- Per-asset service module under `lib/assets/services/<symbol>Service.ts` (or `lib/commodities/<symbol>Service.ts` for commodities, matching existing convention)
- Per-asset API route under `pages/api/assets/<symbol>/` for status and balance reads
- Public detail page under `pages/assets/<symbol>.tsx` (or `pages/commodities/<symbol>.tsx` for commodities)
- Disclosure surface published in line with the issuer's actual posture
- No write paths
- All reads conform to the failure-mode behavior of `fetchKagUsdPrice` — null fields with structured warnings, no fallback or synthetic pricing

### 4.2 NEEDS DILIGENCE

Asset enters the registry with `admissionStatus: 'NEEDS_DILIGENCE'`. **No public surface is created** until open dimensions are remediated and the candidate is re-scored. Diligence items are tracked in `documents/assets/diligence/<symbol>_DILIGENCE.md`.

Typical NEEDS DILIGENCE conditions:
- Custody opacity (insufficient public attestation cadence)
- Yield-bearing wrapper requiring careful disclosure of yield source
- Securities classification under active review (e.g., tokenized treasuries)
- Regulatory action or material litigation against the issuer
- Decentralized issuer requiring a new disclosure pattern

### 4.3 OUT OF SCOPE

Asset is recorded in the registry with `admissionStatus: 'OUT_OF_SCOPE'` and a documented `rejectionReason`. **No public surface is created.** Out-of-scope status is reviewable on changed circumstance.

AXAG is recorded as OUT OF SCOPE with rejection reason "not live and not issued." This preserves truth-statement alignment across the registry and all public surfaces.

---

## 5. Disclosure Requirements

Every admitted asset (READY NOW or NEEDS DILIGENCE with a future surface) must carry the following standardized disclosure on every Axiom surface that displays the asset. The KAG disclosure pattern (`getKagDisclosure()` in `lib/commodities/kagService.ts`) is the canonical reference.

1. **Issuer statement** — Names the issuer and the issuer's regulatory framework.
2. **Axiom relationship statement** — "Axiom supports [SYMBOL] as an external asset. Axiom does not issue [SYMBOL]. Axiom does not custody the underlying [reserve, if applicable]."
3. **Custody statement** — How and by whom the asset's reserves (or referenced asset) are custodied.
4. **Redemption statement** — Whether redemption rights exist and through what process.
5. **Regulatory statement** — The legal framework and what it does/does not cover. No overclaim of US regulatory status for non-US-regulated issuers.
6. **Pricing source statement** — The exact upstream source and its failure-mode behavior.
7. **Read-only scope statement** — Explicit statement that Axiom integration is read-only.

For commodity assets specifically, an **AXAG/wrapper non-issuance statement** must appear on every silver-related surface: "AXAG is not live and is not issued." This applies regardless of which silver-backed asset is admitted.

All language must pass `lib/glossary.ts` review — no absolutist claims, no yield promises, no forbidden phrases, no asterisks or hashtags in body text.

---

## 6. Pricing and Oracle Requirements

| Tier | Minimum pricing requirement |
| ---- | --------------------------- |
| READY NOW | At least one institutional public source (Chainlink, CoinGecko, CoinMarketCap, or equivalent). Documented failure mode: pricing fields return null with structured warnings; no fallback or synthetic pricing |
| NEEDS DILIGENCE | Same as READY NOW, plus a documented secondary source plan if the primary is single-vendor |
| OUT OF SCOPE | N/A |

**No oracle deployment is required.** Read-only integration consumes existing public price feeds. If no Chainlink feed exists on Arbitrum One, CoinGecko or CoinMarketCap is acceptable provided the failure-mode behavior is identical to the KAG pattern: null fields + structured warning + stale-cache window + no fallback pricing.

**No price aggregation logic** is permitted in the read-only path. Each asset surface displays exactly one price from exactly one upstream source (with cache and stale-window logic identical to `fetchKagUsdPrice`).

The `pricingSourceTier` field on each registry entry records the tier of the primary price source:
- `CHAINLINK_PRIMARY` — Chainlink as primary source
- `CHAINLINK_AND_SECONDARY` — Chainlink primary plus a documented secondary
- `COINGECKO_PRIMARY` — CoinGecko as primary
- `COINMARKETCAP_PRIMARY` — CoinMarketCap as primary
- `NONE` — no price source (OUT OF SCOPE)

---

## 7. Issuer and Custody Verification Requirements

| Verification | What must be filed | Where |
| ------------ | ------------------ | ----- |
| Issuer entity | Legal name, jurisdiction, regulator, registration document | `lib/assets/registry.ts` fields `issuer` and `issuerRegulator` |
| Contract address | Address, chain, chain ID, decimals, standard, verification status, source URL | Registry fields `contractAddress`, `contractConfirmed`, `contractStandard`, `decimals`, plus `disclosureLinks` |
| Custody model | Public description of how reserves are held, by whom, with what attestation cadence | Registry field `custodyModel` and the asset's service module |
| Redemption rights | Documented terms of redemption (if any), minimum thresholds, KYC requirements | Registry field `redeemabilityClarity` and the asset's disclosure surface |
| Regulatory posture | Named framework (TVTG, MiCA, NYDFS, OCC, etc.) | Registry field `issuerRegulator` and disclosure surface |

Axiom does not custody any external asset listed in this registry. Axiom does not represent any external issuer's reserves as Axiom's own. All custody and redemption questions are deferred to the issuer.

The registry enforces this with hard-coded fields:
- `axiomCustodies: false` — typed as the literal `false`
- `axiomIssues: false` — typed as the literal `false`

Any attempt to add an asset where Axiom would custody or issue must be made through a different framework, not this one.

---

## 8. Risk Labeling Standard

Every admitted asset carries a single risk label that summarizes its profile across the six readiness dimensions.

| Label | Meaning | Conditions |
| ----- | ------- | ---------- |
| `TIER_1_VERIFIED` | Issuer regulated by US prudential authority (NYDFS, OCC) or equivalent; contract verified; market data Chainlink-grade; custody and redemption clear | Total readiness score ≤ 2 |
| `TIER_2_REVIEWED` | Issuer regulated under named non-US framework or with verified contract and disclosed custody; market data CoinGecko/CMC or better; reviewed under Framework | Total readiness score 3–6 |
| `TIER_3_RESTRICTED` | Held in registry for reference only — NEEDS DILIGENCE or OUT OF SCOPE; not displayed on public surface without further review | Total readiness score > 6 OR any single dimension at 3 |

Risk label is displayed alongside the asset on every internal surface. It is NOT displayed on public surfaces unless required for institutional disclosure.

---

## 9. Rejection Conditions

A candidate is OUT OF SCOPE if any of the following apply. These are absolute disqualifiers, not scored.

| Condition | Reason |
| --------- | ------ |
| Anonymous or pseudonymous issuer | Cannot file Section 7 verification; fails Criterion A |
| No on-chain contract or no canonical address | Fails Criterion B; cannot read balance |
| No public market data source | Fails Criterion C; cannot price |
| Algorithmic stablecoin without backing reserve | Reserve risk; not "reserve-grade" |
| Privacy coin or asset on US/EU/UK sanctions list | Regulatory risk |
| Asset under active enforcement action where the asset itself is the subject | Regulatory risk |
| Synthetic or derivative wrapper without disclosed underlying | Fails Criterion D |
| Asset whose marketing materials would force Axiom into prohibited language (yield guarantees, "100% backed", "fully insured", etc.) | Fails Criterion F |
| Asset where read-only integration would require Axiom to deploy a contract, run an oracle, or take custody | Fails Criterion G |
| Memecoin or asset without an institutional use-case fit for Axiom | Out of fit |
| Any Axiom-branded wrapper that is not yet live (AXAG today) | Conflicts with truth statement |

Rejection is recorded with the failed criterion(ia) and the date in the registry's `rejectionReason` field.

---

## 10. Lifecycle and Review

1. **Candidate identification.** New candidates are added to `documents/assets/DIGITAL_ASSETS_CANDIDATE_LIST.md` for evaluation.
2. **Scoring.** Candidate is scored across the six dimensions with cited evidence.
3. **Admission decision.** Status derived per Section 3 thresholds. Stored value must match derived value.
4. **Registry entry.** Asset added to `lib/assets/registry.ts` with full evidence.
5. **Surface activation** (READY NOW only). Service module, API route, and public page deployed using the KAG pattern.
6. **Review cadence.** Annual review of all entries; immediate review on material change (issuer regulatory action, contract change, custody change, attestation gap).
7. **Demotion or removal.** An asset can be demoted to NEEDS DILIGENCE or OUT OF SCOPE at any time. Demotion immediately disables public surface; removal deletes the entry.

---

## 11. Hard Boundaries

Things this Framework cannot authorize, regardless of admission tier:

1. **Issuance.** Axiom does not issue external assets. The Framework's `axiomIssues: false` field is a typed literal; cannot be changed.
2. **Custody.** Axiom does not custody external assets or their reserves. The `axiomCustodies: false` field is a typed literal; cannot be changed.
3. **Wrapping.** No Axiom-branded wrapper or derivative of an external asset may be issued under this Framework.
4. **Lending and swaps.** This Framework does not authorize any lending market, swap pool, or yield product backed by a registered asset.
5. **Banking rails.** This Framework does not authorize any ACH, wire, or fiat-redemption integration for any registered asset.
6. **Reserve admission into AXAU.** Crossing into AXAU as a reserve component requires the four-stage CEF workflow in `documents/commodities/COMMODITY_EXPANSION_FRAMEWORK.md`. Admission under this Framework is a precondition but not a substitute.

---

*End of Digital Assets Admission Framework v1.0*
