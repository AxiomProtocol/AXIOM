# Axiom Protocol — Avalanche Limited Pilot Runtime Guard Proposal

**Document type:** Engineering Proposal (Not Yet Implemented)  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Version:** 1.0.0  
**Created:** 2026-05-14  
**Status:** PROPOSED — NOT IMPLEMENTED  

---

## Summary

This document proposes runtime environment variable guards for the Avalanche Limited Pilot Mode. These guards are **not implemented** in this pass. They are documented here as a recommended next engineering step.

The decision not to implement in this pass is intentional:

- Implementing env-var guards requires changes to Capinfra mint dispatch, which has a defined test surface and requires separate review
- The pilot operates with a 2,500 AXUSD cap that is manually enforced in the current pass
- Incorrect guard implementation could accidentally block legitimate operator mints or fail silently
- Adding code without testing is a higher risk than manual enforcement at this cap level

---

## Proposed Environment Variables

```bash
# Enable limited pilot mode (gate for all pilot-specific checks)
AVALANCHE_LIMITED_PILOT_MODE=true

# Hard cap on total AXUSD that can be minted during pilot
AVALANCHE_PILOT_TOTAL_MINT_CAP=2500

# Single-wallet mint cap (max per participant per pilot)
AVALANCHE_PILOT_SINGLE_WALLET_CAP=1000

# Comma-separated list of pre-approved participant wallets
# Any mint to a wallet not on this list should be rejected
AVALANCHE_PILOT_ALLOWED_WALLETS=0xWALLET1,0xWALLET2,...
```

---

## Proposed Guard Behavior

When `AVALANCHE_LIMITED_PILOT_MODE=true`:

1. **Before any Capinfra AVALANCHE mint dispatch:**
   - Check that destination wallet is in `AVALANCHE_PILOT_ALLOWED_WALLETS`
   - Check that mint amount ≤ `AVALANCHE_PILOT_SINGLE_WALLET_CAP`
   - Check that `totalSupply() + mintAmount ≤ AVALANCHE_PILOT_TOTAL_MINT_CAP`
   - If any check fails: reject dispatch, log rejection, alert operator

2. **On Capinfra startup (when AVALANCHE enabled):**
   - If `AVALANCHE_LIMITED_PILOT_MODE` is not set but `CHAIN_AVALANCHE_ENABLED=true`: emit a warning that pilot guard is not active

3. **Daily reconciliation script (`reconcile-avalanche-reserve.ts`):**
   - Read `AVALANCHE_PILOT_TOTAL_MINT_CAP` and include cap utilization in report
   - Emit WARNING if cumulative supply ≥ 80% of cap
   - Emit CRITICAL if cumulative supply ≥ cap

---

## Proposed Implementation Location

| File | Change |
|---|---|
| `lib/capinfra/avalanche-adapter.ts` | Add pilot guard checks in `dispatchMint()` |
| `scripts/reconcile-avalanche-reserve.ts` | Add cap utilization to report output |
| `lib/capinfra/config.ts` | Add `AVALANCHE_PILOT_*` to config schema |

---

## Pre-Implementation Requirements

Before implementing the runtime guard:

1. Define the Capinfra AVALANCHE adapter interface (does `dispatchMint()` exist with this signature?)
2. Write unit tests for each guard condition
3. Test in Fuji environment before enabling on mainnet
4. Review with Technical Lead
5. Update `AXIOM_AVALANCHE_LIMITED_PILOT_ACCEPTED_RISK.md` to note guard is active

---

## Current Manual Alternative

Until the runtime guard is implemented, the following manual controls apply:

1. Operator checks `totalSupply()` before each mint
2. Operator verifies wallet is in pilot ledger
3. Operator verifies mint amount ≤ 1,000 AXUSD
4. Operator verifies cumulative would remain ≤ 2,500 AXUSD
5. Stop condition S04 (cap breach) triggers immediate halt

**Manual enforcement is the current enforcement mechanism. This is acceptable at the 2,500 AXUSD pilot cap level.**

---

*Axiom Protocol Internal — Runtime Guard Proposal v1.0.0 — 2026-05-14*  
*NOT IMPLEMENTED — recommended next engineering step after pilot launch confirmation*
