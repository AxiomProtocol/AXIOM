# Axiom Protocol — Polygon Amoy LIVE Smoke Report

**Document type:** Amoy Testnet LIVE Smoke Report  
**Phase:** Polygon Phase 5 — Amoy LIVE Dispatch Proof  
**Run date:** 2026-05-14  
**Run by:** Protocol Operations & Activation Agent  
**Status:** PROVEN — Amoy LIVE transaction confirmed on-chain

---

## 1. Environment Preflight Result

| Check | Result |
|---|---|
| `MULTICHAIN_ENABLED` | PASS — `true` |
| `CHAIN_POLYGON_ENABLED` | PASS — `true` (set for smoke run) |
| `POLYGON_ADAPTER_LIVE_ALLOWLIST` | PASS — `USDC-POLYGON` |
| Amoy RPC | PASS — constructed from `ALCHEMY_API_KEY` (Alchemy Polygon Amoy endpoint) |
| RPC chainId | **PASS ✓ — 80002** (Polygon Amoy confirmed, not mainnet) |
| Deployer address | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| POL balance | **PASS — 0.100000 POL** (sufficient for gas) |
| USDC balance | **PASS — 20.000000 USDC** (20,000,000 raw at Amoy USDC contract) |
| Amoy USDC contract | `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` ✓ (Circle canonical Amoy) |
| Database | PASS ✓ — Connected |
| Accepted-risk document | PENDING — UNSIGNED (3-party sign-off required for mainnet only) |

Preflight result: **5 passed, 0 failed** — READY FOR AMOY LIVE SMOKE TEST

---

## 2. Accepted-Risk Status (Gate 1)

**Status: NOT SIGNED (mainnet gate — not required for Amoy smoke)**

The accepted-risk document covers mainnet (chainId 137) production activation only.
A Technical Lead testnet waiver (added to the document) is sufficient for the Amoy smoke.
Full 3-party sign-off required before staging or production LIVE activation.

See `documents/chains/AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md` — testnet waiver section.

---

## 3. Deployer Key Status (Gate 2)

**Status: SHARED FALLBACK USED — Gate 2 still pending for production**

| Check | Result |
|---|---|
| `POLYGON_DEPLOYER_PRIVATE_KEY` | NOT SET — shared `DEPLOYER_PRIVATE_KEY` used as fallback |
| Deployer address | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| Note | Dedicated key required for production — shared key acceptable for Amoy testnet smoke |

---

## 4. Amoy LIVE Smoke Result — PROVEN

**Invariant H: PROVEN**

| Sub-check | Result |
|---|---|
| H — Amoy LIVE dispatch | **PROVEN** |
| H.mode | `receiptJson.mode='LIVE'`, `chainId=80002` ✓ |
| H.submitted | `receipt.submitted=true` → parks at SUBMITTED, no portfolio write ✓ |

**Transaction hash:**
```
0x334935ab62afb8298187529ef69db692bd63ffcd84cae353e4ce3f3a3e6049f7
```

**PolygonScan (Amoy) explorer link:**
```
https://amoy.polygonscan.com/tx/0x334935ab62afb8298187529ef69db692bd63ffcd84cae353e4ce3f3a3e6049f7
```

**Details:**
- Network: Polygon Amoy testnet (chainId 80002)
- Token: USDC at `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
- Amount: 0.000001 USDC (1 raw unit)
- From: `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` (deployer wallet)
- Mode: LIVE dispatch via `liveDispatch()` in `lib/capinfra/adapters/polygon/dispatcher.ts`
- Action type: TRANSFER (only permitted type on Polygon Phase 5)
- No MINT, no REDEEM, no AXUSD operation
- No Polygon mainnet (chainId 137) transaction sent

**Settlement note:**  
The vault-sprint dispatches directly through the adapter (not through the full settlement pipeline) — no `cap_settlement_instructions` DB record is created. This is correct for an adapter proof-of-dispatch test. In production, every LIVE dispatch runs through the settlement pipeline, which creates a DB record that transitions PENDING → SUBMITTED on broadcast, then to SETTLED via `externallySettleInstruction` after on-chain confirmation.

---

## 5. Complete Invariant Table

Results from `scripts/vault-sprint-polygon-amoy.ts` — 2026-05-14:

| # | Invariant | Result |
|---|---|---|
| A | POLYGON resolves from adapter registry | **PROVEN** |
| A.kinds | All 6 adapter kinds registered | **PROVEN** |
| B | settlementType=POLYGON routes to polygonAdapter | **PROVEN** |
| C | DRY_RUN externalRef uses `0xpoldry-` prefix | **PROVEN** |
| C.receipt | receiptJson.mode=DRY_RUN, kind=POLYGON | **PROVEN** |
| C2 | DRY_RUN externalRef is deterministic | **PROVEN** |
| C3 | DRY_RUN externalRef is collision-resistant | **PROVEN** |
| D | No blockchain broadcast in DRY_RUN | **PROVEN** |
| D.nohash | No txHash in DRY_RUN receipt | **PROVEN** |
| E | No portfolio credit in DRY_RUN (SUBMITTED, no write) | **PROVEN** |
| F | Phase 5: LIVE no longer throws AdapterModeNotPermittedError | **PROVEN** |
| F.phase5 | Phase 4 hard block fully removed | **PROVEN** |
| F2 | LIVE + chain flags + no RPC → RPC error | **PROVEN** |
| F3 | DISABLED → AdapterDisabledError | **PROVEN** |
| G.db | Database connection confirmed | **PROVEN** |
| G.seed | SUBMITTED instruction seeded to DB | **PROVEN** |
| G.settle1 | externallySettleInstruction → SETTLED | **PROVEN** |
| G.settle2 | Second settle → ConflictError (idempotency) | **PROVEN** |
| **H** | **Amoy LIVE dispatch — 0.000001 USDC on chainId=80002** | **PROVEN ✓** |
| H.mode | receiptJson.mode=LIVE, chainId=80002 | **PROVEN ✓** |
| H.submitted | receipt.submitted=true → SUBMITTED, no portfolio write | **PROVEN ✓** |
| I.evm | EVM adapter unaffected | **PROVEN** |
| I.avalanche | AVALANCHE adapter unaffected | **PROVEN** |
| I.internal | INTERNAL adapter unaffected | **PROVEN** |
| I.ach | ACH adapter unaffected | **PROVEN** |
| I.stellar | STELLAR adapter unaffected | **PROVEN** |

**Total: 26 passed, 0 failed, 0 skipped**

---

## 6. Bug Fixed — Vault-Sprint Env Restore

During this run, a bug was discovered and fixed in `scripts/vault-sprint-polygon-amoy.ts`:

**Root cause:** Invariants F and F2 both mutate `CHAIN_POLYGON_ENABLED`, `MULTICHAIN_ENABLED`, `POLYGON_ADAPTER_MODE`, and `POLYGON_ADAPTER_LIVE_ALLOWLIST` during their tests. Both blocks unconditionally deleted these vars in their cleanup — overwriting any values the caller had passed inline, so invariant H could never see them.

**Fix:** Both F and F2 now snapshot all vars they touch before the test and restore them from the snapshot in a `finally` block. Inline values passed by the operator are preserved through all prior test blocks.

---

## 7. Remaining Production Gates

| # | Gate | Status |
|---|---|---|
| 1 | Accepted-risk document signed (3 signatories) | NOT SIGNED |
| 2 | `POLYGON_DEPLOYER_PRIVATE_KEY` dedicated key in secrets | NOT SET |
| 3 | BitGo Polygon custody wallet provisioned | NOT DONE |
| 4 | Amoy wallet funded | **DONE ✓** (0.1 POL, 20 USDC) |
| 5 | `vault-sprint-polygon-amoy.ts` invariant H | **PROVEN ✓** |
| 6 | `seed-polygon-usdc-asset.ts` in staging DB | NOT RUN |
| 7 | `seed-polygon-custody-wallet.ts` in staging DB | NOT RUN |
| 8 | Mainnet smoke-check DRY_RUN + LIVE in staging | NOT RUN |
| 9 | `POLYGON_TREASURY_WALLET` set | NOT SET |
| 10 | `CHAIN_POLYGON_ENABLED=true` + `POLYGON_ADAPTER_MODE=LIVE` in production | NOT SET |

Gates 4 and 5 are now complete. Gates 1–3 and 6–10 remain.

---

## 8. Production Safety Statement

| Safety check | Status |
|---|---|
| Polygon mainnet transaction sent | NONE — confirmed |
| chainId of smoke tx | 80002 (Amoy testnet) — not 137 (mainnet) |
| Polygon production | DISABLED — `CHAIN_POLYGON_ENABLED` not set in any persistent env |
| Arbitrum One | Unchanged |
| Avalanche Limited Pilot | Unchanged, active |
| Sui | Not touched |
| Banking / ACH / wire rails | Not touched |
| AXUSD issuance | Arbitrum-canonical — MINT/REDEEM blocked on Polygon |
| vault-sprint result | 26 passed, 0 failed, 0 skipped |

---

## 9. Verdict

```
POLYGON AMOY LIVE SMOKE PROVEN

txHash:   0x334935ab62afb8298187529ef69db692bd63ffcd84cae353e4ce3f3a3e6049f7
Network:  Polygon Amoy (chainId 80002)
Date:     2026-05-14
Token:    USDC (0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582)
Amount:   0.000001 USDC (1 raw unit)
Mode:     LIVE dispatch via liveDispatch()
Result:   26/26 invariants proven, 0 skipped

Remaining before production: Gates 1–3 and 6–10 (human-gated).
No code changes required for production activation.
```

---

*Axiom Protocol Internal — Polygon Amoy LIVE Smoke Report — 2026-05-14*  
*Amoy smoke complete. Production activation requires human sign-off on the remaining gates.*
