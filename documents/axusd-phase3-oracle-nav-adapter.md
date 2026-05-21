# AXUSD Phase 3 — Oracle and NAV Adapter Architecture

**Version:** 3.0.0  
**Date:** 2026-05-21  
**Status:** WIRED — TypeScript layer complete, oracle connections pending  
**Scope:** Off-chain valuation layer only. No mainnet deployment.

---

## 1. Overview

Phase 3 introduces a complete TypeScript valuation layer for the AXUSD reserve system. It wires oracle sources, NAV adapters, confidence scoring, fallback hierarchy, and snapshot infrastructure into the Phase 2 ReserveManager.

**What Phase 3 does NOT do:**
- Does not deploy any new on-chain contracts
- Does not activate T-Bill, Treasury Fund, or gold backing
- Does not change the canonical USDC PSM backing source
- Does not connect any external NAV APIs (those require Phase 4 integrations)

**What Phase 3 does:**
- Provides the complete TypeScript interface through which future oracle integrations will plug in
- Enforces all eligibility gates in off-chain accounting before any reserve number is published
- Produces `ValuationResult` and `ReserveSnapshot` objects with confidence scoring, freshness state, and fallback state per asset
- Extends `ReserveManagerSummary` with `staleValueUsd`, `manualReviewValueUsd`, `fallbackValuedAmountUsd`, and `haircutAdjustedReserveValueUsd`

---

## 2. Architecture Diagram

```
CanonicalPSM (on-chain)         — Live USDC mint/redeem backing
    │
    │ balance fetched by reserveManager.ts
    ▼
ReserveManager (Phase 2/3)      — Off-chain accounting layer
    │
    ├── TreasuryNAVOracleService ── routes per-asset to correct oracle source
    │       │
    │       ├── FIXED_PEG       ── USDC → $1.00, confidence 99, never stale
    │       ├── CHAINLINK        ── PAXG (stub), USDC fallback (active)
    │       ├── ISSUER_NAV_API   ── thBILL, BUIDL, USDY (stub, not connected)
    │       ├── ERC4626          ── thBILL, BUIDL, USDY fallback (stub)
    │       └── INTERNAL_ACCTG  ── WETH, AXUSD (operator treasury)
    │
    ├── RWAValuationAdapter      ── per-asset eligibility gates + haircut expansion
    │       │
    │       ├── ValuationPolicy  ── per-asset staleness, confidence, eligibility rules
    │       └── ConfidenceScorer ── 0–100 score with source/freshness/attestation penalties
    │
    ├── FallbackHierarchy        ── source selection: PRIMARY → FALLBACK → BOTH_STALE → FAILED
    │
    └── ReserveSnapshot          ── bucketed snapshot: LIVE_RESERVE, PLANNED, EXCLUDED, STALE...

AxiomTreasuryVault (on-chain)   — INTERNAL_ONLY, always excluded from AXUSD backing
```

---

## 3. Core Modules

### 3.1 Types (`lib/reserves/phase3/types.ts`)

Defines all Phase 3 type contracts:

| Type | Description |
|---|---|
| `OracleSourceType` | 9 enum values for oracle source classification |
| `ValuationFreshnessState` | FRESH → APPROACHING_STALE → STALE → EXPIRED → MANUAL_REVIEW_REQUIRED → UNUSABLE |
| `FallbackState` | PRIMARY_HEALTHY → USING_FALLBACK → BOTH_STALE → BOTH_FAILED → MANUAL_OVERRIDE_* |
| `NAVObservation` | Structured oracle observation with confidence, freshness, usability flag |
| `ValuationResult` | Full per-asset valuation output (gross, effective haircut, eligible value, exclusion reason) |
| `ValuationPolicy` | Per-asset rules for source selection, haircut expansion, eligibility gates |
| `ConfidenceScoreParams` | Input struct for `computeConfidenceScore()` |
| `ReserveSnapshot` | Bucketed snapshot of all reserve assets with valuation metadata |

### 3.2 OracleSourceRegistry (`lib/reserves/phase3/oracleSourceRegistry.ts`)

10 oracle sources registered:

| ID | Type | Active | Notes |
|---|---|---|---|
| FIXED_PEG | FIXED_PEG | ✓ | USDC $1.00, never stale |
| CHAINLINK_USDC_USD | CHAINLINK | ✓ | USDC fallback confirmation |
| CHAINLINK_XAU_USD | CHAINLINK | ✓ | PAXG primary (stub) |
| ERC4626_CONVERT_TO_ASSETS | ERC4626 | ✓ | T-Bill fallback (stub) |
| ISSUER_NAV_API | ISSUER_NAV_API | ✗ | Phase 3 stub — not connected |
| CUSTODIAN_ATTESTATION | CUSTODIAN_ATTESTATION | ✓ | PAXG + BitGo (stub) |
| MANUAL_OPERATOR_INPUT | MANUAL_OPERATOR_INPUT | ✓ | Emergency, 24h limit |
| DEX_TWAP | DEX_TWAP | ✓ | Secondary only, prohibited as primary |
| INTERNAL_ACCOUNTING | INTERNAL_ACCOUNTING | ✓ | WETH/AXUSD operator treasury |
| FALLBACK_COMPOSITE | FALLBACK_COMPOSITE | ✓ | Weighted average when multiple fail |

**Enforcement:** `assertNotDexTwapPrimary()` throws if DEX_TWAP is configured as primary for `TOKENIZED_TBILL`, `TOKENIZED_TREASURY_FUND`, or `TOKENIZED_GOVERNMENT_MONEY_MARKET`.

### 3.3 Confidence Scoring (`lib/reserves/phase3/valuationConfidence.ts`)

`computeConfidenceScore(params: ConfidenceScoreParams): number` returns an integer in [0, 100].

**Base scores:**

| Source | Score |
|---|---|
| FIXED_PEG | 99 |
| CHAINLINK | 92 |
| ERC4626_CONVERT_TO_ASSETS | 85 |
| ISSUER_NAV_API | 80 |
| CUSTODIAN_ATTESTATION | 75 |
| FALLBACK_COMPOSITE | 65 |
| INTERNAL_ACCOUNTING | 60 |
| MANUAL_OPERATOR_INPUT | 50 |
| DEX_TWAP | 40 |

**Freshness penalties:** APPROACHING_STALE −5, STALE −25, EXPIRED −40, MANUAL_REVIEW_REQUIRED −15, UNUSABLE −100.

**Attestation penalties:** STALE −15, FAILED −30, MANUAL_REVIEW −10, NONE (when required) −20, PENDING −5.

**Other penalties:** fallback −10, manual review −5, asset not live −10, reconciliation OVERDUE −10, FAILED −20.

**Freshness state machine** (`computeFreshnessState`):
- < 80% of max staleness → FRESH
- 80–100% → APPROACHING_STALE
- 100–200% → STALE
- 200–400% → EXPIRED
- > 400% → MANUAL_REVIEW_REQUIRED
- null timestamp → UNUSABLE

### 3.4 AssetValuationPolicy (`lib/reserves/phase3/assetValuationPolicy.ts`)

7 policies (one per Phase 2 registry asset):

| Asset | Primary Source | Eligible When Stale | Eligible When Fallback | Attestation Required |
|---|---|---|---|---|
| USDC | FIXED_PEG | ✓ | ✓ | ✗ |
| thBILL | ISSUER_NAV_API | ✗ | ✗ | ✓ |
| BUIDL | ISSUER_NAV_API | ✗ | ✗ | ✓ |
| USDY | ISSUER_NAV_API | ✗ | ✗ | ✓ |
| PAXG | CHAINLINK_XAU_USD | ✗ | ✗ | ✓ |
| WETH | INTERNAL_ACCOUNTING | ✗ | ✗ | ✗ |
| AXUSD | FIXED_PEG | ✗ | ✗ | ✗ |

### 3.5 TreasuryNAVOracleService (`lib/reserves/phase3/treasuryNAVOracle.ts`)

Implements `ITreasuryNAVOracle` with `getNAVWithMetadata(assetId): Promise<NAVObservation>`.

Current returns:
- **USDC**: NAV = 1.0, confidence 99, FRESH, isUsable = true
- **thBILL, BUIDL, USDY, PAXG**: NAV = null, confidence 0, UNUSABLE, isUsable = false (stubs — awaiting Phase 4 API connections)
- **WETH**: INTERNAL_ACCOUNTING, isUsable = true (for internal tracking only; eligible = 0)
- **AXUSD**: FIXED_PEG, $1.00 (circular backing guard ensures eligible = 0)

### 3.6 RWAValuationAdapter (`lib/reserves/phase3/rwaValuationAdapter.ts`)

`getValuation(asset, policy, nav, fallbackState): ValuationResult`

Eligibility decision tree (ordered):
1. PLANNED → exclusionReason = PLANNED_ASSET, eligible = 0
2. INTERNAL_ONLY → exclusionReason = INTERNAL_ONLY_ASSET, eligible = 0
3. OPERATOR_TREASURY → exclusionReason = OPERATOR_TREASURY_EXCLUDED, eligible = 0
4. DISABLED/DEPRECATED → exclusionReason = ASSET_DISABLED_OR_DEPRECATED, eligible = 0
5. emergencyDisabled → exclusionReason = EMERGENCY_DISABLED, eligible = 0
6. !asset.isLive → exclusionReason = ASSET_NOT_LIVE, eligible = 0
7. !nav.isUsable → exclusionReason = VALUATION_UNUSABLE, eligible = 0
8. isStale && !eligibleWhenStale → exclusionReason = STALE_VALUATION, eligible = 0
9. isFallback && !eligibleWhenFallback → exclusionReason = FALLBACK_VALUATION_NOT_ELIGIBLE, eligible = 0
10. attestationMissing && !eligibleWhenAttestationMissing → exclusionReason = ATTESTATION_REQUIRED, eligible = 0
11. manualReviewRequired → exclusionReason = MANUAL_REVIEW_REQUIRED, eligible = 0
12. All gates passed → eligible = grossValue × (1 − effectiveHaircutBps / 10000)

**Haircut expansion:** effectiveHaircutBps = baseHaircutBps + haircutExpansionOnStaleBps (if stale) + haircutExpansionOnFallbackBps (if fallback). If emergencyDisabled: effectiveHaircutBps = 10000.

### 3.7 FallbackHierarchy (`lib/reserves/phase3/fallbackHierarchy.ts`)

`selectValuationSource(primary, fallback, manualOverride, minConfidence): FallbackSelectionResult`

Decision tree:
1. Manual override present and unexpired → MANUAL_OVERRIDE_ACTIVE (confidence capped at 50)
2. Manual override expired → MANUAL_OVERRIDE_EXPIRED, unusable
3. Primary healthy → PRIMARY_HEALTHY, penalty = 0
4. Primary stale/failed, fallback healthy → USING_FALLBACK, confidence −10
5. Both stale but usable → BOTH_STALE, use best available, confidence −15
6. Both failed → BOTH_FAILED, unusable

### 3.8 ReserveSnapshot (`lib/reserves/phase3/reserveSnapshot.ts`)

Buckets:
- `LIVE_RESERVE` — LIVE, eligible, fresh
- `PLANNED` — PLANNED status, zero eligible
- `EXCLUDED_OPERATOR` — OPERATOR_TREASURY / emergencyDisabled
- `STALE` — LIVE but stale, excluded
- `MANUAL_REVIEW` — requires human review
- `ATTESTATION_PENDING` — missing required attestation

---

## 4. API Endpoints

### New endpoints added

| Method | Path | Description |
|---|---|---|
| GET | `/api/axusd/oracles/sources` | Full OracleSourceRegistry |
| GET | `/api/axusd/oracles/valuation-policy` | Per-asset ValuationPolicies (operator: full, public: redacted) |
| GET | `/api/axusd/oracles/nav?asset=<id>` | NAVObservation for one or all assets |
| GET | `/api/axusd/oracles/asset-valuation` | Full ValuationResult per asset |
| GET | `/api/axusd/oracles/oracle-health` | Health check across all oracle sources |
| GET | `/api/axusd/reserve-manager/valuation-summary` | Extended summary with Phase 3 fields |
| GET | `/api/axusd/reserve-manager/snapshots` | Bucketed reserve snapshot |

All endpoints include `meta.plannedAssetsNote` reaffirming that PLANNED assets do not count as AXUSD backing.

---

## 5. ReserveManagerSummary Phase 3 Extensions

```typescript
interface ReserveManagerSummaryPhase3 extends ReserveManagerSummary {
  staleValueUsd: number;                        // Value of stale-excluded assets
  manualReviewValueUsd: number;                 // Value of manual-review-excluded assets
  fallbackValuedAmountUsd: number;              // Value currently using fallback sources
  haircutAdjustedReserveValueUsd: number;       // = eligibleReserveValueUsd (synonym for clarity)
  valuationResults: ValuationResult[];          // Per-asset valuation results
  navObservations: Record<string, NAVObservation>; // Per-asset NAV observations
}
```

---

## 6. Governance Invariants (Enforced in Phase 3)

All invariants from Phase 2 are preserved. Phase 3 adds:

1. **PLANNED assets** always return `eligibleReserveValueUsd = 0` regardless of NAV data.
2. **INTERNAL_ONLY and OPERATOR_TREASURY assets** always return `eligibleReserveValueUsd = 0`.
3. **DEX_TWAP** is prohibited as a primary source for `TOKENIZED_TBILL`, `TOKENIZED_TREASURY_FUND`, `TOKENIZED_GOVERNMENT_MONEY_MARKET` — enforced by `assertNotDexTwapPrimary()`.
4. **AXUSD circular backing guard** — AXUSD holdings are permanently excluded from AXUSD reserve accounting.
5. **Effective haircut never decreases** — expansions on stale/fallback are additive, never subtractive.
6. **Manual override expires after 24 hours** — expired overrides produce unusable observations.
7. **Confidence score clamped [0, 100]** — no overflow, no underflow.

---

## 7. Test Coverage

`tests/reserve-registry-phase3.test.ts` — 90 tests across 14 categories:

1. OracleSourceRegistry — load and validate (9 tests)
2. assertNotDexTwapPrimary enforcement (6 tests)
3. ValuationPolicy registry (8 tests)
4. computeFreshnessState state machine (9 tests)
5. computeConfidenceScore (11 tests)
6. TreasuryNAVOracleService (14 tests)
7. USDC fixed-peg invariant (3 tests)
8. PLANNED asset NAV invariant (4 tests)
9. INTERNAL_ONLY asset NAV routing (1 test)
10. RWAValuationAdapter eligibility gates (7 tests)
11. RWAValuationAdapter haircut expansion (4 tests)
12. Fallback hierarchy selection (5 tests)
13. Reserve snapshot bucketing (4 tests)
14. ReserveManagerSummaryPhase3 extension fields (5 tests)

---

## 8. Phase 4 Requirements (Not in Scope)

For any PLANNED asset to become LIVE and count toward AXUSD reserves:

1. **Oracle connection** — Issuer NAV API (or Chainlink) must be integrated and returning live data
2. **Custodian attestation** — BitGo (or equivalent) attestation publisher must be deployed and current
3. **Governance approval** — Governance Safe (3-of-5) must approve the new reserve sleeve
4. **Compliance gates** — `LendingPlatformModule`, `CountryAllowModule`, `TransferLimitModule` phase 1 compliance gaps must be resolved
5. **Reserve control separation** — PAXG dual-counting with `CanonicalReserveSnapshot` must be eliminated before PAXG can be admitted as AXUSD reserve
6. **Mint/redeem module** — Phase 4 PSM integration for new asset sleeves

Until all Phase 4 requirements are met, all PLANNED assets return `eligibleReserveValueUsd = 0`.

---

## 9. Files Created / Modified

### New files
- `lib/reserves/phase3/types.ts`
- `lib/reserves/phase3/oracleSourceRegistry.ts`
- `lib/reserves/phase3/valuationConfidence.ts`
- `lib/reserves/phase3/assetValuationPolicy.ts`
- `lib/reserves/phase3/treasuryNAVOracle.ts`
- `lib/reserves/phase3/rwaValuationAdapter.ts`
- `lib/reserves/phase3/fallbackHierarchy.ts`
- `lib/reserves/phase3/reserveSnapshot.ts`
- `pages/api/axusd/oracles/sources.ts`
- `pages/api/axusd/oracles/valuation-policy.ts`
- `pages/api/axusd/oracles/nav.ts`
- `pages/api/axusd/oracles/asset-valuation.ts`
- `pages/api/axusd/oracles/oracle-health.ts`
- `pages/api/axusd/reserve-manager/valuation-summary.ts`
- `pages/api/axusd/reserve-manager/snapshots.ts`
- `tests/reserve-registry-phase3.test.ts`
- `documents/axusd-phase3-oracle-nav-adapter.md`

### Modified files
- `lib/reserves/phase2/reserveManager.ts` — Phase 3 hooks integrated; stubs replaced; summary extended
- `pages/operator/reserve-registry.tsx` — Oracle Health Panel, Valuation Results panel added
- `pages/transparency.tsx` — Oracle & Valuation Readiness section added
