# AXIOM SUI PHASE 8 — SECURITY REVIEW PACKAGE

**Status: UNDER REVIEW — NOT APPROVED**

No external Move security audit has been conducted. This document is an internal audit checklist prepared by the protocol engineering team. An independent third-party Move security audit is REQUIRED before Phase 9 promotion or any mainnet deployment.

---

## Scope

**Package:** `axiom_claim_prototype`
**Version:** Phase 8 Hardened
**Network:** Sui Testnet ONLY
**Assets in scope:** AXIOM_TEST_CLAIM (ATC) — no monetary value, not a canonical Axiom asset
**Assets explicitly out of scope:** AXUSD, AXAU, AXM, SEED, KAG — none of these are issued, bridged, or connected to this package in any way

---

## Risk Categories

### 1. Move Safety

| Check | Finding | Status |
|---|---|---|
| No unsafe operations | Package uses no `unsafe` capabilities | PASS |
| No raw pointer access | Move has no raw pointers; N/A | N/A |
| Object abilities used correctly | AdminCap: key+store. ClaimCampaign: key. GuardedTreasury: key+store. Correct for intended semantics | PASS |
| No phantom type misuse | GuardedTreasury<phantom T> correctly prevents phantom type abuse | PASS |
| One-time witness pattern | AXIOM_TEST_CLAIM struct has `drop` ability; used exactly once in init() | PASS |
| Edition 2024.beta compatibility | Package targets edition 2024.beta; reviewed for edition-specific semantics | REVIEW |

---

### 2. Ownership Model

| Check | Finding | Status |
|---|---|---|
| AdminCap is owned (not shared) | AdminCap has key+store, transferred to deployer — correct owned semantics | PASS |
| AdminCap cannot be forged | Move type system prevents AdminCap creation outside claim_campaign module | PASS |
| AdminCap lifecycle documented | A3: destroy_admin_cap() and transfer_admin_cap() with audit events | PASS |
| No loose TreasuryCap in production | A4: init() wraps TreasuryCap in GuardedTreasury; no loose cap after init | PASS |
| GuardedTreasury ownership | GuardedTreasury transferred to deployer in init(); deployer controls minting | PASS |

**Open Finding OWN-001:** In test paths, `init_for_testing()` still exposes TreasuryCap directly. This is test-only code gated by `#[test_only]` and inaccessible in production. Confirm test-only pragma is enforced by Sui compiler.

---

### 3. Shared Object Safety

| Check | Finding | Status |
|---|---|---|
| ClaimCampaign is shared | Correctly uses transfer::share_object() | PASS |
| No shared object deletion | Sui restricts shared object deletion; campaign persists as audit record | PASS |
| Concurrent claim safety | claimed table add-before-transfer prevents double-claim in concurrent txs | PASS |
| Shared object access scope | All mutations gated by AdminCap or are public entry (claim) | PASS |
| Dynamic field safety | Table<address, bool> used for claimed set; no dynamic field confusion | PASS |

---

### 4. Proof Correctness

| Check | Finding | Status |
|---|---|---|
| Leaf construction matches TypeScript | keccak256(BCS(addr) || BCS(u64_amount)) in both Move and TS SDK | PASS |
| Sibling sorting is deterministic | bytes_lte() provides lexicographic canonical order | PASS |
| Empty proof is correct for single-leaf | leaf == root when proof is empty; correctly verified | PASS |
| Second-preimage resistance | Sorted sibling ordering prevents second-preimage via pair reordering | PASS |
| Proof depth limit enforced | A1: MAX_PROOF_DEPTH = 20; EProofTooLong = 7 aborts oversized proofs | PASS |
| Off-chain/on-chain parity | TypeScript buildMerkleTree and verifyProofLocal mirror Move logic | REVIEW |

**Open Finding PROOF-001:** Off-chain/on-chain parity requires integration test with real CSV → proof → claim flow. Deferred to Phase 9.

---

### 5. Mint Controls

| Check | Finding | Status |
|---|---|---|
| Minting requires GuardedTreasury access | A4: guarded_mint() is the only path to minting | PASS |
| Supply cap enforced | A5: MAX_SUPPLY = 1,000,000,000,000,000 base units; checked on every mint | PASS |
| total_minted tracks cumulative supply | total_minted accumulates; cannot decrease | PASS |
| No overflow in supply tracking | total_minted + amount <= MAX_SUPPLY check before increment; Move aborts on u64 overflow | PASS |
| Minting requires explicit call | guarded_mint() is a public function, not entry; no accidental minting via PTB directly | REVIEW |

**Note on MINT-001:** `guarded_mint` is `public` (not entry), callable from PTBs. In testnet this is acceptable; for mainnet, consider restricting to `public(package)` or adding AdminCap gating.

---

### 6. Event Integrity

| Check | Finding | Status |
|---|---|---|
| Campaign creation event | CampaignCreated emitted with campaign_id, amount_per_claim, expires_at_epoch | PASS |
| Fund event | CampaignFunded emitted with added_amount and pool_total | PASS |
| Claim event | Claimed emitted with campaign_id, claimer, amount | PASS |
| Pause/unpause events | CampaignPaused, CampaignUnpaused emitted | PASS |
| Close event | CampaignClosed emitted with returned_to_admin amount | PASS |
| AdminCap destroy event | A7: AdminCapDestroyed emitted on destroy | PASS |
| AdminCap transfer event | A7: AdminCapTransferred with new_owner emitted before transfer | PASS |
| Mint event | A7: TokensMinted emitted in guarded_mint with total_minted_after | PASS |
| Events are copy+drop | All events correctly have copy+drop abilities; no storage | PASS |

---

### 7. Pause Controls

| Check | Finding | Status |
|---|---|---|
| Pause requires AdminCap | pause() takes &AdminCap | PASS |
| Unpause requires AdminCap | unpause() takes &AdminCap | PASS |
| Claims blocked when paused | claim() asserts is_active; paused = not active | PASS |
| Root update requires paused | update_merkle_root() asserts !is_active (ECampaignNotPaused) | PASS |
| Unpause blocked after close | A2: unpause() asserts !is_closed (ECampaignAlreadyClosed) | PASS |

---

### 8. Upgrade Controls

| Check | Finding | Status |
|---|---|---|
| Default: frozen package | A6: package published without upgrade capability (frozen) | DESIGN |
| No upgrade authority held | No UpgradeCap stored or transferred in current design | DESIGN |
| Upgrade contingency documented | PHASE8_KEY_MANAGEMENT.md documents upgrade contingency | PASS |
| Mainnet upgrade policy defined | Any upgrade requires Phase 9+ multi-party authorization | DESIGN |

**Note:** A6 is a deployment-time decision. The contract source itself is upgrade-policy-agnostic; the frozen status is enforced by the `sui client publish` command options. This must be enforced at deployment time.

---

### 9. Supply Cap

| Check | Finding | Status |
|---|---|---|
| MAX_SUPPLY defined | 1,000,000,000,000,000 base units (1B tokens at 6 decimals) | PASS |
| Cap checked before minting | assert!(total_minted + amount <= MAX_SUPPLY) | PASS |
| Cap is immutable | MAX_SUPPLY is a const; cannot be changed after deploy | PASS |
| Boundary condition tested | test_double_mint_boundary verifies exact boundary succeeds | PASS |
| Overflow condition tested | test_supply_cap_exceeded verifies overflow aborts | PASS |

---

### 10. Admin Custody

| Check | Finding | Status |
|---|---|---|
| AdminCap held by deployer initially | create_campaign() returns AdminCap; entry wrapper transfers to sender | PASS |
| AdminCap transfer auditable | transfer_admin_cap() emits AdminCapTransferred event before transfer | PASS |
| AdminCap destruction auditable | destroy_admin_cap() emits AdminCapDestroyed and deletes UID | PASS |
| No AdminCap duplication possible | Move type system; object::new() in create_campaign ensures unique UID | PASS |
| Multisig custody design | 2-of-3 custody documented in PHASE8_KEY_MANAGEMENT.md | DESIGN |

---

### 11. Gas Griefing

| Check | Finding | Status |
|---|---|---|
| Proof length bounded | A1: assert!(proof_len <= MAX_PROOF_DEPTH) in verify_proof | PASS |
| Table operations O(1) | Sui Table uses dynamic fields; contains() and add() are O(1) | PASS |
| Coin operations bounded | coin::from_balance and balance::split are O(1) | PASS |
| No unbounded loops in hot path | claim() has no loops; merkle verify loop bounded by proof length | PASS |
| Campaign label length | label: String — no explicit length bound. Low risk for testnet. | LOW |

**Open Finding GAS-001:** Campaign label has no explicit max length. For production, consider adding `MAX_LABEL_LEN` and validation on create_campaign. Low risk in testnet.

---

### 12. Proof Replay Prevention

| Check | Finding | Status |
|---|---|---|
| Claimed table persists across claims | Table<address, bool> is a field of shared ClaimCampaign; persists indefinitely | PASS |
| Claimed addresses cannot reclaim | table::contains() check before table::add() — must be false | PASS |
| Root update does not reset claimed table | update_merkle_root() only replaces merkle_root; claimed table unchanged | PASS |
| Multi-address proofs are per-address | Each leaf encodes (address, amount); proof is not reusable across addresses | PASS |

---

### 13. Closure Semantics

| Check | Finding | Status |
|---|---|---|
| Closure is permanent | A2: close_campaign() sets is_closed = true; unpause() checks !is_closed | PASS |
| Closure blocks all claims | claim() checks is_active; close_campaign() sets is_active = false | PASS |
| Pool drained on closure | close_campaign() splits entire pool balance to admin | PASS |
| ClaimCampaign object persists | Shared object remains as immutable audit record after close | PASS |
| No re-creation with same ID | Object IDs are UIDs; cannot be recreated | PASS |

---

## Summary of Open Findings

| ID | Severity | Area | Status |
|---|---|---|---|
| OWN-001 | INFO | Ownership | test_only TreasuryCap exposure — verify test-only gate in compiler |
| PROOF-001 | LOW | Proof Correctness | Off-chain/on-chain integration test deferred to Phase 9 |
| MINT-001 | LOW | Mint Controls | guarded_mint is public, not entry — acceptable for testnet |
| GAS-001 | LOW | Gas Griefing | Campaign label has no max length — low risk testnet |

---

## Required Before Phase 9 Promotion

1. Independent third-party Move security audit by a qualified Sui/Move security firm
2. Resolution or documented acceptance of all open findings
3. Integration test of full proof toolchain (CSV → Merkle → proof → claim on testnet)
4. Key ceremony for 2-of-3 multisig custody of AdminCap
5. Signed Phase 9 authorization package

---

*Document prepared by Axiom Protocol engineering. Internal review only. NOT an external audit.*
*Phase 8 — Testnet Staging — No canonical assets involved.*
