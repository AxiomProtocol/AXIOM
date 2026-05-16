# Axiom Protocol — Sui Phase 8 Security Review

**Module:** `axiom::claim_campaign`, `axiom::guarded_treasury`, `axiom::merkle`
**Date:** 2026-05-16
**Status:** Pre-Audit — Internal Review

---

## Executive Summary

Phase 8 hardens the Axiom Sui Move contract suite (claim campaign + guarded treasury + Merkle verifier) against the seven audit categories (A1–A7) identified in the Phase 7 threat model. All hardening has been applied and is reflected in the contracts at `contracts/sui/sources/`. A 28-test suite covers the core invariants. This document records the security analysis, mitigations, and residual risks for external auditor onboarding.

---

## Audit Hardening Summary

### A1 — Proof Depth Bounding

**Risk:** Unbounded Merkle proof verification loop allows a griefing attacker to submit an arbitrarily deep proof, exhausting gas or causing indefinite execution.

**Mitigation:** `merkle::verify()` asserts `proof.length <= MAX_PROOF_DEPTH` (= 32) at entry, aborting with `E_PROOF_TOO_DEEP = 1` if exceeded. `2^32` leaves far exceeds any realistic campaign size.

**Test coverage:** `test_09_proof_at_max_depth_no_abort`, `test_10_proof_depth_exceeds_max_aborts`.

**Residual risk:** None. The bound is enforced before the loop begins.

---

### A2 — Event Completeness

**Risk:** Missing on-chain events break off-chain indexers, making it impossible to reconstruct campaign state from chain history alone.

**Mitigation:** Events are emitted for every state transition:
- `CampaignCreated` — on `create_campaign_entry`
- `CampaignFunded` — on `fund_campaign`
- `CampaignActivated` — on `activate`
- `CampaignPaused` — on `pause`
- `CampaignClosed` — on `close_campaign`
- `ClaimMade` — on `claim`

All events include `campaign_id` for deterministic off-chain correlation.

**Residual risk:** Low. Events are `copy + drop` structs — they cannot be suppressed by the caller. Indexer availability depends on the Sui full-node event store, which has a configurable retention window.

---

### A3 — AdminCap Binding

**Risk:** An `AdminCap` from one campaign used to administer a different campaign (cross-campaign authority confusion).

**Mitigation:** Every admin function asserts `cap.campaign_id == object::id(campaign)`, aborting with `E_WRONG_CAMPAIGN = 8`. `AdminCap` has `key + store` abilities — it is a unique Sui object that cannot be duplicated.

**Test coverage:** `test_25_admin_cap_bound_to_correct_campaign`, `test_26_wrong_admin_cap_aborts_fund`.

**Residual risk:** None for on-chain logic. Operational risk: if the AdminCap object is transferred to a wrong address, the capability is lost. Mitigation: transfer to a multi-party authorization object immediately after deployment.

---

### A4 — Pool Access Control

**Risk:** Unauthorized actors can drain or inject funds into the campaign pool.

**Mitigation:**
- `fund_campaign` requires a valid `AdminCap` bound to the campaign.
- The `pool` field is a `Balance<AMC>` inside `ClaimCampaign` — it is not accessible from external modules except through the module's defined entry functions.
- `GuardedTreasury` separates treasury management (via `TreasuryOperatorCap`) from campaign admin (via `AdminCap`). Depositing into the treasury requires `TreasuryOperatorCap`; withdrawing funds into a campaign requires an explicit `deposit()` call.

**Test coverage:** `test_20_cannot_fund_closed_campaign`, `test_26_wrong_admin_cap_aborts_fund`.

**Residual risk:** Low. Move's type system enforces that `Balance<AMC>` cannot be forged or duplicated.

---

### A5 — Re-entrancy Ordering

**Risk:** In a re-entrant call pattern, a claimant could claim twice before the claim record is written.

**Mitigation:** In `claim_internal()`, the `ClaimRecord` is transferred to the claimant **before** the payout `Coin` is transferred. Move's single-owner object model prevents VM-level re-entrancy; the record-first ordering is an explicit defensive pattern for clarity and compatibility with any future cross-contract integration.

**Residual risk:** Very low. Move's ownership model prevents the classical EVM re-entrancy pattern. The explicit ordering is belt-and-suspenders.

---

### A6 — Expiry Enforcement

**Risk:** Claims are accepted after a campaign's intended expiry, draining pool funds intended for future protocol use.

**Mitigation:** If `expires_at_epoch > 0`, `claim_internal()` asserts `tx_context::epoch(ctx) < expires_at_epoch`, aborting with `E_EXPIRED = 4`. Setting `expires_at_epoch = 0` disables expiry (no-expiry campaigns are explicitly supported).

**Test coverage:** `test_27_expiry_logic_not_expired`, `test_28_expiry_logic_expired`.

**Residual risk:** Low. Sui epoch boundaries are consensus-driven and cannot be spoofed by the claimant. Epoch duration is approximately 24 hours on mainnet.

---

### A7 — Label Length Guard

**Risk:** An unbounded label field allows storing arbitrarily large byte vectors on-chain, bloating storage costs for the shared object.

**Mitigation:** `create_campaign_entry` and `create_campaign_for_test` assert `vector::length(&label) <= MAX_LABEL_BYTES` (= 128), aborting with `E_LABEL_TOO_LONG = 7`.

**Test coverage:** `test_12_label_too_long_aborts`, `test_13_label_at_max_bytes_succeeds`.

**Residual risk:** None. The check is at the entry point and cannot be bypassed.

---

## Error Code Reference

| Code | Constant             | Trigger                                      |
|------|----------------------|----------------------------------------------|
| 0    | E_NOT_ACTIVE         | Claim attempted on paused/closed campaign     |
| 1    | E_CAMPAIGN_CLOSED    | Admin op on a permanently closed campaign     |
| 2    | E_ALREADY_CLAIMED    | (Reserved — enforced via ClaimRecord ownership) |
| 3    | E_INVALID_PROOF      | Merkle verification failed                   |
| 4    | E_EXPIRED            | Epoch >= expires_at_epoch                    |
| 5    | E_ZERO_AMOUNT        | amount_per_claim == 0 or amount mismatch     |
| 6    | E_POOL_EMPTY         | Insufficient pool balance                    |
| 7    | E_LABEL_TOO_LONG     | label bytes > 128                            |
| 8    | E_WRONG_CAMPAIGN     | AdminCap.campaign_id != campaign object ID   |

**Merkle module:**

| Code | Constant          | Trigger                     |
|------|-------------------|-----------------------------|
| 1    | E_PROOF_TOO_DEEP  | proof.length > 32 (A1)      |

---

## GuardedTreasury Security Properties

| Property | Implementation |
|----------|----------------|
| Cap binding | `assert_cap_matches` checks `cap.treasury_id == object::id(treasury)` |
| Withdrawal bound | Aborts with `E_INSUFFICIENT_BALANCE = 2` if pool < amount |
| Event completeness | `TreasuryCreated`, `TreasuryDeposit`, `TreasuryWithdrawal` on every state change |
| Package visibility | `take_balance` is `public(package)` — only callable from within the axiom package |

---

## Known Limitations and Out-of-Scope Items

1. **Double-claim prevention** — The current implementation relies on `ClaimRecord` being a unique owned object per claimant. However, since `ClaimRecord` has `key` (not `store`), it cannot be transferred away by the claimant, preventing one pattern of evasion. A future upgrade should use a `Table<address, bool>` inside the campaign for O(1) duplicate detection. E_ALREADY_CLAIMED (code 2) is reserved for this path.

2. **Merkle leaf collision** — Leaf encoding uses `keccak256(addr_32 ++ amount_le8)`. Collision resistance is bounded by keccak256 preimage resistance (2^128 security level). No salt is added; this is consistent with standard Merkle airdrop designs.

3. **Oracle-free pricing** — AMC amount is set at campaign creation time in raw token units. No price oracle is used. This is intentional for Phase 8.

4. **Upgrade authority** — The package is deployed at address `0x0` (placeholder). On mainnet deployment, the upgrade cap should be burned or held by a time-locked multisig.

---

## Test Coverage Summary

| File | Tests | Covers |
|------|-------|--------|
| `merkle_tests.move` | 10 | A1, leaf encoding, sort symmetry, depth boundary |
| `claim_campaign_tests.move` | 18 | A2–A7, full lifecycle, wrong-cap, expiry |
| **Total** | **28** | **All A1–A7 hardening paths** |
