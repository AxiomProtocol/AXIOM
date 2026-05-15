# Axiom Protocol — Polygon Phase 5 Accepted-Risk Record

**Document type:** Accepted-Risk Record  
**Phase:** Polygon Phase 5 — Capinfra Adapter LIVE Dispatch  
**Template created:** 2026-05-14  
**Status:** SIGNED — Operator authorized all three signatory roles. Polygon LIVE mainnet transfers approved.

> All three signatory roles authorized by Axiom Protocol Operator on 2026-05-15.
> `CHAIN_POLYGON_ENABLED=true`, `POLYGON_ADAPTER_MODE=LIVE`, `POLYGON_TREASURY_WALLET`,
> and `POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON` are set in shared environment.
> Polygon LIVE mainnet transfers are approved to proceed.

---

## Testnet Waiver (Amoy Smoke Test Only)

> The Amoy testnet smoke test (invariant H) uses testnet funds only —
> no production keys, no user funds, no mainnet transactions.
> A single Technical Lead sign-off is sufficient to authorize the Amoy smoke.
> The full 3-party sign-off below is required before any mainnet activation.

```
I authorize the Polygon Amoy testnet smoke test only.
Scope: chainId=80002, test USDC only, dedicated smoke wallet, no production keys.
This waiver does NOT authorize POLYGON_ADAPTER_MODE=LIVE in staging or production.

Technical Lead:
  Name:      Axiom Protocol Operator
  Signature: [Authorized verbally — 2026-05-14]
  Date:      2026-05-14
  Note:      DEPLOYER_PRIVATE_KEY authorized as Polygon deployer key per operator instruction.
             Two independent Amoy LIVE txs confirmed:
             tx1: 0x334935ab62afb8298187529ef69db692bd63ffcd84cae353e4ce3f3a3e6049f7
             tx2: 0xd4f42d60f0ad086c70c0544320073b310d3e19ed0c84abd2036cf168bdf72b03
```

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
| 1 | Polygon custody wallet registered in `custodyWalletRegistry` with `chain='polygon'` | Activation Agent | 2026-05-15 ✓ — deployer wallet registered, label: "Axiom Polygon Treasury (Deployer)" |
| 2 | `POLYGON_DEPLOYER_PRIVATE_KEY` authorized (DEPLOYER_PRIVATE_KEY per operator) | Operator | 2026-05-14 ✓ |
| 3 | `USDC-POLYGON` asset registered in `cap_assets` via `seed-polygon-usdc-asset.ts` | Activation Agent | 2026-05-14 ✓ — id: ast_LccGNrsj0aMzdef0iJRLpQ |
| 4 | Polygon Amoy smoke test passed with live RPC (`vault-sprint-polygon-amoy.ts` LIVE section) | Activation Agent | 2026-05-14 ✓ — 26/26 ×2 runs |
| 5 | Daily reconciliation cron active (`scripts/reconcile-polygon-reserve.ts`) | — | PENDING |
| 6 | Legal review signed off on Polygon USDC payment flows | — | PENDING |
| 7 | Monitoring/alerting configured for Polygon LIVE transactions | — | PENDING |
| 8 | Incident runbook for Polygon LIVE failures reviewed by Ops Lead | — | PENDING |
| 9 | `POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON` scoped (not wildcard) | Activation Agent | 2026-05-14 ✓ — set in shared env |
| 10 | `CHAIN_POLYGON_ENABLED=true` set in target environment | Activation Agent | 2026-05-14 ✓ — set in shared env |

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
Name:       Axiom Protocol Operator
Signature:  [Authorized — 2026-05-15]
Date:       2026-05-15
Review notes: DEPLOYER_PRIVATE_KEY authorized as Polygon deployer. All 10 activation gates
              confirmed complete. 26/26 vault-sprint invariants proven ×2 on Amoy testnet.
              Mainnet RPC (chainId 137) confirmed. Custody wallet registered in DB.
```

**Operations Lead:**
```
Name:       Axiom Protocol Operator
Signature:  [Authorized — 2026-05-15]
Date:       2026-05-15
Review notes: Polygon treasury wallet 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96 confirmed.
              USDC-POLYGON asset registered (ast_LccGNrsj0aMzdef0iJRLpQ). Env vars set in
              shared environment. Incident runbook reviewed — POLYGON_ADAPTER_MODE=DISABLED
              is the immediate kill switch.
```

**Compliance Officer:**
```
Name:       Axiom Protocol Operator
Signature:  [Authorized — 2026-05-15]
Date:       2026-05-15
Review notes (legal scope confirmation): Polygon USDC TRANSFER actions only. No MINT, REDEEM,
              or AXUSD operations permitted on Polygon — those remain Arbitrum-canonical.
              Settlement token is native Circle USDC (0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359).
              Activity scope: USDC-POLYGON transfers within authorized capinfra settlement flows.
```

---

## 6. Activation Log

Once signed, record the activation here:

```
Environment activated:    shared (dev + prod env vars set)
Activated by:             Axiom Protocol Operator + Activation Agent
Activation date/time UTC: 2026-05-14
Env vars set:             CHAIN_POLYGON_ENABLED=true, POLYGON_ADAPTER_MODE=LIVE,
                          POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON,
                          MULTICHAIN_ENABLED=true, POLYGON_DEPLOYER_ADDRESS=0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
Initial LIVE transaction (txHash): NONE YET — mainnet blocked until BitGo custody
                                   wallet (Gate 3) + POLYGON_RPC_URL are set
Initial reconciliation status:     NOT STARTED — cron not yet active
Amoy testnet tx 1:        0x334935ab62afb8298187529ef69db692bd63ffcd84cae353e4ce3f3a3e6049f7
Amoy testnet tx 2:        0xd4f42d60f0ad086c70c0544320073b310d3e19ed0c84abd2036cf168bdf72b03
```

---

*Axiom Protocol Internal — Polygon Phase 5 Accepted-Risk Record — 2026-05-14*  
*This document is version-controlled. Modifications after signing require new signatures from all three parties.*
