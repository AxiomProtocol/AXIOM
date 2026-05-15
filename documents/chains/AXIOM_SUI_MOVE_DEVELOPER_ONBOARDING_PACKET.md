# AXIOM SUI — Move Developer Onboarding Packet
# Phase 6 · Testnet Claim Contract Prototype

Status:        ACTIVE — Phase 6 preparation
Classification: INTERNAL — engineering use only
Last updated:  2026-05-15
Maintained by: Axiom Protocol engineering

---

## 1. Purpose of This Document

This packet is the single authoritative reference for any Move developer
engaged on the Axiom Sui Phase 6 testnet claim contract prototype.

You must read this document in full before writing any Move code.

---

## 2. Project Purpose

Axiom Protocol is evaluating Sui as a potential distribution and community
participation chain. The primary use case is community engagement rewards —
a mechanism where eligible wallets can claim a testnet placeholder token
as a demonstration of the on-chain claim mechanic.

This is a prototype only. It has no monetary value, no live financial
product, and no relationship to Axiom's production financial infrastructure.

Arbitrum One is and remains Axiom's canonical production chain.
Sui is strictly an evaluation target at this stage.

---

## 3. Strict Scope Boundaries

You are authorized to work on exactly this:

  Testnet claim contract prototype
  Package name: axiom_claim_prototype
  Asset name:   AXIOM_TEST_CLAIM
  Network:      Sui Testnet only
  Language:     Move

You are NOT authorized to work on any of the following:

  - Any mainnet deployment of any kind
  - Any Move package that issues AXUSD, AXAU, AXM, SEED, KAG, or any
    named Axiom production asset
  - Any bridge contract, bridge adapter, or cross-chain message relay
  - Any contract that transfers, locks, or references USDC, ETH, WBTC,
    PAXG, cbETH, or any other real-value asset
  - Any contract that references Arbitrum, Ethereum, Polygon, Avalanche,
    or any EVM chain state
  - Any yield, interest, staking, or return mechanism
  - Any treasury, reserve, or bank account integration
  - Any KYC/identity contract
  - Any oracle or price feed contract
  - Any NFT contract
  - Any governance contract
  - Any secondary or deployment of the prototype to mainnet

If the scope is unclear, stop and ask before writing code.

---

## 4. Required Reading — Source Documents

Before writing any Move code, you must read these documents in full:

  documents/chains/AXIOM_SUI_CLAIM_CONTRACT_SPEC.md
    — The authoritative specification for the claim contract.
      All Move code must conform to this spec.

  documents/chains/AXIOM_SUI_PHASE6_TESTNET_AUTHORIZATION.md
    — The signed authorization allowing Phase 6 testnet work to begin.
      Do not write code until this document is signed.

  documents/chains/AXIOM_SUI_MOVE_REVIEW_CHECKLIST.md
    — The review checklist your reviewer will use.
      Write your Move code to satisfy every item.

  documents/chains/AXIOM_SUI_SDK_REVIEW.md
    — Documents the decision to defer @mysten/sui install to Phase 6.
      TypeScript integration is secondary; Move contract is primary.

  documents/chains/AXIOM_SUI_PHASE6_GATE_TRACKER.md
    — Current gate status. Understand which gates are open before you
      begin each sprint.

---

## 5. Claim Contract Spec Summary

The following is a summary only. The spec document is authoritative.

### 5.1 Asset

Name:          AXIOM_TEST_CLAIM
Decimals:      6
Supply model:  Admin-minted against TreasuryCap held by campaign module
Backing:       None — testnet placeholder with no monetary value
Canonical:     No — not a production Axiom asset

### 5.2 Package structure

  sui/packages/axiom_claim_prototype/
    Move.toml
    sources/
      axiom_test_claim.move     — coin definition, TreasuryCap handling
      claim_campaign.move       — campaign object, claim logic
      merkle.move               — merkle proof verification
    tests/
      claim_campaign_tests.move
      merkle_tests.move

### 5.3 Key objects

  AXIOM_TEST_CLAIM   — Coin<T> created by one-time witness pattern
  AdminCap           — Owned object; required for all privileged operations
  ClaimCampaign      — Shared object; holds merkle root, pool, claimed table

### 5.4 Entry functions (claim_campaign.move)

  create_campaign(treasury_cap, merkle_root, ctx)
  fund_campaign(campaign, coins, _admin: &AdminCap)
  claim(campaign, proof, leaf_amount, clock, ctx)
  pause(campaign, _admin: &AdminCap)
  unpause(campaign, _admin: &AdminCap)
  update_merkle_root(campaign, new_root, _admin: &AdminCap)
  close_campaign(campaign, _admin: &AdminCap, ctx)

### 5.5 Sprint approach

Sprint 1 — Simple allowlist (smoke test)
  Replace merkle verification with a simple allowed_addresses table.
  Prove the end-to-end mechanic works before adding complexity.
  Deploy and test Sprint 1 before beginning Sprint 2.

Sprint 2 — Merkle root verification
  Replace allowlist with merkle proof. Reference keccak256-based tree.
  See spec Section 6 for proof structure.

### 5.6 Duplicate claim prevention

Each claimant address must be recorded in the campaign's claimed table.
A second claim attempt from the same address must abort with EAlreadyClaimed.
This is a required security property — do not omit it in Sprint 1 or Sprint 2.

### 5.7 Abort codes

  ENotActive        = 0
  EExpired          = 1
  EAlreadyClaimed   = 2
  EInvalidProof     = 3
  EInsufficientPool = 4
  ECampaignNotPaused = 5

---

## 6. Prohibited Implementations

These patterns are explicitly prohibited in the prototype:

  - Any Coin<T> where T is AXUSD, AXAU, AXM, SEED, or KAG
  - Any import or reference to a bridge protocol
  - Any cross-chain message send or receive
  - Any yield calculation or rate accumulation
  - Any reserve ratio or backing verification
  - Any KYC check or identity reference
  - Any oracle price feed read
  - Any permanent admin address hard-coded in contract storage
    (AdminCap must be transferable)
  - Any uncapped minting (TreasuryCap must be locked to campaign module)
  - Skipping duplicate claim check in any sprint
  - Any deployment target other than Sui Testnet

---

## 7. Testnet-Only Constraints

  Network:        Sui Testnet ONLY
  Gas:            Funded via https://faucet.testnet.sui.io/
  Deployer:       Address recorded in AXIOM_SUI_PHASE6_TESTNET_AUTHORIZATION.md
  Mainnet:        PROHIBITED — no mainnet deployment until Phase 7 authorization
  Asset value:    None — AXIOM_TEST_CLAIM has no monetary value
  Redemption:     Not applicable — testnet token is not redeemable
  Production use: Not applicable — prototype is not connected to any
                  production system (Arbitrum, Polygon, Avalanche, banking)

---

## 8. Expected Package Structure

After Sprint 2 the repository should contain:

  sui/
    README.md                           ← exists (scaffold)
    packages/
      axiom_claim_prototype/
        Move.toml
        sources/
          axiom_test_claim.move
          claim_campaign.move
          merkle.move
        tests/
          claim_campaign_tests.move
          merkle_tests.move

No other directories or files should be added to sui/ without authorization.
Do not add a build tooling configuration (e.g. suibase.toml) without first
discussing with the Axiom engineering team.

---

## 9. Required Move Unit Tests

All 10 tests must pass before the security review gate (G07) is opened.

  test_claim_success
    Eligible address with valid proof (or allowlist in Sprint 1) claims
    successfully. Asserts correct amount transferred to claimant.

  test_claim_duplicate_rejected
    Same address claims twice. Second call aborts with EAlreadyClaimed.

  test_claim_paused_campaign
    Campaign is paused. Claim attempt aborts with ENotActive.

  test_campaign_fund_and_pool_decreases
    Fund campaign. Claim reduces pool balance by claimed amount.

  test_pause_unpause
    Pause campaign, verify claim rejected. Unpause, verify claim succeeds.

  test_close_campaign
    Close campaign. All subsequent claims abort with ENotActive.
    Remaining pool returned to admin or burned as per spec.

  test_update_merkle_root_sprint2
    Update merkle root with new authorized root. Old proof invalidated.
    New proof validates. (Sprint 2 only — skip in Sprint 1.)

  test_invalid_proof_rejected_sprint2
    Tampered or wrong proof aborts with EInvalidProof.
    (Sprint 2 only — skip in Sprint 1.)

  test_insufficient_pool
    Claim when pool is empty or has insufficient balance.
    Aborts with EInsufficientPool.

  test_admin_cap_required
    Calling fund / pause / unpause / close without AdminCap aborts.

---

## 10. Security Review Checklist Reference

Your reviewer will use documents/chains/AXIOM_SUI_MOVE_REVIEW_CHECKLIST.md.
Write your code to satisfy every item before submitting for review.
Do not request review until all 10 unit tests pass.

---

## 11. Delivery Expectations

Sprint 1 deliverable:
  - claim_campaign.move (allowlist variant)
  - axiom_test_claim.move (coin definition)
  - claim_campaign_tests.move (Sprint 1 tests)
  - Testnet deployment transaction digest
  - End-to-end claim test: one wallet successfully claims

Sprint 2 deliverable:
  - merkle.move (keccak256 merkle verification)
  - Updated claim_campaign.move (merkle variant)
  - Updated tests (all 10 passing)
  - Second testnet deployment transaction digest
  - Security review requested via G07 gate

Post-review deliverable:
  - Addressed findings from reviewer checklist
  - G08 post-testnet report drafted in collaboration with Axiom engineering

---

## 12. Communication Protocol

  Questions about scope or spec:  Engineering lead — do not guess
  Testnet wallet and faucet:       Engineering lead provides credentials
  Security review scheduling:     Engineering lead coordinates
  Any deviation from this packet: Stop and ask before implementing

Do not commit Move code to the main branch without prior authorization.
Do not share private keys, wallet mnemonics, or credentials in any document,
code file, or commit message.

---

*End of Move Developer Onboarding Packet*
