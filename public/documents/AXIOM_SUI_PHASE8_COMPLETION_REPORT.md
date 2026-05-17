# Axiom Protocol — Sui Phase 8 Completion Report
## Move Contract Hardening, Test Suite, Proof Toolchain, API, Claim UI

**Date:** 2026-05-17  
**Status:** COMPLETE  
**Build:** TypeScript — PASS (0 errors in Sui modules)  
**Move tests:** 42 / 42 PASS

---

## Summary

Phase 8 delivered a production-grade Sui claim campaign system with:
- Move contract hardening across 7 security controls (A1–A7)
- 42 unit tests covering all controls and edge cases
- Full TypeScript proof toolchain for off-chain Merkle operations
- Read-only API backend (4 endpoints)
- Claim UI for end users
- Operator dashboard for campaign lifecycle management
- 3 operator-confidential security/key management documents

---

## Deliverables by Task

### T001 — Sui CLI Installation
**Status:** RESOLVED via binary download  
**Method:** Pre-built binary from MystenLabs GitHub releases  
`testnet-v1.72.1-ubuntu-x86_64.tgz` → `/tmp/sui` (v1.72.1-94ad8ccd0ed6)  
**Note:** `nixpkgs.sui` attribute does not exist in current nixpkgs channel.
Binary installed to `/tmp/sui` for test execution. For persistent installs,
add to PATH or copy to `/usr/local/bin`.

---

### T002 — Move Contract Hardening
**Status:** COMPLETE — all A1–A7 applied

| Control | Module | Description |
|---|---|---|
| A1 | merkle.move | MAX_PROOF_DEPTH = 20; EProofTooDeep abort |
| A2 | claim_campaign.move | is_closed permanent flag; all mutation fns check it |
| A3 | claim_campaign.move | AdminCapDestroyed / AdminCapTransferred events |
| A4 | guarded_treasury.move + axiom_test_claim.move | TreasuryCap wrapped at init; never loose |
| A5 | guarded_treasury.move | minted + amount <= max_supply on every mint |
| A6 | deployment procedure | No UpgradeCap retained post-publish |
| A7 | claim_campaign.move + guarded_treasury.move | 8 auditable events |

**Files:**
- `move/axiom_sui/sources/claim_campaign.move`
- `move/axiom_sui/sources/guarded_treasury.move`
- `move/axiom_sui/sources/axiom_test_claim.move`
- `move/axiom_sui/sources/merkle.move`

---

### T003 — Test Suite Expansion
**Status:** COMPLETE — 42 tests, target was >=28

| File | Tests | Coverage |
|---|---|---|
| claim_campaign_tests.move | 31 | A2, A3, A4, A5, claim flow, double-claim, state machine |
| merkle_tests.move | 11 | A1 depth guard, leaf/proof/root validation, 3-leaf tree |
| **Total** | **42** | |

**Test result:** `OK. Total tests: 42; passed: 42; failed: 0`

**Bugs caught and fixed during test run:**
1. Argument order `(amount, proof)` vs `(proof, amount)` mismatch at test line 882 — fixed
2. Deprecated `vector::empty<vector<u8>>()` → `vector[]` literal — fixed
3. Unused `mut` on `campaign` binding in `create()` — fixed
4. `#[allow(deprecated_usage)]` added to suppress `coin::create_currency` warning
   (API is deprecated in favor of `coin_registry::new_currency_with_otw` but
   `coin_registry` is not yet stable in the framework version pinned)

---

### T004 — TypeScript Proof Toolchain
**Status:** COMPLETE (pre-existing)

| File | Purpose |
|---|---|
| lib/sui/client.ts | SuiJsonRpcClient — getObject, queryEvents, getOwnedObjects |
| lib/sui/campaignRegistry.ts | fetchActiveCampaigns, checkClaimStatus |
| lib/sui/proofs/buildMerkleTree.ts | computeLeaf (keccak256), deterministic tree construction |
| lib/sui/proofs/generateProof.ts | generateProof, generateProofFromEntries |
| lib/sui/proofs/verifyProofLocal.ts | Client-side proof verification, MAX_PROOF_DEPTH=20 |
| lib/sui/proofs/validateEligibilityCsv.ts | CSV validation, address normalization, duplicate check |
| lib/sui/proofs/serializeProof.ts | proofToTransactionArgs, rootToTransactionArg |
| lib/sui/proofs/index.ts | Barrel export |

Leaf encoding is canonical: `keccak256(BCS(addr)[32] || BCS(amount_u64)[8 LE])`  
Tree pairing: `keccak256(lex_min(a,b) || lex_max(a,b))` — matches Move exactly.

---

### T005 — API Backend
**Status:** COMPLETE (pre-existing)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| /api/sui/campaigns | GET | None | List active campaigns from on-chain registry |
| /api/sui/campaigns/[id] | GET | None | Campaign detail by object ID |
| /api/sui/eligibility | GET/POST | None | Proof generation from CSV + local verification |
| /api/sui/claim-status | GET | None | On-chain claim status for address + campaign |

All endpoints are read-only. No private keys in API layer.

---

### T006 — Claim UI + Operator Dashboard
**Status:** COMPLETE (pre-existing)

**pages/sui/claim.tsx** — End-user 4-step claim flow:
1. Connect Sui wallet (dynamic import, avoids SSR issues)
2. Load campaign + check eligibility on-chain
3. Paste CSV → generate Merkle proof locally
4. Submit claim transaction via wallet

**pages/operator/chains/sui-phase8.tsx** — Operator dashboard:
- Navi Protocol lending market intelligence
- Aftermath Finance liquidity pool data
- Campaign list + migration tracker (AXOOM Genesis label fix)
- CSV Auditor (validate eligibility file, pre-compute Merkle root)
- CLI reference for close_campaign, create_campaign_entry, fund_campaign

---

### T007 — Security Documents
**Status:** COMPLETE — 3 documents created

| Document | Path |
|---|---|
| Security Review (A1–A7) | public/documents/AXIOM_SUI_PHASE8_SECURITY_REVIEW.md |
| Key Management | public/documents/AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md |
| Authorization Model | public/documents/AXIOM_SUI_PHASE8_AUTHORIZATION.md |

---

### T008 — sui move test
**Status:** COMPLETE — all 42 tests pass

```
Test result: OK. Total tests: 42; passed: 42; failed: 0
```

CLI: `/tmp/sui` (v1.72.1-94ad8ccd0ed6)  
Framework: `testnet-v1.72.1` (from Move.toml)

---

### T009 — Build Validation
**Status:** PASS

- `npx tsc --noEmit` — 0 errors in Sui-related modules
  (pre-existing unrelated errors in `app/field-intelligence/` excluded)
- `sui move build` — PASS (1 suppressed deprecation warning)
- `sui move test` — 42/42 PASS

---

## Environment Variables Required for Deployment

These must be set before deploying campaigns on testnet or mainnet:

| Variable | Description |
|---|---|
| AXIOM_SUI_NETWORK | mainnet / testnet / devnet |
| AXIOM_SUI_PACKAGE_ID | Package object ID post-publish |
| AXIOM_SUI_ADMIN_CAP_ID | AdminCap object ID (operator-confidential) |
| AXIOM_SUI_GUARDED_TREASURY_ID | GuardedTreasury object ID (operator-confidential) |
| NEXT_PUBLIC_AXIOM_SUI_NETWORK | Exposed to browser (mainnet / testnet) |
| NEXT_PUBLIC_AXIOM_SUI_PACKAGE_ID | Exposed to browser for explorer links |

---

## Known Limitations / Next Steps

1. `UpgradeCap` destruction (A6) is a deployment procedure step, not enforced
   in Move source — requires operator discipline and post-deploy checklist.

2. `coin::create_currency` is deprecated in the current Sui framework version.
   Migration to `coin_registry::new_currency_with_otw` is tracked as a
   follow-up once the API stabilizes.

3. An independent Move security audit (OtterSec, Zellic, or Trail of Bits)
   is recommended before mainnet deployment at scale.

4. Event indexing infrastructure (off-chain event listener writing to
   `treasury_vault_events` or a dedicated Sui events table) is not yet
   implemented — recommended before production launch.

---

*Axiom Protocol Engineering — Phase 8 — 2026-05-17*
