# Axiom Protocol — Polygon First Mainnet Transfer Post-Check

**Document type:** Phase D Post-Transfer Verification  
**Phase:** Polygon Phase 5 — First Controlled Mainnet USDC Transfer  
**Created:** 2026-05-15  
**Status:** NOT EXECUTED — Transfer blocked at Phase A (sender has 0 USDC)

---

## Transfer Execution Status

```
TRANSFER NOT EXECUTED

Reason: Sender wallet 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
        has 0 USDC on Polygon mainnet (chainId 137).
        A minimum of 1 raw unit (0.000001 USDC) is required.

Phase A completed: 10/11 checks passed — hard blocker on USDC balance.
Phase B completed: Baseline recorded.
Phase C: BLOCKED — not attempted.
Phase D: This document — populated when transfer executes.
```

---

## Post-Transfer Checklist (to be completed after execution)

| Check | Expected | Actual | Result |
|---|---|---|---|
| txHash present | 0x… (66 chars) | PENDING | — |
| PolygonScan link | https://polygonscan.com/tx/… | PENDING | — |
| Receipt status | 1 (success) | PENDING | — |
| USDC Transfer event exists | yes | PENDING | — |
| Sender USDC delta | −0.000001 USDC | PENDING | — |
| Recipient USDC delta | +0.000001 USDC | PENDING | — |
| Gas charged in POL | > 0 POL | PENDING | — |
| Instruction state | SUBMITTED → SETTLED | PENDING | — |
| Portfolio write timing | Only after SETTLED | PENDING | — |
| Duplicate settle | ConflictError on 2nd call | PENDING | — |
| Reconciliation | CLEAN | PENDING | — |

---

## Settlement State Transitions (expected)

```
PENDING
  → SUBMITTED  (after liveDispatch() broadcasts tx)
  → SETTLED    (after operator calls externallySettleInstruction with txHash)
```

Portfolio credit must not occur at SUBMITTED. It fires only at SETTLED.

---

## Emergency Readiness

```
Kill switch: POLYGON_ADAPTER_MODE=DISABLED
Status: ARMED AND AVAILABLE — not triggered (no tx sent)
Anomaly log: NONE
```

---

## Funding Instructions (to unblock)

To fund the sender wallet with USDC on Polygon mainnet:

```
Address:  0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
Network:  Polygon PoS (chainId 137)
Token:    USDC — 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
Amount:   Minimum 0.000001 USDC (1 raw unit)
          Recommended: at least 1.000000 USDC for operational headroom

Sources:
  - Centralized exchange: withdraw USDC selecting "Polygon" network
  - Circle CCTP: bridge USDC from Ethereum/Arbitrum/Base to Polygon
  - Any DEX bridge: Polygon USDC address above is native Circle USDC

Verify funding:
  https://polygonscan.com/address/0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
  → Token Holdings tab → USDC
```

Once funded, re-run Phase A preflight and proceed to Phase C.

---

*Axiom Protocol Internal — Polygon First Mainnet Transfer Post-Check — 2026-05-15*  
*This document will be updated once the transfer executes successfully.*
