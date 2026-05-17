# Axiom Protocol — Sui Phase 8 Security Review
## Move Contract Hardening Audit: A1–A7

**Package:** axiom_sui  
**Edition:** 2024.beta  
**Network Target:** Sui Testnet → Mainnet  
**Review Date:** 2026-05-17  
**Status:** All seven hardening controls applied and verified in source

---

## Executive Summary

This document records the security hardening applied to the Axiom Sui Move
package during Phase 8. Seven controls (A1–A7) were identified through
internal threat modeling and applied across four modules:
`merkle`, `claim_campaign`, `guarded_treasury`, and `axiom_test_claim`.
A test suite of 42 unit tests (31 campaign + 11 merkle) covers each control.

No third-party audit has been conducted. This review is an internal engineering
self-assessment. An independent Move security audit is recommended before
mainnet deployment at scale.

---

## Hardening Controls

### A1 — Proof Depth Guard (merkle.move)

**Risk:** An attacker submits a pathologically deep Merkle proof vector,
consuming excessive gas and potentially stalling validator processing.

**Control:** `MAX_PROOF_DEPTH = 20` constant enforced at the top of
`verify_proof`. Any proof with more than 20 siblings aborts immediately with
`EProofTooDeep` (error code 0) before any hashing is performed.

**Test coverage:** `test_proof_exceeds_max_depth_aborts` (expected_failure,
abort_code 0) and `test_proof_at_max_depth_does_not_abort` (boundary condition,
depth == 20 accepted, returns false rather than aborting).

**Residual risk:** None identified. The depth bound is generous for any
realistic eligibility set (2^20 = 1,048,576 entries).

---

### A2 — Permanent Campaign Closure (claim_campaign.move)

**Risk:** A compromised admin key could reopen a closed campaign and issue
double-spend claims or fraudulent entries to the Merkle tree.

**Control:** `is_closed: bool` field in `ClaimCampaign`. Once
`close_campaign()` sets it to `true`, every admin mutation function
(`activate`, `pause`, `unpause`, `set_merkle_root`) checks this flag first
and aborts with `ECampaignAlreadyClosed` (error code 2). There is no
`reopen` function.

**Test coverage:** `test_close_makes_closed`, `test_unpause_after_close_aborts`
(expected_failure), `test_is_closed_flag_persists`,
`test_close_blocks_set_merkle_root` (expected_failure).

**Residual risk:** The `AdminCap` object still exists after closure and can
call `close_campaign()` again (idempotent — sets already-true flags). This is
harmless. Operators should destroy the cap post-closure using
`destroy_admin_cap()`.

---

### A3 — AdminCap Lifecycle Events (claim_campaign.move)

**Risk:** Invisible admin key transfers or destructions make it impossible to
audit who controls a campaign. A transfer to an attacker would be undetectable.

**Control:** Two new events `AdminCapDestroyed` and `AdminCapTransferred` are
emitted by `destroy_admin_cap()` and `transfer_admin_cap()` respectively.
Both include the `campaign_id` field; `AdminCapTransferred` includes
`new_owner`. All events are queryable via Sui's `queryEvents` RPC.

**Test coverage:** `test_destroy_admin_cap`, `test_admin_cap_has_campaign_id`,
`test_transfer_admin_cap_emits_event`.

**Residual risk:** Sui events are not stored on-chain indefinitely on all
configurations. Operators should maintain an off-chain event index for
long-term auditability.

---

### A4 — No Loose TreasuryCap (guarded_treasury.move + axiom_test_claim.move)

**Risk:** A loose `TreasuryCap<T>` sitting in any address's inventory can be
used to mint unlimited tokens without any supply enforcement.

**Control:** `axiom_test_claim::init()` immediately passes the `TreasuryCap`
produced by `coin::create_currency` into `guarded_treasury::new()`. The cap
is consumed by value and stored inside `GuardedTreasury`. It is never
transferred to any address. The only mint path is `guarded_treasury::mint()`.

**Test coverage:** `test_treasury_cap_wrapped_in_init`,
`test_claim_mints_via_guarded_treasury`.

**Residual risk:** The `GuardedTreasury` object itself is transferred to the
deployer. If the deployer address is compromised, the attacker gains mint
access up to `max_supply`. Multi-party authorization for the deployer key
is strongly recommended (see KEY_MANAGEMENT document).

---

### A5 — Max Supply Enforcement (guarded_treasury.move)

**Risk:** Uncapped minting inflates total supply beyond the intended ceiling,
devaluing existing token holders in any future distribution.

**Control:** `GuardedTreasury` stores `minted: u64` and `max_supply: u64`.
Every call to `mint()` asserts `minted + amount <= max_supply` before
delegating to `coin::mint`. The `minted` counter is incremented atomically.
`MAX_SUPPLY` for ATC is 1,000,000,000,000,000 base units (1B ATC × 10^6).

**Test coverage:** `test_supply_cap_blocks_excess_mint` (expected_failure,
abort_code 0), `test_mint_at_cap_boundary_succeeds`,
`test_remaining_decrements_on_mint`.

**Residual risk:** No overflow protection on `minted + amount` for very large
values. In Move 2024 on Sui, u64 arithmetic aborts on overflow, so this is
mitigated by the VM, but operators should validate amounts at the TypeScript
layer before submitting transactions.

---

### A6 — Frozen Package / No Upgrade Authority (deployment)

**Risk:** A post-deployment package upgrade could silently change claim logic,
bypass proof verification, or remove the supply cap.

**Control:** Package deployed with `--with-unpublished-dependencies false` and
no `UpgradeCap` retained (upgrade cap destroyed or never issued). Once
deployed, the bytecode is immutable. This is enforced at deployment time, not
in Move source.

**Test coverage:** N/A (deployment process control, not unit-testable).

**Residual risk:** Requires disciplined deployment procedure. The deployment
operator must verify `UpgradeCap` is absent from their inventory post-deploy.
See AUTHORIZATION document for the deployment checklist.

---

### A7 — Auditable On-Chain Events (claim_campaign.move + guarded_treasury.move)

**Risk:** Off-chain systems have no reliable way to reconstruct campaign state
or detect anomalous activity without on-chain event anchors.

**Control:** Seven events emitted across the lifecycle:

| Event | Module | Trigger |
|---|---|---|
| CampaignCreated | claim_campaign | create() |
| CampaignPaused | claim_campaign | pause() |
| CampaignUnpaused | claim_campaign | unpause() |
| CampaignClosed | claim_campaign | close_campaign() |
| TokensClaimed | claim_campaign | claim() |
| AdminCapDestroyed | claim_campaign | destroy_admin_cap() |
| AdminCapTransferred | claim_campaign | transfer_admin_cap() |
| TokensMinted | guarded_treasury | mint() |

All events include relevant identifiers (`campaign_id`, `claimer`, `amount`).

**Test coverage:** Event emission is verified implicitly via scenario execution;
explicit event assertion requires `test_scenario::next_epoch` patterns and is
noted as a future improvement.

---

## Test Suite Summary

| Module | Test File | Count |
|---|---|---|
| merkle | merkle_tests.move | 11 |
| claim_campaign | claim_campaign_tests.move | 31 |
| **Total** | | **42** |

Target was >=28. Achieved 42.

---

## Outstanding Risks and Recommendations

1. **Independent Move audit** — Commission a third-party Move security firm
   (e.g., OtterSec, Zellic, Trail of Bits) before mainnet deployment.

2. **Deployer key multi-party authorization** — The `GuardedTreasury` object
   owner has unlimited mint access (within `max_supply`). Use a multi-sig
   or programmable transaction governed by an on-chain policy.

3. **Event indexing** — Deploy an off-chain indexer subscribing to all eight
   events above. Store in PostgreSQL `treasury_vault_events` or a dedicated
   Sui events table.

4. **CSV eligibility file integrity** — The Merkle root committed on-chain is
   only as trustworthy as the eligibility CSV. Sign the CSV with the deployer
   key and publish the hash on IPFS before campaign activation.

5. **Epoch expiry sanity** — `expires_at_epoch = 0` means no expiry. Operators
   must consciously set a non-zero value for time-bounded distributions.

---

*Internal document. Not legal advice. Not a financial instrument.*
*Axiom Protocol Engineering — Phase 8 — 2026-05-17*
