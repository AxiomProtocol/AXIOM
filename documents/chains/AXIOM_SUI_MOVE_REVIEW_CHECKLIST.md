# AXIOM SUI — Move Reviewer Checklist
# Phase 6 · Testnet Claim Contract Prototype

Status:        ACTIVE — awaiting code submission
Classification: INTERNAL — engineering use only
Last updated:  2026-05-15
Reviewer:      [To be named — see G03b in gate tracker]
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

[ ] 1.01  AdminCap is an owned object (not a shared object).
[ ] 1.02  All privileged entry functions take &AdminCap as a parameter.
[ ] 1.03  AdminCap cannot be duplicated or forged by any code path.
[ ] 1.04  AdminCap transfer capability is preserved (can be transferred to
          a new admin if needed, e.g. emergency).
[ ] 1.05  No hard-coded admin address exists anywhere in contract storage.
          Authority derives solely from possession of AdminCap.
[ ] 1.06  AdminCap cannot be destroyed except by an explicit burn function
          (or is intentionally not destroyable — document which is chosen).

---

## Section 2 — TreasuryCap Handling

[ ] 2.01  TreasuryCap for AXIOM_TEST_CLAIM is created by one-time witness
          in the coin module init function.
[ ] 2.02  TreasuryCap is transferred to or wrapped by the claim campaign
          module. It is not stored in a publicly accessible location.
[ ] 2.03  Only the campaign module can call coin::mint using the TreasuryCap.
          No external module can mint AXIOM_TEST_CLAIM.
[ ] 2.04  TreasuryCap is not accessible to the claimant.
[ ] 2.05  Minting is bounded by the campaign pool — no uncapped minting path.
[ ] 2.06  TreasuryCap is handled after close_campaign. Document whether it
          is burned, wrapped, or returned to admin.

---

## Section 3 — Claim Replay Prevention

[ ] 3.01  Each successful claim records the claimant address in the campaign's
          claimed table.
[ ] 3.02  The claim function checks the claimed table before any state change.
[ ] 3.03  A second claim from the same address aborts with EAlreadyClaimed.
[ ] 3.04  The claimed table uses the claimant's Sui address as the key,
          not a mutable or spoofable field.
[ ] 3.05  There is no reset mechanism for the claimed table that could
          re-enable a previously satisfied claim.

---

## Section 4 — Duplicate Claim Prevention

[ ] 4.01  (Follows from Section 3.) No code path exists that allows a wallet
          to receive AXIOM_TEST_CLAIM more than once per campaign instance.
[ ] 4.02  Merging campaigns or updating the merkle root does not reset
          the claimed table.
[ ] 4.03  Campaign close prevents all future claims regardless of table state.

---

## Section 5 — Pause / Unpause Behavior

[ ] 5.01  Pause sets is_active = false on the ClaimCampaign object.
[ ] 5.02  Claim entry function checks is_active; aborts with ENotActive if
          the campaign is paused.
[ ] 5.03  Unpause requires AdminCap and sets is_active = true.
[ ] 5.04  Pause requires AdminCap.
[ ] 5.05  Pause does not modify the claimed table or the pool balance.
[ ] 5.06  A paused campaign that is then closed cannot be unpaused.
[ ] 5.07  Events are emitted on pause and unpause (see Section 9).

---

## Section 6 — Campaign Close Behavior

[ ] 6.01  close_campaign requires AdminCap.
[ ] 6.02  After close, all claim attempts abort with ENotActive (or a
          dedicated EClosed code if spec defines one).
[ ] 6.03  Remaining pool balance is handled after close. Document one of:
            a) returned to admin wallet
            b) burned via coin::burn
          Both are acceptable; the choice must be documented and implemented.
[ ] 6.04  Close is permanent — there is no reopen function.
[ ] 6.05  The ClaimCampaign shared object is either deleted or marked
          permanently closed after this call.

---

## Section 7 — Merkle Proof Verification (Sprint 2 only)

[ ] 7.01  Merkle tree uses keccak256 hashing as specified.
[ ] 7.02  Leaf is constructed as keccak256(address ++ amount) in the
          correct byte order.
[ ] 7.03  Proof verification iterates through the proof vector and computes
          the root correctly.
[ ] 7.04  A tampered proof aborts with EInvalidProof.
[ ] 7.05  An empty proof with a non-zero root aborts with EInvalidProof.
[ ] 7.06  A valid proof for a different campaign root does not validate.
[ ] 7.07  The claimed amount cannot exceed the value committed in the leaf.
[ ] 7.08  Merkle root update (update_merkle_root) requires AdminCap.
[ ] 7.09  Old proofs are invalidated after root update.
[ ] 7.10  Merkle proof length is bounded to prevent gas exhaustion attacks.

---

## Section 8 — Event Emission

[ ] 8.01  CampaignCreated event is emitted when a campaign is created.
[ ] 8.02  Claimed event is emitted with claimant address and amount on
          every successful claim.
[ ] 8.03  CampaignPaused event emitted on pause.
[ ] 8.04  CampaignUnpaused event emitted on unpause.
[ ] 8.05  CampaignClosed event emitted on close.
[ ] 8.06  Events use emit correctly — no silent state changes without events.
[ ] 8.07  No sensitive data (private keys, off-chain PII) is included in any
          event payload.

---

## Section 9 — Object Ownership

[ ] 9.01  AdminCap is an owned object sent to the deployer on creation.
[ ] 9.02  ClaimCampaign is a shared object accessible by all claimants.
[ ] 9.03  AXIOM_TEST_CLAIM coins transferred to claimants are correctly
          transferred to the claimant's address (not the contract).
[ ] 9.04  No object is transferred to address(0) or a hard-coded address.
[ ] 9.05  Remaining pool coins after close are handled per Section 6.03.
[ ] 9.06  TreasuryCap ownership is documented and matches Section 2.

---

## Section 10 — Shared Object Safety

[ ] 10.01  ClaimCampaign is accessed safely under Sui's shared object model.
[ ] 10.02  No nested shared object references exist (Sui Move restriction).
[ ] 10.03  Concurrent claim transactions do not create race conditions that
           allow double-claims. (Sui's consensus ensures object version
           ordering — verify the claimed table check is within the same
           transaction that does the mint.)
[ ] 10.04  No dynamic field is used in a way that bypasses the claimed check.

---

## Section 11 — Test Coverage

[ ] 11.01  All 10 required unit tests are present (see spec Section 9).
[ ] 11.02  test_claim_success passes.
[ ] 11.03  test_claim_duplicate_rejected passes.
[ ] 11.04  test_claim_paused_campaign passes.
[ ] 11.05  test_campaign_fund_and_pool_decreases passes.
[ ] 11.06  test_pause_unpause passes.
[ ] 11.07  test_close_campaign passes.
[ ] 11.08  test_update_merkle_root_sprint2 passes (Sprint 2 only).
[ ] 11.09  test_invalid_proof_rejected_sprint2 passes (Sprint 2 only).
[ ] 11.10  test_insufficient_pool passes.
[ ] 11.11  test_admin_cap_required passes.
[ ] 11.12  No test uses #[allow(unused)] to suppress Move warnings.
[ ] 11.13  Tests use test-only helpers, not production entry functions
           where appropriate.

---

## Section 12 — No Canonical Asset References

[ ] 12.01  No import, use, or reference to AXUSD in any Move source file.
[ ] 12.02  No import, use, or reference to AXAU in any Move source file.
[ ] 12.03  No import, use, or reference to AXM in any Move source file.
[ ] 12.04  No import, use, or reference to SEED in any Move source file.
[ ] 12.05  No import, use, or reference to KAG in any Move source file.
[ ] 12.06  No coin type parameter accepts an arbitrary external coin type
           that could be used to introduce canonical assets.
[ ] 12.07  Move.toml has no dependency on any third-party Sui production
           protocol package (e.g. Cetus, Turbos, Scallop, etc.).
[ ] 12.08  The only external dependency is the Sui framework itself.

---

## Section 13 — No Bridge Assumptions

[ ] 13.01  No cross-chain message send or receive in any source file.
[ ] 13.02  No import of any bridge protocol package.
[ ] 13.03  No reference to Arbitrum, Ethereum, Polygon, or Avalanche
           chain IDs or addresses in any Move source file.
[ ] 13.04  No emit of events intended to be relayed cross-chain.
[ ] 13.05  No lock-and-mint or burn-and-release pattern.

---

## Section 14 — Testnet Safety

[ ] 14.01  Move.toml [addresses] section targets Sui testnet package IDs,
           not mainnet.
[ ] 14.02  No mainnet address appears in any Move source or config file.
[ ] 14.03  The contract does not reference faucet addresses or test helpers
           in production code paths (test-only is acceptable).
[ ] 14.04  No sensitive credential, private key, or mnemonic appears in
           any Move file or Move.toml.

---

## Reviewer Approval Block

Reviewer name:        ________________________________
Review date:          ________________________________
Sprint reviewed:      [ ] Sprint 1 (allowlist)    [ ] Sprint 2 (merkle)
All PASS or N/A:      [ ] YES    [ ] NO (findings listed below)
Recommendation:       [ ] APPROVED    [ ] APPROVED WITH CONDITIONS
                      [ ] REJECTED (re-review required)

Summary of findings:
(List any FAIL items and required actions before approval)




Reviewer signature:   ________________________________
Date:                 ________________________________

---

*End of Move Reviewer Checklist*
