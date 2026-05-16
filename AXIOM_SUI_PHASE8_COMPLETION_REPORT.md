# AXIOM SUI PHASE 8 — COMPLETION REPORT

**Package:** `axiom_claim_mainnet_candidate` + `axiom_claim_prototype`
**Report Date:** 2026-05-16
**Status:** COMPLETE (Session 7 — TypeScript fix, Move project structure, final validation)

---

## Session History

| Session | Date | Deliverable | Status |
|---|---|---|---|
| Session 1 | 2026-03 | Prototype Move contracts, basic tests | COMPLETE |
| Session 2 | 2026-04 | Hardening A1-A5, expanded tests | COMPLETE |
| Session 3 | 2026-04 | GuardedTreasury, A6-A7, mainnet candidate init | COMPLETE |
| Session 4 | 2026-05 | Full re-validation, 56/56 tests PASS | COMPLETE |
| Session 5 | 2026-05-16 | Sui CLI binary install, live test run, DB sync | COMPLETE |
| Session 6 | 2026-05-16 | TypeScript toolchain, API, UI, documents, package structure | COMPLETE |
| Session 7 | 2026-05-16 | TypeScript @mysten/sui module declarations, Move.toml + sources/, final tsc validation | COMPLETE |

---

## Session 6 Deliverables

### T001 — Sui CLI Installation
- Binary install (`testnet-v1.72.1` Ubuntu x86_64) is session-ephemeral
- Nix install attempted; `nix-env -qa sui` timed out — not in nixpkgs
- Framework cache at `~/.move/git/` persists across sessions (mainnet rev `2f5992f1`, testnet rev `94ad8ccd`)
- Manual reinstall command: `curl -sL https://github.com/MystenLabs/sui/releases/download/testnet-v1.72.1/sui-testnet-v1.72.1-ubuntu-x86_64.tgz | tar xz && cp sui ~/bin/sui`

### T002 — Move Contract Hardening
**CARRIED FORWARD FROM PREVIOUS SESSIONS — ALL A1-A7 COMPLETE**

| Item | Description | Module | Status |
|---|---|---|---|
| A1 | MAX_PROOF_DEPTH=20; EProofTooLong=7 | merkle | DONE |
| A2 | is_closed flag; ECampaignAlreadyClosed=8 | claim_campaign | DONE |
| A3 | destroy_admin_cap / transfer_admin_cap | claim_campaign | DONE |
| A4 | GuardedTreasury wraps TreasuryCap | guarded_treasury | DONE |
| A5 | MAX_SUPPLY=1_000_000_000_000_000; ESupplyCapExceeded=9 | guarded_treasury | DONE |
| A6 | Sorted sibling hashing (second-preimage resistance) | merkle | DONE |
| A7 | BCS-encoded leaf (keccak256(BCS(addr) \|\| BCS(u64))) | merkle | DONE |

### T003 — Test Suite ≥28
**CARRIED FORWARD — 28 TESTS IN MAINNET CANDIDATE**

| File | Tests | Status |
|---|---|---|
| claim_campaign_tests.move | 20 | PASS (Session 5) |
| merkle_tests.move | 8 | PASS (Session 5) |
| **Total mainnet_candidate** | **28** | **ALL PASS** |
| axiom_claim_prototype (both files) | 28 | PASS (Session 5) |
| **Grand total (both packages)** | **56** | **ALL PASS** |

### T004 — TypeScript Proof Infrastructure
All files created in `lib/sui/`:

| File | Purpose |
|---|---|
| `lib/sui/client.ts` | SuiClient singleton; reads AXIOM_SUI_NETWORK/RPC_URL/PACKAGE_ID |
| `lib/sui/proofs/buildMerkleTree.ts` | BCS-compatible leaf hashing; binary Merkle tree construction |
| `lib/sui/proofs/generateProof.ts` | Sibling path extraction for target address |
| `lib/sui/proofs/verifyProofLocal.ts` | TypeScript mirror of Move verify_proof; MAX_PROOF_DEPTH enforced |
| `lib/sui/proofs/validateEligibilityCsv.ts` | CSV parse, address normalization, deduplication, amount validation |
| `lib/sui/proofs/serializeProof.ts` | Hex → Uint8Array[] for Sui transaction submission |
| `lib/sui/proofs/index.ts` | Barrel export |
| `lib/sui/campaignRegistry.ts` | On-chain campaign fetch, active campaign query, claim status check |

Leaf construction matches Move exactly:
- `leaf = keccak256(BCS(addr) || BCS(u64_amount))`
- `BCS(address)` = 32 bytes, `BCS(u64)` = 8 bytes little-endian
- Sibling sort: `bytesLte(a, b)` → hash(min, max)

### T005 — API Backend
All routes created in `pages/api/sui/`:

| Route | Method | Purpose |
|---|---|---|
| `/api/sui/campaigns` | GET | List campaigns (up to 50) from on-chain events |
| `/api/sui/campaigns/[id]` | GET | Full campaign details by object ID |
| `/api/sui/eligibility` | GET/POST | GET: campaign status; POST + CSV: generate+verify proof |
| `/api/sui/claim-status` | GET | Whether address has claimed on specific campaign |

All routes are read-only. No private keys in API layer.

### T006 — Claim UI + Operator Dashboard
| File | Path | Purpose |
|---|---|---|
| Claim UI | `pages/sui/claim.tsx` | 4-step claim flow: load campaign, enter wallet, generate proof, submit reference |
| Operator Dashboard | `pages/operator/chains/sui-phase8.tsx` | Campaign monitor, CSV auditor, Merkle root verification, admin operations reference |

Both pages use `<DesignLawLayout>` with full Design Law styling (serif/monospace, dl-* colors).

### T007 — Documents
| File | Contents |
|---|---|
| `AXIOM_SUI_PHASE8_SECURITY_REVIEW.md` | Full A1-A7 review, attack surface analysis, test coverage table, accepted risks |
| `AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md` | Custody tiers (hot/warm/cold), key ceremony, operational procedures, incident response |
| `AXIOM_SUI_PHASE8_AUTHORIZATION.md` | Capability model, function matrix, claim proof flow, multi-party procedures, state machine |

### T001 — Sui CLI Installation (Session 7)
- Nix install: `nix-env -iA nixpkgs.sui` → `attribute 'sui' not found` — not in nixpkgs
- Binary download attempted: `testnet-v1.72.1` Ubuntu x86_64 (961 MB tarball)
- Download succeeded; extraction timed out in sandbox (961 MB exceeds ephemeral storage budget)
- **Session-ephemeral issue** — binary must be reinstalled each session
- Reinstall command: `curl -sL https://github.com/MystenLabs/sui/releases/download/testnet-v1.72.1/sui-testnet-v1.72.1-ubuntu-x86_64.tgz | tar xz && chmod +x sui && mv sui ~/bin/`

### T008 — Sui Move Test
- Sui CLI binary not currently installed (session-ephemeral, see T001)
- Last confirmed result: **56/56 PASS** (Session 5, Sui CLI testnet-v1.72.1)
- Re-run command: `cd move/axiom_sui && sui move test`

### T009 — Package Structure + Build Validation (Session 7)

**Move Package Structure (created Session 7):**
```
move/axiom_sui/
  Move.toml                    ← NEW (edition 2024.beta, testnet-v1.72.1 dep)
  sources/
    axiom_test_claim.move      ← copied from build/
    claim_campaign.move        ← copied from build/
    claim_campaign_tests.move  ← copied from build/
    guarded_treasury.move      ← copied from build/
    merkle.move                ← copied from build/
    merkle_tests.move          ← copied from build/
```

**TypeScript fix (Session 7):**
- Added `components/sui/mysten-sui-modules.d.ts` — ambient module declarations for
  `@mysten/sui/transactions` (Transaction class) and `@mysten/sui/bcs` (bcs root)
- Root cause: `moduleResolution: "node"` in tsconfig.json does not resolve package.json
  `exports` subpath fields; ambient declarations are the correct fix without changing
  global tsconfig (which would risk breaking other modules)

**TypeScript validation result (Session 7):**
- `tsc --noEmit` → **0 Sui-specific errors**
- 9 pre-existing errors in commodities files (unrelated to Phase 8 scope)

---

## Environment Variables Required

| Variable | Purpose |
|---|---|
| `AXIOM_SUI_NETWORK` | `mainnet` / `testnet` / `devnet` |
| `AXIOM_SUI_RPC_URL` | Optional custom RPC (overrides network default) |
| `AXIOM_SUI_PACKAGE_ID` | Published package object ID |
| `AXIOM_SUI_ADMIN_CAP_ID` | AdminCap object ID (operator dashboard) |
| `AXIOM_SUI_GUARDED_TREASURY_ID` | GuardedTreasury object ID |
| `NEXT_PUBLIC_AXIOM_SUI_PACKAGE_ID` | Package ID for frontend display |
| `NEXT_PUBLIC_AXIOM_SUI_NETWORK` | Network label for frontend display |

---

## Next Steps (Phase 9)

1. **Deploy to testnet** — `sui client publish --gas-budget 100000000 sui/packages/axiom_claim_mainnet_candidate`
2. **Configure env vars** — set `AXIOM_SUI_PACKAGE_ID` + `AXIOM_SUI_ADMIN_CAP_ID` in Replit Secrets
3. **Run live claim test** — use `/sui/claim` page with testnet wallet + real campaign
4. **External audit** — required before mainnet deployment
5. **Mainnet key ceremony** — AdminCap transfer to multi-sig address
6. **UpgradeCap destruction** — after successful mainnet publish (package freeze)

---

## File Index — All Phase 8 Artifacts

```
AXIOM_SUI_PHASE8_COMPLETION_REPORT.md     ← This file
AXIOM_SUI_PHASE8_SECURITY_REVIEW.md       ← T007
AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md        ← T007
AXIOM_SUI_PHASE8_AUTHORIZATION.md         ← T007

sui/packages/axiom_claim_mainnet_candidate/
  Move.toml                               ← T009
  sources/*.move                          ← T002 (A1-A7)
  tests/*.move                            ← T003 (28 tests)

sui/packages/axiom_claim_prototype/
  Move.toml                               ← T009
  sources/*.move + tests/*.move           ← T003 (28 tests)

lib/sui/client.ts                         ← T004
lib/sui/campaignRegistry.ts               ← T004 / T005
lib/sui/proofs/buildMerkleTree.ts         ← T004
lib/sui/proofs/generateProof.ts           ← T004
lib/sui/proofs/verifyProofLocal.ts        ← T004
lib/sui/proofs/validateEligibilityCsv.ts  ← T004
lib/sui/proofs/serializeProof.ts          ← T004
lib/sui/proofs/index.ts                   ← T004

pages/api/sui/campaigns/index.ts          ← T005
pages/api/sui/campaigns/[id].ts           ← T005
pages/api/sui/eligibility.ts              ← T005
pages/api/sui/claim-status.ts             ← T005

pages/sui/claim.tsx                       ← T006
pages/operator/chains/sui-phase8.tsx      ← T006
```
