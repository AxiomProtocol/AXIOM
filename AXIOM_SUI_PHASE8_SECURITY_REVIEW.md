# Axiom Protocol — Sui Phase 8 Security Review

**Package:** `axiom`
**Modules:** `merkle`, `claim_campaign`, `guarded_treasury`, `amc`
**Review Date:** 2026-05-16
**Reviewer:** Axiom Protocol Engineering — Internal Pre-Audit
**Status:** Hardening complete — external audit recommended before mainnet activation

---

## Executive Summary

Phase 8 delivers a Merkle-gated token distribution system (`claim_campaign`), a keccak256 Merkle verifier (`merkle`), a cap-gated treasury module (`guarded_treasury`), and the AMC fungible coin. Seven audit points (A1–A7) identified in prior review have all been addressed. Test coverage: 28 tests across `merkle_tests` (10) and `claim_campaign_tests` (18).

**Residual risk — Medium:** The on-chain claim logic does not deduplicate claimants. Leaf uniqueness is enforced off-chain (TypeScript `validateEligibilityCsv`). An external audit and on-chain deduplication are recommended before campaigns carry > $50k equivalent.

---

## Audit Findings — Resolved

### A1 — Unbounded Proof Depth

**Risk:** `merkle::verify()` iterated over proof elements without a bound, allowing unbounded gas consumption.

**Fix:** `MAX_PROOF_DEPTH = 32` enforced before the loop. `assert!(depth <= 32, E_PROOF_TOO_DEEP)` aborts at code 1.

**Tests:** `test_09` (depth=32, passes), `test_10` (depth=33, aborts with code 1).

---

### A2 — Missing Event Emissions

**Risk:** State transitions emitted no events, making off-chain monitoring impossible.

**Fix:** Six `copy, drop` event structs emitted via `sui::event::emit`:

| Event | Trigger |
|---|---|
| `CampaignCreated` | `create_campaign_entry` |
| `CampaignFunded` | `fund_campaign` |
| `CampaignActivated` | `activate` |
| `CampaignPaused` | `pause` |
| `CampaignClosed` | `close_campaign` |
| `ClaimMade` | `claim` (includes claimant, amount, remaining_pool) |

All events include `campaign_id: ID` for indexed querying via `suix_queryEvents`.

---

### A3 — AdminCap Lifecycle Risk

**Risk:** AdminCap minted to EOA sender; no on-chain enforcement of multisig requirement.

**Fix:**
- AdminCap has `key, store` — one per campaign, cannot be duplicated.
- Every admin function validates `cap.campaign_id == object::id(campaign)`, aborting with `E_WRONG_CAMPAIGN = 8` on mismatch.
- Deploy procedure requires AdminCap transfer to multisig as the first post-deploy action.

**Test:** `test_25` (cap ID matches campaign), `test_26` (wrong cap aborts).

**Residual:** Move cannot enforce "transfer to multisig" at the language level. Process control required.

---

### A4 — Insufficient Privilege Separation

**Risk:** Pool management and campaign state transitions shared one capability surface.

**Fix:**
- `guarded_treasury.move` introduces `GuardedTreasury<T>` and `TreasuryOperatorCap` — separate from `AdminCap`.
- `deposit()` and `withdraw()` require `TreasuryOperatorCap`.
- `take_balance()` is `public(package)` — inaccessible to external packages.
- Campaign pool is funded only through `fund_campaign()` which requires `AdminCap`.

**Test:** `test_20` (funding closed campaign aborts), `test_26` (wrong cap aborts).

---

### A5 — Re-entrancy on Claim Payout

**Risk:** Payout coin transfer occurred before claim state persisted.

**Fix:** `ClaimRecord` (key object owned by claimant) is created and `transfer::transfer`-ed to the claimant **before** the payout `Coin<AMC>` is transferred. Ordering is explicit in `claim_internal()`.

**Test:** `test_21` (valid claim: record written, pool decrements, total_claims increments).

**Note:** Move's single-owner model prevents VM re-entrancy. The record-first ordering is belt-and-suspenders.

---

### A6 — Expiry Not Enforced

**Risk:** Expired campaigns accepted claims past their expiry epoch.

**Fix:** `claim_internal()` asserts `tx_context::epoch(ctx) < expires_at_epoch` when `expires_at_epoch > 0`. Aborts `E_EXPIRED = 4`. `expires_at_epoch = 0` = no expiry.

**Tests:** `test_27` (not expired: epoch < limit), `test_28` (expired: epoch >= limit).

---

### A7 — Unbounded Label Storage

**Risk:** No label length limit enabled griefing attacks via large storage writes.

**Fix:** `MAX_LABEL_BYTES = 128`. `create_campaign_entry` and `create_campaign_for_test` assert `vector::length(&label) <= 128`, aborting `E_LABEL_TOO_LONG = 7`.

**Tests:** `test_12` (129 bytes aborts), `test_13` (128 bytes succeeds).

---

## Leaf Encoding Specification

```
leaf = keccak256(addr_32_bytes_BE ++ amount_8_bytes_LE)
```

- `addr_32_bytes_BE`: Sui address as 32 bytes (BCS serialization, big-endian)
- `amount_8_bytes_LE`: u64 as 8 bytes, little-endian (matches TypeScript `DataView.setUint32` LE)

Internal node hashing: `keccak256(sort_lex(a, b) ++ sort_lex_second(a, b))` — deterministic sort prevents position-dependent bugs.

---

## Residual Risks

| Risk | Severity | Mitigation |
|---|---|---|
| No on-chain claimant deduplication | Medium | Off-chain: Merkle leaf uniqueness enforced by `validateEligibilityCsv.ts` |
| AdminCap held by EOA (not multisig) | Medium | Process: transfer to multisig in deploy runbook |
| No on-chain KYC/identity check | Low | Merkle eligibility is the gate — operator controls who gets a leaf |
| Sui framework upgrade compatibility | Low | Monitor Sui framework changelog; pin framework rev in Move.toml |

---

## Recommendations

1. For campaigns > $50k: add on-chain `Table<address, bool>` deduplication in `claim_internal()`.
2. Always create campaigns from a multisig or deployer smart wallet.
3. Engage external Move auditor before mainnet campaign activation.
4. Monitor `ClaimMade` events via `suix_queryEvents` for anomaly detection.
5. Set `expires_at_epoch` on all campaigns — prevents stale fund lock-up.
6. Transfer AdminCap to multisig in the same PTB as `create_campaign_entry`.
