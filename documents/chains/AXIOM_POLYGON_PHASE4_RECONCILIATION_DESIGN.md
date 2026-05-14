# Axiom Protocol — Polygon Phase 4 Reconciliation Design

**Document type:** Phase F — Reconciliation Design  
**Phase:** Polygon Phase 4 — Capinfra Adapter DRY_RUN Foundation  
**Created:** 2026-05-14  
**Status:** DESIGN ONLY — no live reconciliation in Phase 4  

---

## 1. Purpose

This document defines the intended reconciliation architecture for Polygon USDC
treasury movements when Phase 5 build work enables live Polygon payments. In
Phase 4, the reconciliation script (`scripts/reconcile-polygon-reserve.ts`)
is read-only and exits with a clear BLOCKED message when the required env vars
are absent — which is the expected Phase 4 state.

---

## 2. What Is Being Reconciled

Polygon's settlement token is native USDC (Circle-issued, not bridge-wrapped):

```
Token:    USD Coin (native)
Symbol:   USDC
Address:  0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
Chain:    Polygon PoS mainnet (chainId 137)
Issuer:   Circle Internet Financial
```

Reconciliation compares:
1. **On-chain position**: USDC balance of the Axiom treasury wallet on Polygon PoS
2. **capinfra ledger position**: sum of SETTLED POLYGON-type instructions in the DB

The two values should match within a tolerance threshold. A discrepancy indicates
either: an unrecorded transaction, a DB write failure, a reconciliation gap, or
an unauthorized movement.

---

## 3. Reconciliation Flow (Future — when LIVE mode is active)

```
┌─────────────────────────────────────────────────────────────────┐
│  After every Polygon LIVE dispatch:                             │
│                                                                 │
│  1. adapter.dispatch() broadcasts USDC transfer on Polygon PoS  │
│     → Returns txHash + submitted=true                           │
│  2. settlement.ts: instruction → SUBMITTED (no portfolio write)  │
│  3. Post-action reconciliation triggered:                       │
│     a. Read on-chain USDC balance via POLYGON_RPC_URL           │
│     b. Compare to capinfra POLYGON SETTLED sum                  │
│     c. Discrepancy within TOLERANCE → CLEAN                     │
│     d. Discrepancy ≥ threshold → ANOMALY → operator alert       │
│  4. Confirmation path:                                          │
│     a. Webhook (if Polygon provider supports it) OR             │
│     b. Reconciliation poll confirms tx on-chain                 │
│     c. externallySettleInstruction called → SUBMITTED → SETTLED  │
│     d. Portfolio write fires                                    │
│  5. Daily cron at 00:00 UTC (same pattern as Avalanche)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Tolerance Thresholds

Following the Avalanche reconciliation model:

| Threshold | Raw Units (6 decimals) | Human Amount | Action |
|---|---|---|---|
| Normal tolerance | 1 | 0.000001 USDC | No action — sub-cent rounding |
| Warning | 10,000 | 0.010000 USDC | Notify Ops Lead |
| Anomaly | 1,000,000 | 1.000000 USDC | P1 incident — pause and review |
| Critical | 10,000,000 | 10.000000 USDC | Immediate operator intervention |

These thresholds apply to the absolute value of `on_chain_balance − capinfra_net`.
Negative discrepancy (on-chain < capinfra) is always ANOMALY regardless of magnitude.

---

## 5. Reconciliation Script Design

### 5.1 Script location
```
scripts/reconcile-polygon-reserve.ts
```

### 5.2 Pre-flight checks (Phase 4 behavior)

The script checks all required env vars before any RPC call:
- `CHAIN_POLYGON_ENABLED === 'true'` — gates Polygon reconciliation
- `POLYGON_RPC_URL` present — required for on-chain balance read
- `POLYGON_TREASURY_WALLET` present — the wallet address to check

If any are absent → status = `BLOCKED`, exits 0 (expected Phase 4 state),
writes a BLOCKED report to `documents/operations/reconciliation-reports/polygon-YYYY-MM-DD.json`.

### 5.3 Report output format

```json
{
  "version": "1.0",
  "adapter": "POLYGON",
  "network": "mainnet",
  "date": "2026-05-14",
  "runAt": "2026-05-14T13:00:00.000Z",
  "status": "BLOCKED",
  "blockers": ["POLYGON_TREASURY_WALLET is not set — ..."],
  "onChainBalanceRaw": null,
  "onChainBalanceHuman": null,
  "capinfraNetMovementRaw": null,
  "discrepancyRaw": null,
  "discrepancyHuman": null,
  "treasuryWallet": null,
  "usdcContract": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "notes": ["Phase 4: No Axiom contracts deployed on Polygon. ..."]
}
```

When LIVE: `status` is one of `CLEAN | WARNING | ANOMALY | ERROR`.

### 5.4 Networks supported
- `RECONCILE_NETWORK=mainnet` — Polygon PoS mainnet (chainId 137), uses `POLYGON_RPC_URL`
- `RECONCILE_NETWORK=amoy` — Polygon Amoy testnet (chainId 80002), uses `POLYGON_AMOY_RPC_URL`

---

## 6. Tie-Back to Arbitrum Canonical Ledger

Polygon USDC movements reconcile back to the Arbitrum canonical state as follows:

```
Polygon USDC inflow / outflow
  │
  ▼
capinfra POLYGON instruction (SETTLED)
  │
  ▼
TreasuryLedgerService entry written:
  { chain: 'polygon', asset: 'USDC-POLYGON', amount, direction, reconciledAt }
  │
  ▼
Axiom Sentinel solvency view updated:
  Polygon USDC balance counted as USD-equivalent asset position
  NEVER counted as AXUSD canonical supply (issuance stays Arbitrum)
  NEVER counted as AXAU reserve (reserve stays Arbitrum + Ethereum)
```

No Polygon USDC balance can increase Arbitrum AXUSD totalSupply. The reconciliation
model ensures that Polygon movements affect only the treasury asset position, not
the canonical supply or reserve accounting.

---

## 7. What Must Exist Before Live Reconciliation Cron

| Requirement | Status | Notes |
|---|---|---|
| `POLYGON_RPC_URL` set in staging | NOT SET | Required for any RPC read |
| `POLYGON_TREASURY_WALLET` set | NOT SET | BitGo custody wallet on Polygon |
| `CHAIN_POLYGON_ENABLED=true` | NOT SET | Required env gate |
| USDC-POLYGON asset in `cap_assets` | NOT REGISTERED | Phase 5 |
| BitGo Polygon custody wallet | NOT CREATED | Pre-LIVE gate |
| Accepted-risk record signed | NOT SIGNED | Pre-LIVE gate |
| Legal review complete | NOT COMPLETE | Pre-LIVE gate |
| capinfra POLYGON LIVE path implemented | NOT IMPLEMENTED | Phase 5 |
| Daily cron job configured | NOT CONFIGURED | Phase 5 |

---

## 8. Double-Credit Prevention

The capinfra instruction model prevents double-credit by design:
- Each instruction has a unique `idempotencyKey` — duplicate create returns existing
- `externallySettleInstruction` is idempotent — second call on SETTLED → ConflictError
- SUBMITTED → SETTLED transition requires explicit operator or webhook confirmation
- Reconciliation reads on-chain state — if instruction already SETTLED, cron skips

This is the same model proven in the Avalanche Gate 5 report.

---

## 9. Phase 4 Actual Script Behavior

Running `npx tsx scripts/reconcile-polygon-reserve.ts` in Phase 4:

```
STATUS: BLOCKED

BLOCKER: CHAIN_POLYGON_ENABLED is not set to "true"
BLOCKER: POLYGON_RPC_URL is required for mainnet reconciliation
BLOCKER: POLYGON_TREASURY_WALLET is not set

This is expected in Phase 4 — no Polygon treasury wallet exists yet.
Fix the blockers above before running live reconciliation.

Report written: documents/operations/reconciliation-reports/polygon-2026-05-14.json
```

Exit code 0 — BLOCKED is the expected Phase 4 state, not a failure.

---

*Axiom Protocol Internal — Polygon Phase 4 Reconciliation Design — 2026-05-14*  
*No live reconciliation in Phase 4. Polygon remains disabled in all environments.*
