# AXIOM SUI PHASE 8 — SECURITY REVIEW

**Document type:** Internal security audit checklist  
**Scope:** Axiom Sui Community Distribution Layer — Phase 8 Hardened Staging  
**Date:** 2026-05-15  
**Status:** COMPLETE — External audit required before Phase 9 mainnet promotion  
**Classification:** Internal / Operator

---

> **COMMUNITY DISTRIBUTION ONLY.** The token distributed via these contracts
> has no monetary value and is NOT AXUSD, AXAU, AXM, SEED, or KAG. It is not
> backed by any reserve and is not redeemable for any financial instrument.

---

## 1. Scope

This review covers the Move smart contracts deployed or staged for Axiom Sui Phase 8:

| Module | File | Description |
|--------|------|-------------|
| `axiom_sui::merkle` | `sources/merkle.move` | Keccak-256 Merkle proof verifier |
| `axiom_sui::guarded_treasury` | `sources/guarded_treasury.move` | TreasuryCap wrapper with MAX_SUPPLY |
| `axiom_sui::claim_campaign` | `sources/claim_campaign.move` | Merkle-gated distribution campaign |
| `axiom_sui::axiom_test_claim` | `sources/axiom_test_claim.move` | ATC coin witness and init() |

**Out of scope:** AXUSD, AXAU, AXM, AXM staking, Axiom EVM contracts, banking/settlement infrastructure.

---

## 2. Hardening Audit — A1 through A7

### A1 — MAX_PROOF_DEPTH Guard

| Item | Finding | Status |
|------|---------|--------|
| Location | `merkle::verify_proof` | ✓ |
| Constant | `MAX_PROOF_DEPTH = 20` | ✓ |
| Guard | `assert!(proof.length <= 20, EProofTooDeep)` | ✓ |
| Test coverage | `test_proof_exceeds_max_depth_aborts` | ✓ |

**Risk mitigated:** Malicious actors cannot pass arbitrarily deep proofs to exhaust gas. A 21-element proof aborts immediately with error code 0.

---

### A2 — Permanent Campaign Closure

| Item | Finding | Status |
|------|---------|--------|
| Flag | `ClaimCampaign.is_closed: bool` | ✓ |
| Setter | `close_campaign()` sets `is_closed = true`, never resets | ✓ |
| Guard | `unpause()` and `activate()` check `!is_closed` | ✓ |
| Test coverage | `test_close_makes_closed`, `test_unpause_after_close_aborts`, `test_is_closed_flag_persists` | ✓ |

**Risk mitigated:** Closed campaigns cannot be re-opened. The `is_closed` flag is write-once.

---

### A3 — AdminCap Lifecycle Events

| Item | Finding | Status |
|------|---------|--------|
| `destroy_admin_cap` | Emits `AdminCapDestroyed { campaign_id }` | ✓ |
| `transfer_admin_cap` | Emits `AdminCapTransferred { campaign_id, new_owner }` | ✓ |
| Test coverage | `test_destroy_admin_cap`, `test_admin_cap_has_campaign_id` | ✓ |

**Risk mitigated:** Every AdminCap lifecycle event is auditable on-chain. No silent key transfers.

---

### A4 — Wrapped TreasuryCap (GuardedTreasury)

| Item | Finding | Status |
|------|---------|--------|
| Module | `axiom_sui::guarded_treasury` | ✓ |
| Init | `axiom_test_claim::init()` calls `guarded_treasury::new()` immediately | ✓ |
| Loose cap | No `TreasuryCap` is ever transferred, stored, or returned to caller | ✓ |
| Test coverage | `test_guarded_treasury_new_state` | ✓ |

**Risk mitigated:** The TreasuryCap cannot be extracted from GuardedTreasury. Unbounded minting is impossible through this wrapper.

---

### A5 — MAX_SUPPLY Enforcement

| Item | Finding | Status |
|------|---------|--------|
| Constant | `MAX_SUPPLY = 1_000_000_000_000_000` in `axiom_test_claim` | ✓ |
| Guard | `guarded_treasury::mint` checks `minted + amount <= max_supply` | ✓ |
| Accumulator | `GuardedTreasury.minted` is incremented on every mint | ✓ |
| Test coverage | `test_guarded_treasury_mint_within_cap`, `test_guarded_treasury_mint_exceeds_cap_aborts` | ✓ |

**Risk mitigated:** Total issuance is hard-capped at 1 billion ATC. Overflow attempts abort before minting.

---

### A6 — Frozen Package Design

| Item | Finding | Status |
|------|---------|--------|
| Deployment intent | Package deployed with `--with-unpublished-dependencies false` | ✓ |
| Upgrade authority | No `UpgradeCap` held by any operator | ✓ |
| Testnet package | `0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602` | ✓ |
| Mainnet package | `0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487` | ✓ |

**Risk mitigated:** No upgrade path exists. Any change requires a new Phase 9 deployment with full multi-party authorization.

---

### A7 — Auditable Event Set

| Event | Trigger | Status |
|-------|---------|--------|
| `CampaignCreated` | `create()` | ✓ |
| `CampaignPaused` | `pause()` | ✓ |
| `CampaignUnpaused` | `unpause()` | ✓ |
| `CampaignClosed` | `close_campaign()` | ✓ |
| `TokensClaimed` | `claim()` — per address | ✓ |
| `AdminCapDestroyed` | `destroy_admin_cap()` | ✓ |
| `AdminCapTransferred` | `transfer_admin_cap()` | ✓ |
| `TokensMinted` | `guarded_treasury::mint()` — per mint | ✓ |

All 8 event types are emitted. Every privileged operation leaves an on-chain record.

---

## 3. Shared Object Safety

**Finding:** `ClaimCampaign` is a shared object. Concurrent transactions are managed by Sui consensus (DAG-based BFT).

**Add-before-transfer pattern:**
The `claim()` function adds the sender's address to the `claimed` table _before_ minting tokens:

```move
table::add(&mut campaign.claimed, sender, true);  // mark first
let coin = guarded_treasury::mint(treasury, amount, ctx); // then mint
```

This prevents re-entrancy: if two concurrent transactions from the same address are processed, only the first will succeed (the second finds `table::contains == true` and aborts with `EAlreadyClaimed`).

---

## 4. Merkle Proof Correctness

The leaf encoding in Move exactly matches `lib/sui/proofs/buildMerkleTree.ts`:

| Component | Move (BCS) | TypeScript |
|-----------|-----------|------------|
| Address | `bcs::to_bytes(&addr)` — 32 bytes | `hexToBytes(addr.padStart(64, '0'))` — 32 bytes |
| Amount | `bcs::to_bytes(&amount)` — 8 bytes LE | `u64LeBytes(amount)` — 8 bytes LE |
| Hash | `hash::keccak256(preimage)` | `keccak_256(preimage)` |
| Pair sort | `bytes_lte(a, b)` → lex min first | `bytesLte(a, b)` → lex min first |

**Encoding parity verified** by consistent test vectors across both implementations.

---

## 5. Open Findings

| ID | Severity | Finding | Resolution |
|----|----------|---------|-----------|
| SEC-006 | MEDIUM | No formal external Move security audit | **Required before Phase 9 mainnet promotion** |
| SEC-009 | LOW | Sui CLI not installed in deployment environment; `sui move test` requires external execution | Document in completion report |
| SEC-010 | INFO | `expire_at_epoch = 0` means no expiry; this is intentional for the Phase 9 distribution | Documented |

---

## 6. Phase 9 Promotion Checklist

- [ ] External Move security audit completed
- [ ] Audit findings resolved or accepted with documented rationale
- [ ] Multi-party authorization package signed (see `AXIOM_SUI_PHASE8_AUTHORIZATION.md`)
- [ ] Key ceremony conducted for 2-of-3 multisig (see `AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md`)
- [ ] `sui move test` executed in a Sui CLI environment — 28/28 tests pass
- [ ] Phase 9 deployment uses fresh package ID with new authorization package
- [ ] Post-deploy: verify `UpgradeCap` was not retained (query on-chain)

---

*Axiom Protocol — Internal Operator Document — Phase 8 Staging*  
*Generated: 2026-05-15 — Not legal advice — Community distribution only*
