# AXIOM SUI PHASE 9 — CUSTODY EXCEPTION NOTICE

**Date:** 2026-05-15
**Classification:** Operator Internal
**Status:** ACTIVE EXCEPTION — Pending multisig migration

---

## Exception Summary

The Axiom Protocol Sui Phase 9 mainnet package AdminCap is being held under temporary single-wallet custody rather than the planned 2-of-3 multisig configuration.

This exception is formally accepted and documented in AXIOM_SUI_PHASE9_ACCEPTED_RISK_MEMO.md.
The migration plan is in AXIOM_SUI_PHASE9_MULTISIG_MIGRATION.md.

---

## Current Custody State

| Item | Value |
|---|---|
| AdminCap holder | Deployer wallet (single) |
| Deployer address | Recorded in operator console (sui-phase9.tsx) |
| Key storage | Environment secret management |
| Key access | Engineering Lead only |
| Multisig status | NOT YET IMPLEMENTED |
| Exception expiry | 30 days from mainnet publish |

---

## What the AdminCap Controls

The AdminCap is the sole authorization required for all privileged campaign operations:

| Operation | Risk if Compromised |
|---|---|
| `pause_campaign()` | Claimants blocked temporarily |
| `unpause_campaign()` | Claims re-enabled |
| `close_campaign()` | Permanent closure — irreversible |
| `update_merkle_root()` | Eligibility list can be changed |
| `transfer_admin_cap()` | Custody transferred to attacker |
| `destroy_admin_cap()` | Admin capability permanently destroyed |

The AdminCap does NOT control:
- User wallet balances
- Mint of any Axiom canonical asset
- Any fiat or banking rail
- Reserve infrastructure

---

## Compensating Controls During Exception Period

1. Deployer wallet key is in environment secret management — not in source code or build artifacts
2. The Engineering Lead is the sole authorized accessor
3. Campaign state is publicly visible on-chain — any unauthorized pause or close will be immediately visible
4. The package is frozen — no upgrade can be deployed by the attacker even with the AdminCap
5. A kill-switch procedure exists (AXIOM_SUI_PHASE9_ACCEPTED_RISK_MEMO.md §Kill Switch)

---

## Exception Expiry

This exception expires 30 days from the mainnet publish date.
If multisig migration is not complete by that date:
1. The exception must be renewed with explicit operator authorization
2. An incident report is filed explaining the delay
3. The audit window must not be further extended simultaneously

---

## Escalation

If the deployer key is believed to be compromised:
1. Immediately call `close_campaign()` from the deployer wallet to halt all activity
2. Notify Engineering Lead, Operations Lead, and all known community participants
3. Do not attempt to transfer AdminCap using the potentially-compromised key without legal/security consultation
4. Engage Sui Foundation's security disclosure process if on-chain state is affected

---

*Axiom Protocol — Sui Phase 9 Custody Exception*
*This is an internal controls document. Not legal advice.*
