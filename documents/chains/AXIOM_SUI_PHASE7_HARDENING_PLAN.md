# AXIOM SUI — PHASE 7 HARDENING PLAN
# Production Move Contract Design — NOT FOR DEPLOYMENT

Document type:  Design / Hardening
Phase:          7 — Mainnet Design + Hardening + Authorization
Chain:          Sui (design target: Sui Mainnet — NOT YET AUTHORIZED)
Date:           2026-05-15
Classification: INTERNAL — engineering design record
Status:         DESIGN COMPLETE — not compiled, not deployed

---

## IMPORTANT

This document describes the DESIGN of a hardened production Move contract.

The hardened Move code described here:
  - Is NOT compiled
  - Is NOT deployed to testnet or mainnet
  - Is NOT authorized for deployment by this document
  - Requires a Phase 8 authorization before compilation or deployment

Phase 6 Sprint 2 package remains the only deployed reference:
  0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602 (testnet)

---

## Overview

This plan addresses all four Phase 6 carry-forward findings (NOTE-1
through NOTE-5) and adds three additional hardening items derived from
the mainnet architecture decision. All items are design-only.

| Item | Finding | Description | Priority |
|---|---|---|---|
| A1 | NOTE-5 | Merkle proof depth limit | HIGH |
| A2 | NOTE-3 | Permanent campaign closure | HIGH |
| A3 | NOTE-1 | AdminCap lifecycle management | MEDIUM |
| A4 | NOTE-2 | TreasuryCap custody (GuardedTreasury) | HIGH |
| A5 | NOTE-2 | Hard supply cap on mint path | HIGH |
| A6 | New | Upgrade policy — frozen vs upgradeable | MEDIUM |
| A7 | New | Event completeness audit | LOW |

---

## A1 — Merkle Proof Depth Limit

**Phase 6 finding:** NOTE-5 (7.10)
**Priority:** HIGH — gas griefing attack vector

### Problem

The Sprint 2 `verify_proof` loop iterates over an unbounded `proof` vector.
An attacker could submit a proof with thousands of elements, consuming
excessive gas with no economic cost (the transaction aborts with
EInvalidProof regardless). On a shared object like ClaimCampaign, this
could be used to grief concurrent legitimate claimants by saturating
the object's transaction queue.

### Design

Add error code:
```
const EProofTooLong: u64 = 7;
```

Add guard at the beginning of `verify_proof` and at the entry of `claim`:
```
const MAX_PROOF_DEPTH: u64 = 20;

public fun verify_proof(
    proof: &vector<vector<u8>>,
    root: &vector<u8>,
    leaf: vector<u8>,
): bool {
    assert!(vector::length(proof) <= MAX_PROOF_DEPTH, EProofTooLong);
    // ... existing iteration logic
}
```

Also assert in the `claim` entry function before calling verify_proof:
```
assert!(vector::length(&proof) <= MAX_PROOF_DEPTH, EProofTooLong);
```

### Rationale for MAX_PROOF_DEPTH = 20

A balanced binary Merkle tree of depth 20 accommodates 2^20 = 1,048,576
leaves (over one million eligible addresses). This is well above any
anticipated Axiom community campaign size. Each proof element is 32 bytes;
20 elements = 640 bytes per proof. A single keccak256 call costs roughly
100–200 gas units on Sui; 20 calls = 2,000–4,000 extra gas units — well
within normal transaction budget.

### Gas cost estimate (per claim, with proof depth 20)
- 20 keccak256 calls: ~3,000 computation gas units
- 20 vector reads: ~200 gas units
- Total overhead vs depth-0 proof: ~3,200 units ≈ negligible (< 0.001 SUI)

---

## A2 — Permanent Campaign Closure

**Phase 6 finding:** NOTE-3 (5.06 / 6.04)
**Priority:** HIGH — logical correctness

### Problem

In Sprint 2, `close_campaign` sets `is_active = false` but AdminCap
holders can call `unpause()` afterward, setting `is_active = true`.
This means a "closed" campaign can be technically reopened. While the
pool is drained to zero by `close_campaign` (making claims impossible
in practice), the state machine is logically incorrect and creates
audit confusion.

### Design

Add field to ClaimCampaign:
```
is_closed: bool,     // true once close_campaign is called; cannot revert
```

Initialize to `false` in `create_campaign`.

Modify `close_campaign`:
```
public entry fun close_campaign(
    campaign: &mut ClaimCampaign<T>,
    _admin: &AdminCap,
    ctx: &mut TxContext,
) {
    assert!(!campaign.is_closed, ECampaignAlreadyClosed);
    campaign.is_closed = true;
    campaign.is_active = false;
    // drain pool to admin...
    event::emit(CampaignClosed { ... });
}
```

Add constant:
```
const ECampaignAlreadyClosed: u64 = 8;
```

Modify `unpause` to guard against re-opening a closed campaign:
```
public entry fun unpause(
    campaign: &mut ClaimCampaign<T>,
    _admin: &AdminCap,
) {
    assert!(!campaign.is_closed, ECampaignAlreadyClosed);
    campaign.is_active = true;
    event::emit(CampaignUnpaused { ... });
}
```

Add test-only accessor:
```
#[test_only]
public fun is_closed<T>(campaign: &ClaimCampaign<T>): bool {
    campaign.is_closed
}
```

### Impact on Tests

- test_close_campaign: update to assert `is_closed == true` after close
- test_pause_unpause: confirm unpause is blocked on closed campaign (ECC=8)

---

## A3 — AdminCap Lifecycle Management

**Phase 6 finding:** NOTE-1 (1.06)
**Priority:** MEDIUM

### Problem

The Sprint 2 AdminCap cannot be destroyed. If the admin private key is
lost or compromised, the campaign becomes permanently ungoverned. There
is also no formal mechanism for transferring the AdminCap to a new
operator (e.g., multisig wallet) beyond using Sui's generic
`transfer::public_transfer`.

### Design: destroy_admin_cap

```
public entry fun destroy_admin_cap(admin_cap: AdminCap) {
    let AdminCap { id } = admin_cap;
    object::delete(id);
    // Note: no event emitted (cap destroyed — no campaign reference)
}
```

This provides an explicit, intentional destruction path. Once called,
the campaign becomes permanently unmanaged — no further admin operations
are possible. Use only when campaign lifecycle is fully complete.

### Design: transfer_admin_cap

Sui's built-in `transfer::public_transfer` already works for AdminCap
(it has `key, store`). However, a named entry function makes the
operation explicit and auditable:

```
public entry fun transfer_admin_cap(
    admin_cap: AdminCap,
    new_admin: address,
) {
    transfer::public_transfer(admin_cap, new_admin);
    // Caller's event is implicit via object transfer log
}
```

### Multisig Custody Recommendation

For production deployments, AdminCap should be held in a Sui multisig
wallet rather than a single-signer address. Sui supports k-of-n
multisig natively.

Recommended configuration:
- 2-of-3 multisig
- Keys held by: Engineering Lead, Operations Lead, Emergency Key (HSM)
- Emergency key stored offline; used only for recovery

This is a key management recommendation, not a Move code change.

### Test coverage additions

- test_destroy_admin_cap: confirm AdminCap object no longer exists after destroy
- test_transfer_admin_cap: confirm AdminCap moves to new address

---

## A4 — TreasuryCap Custody (GuardedTreasury)

**Phase 6 finding:** NOTE-2 (2.02)
**Priority:** HIGH — custody separation

### Problem

In Sprint 2, TreasuryCap is transferred to the deployer's wallet in
the `init` function. This means:
- The deployer can mint any amount at any time
- The TreasuryCap is a loose owned object with no access controls
- If the deployer key is compromised, unlimited minting is possible
- There is no audit trail for minting decisions

### Design: GuardedTreasury controller object

```
/// Wraps TreasuryCap and enforces supply cap + admin gating.
struct GuardedTreasury<phantom T> has key {
    id: UID,
    treasury_cap: TreasuryCap<T>,
    max_supply: u64,         // hard cap on total minted
    total_minted: u64,       // running total
    admin_cap_id: ID,        // linked AdminCap ID (not a reference — for audit)
}
```

Mint is routed through GuardedTreasury, not directly via TreasuryCap:

```
public entry fun guarded_mint(
    treasury: &mut GuardedTreasury<T>,
    _admin: &AdminCap,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    assert!(treasury.total_minted + amount <= treasury.max_supply, ESupplyCapExceeded);
    treasury.total_minted = treasury.total_minted + amount;
    let coin = coin::mint(&mut treasury.treasury_cap, amount, ctx);
    transfer::public_transfer(coin, recipient);
    event::emit(TokensMinted {
        amount,
        recipient,
        total_minted: treasury.total_minted,
        max_supply: treasury.max_supply,
    });
}
```

Modified `init` function no longer transfers TreasuryCap to the deployer.
Instead, it wraps TreasuryCap in a GuardedTreasury and shares it:

```
fun init(witness: AXIOM_CLAIM, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(witness, 6, ...);
    let guarded = GuardedTreasury {
        id: object::new(ctx),
        treasury_cap,
        max_supply: MAX_SUPPLY,
        total_minted: 0,
        admin_cap_id: object::id(&admin_cap),  // set during campaign creation flow
    };
    transfer::share_object(guarded);
    // AdminCap transferred to deployer as before
}
```

Note: Because GuardedTreasury is a shared object, all minting operations
go through consensus. This adds latency but ensures atomicity and auditability.

---

## A5 — Hard Supply Cap

**Phase 6 finding:** NOTE-2 (2.05)
**Priority:** HIGH — supply integrity

### Problem

In Sprint 2, there is no limit on how many tokens the admin can mint.
This is acceptable for a testnet prototype but not for any production
deployment where the asset has community significance.

### Design

Define supply cap constant in production module:

```
/// 100 million tokens at 6 decimal places = 100,000,000,000,000 base units
const MAX_SUPPLY: u64 = 100_000_000_000_000;
```

This value is illustrative. The actual production supply cap must be
determined by the mainnet design decision process and ratified in the
Phase 8 authorization.

The supply cap is enforced via GuardedTreasury (A4):
```
assert!(treasury.total_minted + amount <= treasury.max_supply, ESupplyCapExceeded);
```

Add constant:
```
const ESupplyCapExceeded: u64 = 9;
```

Supply cap is immutable once set — the GuardedTreasury `max_supply`
field has no setter function. The only way to change the supply cap is
to deploy a new package.

### Test coverage additions

- test_supply_cap_enforced: mint to cap, verify next mint aborts ESupplyCapExceeded
- test_supply_cap_not_exceeded_at_cap_minus_one: boundary test

---

## A6 — Upgrade Policy

**Priority:** MEDIUM — operational governance

### Problem

Sui packages may be published as frozen (no upgrade) or with an
UpgradeCap (upgradeable). The Phase 6 prototype was published with
an UpgradeCap held by the deployer. For production, a clear policy
is required.

### Option A: Frozen Package (Recommended for mainnet)

Freeze the package at publish time. No upgrades are possible.
Community members can independently verify the deployed code matches
the published source. AdminCap + GuardedTreasury provide operational
flexibility without needing contract upgrades for parameter changes.

Pros:
- Maximum trust: code cannot be changed after deployment
- No upgrade key compromise risk
- Cleaner security model

Cons:
- Bug fixes require deploying a new package and migrating campaigns
- No emergency patch path for critical bugs

### Option B: Upgradeable with Multisig UpgradeCap

Retain UpgradeCap but transfer it to a multisig address (2-of-3).
Only major bug fixes and security patches are authorized upgrades.
All upgrades require a 48-hour timelock notification.

Pros:
- Emergency bug fix path exists
- No need to migrate campaigns for minor fixes

Cons:
- UpgradeCap is a security surface
- Upgrade mechanism must itself be secured and audited
- Community must trust the upgrade key holders

### Recommendation

**Option A (Frozen Package) for the first mainnet deployment.**

Rationale: The Phase 7 hardened design addresses all known bugs. The
contract logic is simple (claim + merkle verify). A frozen contract
with independent verification is more trustworthy for a community
distribution campaign than an upgradeable one.

For emergency mitigation, pause the campaign via AdminCap (no contract
upgrade needed). Deploy a new package if a patch is required.

Phase 8 authorization must explicitly choose Option A or Option B and
document the rationale.

---

## A7 — Event Completeness Audit

**Priority:** LOW — observability

### Sprint 2 Event Inventory

| Function | Event | Status |
|---|---|---|
| create_campaign | CampaignCreated | PASS — emitted |
| fund_campaign | CampaignFunded | PASS — emitted |
| activate | CampaignActivated | PASS — added in Sprint 2 |
| pause | CampaignPaused | PASS — emitted |
| unpause | CampaignUnpaused | PASS — emitted |
| claim | Claimed | PASS — emitted |
| update_merkle_root | MerkleRootUpdated | PASS — emitted |
| close_campaign | CampaignClosed | PASS — emitted |

### New Events Required in Hardened Design

| Function | New Event | Fields |
|---|---|---|
| destroy_admin_cap | AdminCapDestroyed | (no campaign_id — cap is destroyed) |
| transfer_admin_cap | AdminCapTransferred | new_admin: address |
| guarded_mint | TokensMinted | amount, recipient, total_minted, max_supply |
| close_campaign (hardened) | CampaignClosed | campaign_id, returned_to_admin, is_closed: true |

### Event Schema Additions

```move
struct AdminCapDestroyed has copy, drop {
    destroyed_at: u64,  // epoch
}

struct AdminCapTransferred has copy, drop {
    new_admin: address,
}

struct TokensMinted has copy, drop {
    campaign_id: ID,
    amount: u64,
    recipient: address,
    total_minted: u64,
    max_supply: u64,
}
```

All event structs have `copy, drop` abilities (required by sui::event::emit).
No sensitive data (private keys, PII) in any event field.

---

## Summary: New Error Codes in Hardened Design

| Code | Constant | Trigger |
|---|---|---|
| 1 | ENotActive | Campaign is paused or not yet activated |
| 2 | EExpired | Campaign has passed expires_at_epoch |
| 3 | EAlreadyClaimed | Caller has already claimed from this campaign |
| 4 | EInvalidProof | Merkle proof does not verify against root |
| 5 | EInsufficientPool | Pool balance < amount_per_claim |
| 6 | ECampaignNotPaused | update_merkle_root called on active campaign |
| 7 | EProofTooLong | Proof vector exceeds MAX_PROOF_DEPTH (A1) |
| 8 | ECampaignAlreadyClosed | close_campaign or unpause called on closed campaign (A2) |
| 9 | ESupplyCapExceeded | guarded_mint would exceed max_supply (A5) |

---

## Test Coverage Plan for Hardened Contract

In addition to the 17 passing Sprint 2 tests, the hardened contract
requires the following new tests:

| Test | Workstream | Validates |
|---|---|---|
| test_proof_too_long_rejected | A1 | EProofTooLong for proof.len > 20 |
| test_proof_at_max_depth_passes | A1 | proof.len == 20 verifies correctly |
| test_campaign_is_closed_after_close | A2 | is_closed == true post-close |
| test_unpause_blocked_on_closed | A2 | ECampaignAlreadyClosed on unpause of closed |
| test_destroy_admin_cap | A3 | AdminCap object deleted, further admin calls fail |
| test_transfer_admin_cap | A3 | New address can exercise AdminCap |
| test_guarded_mint_within_cap | A4/A5 | Mint within cap succeeds |
| test_supply_cap_enforced | A5 | Mint beyond cap aborts ESupplyCapExceeded |
| test_supply_cap_boundary | A5 | Mint exactly to cap succeeds |
| test_tokens_minted_event | A4/A7 | TokensMinted event fields correct |
| test_destroy_admin_cap_event | A3/A7 | AdminCapDestroyed event emitted |

Target: >= 28 total unit tests (17 Sprint 2 + 11 new) before Phase 8 deployment.

---

## Implementation Note

The designs in this document are pseudocode / design specifications.
They have not been written in compilable Move syntax. Before Phase 8
testing begins, an engineering session must:

1. Implement all A1–A7 designs in proper Sui Move syntax
2. Run `sui move test` until all >= 28 tests pass
3. Run `sui move build` with no errors
4. Complete a new security review of the hardened contract
5. Obtain Phase 8 deployment authorization

---

*End of Phase 7 Hardening Plan*
