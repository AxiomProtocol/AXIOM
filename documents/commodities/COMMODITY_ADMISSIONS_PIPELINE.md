# Commodity Admissions Pipeline

**Document:** `documents/commodities/COMMODITY_ADMISSIONS_PIPELINE.md`
**Status:** Internal — operator / developer reference
**Version:** 1.0.0

---

## 1. Purpose

The Commodity Admissions Pipeline is a repeatable internal process for evaluating
and onboarding future commodity assets into Axiom Protocol through the
Tokenized Commodities Integration Layer (TCIL).

**What this pipeline does:**

- Provides a structured, evidence-based evaluation process for commodity candidates
- Ensures every integration decision is traceable and auditable
- Prevents premature or undocumented additions to the commodity registry
- Produces a formal admission record per candidate with a readiness classification

**What this pipeline does NOT do:**

- It does not approve or deploy any asset. Governance approval and launch-gate
  sign-off are required for all new integrations.
- It does not activate AXAG. AXAG remains `NOT_LIVE_NOT_ISSUED`.
- It does not introduce write paths, banking rails, or contract writes.
- It does not expose candidates as publicly supported assets.

**Current truth preserved:**

| Asset | Status |
|---|---|
| AXAU | `LIVE` — Axiom-issued gold reserve module |
| KAG | `EXTERNAL_SUPPORTED` — read-only silver asset (KMS Labs / Kinesis) |
| AXAG | `NOT_LIVE_NOT_ISSUED` — deferred; not activated |

---

## 2. Admission Workflow

```
Candidate Identification
        │
        ▼
Fill CommodityAdmissionCandidate schema
(lib/commodities/admissions.ts)
        │
        ▼
Run evaluateAdmission(candidate)
        │
        ├──► READY_NOW → Stage 3: Governance Vote → Launch Gate → Registry
        │
        ├──► NEEDS_DILIGENCE → Gather missing evidence → Re-evaluate
        │
        └──► OUT_OF_SCOPE → Stop / document → Reject or defer
```

### Step-by-step

1. **Identify candidate** — Operator identifies a potential commodity asset.
   Add a placeholder row to `COMMODITY_CANDIDATE_TRACKER.md`.

2. **Complete the admission schema** — Fill all fields of
   `CommodityAdmissionCandidate` in `lib/commodities/admissions.ts`.
   All fields are required. Unknown evidence must be explicitly marked
   (`false`, empty string, or `"none"`).

3. **Run admission evaluation** — Call `evaluateAdmission(candidate)` from
   `lib/commodities/admissions.ts`. Review all check results, failures,
   and the overall `readiness` / `risk` classification.

4. **Review internal comparison** — Call `buildComparisonTable([...candidates])`
   to compare the new candidate against other candidates in the pipeline.
   This view is internal only — do not publish to public pages.

5. **Resolve failures** — Address all failing checks. Re-evaluate until
   the candidate reaches `READY_NOW` (or is classified `OUT_OF_SCOPE`).

6. **Governance vote** — Submit a governance proposal with the complete
   admission record and evidence package. The admission result is advisory
   only; the governance vote is the authoritative decision point.

7. **Launch gate** — Run the launch readiness gate
   (see `COMMODITY_EXPANSION_FRAMEWORK.md`, Section 11).
   All hard blockers (HB-01 through HB-10) must pass.

8. **Registry integration** — Only after governance approval and a passing
   launch gate may an entry be added to `lib/commodities/registry.ts`.
   Follow the integration steps in
   `documents/commodities/TOKENIZED_COMMODITIES_INTEGRATION_LAYER.md`, §9.

9. **Update tracker** — Mark the candidate row in
   `COMMODITY_CANDIDATE_TRACKER.md` with the final outcome.

---

## 3. Required Evidence

All evidence must be on file before a candidate can reach `READY_NOW`.
Use the `CommodityAdmissionCandidate` schema to document each item.

### Issuer evidence

| Evidence item | Field |
|---|---|
| Issuer identity and jurisdiction | `issuerJurisdiction` |
| Regulatory status confirmation | `issuerRegulated` |
| Public corporate / legal documentation | `issuerPublicDocumentation` |
| Verification notes | `issuerVerificationNotes` |

### Contract evidence

| Evidence item | Field |
|---|---|
| Contract address on target chain | `contractAddress` |
| Block explorer verification URL | `contractExplorerUrl` |
| Contract verified on explorer | `contractVerified` |
| Security audit availability | `contractAudited` |
| Audit firm name | `contractAuditFirm` |
| Contract verification notes | `contractVerificationNotes` |

### Pricing evidence

| Evidence item | Field |
|---|---|
| Canonical pricing source | `pricingSource` |
| On-chain oracle availability | `onChainOracleAvailable` |
| Oracle provider name | `oracleProvider` |
| Pricing is reference-only (must be `true`) | `pricingReferenceOnly` |
| Pricing notes | `pricingNotes` |

### Reserve / backing evidence

| Evidence item | Field |
|---|---|
| Reserve/backing model publicly disclosed | `reserveDisclosed` |
| Proof-of-reserves or equivalent attestation | `proofOfReservesAvailable` |
| Attestation frequency | `reserveAttestationFrequency` |
| Custodian is a regulated qualified custodian | `custodianRegulated` |
| Custodian name | `custodianName` |
| Reserve/backing description | `reserveDescription` |
| Reserve notes | `reserveNotes` |

---

## 4. Contract Verification Requirements

- The smart contract must be **verified** on a public block explorer
  (Etherscan, Arbiscan, Polygonscan, etc.).
- A **security audit** by a reputable third-party firm is strongly required.
  Unaudited contracts must be explicitly documented as such, and will result
  in a `MEDIUM` or `HIGH` risk classification.
- The contract source code must match the deployed bytecode.
- The contract must not have admin keys, upgrade proxies, or pause mechanisms
  that could freeze user assets without publicly documented governance controls.
- All contract verification URLs must be recorded in `contractExplorerUrl`.

---

## 5. Issuer Verification Requirements

- The issuer must be an identifiable legal entity with a public registration
  or corporate disclosure.
- The issuer's regulatory status must be confirmed:
  - For financial instruments: licensed by a recognized financial regulator.
  - For commodity tokens: issuer must be a recognized operator in the
    commodity's relevant market (e.g., LBMA member for gold/silver).
- The issuer's jurisdiction must be stated. Offshore or anonymized issuers
  require a legal opinion before admission.
- All issuer documentation must be stored in the evidence package
  (`evidencePackageRef`).

---

## 6. Pricing Source Requirements

- Every candidate must have an identified `pricingSource`.
- **Preferred:** On-chain oracle (Chainlink, Pyth, API3) with documented
  heartbeat, deviation threshold, and uptime history.
- **Acceptable for read-only:** Off-chain reference price (CoinGecko, etc.)
  with explicit documentation that it is reference-only.
- **Not acceptable:** Self-reported prices from the issuer without
  independent verification.
- `pricingReferenceOnly` must be `true` for all candidates. No buy/sell
  signals may be derived from commodity prices on any Axiom surface.
- For external assets: price fetching must be implemented in a dedicated
  `lib/commodities/<SYMBOL>Service.ts` following the KAG pattern.

---

## 7. Reserve / Backing Disclosure Requirements

- `reserveDisclosed` must be `true`. If the issuer does not publicly disclose
  their reserve model, the candidate is blocked.
- `proofOfReservesAvailable` must be `true` for any candidate targeting
  `READY_NOW` or `EXTERNAL_SUPPORTED` status.
- For Axiom-issued assets: the reserve model must be compatible with
  NAVEngine and MintRedeemController (see AXAU pattern).
- For external assets: the reserve model must be independently verifiable.
  Self-attested reserves without third-party verification result in a
  `MEDIUM` risk classification at best.
- `reserveDescription` must be populated with a clear summary of the
  reserve/backing mechanism.

---

## 8. Page / API / Portfolio / Insights Integration Requirements

When a candidate reaches `READY_NOW` and governance approval is obtained,
the following integrations are required before launch-gate sign-off:

### Page integration

- Create `pages/commodities/<SYMBOL>.tsx` following the KAG pattern.
- Include `CommodityStatusBadge` for status display.
- Include `COMMODITY_PAGE_BANNER` from `lib/commodities/disclosures.ts`.
- Include per-asset disclosure strings from `lib/commodities/disclosures.ts`.
- No financial advice, no buy/sell language, no yield claims.

### API integration

- Create `pages/api/commodities/<SYMBOL>/status.ts` — on-chain status read.
- Create `pages/api/commodities/<SYMBOL>/balance.ts` — wallet balance
  (optional, only if needed).
- All API routes are read-only. No write paths.

### Registry integration

- Add a `CommodityAsset` entry to `COMMODITY_REGISTRY` in
  `lib/commodities/registry.ts`.
- Set `readOnly: true`, `axiomIssued: false`, `axiomCustodies: false`
  for all external assets.

### Portfolio integration

- Add to `lib/portfolio/realAssetsPortfolio.ts` if wallet-aware balance
  tracking is required.
- Integration is read-only. No deposit/withdrawal paths.

### Insights integration

- Add to `lib/commodities/insightsService.ts` if spot price display in
  the commodity insights layer is needed.

---

## 9. Rejection Conditions

A candidate will be classified `OUT_OF_SCOPE` and rejected if any of the
following conditions apply:

| Condition | Check field |
|---|---|
| Reserve/backing not disclosed | `reserveDisclosed: false` |
| Pricing presented as a buy/sell signal | `pricingReferenceOnly: false` |
| Integration would require write paths | `intendedReadOnly: false` |
| Axiom would issue the token without governance approval | `axiomWillIssue: true` (without vote) |
| Product status is `LIVE` or `NOT_LIVE_NOT_ISSUED` for a new candidate | `intendedProductStatus` mismatch |
| 3 or more open blockers | `blockers.length >= 3` |
| Risk classification is `HIGH` or `DISQUALIFIED` | (derived) |
| Underlying asset involves prohibited instruments | (legal review) |

Additional grounds for rejection (from COMMODITY_EXPANSION_FRAMEWORK.md §12):

- Privacy-preserving commodities where the underlying cannot be independently verified
- Algorithmic / synthetic reserves with no physical backing
- Highly regulated or prohibited underlying assets
- Assets where custodian is under regulatory enforcement
- Assets where the issuer is anonymous or unidentifiable

---

## 10. Examples

### AXAU — READY_NOW (reference: already live)

AXAU demonstrates a fully admitted and live Axiom-issued gold reserve module.

**Key evidence on file:**
- Issuer: Axiom Protocol (regulated, public documentation available)
- Contract: Verified on Arbiscan; NAVEngine, MintRedeemController, AXGoldVault
- Pricing: CoinGecko pax-gold reference + Chainlink XAU/USD on-chain oracle
- Reserve: PAXG (Paxos/NYDFS) + direct custodied gold; NAV published on-chain
- Integration: Full — page, API, portfolio, insights, disclosure

**Admission result:** `READY_NOW` / `LOW` risk  
**Registry status:** `LIVE` — no admission action required

---

### KAG — READY_NOW (reference: already external-supported)

KAG demonstrates a fully admitted external read-only silver asset.

**Key evidence on file:**
- Issuer: KMS Labs / Kinesis ecosystem (regulated, public documentation)
- Contract: Verified on Etherscan (0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e)
- Pricing: CoinGecko kinesis-silver (USD per gram) — reference-only
- Reserve: 1 KAG = 1 gram LBMA Good Delivery 999 fine silver; Kinesis PoR
- Integration: Full — page, API, portfolio, insights, disclosure

**Admission result:** `READY_NOW` / `LOW` risk  
**Registry status:** `EXTERNAL_SUPPORTED` — no admission action required

**Preserved truths:**
- KAG is issued by KMS Labs within the Kinesis ecosystem.
- Axiom supports KAG as an external commodity asset for portfolio visibility.
- Axiom does not issue KAG.
- Axiom does not directly custody the underlying silver.
- Any redemption rights depend on KMS Labs / Kinesis terms.
- Support is read-only: no swaps, no deposits, no withdrawals, no banking rails.

---

### AXAG — OUT_OF_SCOPE (reference: deferred / not issued)

AXAG demonstrates a candidate that is explicitly out of scope.

**Current state:**
- AXAG is `NOT_LIVE_NOT_ISSUED` — no token exists on any chain
- No contract, no issuer, no custody resolution, no oracle
- Custody resolution and governance proposal are required before any future
  admission consideration

**Open blockers:**
1. AXAG is not issued — no token exists on any chain
2. Custody resolution required before any future admission
3. Governance proposal required before any AXAG activation

**Admission result:** `OUT_OF_SCOPE` / `HIGH` risk  
**Registry status:** `NOT_LIVE_NOT_ISSUED` — do not activate

**Hard rule:** AXAG must remain `NOT_LIVE_NOT_ISSUED`. This will not change
without governance approval, custody resolution, and launch-gate sign-off.

---

## 11. Source Files

| File | Purpose |
|---|---|
| `lib/commodities/admissions.ts` | Admission schema, validators, classifiers, comparison utility |
| `lib/commodities/registry.ts` | Unified commodity registry (single source of truth) |
| `lib/commodities/disclosures.ts` | Canonical disclosure strings |
| `lib/commodity/riskScoring.ts` | Risk scoring engine (Section 10, COMMODITY_EXPANSION_FRAMEWORK) |
| `pages/operator/commodities/admissions.tsx` | Internal operator admissions view |
| `documents/commodities/COMMODITY_CANDIDATE_TRACKER.md` | Candidate pipeline tracker |
| `documents/commodities/COMMODITY_EXPANSION_FRAMEWORK.md` | Full governance framework |
| `documents/commodities/TOKENIZED_COMMODITIES_INTEGRATION_LAYER.md` | Integration layer spec |

---

*Axiom Protocol — Commodity Admissions Pipeline — Internal Reference — v1.0.0*
