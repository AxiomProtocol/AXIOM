# AXIOM SUI PHASE 5 — GATE TRACKER

**Document type:** Phase Gate Tracker  
**Phase:** Phase 5 — Testnet Claim Contract Prototype Design  
**Chain:** Sui (non-EVM, Move VM)  
**Date:** 2026-05-15  
**Classification:** Internal — operations record  

---

## Gate Summary

| Gate | Description | Status | Satisfied By |
|---|---|---|---|
| G01 | Distribution model decision | **SATISFIED** | Option B (Claim Contract) selected |
| G02 | @mysten/sui SDK review/install | **REVIEW_COMPLETE / INSTALL_DEFERRED** | SDK review doc complete; install deferred to Phase 6 |
| G03 | Move language capability confirmed | **EXTERNAL_REQUIRED** | No Move expertise in codebase; external dev required |
| G04 | Testnet wallet provisioned | **PENDING** | No wallet generated yet |
| G05 | Claim contract spec complete | **SATISFIED** | AXIOM_SUI_CLAIM_CONTRACT_SPEC.md written |
| G06 | Testnet deployment authorization | **NOT_STARTED** | Requires G03 + G04 + ops sign-off |
| G07 | Testnet security review | **NOT_STARTED** | Requires G06 + Move code written |
| G08 | Post-testnet report | **NOT_STARTED** | Requires G07 + testnet campaign run |

---

## Gate Detail

---

### G01 — Distribution Model Decision

**Status: SATISFIED**  
**Date satisfied:** 2026-05-15  
**Decision:** Option B — Claim Contract (Native Sui, pull model, merkle root)

**Why Option B:**
- Community agency (members pull their own allocation)
- On-chain transparency via merkle root commitment
- Scales to unlimited eligibility list
- No bridge counterparty risk
- Proven pattern with reference implementations

**Option A (direct airdrop) deferred:** Push model, Axiom pays gas, no community agency.  
**Option C (bridge) rejected for Phase 5:** Requires bridge partner agreement and
Arbitrum-side escrow — not appropriate for testnet prototype scope.

**Documents:**
- `documents/chains/AXIOM_SUI_PHASE4_DISTRIBUTION_DESIGN.md` (updated — Section 10)
- `documents/chains/AXIOM_SUI_PHASE5_DECISION_RECORD.md`

---

### G02 — @mysten/sui SDK Review and Install Decision

**Status: REVIEW_COMPLETE / INSTALL_DEFERRED**  
**Review date:** 2026-05-15  
**Install date:** Deferred to Phase 6

**Review findings:**
- Package: `@mysten/sui` (current stable, replaces deprecated `@mysten/sui.js`)
- Compatible with Next.js 14+ and Node.js 18+
- No conflicts with existing Axiom dependencies (ethers.js, viem)
- Must be imported server-side only — no client-side bundle
- NOT needed for Phase 5 design work
- Install command: `npm install @mysten/sui`

**Why deferred:** Phase 5 is design-only. SDK is only needed when TypeScript
integration code is written in Phase 6.

**Document:** `documents/chains/AXIOM_SUI_SDK_REVIEW.md`

**To update G02 to INSTALL_COMPLETE:**
- [ ] Run `npm install @mysten/sui` at Phase 6 start
- [ ] Verify build passes
- [ ] Update this tracker

---

### G03 — Move Language Capability Confirmed

**Status: EXTERNAL_REQUIRED**  
**Assessment date:** 2026-05-15

**Finding:** No Move language capability exists in the Axiom codebase or team.
The repository contains Solidity and TypeScript only. No Move source files,
no Move.toml manifests, no Sui CLI configuration.

**What is required:**
- Minimum 1 qualified Sui Move developer to author the claim package
- Minimum 1 independent Move reviewer (different from author)
- Review of `AXIOM_SUI_CLAIM_CONTRACT_SPEC.md` by the Move developer before coding

**What cannot proceed without G03:**
- Writing `axiom_test_claim.move`
- Writing `claim_campaign.move`
- Writing `merkle.move`
- Any testnet deployment

**Document:** `documents/chains/AXIOM_SUI_MOVE_CAPABILITY_PLAN.md`

**To update G03 to CONFIRMED:**
- [ ] Named Move developer engaged (name/handle recorded here)
- [ ] Developer has reviewed claim contract spec
- [ ] Developer has confirmed availability for Phase 6

---

### G04 — Testnet Wallet Provisioned

**Status: PENDING**  
**Assessment date:** 2026-05-15

**Finding:** No Sui testnet wallet has been generated or funded.

**What is required:**
- Generate ed25519 keypair using Sui CLI or browser wallet
- Record testnet address in `AXIOM_SUI_TESTNET_WALLET_PLAN.md` Section 7
- Store private key in Replit Secrets as `SUI_TESTNET_ADMIN_PRIVATE_KEY`
- Fund address via testnet faucet: https://faucet.testnet.sui.io/

**Document:** `documents/chains/AXIOM_SUI_TESTNET_WALLET_PLAN.md`

**To update G04 to CONFIRMED:**
- [ ] Wallet address recorded in TESTNET_WALLET_PLAN.md Section 7
- [ ] Private key stored in Replit Secrets (not verifiable here — ops confirmation)
- [ ] Testnet SUI balance confirmed via https://testnet.suiscan.xyz/

---

### G05 — Claim Contract Specification Complete

**Status: SATISFIED**  
**Date satisfied:** 2026-05-15

**Specification covers:**
- Package purpose and testnet-only warning
- Placeholder asset: AXIOM_TEST_CLAIM (no monetary value, no canonical asset)
- Move package structure (Move.toml, 3 source files)
- Object model: AXIOM_TEST_CLAIM coin, AdminCap, ClaimCampaign
- Entry functions: create_campaign, fund_campaign, claim, pause, unpause,
  update_merkle_root, close_campaign
- Merkle proof verification design
- Events: ClaimEvent, CampaignFundedEvent, CampaignPausedEvent, CampaignClosedEvent
- Duplicate claim prevention (Table<address, bool>)
- Abort codes and error handling
- Test requirements (10 required unit tests)
- Phased implementation: simple allowlist sprint 1 → merkle root sprint 2

**Document:** `documents/chains/AXIOM_SUI_CLAIM_CONTRACT_SPEC.md`

---

### G06 — Testnet Deployment Authorization

**Status: NOT_STARTED**

**Prerequisite gates:** G03 (Move capability) + G04 (wallet) + Move code written  
**Authorizing party:** Ops team  
**Form:** Signed gate document (to be created at Phase 6)

**What this gate covers:**
- Confirmation that Move package is written and internally reviewed
- Confirmation that Sui CLI is installed and deployer wallet is funded
- Authorization to run `sui client publish` on Sui Testnet
- Confirmation of testnet RPC configuration

---

### G07 — Testnet Security Review

**Status: NOT_STARTED**

**Prerequisite:** G06 + testnet deployment live  
**Reviewer:** External Move auditor (different from Move author)  
**Scope:**
- Merkle verification logic audit
- Balance handling and overflow checks
- AdminCap privilege boundary review
- Event emission completeness
- Abort path coverage

---

### G08 — Post-Testnet Report

**Status: NOT_STARTED**

**Prerequisite:** G07 + testnet campaign run (at least one end-to-end claim)  
**Contents:**
- Testnet package ID and object IDs
- Gas cost measurements
- Any issues found during testnet run
- Recommendation: proceed to Phase 7 (mainnet) or iterate on Phase 6
- Security review sign-off reference

---

## Gate Progression Summary

```
Phase 5 (Design)     Phase 6 (Testnet Build)    Phase 7 (Mainnet)
─────────────────    ───────────────────────    ─────────────────
G01 SATISFIED   ──►  G03 CONFIRMED (engage dev)  G09+ (future)
G02 DEFERRED    ──►  G02 INSTALL_COMPLETE
G05 SATISFIED   ──►  G04 CONFIRMED (wallet)
                     G06 AUTHORIZED (deploy)
                     G07 REVIEWED (security)
                     G08 REPORTED (post-testnet)
```

---

## Phase 5 Final Status

Phase 5 design is complete. The following are satisfied:
- G01: Distribution model decided (Option B)
- G02: SDK reviewed (install deferred to Phase 6)
- G05: Claim contract specified

The following are pending and block Phase 6:
- G03: External Move developer must be engaged
- G04: Testnet wallet must be provisioned
- G06: Testnet deployment must be authorized

**Phase 6 may not begin until G03, G04, and G06 are all satisfied.**
