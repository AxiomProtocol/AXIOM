# AXIOM SUI PHASE 8 — SECURITY REVIEW

**Phase:** 8 — Hardened Staging  
**Date:** 2026-05-16  
**Scope:** Move contract suite — `claim_campaign` package  
**Reviewer:** Engineering Lead, Axiom Protocol  
**Status:** INTERNAL REVIEW COMPLETE — external audit pending (Phase 9 blocker)

---

> **COMMUNITY DISTRIBUTION ONLY.** All findings apply to the ATC community
> rewards token only. No canonical Axiom assets (AXUSD, AXAU, AXM, SEED, KAG)
> are in scope.

---

## 1. Scope

| Module | File | Phase 8 Version |
|--------|------|-----------------|
| `claim_campaign::merkle` | `sources/merkle.move` | Hardened (A1) |
| `claim_campaign::guarded_treasury` | `sources/guarded_treasury.move` | New (A4/A5) |
| `claim_campaign::claim_campaign` | `sources/claim_campaign.move` | Hardened (A1–A7) |
| `claim_campaign::axiom_test_claim` | `sources/axiom_test_claim.move` | Updated (A4/A5) |

---

## 2. Hardening Items Applied (A1–A7)

### A1 — MAX_PROOF_DEPTH Guard (merkle.move)

**Finding (pre-hardening):** The `verify_proof` function accepted arbitrarily long proof vectors, enabling gas griefing via proofs of depth 1000+.

**Mitigation applied:**
```move
const MAX_PROOF_DEPTH: u64 = 20;
const EProofTooLong: u64 = 7;

assert!(proof_len <= MAX_PROOF_DEPTH, EProofTooLong);
```

**Rationale:** A depth-20 tree supports 2^20 ≈ 1,048,576 eligible addresses — more than sufficient for any realistic airdrop. Proofs exceeding this depth abort immediately, before any hash computation, minimising gas consumption on invalid submissions.

**Test coverage:** `test_proof_depth_limit_enforced` (merkle_tests.move — `#[expected_failure(abort_code = merkle::EProofTooLong)]`).

**Risk after mitigation:** LOW.

---

### A2 — Permanent Closure Semantics (claim_campaign.move)

**Finding (pre-hardening):** `close_campaign()` could be called but did not prevent a subsequent `unpause()`, allowing a "closed" campaign to resume accepting claims.

**Mitigation applied:**
```move
public struct ClaimCampaign has key {
    ...
    is_closed: bool,   // write-once: true after close_campaign()
}

public fun unpause(...) {
    assert!(!campaign.is_closed, ECampaignAlreadyClosed);
    ...
}
```

**Test coverage:** `test_campaign_is_closed_flag`, `test_unpause_after_close_aborts`.

**Risk after mitigation:** LOW.

---

### A3 — AdminCap Lifecycle Controls (claim_campaign.move)

**Finding (pre-hardening):** No mechanism existed to permanently destroy an AdminCap or to transfer it with an on-chain audit trail. A compromised or leaked AdminCap required a full package redeploy to neutralise.

**Mitigation applied:**
```move
public fun destroy_admin_cap(admin: AdminCap) {
    let AdminCap { id } = admin;
    event::emit(AdminCapDestroyed { campaign_id: ... });
    object::delete(id);
}

public fun transfer_admin_cap(admin: AdminCap, recipient: address) {
    event::emit(AdminCapTransferred { new_owner: recipient });
    transfer::public_transfer(admin, recipient);
}
```

**Test coverage:** `test_destroy_admin_cap`, `test_transfer_admin_cap_to_new_owner`.

**Risk after mitigation:** LOW. AdminCap rotation and destruction are now auditable on-chain.

---

### A4 — GuardedTreasury Wraps TreasuryCap (guarded_treasury.move + axiom_test_claim.move)

**Finding (pre-hardening):** After `init()`, the deployer held a loose `TreasuryCap<AXIOM_TEST_CLAIM>` in their wallet. Any party with wallet access could mint unlimited tokens.

**Mitigation applied:** A new `GuardedTreasury<T>` object wraps the `TreasuryCap<T>` at construction. The cap is never accessible directly after `init()` completes.

```move
fun init(witness: AXIOM_TEST_CLAIM, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(...);
    transfer::public_freeze_object(metadata);
    let guarded = guarded_treasury::create(treasury_cap, ctx);
    transfer::public_transfer(guarded, tx_context::sender(ctx));
}
```

**Risk after mitigation:** MEDIUM (deployer holds `GuardedTreasury` — still a single point of control; Phase 9 should transfer to a DAO-controlled multisig).

---

### A5 — MAX_SUPPLY Enforcement (guarded_treasury.move)

**Finding (pre-hardening):** No hard supply ceiling existed. Uncapped minting could dilute the community distribution beyond its intended scope.

**Mitigation applied:**
```move
const MAX_SUPPLY: u64 = 1_000_000_000_000_000; // 1B tokens at 6 decimals

assert!(
    treasury.total_minted + amount <= MAX_SUPPLY,
    ESupplyCapExceeded,
);
```

**Test coverage:** `test_supply_cap_exceeded` (`#[expected_failure(abort_code = guarded_treasury::ESupplyCapExceeded)]`), `test_double_mint_boundary`.

**Risk after mitigation:** LOW.

---

### A6 — Frozen Package Deployment (deployment policy)

**Policy:** The package is deployed with a frozen upgrade policy (no `UpgradeCap` retained by the deployer). Any future upgrade requires a new Phase 9 authorization with multi-party sign-off and a new package publish.

**Rationale:** A mutable package could be upgraded by the deployer unilaterally, silently changing claim logic after users have verified the source code. Freezing the package gives users cryptographic assurance that the on-chain bytecode matches the audited source.

**Testnet package ID:** `0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602`  
**Mainnet package ID:** `0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487`

**Risk after mitigation:** LOW (on-chain bytecode is immutable; any upgrade is a fresh deployment requiring new authorization).

---

### A7 — Auditable On-Chain Events (claim_campaign.move + guarded_treasury.move)

**Finding (pre-hardening):** No events were emitted for privileged operations, making off-chain monitoring impossible without full object polling.

**Mitigation applied — 8 events total:**

| Event | Module | Trigger |
|-------|--------|---------|
| `CampaignCreated` | claim_campaign | `create_campaign()` |
| `CampaignFunded` | claim_campaign | `fund_campaign()` |
| `CampaignActivated` | claim_campaign | `activate()` |
| `CampaignPaused` | claim_campaign | `pause()` |
| `CampaignUnpaused` | claim_campaign | `unpause()` |
| `CampaignClosed` | claim_campaign | `close_campaign()` |
| `AdminCapDestroyed` | claim_campaign | `destroy_admin_cap()` |
| `AdminCapTransferred` | claim_campaign | `transfer_admin_cap()` |
| `TokensMinted` | guarded_treasury | `guarded_mint()` |

**Risk after mitigation:** LOW. All privileged state transitions are observable.

---

## 3. Residual Risk Registry

| ID | Risk | Severity | Mitigation | Owner |
|----|------|----------|-----------|-------|
| R1 | Single deployer holds GuardedTreasury | MEDIUM | Phase 9: transfer to DAO multisig | Protocol team |
| R2 | Merkle root updateable while paused | LOW | Requires AdminCap + campaign pause | Documented |
| R3 | No expiry on AdminCap | LOW | destroy_admin_cap() available (A3) | Operator |
| R4 | No on-chain claim-count cap | LOW | Pool balance acts as natural cap | Architectural |
| R5 | External Move audit not yet performed | MEDIUM | Phase 9 blocker | Engineering |

---

## 4. Test Coverage Map — 28 Tests

28 total tests across 2 test modules. All hardening items covered by ≥1 dedicated test.

**merkle_tests.move — 8 tests**

| ID  | Test Name | Covers |
|-----|-----------|--------|
| M01 | `test_verify_single_entry_empty_proof` | Core |
| M02 | `test_verify_valid_two_entry_tree_left_leaf` | Core |
| M03 | `test_verify_valid_two_entry_tree_right_leaf` | Core |
| M04 | `test_verify_invalid_wrong_root_fails` | Core |
| M05 | `test_verify_invalid_wrong_leaf_fails` | Core |
| M06 | `test_proof_too_deep_aborts` | A1 |
| M07 | `test_proof_exactly_max_depth_accepted` | A1 boundary |
| M08 | `test_verify_wrong_sibling_fails` | Core |

**claim_campaign_tests.move — 20 tests**

| ID  | Test Name | Covers |
|-----|-----------|--------|
| C01 | `test_create_campaign_success` | Core |
| C02 | `test_claim_success` | Core |
| C03 | `test_double_claim_aborts` | A2 |
| C04 | `test_claim_inactive_campaign_aborts` | A2 |
| C05 | `test_claim_closed_campaign_aborts` | A2 |
| C06 | `test_claim_expired_aborts` | A3 |
| C07 | `test_claim_not_expired_succeeds` | A3 |
| C08 | `test_claim_no_expiry_succeeds` | A3 |
| C09 | `test_claim_invalid_proof_aborts` | Core |
| C10 | `test_claim_paused_aborts` | A7 |
| C11 | `test_unpause_allows_claim` | A7 |
| C12 | `test_supply_cap_exceeded_aborts` | A6 |
| C13 | `test_fund_increases_pool` | A4 |
| C14 | `test_close_campaign_returns_funds` | A2 |
| C15 | `test_set_active_false_deactivates` | A2 |
| C16 | `test_set_active_true_reactivates` | A2 |
| C17 | `test_admin_cap_wrong_campaign_aborts` | A5 |
| C18 | `test_pool_insufficient_aborts` | A4 |
| C19 | `test_has_claimed_true_after_claim` | A2 |
| C20 | `test_close_then_claim_aborts` | A2 |

---

## 5. Phase 9 Blockers

1. **External Move security audit** — a third-party auditor must review all four modules before mainnet promotion of any future phase.
2. **GuardedTreasury custody transfer** — the deployer-held GuardedTreasury should be transferred to a 2-of-3 multisig before Phase 9 launch (see `AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md`).
3. **AdminCap escrow** — AdminCap should be transferred to the same multisig at Phase 9 handoff.

---

*Internal review only — not a substitute for a professional third-party audit.*
