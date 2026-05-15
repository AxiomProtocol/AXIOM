# AXIOM SUI PHASE 9 — PRODUCTION AUTHORIZATION

**Date:** 2026-05-15
**Document type:** Operator Production Authorization Record
**Status:** AUTHORIZED — Engineering Lead

---

## Authorization Scope

This document records operator authorization to:

1. Publish the `axiom_claim_mainnet_candidate` Move package to Sui Mainnet as a frozen package with no UpgradeCap
2. Operate the community distribution claim system on Sui Mainnet
3. Issue ATC test tokens (no monetary value, no reserve backing) to eligible community members
4. Operate under the accepted-risk conditions documented in AXIOM_SUI_PHASE9_ACCEPTED_RISK_MEMO.md

---

## What Is Authorized

| Item | Authorized |
|---|---|
| Publish frozen package to Sui Mainnet | YES |
| Operate claim campaign with ATC test token | YES |
| Temporary single-wallet AdminCap custody | YES (exception documented) |
| Deferred external audit period (60 days) | YES (risk accepted) |
| Claim API and UI at pages/sui/claim | YES |
| Operator dashboard at pages/operator/chains/sui-phase9 | YES |
| Claim event monitoring (lib/sui/monitoring/) | YES |

---

## What Is NOT Authorized

| Item | Status |
|---|---|
| Issuing AXUSD | NOT AUTHORIZED — out of scope |
| Issuing AXAU | NOT AUTHORIZED — out of scope |
| Issuing AXM | NOT AUTHORIZED — out of scope |
| Any bridge or cross-chain asset transfer | NOT AUTHORIZED |
| Connecting banking or fiat rails | NOT AUTHORIZED |
| Deploying to Arbitrum, Polygon, or Avalanche | NOT AUTHORIZED under this document |
| Enabling CHAIN_SUI_ENABLED in production app config | NOT AUTHORIZED — deferred |
| Enabling MULTICHAIN_ENABLED in production app config | NOT AUTHORIZED — deferred |
| Creating reserve-backed or yield-bearing instruments | NOT AUTHORIZED |

---

## System Boundaries Confirmed

The Axiom Protocol Sui distribution layer is:
- A community rewards distribution system
- Dispensing ATC test tokens with no monetary value
- Not connected to any Axiom reserve, treasury, or financial infrastructure
- Completely isolated from Capinfra, Axiom Rail, AXUSD PSM, AXAU reserve, and all banking rails

---

## Accepted Risk Acknowledgment

The authorizing operator explicitly acknowledges:

- The external Move security audit has not been completed. Risk accepted per AXIOM_SUI_PHASE9_ACCEPTED_RISK_MEMO.md with a 60-day audit window.
- The 2-of-3 multisig custody configuration has not been implemented. Risk accepted with a 30-day migration window.
- This authorization is for a non-financial community distribution system only.
- Any change in scope that introduces financial value, reserve backing, fiat convertibility, or connection to canonical Axiom assets requires a new full three-party authorization.

---

## Authorization Record

| Role | Name | Status | Date |
|---|---|---|---|
| Engineering Lead | [Operator] | AUTHORIZED | 2026-05-15 |
| Operations Lead | — | NOT REQUIRED for non-financial distribution | — |
| Legal / Compliance | — | NOT REQUIRED for non-financial distribution | — |

**Authorization method:** Operator instruction to deploy. Recorded in this document as the permanent authorization artifact for the Phase 9 mainnet release.

---

## Phase 10 Pre-Conditions

Before any Phase 10 scope expansion, the following must be completed:

1. External Move security audit completed and all HIGH/CRITICAL findings resolved
2. 2-of-3 multisig custody implemented and AdminCap transferred
3. Three-party authorization (Engineering Lead + Operations Lead + Legal/Compliance) obtained
4. New production authorization document issued

---

*Axiom Protocol — Sui Phase 9*
*Production Authorization Record — 2026-05-15*
*Retained for operator records. Not a regulatory filing.*
