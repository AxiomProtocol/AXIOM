# AXIOM SUI PHASE 8 — COMPLETION REPORT

**Phase:** 8 — Hardened Staging  
**Date:** 2026-05-16  
**Status:** COMPLETE — All 10 workstreams delivered. `sui move test` 28/28 PASS confirmed this session.

---

> **COMMUNITY DISTRIBUTION ONLY.** ATC (AXIOM TEST CLAIM) is a non-financial
> community rewards token. No monetary value. NOT AXUSD, AXAU, AXM, SEED, or KAG.

---

## 1. Summary

Phase 8 hardened the Move contract suite (A1–A7), expanded the test suite to 28
tests (all passing), delivered the full TypeScript proof toolchain, API backend,
claim UI, and operator dashboard. `sui move test` was executed successfully in
this session with the matching `1.72.1-94ad8ccd0ed6` binary — 28/28 PASS, 0
failures.

---

## 2. Deliverables

| ID  | Deliverable | Status | Notes |
|-----|-------------|--------|-------|
| D1  | `claim_campaign.move` — A1–A7 | COMPLETE | MAX_PROOF_DEPTH, is_closed, destroy/transfer AdminCap, GuardedTreasury, 7 events |
| D2  | `guarded_treasury.move` — A4/A5 | COMPLETE | Wraps TreasuryCap; MAX_SUPPLY on every mint; TokensMinted event |
| D3  | `merkle.move` — A1 | COMPLETE | MAX_PROOF_DEPTH = 20; EProofTooDeep abort |
| D4  | `axiom_test_claim.move` — init() | COMPLETE | TreasuryCap wrapped immediately; no loose cap at deploy time |
| D5  | `Move.toml` | COMPLETE | Pinned to `94ad8ccd0ed6` — matches ~/.move git cache; no standalone git clone required |
| D6  | Test suite — 28 tests | COMPLETE | 20 claim_campaign_tests + 8 merkle_tests; all PASS |
| D7  | `sui move test` execution | COMPLETE | **28/28 PASS, 0 failures** — Sui CLI 1.72.1-94ad8ccd0ed6 |
| D8  | `lib/sui/client.ts` | COMPLETE | Testnet + mainnet; packageId per network |
| D9  | `lib/sui/proofs/` suite | COMPLETE | buildMerkleTree, generateProof, verifyProofLocal, validateEligibilityCsv, serializeProof, index |
| D10 | `lib/sui/campaignRegistry.ts` | COMPLETE | Phase 6 archive + Phase 9 mainnet campaign |
| D11 | `lib/sui/types.ts` | COMPLETE | SuiCampaign, EligibilityResult, ClaimStatus |
| D12 | `pages/api/sui/campaigns.ts` | COMPLETE | GET — all campaigns |
| D13 | `pages/api/sui/campaign/[id].ts` | COMPLETE | GET — single campaign by id |
| D14 | `pages/api/sui/eligibility.ts` | COMPLETE | POST — eligibility check with campaign state guards |
| D15 | `pages/api/sui/claim-status.ts` | COMPLETE | GET — on-chain claim status |
| D16 | `pages/sui/claim.tsx` | COMPLETE | Claim UI with testnet disclaimers |
| D17 | `pages/operator/chains/sui-phase8.tsx` | COMPLETE | Read-only operator dashboard; workstream + security tables |
| D18 | `AXIOM_SUI_PHASE8_SECURITY_REVIEW.md` | COMPLETE | A1–A7 findings, residual risk registry, test coverage map |
| D19 | `AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md` | COMPLETE | 2-of-3 multisig custody design |
| D20 | `AXIOM_SUI_PHASE8_AUTHORIZATION.md` | COMPLETE | Delivery authorization + Phase 9 gate conditions (9 items) |

---

## 3. Test Results

```
Test result: OK. Total tests: 28; passed: 28; failed: 0
```

**Binary:** `sui 1.72.1-94ad8ccd0ed6`  
**Framework:** `~/.move/git/https___github_com_MystenLabs_sui_git_94ad8ccd0ed6...` (symlinked)  
**Move.toml rev:** `94ad8ccd0ed6c089a9fe072ff80c918b5ab44943`

**Environment note for reproducibility:** The Sui CLI binary (`sui-testnet-v1.72.1-ubuntu-x86_64.tgz`)
must be downloaded from GitHub Releases (~1 GB). The `~/.move/git/` cache
(~52 MB checked-out working tree at that commit) must be symlinked to
`~/.move/https___github_com_MystenLabs_sui_git_94ad8ccd0ed6...` so the move
package manager resolves from disk without re-cloning.

---

## 4. Security Hardenings Applied

| Code | Hardening | Module |
|------|-----------|--------|
| A1 | `MAX_PROOF_DEPTH = 20` — `EProofTooDeep` abort in `verify_proof` | `merkle.move` |
| A2 | `is_closed` flag — permanent; `unpause()` aborts after close | `claim_campaign.move` |
| A3 | `destroy_admin_cap` + `transfer_admin_cap` emit auditable events | `claim_campaign.move` |
| A4 | No loose `TreasuryCap` — wrapped in `GuardedTreasury` at init | `guarded_treasury.move`, `axiom_test_claim.move` |
| A5 | `MAX_SUPPLY` check on every `mint()` call — `ESupplyCapExceeded` | `guarded_treasury.move` |
| A6 | Package deployed frozen — no upgrade authority retained | deployment policy |
| A7 | 7 auditable on-chain events (CampaignCreated, Paused, Unpaused, Closed, TokensClaimed, AdminCapDestroyed, AdminCapTransferred) + TokensMinted | `claim_campaign.move`, `guarded_treasury.move` |

---

## 5. TypeScript Build Status

- **Phase 8 files:** 0 TypeScript errors
- **Pre-existing errors (not Phase 8 scope):** `app/field-intelligence/sessions/[sessionId]/page.tsx`
  — variable declaration ordering and null-safety issues from a prior release
- **Tool:** `npx tsc --noEmit --skipLibCheck`

---

## 6. Open Blockers for Phase 9 Promotion

| # | Blocker | Owner |
|---|---------|-------|
| B1 | External Move security audit | Engineering Lead |
| B2 | Authorization package — 3 signatures required | Engineering Lead + Operations Lead + Legal/Compliance |
| B3 | 2-of-3 multisig key ceremony | Operations Lead |
| B4 | On-chain proof manifest populated for Phase 9 eligibility list | Engineering Lead |
| B5 | Wallet connect integration (PTB construction + signing flow) | Engineering Lead |
| B6 | Eligibility CSV finalized and validated via `validateEligibilityCsv` | Operations Lead |

---

## 7. Phase 9 Mainnet Campaign (Active)

- **Package:** `0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487`
- **Campaign Object:** `0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982`
- **Publish Tx:** `Hw4xfYPodku9qpJHVZNuWPFj8RkRre9KirBeUUgBEe6c`
- **Network:** Sui Mainnet
- **Status:** `active`
- **AdminCap:** `0x637ce7868be3f24f85968629debbee72490406147ffa756f3324fb5acb945f9a`

---

*Phase 8 Hardened Staging — Axiom Protocol — Community Distribution Layer*  
*NOT AXUSD. NOT AXAU. NOT AXM. NOT SEED. NOT KAG.*
