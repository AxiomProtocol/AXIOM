# Axiom Protocol — Timelock Migration Plan

**Status:** Canonical. This document drives the per-role status surface
on `/trust/governance`. When a row here changes, the public page
reflects it on the next request.

**Version:** `2026-04-22.1`

---

## 1. Why this document exists

`/trust/governance` lists every privileged role across the protocol.
Roles still controlled by an externally-owned account (EOA) are
disclosed honestly with a planned migration target. This document is
that plan.

The design principle: substantive control surfaces (CollateralGuard,
IncidentController halt switch) protect the protocol regardless of
whether the operator role is timelocked, but the operator role itself
should still migrate to a `TimelockController` so that any
configuration change has a public delay and can be observed by
allocators before it takes effect.

## 2. Delay tiers

Three delay tiers, picked per role based on how disruptive an
attacker-driven configuration change would be:

- **FAST_PATH (no timelock)** — halt-only authority on
  `IncidentController`. Halts must be instant. Halt actions are
  log-only and cannot move funds.
- **STANDARD_DELAY (48 hours)** — operator roles that can change
  parameters but cannot move funds. The 48-hour window matches the
  shortest meaningful incident-response window for a US-business-day
  cycle.
- **GOVERNANCE_DELAY (14 days)** — roles that can move funds, change
  custodian, or change the upgrade authority. Matches the comment
  window in the Loss Coverage Reserve policy.

## 3. Migration schedule

| Role / Surface                          | Current State | Target Tier      | TimelockController Address | Status     | Target Date  |
|-----------------------------------------|---------------|------------------|----------------------------|------------|--------------|
| BitGo Custody (treasury)                | MULTI_PARTY   | n/a              | n/a                        | LIVE       | n/a          |
| Increase (fiat operations)              | MULTI_PARTY   | n/a              | n/a                        | LIVE       | n/a          |
| AXUSD ERC-3643 controller               | MULTI_PARTY   | GOVERNANCE_DELAY | TBD                        | PLANNED    | 2026-Q3      |
| CollateralGuard governor                | EOA           | STANDARD_DELAY   | TBD                        | PLANNED    | 2026-Q3      |
| IncidentController GOVERNOR_ROLE        | EOA           | STANDARD_DELAY   | TBD                        | PLANNED    | 2026-Q3      |
| IncidentController GUARDIAN_ROLE (halt) | EOA           | FAST_PATH        | n/a                        | LIVE       | n/a          |
| AXIOMFixedLoan operator                 | EOA           | STANDARD_DELAY   | TBD                        | PLANNED    | 2026-Q4      |
| MintRedeemController governor (AXAU)    | EOA           | STANDARD_DELAY   | TBD                        | PLANNED    | 2026-Q4      |
| WithdrawalRateLimiter governor          | n/a           | STANDARD_DELAY   | TBD                        | NOT_DEPLOYED | 2026-Q3    |
| WithdrawalRateLimiter guardian          | n/a           | FAST_PATH        | n/a                        | NOT_DEPLOYED | 2026-Q3    |
| Solvency snapshot endpoint              | PUBLIC_READ_ONLY | n/a           | n/a                        | LIVE       | n/a          |

**TBD** entries are placeholders for `TimelockController` addresses
that will be deployed by `AXIOM/scripts/deploy-timelocks.ts`. As each
deployment lands on Arbitrum One, the TBD will be replaced with the
deployed address and the Status column will move from PLANNED to LIVE.

## 4. Migration order

1. Deploy `TimelockController` contracts via `deploy-timelocks.ts`,
   one per delay tier (one STANDARD_DELAY, one GOVERNANCE_DELAY).
2. Each role-holding contract calls its `setGovernor` (or equivalent)
   to point at the matching `TimelockController`. The migration is
   atomic per contract — no role is half-timelocked.
3. The capinfra append-only audit-events table records each
   migration with the on-chain transaction hash.
4. This document is updated. The Status column on `/trust/governance`
   moves to LIVE for that row on the next request.

## 5. Reversibility

Migrations can be reversed only by the active governor at the time
of reversal. Once a `TimelockController` is the governor, that means
a 48-hour or 14-day public delay before any reversal can take effect.
This is the desired property: no sudden de-timelocking.

## 6. Rationale for partial-state honesty

Some allocators expect "fully timelocked or it does not count." Our
position: protecting users with substantive on-chain controls
(CollateralGuard, IncidentController halt, default-deny on bridges)
matters more than performative timelocking of every operator role on
day one. We disclose the partial state honestly, ship the substantive
controls now, and migrate the operator roles on the schedule above.

If you are an allocator and the partial state is a blocker, contact
us. We will accelerate any specific role on the schedule above on
documented allocator demand.
