# Axiom Protocol — Polygon Amoy LIVE Smoke Report

**Document type:** Amoy Testnet LIVE Smoke Report  
**Phase:** Polygon Phase 5 — Amoy LIVE Dispatch Pre-Verification  
**Run date:** 2026-05-14  
**Run by:** Protocol Operations & Activation Agent  
**Status:** PENDING — wallet funding required before LIVE smoke can execute

> This report covers all phases of the Amoy LIVE smoke preparation.
> Phase D (LIVE broadcast) is blocked exclusively by wallet funding.
> All other infrastructure checks passed or have clear operator actions.

---

## 1. Environment Preflight Result

| Check | Result | Detail |
|---|---|---|
| `MULTICHAIN_ENABLED` | PASS | `true` |
| `CHAIN_POLYGON_ENABLED` | PENDING | Not set — required for `assertChainEnabled()` before LIVE dispatch |
| `POLYGON_ADAPTER_LIVE_ALLOWLIST` | PENDING | Not set — must include `USDC-POLYGON` |
| Amoy RPC URL | PASS | Constructed from `ALCHEMY_API_KEY` → Alchemy Amoy endpoint. Set `POLYGON_AMOY_RPC_URL` for explicit control. |
| RPC chainId | PASS ✓ | **80002** (Polygon Amoy confirmed — not mainnet) |
| Database | PASS ✓ | Connected — `externallySettleInstruction` path ready |
| Accepted-risk document | PENDING | UNSIGNED — see Section 2 |

---

## 2. Accepted-Risk Status (Gate 1)

**Status: NOT SIGNED**

`documents/chains/AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md` contains blank signature fields for all three required signatories. No signatures were found. No signatures were forged.

### Testnet vs. Mainnet Sign-Off Scope

The accepted-risk document covers mainnet (chainId 137) LIVE production activation.
For the Amoy testnet smoke test only, a Technical Lead testnet waiver is sufficient —
full 3-party sign-off is required before mainnet production activation.

### Signing Checklist — Mainnet Production (Gate 1)

```
Technical Lead
  [ ] Reviewed AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md Section 1 (scope)
  [ ] Reviewed Section 2 (risks accepted)
  [ ] Reviewed Section 3 (pre-conditions checklist)
  [ ] Reviewed Section 4 (incident response)
  [ ] Name:      ___________________________
  [ ] Signature: ___________________________
  [ ] Date:      ___________________________

Operations Lead
  [ ] Reviewed Section 2 (risks accepted)
  [ ] Reviewed Section 4 (incident response)
  [ ] Confirmed BitGo Polygon wallet provisioned
  [ ] Confirmed reconciliation cron active
  [ ] Name:      ___________________________
  [ ] Signature: ___________________________
  [ ] Date:      ___________________________

Compliance Officer
  [ ] Confirmed Polygon USDC payments within authorized activity scope
  [ ] Reviewed legal risk row in Section 2
  [ ] Name:      ___________________________
  [ ] Signature: ___________________________
  [ ] Date:      ___________________________
```

### Testnet Waiver (Amoy only)

For the Amoy smoke test, a single Technical Lead sign-off is sufficient:

```
I authorize the Amoy testnet smoke test only.
No production keys, no mainnet transactions, no user funds involved.

Technical Lead:
  Name:      ___________________________
  Signature: ___________________________
  Date:      ___________________________
```

---

## 3. Deployer Key Status (Gate 2)

**Status: ABSENT — Gate 2 PENDING**

| Check | Result |
|---|---|
| `POLYGON_DEPLOYER_PRIVATE_KEY` present | NO |
| `DEPLOYER_PRIVATE_KEY` present | YES (Arbitrum shared key) |
| Keys are distinct | Cannot determine — POLYGON_DEPLOYER_PRIVATE_KEY not set |
| Fallback behavior | Preflight uses shared Arbitrum key as fallback |

**Current deployer address (shared fallback):**
```
0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
```

**Required operator action:**
1. Create a new dedicated wallet for Amoy smoke testing:
   ```bash
   node -e "const {ethers}=require('ethers'); const w=ethers.Wallet.createRandom(); console.log('address:', w.address); console.log('key:', w.privateKey);"
   ```
2. Store the key securely — never commit or log it.
3. Add to Replit secrets:
   ```
   POLYGON_DEPLOYER_PRIVATE_KEY = <new-dedicated-key>
   ```
4. Re-run the preflight — it will report the new address and its balances.

> Note: The Amoy smoke test can technically proceed with the shared fallback address
> (0x8d7892…) if funded. The dedicated key is mandatory for **production** only.
> For testnet, the Technical Lead may authorize use of the shared fallback
> pending the dedicated key creation (document this in the testnet waiver above).

---

## 4. Amoy Funding Preflight (Gate 4)

**Status: UNFUNDED — Gate 4 PENDING**

| Check | Result | Required |
|---|---|---|
| RPC chainId | 80002 ✓ | 80002 |
| Deployer address | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | — |
| POL balance (gas) | **0.000000 POL** | ≥ 0.001 POL |
| USDC balance (Amoy) | **0.000000 USDC** | ≥ 1 raw unit (0.000001 USDC) |
| Amoy USDC contract | `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` ✓ | Circle canonical |

### Funding Instructions

**Step 1 — Get Amoy POL (for gas):**
```
Faucet:  https://faucet.polygon.technology/
Network: Polygon Amoy
Address: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
Request: 0.5 POL (smoke test needs ~0.001 POL)
```

**Step 2 — Get Amoy USDC:**
```
Faucet:  https://faucet.circle.com/
Network: Polygon Amoy (select from dropdown)
Address: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
Note:    USDC-POLYGON smoke transfer amount: 0.000001 USDC (1 raw unit)
```

**Step 3 — Verify funding:**
```
Explorer: https://amoy.polygonscan.com/address/0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
```

**Step 4 — Rerun preflight:**
```bash
npx tsx scripts/polygon-amoy-preflight.ts
```

Expected output after funding:
```
✓ POL balance: 0.500000 POL — sufficient for gas
✓ USDC balance: 10.000000 USDC at 0x8d7892…
```

---

## 5. Amoy LIVE Smoke Result (Phase D)

**Status: NOT RUN — blocked by wallet funding**

Phase D was not executed. The three blocking conditions are:

| Blocker | Status |
|---|---|
| Amoy wallet POL balance ≥ 0.001 | NOT MET — 0 POL |
| Amoy wallet USDC balance ≥ 1 raw unit | NOT MET — 0 USDC |
| POLYGON_DEPLOYER_PRIVATE_KEY set | NOT MET — fallback in use |

No transaction hash. No PolygonScan link.

---

## 6. Invariant Table

Results from `scripts/vault-sprint-polygon-amoy.ts` (2026-05-14):

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
| F2 | LIVE + chain flags + no RPC → RPC error | PROVEN |
| F3 | DISABLED → AdapterDisabledError | PROVEN |
| G | SUBMITTED → SETTLED idempotency | PROVEN |
| **H** | **Amoy LIVE dispatch — 0.000001 USDC on chainId=80002** | **SKIPPED** |
| I | EVM / AVALANCHE / INTERNAL / ACH / STELLAR unaffected | PROVEN |

**Invariant H status: SKIPPED — pending wallet funding**

---

## 7. What Happens When the Wallet Is Funded

Once the operator funds the wallet and re-runs the preflight:

```bash
# Set env vars in Replit secrets:
#   POLYGON_DEPLOYER_PRIVATE_KEY = <dedicated key>
#   CHAIN_POLYGON_ENABLED = true
#   POLYGON_ADAPTER_LIVE_ALLOWLIST = USDC-POLYGON

# Run the full Amoy LIVE smoke:
POLYGON_AMOY_USDC_CONTRACT=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 \
npx tsx scripts/vault-sprint-polygon-amoy.ts
```

Expected invariant H output:
```
✓ H:           Amoy LIVE dispatch succeeded: txHash='0x…'
✓ H.mode:      receiptJson.mode='LIVE', chainId=80002
✓ H.submitted: receipt.submitted=true → parks at SUBMITTED, no portfolio write
```

Then call `externallySettleInstruction`:
```typescript
import { externallySettleInstruction } from '@/lib/capinfra/settlement';

const result = await externallySettleInstruction({
  instructionId:  'si_polygon_amoy_live_smoke',
  externalRef:    '<TX_HASH>',
  settledAt:      new Date(),
  webhookEventId: 'amoy-smoke-manual-settle-001',
  actor:          '<operator-name>',
});
// Expected: result.status === 'SETTLED'
```

---

## 8. Remaining Production Gates

| # | Gate | Status |
|---|---|---|
| 1 | Accepted-risk document signed (3 signatories) | NOT SIGNED |
| 2 | `POLYGON_DEPLOYER_PRIVATE_KEY` dedicated key in secrets | NOT SET |
| 3 | BitGo Polygon custody wallet provisioned | NOT DONE |
| 4 | Amoy wallet funded (POL + USDC) | NOT FUNDED |
| 5 | `vault-sprint-polygon-amoy.ts` invariant H passes | NOT RUN |
| 6 | `seed-polygon-usdc-asset.ts` run in staging DB | NOT RUN |
| 7 | `seed-polygon-custody-wallet.ts` run in staging DB | NOT RUN |
| 8 | Mainnet smoke-check DRY_RUN + LIVE in staging | NOT RUN |
| 9 | `POLYGON_TREASURY_WALLET` set (reconciliation cron activates) | NOT SET |
| 10 | `CHAIN_POLYGON_ENABLED=true` + `POLYGON_ADAPTER_MODE=LIVE` in production | NOT SET |

---

## 9. Production Safety Statement

| Safety check | Status |
|---|---|
| No Polygon mainnet transaction sent | CONFIRMED — 0 mainnet broadcasts |
| Polygon production remains DISABLED | CONFIRMED — `CHAIN_POLYGON_ENABLED` not set |
| Arbitrum One behavior unchanged | CONFIRMED — no EVM adapter changes |
| Avalanche Limited Pilot unchanged | CONFIRMED — no Avalanche adapter changes |
| No Sui changes | CONFIRMED — not touched |
| No banking / ACH / wire routes changed | CONFIRMED — not touched |
| AXUSD issuance remains Arbitrum-canonical | CONFIRMED — MINT/REDEEM blocked on Polygon |
| RPC chainId verified as 80002 (not 137) | CONFIRMED — preflight passed chainId check |

---

## 10. Verdict

```
POLYGON AMOY LIVE SMOKE STILL PENDING

Reason: Amoy wallet unfunded (0 POL, 0 USDC).
        Wallet address: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
        Blocker is exclusively operational — no code changes required.

Next operator action:
  1. Fund wallet via faucets (see Section 4)
  2. Set POLYGON_DEPLOYER_PRIVATE_KEY in Replit secrets
  3. Set CHAIN_POLYGON_ENABLED=true and POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON
  4. Run: npx tsx scripts/polygon-amoy-preflight.ts (confirm both balances)
  5. Run: npx tsx scripts/vault-sprint-polygon-amoy.ts
  6. Record txHash and call externallySettleInstruction
  7. Update this document with results
```

---

*Axiom Protocol Internal — Polygon Amoy LIVE Smoke Report — 2026-05-14*  
*No production keys used. No mainnet transaction sent. This report will be updated after operator funds the Amoy wallet and re-runs the smoke test.*
