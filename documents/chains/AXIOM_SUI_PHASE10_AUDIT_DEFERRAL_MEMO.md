# Axiom Protocol — Sui Phase 10 Audit Deferral Memo
**Version:** 1.0 | **Phase:** 10 | **Date:** 2026-05-15
**Classification:** Internal Governance

---

## Decision

External Move security audit for the `axiom_claim_mainnet_candidate` package is **formally deferred** pending engagement of a qualified auditor. This deferral is accepted as a temporary operational risk under Risk ID R-SUI-01.

**Deferral accepted by:** Protocol Operations
**Acceptance date:** 2026-05-15
**Remediation deadline:** 2026-07-14

---

## Package Under Review

| Item | Value |
|---|---|
| Package ID | `0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487` |
| Source | `sui/packages/axiom_claim_mainnet_candidate/` |
| Modules | `axiom_mainnet_claim`, `claim_campaign`, `guarded_treasury`, `merkle` |
| Upgrade policy | IMMUTABLE — UpgradeCap destroyed |
| Internal test coverage | 28/28 tests pass |

---

## Rationale for Deferral

**1. Token classification**
AMC is a non-financial community reward token. It carries no monetary value, is not redeemable, is not reserve-backed, and is not connected to any Axiom financial product (AXUSD, AXAU, AXM).

**2. Immutability**
The package is permanently immutable. No upgrade vector exists post-deployment. Audit findings, if any, would require deploying a new package and migrating the campaign — not patching in place.

**3. Internal hardening**
All seven hardening measures (A1–A7) have been applied and tested:
- A1: MAX_PROOF_DEPTH = 20 guard (prevents gas griefing)
- A2: Duplicate claim guard via Table<address, bool>
- A3: Pool sufficiency check before payout
- A4: GuardedTreasury wraps TreasuryCap — no loose TreasuryCap exposed
- A5: MAX_SUPPLY enforced in all mint paths
- A6: AdminCap required for all operator-privileged functions
- A7: Campaign expiry via expires_at_epoch

**4. Scale**
Initial distribution: 4 AMC (4,000,000 base units) across 4 eligible wallets. Financial exposure is zero.

**5. Audit timeline**
Qualified Move auditors (OtterSec, Anza, MoveBit, Zellic) have booking lead times of 4–12 weeks. Deferring launch to await audit completion would delay community distribution for a non-financial token with no meaningful risk profile.

---

## Risk Acknowledgment

By deferring the audit, Axiom Protocol accepts the following residual risk:

- Unknown vulnerabilities in Move code could theoretically allow proof bypass or pool drain.
- If such a vulnerability were exploited, the impact would be limited to AMC tokens (no monetary value).
- The package is immutable — a critical vulnerability would require deploying a new package.
- The on-chain `claimed` Table prevents any address from claiming more than once, regardless of other vulnerabilities.

This risk is formally recorded in the Accepted Risk Register (R-SUI-01).

---

## Audit Engagement Plan

**Target firms (in priority order):**
1. OtterSec — Move specialization, Sui ecosystem experience
2. MoveBit — Move-native audit firm
3. Zellic — Sui audit experience
4. Anza — Sui core team affiliated

**Scope for audit:**
- `claim_campaign.move` — campaign lifecycle, claim verification, admin controls
- `guarded_treasury.move` — supply cap enforcement, mint path
- `merkle.move` — proof verification correctness, depth guard
- `axiom_mainnet_claim.move` — token initialization, OTW pattern

**Engagement timeline:**
- 2026-05-15: Begin outreach to audit firms
- 2026-06-01: Target: signed audit engagement
- 2026-07-01: Target: audit report received
- 2026-07-14: Deadline: findings reviewed and public summary published

**Note:** Because the package is immutable, the audit is for transparency and trust-building purposes, not for patching. Critical findings would inform decisions about new campaign deployments.

---

## Public Disclosure

This deferral is disclosed publicly at `/sui/disclosure`.

---

*Deferral memo v1.0 · Axiom Protocol Sui Phase 10 · 2026-05-15*
