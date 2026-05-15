# Axiom Protocol — Sui Support Escalation Matrix
**Version:** 1.0 | **Phase:** 10 | **Date:** 2026-05-15
**Scope:** AMC community distribution only.

---

## Escalation Tiers

### L1 — User Support
**Who:** Community moderators, support inbox
**Scope:** Wallet connection, basic eligibility questions, already-claimed, token visibility
**Response SLA:** 24 hours
**Can resolve:** Scenarios 1, 2, 4, 10, 11 (see Support Playbook)
**Escalate to L2 when:**
- Technical errors the user cannot resolve by following playbook steps
- Proof generation failures not resolved by retry
- Claim transaction failures with unknown error codes
- Any security concern reported by a user

---

### L2 — Technical Operations
**Who:** Technical ops team
**Scope:** API health, proof system, RPC connectivity, transaction debugging
**Response SLA:** 4 hours
**Can resolve:** Proof API errors, RPC degradation, transaction error diagnosis
**Escalate to L3 when:**
- Campaign state is unexpected (paused without operator action, closed unexpectedly)
- Proof API is completely down
- Multiple users reporting the same failure simultaneously
- Any anomaly detected by monitoring (see `/api/health/sui-monitoring`)
- Any suspected security event

---

### L3 — Protocol Operations
**Who:** Protocol engineering and operations leads
**Scope:** On-chain campaign controls (pause/unpause/close), eligibility questions, merkle root decisions
**Response SLA:** 2 hours
**Can resolve:** Campaign pause/unpause, merkle root corrections, RPC provider switching, eligibility disputes
**Escalate to L4 when:**
- AdminCap wallet may be compromised
- Unexpected on-chain events (minting, unexpected state changes)
- Public misinformation that requires official statement
- Legal inquiry

---

### L4 — Founder Escalation
**Who:** Founder / executive level
**Scope:** Security incidents, legal, key compromise, public communications
**Response SLA:** 1 hour
**Actions:** Wallet migration, public statements, legal coordination, protocol shutdown decisions

---

## Issue Classification Matrix

| Issue | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| Wallet connection | Resolve | — | — | — |
| Wrong network | Resolve | — | — | — |
| Not eligible | Resolve | Review | Decide | — |
| Already claimed | Resolve | — | — | — |
| Token not visible | Resolve | — | — | — |
| Proof generation error | Triage | Resolve | — | — |
| Claim tx stuck | Triage | Resolve | — | — |
| RPC outage | Escalate | Monitor | Resolve | — |
| Campaign paused (expected) | Inform | — | — | — |
| Campaign paused (unexpected) | Escalate | Escalate | Resolve | — |
| Campaign closed (unexpected) | Escalate | Escalate | Investigate | Notify |
| Proof API down | Escalate | Resolve | — | — |
| Security event | Escalate | Escalate | Escalate | Resolve |
| AdminCap compromise | Escalate | Escalate | Escalate | Resolve |
| Public misinformation | Inform | — | Draft | Publish |
| Legal inquiry | Escalate | Escalate | Escalate | Resolve |

---

## Escalation Communication Template

```
ESCALATION — Sui AMC Support
Tier: L[X] → L[X+1]
Time: [ISO timestamp]
Reporter: [name/handle]
Issue summary: [1-2 sentences]
User wallet (if applicable): [address or redacted]
Error details: [paste verbatim]
Steps already tried: [list]
Monitoring data: [paste /api/health/sui-monitoring output if relevant]
```

---

*Matrix version 1.0 · Axiom Protocol Sui Phase 10 · 2026-05-15*
