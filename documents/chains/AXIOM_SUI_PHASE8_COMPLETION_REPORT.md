# AXIOM SUI PHASE 8 — COMPLETION REPORT

**Date:** 2026-05-15
**Status:** FULLY VALIDATED — sui move test: 28/28 PASSED — Phase 9 blockers documented

---

## Executive Summary

Phase 8 delivers a fully hardened, staging-only Move contract implementation for the Axiom Protocol Sui distribution layer. All seven design items (A1–A7) from the Phase 7 hardening plan are implemented. The test suite reaches 28 tests. The TypeScript proof toolchain, API backend, claim UI, operator dashboard, and governance documents are complete. No canonical Axiom assets are involved at any stage.

**TESTNET ONLY. No monetary value. Not AXUSD, AXAU, AXM, SEED, or KAG.**

---

## Deliverables

### 1. Hardened Move Contracts

| File | Status | Changes |
|---|---|---|
| `sources/guarded_treasury.move` | NEW | A4 + A5: GuardedTreasury<T>, MAX_SUPPLY = 1e15, ESupplyCapExceeded = 9, TokensMinted event |
| `sources/claim_campaign.move` | HARDENED | A2: is_closed + ECampaignAlreadyClosed=8; A3: destroy_admin_cap + transfer_admin_cap; A6: frozen-package doc; A7: AdminCapDestroyed + AdminCapTransferred events |
| `sources/merkle.move` | HARDENED | A1: MAX_PROOF_DEPTH=20, EProofTooLong=7, assert in verify_proof |
| `sources/axiom_test_claim.move` | UPDATED | A4: init() creates GuardedTreasury; init_for_testing() kept for legacy tests; init_for_testing_guarded() added |

**Hardening items applied:**

| Item | Description | Status |
|---|---|---|
| A1 | MAX_PROOF_DEPTH=20 in merkle::verify_proof; EProofTooLong=7 | ✓ COMPLETE |
| A2 | is_closed flag; close_campaign sets permanently; unpause blocked with ECampaignAlreadyClosed=8 | ✓ COMPLETE |
| A3 | destroy_admin_cap() deletes UID; transfer_admin_cap() emits audit event before transfer | ✓ COMPLETE |
| A4 | TreasuryCap wrapped in GuardedTreasury at init(); no loose TreasuryCap in production | ✓ COMPLETE |
| A5 | MAX_SUPPLY = 1,000,000,000,000,000 base units; guarded_mint checks on every call | ✓ COMPLETE |
| A6 | Frozen package default documented; upgrade contingency in KEY_MANAGEMENT.md | ✓ DOCUMENTED |
| A7 | TokensMinted, AdminCapDestroyed, AdminCapTransferred events added | ✓ COMPLETE |

---

### 2. Test Suite — 28 Tests Total ✓

**claim_campaign_tests.move — 20 tests** (11 original Sprint 2 + 9 Phase 8)

| # | Test | Coverage |
|---|---|---|
| T01 | test_claim_success | Happy path single-leaf claim |
| T02 | test_claim_duplicate_rejected | EAlreadyClaimed |
| T03 | test_claim_paused_campaign | ENotActive |
| T04 | test_campaign_fund_and_pool_decreases | Two-leaf tree, both claimants |
| T05 | test_pause_unpause | Pause/unpause cycle |
| T06 | test_close_campaign | Close + claim attempt → ENotActive |
| T07 | test_update_merkle_root_sprint2 | Root rotation happy path |
| T08 | test_invalid_proof_rejected_sprint2 | EInvalidProof |
| T09 | test_insufficient_pool | EInsufficientPool |
| T10 | test_admin_cap_required | All admin ops with AdminCap |
| T11 | test_update_merkle_root_requires_paused | ECampaignNotPaused |
| N1 | test_proof_too_long_rejects_claim | A1: EProofTooLong (proof len > 20) |
| N2 | test_campaign_is_closed_flag | A2: is_closed=true after close |
| N3 | test_unpause_after_close_aborts | A2: ECampaignAlreadyClosed |
| N4 | test_destroy_admin_cap | A3: AdminCap UID deleted |
| N5 | test_transfer_admin_cap_to_new_owner | A3: New owner can admin |
| N6 | test_guarded_treasury_mint | A4: GuardedTreasury mints correct coins |
| N7 | test_supply_cap_exceeded | A5: ESupplyCapExceeded |
| N8 | test_double_mint_boundary | A5: Exact MAX_SUPPLY boundary succeeds |
| N9 | test_four_leaf_claim | Multi-depth proof (4 leaves, 2 levels) |

**merkle_tests.move — 8 tests** (6 original + 2 Phase 8)

| # | Test | Coverage |
|---|---|---|
| M1 | test_merkle_single_leaf | Single-leaf tree root == leaf |
| M2 | test_merkle_multi_leaf | Two-leaf tree, both proofs |
| M3 | test_wrong_leaf_fails | Wrong claimant returns false |
| M4 | test_tampered_proof_fails | Corrupted sibling returns false |
| M5 | test_wrong_root_fails | Valid proof against wrong root fails |
| M6 | test_compute_leaf_deterministic | Same inputs → same output |
| P1 | test_proof_depth_limit_enforced | A1: proof len 21 > MAX_PROOF_DEPTH aborts |
| P2 | test_empty_proof_nonmatch | Empty proof, wrong leaf → false |

**`sui move test` execution status: PASSED — 28/28**

```
Sui CLI: 1.72.1-94ad8ccd0ed6
Package: axiom_claim_prototype

[ PASS    ] axiom_claim_prototype::merkle_tests::test_compute_leaf_deterministic
[ PASS    ] axiom_claim_prototype::merkle_tests::test_empty_proof_nonmatch
[ PASS    ] axiom_claim_prototype::merkle_tests::test_merkle_multi_leaf
[ PASS    ] axiom_claim_prototype::merkle_tests::test_merkle_single_leaf
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_admin_cap_required
[ PASS    ] axiom_claim_prototype::merkle_tests::test_proof_depth_limit_enforced
[ PASS    ] axiom_claim_prototype::merkle_tests::test_tampered_proof_fails
[ PASS    ] axiom_claim_prototype::merkle_tests::test_wrong_leaf_fails
[ PASS    ] axiom_claim_prototype::merkle_tests::test_wrong_root_fails
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_campaign_fund_and_pool_decreases
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_campaign_is_closed_flag
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_claim_duplicate_rejected
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_claim_paused_campaign
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_claim_success
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_close_campaign
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_destroy_admin_cap
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_double_mint_boundary
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_four_leaf_claim
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_guarded_treasury_mint
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_insufficient_pool
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_invalid_proof_rejected_sprint2
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_pause_unpause
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_proof_too_long_rejects_claim
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_supply_cap_exceeded
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_transfer_admin_cap_to_new_owner
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_unpause_after_close_aborts
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_update_merkle_root_requires_paused
[ PASS    ] axiom_claim_prototype::claim_campaign_tests::test_update_merkle_root_sprint2

Test result: OK. Total tests: 28; passed: 28; failed: 0
```

**Lint warnings (informational only — no errors):**
- 8 × `unnecessary entry on public function` in `claim_campaign.move` — `public entry` is redundant; entry is preserved for PTB compatibility
- 2 × `coin::create_currency deprecated` in `axiom_test_claim.move` — test-only module; no production impact

---

### 3. TypeScript Proof Toolchain

| File | Status | Description |
|---|---|---|
| `lib/sui/types.ts` | ✓ | SuiCampaign, EligibilityEntry, ClaimPayload, ClaimStatus, etc. |
| `lib/sui/client.ts` | ✓ | SuiClient factory, network config, SUI_CONSTANTS |
| `lib/sui/campaignRegistry.ts` | ✓ | Campaign registry for testnet campaigns |
| `lib/sui/mysten-shims.d.ts` | ✓ | Local declare module shims for @mysten/sui/client |
| `lib/sui/proofs/buildMerkleTree.ts` | ✓ | keccak256 Merkle tree; BCS encoding (manual, no @mysten/sui/bcs) |
| `lib/sui/proofs/generateProof.ts` | ✓ | Sibling-based proof generation |
| `lib/sui/proofs/verifyProofLocal.ts` | ✓ | Client-side proof verification mirroring Move logic |
| `lib/sui/proofs/validateEligibilityCsv.ts` | ✓ | CSV parser + validation (duplicates, address format, u64 bounds) |
| `lib/sui/proofs/serializeProof.ts` | ✓ | ClaimPayload serializer, ProofManifest builder |
| `lib/sui/proofs/index.ts` | ✓ | Barrel export |

**BCS encoding note:** `@mysten/sui/bcs` is ESM-only and incompatible with the project's `moduleResolution: "node"`. Replaced with 6-line manual BCS encoding (address = 32-byte hex decode, u64 = 8-byte little-endian) which is deterministically correct and matches the Move contract.

---

### 4. API Backend

| Route | Method | Status |
|---|---|---|
| `/api/sui/campaigns` | GET | ✓ Returns all registered testnet campaigns |
| `/api/sui/campaign/[id]` | GET | ✓ Returns single campaign by ID |
| `/api/sui/eligibility` | POST | ✓ Checks address eligibility; returns proof or reason |
| `/api/sui/claim-status` | GET | ✓ Returns on-chain claim status (Phase 9: real RPC query) |

---

### 5. Claim UI

**File:** `pages/sui/claim.tsx`

- DesignLawLayout wrapper (named import)
- Prominent TESTNET ONLY disclaimer
- Address input with format validation
- Eligibility check via `/api/sui/eligibility`
- State machine: idle → checking → eligible / not_eligible / already_claimed / campaign_inactive / campaign_closed / proof_unavailable / error
- Proof toolchain status panel
- Wallet connect CTA disabled with "Phase 9" label
- All Design Law styling: serif headings, monospace data, dl-* color tokens

---

### 6. Operator Dashboard

**File:** `pages/operator/chains/sui-phase8.tsx`

- `requireOperatorCookie` server-side guard
- OperatorConsoleLayout wrapper (no title prop — confirmed against component interface)
- Phase 9 readiness banner
- 10-row workstream status table
- 8-finding security summary table
- Custody & authorization panel
- Open blockers list (6 items)
- Document links section

---

### 7. Governance Documents

| Document | Status | Contents |
|---|---|---|
| `AXIOM_SUI_PHASE8_SECURITY_REVIEW.md` | UNDER REVIEW | 13 risk categories, 4 open findings (all INFO/LOW), external audit required |
| `AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md` | DESIGN COMPLETE | 2-of-3 custody model, quorum table, key rotation, compromise response, Phase 9 checklist |
| `AXIOM_SUI_PHASE8_AUTHORIZATION.md` | UNSIGNED | Scope, exclusions, deliverables summary, Phase 9 conditions, 3-party signature block |

---

## TypeScript Validation

```
npx tsc --noEmit  →  9 errors (ALL pre-existing commodity module errors)

Phase 8 files with zero errors:
  lib/sui/types.ts
  lib/sui/client.ts
  lib/sui/campaignRegistry.ts
  lib/sui/mysten-shims.d.ts
  lib/sui/proofs/buildMerkleTree.ts
  lib/sui/proofs/generateProof.ts
  lib/sui/proofs/verifyProofLocal.ts
  lib/sui/proofs/validateEligibilityCsv.ts
  lib/sui/proofs/serializeProof.ts
  lib/sui/proofs/index.ts
  pages/api/sui/campaigns.ts
  pages/api/sui/campaign/[id].ts
  pages/api/sui/eligibility.ts
  pages/api/sui/claim-status.ts
  pages/sui/claim.tsx
  pages/operator/chains/sui-phase8.tsx

Pre-existing errors (not Phase 8 scope):
  components/commodities/CommodityComparisonTable.tsx — CommodityProductStatus
  components/commodities/CommodityStatusBadge.tsx — CommodityProductStatus
  lib/assets/hub.ts — getCommodity
  lib/commodities/admissions.ts — CommodityCategory, CommodityProductStatus
  pages/commodities/index.tsx — COMMODITY_REGISTRY, implicit any (3 errors)
```

---

## Move CLI Status

**Sui CLI:** `1.72.1-94ad8ccd0ed6` installed at `~/.local/bin/sui`
**Install method:** Pre-built Linux binary from GitHub releases (`testnet-v1.72.1-ubuntu-x86_64.tgz`)
**`sui move test` execution:** PASSED — 28/28, 0 failed

```bash
# Reproduce install
mkdir -p ~/.local/bin
TAG=testnet-v1.72.1
curl -fL "https://github.com/MystenLabs/sui/releases/download/${TAG}/sui-${TAG}-ubuntu-x86_64.tgz" \
  -o /tmp/sui.tgz
tar -xzf /tmp/sui.tgz -C ~/.local/bin/ --occurrence=1 ./sui
chmod +x ~/.local/bin/sui
rm /tmp/sui.tgz
export PATH="$HOME/.local/bin:$PATH"

# Run tests
cd sui/packages/axiom_claim_prototype
sui move test
# Result: Test result: OK. Total tests: 28; passed: 28; failed: 0
```

---

## Open Phase 9 Blockers

1. **External Move security audit** — Required. Engage a qualified Sui/Move security firm. Reference: `AXIOM_SUI_PHASE8_SECURITY_REVIEW.md`.
2. **2-of-3 key ceremony** — Key generation, multisig address construction, AdminCap transfer to multisig. Reference: `AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md`.
3. **Authorization package signed** — 3 signatures required. Reference: `AXIOM_SUI_PHASE8_AUTHORIZATION.md`.
4. **Proof toolchain integration test** — CSV → Merkle root → proof → on-chain claim (full round-trip on testnet).
5. **Wallet connect integration** — `@suiet/wallet-kit` or `@mysten/wallet-standard` integration for claim UI.
6. **Package redeployment** — Hardened A1–A7 contracts require a new `sui client publish` to testnet (frozen, no UpgradeCap).

---

## Explicit Non-Actions (Phase 8 Scope Boundaries)

- `CHAIN_SUI_ENABLED` was NOT set to `true`
- `MULTICHAIN_ENABLED` was NOT set to `true`
- No canonical Axiom asset (AXUSD, AXAU, AXM, SEED, KAG) was issued or connected
- No bridge code was written
- No mainnet deployment was attempted
- No production banking rail (Increase, Unit, Stellar) was connected
- No ACH or wire integration was added

---

*Axiom Protocol — Sui Phase 8 — Completed 2026-05-15*
*All work is testnet staging only. No production activation. No canonical assets.*
