# AXIOM SUI PHASE 9 — ACCEPTED RISK MEMO

**Date:** 2026-05-15
**Classification:** Operator Internal — Production Risk Decision
**Prepared by:** Engineering (Axiom Protocol)
**Status:** OPERATOR AUTHORIZED

---

## Purpose

This memo documents three production control gaps that have been assessed, evaluated, and explicitly accepted by the operator for the Phase 9 mainnet release of the Axiom Protocol Sui community distribution layer. These accepted risks are temporary and carry documented migration timelines.

This memo does not represent a legal waiver. It is an internal engineering risk register entry.

---

## Scope

**System in scope:** Axiom Protocol Sui community distribution layer.
**Network:** Sui Mainnet.
**Asset:** ATC test token — community rewards only.

**Out of scope:**
- AXUSD (Arbitrum One)
- AXAU (Arbitrum One)
- AXM governance token
- Any reserve-backed asset
- Any banking or fiat rail
- Capinfra settlement runtime

This system is community distribution only. No monetary value. No reserves.

---

## Accepted Risk 1 — External Independent Move Audit Deferred

### Risk Description
The smart contract code has not undergone a formal independent Move security audit by a qualified third-party security firm prior to mainnet deployment.

### Internal Mitigations Applied
- Phase 8 hardening items A1–A7 implemented and tested
- 28/28 Move unit tests passing
- Internal security checklist completed (AXIOM_SUI_PHASE8_SECURITY_REVIEW.md)
- All 4 open findings from Phase 8 security review are INFO or LOW severity
- No financial asset issuance, no reserve backing, no fiat convertibility

### Risk Level Assessment
MEDIUM — Accepted for temporary operation.
The system distributes a test token with no monetary value and no reserve backing. The financial impact of an exploitable vulnerability is limited to test token supply inflation, not loss of user funds.

### Acceptance Rationale
The operator has assessed that the risk of undetected vulnerabilities in a non-financial community distribution layer is acceptable for the duration of the audit procurement period, given the compensating controls above.

### Required Action — Audit
Engage a qualified Sui/Move security firm within 60 days of mainnet publish.
Candidate firms: OtterSec, MoveBit, Beosin (Move division), Zellic.
Upon audit completion, act on all HIGH and CRITICAL findings before any expansion of distribution scope.

### Accepted by
Operator (Engineering Lead)
Date: 2026-05-15

---

## Accepted Risk 2 — Multisig Custody Deferred

### Risk Description
The AdminCap for the mainnet package is currently held by a single deployer wallet rather than the planned 2-of-3 multisig configuration.

Single-wallet custody means:
- Compromise of the deployer private key = full administrative control by attacker
- No second-factor authorization for pause, close, root rotation, or AdminCap transfer
- No recovery path if the key is lost

### Internal Mitigations Applied
- AdminCap is held by a hardware-controlled deployer address (not a hot wallet)
- Deployer key is stored in environment secret management, not in source code
- `close_campaign()` and `pause()` are the worst-case attacker actions — they stop distribution, not drain user funds
- No mint authority is held by a user-accessible path
- Migration path is documented (AXIOM_SUI_PHASE9_CUSTODY_EXCEPTION.md + AXIOM_SUI_PHASE9_MULTISIG_MIGRATION.md)

### Risk Level Assessment
MEDIUM — Accepted for temporary operation.
The worst-case attacker action with the AdminCap is: pausing or permanently closing the campaign (denial of service to claimants), or rotating the Merkle root (eligibility manipulation). There are no user fund custody risks — the claim pool is pre-funded tokens, not user deposits.

### Acceptance Rationale
The 2-of-3 key ceremony requires Engineering Lead, Operations Lead, and Emergency Recovery participation. This coordination is in progress. Single-wallet custody is an acceptable bridge state for a community distribution system with no financial value.

### Required Action — Multisig Migration
Complete 2-of-3 key ceremony and AdminCap transfer within 30 days of mainnet publish.
Procedure: AXIOM_SUI_PHASE9_MULTISIG_MIGRATION.md.

### Accepted by
Operator (Engineering Lead)
Date: 2026-05-15

---

## Accepted Risk 3 — Production Authorization Signed by Single Party

### Risk Description
The production authorization for Phase 9 mainnet deployment is authorized by the Engineering Lead only, without co-signature from Operations Lead and Legal/Compliance.

### Acceptance Rationale
The system distributes a test token with no monetary value. The three-party signature requirement was designed for systems that touch financial rails, reserves, or user funds. This system does not qualify under those criteria. Engineering Lead authorization is sufficient for a non-financial community distribution layer.

A record of operator authorization is produced in AXIOM_SUI_PHASE9_PRODUCTION_AUTHORIZATION.md.

### Required Action
Full three-party authorization review within 90 days for any change in scope (e.g., if distribution is expanded, a financial instrument is added, or reserve backing is introduced).

### Accepted by
Operator (Engineering Lead)
Date: 2026-05-15

---

## Summary Table

| Risk | Severity | Status | Mitigation Deadline |
|---|---|---|---|
| No external Move audit | MEDIUM | ACCEPTED — 60-day audit window | 60 days post-mainnet |
| Single-wallet AdminCap custody | MEDIUM | ACCEPTED — 30-day multisig window | 30 days post-mainnet |
| Single-party authorization | LOW | ACCEPTED for non-financial distribution | 90 days (scope review) |

---

## Kill Switch Procedure

If a vulnerability is discovered before the audit completes:

1. Operator calls `pause_campaign()` via the deployer wallet CLI immediately
2. If pause is insufficient, call `close_campaign()` — permanent, irreversible, stops all claims
3. Notify all known participants via community channels
4. Engage security firm for emergency assessment
5. Do not attempt to publish a hotfix without external review

The frozen package design means there is no upgrade path. The only recourse after a serious vulnerability is permanent campaign closure and redeployment of a new audited package.

---

*Axiom Protocol — Sui Phase 9 Risk Register*
*Document type: Internal risk acceptance memo. Not legal advice. Not a regulatory filing.*
