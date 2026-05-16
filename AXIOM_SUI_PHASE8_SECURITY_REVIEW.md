# AXIOM SUI PHASE 8 — SECURITY REVIEW

**Package:** `axiom_claim_mainnet_candidate`
**Review Date:** 2026-05-16
**Reviewer:** Axiom Protocol Engineering — Internal Pre-Audit
**Classification:** Internal Only — Not an External Audit Report

---

## 1. Scope

| Module | Role |
|---|---|
| `axiom_mainnet_claim` | One-time witness, currency registration, GuardedTreasury init |
| `guarded_treasury` | Wraps TreasuryCap; enforces MAX_SUPPLY; emits TokensMinted |
| `merkle` | Keccak256 binary Merkle proof verification; MAX_PROOF_DEPTH guard |
| `claim_campaign` | Campaign lifecycle, eligibility gating, payout, admin controls |

All modules are tagged Community Rewards Only — non-financial, no monetary value, not redeemable for any canonical Axiom asset (AXUSD, AXAU, AXM, SEED, KAG).

---

## 2. Hardening Items Applied (A1–A7)

### A1 — Proof Depth Limit
- `merkle::MAX_PROOF_DEPTH = 20` (supports 2^20 ≈ 1M leaves)
- `verify_proof` aborts with `EProofTooLong (7)` if `proof.length > 20`
- Prevents gas griefing via unbounded loop iteration
- **Status: IMPLEMENTED — tested in `test_proof_too_long_rejects_claim` and `test_proof_depth_limit_enforced`**

### A2 — Campaign Close is Permanent
- `is_closed` flag set on `close_campaign`; never cleared
- `unpause` aborts with `ECampaignAlreadyClosed (8)` if `is_closed == true`
- Prevents re-activation of drained campaigns
- **Status: IMPLEMENTED — tested in `test_campaign_is_closed_flag` and `test_unpause_after_close_aborts`**

### A3 — AdminCap Lifecycle Controls
- `destroy_admin_cap(admin: AdminCap)` permanently destroys cap; emits `AdminCapDestroyed`
- `transfer_admin_cap(admin, recipient)` hands cap to new address; emits `AdminCapTransferred`
- No cloning or duplication possible (Move linear type system enforces uniqueness)
- **Status: IMPLEMENTED — tested in `test_destroy_admin_cap` and `test_transfer_admin_cap_to_new_owner`**

### A4 — GuardedTreasury Wrapper
- `TreasuryCap<T>` is wrapped inside `GuardedTreasury<T>` at currency init
- No loose `TreasuryCap` ever exposed to callers
- `coin::mint` only reachable through `guarded_mint()`
- **Status: IMPLEMENTED — init wraps cap; `init_for_testing_guarded` used in tests**

### A5 — Supply Cap Enforcement
- `GuardedTreasury::MAX_SUPPLY = 1_000_000_000_000_000` (1 quadrillion base units)
- `guarded_mint` asserts `total_minted + amount <= MAX_SUPPLY` before minting
- Aborts with `ESupplyCapExceeded (9)` on violation
- `total_minted` accumulates monotonically
- **Status: IMPLEMENTED — tested in `test_supply_cap_exceeded` and `test_double_mint_boundary`**

### A6 — Sorted Sibling Hashing (Second-Preimage Resistance)
- Merkle sibling pairs are sorted lexicographically before hashing: `min || max`
- Prevents second-preimage attacks via position-independent proofs
- `bytes_lte()` implements the ordering
- **Status: IMPLEMENTED — structural property verified by multi-leaf tests**

### A7 — BCS-Encoded Leaf Construction
- `leaf = keccak256(BCS(address) || BCS(u64_amount))`
- BCS(address) = 32 raw bytes; BCS(u64) = 8 bytes little-endian
- Deterministic and collision-resistant for distinct (addr, amount) pairs
- **Status: IMPLEMENTED — verified in `test_compute_leaf_deterministic`**

---

## 3. Attack Surface Analysis

### 3.1 Merkle Proof Manipulation
**Threat:** Attacker submits crafted proof to claim for ineligible address.
**Mitigations:**
- Leaf binds both address (32B) and amount (8B) — cannot claim wrong amount
- Sorted sibling hashing prevents position-swap attacks
- Empty proof succeeds only if `leaf == root` (single-element tree)
- MAX_PROOF_DEPTH prevents gas exhaustion

**Residual Risk:** Off-chain root construction must be correct. A malformed root uploaded by admin would allow wrong claims or block all claims. Root update requires campaign pause (A2).

### 3.2 Double Claim
**Threat:** Same address claims twice.
**Mitigations:**
- `Table<address, bool>` claimed registry; `table::contains` check before any state change
- `EAlreadyClaimed (3)` abort with no partial payout
- Sui object model: no reentrancy across transactions

**Residual Risk:** None identified.

### 3.3 Admin Privilege Escalation
**Threat:** Unauthorized party executes admin functions.
**Mitigations:**
- All admin functions require `&AdminCap` reference
- AdminCap is a unique Move object (key+store) — cannot be forged
- Transfer and destroy lifecycle fully controlled
- AdminCap not stored on ClaimCampaign — no self-escalation path

**Residual Risk:** Initial AdminCap holder is the `create_campaign_entry` caller. Key management per `AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md`.

### 3.4 Pool Drain / Infinite Mint
**Threat:** Attacker mints tokens beyond supply cap or drains pool beyond its balance.
**Mitigations:**
- `balance::split` aborts on underflow (Sui framework guarantee)
- `EInsufficientPool (5)` explicit check before split
- `MAX_SUPPLY` enforced by GuardedTreasury; TreasuryCap not accessible directly

**Residual Risk:** None identified.

### 3.5 Epoch Manipulation (Expiry)
**Threat:** Attacker exploits epoch check to claim on expired campaign.
**Mitigations:**
- `expires_at_epoch == 0` disables expiry (explicit sentinel value)
- Epoch is read from `TxContext` — not caller-supplied
- Validators determine epoch; cannot be manipulated by individual transactions

**Residual Risk:** If `expires_at_epoch` is set too far in the future by misconfiguration, campaign remains open longer than intended. Operator mitigates via `pause()`.

### 3.6 Upgrade / Package Freeze
**Threat:** Package is upgraded post-deployment to alter claim logic.
**Mitigations:**
- Upgrade policy is FROZEN — `UpgradeCap` is not retained after publish
- Any upgrade requires new Phase 10 multi-party authorization process
- Documented in contract header comment

**Residual Risk:** Requires social engineering of multi-party authorization to change — not a protocol-level risk.

---

## 4. Test Coverage Summary

| Test | Module | Hardening Item |
|---|---|---|
| test_eligible_claim_succeeds | claim_campaign | Core path |
| test_duplicate_claim_rejected | claim_campaign | Double-claim guard |
| test_non_eligible_rejected | claim_campaign | Proof gating |
| test_paused_campaign_blocks_claim | claim_campaign | Lifecycle |
| test_pause_unpause_cycle | claim_campaign | Lifecycle |
| test_insufficient_pool_rejects_claim | claim_campaign | Pool safety |
| test_update_merkle_root_paused | claim_campaign | Root update |
| test_update_root_active_aborts | claim_campaign | Root update guard |
| test_close_campaign_drains_pool | claim_campaign | Close permanence |
| test_multi_claimant_both_claim | claim_campaign | Multi-party |
| test_proof_too_long_rejects_claim | claim_campaign | A1 |
| test_campaign_is_closed_flag | claim_campaign | A2 |
| test_unpause_after_close_aborts | claim_campaign | A2 |
| test_destroy_admin_cap | claim_campaign | A3 |
| test_transfer_admin_cap_to_new_owner | claim_campaign | A3 |
| test_guarded_treasury_mint | claim_campaign | A4 |
| test_supply_cap_exceeded | claim_campaign | A5 |
| test_double_mint_boundary | claim_campaign | A5 boundary |
| test_four_leaf_claim | claim_campaign | Multi-depth proof |
| test_pool_balance_accumulates | claim_campaign | Pool accounting |
| test_merkle_single_leaf | merkle | Core path |
| test_merkle_multi_leaf | merkle | Core path |
| test_wrong_leaf_fails | merkle | Negative |
| test_tampered_proof_fails | merkle | Negative |
| test_wrong_root_fails | merkle | Negative |
| test_compute_leaf_deterministic | merkle | A7 |
| test_proof_depth_limit_enforced | merkle | A1 |
| test_empty_proof_nonmatch | merkle | Edge case |

**Total: 28 tests — all passing in Session 5 validation (56/56 across both packages)**

---

## 5. Accepted Risk Items

| Item | Rationale |
|---|---|
| External audit deferred | Community rewards token only; no monetary value |
| Epoch-based expiry relies on validator consensus | Sui protocol property; not mitigable at contract level |
| AdminCap key management is off-chain | Documented in KEY_MANAGEMENT.md |
| Root construction correctness is off-chain | Validated by TypeScript proof toolchain (validateEligibilityCsv) |

---

## 6. Recommendation

**APPROVED FOR TESTNET DEPLOYMENT** — pending Sui CLI final test run with binary reinstall.

Mainnet deployment requires: external audit or formal verification by Mysten Labs certified auditor, multi-party key ceremony for AdminCap, and UpgradeCap destruction on-chain.
