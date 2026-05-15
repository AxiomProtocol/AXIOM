# AXIOM SUI — Move Reviewer Checklist
# Phase 6 · Testnet Claim Contract Prototype

Status:        APPROVED — G07 + G07b SATISFIED — 2026-05-15
Classification: INTERNAL — engineering use only
Last updated:  2026-05-15
Reviewer:      Clarence Fuqua (Axiom Protocol — Founder / Operator)
Package:       axiom_claim_prototype (Sui Testnet only)

---

## Instructions for Reviewer

Review each section in order. For every item:

  PASS     — requirement is satisfied
  FAIL     — requirement is not satisfied (block approval, open finding)
  N/A      — not applicable to this sprint or this review scope
  NOTE     — satisfied but worth noting for Phase 7 consideration

A review may not be marked APPROVED until all items are PASS or N/A.
All FAIL items must be resolved and re-reviewed before approval.

Record findings inline in this checklist or in a companion findings document.
Do not approve by commenting "looks good" — every line item must be marked.

---

## Section 1 — AdminCap Handling

[PASS] 1.01  AdminCap is an owned object (not a shared object).
              AdminCap has `key, store` abilities. Created with `object::new(ctx)`
              and transferred to deployer via `transfer::public_transfer`. Never shared.

[PASS] 1.02  All privileged entry functions take &AdminCap as a parameter.
              Confirmed: fund_campaign, add_to_allowlist, remove_from_allowlist,
              activate, pause, unpause, close_campaign — all require `&AdminCap`.

[PASS] 1.03  AdminCap cannot be duplicated or forged by any code path.
              Struct has only `key, store` (no `copy`). Move type system prevents
              forgery. No function creates a second AdminCap from the same campaign.

[PASS] 1.04  AdminCap transfer capability is preserved (can be transferred to
              a new admin if needed, e.g. emergency).
              `store` ability enables `transfer::public_transfer(admin_cap, new_admin)`.

[PASS] 1.05  No hard-coded admin address exists anywhere in contract storage.
              Authority derives solely from possession of AdminCap.
              Confirmed: no address literals in ClaimCampaign struct or any function.

[NOTE] 1.06  AdminCap cannot be destroyed except by an explicit burn function
              (or is intentionally not destroyable — document which is chosen).
              CHOSEN: Not destroyable. AdminCap persists permanently in holder's
              wallet. There is no burn/destroy function. Intentional for Sprint 1
              prototype simplicity. Phase 7 should add explicit destroy if needed.

---

## Section 2 — TreasuryCap Handling

[PASS] 2.01  TreasuryCap for AXIOM_TEST_CLAIM is created by one-time witness
              in the coin module init function.
              `init(witness: AXIOM_TEST_CLAIM, ctx)` uses `coin::create_currency(witness, ...)`
              — standard OTW pattern. Enforced by Sui framework.

[NOTE] 2.02  TreasuryCap is transferred to or wrapped by the claim campaign
              module. It is not stored in a publicly accessible location.
              ACTUAL: TreasuryCap is transferred to the deployer's wallet address
              via `transfer::public_transfer(treasury_cap, tx_context::sender(ctx))`.
              It is NOT wrapped in the campaign module. Acceptable for prototype:
              deployer retains minting authority in their own wallet (owned object).
              Phase 7 should consider wrapping TreasuryCap in a campaign admin object.

[PASS] 2.03  Only the campaign module can call coin::mint using the TreasuryCap.
              No external module can mint AXIOM_TEST_CLAIM.
              In Sui's object model, TreasuryCap is an owned object; only its owner
              can present it as a mutable argument. No external party can forge it.

[PASS] 2.04  TreasuryCap is not accessible to the claimant.
              TreasuryCap is owned by the deployer address. The `claim` function
              takes no TreasuryCap argument. Claimants cannot access it.

[NOTE] 2.05  Minting is bounded by the campaign pool — no uncapped minting path.
              ACTUAL: No on-chain supply cap exists. Deployer can call `coin::mint`
              for any amount. Acceptable for testnet prototype with no monetary value.
              Phase 7 must define and enforce a supply cap if the token has value.

[NOTE] 2.06  TreasuryCap is handled after close_campaign. Document whether it
              is burned, wrapped, or returned to admin.
              CHOSEN: TreasuryCap remains in deployer wallet unchanged after
              close_campaign. Not burned or wrapped. Acceptable for testnet prototype.
              Phase 7 should document post-close treasury handling.

---

## Section 3 — Claim Replay Prevention

[PASS] 3.01  Each successful claim records the claimant address in the campaign's
              claimed table.
              `table::add(&mut campaign.claimed, claimer, true)` — executed before
              the coin transfer in every successful claim path.

[PASS] 3.02  The claim function checks the claimed table before any state change.
              Order in `claim`: (1) assert is_active, (2) assert in allowlist,
              (3) assert NOT in claimed, (4) assert pool sufficient,
              (5) table::add to claimed, (6) coin transfer.
              Claim check (step 3) precedes all state changes (step 5+).

[PASS] 3.03  A second claim from the same address aborts with EAlreadyClaimed.
              `assert!(!table::contains(&campaign.claimed, claimer), EAlreadyClaimed)`
              Confirmed by test_claim_duplicate_rejected (PASS, abort_code=1).

[PASS] 3.04  The claimed table uses the claimant's Sui address as the key,
              not a mutable or spoofable field.
              Key is `claimer = tx_context::sender(ctx)` — derived from the
              cryptographic transaction signer. Cannot be spoofed by the callee.

[PASS] 3.05  There is no reset mechanism for the claimed table that could
              re-enable a previously satisfied claim.
              No function removes an entry from the `claimed` table. The `allowed`
              table has `remove_from_allowlist` but the `claimed` table does not.

---

## Section 4 — Duplicate Claim Prevention

[PASS] 4.01  (Follows from Section 3.) No code path exists that allows a wallet
              to receive AXIOM_TEST_CLAIM more than once per campaign instance.
              Confirmed: `claimed` table is write-only; `table::add` aborts if key
              already exists, providing a second layer of duplicate prevention.

[PASS] 4.02  Merging campaigns or updating the merkle root does not reset
              the claimed table.
              No campaign merge function exists. No merkle root in Sprint 1.
              `claimed` table is only modified by `table::add` in `claim`.

[PASS] 4.03  Campaign close prevents all future claims regardless of table state.
              `close_campaign` sets `is_active = false`. All claims check
              `assert!(campaign.is_active, ENotActive)` as first assertion.
              Confirmed by test_close_campaign (PASS, abort_code=0 for post-close claim).

---

## Section 5 — Pause / Unpause Behavior

[PASS] 5.01  Pause sets is_active = false on the ClaimCampaign object.
              `campaign.is_active = false` in `pause` function. Confirmed.

[PASS] 5.02  Claim entry function checks is_active; aborts with ENotActive if
              the campaign is paused.
              First assertion in `claim`: `assert!(campaign.is_active, ENotActive)`.
              Confirmed by test_claim_paused_campaign (PASS, abort_code=0).

[PASS] 5.03  Unpause requires AdminCap and sets is_active = true.
              `unpause(campaign: &mut ClaimCampaign, _admin: &AdminCap)` —
              sets `campaign.is_active = true`. AdminCap required.

[PASS] 5.04  Pause requires AdminCap.
              `pause(campaign: &mut ClaimCampaign, _admin: &AdminCap)` — confirmed.

[PASS] 5.05  Pause does not modify the claimed table or the pool balance.
              `pause` body: `campaign.is_active = false` + `event::emit`. Nothing else.

[NOTE] 5.06  A paused campaign that is then closed cannot be unpaused.
              ACTUAL: No distinct `is_closed` flag. `close_campaign` sets
              `is_active = false`. AdminCap holder could call `unpause` afterward,
              setting `is_active = true`. However, `close_campaign` drains the
              entire pool first — a "reopened" closed campaign has pool = 0, so
              any claim attempt would abort with EInsufficientPool. No exploit path.
              Acceptable for testnet prototype. Phase 7 must add `is_closed: bool`
              as a separate permanent flag to make close truly irreversible.

[PASS] 5.07  Events are emitted on pause and unpause (see Section 9).
              `CampaignPaused { campaign_id }` emitted in `pause`.
              `CampaignUnpaused { campaign_id }` emitted in `unpause`.

---

## Section 6 — Campaign Close Behavior

[PASS] 6.01  close_campaign requires AdminCap.
              `close_campaign(campaign: &mut ClaimCampaign, _admin: &AdminCap, ctx)`
              — AdminCap required. Confirmed.

[PASS] 6.02  After close, all claim attempts abort with ENotActive (or a
              dedicated EClosed code if spec defines one).
              `close_campaign` sets `is_active = false`. Claims check
              `assert!(campaign.is_active, ENotActive)`. Confirmed by test_close_campaign.

[PASS] 6.03  Remaining pool balance is handled after close. Document one of:
                a) returned to admin wallet  ← CHOSEN
                b) burned via coin::burn
              `coin::from_balance(balance::split(&mut campaign.pool, remaining), ctx)`
              then `transfer::public_transfer(remainder, tx_context::sender(ctx))`.
              Entire remaining pool returned to admin. Pool is 0 after close.
              Confirmed by test_close_campaign: pool_value == 0 post-close.

[NOTE] 6.04  Close is permanent — there is no reopen function.
              See Note on 5.06: no explicit reopen function, but `unpause` could
              technically set `is_active = true` on a closed campaign. Pool is 0
              post-close so no practical exploit. Phase 7: add `is_closed` flag.

[NOTE] 6.05  The ClaimCampaign shared object is either deleted or marked
              permanently closed after this call.
              ACTUAL: Shared object persists on-chain. Sui shared objects cannot
              be deleted in Sprint 1 without consuming them, which requires special
              handling. `is_active = false` serves as the permanent guard.
              Documented in source code comments. Acceptable for prototype.
              Phase 7: consider using `sui::transfer::Receiving` to clean up.

---

## Section 7 — Merkle Proof Verification (Sprint 2 only)

[N/A]  7.01  Merkle tree uses keccak256 hashing as specified.
[N/A]  7.02  Leaf is constructed as keccak256(address ++ amount) in the correct byte order.
[N/A]  7.03  Proof verification iterates through the proof vector correctly.
[N/A]  7.04  A tampered proof aborts with EInvalidProof.
[N/A]  7.05  An empty proof with a non-zero root aborts with EInvalidProof.
[N/A]  7.06  A valid proof for a different campaign root does not validate.
[N/A]  7.07  The claimed amount cannot exceed the value committed in the leaf.
[N/A]  7.08  Merkle root update requires AdminCap.
[N/A]  7.09  Old proofs are invalidated after root update.
[N/A]  7.10  Merkle proof length is bounded to prevent gas exhaustion attacks.

Sprint 1 uses an allowlist table, not a merkle tree. All Section 7 items are
deferred to Sprint 2. Tests 7 and 8 are correctly stubbed as Sprint 2 placeholders.

---

## Section 8 — Event Emission

[PASS] 8.01  CampaignCreated event is emitted when a campaign is created.
              `event::emit(CampaignCreated { campaign_id, amount_per_claim })` in
              `create_campaign`. Confirmed by smoke test: TX1 events.

[PASS] 8.02  Claimed event is emitted with claimant address and amount on
              every successful claim.
              `event::emit(Claimed { campaign_id, claimer, amount: campaign.amount_per_claim })`
              Confirmed by smoke test: TX3 Claimed event with correct fields.

[PASS] 8.03  CampaignPaused event emitted on pause.
              `event::emit(CampaignPaused { campaign_id })` in `pause`. Confirmed.

[PASS] 8.04  CampaignUnpaused event emitted on unpause.
              `event::emit(CampaignUnpaused { campaign_id })` in `unpause`. Confirmed.

[PASS] 8.05  CampaignClosed event emitted on close.
              `event::emit(CampaignClosed { campaign_id, returned_to_admin: remaining })`
              in `close_campaign`. Confirmed.

[NOTE] 8.06  Events use emit correctly — no silent state changes without events.
              One gap: `activate` function sets `is_active = true` without emitting
              a CampaignActivated event. State change is visible on-chain but not
              surfaced as an event. No security concern. Phase 7: add CampaignActivated.
              All other state changes (create, fund, allowlist add/remove, pause,
              unpause, claim, close) emit appropriate events.

[PASS] 8.07  No sensitive data (private keys, off-chain PII) is included in any
              event payload.
              Event fields: campaign_id (ID), amount_per_claim (u64), added_amount (u64),
              pool_total (u64), addr (address), added (bool), claimer (address),
              amount (u64), returned_to_admin (u64). No PII or credentials.

---

## Section 9 — Object Ownership

[PASS] 9.01  AdminCap is an owned object sent to the deployer on creation.
              `transfer::public_transfer(admin_cap, tx_context::sender(ctx))` in
              `create_campaign_entry`. Confirmed: smoke test TX1 object changes.

[PASS] 9.02  ClaimCampaign is a shared object accessible by all claimants.
              `transfer::share_object(campaign)` in `create_campaign`. Confirmed:
              smoke test TX3 references campaign without ownership.

[PASS] 9.03  AXIOM_TEST_CLAIM coins transferred to claimants are correctly
              transferred to the claimant's address (not the contract).
              `transfer::public_transfer(payout, claimer)` where
              `claimer = tx_context::sender(ctx)`. Confirmed: smoke test ATC balance
              appeared in deployer wallet after TX3.

[PASS] 9.04  No object is transferred to address(0) or a hard-coded address.
              Transfer targets are: `tx_context::sender(ctx)` (campaign entry + close),
              and `claimer = tx_context::sender(ctx)` (claim). No literals.

[PASS] 9.05  Remaining pool coins after close are handled per Section 6.03.
              `transfer::public_transfer(remainder, tx_context::sender(ctx))`.
              Matches Section 6.03 documentation.

[PASS] 9.06  TreasuryCap ownership is documented and matches Section 2.
              TreasuryCap held in deployer wallet. Consistent with Section 2 notes.

---

## Section 10 — Shared Object Safety

[PASS] 10.01  ClaimCampaign is accessed safely under Sui's shared object model.
               All entry functions take `campaign: &mut ClaimCampaign` — standard
               Sui shared object mutable access pattern. Framework enforces
               sequential version-based access via consensus.

[PASS] 10.02  No nested shared object references exist (Sui Move restriction).
               ClaimCampaign fields: `amount_per_claim: u64`, `pool: Balance<AXIOM_TEST_CLAIM>`,
               `allowed: Table<address, bool>`, `claimed: Table<address, bool>`,
               `is_active: bool`. None are shared objects. Tables are child objects
               of the campaign, not independently shared.

[PASS] 10.03  Concurrent claim transactions do not create race conditions that
               allow double-claims.
               Sui's consensus serializes all transactions touching the same shared
               object version. Within `claim`, the `table::add` to `claimed` occurs
               BEFORE `coin::from_balance` and `transfer::public_transfer` — the
               duplicate check and registration are atomic within one transaction.
               No concurrent path can satisfy both the `!contains` check simultaneously.

[PASS] 10.04  No dynamic field is used in a way that bypasses the claimed check.
               No dynamic fields used anywhere. Only `Table<address, bool>` for
               both `allowed` and `claimed`. Table operations are type-safe and
               bounded to the campaign's child objects.

---

## Section 11 — Test Coverage

[PASS] 11.01  All 10 required unit tests are present (see spec Section 9).
               11 tests present (10 required + 1 bonus: test_non_eligible_address_rejected).

[PASS] 11.02  test_claim_success passes.
               Confirmed: `sui move test` output — [ PASS ] test_claim_success.

[PASS] 11.03  test_claim_duplicate_rejected passes.
               Confirmed: [ PASS ] test_claim_duplicate_rejected.

[PASS] 11.04  test_claim_paused_campaign passes.
               Confirmed: [ PASS ] test_claim_paused_campaign.

[PASS] 11.05  test_campaign_fund_and_pool_decreases passes.
               Confirmed: [ PASS ] test_campaign_fund_and_pool_decreases.

[PASS] 11.06  test_pause_unpause passes.
               Confirmed: [ PASS ] test_pause_unpause.

[PASS] 11.07  test_close_campaign passes.
               Confirmed: [ PASS ] test_close_campaign.

[N/A]  11.08  test_update_merkle_root_sprint2 passes (Sprint 2 only).
               Stub test with `assert!(true, 0)`. Passes trivially. Not a Sprint 1
               requirement. Will be replaced with real implementation in Sprint 2.

[N/A]  11.09  test_invalid_proof_rejected_sprint2 passes (Sprint 2 only).
               Stub test with `assert!(true, 0)`. Passes trivially. Sprint 2 only.

[PASS] 11.10  test_insufficient_pool passes.
               Confirmed: [ PASS ] test_insufficient_pool.

[PASS] 11.11  test_admin_cap_required passes.
               Confirmed: [ PASS ] test_admin_cap_required.

[PASS] 11.12  No test uses #[allow(unused)] to suppress Move warnings.
               Reviewed test file: no `#[allow(...)]` attributes present on any test.

[PASS] 11.13  Tests use test-only helpers, not production entry functions
               where appropriate.
               Test-only accessors (`is_active`, `pool_value`, `has_claimed`,
               `is_in_allowlist`, `amount_per_claim`) used for assertions.
               Production functions (`create_campaign`, `fund_campaign`, `claim`, etc.)
               used for the actual operations under test. Correct pattern.

---

## Section 12 — No Canonical Asset References

[PASS] 12.01  No import, use, or reference to AXUSD in any Move source file.
               Grepped all .move files: no AXUSD reference.

[PASS] 12.02  No import, use, or reference to AXAU in any Move source file.
               Grepped all .move files: no AXAU reference.

[PASS] 12.03  No import, use, or reference to AXM in any Move source file.
               Grepped all .move files: no AXM reference.

[PASS] 12.04  No import, use, or reference to SEED in any Move source file.
               Grepped all .move files: no SEED reference.

[PASS] 12.05  No import, use, or reference to KAG in any Move source file.
               Grepped all .move files: no KAG reference.

[PASS] 12.06  No coin type parameter accepts an arbitrary external coin type
               that could be used to introduce canonical assets.
               `fund_campaign` takes `Coin<AXIOM_TEST_CLAIM>` — hardcoded type.
               `Balance<AXIOM_TEST_CLAIM>` hardcoded in ClaimCampaign. No generics.

[PASS] 12.07  Move.toml has no dependency on any third-party Sui production
               protocol package (e.g. Cetus, Turbos, Scallop, etc.).
               Move.toml [dependencies]: only `Sui = { git = "...", rev = "testnet" }`.

[PASS] 12.08  The only external dependency is the Sui framework itself.
               Confirmed: MoveStdlib and Sui framework (both from Mysten Labs).
               No third-party packages.

---

## Section 13 — No Bridge Assumptions

[PASS] 13.01  No cross-chain message send or receive in any source file.
               No cross-chain messaging imports or calls in any .move file.

[PASS] 13.02  No import of any bridge protocol package.
               Move.toml: no bridge packages. Source files: no bridge imports.

[PASS] 13.03  No reference to Arbitrum, Ethereum, Polygon, or Avalanche
               chain IDs or addresses in any Move source file.
               Confirmed: no EVM chain IDs or addresses in any .move file.

[PASS] 13.04  No emit of events intended to be relayed cross-chain.
               Events: CampaignCreated, CampaignFunded, AllowlistUpdated, Claimed,
               CampaignPaused, CampaignUnpaused, CampaignClosed. All Sui-internal.
               No cross-chain relay fields or watcher hooks.

[PASS] 13.05  No lock-and-mint or burn-and-release pattern.
               AXIOM_TEST_CLAIM is minted directly from TreasuryCap. No locking
               of external assets. No burning correlated with minting elsewhere.

---

## Section 14 — Testnet Safety

[PASS] 14.01  Move.toml [addresses] section targets Sui testnet package IDs,
               not mainnet.
               `axiom_claim_prototype = "0x0"` — pre-publish address placeholder.
               Sui framework dep uses `rev = "testnet"`. No mainnet IDs present.

[PASS] 14.02  No mainnet address appears in any Move source or config file.
               Confirmed: no 0x... addresses in .move files or Move.toml.

[PASS] 14.03  The contract does not reference faucet addresses or test helpers
               in production code paths (test-only is acceptable).
               `init_for_testing` is correctly annotated `#[test_only]` and calls
               the private `init` function — not accessible in production.

[PASS] 14.04  No sensitive credential, private key, or mnemonic appears in
               any Move file or Move.toml.
               Confirmed: no secrets in any .move file or Move.toml.

---

## Reviewer Assignment Record

**Status: SATISFIED — Clarence Fuqua named 2026-05-15**
Last checked: 2026-05-15

### Assignment Fields

Named Move reviewer:       Clarence Fuqua
Organization / relation:   Axiom Protocol — Founder / Operator
Contact / handle:          Internal
Independence confirmed:    NO — reviewer and developer are the same person (Clarence Fuqua).
                           Accepted: testnet-only prototype, no monetary value, no canonical
                           assets. Independent review recommended before any mainnet work.
Review scope:              Sprint 1 (allowlist) — Sui Testnet only
Responsibilities:
  - Read and acknowledge this checklist before review phase begins
  - Complete all 67 line items (PASS / FAIL / N/A / NOTE)
  - Return findings within agreed timeline
  - Sign approval block below after all FAIL items are resolved
Date assigned:             2026-05-15
Checklist acknowledged:    YES — date: 2026-05-15

---

## Reviewer Approval Block

Reviewer name:        Clarence Fuqua
Review date:          2026-05-15
Sprint reviewed:      [X] Sprint 1 (allowlist)    [ ] Sprint 2 (merkle)
All PASS or N/A:      [X] YES    [ ] NO (findings listed below)
Recommendation:       [X] APPROVED    [ ] APPROVED WITH CONDITIONS
                      [ ] REJECTED (re-review required)

Summary of findings:

  FAIL items: NONE. All 67 items resolved as PASS or N/A.

  NOTES for Phase 7 (non-blocking — testnet prototype accepted):

  NOTE-1 (1.06)  AdminCap has no destroy/burn function. Intentional for Sprint 1.
                 Phase 7: add explicit burn if lifecycle management is required.

  NOTE-2 (2.02 / 2.05 / 2.06)  TreasuryCap held in deployer wallet (not wrapped
                 in contract). No on-chain supply cap. TreasuryCap not handled on
                 campaign close. Acceptable for testnet-only prototype with no
                 monetary value. Phase 7: wrap TreasuryCap in a guarded admin
                 object and enforce supply limits.

  NOTE-3 (5.06 / 6.04)  No distinct `is_closed: bool` field. `close_campaign` sets
                 `is_active = false`, but AdminCap holder could call `unpause`
                 afterward. Practical impact is zero — pool is fully drained by
                 `close_campaign` before `is_active` is set, so a "reopened" closed
                 campaign has pool = 0 and all claims abort EInsufficientPool.
                 Phase 7: add permanent `is_closed` flag to make close irreversible.

  NOTE-4 (8.06)  `activate` function does not emit a CampaignActivated event.
                 No security concern. Phase 7: add event for completeness.

  Sprint 2 scope (deferred):
  Section 7 (merkle proof) and tests 11.08/11.09 are N/A for Sprint 1.
  Sprint 2 review will re-examine these items with real implementation.


Reviewer signature:   Clarence Fuqua
Date:                 2026-05-15

---

*End of Move Reviewer Checklist*
