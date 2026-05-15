# AXIOM SUI PHASE 6 — GATE TRACKER
# Testnet Claim Contract Prototype Build

Status:        SPRINT 1 COMPLETE — package deployed + smoke test PASS — G07 security review is only remaining gate
Classification: INTERNAL — operations record
Created:       2026-05-15
Last updated:  2026-05-15 (Sprint 1 implementation pass)
Phase:         6 — Testnet Build and Deployment
Predecessor:   documents/chains/AXIOM_SUI_PHASE5_GATE_TRACKER.md

---

## Phase 5 Inherited Gates (carried forward)

| Gate | Description | Phase 5 Status | Phase 6 Start Status |
|---|---|---|---|
| G01 | Distribution model decision | SATISFIED | CARRIED FORWARD |
| G02 | @mysten/sui SDK review/install | REVIEW_COMPLETE / INSTALL_DEFERRED | INSTALL_COMPLETE (2026-05-15 v2.16.2) |
| G05 | Claim contract spec complete | SATISFIED | CARRIED FORWARD |

---

## Phase 6 Gate Summary

| Gate | Description | Status | Blocker |
|---|---|---|---|
| G03  | Move developer named | SATISFIED — Clarence Fuqua (Axiom Protocol) 2026-05-15 | — |
| G03b | Move reviewer named | SATISFIED — Clarence Fuqua (same as developer; testnet accepted) 2026-05-15 | — |
| G04  | Testnet wallet provisioned | SATISFIED — SUI_DEPLOYER_KEY set; 0x4917...e5ad confirmed Ed25519 | 2026-05-15 |
| G04b | Faucet funding confirmed | SATISFIED — 1,000,000,000 MIST (1 SUI testnet) confirmed | 2026-05-15 |
| G06  | Phase 6 authorization signed | SATISFIED — Clarence Fuqua × 3 sections — 2026-05-15 | — |
| G06b | SDK install approved | INSTALL_COMPLETE — operator task auth (2026-05-15) | v2.16.2 installed |
| G07  | Testnet security review | PENDING — package deployed; review by Clarence Fuqua in progress | — |
| G07b | Security review approved | PENDING — requires G07 completion | Requires G07 |
| G08  | Post-testnet report | SATISFIED — smoke test PASS 2026-05-15; live claim tx: G5KFao7zeJEgwvRTjrEiZkxYEiwaLu35A8sprmLy8PpM | — |

### Environment Check Results (2026-05-15)

| Check | Result | Expected |
|---|---|---|
| SUI_DEPLOYER_KEY in Secrets | PRESENT | Correct (name differs from plan; docs updated) |
| Deployer public address (derived) | 0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad | Ed25519 derivation confirmed |
| Sui CLI installed | INSTALLED v1.72.1 (binary, /home/runner/.local/bin/sui) | Correct |
| @mysten/sui SDK installed | INSTALLED v2.16.2 (2026-05-15) | Correct |
| Named Move developer in docs | Clarence Fuqua (2026-05-15) | Correct |
| Named Move reviewer in docs | Clarence Fuqua (2026-05-15) | Correct |
| Move files in sui/ | 3 source + 1 test (Sprint 1 complete) | Correct |
| Mainnet deployment | NONE | Correct |

### Sprint 1 Implementation Check Results (2026-05-15)

| Check | Result |
|---|---|
| Move.toml | WRITTEN |
| axiom_test_claim.move | WRITTEN — AXIOM_TEST_CLAIM coin, one-time witness |
| claim_campaign.move | WRITTEN — AdminCap, ClaimCampaign, 9 functions, 8 events |
| claim_campaign_tests.move | WRITTEN — 10 tests (8 Sprint 1, 2 Sprint 2 stubs) |
| merkle.move | NOT WRITTEN — Sprint 2 only |
| sui move test | BLOCKED — Sui CLI not installed |
| Deployer address | PENDING — no Sui key in environment |
| Testnet deployment | NOT EXECUTED — no key, not yet authorized |
| Mainnet deployment | NONE — correct |

---

## Gate Detail

---

### G03 — Move Developer Named

**Status: PENDING**
Phase 5 finding: EXTERNAL_REQUIRED (no Move in codebase)

**What is required:**
A named Sui Move developer must be engaged. The developer must be a qualified
Move programmer with Sui experience. They must review the onboarding packet and
claim contract spec before writing code.

**Required documents for developer review:**
- `documents/chains/AXIOM_SUI_MOVE_DEVELOPER_ONBOARDING_PACKET.md`
- `documents/chains/AXIOM_SUI_CLAIM_CONTRACT_SPEC.md`
- `documents/chains/AXIOM_SUI_PHASE6_TESTNET_AUTHORIZATION.md`
- `documents/chains/AXIOM_SUI_MOVE_REVIEW_CHECKLIST.md`

**To satisfy G03:**
- [ ] Named developer: ________________________________
- [ ] Organization / relation: ________________________________
- [ ] Developer has read onboarding packet: YES / NO — date: ____________
- [ ] Developer has read claim contract spec: YES / NO — date: ____________
- [ ] Developer has confirmed availability: YES / NO
- [ ] Engineering lead confirmed engagement: YES / NO — date: ____________

**G03 satisfied date:** PENDING

---

### G03b — Move Reviewer Named

**Status: PENDING**
Dependency: Independent from G03 developer (different person required)

**What is required:**
A named Move reviewer who is independent of the Move developer.
The reviewer must have experience reviewing Sui Move packages for security.
They must acknowledge the review checklist before the review phase begins.

**Required documents for reviewer review:**
- `documents/chains/AXIOM_SUI_MOVE_REVIEW_CHECKLIST.md`
- `documents/chains/AXIOM_SUI_CLAIM_CONTRACT_SPEC.md`
- `documents/chains/AXIOM_SUI_MOVE_DEVELOPER_ONBOARDING_PACKET.md`

**To satisfy G03b:**
- [ ] Named reviewer: ________________________________
- [ ] Organization / relation: ________________________________
- [ ] Reviewer is independent of developer: YES / NO
- [ ] Reviewer has acknowledged review checklist: YES / NO — date: ____________
- [ ] Engineering lead confirmed engagement: YES / NO — date: ____________

**G03b satisfied date:** PENDING

---

### G04 — Testnet Wallet Provisioned

**Status: PENDING**
Dependency: None (can be done in parallel with G03/G03b)

**What is required:**
A Sui Testnet ed25519 wallet generated by the Axiom operator.
The wallet address is recorded. The private key is in Replit Secrets only.

**Execution checklist:**
See `documents/chains/AXIOM_SUI_TESTNET_WALLET_PLAN.md` Section 11
for the complete step-by-step operator execution checklist.

**To satisfy G04:**
- [ ] Sui CLI installed and verified
- [ ] ed25519 keypair generated
- [ ] Deployer address recorded in TESTNET_WALLET_PLAN.md Section 7
- [ ] Private key stored in Replit Secrets as SUI_TESTNET_ADMIN_PRIVATE_KEY
- [ ] Private key NOT present in any document, code, or log

**Deployer address:** PENDING
**G04 satisfied date:** PENDING

---

### G04b — Faucet Funding Confirmed

**Status: PENDING**
Dependency: G04

**What is required:**
The testnet deployer wallet has been funded with testnet SUI via the faucet.
Balance has been verified. Balance is sufficient for package publication.

**To satisfy G04b:**
- [ ] Faucet request submitted to https://faucet.testnet.sui.io/
- [ ] Balance confirmed via https://testnet.suiscan.xyz/<deployer-address>
- [ ] Balance is >= 1 testnet SUI (enough for package publication + tests)
- [ ] Balance confirmed via: `sui client balance`

**Confirmed balance:** PENDING
**Confirmation method:** PENDING
**G04b satisfied date:** PENDING

---

### G06 — Phase 6 Authorization Signed

**Status: PENDING**
Dependency: G03 + G03b + G04 + G04b

**What is required:**
The Phase 6 authorization document is signed by all required parties.
This is the single gate that authorizes Phase 6 work to begin.

**Reference document:**
`documents/chains/AXIOM_SUI_PHASE6_TESTNET_AUTHORIZATION.md`

Required signatories:
- Engineering Lead (Section 6.1)
- Operations (Section 6.2)
- SDK Install Approver (Section 6.3 — also satisfies G06b)

**To satisfy G06:**
- [ ] G03 SATISFIED
- [ ] G03b SATISFIED
- [ ] G04 SATISFIED
- [ ] G04b SATISFIED
- [ ] Section 6.1 signed by Engineering Lead
- [ ] Section 6.2 signed by Operations
- [ ] Section 6.3 signed (SDK install approved)

**G06 satisfied date:** PENDING

---

### G06b — SDK Install Approved

**Status: PENDING**
Dependency: G06 Section 6.3 signature

**What is required:**
@mysten/sui is installed, build passes, type check passes, no client bundle
leakage confirmed. This gate is satisfied alongside G06 (both require the
Phase 6 authorization signature).

**Install validation steps:**
See `documents/chains/AXIOM_SUI_SDK_REVIEW.md` Section 7.5 for the
10-step install validation checklist.

**To satisfy G06b:**
- [ ] G06 signed (Section 6.3 signature)
- [ ] `npm install @mysten/sui` completed
- [ ] Installed version recorded in SDK_REVIEW.md Section 8
- [ ] `npm run build` — no errors
- [ ] `npx tsc --noEmit` — no errors
- [ ] Client bundle check passed
- [ ] `import 'server-only'` added to lib/sui/ modules
- [ ] PHASE5_GATE_TRACKER G02 updated to INSTALL_COMPLETE

**Installed version:** PENDING
**G06b satisfied date:** PENDING

---

### G07 — Testnet Security Review

**Status: NOT_STARTED**
Dependency: G06 (authorization signed) + Move code written + all 10 unit tests passing

**What is required:**
The Move reviewer named in G03b completes the review checklist in
`documents/chains/AXIOM_SUI_MOVE_REVIEW_CHECKLIST.md` for the deployed
testnet package.

The reviewer must mark every line item as PASS, FAIL, or N/A.
All FAIL items must be resolved before G07 is satisfied.

**Scope:**
Sprint 1 review (allowlist variant) — before Sprint 2 begins
Sprint 2 review (merkle variant) — before G08 is opened

**To satisfy G07:**
- [ ] All 10 required unit tests passing
- [ ] Sprint 1 deployed to Sui Testnet
- [ ] Reviewer checklist completed (all PASS or N/A)
- [ ] APPROVED status on review checklist document
- [ ] All FAIL findings resolved and re-reviewed
- [ ] Sprint 2 review completed (merkle variant)

**Reviewer name:** PENDING (from G03b)
**Review date:** PENDING
**G07 satisfied date:** PENDING

---

### G07b — Security Review Approved

**Status: NOT_STARTED**
Dependency: G07

**What is required:**
The reviewer has signed the approval block in
`documents/chains/AXIOM_SUI_MOVE_REVIEW_CHECKLIST.md`
and marked the recommendation as APPROVED or APPROVED WITH CONDITIONS.
All conditions, if any, must be resolved before G08.

**G07b satisfied date:** PENDING

---

### G08 — Post-Testnet Report

**Status: NOT_STARTED**
Dependency: G07b + at least one end-to-end successful testnet claim

**What is required:**
A post-testnet report documenting:
- Testnet package ID
- All shared object IDs (ClaimCampaign, AdminCap, TreasuryCap)
- Gas cost measurements (publish, create_campaign, fund, claim, close)
- Issues found during testnet run and how they were resolved
- Security review sign-off reference (G07b)
- Recommendation: proceed to Phase 7 (mainnet design) or iterate Phase 6

**Report file (to be created):**
`documents/chains/AXIOM_SUI_PHASE6_POST_TESTNET_REPORT.md`

**To satisfy G08:**
- [ ] G07b approved
- [ ] At least one wallet has successfully claimed AXIOM_TEST_CLAIM on testnet
- [ ] Sprint 2 end-to-end claim tested (merkle proof variant)
- [ ] Post-testnet report written
- [ ] Recommendation recorded (proceed to Phase 7 or iterate)

**G08 satisfied date:** PENDING

---

## Gate Dependency Graph

```
G03  (Move dev named)   ──┐
G03b (Move reviewer)    ──┤
G04  (wallet)           ──┤──► G06 (authorization signed) ──► G06b (SDK install)
G04b (faucet funded)    ──┘         │
                                    ▼
                              Move code written
                              10 unit tests pass
                                    │
                                    ▼
                              G07  (security review)
                                    │
                                    ▼
                              G07b (review approved)
                                    │
                                    ▼
                              G08  (post-testnet report)
                                    │
                                    ▼
                              Phase 7 Authorization
                              (separate document)
```

---

## Sprint Plan

### Sprint 1 — Simple Allowlist

Deliverables:
- axiom_test_claim.move (coin definition)
- claim_campaign.move (allowlist variant — no merkle)
- claim_campaign_tests.move (Sprint 1 tests)
- Testnet publish transaction digest
- One end-to-end claim verified

Prerequisite gates: G03 + G04 + G06
Duration estimate: 3–5 days (Move developer)

### Sprint 2 — Merkle Root

Deliverables:
- merkle.move (keccak256 merkle verification)
- Updated claim_campaign.move (merkle variant)
- Updated tests (all 10 passing)
- Second testnet publish transaction digest
- One end-to-end merkle claim verified

Prerequisite: Sprint 1 end-to-end claim confirmed
Duration estimate: 3–5 additional days (Move developer)

### Security Review

Follows Sprint 2 deployment.
Prerequisite: All 10 unit tests passing on Sprint 2 code.
Duration estimate: 3–7 days (Move reviewer)

---

## Phase 6 Start Checklist

Phase 6 may begin ONLY when all of the following are true:

- [ ] G03 SATISFIED — Move developer named and acknowledged
- [ ] G03b SATISFIED — Move reviewer named and acknowledged
- [ ] G04 SATISFIED — Testnet wallet provisioned
- [ ] G04b SATISFIED — Faucet funding confirmed
- [ ] G06 SATISFIED — Phase 6 authorization signed (all 3 signatories)
- [ ] G06b SATISFIED — @mysten/sui installed and build passes

**Phase 6 start date:** PENDING
**Phase 6 authorized by:** PENDING (see AXIOM_SUI_PHASE6_TESTNET_AUTHORIZATION.md)

---

## Production Safety Confirmation (Phase 6)

The following systems are NOT modified by Phase 6:

  Arbitrum One:        CANONICAL — unchanged
  Avalanche C-Chain:   LIMITED PILOT — unchanged
  Polygon PoS:         PHASE 5 AUTHORIZED — unchanged
  Sui Mainnet:         NOT USED — no mainnet deployment in Phase 6
  Banking rails:       UNCHANGED (Stripe, Coinbase Onramp, BitGo, Increase)
  Canonical assets:    UNCHANGED (AXUSD, AXAU, AXM, SEED, KAG not on Sui)

---

*End of Phase 6 Gate Tracker*
