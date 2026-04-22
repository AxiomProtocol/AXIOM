# Axiom Protocol — Collateral Risk Policy

**Status:** Canonical. This document is the source of truth for which assets
may be admitted as collateral inside the Axiom capital infrastructure, what
runtime gates those assets must pass, and how the protocol responds when a
gate fails.

This policy is rendered verbatim at `/disclosure/collateral-risk-policy`. The
file at `documents/policies/collateral-risk-policy.md` is the canonical text.
Any change to the policy must change this file; the disclosure page reads it
at request time so the document and the page can never drift.

---

## 1. Purpose

Collateral admission is the single largest source of catastrophic loss in
on-chain credit systems. Most exploits do not break cryptography. They break
the assumption that an asset accepted as collateral is in fact what it claims
to be, is in fact priced correctly, and is in fact redeemable for value.

This policy codifies the controls that prevent that class of failure inside
Axiom. It applies to every asset onboarded to the capital infrastructure
registry (`cap_assets`) and to every borrow path that the policy evaluator
authorises.

## 2. Classification matrix

Every asset onboarded to `cap_assets` carries a `collateral_class` value in
addition to its existing `exposure_class`. The two are orthogonal:

- `exposure_class` (`UNRESTRICTED` / `RESTRICTED` / `ACCREDITED` /
  `INSTITUTIONAL`) governs **user eligibility** — who is allowed to hold or
  trade the asset.
- `collateral_class` (`GREEN` / `YELLOW` / `RED`) governs **asset admission
  to lending markets** — whether the asset may be borrowed against, and
  under what caps.

| Class | Meaning | Borrow allowed | Caps | Examples |
|-------|---------|----------------|------|----------|
| `GREEN` | Native, fully reserved, redeemable, oracle-stable. | Yes | Soft caps may apply | AXAU (allocated PAXG backing), PAXG (issuer-attested allocated gold) |
| `YELLOW` | Approved with constraints. Per-asset supply and borrow caps are mandatory; isolated-market only. | Yes, with caps | Mandatory per-asset cap loaded from `cap_risk_policies` | AXUSD-TREASURY (segregated reserve segment) |
| `RED` | Not admissible as collateral. May exist in the registry for accounting, custody or settlement purposes, but the policy evaluator will deny every BORROW. | No | N/A | Default for any newly onboarded asset until classification is approved |

**Fail-closed default.** New assets default to `RED`. Re-classification to
`GREEN` or `YELLOW` requires a documented rationale persisted in
`collateral_classification_rationale` and audited via the existing asset-update
event flow.

## 3. Smart-contract control checklist

Every asset admitted at `GREEN` or `YELLOW` must satisfy the controls below.
Operational evidence for each control is recorded in the asset's
classification rationale. This list is reproduced from the protocol control
checklist and is the operative checklist for admission review.

### Collateral listing architecture

- Collateral admission is whitelist-only.
- No permissionless collateral onboarding.
- Every asset has a unique risk profile struct.
- Every asset can be disabled independently.
- Every asset can be made non-borrowable independently.
- Every asset can have LTV set to zero independently.
- Every asset is isolated by market unless explicitly approved otherwise.

### Risk parameters per asset

- Supply cap.
- Borrow cap.
- Base LTV.
- Liquidation threshold.
- Liquidation bonus.
- Reserve factor.
- Oracle heartbeat limit.
- Max oracle deviation threshold.
- Collateral enabled flag.
- Borrow enabled flag.
- Deposit enabled flag.
- Withdrawal throttle capability.
- Frozen flag.
- Isolated-risk flag.
- Eligible reserve backing flag set to false by default.

### Validity checks beyond price

- Asset price check is separate from asset validity check.
- Validity adapter exists for every non-native asset.
- Validity adapter can return invalid even when oracle price is live.
- Borrowing is blocked when validity check fails.
- New collateral deposits can be blocked when validity check fails.
- Protocol supports auto-downgrade to non-borrowable state.
- Protocol supports auto-downgrade to LTV zero state.

### Bridge and wrapper defenses

- Bridged assets are denied by default.
- Wrapped assets are denied by default.
- Restaking and staking receipts are denied by default.
- External receipt tokens cannot enter core collateral pool.
- If ever approved, they must be ring-fenced in isolated markets only.
- Cross-chain proof assumptions are documented off-chain and referenced
  on-chain through policy flags.
- Bridge halt, exploit, or pause event can trigger immediate collateral
  disable.

### Oracle controls

- Oracle source per asset is explicitly configured.
- Stale oracle data blocks new borrowing.
- Excessive price deviation blocks new borrowing.
- Oracle failure does not leave asset borrowable.
- Thin-liquidity price spikes cannot increase borrowing power instantly.
- Time-weighted safeguards exist where applicable.
- Manual guardian override exists for oracle anomaly cases.

### Borrow path controls

- Borrow execution re-checks collateral validity at execution time.
- Borrow execution re-checks oracle freshness at execution time.
- Borrow execution re-checks caps at execution time.
- Borrow cannot proceed if asset enters paused or frozen state mid-transaction.
- Borrowed assets cannot escape if circuit breaker has been triggered.
- Core reserve assets are never backstopped by untrusted external collateral.

### Governance and access control

- Role separation exists between admin, guardian, risk committee, and
  settlement authority.
- Normal parameter changes are timelocked.
- Emergency disable path is not timelocked.
- Emergency powers are narrow and auditable.
- Every risk change emits a detailed event.
- Every collateral listing emits a detailed event.
- Every pause, freeze, disable, and cap update emits a detailed event.
- No single hot wallet has unrestricted control over all risk actions.

### Emergency controls

- Per-asset freeze.
- Per-asset pause.
- Per-asset LTV to zero.
- Per-asset borrow disable.
- Per-market unwind mode.
- Global borrow pause if systemic risk detected.
- Snapshot exposure function callable immediately.
- Bad debt segregation path exists.
- Incident mode can be activated without upgrading contracts.

### Monitoring and automation

- Monitor abnormal mint activity for wrapped assets.
- Monitor issuer blacklist or freeze events.
- Monitor reserve attestation failures.
- Monitor bridge incidents.
- Monitor abnormal borrow spikes.
- Monitor collateral concentration spikes.
- Monitor liquidity collapse conditions.
- Trigger alerts to guardian and risk committee automatically.
- Optional automated protection can set asset to safe mode pending review.

### Treasury separation

- Treasury reserves are segregated from experimental markets.
- Treasury cannot be implicitly exposed to isolated collateral failures.
- AXUSD core solvency logic is separated from external collateral markets.
- Experimental assets cannot contaminate core reserve accounting.

### Testing requirements

- Unit test for stale oracle borrow rejection.
- Unit test for invalid collateral borrow rejection.
- Unit test for emergency LTV zero behavior.
- Unit test for per-asset freeze.
- Unit test for isolated market containment.
- Unit test for bridge-event-triggered disable.
- Unit test for abnormal price spike not increasing borrow power improperly.
- Unit test for governance timelock on normal actions.
- Unit test for emergency bypass only on emergency functions.
- Adversarial test using fake wrapped collateral scenario.
- Adversarial test using compromised bridge scenario.
- Adversarial test using redemption failure with live market price.
- Insolvency simulation under rapid collateral impairment.

## 4. Non-negotiable rule

No external receipt, wrapper, bridged token, staking token, or synthetic
claim may be used as core collateral unless it passes full risk review and
is explicitly isolated.

## 5. Implementation doctrine

- Do not use price as a substitute for validity.
- Do not use liquidity as a substitute for redeemability.
- Do not use popularity as a substitute for safety.
- Do not allow external complexity to impair internal solvency.

## 6. Emergency triggers

The following internal events are recognised by the policy evaluator and the
risk integrity module. When any of them fires for an asset, the asset is
automatically downgraded to `RED` and emits the audit events listed.

| Trigger | Source | Audit event | Effect |
|---------|--------|-------------|--------|
| Oracle stale beyond per-asset budget | `lib/capinfra/marketData.ts` | `collateral.integrity_failed` (kind: `oracle_stale`) | Asset → `RED`. Subsequent BORROW denies with `COLLATERAL_INTEGRITY_FAILED`. |
| Reserve attestation missing or failed | `lib/capinfra/reserve` | `collateral.integrity_failed` (kind: `reserve_attestation_failed`) | Asset → `RED`. |
| Redemption failure observed (live market price still active) | Internal incident reporter | `collateral.integrity_failed` (kind: `redemption_failed`) | Asset → `RED`. |
| Bridge or issuer pause / freeze event observed | Internal monitor | `collateral.integrity_failed` (kind: `issuer_event`) | Asset → `RED`. |
| Guardian disable invoked | `POST /api/capinfra/risk/collateral/disable` | `collateral.guardian_disabled` | Asset → `RED`. Dual-actor recorded in `cap_admin_actions`. |

The integrity check is independent of price — a stale oracle alone is
sufficient to trigger downgrade. Price-only signals are never the sole gate.

## 7. Guardian disable path

Any `RISK_OPERATOR` (or `SUPER_ADMIN`) may invoke the guardian disable
endpoint to flip an asset to `RED` immediately, with a documented reason and
a distinct second actor. The endpoint is not timelocked. Re-admission is
**not** available through any inverse endpoint: returning an asset to
`GREEN` or `YELLOW` requires the audited policy publication path
(`cap_risk_policies` row + `policy.version.published` event), so every
re-admission is on the same review surface as a new listing.

## 8. Decision surface

The capital infrastructure policy evaluator
(`lib/capinfra/policy.ts → evaluatePolicy`) is the single decision point
for collateral admission. Adapters, portfolio services, and settlement code
must not duplicate collateral checks; they must call the evaluator.

When the evaluator denies a `BORROW` action for collateral reasons it
returns one of the following stable reason codes:

| Reason code | Meaning |
|-------------|---------|
| `COLLATERAL_CLASS_RED` | Asset is classified `RED` and is not borrowable. |
| `COLLATERAL_CAP_EXCEEDED` | Asset is `YELLOW` and the requested amount would exceed the active per-asset cap. |
| `COLLATERAL_INTEGRITY_FAILED` | An integrity trigger (oracle stale, reserve attestation, etc.) has flipped the asset; it must be re-admitted via the policy publication flow. |

These codes are mutable-state — the policy evaluator bypasses its
idempotency cache for them so a stale `ALLOW` cannot be honoured after a
guardian disable, and a stale `DENY` cannot block once an asset is
re-admitted through publication.

---

*Last revised in policy version `2026-04-21.1`.*
