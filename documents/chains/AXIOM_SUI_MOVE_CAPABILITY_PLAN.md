# AXIOM SUI — MOVE LANGUAGE CAPABILITY PLAN

**Document type:** Capability Assessment  
**Phase:** Phase 5 — Testnet Claim Contract Prototype Design  
**Chain:** Sui (non-EVM, Move VM)  
**Date:** 2026-05-15  
**G03 Status:** EXTERNAL_REQUIRED  
**Classification:** Internal — architecture record  

---

## 1. Assessment Summary

**No Move language capability currently exists in the Axiom codebase or team.**

The Axiom codebase contains:
- Solidity (Arbitrum contracts)
- TypeScript / JavaScript (backend, frontend, SDK integration)
- No Move source files
- No Move.toml package manifests
- No Sui CLI configuration

Move is a distinct programming language with different safety guarantees,
type system, ownership model, and toolchain from Solidity. Move expertise
does NOT transfer automatically from Solidity or TypeScript experience.

**G03 verdict: EXTERNAL_REQUIRED**

No Move code should be written, reviewed, or deployed without a qualified
Move developer or auditor involved.

---

## 2. What the Claim Contract Needs to Do

The Phase 5 claim contract prototype (AXIOM_TEST_CLAIM) requires the following
Move capabilities:

### 2.1 Package Publication
- Define a Move package with a `Move.toml` manifest
- Publish the package to Sui Testnet using `sui client publish`
- Package ID becomes the canonical identifier for all contract objects

### 2.2 Coin Definition
- Define `AXIOM_TEST_CLAIM` as a `Coin<T>` using the `sui::coin` module
- Create a `TreasuryCap<AXIOM_TEST_CLAIM>` held by the admin
- Mint test claim tokens from the TreasuryCap into a distribution pool

### 2.3 Campaign Object
- Define a shared `ClaimCampaign` object with:
  - `merkle_root: vector<u8>` — the eligibility commitment
  - `amount_per_claim: u64` — tokens per eligible address
  - `total_supply: Balance<AXIOM_TEST_CLAIM>` — funded from TreasuryCap
  - `claimed: Table<address, bool>` — duplicate claim prevention
  - `is_active: bool` — pause/resume flag
  - `expires_at: u64` — epoch-based expiration

### 2.4 Admin Capability
- `AdminCap` object owned by the deployer
- Required for: funding the campaign, updating merkle root, pausing, closing

### 2.5 Claim Entry Function
- `public entry fun claim(campaign: &mut ClaimCampaign, proof: vector<vector<u8>>, ctx: &mut TxContext)`
- Verifies merkle proof for `ctx.sender()`
- Checks claimed status (duplicate prevention)
- Transfers `amount_per_claim` tokens to `ctx.sender()`
- Emits `ClaimEvent`

### 2.6 Merkle Verification
- Pure Move implementation of keccak256-based merkle verification
- Or: use a well-reviewed Move merkle library from the Sui ecosystem
- Leaf: `keccak256(abi.encode(address, amount))` — compatible pattern

### 2.7 Events
- `ClaimEvent { claimer: address, amount: u64, campaign_id: ID }`
- `CampaignFundedEvent { amount: u64 }`
- `CampaignPausedEvent { campaign_id: ID }`

### 2.8 Emergency Controls
- `public entry fun pause(campaign: &mut ClaimCampaign, _: &AdminCap)`
- `public entry fun unpause(campaign: &mut ClaimCampaign, _: &AdminCap)`
- `public entry fun close_campaign(campaign: &mut ClaimCampaign, _: &AdminCap)` — withdraws remaining balance

---

## 3. Move Skills Required

| Skill | Required for | Complexity |
|---|---|---|
| Move module structure | Package definition | Low |
| `sui::coin` and `TreasuryCap` | Token minting | Medium |
| Shared objects (`transfer::share_object`) | Campaign object | Medium |
| `sui::table::Table` | Claimed tracking | Medium |
| Owned objects (`AdminCap`) | Access control | Low |
| Entry functions + `TxContext` | Claim function | Medium |
| Merkle proof verification in Move | Eligibility check | High |
| Event emission | Observability | Low |
| `sui::balance::Balance` | Token holding in object | Medium |
| Move unit tests (`#[test]`) | Testing | Medium |
| `sui client publish` CLI | Deployment | Low |

---

## 4. Internal vs External Capability

### Current internal capability: NONE

No team member has demonstrated Move development experience.
No Move files exist in the repository.
This is not a criticism — Move is a specialized language and most blockchain
developers come from Solidity/EVM backgrounds.

### What cannot be safely done without Move expertise

The following must NOT be attempted without qualified Move involvement:

- Writing the merkle verification logic in Move
  (incorrect verification = any address can claim)
- Defining the `Balance<T>` handling inside shared objects
  (incorrect handling = tokens locked permanently)
- The `close_campaign` withdrawal logic
  (incorrect = funds inaccessible or drainable by unauthorized parties)
- Any error handling with `abort` codes
  (incorrect = silent failures or griefable aborts)

---

## 5. External Move Review Requirements

Before any Phase 6 Move code is deployed to testnet, the following external
review process is required:

### 5.1 Move Developer Engagement
- Engage a contractor or partner with Sui Move development experience
- Minimum: 1 qualified Move developer to write the package
- Minimum: 1 independent Move reviewer (different from the author)

### 5.2 Reference Resources
The following are established Move reference materials:
- Sui Move documentation: https://docs.sui.io/guides/developer/smart-contracts
- Move Book (language reference): https://move-book.com/
- Sui examples: https://github.com/MystenLabs/sui/tree/main/examples
- Sui framework source: https://github.com/MystenLabs/sui/tree/main/crates/sui-framework

### 5.3 Testing Requirements
- Move unit tests using `#[test]` framework
- Test: valid claim succeeds
- Test: duplicate claim is rejected
- Test: invalid merkle proof is rejected
- Test: paused campaign rejects claims
- Test: expired campaign rejects claims
- Test: close_campaign returns remaining balance

### 5.4 Security Review Requirements
- Static analysis using `sui move build --lint`
- Manual review of all `abort` paths
- Manual review of all object ownership transitions
- Manual review of merkle verification logic
- Confirm no integer overflow in balance arithmetic

---

## 6. Phase 5 Action Required

Phase 5 does NOT require Move code. Phase 5 is design-only.

Before Phase 6 begins, Axiom must:
1. Identify at least one qualified Sui Move developer (internal hire, contractor, or partner)
2. Share `AXIOM_SUI_CLAIM_CONTRACT_SPEC.md` with the Move developer for review
3. Confirm the Move developer has reviewed the spec and agreed to implement
4. Record the engagement in this document

**G03: EXTERNAL_REQUIRED**

G03 may be updated to CONFIRMED only when:
- A named Move developer is engaged
- They have reviewed the claim contract spec
- Axiom has confirmed their availability for Phase 6 implementation

---

## 7. G03 Status

**G03: Move Language Capability — EXTERNAL_REQUIRED**

Assessment date: 2026-05-15
Internal capability: None
External engagement: Not yet initiated
Action required: Identify and engage a qualified Sui Move developer before Phase 6

---

## 8. Phase 6 Developer Assignment Record

**Status: SATISFIED — Clarence Fuqua named 2026-05-15**
Last checked: 2026-05-15

### 8.1 Assignment Fields

Named Move developer:      Clarence Fuqua
Organization / relation:   Axiom Protocol — Founder / Operator
Contact / handle:          Internal
Scope:                     Sprint 1 — simple allowlist claim prototype
                           Sprint 2 — merkle root claim prototype (if Sprint 1 passes)
Responsibilities:
  - Read and acknowledge AXIOM_SUI_MOVE_DEVELOPER_ONBOARDING_PACKET.md
  - Read and acknowledge AXIOM_SUI_CLAIM_CONTRACT_SPEC.md
  - Write axiom_test_claim.move, claim_campaign.move, merkle.move
  - Write all 10 required unit tests
  - Submit code for security review before any testnet deployment
  - Record testnet transaction digest after authorized deployment
Date assigned:             2026-05-15
Date onboarding confirmed: 2026-05-15
Date spec review confirmed: 2026-05-15
Availability confirmed:    YES

### 8.2 Engagement options

Option A — Internal hire:
  Hire a Sui Move developer as an employee or long-term contractor.
  Best for ongoing Sui development beyond Phase 6.

Option B — Freelance contractor:
  Engage via Sui ecosystem communities (Sui Discord, Move developer forums),
  freelance platforms, or referral.
  Suitable for Phase 6 prototype scope (estimated 6–10 days of Move work).

Option C — Ecosystem partner:
  Engage a Sui-ecosystem audit or development firm.
  Higher cost, but provides developer + reviewer in one engagement.

Option D — Community contributor:
  Post a scoped bounty in the Axiom community or Sui developer communities.
  Requires careful scope control — onboarding packet is essential.

### 8.3 How to satisfy G03

When a real developer is named:
1. Record name, organization, and contact in Section 8.1 above.
2. Confirm they have acknowledged the onboarding packet.
3. Confirm they have reviewed the claim contract spec.
4. Update G03 status to SATISFIED in AXIOM_SUI_PHASE6_GATE_TRACKER.md.
5. Fill in "Named Move developer" in AXIOM_SUI_PHASE6_TESTNET_AUTHORIZATION.md Section 4.

G03 gate rule: SATISFIED only if a real named developer is recorded.
Do not mark SATISFIED with a placeholder.
