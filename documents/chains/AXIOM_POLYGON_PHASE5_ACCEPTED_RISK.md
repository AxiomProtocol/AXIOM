# Axiom Protocol — Polygon Phase 5 Accepted-Risk Record

**Document type:** Accepted-Risk Record  
**Phase:** Polygon Phase 5 — Capinfra Adapter LIVE Dispatch  
**Template created:** 2026-05-14  
**Status:** UNSIGNED — NOT YET APPROVED FOR LIVE USE  

> ⚠ This document must be signed by all three signatories below before
> `POLYGON_ADAPTER_MODE=LIVE` is set in any non-local environment.
> Setting `CHAIN_POLYGON_ENABLED=true` without this signed record is a
> protocol violation and will be flagged in the next compliance audit.

---

## 1. What Is Being Approved

Enabling the Polygon PoS capinfra adapter to broadcast **real USDC transfer
transactions** on the Polygon PoS mainnet (chainId 137). This is the Phase 5
LIVE dispatch capability, implemented in `lib/capinfra/adapters/polygon/`.

Scope of approval:
- Action type: `TRANSFER` only — sending native USDC to a recipient address
- Settlement token: native Circle USDC (`0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`)
- Asset: `USDC-POLYGON` registered in `cap_assets` (see `scripts/seed-polygon-usdc-asset.ts`)
- Not approved: `MINT`, `REDEEM`, or any AXUSD operation on Polygon — those remain Arbitrum-canonical

Env vars that activate LIVE:
```
POLYGON_ADAPTER_MODE=LIVE
CHAIN_POLYGON_ENABLED=true
MULTICHAIN_ENABLED=true
POLYGON_RPC_URL=<mainnet RPC endpoint>
POLYGON_DEPLOYER_PRIVATE_KEY=<Polygon deployer wallet>
POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON
```

---

## 2. Risks Accepted

| Risk | Severity | Mitigation |
|---|---|---|
| USDC transfer to wrong address | HIGH | Address validation enforced in dispatcher (0x… regex). Operator reviews payloadJson before authorizing. |
| RPC misconfiguration (wrong chain) | HIGH | Chain ID verified via `provider.getNetwork()` before broadcast — refuses if mismatch |
| Deployer key compromise | CRITICAL | POLYGON_DEPLOYER_PRIVATE_KEY must be a dedicated Polygon key (not shared with Arbitrum) stored in secrets vault |
| Double-spend / double-transfer | HIGH | Idempotency key enforces one instruction per intent. SUBMITTED → SETTLED only via `externallySettleInstruction`. |
| Polygon PoS chain reorg | MEDIUM | `submitted=true` → SUBMITTED state; portfolio write only after confirmation. Final SETTLED requires explicit confirmation. |
| Smart contract risk (USDC) | LOW | Native Circle USDC — no Axiom contract risk on Polygon. Circle is the issuer. |
| Reconciliation gap | MEDIUM | Daily reconciliation cron must be active before LIVE is enabled (see AXIOM_POLYGON_PHASE4_RECONCILIATION_DESIGN.md) |
| Legal / regulatory risk | MEDIUM | Legal review must confirm Polygon USDC payments are within the authorized activity scope for the jurisdiction(s) served |

---

## 3. Pre-Conditions Checklist

All boxes must be checked before LIVE activation:

| # | Pre-condition | Checked By | Date |
|---|---|---|---|
| 1 | BitGo Polygon custody wallet registered in `custodyWalletRegistry` with `chain='polygon'` | | |
| 2 | `POLYGON_DEPLOYER_PRIVATE_KEY` set in secrets vault (dedicated Polygon key, NOT shared) | | |
| 3 | `USDC-POLYGON` asset registered in `cap_assets` via `seed-polygon-usdc-asset.ts` | | |
| 4 | Polygon Amoy smoke test passed with live RPC (`vault-sprint-polygon-amoy.ts` LIVE section) | | |
| 5 | Daily reconciliation cron active (`scripts/reconcile-polygon-reserve.ts`) | | |
| 6 | Legal review signed off on Polygon USDC payment flows | | |
| 7 | Monitoring/alerting configured for Polygon LIVE transactions | | |
| 8 | Incident runbook for Polygon LIVE failures reviewed by Ops Lead | | |
| 9 | `POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON` scoped (not wildcard) | | |
| 10 | `CHAIN_POLYGON_ENABLED=true` set in target environment | | |

---

## 4. Incident Response

If a Polygon LIVE transfer fails or produces unexpected behavior:

1. Immediately set `POLYGON_ADAPTER_MODE=DISABLED` in the target environment — this blocks all further Polygon dispatches
2. Run `scripts/reconcile-polygon-reserve.ts` to assess the on-chain vs. capinfra discrepancy
3. Page Ops Lead and Technical Lead
4. Do NOT attempt to manually re-submit — `externallySettleInstruction` is the only confirmed path
5. Open a P1 incident ticket with the instruction ID, txHash, and reconciliation report

Recovery path:
- If tx confirmed on-chain but DB not updated: call `externallySettleInstruction` with the real txHash
- If tx never broadcast: instruction stays SUBMITTED — cancel via admin console (SUBMITTED → FAILED allowed by operator)
- If POLYGON_RPC_URL mismatch was the cause: update the env var and restart before re-enabling

---

## 5. Signatures

> All three signatories must sign before LIVE activation.

**Technical Lead:**
```
Name:       ___________________________
Signature:  ___________________________
Date:       ___________________________
Review notes:
```

**Operations Lead:**
```
Name:       ___________________________
Signature:  ___________________________
Date:       ___________________________
Review notes:
```

**Compliance Officer:**
```
Name:       ___________________________
Signature:  ___________________________
Date:       ___________________________
Review notes (legal scope confirmation):
```

---

## 6. Activation Log

Once signed, record the activation here:

```
Environment activated:    (staging / production)
Activated by:             ___________________________
Activation date/time UTC: ___________________________
Commit hash at activation: ___________________________
Initial LIVE transaction (txHash): ___________________________
Initial reconciliation status:     ___________________________
```

---

*Axiom Protocol Internal — Polygon Phase 5 Accepted-Risk Record — 2026-05-14*  
*This document is version-controlled. Modifications after signing require new signatures from all three parties.*
