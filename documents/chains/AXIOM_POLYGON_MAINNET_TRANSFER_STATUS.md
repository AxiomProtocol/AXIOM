# Axiom Protocol — Polygon Mainnet Transfer Status

**Document type:** Phase F Status Record  
**Phase:** Polygon Phase 5 — First Controlled Mainnet USDC Transfer  
**Created:** 2026-05-15  
**Status:** BLOCKED — Awaiting sender wallet USDC funding

---

## Current Status

```
POLYGON FIRST MAINNET TRANSFER BLOCKED

Blocker: Sender wallet has 0 USDC on Polygon mainnet (chainId 137)
         Wallet: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
         Required: minimum 1 raw unit (0.000001 USDC)

All other gates: PASS (10/11 preflight checks green)
Reconciliation:  CLEAN
No transaction sent. No anomaly. Kill switch available but not triggered.
```

---

## Phase Completion Summary

| Phase | Description | Status |
|---|---|---|
| A — Pre-transfer verification | 11-point preflight check | BLOCKED (1 hard fail: 0 USDC) |
| B — Baseline reconciliation | On-chain + DB state recorded | COMPLETE ✓ |
| C — Execute first transfer | Dispatch 0.000001 USDC on mainnet | BLOCKED — not attempted |
| D — Post-transfer verification | txHash, receipt, delta, state | PENDING — awaiting Phase C |
| E — Emergency readiness | Kill switch status | CONFIRMED — ARMED, not triggered |
| F — Status update | This document | COMPLETE ✓ |
| G — Validation | Reconciliation + cross-chain checks | PARTIAL ✓ (recon CLEAN; no code changed) |

---

## What Is Configured and Ready

| Item | Status |
|---|---|
| `CHAIN_POLYGON_ENABLED=true` | SET ✓ — shared env |
| `POLYGON_ADAPTER_MODE=LIVE` | SET ✓ — shared env |
| `MULTICHAIN_ENABLED=true` | SET ✓ — shared env |
| `POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON` | SET ✓ — shared env |
| `POLYGON_TREASURY_WALLET` | SET ✓ — `0x8d7892…` |
| `POLYGON_RPC_URL` | SET ✓ — Alchemy Polygon mainnet (fixed 2026-05-15) |
| POL gas balance | 97.275095 POL ✓ |
| USDC-POLYGON in cap_assets | ACTIVE ✓ — `ast_LccGNrsj0aMzdef0iJRLpQ` |
| Custody wallet in registry | CONFIGURED ✓ — `13d8e4db-…` |
| Reconciliation baseline | CLEAN ✓ — 0 discrepancy |
| Accepted-risk document | SIGNED ✓ — all 3 roles, 2026-05-15 |

---

## What Is Needed to Unblock

```
Fund wallet 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96 with USDC on
Polygon mainnet (chainId 137).

USDC contract: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359 (native Circle USDC)
Minimum amount: 0.000001 USDC (1 raw unit)
Recommended:    1.000000 USDC (operational headroom)

Once funded, re-run Phase A preflight — all other checks will pass.
Then execute Phase C to dispatch the first controlled mainnet transfer.
```

---

## Emergency Kill Switch

```
Status:  ARMED — available but NOT triggered
Command: Set POLYGON_ADAPTER_MODE=DISABLED in shared environment
Effect:  Immediately blocks all further Polygon dispatches
```

---

## Cross-Chain Safety Confirmation

| Chain | Status |
|---|---|
| Arbitrum One | UNCHANGED — no code or config touched |
| Avalanche (Limited Pilot) | UNCHANGED |
| Sui | NOT TOUCHED |
| ACH / wire rails | NOT TOUCHED |
| AXUSD issuance | Arbitrum-canonical — no Polygon MINT/REDEEM |

---

## Additional Fix Applied This Session

`POLYGON_RPC_URL` was not previously set as a named env var, causing the
reconciliation script to report BLOCKED. Set in shared environment 2026-05-15
using the Alchemy Polygon mainnet endpoint. Reconciliation now returns CLEAN.

---

## Next Action

1. Fund `0x8d7892…` with USDC on Polygon mainnet
2. Re-run: `npx tsx scripts/polygon-production-smoke-check.ts` (full LIVE mode)
3. Execute first transfer via capinfra settlement pipeline
4. Call `externallySettleInstruction` with confirmed txHash
5. Update this document — `AXIOM_POLYGON_FIRST_MAINNET_TRANSFER_LEDGER.md` — with post-transfer data
6. Mark: **POLYGON FIRST MAINNET TRANSFER COMPLETE**

---

*Axiom Protocol Internal — Polygon Mainnet Transfer Status — 2026-05-15*  
*Transfer blocked on USDC funding only. All infrastructure is in place.*
