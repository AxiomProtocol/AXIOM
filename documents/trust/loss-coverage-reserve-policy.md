# Axiom Protocol — Loss Coverage Reserve Policy

**Status:** Canonical. This document governs the Loss Coverage Reserve
line that appears on `/disclosure` and `/trust/security`.

This file is read at request time by the public pages. Any change to
the policy must change this file.

---

## 1. Purpose

The Loss Coverage Reserve is a dedicated pool of capital, segregated
from operating reserves and from product-specific reserves (AXUSD
backing, AXAU backing), held against the residual risk of a control
failure inside the protocol.

It is **not**:

- An insurance product offered to users.
- A guarantee of redemption beyond disclosed reserves.
- A substitute for the per-product reserve ratios disclosed on
  `/disclosure`.

It is:

- A first-loss buffer the protocol commits to draw against, under the
  conditions defined in §3, before any user-facing impairment is
  declared.

## 2. Funding

The reserve is funded from:

1. A standing allocation of protocol revenue (target: 10% of
   net protocol revenue, reviewable by governance).
2. Initial seed capital from the operating entity, disclosed at
   stand-up.
3. Voluntary supplemental contributions, disclosed when received.

Funding events are recorded in the capinfra events table and reflected
in the next solvency snapshot.

## 3. Eligible draw conditions

The reserve may be drawn against ONLY for the following classes of
event, in order of priority:

1. **Smart-contract control failure** — a verified exploit, bug, or
   admission failure inside an Axiom-deployed contract that results
   in a measurable loss to a user with verified Axiom-platform
   ownership of the affected position.
2. **Oracle failure** — a verified oracle malfunction that results in
   liquidations or admissions inconsistent with the underlying
   asset's true price at the time of the event.
3. **Custody partner failure** — a verified loss event at BitGo or
   Increase to the extent not covered by the partner's own insurance,
   FDIC coverage, or fidelity bond.

The reserve is NOT drawn against for:

- Market losses (price movement is not a control failure).
- User error (lost keys, sent to wrong address, signed malicious
  transaction off-platform).
- Force majeure events outside the protocol's control surface
  (regulator action, internet outage, chain reorg).
- Smart-contract risk on third-party protocols the user voluntarily
  interacts with.

## 4. Claim process (Phase 1, manual)

1. Affected user submits a claim with: wallet address, position
   reference, transaction hashes, and a description of the event.
2. Operating entity confirms the event via on-chain inspection, the
   capinfra events table, and (where applicable) custody partner
   logs.
3. If the event qualifies under §3, the claim is paid from the
   reserve to the user's verified address.
4. The draw is recorded in the capinfra events table and disclosed
   on the next solvency snapshot.
5. A post-mortem is published to `documents/incidents/` within 72
   hours of claim payment.

Phase 2 will contractualize claim adjudication with on-chain
verifiers and a governance-controlled claims committee. Phase 1 is
manual and disclosed as such.

## 5. Address and balance disclosure

- The reserve address is published on `/trust/security` and
  `/disclosure`.
- The balance is read live from chain on every snapshot.
- Any movement of funds in or out of the reserve is timestamped in
  the capinfra events table and reflected in the next snapshot.

## 6. Limits and honest disclosure

- The reserve is finite. It is not a guarantee of full recovery for
  any class of event.
- The reserve does not back AXUSD, AXAU, or any specific product to
  par. Per-product reserves are separate and governed by their
  respective policies.
- The maximum payout per claim is capped at the lesser of (a) the
  user's documented loss, (b) the current reserve balance.
- Multiple concurrent qualifying claims are paid pro-rata if the
  reserve cannot cover the aggregate.

## 7. Governance

- Funding allocation, draw conditions, and the claim process are
  reviewable by community governance.
- Changes to this policy require a published proposal and a public
  comment window of no less than 14 days before any vote.
- This document is versioned by filename. The current version is
  reflected on `/disclosure` and `/trust/security` with the version
  string and timestamp.

**Version:** `2026-04-21.1`
