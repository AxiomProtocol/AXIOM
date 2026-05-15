# Axiom Protocol — Sui Phase 9 Completion Report
**Status:** MAINNET RELEASE CANDIDATE — PUBLISH BLOCKED (gas funding required)
**Date:** 2026-05-15
**Classification:** Internal Operations

---

## 1. Phase 9 Objective

Convert the Phase 8 testnet staging package into a production mainnet release candidate.
Scope: community distribution ONLY — non-financial community rewards token (AMC / AXIOM MAINNET CLAIM).

**Explicitly out of scope:** AXUSD, AXAU, AXM, SEED, KAG, ACH, wires, reserves, financial instruments.

---

## 2. Deliverables Status

| Deliverable | Status | Location |
|---|---|---|
| Mainnet candidate Move package | COMPLETE — 0 build errors | `sui/packages/axiom_claim_mainnet_candidate/` |
| Move test suite (28 tests) | COMPLETE — 28/28 PASS | `tests/merkle_tests.move` + `tests/claim_campaign_tests.move` |
| Governance documents (4) | COMPLETE | `documents/chains/AXIOM_SUI_PHASE9_*.md` |
| Monitoring infrastructure | COMPLETE | `lib/sui/monitoring/` |
| API routes | COMPLETE | `pages/api/sui/`, `pages/api/health/` |
| Claimant UX | COMPLETE | `pages/sui/claim.tsx` + `components/sui/` |
| Operator dashboard | COMPLETE | `pages/operator/chains/sui-phase9.tsx` |
| TypeScript validation | COMPLETE — 0 Sui errors | `tsc --noEmit` |
| **Mainnet package publish** | **BLOCKED — no gas** | See Section 4 |

---

## 3. Move Package

### Package Identity
- **Name:** `axiom_claim_mainnet_candidate`
- **Rev field:** `mainnet` (Move.toml)
- **Upgrade policy:** FROZEN — no UpgradeCap retained on publish
- **Modules:** `axiom_mainnet_claim`, `claim_campaign`, `guarded_treasury`, `merkle`

### Token Identity
- **Name:** AXIOM MAINNET CLAIM
- **Ticker:** AMC
- **Decimals:** 6
- **Supply cap:** 1,000,000,000,000,000 base units (1 billion AMC)
- **Type:** Non-financial community reward. Not redeemable. Not backed by any reserve.

### Build Result
```
sui move build axiom_claim_mainnet_candidate
→ 0 errors
→ Lint warnings: unnecessary `entry` on `public` functions (cosmetic only — entry is retained
  for backward compatibility with wallet-initiated calls)
→ Package compiles cleanly against Sui framework
```

### Test Result
```
sui move test axiom_claim_mainnet_candidate
→ Total tests: 28 | passed: 28 | failed: 0
```

Test coverage:
- 8 merkle tests: single-leaf, multi-leaf, wrong leaf, tampered proof, wrong root,
  deterministic hashing, proof depth enforcement (EProofTooLong), empty proof non-match
- 20 campaign tests: eligible claim, duplicate rejection, non-eligible rejection,
  paused campaign, pause/unpause cycle, insufficient pool, merkle root update,
  active root update abort, close campaign, multi-claimant, proof too long (gas griefing),
  is_closed flag, unpause-after-close abort, destroy AdminCap, transfer AdminCap,
  guarded mint, supply cap exceeded, boundary mint, 4-leaf depth proof, pool accumulation

---

## 4. Mainnet Publish — BLOCKED

### Blocker
The deployer wallet `0xef8fa8ff375159b49a972fd3ad0efb8c9f7784c924d3bef426f1daa1c28fddd5` has **0 SUI**
on Sui Mainnet. A minimum of ~0.05 SUI is required for gas to publish a frozen package.

### Funded Wallet Available
Wallet `0x10c8bad6a245708e560a011493f362b095bbcfaf52e15a18d7d52f0aea8ab154` holds approximately
**1.01 SUI** on mainnet (confirmed via RPC balance check). This wallet is **not** in the local
keystore. The private key for this wallet was not accessible via `DEPLOYER_PRIVATE_KEY` in
either ed25519 or secp256k1 import formats.

### Resolution Options

**Option A (Recommended — fastest):**
Transfer 0.1 SUI from the funded wallet (`0x10c8bad6...`) to the deployer wallet (`0xef8fa8...`)
using any Sui wallet app (Sui Wallet, Martian, etc.). Then execute:
```bash
export PATH="$HOME/.local/bin:$PATH"
sui client switch --env mainnet
sui client publish \
  --gas-budget 500000000 \
  sui/packages/axiom_claim_mainnet_candidate/
```

**Option B:**
Export the private key for `0x10c8bad6...` and update `DEPLOYER_PRIVATE_KEY` secret,
then run:
```bash
sui keytool import "$DEPLOYER_PRIVATE_KEY" ed25519
sui client switch --address 0x10c8bad6a245708e560a011493f362b095bbcfaf52e15a18d7d52f0aea8ab154
sui client switch --env mainnet
sui client publish \
  --gas-budget 500000000 \
  sui/packages/axiom_claim_mainnet_candidate/
```

### Post-Publish Steps
After successful publish, capture the output and update:

1. `lib/sui/client.ts` — set `PACKAGE_IDS.mainnet` to the published package ID
2. `lib/sui/campaignRegistry.ts` — set `packageId` for Phase 9 mainnet campaign
3. Call `create_campaign_entry()` via CLI to create the shared `ClaimCampaign` object
4. Update `campaignObjectId` in `campaignRegistry.ts` with the resulting object ID
5. Upload eligibility CSV and set `merkleRoot` in campaign
6. Activate campaign when ready

---

## 5. TypeScript Infrastructure

### Files Delivered
```
lib/sui/
  types.ts                        — SuiCampaign, EligibilityEntry, ClaimStatus, ProofManifest
  client.ts                       — getSuiClient, getSuiNetwork, getPackageId, isMainnetPackagePublished
  campaignRegistry.ts             — Phase 9 mainnet campaign + Phase 8 testnet archive
  mysten-shims.d.ts               — @mysten/sui/client + @mysten/sui/transactions ambient declarations
  monitoring/
    claimEventPoller.ts           — event polling + anomaly detection
    campaignStatePoller.ts        — object state polling
    rpcHealthCheck.ts             — dual-network health checks (mainnet + testnet)
    index.ts                      — monitoring barrel
  proofs/
    buildMerkleTree.ts            — keccak256 Merkle construction
    generateProof.ts              — proof generation (matches Move verify_proof)
    verifyProofLocal.ts           — local proof verification
    validateEligibilityCsv.ts     — eligibility list validation
    serializeProof.ts             — claim payload serialization
    index.ts                      — proofs barrel

pages/api/sui/
  proof-request.ts                — POST: eligibility check + proof generation
  claim-submit.ts                 — POST: server-side validation gate
pages/api/health/
  sui.ts                          — GET: dual-network RPC health

components/sui/
  useSuiWallet.ts                 — lightweight Sui wallet hook (Wallet Standard + legacy)
  SuiConnectButton.tsx            — wallet connect/disconnect UI
  ClaimCard.tsx                   — claim interaction card with execution flow
  ClaimStatus.tsx                 — tx status display component
  SuiClaimInner.tsx               — client-only claim page inner component

pages/
  sui/claim.tsx                   — Phase 9 claimant UX (dynamic import, SSR-safe)
  operator/chains/sui-phase9.tsx  — Phase 9 operator console dashboard
```

### TypeScript Validation
```
tsc --noEmit
→ 0 Sui-related errors
→ 4 issues patched in this session:
    - ProofResult type extraction in proof-request.ts
    - window as unknown as Record<string,unknown> in SuiClaimInner + useSuiWallet
    - BigInt arithmetic in claimEventPoller (MAX_SUPPLY * 0.1)
    - Redundant type narrowing in ClaimCard
```

---

## 6. Governance Documents

| Document | Purpose |
|---|---|
| `AXIOM_SUI_PHASE9_ACCEPTED_RISK_MEMO.md` | Formal acceptance of operating without external audit + single-wallet custody |
| `AXIOM_SUI_PHASE9_PRODUCTION_AUTHORIZATION.md` | Internal authorization to proceed to mainnet as release candidate |
| `AXIOM_SUI_PHASE9_CUSTODY_EXCEPTION.md` | Single-party custody exception with 30-day multisig migration commitment |
| `AXIOM_SUI_PHASE9_MULTISIG_MIGRATION.md` | Concrete migration plan: single wallet → 2-of-3 multisig within 30 days |

---

## 7. Accepted Risk Summary

| Risk | Severity | Owner | Deadline |
|---|---|---|---|
| No external Move security audit | MEDIUM | Protocol Ops | 60 days post-publish |
| AdminCap held by single wallet | MEDIUM | Protocol Ops | 30 days post-publish |
| Single-party authorization | LOW | Governance | 90 days (scope review) |

Operating authority: accepted under the Production Authorization document.
No canonical financial instruments (AXUSD, AXAU, AXM) are involved.

---

## 8. Claimant UX Flow

1. User navigates to `/sui/claim`
2. Install prompt shown if no Sui wallet extension detected
3. Connect wallet → address auto-populated
4. "Check Eligibility" → calls `POST /api/sui/proof-request`
   - Server verifies campaign active, address in eligibility tree, not already claimed
   - Returns proof (string[]), amountPerClaim, packageId, campaignObjectId
5. If eligible, ClaimCard shows allocation amount and proof depth
6. "Submit Claim" → server validation gate → PTB construction (dynamic import) → wallet signature → submit
7. ClaimStatus shows: building → awaiting_sig → submitted → confirming → success
8. Success screen shows tx digest + Sui Explorer link

**Graceful states handled:**
- No wallet installed: install links shown
- Package not published: informational banner (claim button disabled)
- Already claimed: dedicated message
- Campaign paused / closed: operator message
- Wallet mismatch: clear warning

---

## 9. Operator Dashboard

Location: `/operator/chains/sui-phase9` (authenticated, OperatorConsoleLayout)

Features:
- Accepted risk banners (audit deferred, single-wallet custody)
- Package publish status with exact blocker description
- Custody state (deployer address, key storage, multisig status)
- Campaign registry with live status indicators
- RPC health check (mainnet + testnet, with refresh)
- Accepted risk register table with deadlines
- Incident response checklist
- Governance documents index

---

## 10. Monitoring Infrastructure

### Claim Event Poller (`claimEventPoller.ts`)
- Polls `ClaimExecuted` events from Sui fullnode
- Anomaly detection: rapid drain (>10% MAX_SUPPLY in window), duplicate claim detection
- Configurable window, alert threshold, polling interval

### Campaign State Poller (`campaignStatePoller.ts`)
- Polls `ClaimCampaign` shared object state
- Detects unexpected state changes (is_active, is_closed, pool_value)
- Emits alerts on unauthorized closes or pauses

### RPC Health Check (`rpcHealthCheck.ts`)
- Checks mainnet + testnet fullnode latency and reachability
- Returns HEALTHY / DEGRADED / DOWN per network
- Used by `/api/health/sui` endpoint

---

## 11. Publish Command (execute when gas is funded)

```bash
# From project root, after funding deployer wallet
export PATH="$HOME/.local/bin:$PATH"

# Verify balance first
sui client gas --address 0xef8fa8ff375159b49a972fd3ad0efb8c9f7784c924d3bef426f1daa1c28fddd5

# Switch to mainnet
sui client switch --env mainnet

# Publish (frozen — no UpgradeCap)
sui client publish \
  --gas-budget 500000000 \
  sui/packages/axiom_claim_mainnet_candidate/

# Record: PackageID + ClaimCampaign ObjectID from publish output
# Then update:
#   lib/sui/client.ts → PACKAGE_IDS.mainnet
#   lib/sui/campaignRegistry.ts → packageId + campaignObjectId
```

---

## 12. Phase 10 Prerequisites

Before Phase 10 work begins:
- [ ] Mainnet package published (requires gas funding — see Section 4)
- [ ] PackageID updated in `client.ts` + `campaignRegistry.ts`
- [ ] Eligibility CSV uploaded and merkleRoot set in campaign
- [ ] Campaign activated by operator
- [ ] External Move security audit engaged (60-day window)
- [ ] AdminCap transferred to 2-of-3 multisig (30-day window)
- [ ] At least one successful end-to-end claim test on mainnet

---

*Report generated: 2026-05-15 | Phase 9 Mainnet Release Candidate | Axiom Protocol*
*Community distribution only — NOT AXUSD, AXAU, AXM, SEED, or KAG*
