# AXIOM SUI — CLAIM CONTRACT PROTOTYPE SPECIFICATION

**Document type:** Technical Specification  
**Phase:** Phase 5 — Testnet Claim Contract Prototype Design  
**Chain:** Sui Testnet (non-EVM, Move VM)  
**Date:** 2026-05-15  
**Status:** SPECIFICATION COMPLETE — implementation not started  
**Classification:** Internal — architecture record  

---

## TESTNET-ONLY WARNING

This specification describes a TESTNET-ONLY prototype.

- The claim asset (AXIOM_TEST_CLAIM) has NO monetary value.
- It is NOT AXUSD, AXAU, AXM, SEED, KAG, or any canonical Axiom asset.
- It is NOT backed by any reserve.
- It does NOT represent any ownership, governance, or financial right.
- It CANNOT be redeemed for any canonical asset.
- It MUST NOT be deployed to Sui Mainnet without a separate Phase 7 authorization.

This prototype exists solely to test the on-chain claim mechanics on Sui Testnet.

---

## 1. Package Purpose

The `axiom_claim_prototype` Move package implements a community claim distribution
mechanism for testing on Sui Testnet. It allows eligible addresses (committed in a
merkle root) to claim a fixed amount of the AXIOM_TEST_CLAIM test token by
submitting a valid merkle proof.

**Primary goals:**
- Validate the Sui claim contract pattern before any mainnet consideration
- Test merkle proof verification in Move
- Test the admin capability and campaign management flow
- Test duplicate claim prevention
- Provide a reference implementation for the eventual production claim contract

**Non-goals:**
- No monetary value
- No canonical asset issuance
- No mainnet deployment
- No user-facing UI in Phase 5

---

## 2. Claim Asset Definition

| Property | Value |
|---|---|
| Name | Axiom Test Claim |
| Symbol | AXIOM_TEST_CLAIM |
| Decimals | 6 |
| Backing | None — testnet only |
| Relationship to canonical assets | None |
| Max supply | No hard cap — TreasuryCap controlled by admin |
| Testnet only | YES |

**Explicit rejections:**
- NOT AXUSD (ERC-3643 Arbitrum-canonical stablecoin)
- NOT AXAU (PAXG-backed reserve instrument on Arbitrum)
- NOT AXM (ERC-20 governance token on Arbitrum)
- NOT SEED (any Axiom seed instrument)
- NOT KAG (silver reserve instrument)
- NOT reserve-backed
- NOT yield-bearing
- NOT a promise of monetary value

---

## 3. Move Package Structure

```
axiom_claim_prototype/
├── Move.toml
└── sources/
    ├── axiom_test_claim.move   — Coin definition and TreasuryCap
    ├── claim_campaign.move     — Campaign shared object and claim logic
    └── merkle.move             — Merkle proof verification helpers
```

### Move.toml (template)
```toml
[package]
name = "axiom_claim_prototype"
version = "0.0.1"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "testnet" }

[addresses]
axiom_claim_prototype = "0x0"
```

---

## 4. Object Model

### 4.1 AXIOM_TEST_CLAIM Coin (axiom_test_claim.move)

```move
// Witness type — used for one-time coin initialization
public struct AXIOM_TEST_CLAIM has drop {}

// Module init — called once at publish time
fun init(witness: AXIOM_TEST_CLAIM, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(
        witness,
        6,                          // decimals
        b"AXIOM_TEST_CLAIM",        // symbol
        b"Axiom Test Claim",        // name
        b"Testnet-only claim token. No monetary value. Not a canonical Axiom asset.",
        option::none(),             // icon URL
        ctx
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury_cap, ctx.sender());
}
```

`TreasuryCap<AXIOM_TEST_CLAIM>` is transferred to the deployer and must be
used to mint tokens into the campaign pool.

### 4.2 AdminCap (claim_campaign.move)

```move
public struct AdminCap has key, store {
    id: UID,
}
```

Owned by the deployer. Required for all privileged campaign operations.
Created at package publish time and transferred to the deployer.

### 4.3 ClaimCampaign (claim_campaign.move)

```move
public struct ClaimCampaign has key {
    id: UID,
    /// Keccak256 merkle root of (address, amount) eligibility pairs
    merkle_root: vector<u8>,
    /// Tokens distributed per successful claim (in base units, 6 decimals)
    amount_per_claim: u64,
    /// Pool of AXIOM_TEST_CLAIM tokens available for claims
    pool: Balance<AXIOM_TEST_CLAIM>,
    /// Tracks which addresses have already claimed (duplicate prevention)
    claimed: Table<address, bool>,
    /// Whether the campaign is accepting claims
    is_active: bool,
    /// Sui epoch after which claims are rejected (0 = no expiration)
    expires_at_epoch: u64,
    /// Campaign identifier string (for event indexing)
    campaign_id: String,
}
```

The `ClaimCampaign` object is a shared object — publicly accessible for reads,
mutated only through entry functions with the correct authorization.

---

## 5. Entry Functions

### 5.1 create_campaign (admin)
```move
public entry fun create_campaign(
    _: &AdminCap,
    merkle_root: vector<u8>,
    amount_per_claim: u64,
    expires_at_epoch: u64,
    campaign_id: String,
    ctx: &mut TxContext
)
```
Creates and shares a new `ClaimCampaign` object. Initially unfunded (empty pool).

### 5.2 fund_campaign (admin)
```move
public entry fun fund_campaign(
    _: &AdminCap,
    campaign: &mut ClaimCampaign,
    treasury_cap: &mut TreasuryCap<AXIOM_TEST_CLAIM>,
    amount: u64,
    ctx: &mut TxContext
)
```
Mints `amount` AXIOM_TEST_CLAIM tokens and deposits them into the campaign pool.

### 5.3 claim (public)
```move
public entry fun claim(
    campaign: &mut ClaimCampaign,
    proof: vector<vector<u8>>,
    ctx: &mut TxContext
)
```
Called by any eligible address. Verifies merkle proof, checks duplicate status,
transfers `amount_per_claim` to `ctx.sender()`.

Aborts with:
- `ENotActive` — campaign is paused or inactive
- `EExpired` — current epoch is past `expires_at_epoch`
- `EAlreadyClaimed` — address has already claimed
- `EInvalidProof` — merkle proof fails verification
- `EInsufficientPool` — pool does not have enough tokens

### 5.4 pause_campaign (admin)
```move
public entry fun pause_campaign(
    _: &AdminCap,
    campaign: &mut ClaimCampaign
)
```
Sets `is_active = false`. All claim attempts abort with `ENotActive`.

### 5.5 unpause_campaign (admin)
```move
public entry fun unpause_campaign(
    _: &AdminCap,
    campaign: &mut ClaimCampaign
)
```
Sets `is_active = true`.

### 5.6 update_merkle_root (admin)
```move
public entry fun update_merkle_root(
    _: &AdminCap,
    campaign: &mut ClaimCampaign,
    new_root: vector<u8>
)
```
Updates the merkle root. Campaign must be paused first.

### 5.7 close_campaign (admin)
```move
public entry fun close_campaign(
    _: &AdminCap,
    campaign: &mut ClaimCampaign,
    ctx: &mut TxContext
)
```
Sets `is_active = false`, withdraws all remaining pool balance back to the
admin address, and emits `CampaignClosedEvent`.

---

## 6. Merkle Proof Verification

### Leaf Construction
Each eligible (address, amount) pair is encoded as:
```
leaf = keccak256(bcs::to_bytes(address) || bcs::to_bytes(amount))
```

### Proof Verification (merkle.move)
Standard binary merkle tree verification:
- Input: `leaf`, `proof: vector<vector<u8>>`, `root: vector<u8>`
- For each proof element: hash pair (sorted order) and continue up tree
- Return `true` if final hash equals root

**Security note:** The merkle implementation must use a collision-resistant
hash function (keccak256 via `sui::hash::keccak256`) and must sort sibling
pairs to prevent second-preimage attacks.

### Off-Chain Tree Construction (TypeScript, Phase 6)
When @mysten/sui is installed in Phase 6, the Axiom backend will:
1. Build the eligibility list: `[(address_1, amount_1), ...]`
2. Compute leaves: `keccak256(bcs_encode(address, amount))`
3. Build the binary merkle tree
4. Compute the root and submit via `update_merkle_root`
5. Store proofs for each eligible address
6. Expose proofs via an API so claimants can retrieve their proof and submit

---

## 7. Events

```move
public struct ClaimEvent has copy, drop {
    campaign_id: String,
    claimer: address,
    amount: u64,
}

public struct CampaignFundedEvent has copy, drop {
    campaign_id: String,
    amount: u64,
    pool_total: u64,
}

public struct CampaignPausedEvent has copy, drop {
    campaign_id: String,
}

public struct CampaignClosedEvent has copy, drop {
    campaign_id: String,
    remaining_returned: u64,
}

public struct MerkleRootUpdatedEvent has copy, drop {
    campaign_id: String,
    new_root: vector<u8>,
}
```

---

## 8. Duplicate Claim Prevention

The `claimed: Table<address, bool>` field in `ClaimCampaign` stores a boolean
for each address that has successfully claimed. Before transferring tokens,
`claim()` checks:

```move
assert!(!table::contains(&campaign.claimed, ctx.sender()), EAlreadyClaimed);
```

After a successful transfer, the address is added:
```move
table::add(&mut campaign.claimed, ctx.sender(), true);
```

This is an on-chain, per-campaign record. An address may claim in multiple
different campaigns if eligible in each.

---

## 9. Distribution Models Compared

Phase 5 recommends starting with a simplified model and progressing to merkle:

### Phase 6 Prototype (Recommended): Simple Operator Campaign

For the first testnet deployment, the merkle root approach can be simplified:
the admin sets an allowlist of addresses directly as a `VecSet<address>` instead
of a merkle root. This avoids the merkle implementation complexity for the
initial smoke test.

| Property | Simple Allowlist | Merkle Root |
|---|---|---|
| On-chain eligibility | Stored in full | Only root stored |
| Scalability | Limited (~hundreds) | Unlimited |
| Gas for setup | High (each address) | Low (one root) |
| Privacy | Addresses visible | Only root visible |
| Complexity | Low | Medium |
| Production suitability | No | Yes |

**Recommendation:** Implement both:
1. Phase 6 Sprint 1: Simple allowlist variant (smoke test the claim mechanic)
2. Phase 6 Sprint 2: Replace with merkle root variant (production pattern)

### Phase 6 Final: Merkle Root Campaign (canonical for Phase 7+)

This is the full specification above. The merkle model is the production-ready
pattern and should be the canonical implementation before any mainnet consideration.

---

## 10. Abort Codes

```move
const ENotActive: u64 = 1;
const EExpired: u64 = 2;
const EAlreadyClaimed: u64 = 3;
const EInvalidProof: u64 = 4;
const EInsufficientPool: u64 = 5;
const ECampaignNotPaused: u64 = 6;  // Required for merkle root update
```

---

## 11. Test Requirements

The following Move unit tests must pass before Phase 6 deployment:

| Test | Description | Expected |
|---|---|---|
| `test_create_campaign` | Create a campaign, verify shared object exists | Pass |
| `test_fund_campaign` | Fund campaign, verify pool balance | Pass |
| `test_valid_claim` | Eligible address submits valid proof | Claim succeeds |
| `test_duplicate_claim` | Same address claims twice | Abort EAlreadyClaimed |
| `test_invalid_proof` | Address submits wrong proof | Abort EInvalidProof |
| `test_pause_rejects_claims` | Claim on paused campaign | Abort ENotActive |
| `test_expired_rejects_claims` | Claim after expiration epoch | Abort EExpired |
| `test_close_returns_balance` | Close campaign, verify admin receives remaining | Pass |
| `test_merkle_single_leaf` | Single-address merkle tree | Pass |
| `test_merkle_multi_leaf` | Multi-address merkle tree | Pass |

---

## 12. G05 Status

**G05: Claim Contract Specification — SATISFIED**

Specification completed: 2026-05-15  
Implementation status: NOT STARTED  
Move developer: NOT ENGAGED (G03: EXTERNAL_REQUIRED)  
Testnet deployment: NOT AUTHORIZED (G06: NOT_STARTED)
