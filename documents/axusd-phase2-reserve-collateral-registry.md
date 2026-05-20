# AXUSD Phase 2 Reserve and Collateral Registry Architecture

**Classification:** Internal Technical Documentation  
**Phase:** 2 — Reserve and Collateral Registry Architecture  
**Status:** Implemented (Phase 2 scope complete)  
**Last Updated:** 2026-05-20  

---

## 1. Purpose

Phase 2 establishes the foundational reserve and collateral registry layer for AXUSD. It answers the following questions for every registered reserve asset:

- What assets are approved to count as AXUSD reserves?
- What reserve sleeve does each asset belong to?
- How is each asset valued?
- What haircut applies?
- What custody source controls the asset?
- What compliance restrictions apply?
- What disclosure status should be shown?
- Is the asset live, planned, disabled, deprecated, or internal-only?

This layer is designed to be extended in Phase 3 (oracle and NAV integration) and Phase 4 (mint and redemption module) without breaking the existing canonical PSM backing model.

---

## 2. Scope

Phase 2 includes:

| Component | Location |
|-----------|----------|
| Type system | `lib/reserves/phase2/types.ts` |
| Approved Reserve Asset Registry | `lib/reserves/phase2/approvedReserveAssetRegistry.ts` |
| ReserveManager | `lib/reserves/phase2/reserveManager.ts` |
| DB schema (Phase 3 migration ready) | `shared/reserveRegistrySchema.ts` |
| API — reserve assets | `pages/api/axusd/reserve-assets.ts` |
| API — reserve sleeves | `pages/api/axusd/reserve-sleeves.ts` |
| API — manager summary | `pages/api/axusd/reserve-manager/summary.ts` |
| API — coverage | `pages/api/axusd/reserve-manager/coverage.ts` |
| API — attestation status | `pages/api/axusd/reserve-manager/attestation-status.ts` |
| Operator dashboard | `pages/operator/reserve-registry.tsx` |
| Tests | `tests/reserve-registry-phase2.test.ts` |

---

## 3. Non-Goals (Phase 2)

The following are explicitly out of scope for Phase 2:

- Mainnet contract deployment
- Production role changes (grant/revoke)
- AXUSD mint or burn permission changes
- Public Treasury-backed product creation
- Live T-Bill NAV valuation (placeholders only)
- Attestation publisher (data model ready, engine not deployed)
- Database migration (schema defined, migration deferred to Phase 3)
- Mint/redeem module (stubs in ReserveManager, implementation in Phase 4)

---

## 4. Relationship to AXUSD

AXUSD is a compliance-native ERC-3643 settlement token. Its live backing is provided exclusively by the CanonicalPSM USDC sleeve. The Phase 2 reserve registry:

- Documents and classifies all registered reserve assets
- Enforces the invariant that only LIVE assets count toward AXUSD backing
- Maintains strict separation between live reserves and planned infrastructure
- Prepares the data model for future oracle and mint/redeem integration

The Phase 2 registry does not change how AXUSD is minted, redeemed, or priced. The canonical supply source remains `AXUSD.totalSupply()`.

---

## 5. Relationship to CanonicalPSM

CanonicalPSM is the live USDC mint and redemption backing source. It is not modified in Phase 2.

```
CanonicalPSM  →  live USDC backing (unchanged from Phase 1)
ReserveManager  →  reserve accounting and eligibility layer (Phase 2)
AxiomTreasuryVault  →  internal operator capital (excluded from AXUSD backing)
```

These three systems must remain strictly separated. The ReserveManager reads from the registry and fetches live PSM balances via `balanceOf(CanonicalPSM)`. It does not call `mint()` or `burn()` on AXUSD.

---

## 6. Relationship to AxiomTreasuryVault

AxiomTreasuryVault is internal operator capital management infrastructure. Its yield strategy positions (Aave, Euler, Camelot) are operator-only assets. They:

- Are tagged `OPERATOR_TREASURY` sleeve
- Are tagged `INTERNAL_ONLY` status
- Have 100% haircut (`haircutBps: 10_000`) and `emergencyDisabled: true`
- Always have `eligibleReserveValueUsd === 0`
- Are excluded from all public reserve reports

The ReserveManager computes `operatorTreasuryValueUsd` as a separate field in the summary so operators can see the value, but it is never added to `eligibleReserveValueUsd`.

---

## 7. Reserve Sleeve Model

| Sleeve | Status | AXUSD Backing | Description |
|--------|--------|---------------|-------------|
| `USDC_PSM` | Live | Eligible | Primary CanonicalPSM USDC backing |
| `TOKENIZED_TBILL` | Planned | Not eligible (yet) | Tokenized T-Bill sleeve (Phase 3+) |
| `TOKENIZED_TREASURY_FUND` | Planned | Not eligible (yet) | Tokenized Treasury fund (e.g. BUIDL) |
| `TOKENIZED_GOVERNMENT_MONEY_MARKET` | Planned | Not eligible (yet) | Tokenized gov't MMF (e.g. Ondo USDY) |
| `TOKENIZED_GOLD` | Planned | Not eligible (yet) | Tokenized gold commodity (future AXAU sleeve) |
| `CASH_EQUIVALENT` | Live | Eligible | Fiat or stablecoin equivalents |
| `OPERATOR_TREASURY` | Internal | Never | AxiomTreasuryVault positions (excluded) |
| `OTHER_RWA` | Planned | Not eligible (yet) | Other approved real-world asset collateral |

Sleeves become AXUSD-backing-eligible when:
1. At least one asset in the sleeve has `status: LIVE` and `isLive: true`
2. The sleeve is in `AXUSD_ELIGIBLE_SLEEVES` (currently: `USDC_PSM`, `CASH_EQUIVALENT`)
3. The asset has passed haircut, manual review, and emergency-disable checks

---

## 8. Asset Eligibility Model

Each `ApprovedReserveAsset` has the following eligibility flags:

| Flag | Meaning |
|------|---------|
| `isLive` | Asset is live and may count in reserve ratios |
| `isPlanned` | Asset is planned; never counts in live coverage |
| `isRedeemable` | Asset supports AXUSD redemption (Phase 4) |
| `isMintEligible` | Asset may collateralize AXUSD minting (Phase 4) |
| `isDisclosureEligible` | Safe to show on public disclosure page |

`eligibleReserveValueUsd` is always 0 when any of the following are true:
- `isLive === false`
- `sleeve === 'OPERATOR_TREASURY'`
- `haircutPolicy.emergencyDisabled === true`
- `haircutPolicy.staleValuation === true`
- `haircutPolicy.manualReviewRequired === true`
- `grossValueUsd === null || grossValueUsd <= 0`
- `assetAddress === ZERO_ADDRESS`

---

## 9. Haircut Model

```
eligibleReserveValueUsd = grossValueUsd × (1 − haircutBps / 10_000)
```

Haircut policy per registered asset (Phase 2 seed):

| Asset | Sleeve | Haircut | Max Allocation | Notes |
|-------|--------|---------|----------------|-------|
| USDC | USDC_PSM | 0 bps | 100% | Stable peg, CanonicalPSM |
| thBILL | TOKENIZED_TBILL | 250 bps | 40% | PLANNED; manualReviewRequired |
| BUIDL | TOKENIZED_TREASURY_FUND | 300 bps | 30% | PLANNED; manualReviewRequired |
| USDY | TOKENIZED_GOVERNMENT_MONEY_MARKET | 300 bps | 30% | PLANNED; manualReviewRequired |
| PAXG | TOKENIZED_GOLD | 500 bps | 20% | PLANNED; commodity volatility |
| WETH | OPERATOR_TREASURY | 10,000 bps | 0% | INTERNAL_ONLY; emergencyDisabled |
| AXUSD | OPERATOR_TREASURY | 10,000 bps | 0% | INTERNAL_ONLY; circular backing |

Validation rules enforced at registry construction:
- `haircutBps` must be 0–10,000 (throws on violation)
- `maxAllocationBps` must be 0–10,000 (throws on violation)

---

## 10. Custody and Attestation Readiness

### Custody Metadata Fields

Each asset tracks:

| Field | Description |
|-------|-------------|
| `custodyType` | SELF_CUSTODY_EOA / MULTISIG / INSTITUTIONAL_CUSTODIAN / SMART_CONTRACT / EXCHANGE / UNKNOWN |
| `custodyVenue` | Human-readable venue (e.g., "BitGo CaaS", "CanonicalPSM") |
| `custodyWallet` | Address of custody wallet or contract |
| `custodyProofSource` | Data source for proof (e.g., "on-chain balanceOf", "BitGo API") |
| `attestationUrlOrCid` | URL or IPFS CID for attestation document |
| `attestationTimestamp` | ISO 8601 timestamp of last attestation |
| `attestationStatus` | NONE / PENDING / CURRENT / STALE / FAILED / MANUAL_REVIEW |
| `lastReconciliationTimestamp` | ISO 8601 timestamp of last reconciliation |
| `reconciliationStatus` | NOT_REQUIRED / PENDING / CURRENT / OVERDUE / FAILED |

### Phase 2 State

All assets are in `attestationStatus: NONE` because the attestation publisher is not yet deployed. The CanonicalPSM USDC balance is on-chain verifiable without an external attestation.

---

## 11. API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/axusd/reserve-assets` | Full registry, segmented by status |
| `GET /api/axusd/reserve-sleeves` | Sleeve aggregates with eligibility labels |
| `GET /api/axusd/reserve-manager/summary` | Full ReserveManager summary |
| `GET /api/axusd/reserve-manager/coverage` | Coverage ratio inputs and breakdown |
| `GET /api/axusd/reserve-manager/attestation-status` | Attestation status per asset |

### Response guarantees

All API responses:
- Clearly distinguish live, planned, excluded, and operator-only assets
- Never include planned T-Bill assets in coverage ratio
- Include `disclosureNote` or `disclaimers` array on public endpoints
- Include `warnings` array for data quality issues

---

## 12. Dashboard Behavior

### Operator Dashboard (`/operator/reserve-registry`)

Shows the full registry including:
- Canonical source separation banner (CanonicalPSM / ReserveManager / AxiomTreasuryVault)
- Live USDC PSM reserves (eligible value highlighted in green)
- Planned Treasury sleeve (labeled PLANNED; not counted in coverage)
- Operator treasury assets (labeled INTERNAL_ONLY + EXCLUDED)
- Per-asset haircut, eligibility flags, custody source, attestation status
- Phase 1 compliance gap warnings (LendingPlatformModule, CountryAllowModule, TransferLimitModule)

### Public-Facing Labels

| Label | Meaning |
|-------|---------|
| Live | Active AXUSD backing asset |
| Planned | Future infrastructure; not current backing |
| Excluded | Not counted as AXUSD backing |
| Operator-only | Internal capital management; not public reserve |
| Not public investment product | Legal disclaimer |
| Not counted as AXUSD backing | Explicit exclusion label |
| Pending attestation | Attestation requested |
| Stale data | Past freshness threshold |
| Manual review required | Human approval needed |

---

## 13. Database or Type Model Changes

### New TypeScript types (`lib/reserves/phase2/types.ts`)

- `ReserveSleeve` — 8 sleeve types
- `ReserveAssetStatus` — 5 status values
- `CustodyType`, `ValuationSource`, `AttestationStatus`, `ReconciliationStatus`, `DisclosureStatus`
- `HaircutPolicy`, `CustodyMetadata`, `ApprovedReserveAsset`
- `ReserveSleeveAggregate`, `ReserveManagerSummary`, `ReserveCoverageResult`, `AttestationStatusSummary`

### New Drizzle schema (`shared/reserveRegistrySchema.ts`) — NOT YET MIGRATED

Tables defined, migration deferred to Phase 3:

| Table | Purpose |
|-------|---------|
| `reserve_approved_assets` | Asset registry (replaces in-memory seed) |
| `reserve_sleeve_config` | Sleeve-level configuration |
| `reserve_attestations` | Attestation records |
| `reserve_valuation_snapshots` | Periodic reserve snapshots |
| `reserve_exclusion_reasons` | Audit trail for exclusions |

**Required Phase 3 migration:** Create `0059_reserve_registry.sql` using `npx drizzle-kit generate`.

---

## 14. Phase 3 Oracle and NAV Requirements

Phase 3 must implement:

1. **T-Bill NAV oracle** — replace `fetchTbillNAV()` stub in `reserveManager.ts` with a real on-chain NAV oracle call (ERC-7726 compatible or custom)
2. **Chainlink price feeds** — replace `fetchOraclePrice()` stub with actual Chainlink or custodian-reported prices
3. **Database migration** — apply `0059_reserve_registry.sql` to replace in-memory seed
4. **Attestation publisher** — implement the attestation engine (IPFS/Arweave/HTTPS) and wire into `CustodyMetadata.attestationUrlOrCid`
5. **Compliance gap resolution** — fix LendingPlatformModule, CountryAllowModule, and TransferLimitModule before TOKENIZED_TBILL can go LIVE

---

## 15. Phase 4 Mint and Redemption Requirements

Phase 4 must implement:

1. **Mint module** — wire `isMintEligible` assets into a new mint control module (do NOT use `prepareMintInput()` stub — it throws)
2. **Redeem module** — wire `isRedeemable` assets into a new redeem control module
3. **Reserve-control governor** — governance contract that promotes assets from PLANNED to LIVE
4. **Cross-chain reserve tracking** — multi-chain sleeve aggregation

---

## 16. Risk Warnings

1. **PLANNED assets must never inflate coverage.** The `ReserveManager` enforces this invariant programmatically, but all future changes must be reviewed against this rule.

2. **Dual-counting risk.** PAXG is already counted in `CanonicalReserveSnapshot` hard-asset coverage. Any future TOKENIZED_GOLD sleeve promotion must implement explicit deduplication logic.

3. **Compliance gaps.** The three Phase 1 compliance module gaps (LendingPlatformModule, CountryAllowModule, TransferLimitModule) are documented and must be resolved before T-Bill integration goes LIVE.

4. **No mainnet deployment.** Phase 2 is entirely off-chain TypeScript/API infrastructure. No smart contracts are deployed.

5. **Oracle staleness.** `fetchTbillNAV()` and `fetchOraclePrice()` are stubs returning null. Any registry asset with `valuationSource: PLACEHOLDER` has `grossValueUsd: null` and `eligibleReserveValueUsd: 0`.

6. **AxiomTreasuryVault separation.** The vault's yield strategy AUM must never be automatically promoted to AXUSD backing. Promotion requires explicit governance action and reserve-control module support.

---

## 17. Implementation Checklist

- [x] Type system (`lib/reserves/phase2/types.ts`)
- [x] ApprovedReserveAssetRegistry with seed data
- [x] Haircut policy validation (throws on unsafe values)
- [x] computeEligibleValue() enforcement (zero-address, planned, operator, emergency-disabled)
- [x] ReserveManager (aggregation, sleeve model, Phase 3/4 stubs)
- [x] DB schema (`shared/reserveRegistrySchema.ts`, migration deferred)
- [x] API: reserve-assets
- [x] API: reserve-sleeves
- [x] API: reserve-manager/summary
- [x] API: reserve-manager/coverage
- [x] API: reserve-manager/attestation-status
- [x] Operator dashboard (`/operator/reserve-registry`)
- [x] Tests (coverage, haircut, sleeve, attestation, disclosure, exclusion invariants)
- [x] Documentation
- [ ] DB migration 0059 (Phase 3)
- [ ] T-Bill NAV oracle (Phase 3)
- [ ] Attestation publisher (Phase 3)
- [ ] Compliance gap resolution (Phase 3 blocker)
- [ ] Mint/redeem module (Phase 4)
