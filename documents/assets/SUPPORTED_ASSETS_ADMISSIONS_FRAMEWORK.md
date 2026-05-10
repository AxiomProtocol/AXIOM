# Supported Assets Admissions Framework

**Document:** `documents/assets/SUPPORTED_ASSETS_ADMISSIONS_FRAMEWORK.md`  
**Status:** Internal — operator / developer reference  
**Implementation:** `lib/assets/admissions.ts`  

---

## Purpose

The Supported Assets Admissions Framework is the general Axiom process for
evaluating assets before any future support decision. It covers:

- commodity assets
- stable assets
- reserve-grade crypto assets
- yield-bearing external assets
- future external real-world assets (RWAs)

The framework is advisory only. It does not approve assets, deploy contracts,
issue tokens, activate AXAG, add banking rails, or introduce write paths.

Current truth preserved:

| Asset | Truth |
|---|---|
| AXAU | Axiom reserve framework, gold live module |
| KAG | `EXTERNAL_SUPPORTED` read-only silver asset |
| AXAG | `NOT_LIVE_NOT_ISSUED`; no token exists and no activation occurs here |

---

## Relationship to the Commodity Admissions Pipeline

The commodity admissions pipeline remains specialized and intact:

- Source: `lib/commodities/admissions.ts`
- Docs: `documents/commodities/COMMODITY_ADMISSIONS_PIPELINE.md`
- Operator view: `/operator/commodities/admissions`

The supported-assets framework sits one level above it. Commodity candidates
continue to use commodity-specific fields and checks. The generalized framework
can wrap commodity reference snapshots for internal comparison, but it does not
replace or weaken commodity diligence.

For example:

- KAG remains a commodity-specific external silver asset.
- AXAG remains a commodity-specific not-issued silver reference.
- AXAU remains the Axiom gold reserve module and is not converted into an
  external read-only candidate.

---

## Admission Workflow

```text
Candidate identified
        |
        v
Create SupportedAssetAdmissionCandidate
        |
        v
Run evaluateSupportedAssetAdmission(candidate)
        |
        +--> READY_NOW       -> Governance / launch-gate review before any new surface
        +--> NEEDS_DILIGENCE -> Resolve evidence gaps and re-evaluate
        +--> OUT_OF_SCOPE    -> Stop, document blocker, reject or defer
```

No result from this workflow creates public support by itself. Public support
requires the appropriate registry update, disclosure package, governance or
launch approval, and implementation in the relevant read-only service layer.

---

## Evidence Requirements

Every candidate must document evidence for:

| Evidence area | Required proof |
|---|---|
| Issuer verification | Named issuer, jurisdiction, public legal or regulatory posture |
| Chain verification | Target chain, chain ID when applicable, canonical network source |
| Contract verification | Canonical contract address, block explorer verification, standard/decimals |
| Pricing source verification | Public market data source and failure-mode behavior |
| Reserve/backing clarity | Reserve, backing, or reference asset model |
| Disclosure completeness | Axiom relationship, issuer relationship, no-custody and no-issuance wording |
| Custody / redemption clarity | Custodian, redemption rights, limitations, and issuer terms |
| Read-only integration readiness | Balance/metadata/price reads only; no writes, custody, swaps, deposits, withdrawals, or banking rails |

Unknown evidence must be represented as incomplete. Missing evidence cannot be
treated as verified.

---

## Required Fields

The implementation schema is `SupportedAssetAdmissionCandidate` in
`lib/assets/admissions.ts`. Required fields include:

- identity: `symbol`, `name`, `category`, `issuer`, `chain`, `contractAddress`
- current truth: `publicSupportStatus`, `currentTruthStatement`, `source`
- verification: `issuerVerification`, `chainVerification`,
  `contractVerification`, `pricingSourceVerification`
- clarity: `reserveBackingClarity`, `custodyRedemptionClarity`
- disclosures: `disclosureCompleteness`, `disclosureNotes`
- integration: `readOnlyIntegrationReadiness`, `integrationFriction`
- safety boundaries: `introducesWritePath`, `introducesContractWrite`,
  `introducesBankingRail`, `activatesAxag`
- metadata: `blockers`, `evidencePackageRef`, `operatorNotes`, `createdAt`,
  `createdBy`

Required readiness classes:

- `READY_NOW`
- `NEEDS_DILIGENCE`
- `OUT_OF_SCOPE`

Supported category scheme:

- `COMMODITY`
- `STABLE`
- `GOLD`
- `SILVER`
- `BTC`
- `ETH`
- `STAKED_ETH`
- `RWA_EXTERNAL`

---

## Category-Specific Requirements

### Commodity / Gold / Silver

- Commodity-specific candidates must continue through
  `lib/commodities/admissions.ts`.
- Physical backing, custodian, attestation cadence, unit definition, and issuer
  relationship must be explicit.
- Silver surfaces must preserve the statement: AXAG is not live and is not
  issued.

### Stable Assets

- The reserve model must be clear: cash, Treasuries, segregated accounts,
  attestations, and redemption terms.
- The asset must be distinguished from Axiom-issued stable layers.
- Algorithmic stablecoins without reserve backing are rejected.

### BTC / ETH / Reserve-Grade Crypto

- Native assets require a safe read-only model such as address-watch or balance
  reads.
- Wrapped assets require wrapper issuer, custodian, proof-of-reserves, and
  redemption/merchant-network clarity.
- Governance tokens and volatile assets require disclosure language that avoids
  investment recommendations.

### Staked ETH / Yield-Bearing External Assets

- Disclosures must state that yield, rewards, exchange-rate changes, or staking
  economics come from the external issuer/protocol, not Axiom.
- The framework cannot authorize an Axiom yield product, staking service, lending
  strategy, or reward claim.

### RWA External

- Securities, qualified-purchaser restrictions, transfer limits, and issuer NAV
  methods must be reviewed before any surface is considered.
- If read-only display would imply investment availability or require custody,
  the candidate is `OUT_OF_SCOPE`.

---

## Disclosure Requirements

Every admitted or candidate asset must have disclosure language covering:

1. issuer identity
2. Axiom relationship
3. no Axiom issuance for external assets
4. no Axiom custody of external reserves
5. reserve/backing or reference model
6. redemption rights and limits
7. pricing source and failure mode
8. read-only scope
9. no banking rails, swaps, deposits, withdrawals, lending, or contract writes
10. AXAG non-issuance where silver or Axiom silver wrappers are discussed

No public wording may imply that a candidate is live, issued, custody-enabled,
redeemable through Axiom, or governance-approved unless that is already true in
the relevant source-of-truth registry.

---

## Integration Requirements

For an external candidate to progress beyond diligence, the integration must be
read-only:

- metadata reads
- balance reads
- reference price reads
- disclosure display
- internal/operator comparison

The framework rejects candidates that require:

- contract deployments
- contract writes
- token issuance
- custody onboarding
- swaps
- deposits
- withdrawals
- lending
- fiat or banking rails

---

## Rejection Conditions

A candidate is `OUT_OF_SCOPE` when any of the following apply:

| Condition | Outcome |
|---|---|
| AXAG activation or public-support claim | Reject |
| Write path required | Reject |
| Contract write required | Reject |
| Banking rail required | Reject |
| No pricing source | Reject |
| Reserve/backing unknown for backed asset | Reject |
| Custody or redemption disputed | Reject |
| Anonymous issuer for regulated/backed asset | Reject |
| Yield disclosure cannot be made safely | Reject |
| RWA requires restricted offering or custody path not available to Axiom | Reject |

---

## Worked Examples

### AXAU

- Category: `GOLD`
- Current truth: Axiom reserve framework, gold live module
- Status in framework: reference asset
- Maturity: `LIVE_AXIOM_MODULE`
- Readiness: `READY_NOW` as an existing reference, not a new admission
- Notes: AXAU is not an external read-only asset. It remains governed by the
  reserve framework and commodity docs.

### KAG

- Category: `SILVER`
- Current truth: `EXTERNAL_SUPPORTED` read-only silver asset
- Status in framework: commodity reference snapshot
- Maturity: `EXTERNAL_READ_ONLY`
- Readiness: `READY_NOW`
- Notes: KAG remains issued by KMS Labs / Kinesis. Axiom does not issue or
  custody KAG or its silver reserves.

### AXAG

- Category: `SILVER`
- Current truth: `NOT_LIVE_NOT_ISSUED`
- Status in framework: out-of-scope reference
- Maturity: `NOT_LIVE_NOT_ISSUED`
- Readiness: `OUT_OF_SCOPE`
- Notes: No token exists. This framework cannot activate AXAG.

### USDC

- Category: `STABLE`
- Issuer: Circle Internet Financial, LLC
- Recommendation: `READY_NOW` only as an advisory read-only candidate
- Notes: Must be distinguished from Axiom-issued stable assets. No Axiom
  issuance, custody, redemption, banking rails, or write paths.

### PAXG

- Category: `GOLD`
- Issuer: Paxos Trust Company, LLC
- Recommendation: `READY_NOW` only as an advisory read-only candidate
- Notes: PAXG is independent from AXAU. AXAU remains the Axiom-issued gold rail.

### WBTC

- Category: `BTC`
- Issuer/custody model: BitGo Trust Company / WBTC merchant network
- Recommendation: `READY_NOW` only as an advisory read-only candidate
- Notes: Requires wrapped-asset, custodian, proof-of-reserves, and merchant
  network disclosures. Axiom does not custody BTC.

---

*Axiom Protocol — Supported Assets Admissions Framework — Internal Reference*
