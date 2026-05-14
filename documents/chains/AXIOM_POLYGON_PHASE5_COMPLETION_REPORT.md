# Axiom Protocol — Polygon Chain Expansion: Phase Completion Report

**Document type:** Phase Completion Report  
**Phase scope:** Polygon PoS — Phases 3 through 5 (Tasks #488, #489, #491, #495)  
**Completed:** 2026-05-14  
**Status:** ENGINEERING COMPLETE — awaiting human sign-off gates before production activation

---

## 1. Summary

The Polygon PoS payment rail has been fully engineered across four tasks spanning five
phases. The capinfra adapter can now TRANSFER native USDC on Polygon PoS mainnet
(chainId 137) and Amoy testnet (chainId 80002). The adapter defaults to DRY_RUN in all
environments. No Polygon mainnet transaction has been sent. Activation requires three
human sign-offs and operator-controlled environment variable changes described in
Section 6 below.

---

## 2. What Was Built

### 2.1 Capinfra Adapter — lib/capinfra/adapters/polygon/

| File | Phase | Change |
|---|---|---|
| `config.ts` | 3 → 5 | Chain gate (`assertChainEnabled`), `deployerPrivateKey()`, allowlist resolution, Amoy USDC contract override |
| `dispatcher.ts` | 3 → 5 | Full LIVE dispatch path via `liveDispatch()`; chain ID verification; TRANSFER-only guard; MINT/REDEEM explicitly rejected; amount conversion (`toWei()`); deterministic DRY_RUN refs (`0xpoldry-…`) |
| `index.ts` | 3 | Adapter export wired into settlement registry |

**Dispatch flow (Phase 5 final state):**
```
DISABLED                         → AdapterDisabledError
LIVE + asset not in allowlist    → dryRunDispatch(reason='asset_not_allowlisted')
LIVE + allowlisted               → liveDispatch()
  ↓ assertChainEnabled()         → gates MULTICHAIN_ENABLED + CHAIN_POLYGON_ENABLED
  ↓ provider.getNetwork()        → verifies chainId=137 before broadcast
  ↓ actionType gate              → TRANSFER only; MINT/REDEEM throw
  ↓ payloadJson.recipient gate   → 0x… address required
  ↓ ethers USDC transfer         → broadcast on Polygon PoS
  ↓ submitted=true               → parks at SUBMITTED; portfolio write deferred
DRY_RUN                          → dryRunDispatch(reason='mode')
```

**Settlement token (mainnet):**  
Native Circle USDC — `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` (6 decimals, chainId 137)

**Settlement token (Amoy testnet):**  
Circle Amoy USDC — `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` (6 decimals, chainId 80002)

---

### 2.2 Reconciliation Infrastructure

| File | Purpose |
|---|---|
| `lib/capinfra/reconciliation/polygonReconcile.ts` | Shared reconciliation module — typed result, no process.exit(), safe for both CLI and serverless |
| `scripts/reconcile-polygon-reserve.ts` | CLI script — reads on-chain USDC balance, queries capinfra DB, writes JSON report to `documents/operations/reconciliation-reports/` |
| `pages/api/cron/reconcile-polygon-reserve.ts` | Vercel cron API route — same logic, `writeReport:false` (read-only serverless FS), correct `isAuthorized()` accepting CRON_SECRET or ADMIN_SOLVENCY_KEY independently |
| `vercel.json` | Registered cron: `0 2 * * *` (daily 02:00 UTC) |

**Reconciliation statuses:**

| Status | Meaning | Cron HTTP response |
|---|---|---|
| BLOCKED | Env gates not yet set | 200 — expected pre-activation |
| CLEAN | On-chain matches capinfra (discrepancy < 1 raw unit) | 200 |
| WARNING | Discrepancy 1 – 99,999 raw USDC units | 200 + logged |
| ANOMALY | Discrepancy ≥ 100,000 raw USDC units | 500 — cron monitoring alert |
| ERROR | RPC/DB failure | 500 — cron monitoring alert |

---

### 2.3 Production Smoke-Check Tool

`scripts/polygon-production-smoke-check.ts` — two-phase operator tool:

| Phase | Trigger | What it does |
|---|---|---|
| DRY_RUN (default) | `npx tsx scripts/polygon-production-smoke-check.ts` | Validates env vars, verifies RPC chainId=137, checks deployer POL and USDC balances. Exits 1 if any check fails. |
| LIVE | `POLYGON_SMOKE_CONFIRM=true npx tsx …` | Broadcasts 0.000001 USDC via `liveDispatch()`. Sets POLYGON_ADAPTER_MODE=LIVE in process, restores DRY_RUN in finally block. Prints PolygonScan URL and `externallySettleInstruction` call for operator to run post-confirmation. |

---

### 2.4 Amoy Testnet Tooling

| File | Purpose |
|---|---|
| `scripts/vault-sprint-polygon-amoy.ts` | 23 adapter invariants (22 proven, 1 skipped pending funded Amoy wallet) |
| `scripts/polygon-amoy-preflight.ts` | Derives deployer address, checks Amoy RPC, reports POL and USDC balances |
| `scripts/seed-polygon-usdc-asset.ts` | Idempotent `USDC-POLYGON` registration in `cap_assets` (idempotent — safe to re-run) |
| `scripts/seed-polygon-custody-wallet.ts` | BitGo Polygon custody wallet registration in `custodyWalletRegistry` |

---

### 2.5 Operator Documents

| Document | Status |
|---|---|
| `AXIOM_POLYGON_PHASE3_BLUEPRINT.md` | Approved |
| `AXIOM_POLYGON_PHASE3_DISCOVERY.md` | Complete |
| `AXIOM_POLYGON_PHASE3_DECISION_MEMO.md` | Complete |
| `AXIOM_POLYGON_PHASE4_DISCOVERY.md` | Complete |
| `AXIOM_POLYGON_PHASE4_CAPINFRA_REPORT.md` | Complete |
| `AXIOM_POLYGON_PHASE4_RECONCILIATION_DESIGN.md` | Complete |
| `AXIOM_POLYGON_PHASE5_CAPINFRA_REPORT.md` | Complete |
| `AXIOM_POLYGON_AMOY_ACTIVATION_GUIDE.md` | Complete — 10-step operator runbook |
| `AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md` | Template created — **UNSIGNED** |

---

## 3. Invariant Coverage (vault-sprint-polygon-amoy.ts)

| # | Invariant | Result |
|---|---|---|
| A | POLYGON resolves from adapter registry | PROVEN |
| B | settlementType=POLYGON routes to polygonAdapter | PROVEN |
| C | DRY_RUN externalRef uses `0xpoldry-` prefix | PROVEN |
| C2 | DRY_RUN externalRef is deterministic | PROVEN |
| C3 | DRY_RUN externalRef is collision-resistant | PROVEN |
| D | No blockchain broadcast in DRY_RUN | PROVEN |
| E | No portfolio credit in DRY_RUN | PROVEN |
| F | Phase 5: LIVE no longer throws AdapterModeNotPermittedError | PROVEN |
| F.phase5 | Phase 4 hard block fully removed | PROVEN |
| F2 | LIVE + chain flags + no RPC → RPC error (not adapter error) | PROVEN |
| F3 | DISABLED → AdapterDisabledError | PROVEN |
| G | SUBMITTED → SETTLED idempotency (DB: ConflictError on second call) | PROVEN |
| H | Amoy LIVE smoke test — 0.000001 USDC broadcast on chainId=80002 | **SKIPPED** — requires funded Amoy wallet (no programmatic faucet available) |
| I | EVM / AVALANCHE / INTERNAL / ACH / STELLAR adapters unaffected | PROVEN |

---

## 4. Safety Controls

| Control | Implementation |
|---|---|
| Default state is DRY_RUN | `POLYGON_ADAPTER_MODE` not set = DRY_RUN; explicit opt-in required |
| Chain ID verification | `provider.getNetwork()` checked before every LIVE broadcast |
| MINT/REDEEM blocked | Explicit throw at dispatcher level — AXUSD remains Arbitrum-canonical |
| Deferred settlement | `submitted=true` → SUBMITTED state; SETTLED requires `externallySettleInstruction` |
| Asset allowlist | `POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON` required; wildcard not accepted |
| Dual chain gate | Both `MULTICHAIN_ENABLED=true` AND `CHAIN_POLYGON_ENABLED=true` required |
| Dedicated deployer key | `POLYGON_DEPLOYER_PRIVATE_KEY` prefers a Polygon-specific key, does not share Arbitrum key |
| Daily reconciliation | Cron at 02:00 UTC; ANOMALY/ERROR returns 500 for monitoring alerts |
| Read-only Amoy preflight | `polygon-amoy-preflight.ts` verifies all config before any broadcast |

---

## 5. Existing Systems — Unchanged

| System | Status |
|---|---|
| Arbitrum One (AXUSD / AXAU canonical chain) | Unchanged |
| Avalanche Limited Pilot (100 AXUSD cap) | Active, unchanged |
| EVM adapter | Unchanged |
| STELLAR / INTERNAL / ACH adapters | Unchanged |
| BitGo CaaS (Arbitrum + Avalanche) | Unchanged |

---

## 6. Human Gates Required Before Production Activation

These actions cannot be performed by engineering automation. All must be completed in order.

| # | Gate | Owner | Status |
|---|---|---|---|
| 1 | Sign `AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md` — all 3 signatories (Technical Lead, Ops Lead, Compliance) | Leadership | NOT SIGNED |
| 2 | Create dedicated `POLYGON_DEPLOYER_PRIVATE_KEY` (not shared with Arbitrum) and load into secrets vault | Infra | NOT DONE |
| 3 | Provision BitGo Polygon custody wallet via BitGo CaaS console | Ops | NOT DONE |
| 4 | Fund Amoy test wallet (POL via polygon.technology/faucet + USDC via faucet.circle.com) | Engineering | NOT DONE |
| 5 | Run `vault-sprint-polygon-amoy.ts` with Amoy RPC — invariant H must pass | Engineering | NOT RUN |
| 6 | Run `seed-polygon-usdc-asset.ts` in staging DB | Engineering | NOT RUN |
| 7 | Run `seed-polygon-custody-wallet.ts` with BitGo wallet address in staging DB | Engineering | NOT RUN |
| 8 | Set staging env vars and run `polygon-production-smoke-check.ts` DRY_RUN + LIVE | Engineering | NOT RUN |
| 9 | Set `POLYGON_TREASURY_WALLET` so daily reconciliation cron can activate | Infra | NOT SET |
| 10 | Set `CHAIN_POLYGON_ENABLED=true` + `POLYGON_ADAPTER_MODE=LIVE` in production | Infra | NOT SET |

Operator runbook for steps 4–9: `documents/chains/AXIOM_POLYGON_AMOY_ACTIVATION_GUIDE.md`

---

## 7. Activation Environment Variables

Full set of env vars required for production LIVE activation:

```
MULTICHAIN_ENABLED=true
CHAIN_POLYGON_ENABLED=true
POLYGON_ADAPTER_MODE=LIVE
POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON
POLYGON_RPC_URL=<Polygon PoS mainnet RPC — Alchemy recommended>
POLYGON_DEPLOYER_PRIVATE_KEY=<dedicated Polygon deployer wallet>
POLYGON_TREASURY_WALLET=<BitGo Polygon custody wallet address>
```

For the Amoy smoke test only (not production):
```
POLYGON_AMOY_RPC_URL=<Amoy RPC endpoint>
POLYGON_AMOY_USDC_CONTRACT=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
```

---

## 8. Task History

| Task | Title | Status |
|---|---|---|
| #488 | Polygon Phase 4 — DRY_RUN adapter foundation | MERGED |
| #489 | Polygon Phase 5 — LIVE dispatch path | MERGED |
| #491 | Polygon Amoy smoke test tooling | MERGED |
| #495 | Polygon production activation infrastructure (reconcile cron, smoke-check, vercel cron) | MERGED |
| #496 | Polygon USDC reserve ops dashboard | CANCELLED |
| #497 | Polygon reconciliation discrepancy alerting | CANCELLED |

---

*Axiom Protocol Internal — Polygon Phase Completion Report — 2026-05-14*  
*Engineering is complete. Production is gated on human sign-off items in Section 6.*
