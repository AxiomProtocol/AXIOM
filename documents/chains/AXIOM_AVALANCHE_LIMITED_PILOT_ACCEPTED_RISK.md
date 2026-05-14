# Axiom Protocol — Avalanche Limited Pilot Accepted-Risk Record

**Document type:** Accepted-Risk Authorization  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Version:** 1.0.0  
**Created:** 2026-05-14  
**Signature status:** TEMPLATE / PENDING SIGNATURE  

> This document has not been signed. The fields below are pre-populated
> from known system state and policy. No acceptance has been forged.
> This record becomes binding only upon signature by the named parties.

---

## Purpose

This document records the explicit, informed acceptance of operational risks associated with entering Avalanche Limited Pilot Mode before the full production control suite (Gnosis Safe, external audit, role migration) is in place. Acceptance is required before any mainnet pilot mint is executed.

---

## Accepted-Risk Statement

The parties named below acknowledge and accept that the Axiom Protocol Avalanche C-Chain deployment is operating under the following conditions during the limited pilot period:

1. **The deployer EOA retains DEFAULT_ADMIN, AGENT_ROLE, and MINTER_ROLE** on all 8 ERC-3643 contracts. No multi-party authorization structure (Gnosis Safe) is in place.

2. **The deployer private key (`DEPLOYER_PRIVATE_KEY`) is a shared infrastructure key**, also used for other protocol operations. Cold-storage migration is temporarily deferred.

3. **No external security audit has been performed.** An internal technical review (Gate 6) was conducted as a compensating control. External firm engagement is deferred until before meaningful TVL.

4. **No meaningful TVL is permitted during the pilot.** Total AXUSD minted must not exceed 2,500 AXUSD. Single-wallet mint cap is 1,000 AXUSD. These caps are manual controls, not on-chain enforcement.

5. **Pilot is time-limited or cap-limited.** The pilot period ends at whichever comes first: (a) cumulative minted reaches 2,500 AXUSD; (b) any stop condition in the Pilot Policy is triggered; (c) the operator formally closes the pilot and begins full production transition.

6. **The pilot must halt immediately** if any stop condition in `AXIOM_AVALANCHE_LIMITED_PILOT_POLICY.md §9` is triggered.

7. **Arbitrum One remains the canonical settlement chain.** No Avalanche pilot activity changes Arbitrum canonical status.

---

## Risk Matrix

| Risk ID | Risk Description | Accepted | Compensating Control |
|---|---|---|---|
| R01 | Deployer EOA holds all sensitive roles | YES — pilot scope only | Pilot cap 2,500 AXUSD; no automated minting; cold storage target |
| R02 | No external security audit | YES — pilot scope only | Internal Gate 6 review; transfer cap; US-only gate |
| R03 | Shared deployer key | YES — temporarily deferred | Cold-storage migration before pilot close or TVL cap |
| R04 | Reconciliation cron not scheduled | YES — manual initially | Operator runs reconciliation after every mint |
| R05 | Snowtrace not verified | YES — within 7 days | Bytecode verification completed via RPC; source pending |

---

## Acceptance Fields

### Acceptance 1 — Technical Lead

```
accepted_by:       [TECHNICAL LEAD NAME — PENDING SIGNATURE]
role:              Technical Lead
timestamp:         [DATE] [TIME] UTC
scope:             Avalanche Limited Pilot Mode — chainId 43114
                   Total cap: 2,500 AXUSD
                   Single-wallet cap: 1,000 AXUSD
                   US-only jurisdiction (840)
                   Operator-controlled minting only

reason_for_deferral:
  Role migration requires Gnosis Safe deployment and multi-party coordination.
  External audit requires procurement and scheduling. These are not blocking
  for a controlled pilot with strict caps and operator-only minting.

expiration_condition:
  This acceptance expires when ANY of the following occurs:
  (a) Cumulative pilot minted reaches 2,500 AXUSD
  (b) Any stop condition in Pilot Policy §9 is triggered
  (c) TVL is proposed to exceed pilot cap
  (d) Non-operator minting is requested
  (e) 90 calendar days from signature date

required_remediation_path:
  1. Deploy Gnosis Safe on Avalanche mainnet
  2. Migrate DEFAULT_ADMIN, AGENT_ROLE, MINTER_ROLE to Safe
  3. Deployer EOA renounces all roles
  4. Engage external EVM security firm
  5. Obtain signed audit report before production scale

signature:         _________________________ [PENDING]
```

---

### Acceptance 2 — Operations Lead

```
accepted_by:       [OPERATIONS LEAD NAME — PENDING SIGNATURE]
role:              Operations Lead
timestamp:         [DATE] [TIME] UTC
scope:             Avalanche Limited Pilot Mode — chainId 43114
                   Operator-controlled minting
                   Pilot ledger maintenance required
                   Daily monitoring required

reason_for_deferral:
  Deployer key cold-storage migration requires operational coordination.
  Reconciliation cron scheduling requires infrastructure provisioning.
  Neither is a blocker for operator-supervised manual pilot minting.

expiration_condition:
  Same as Technical Lead acceptance conditions above.
  Additionally expires if daily monitoring is missed for 2 consecutive days.

required_remediation_path:
  1. Move DEPLOYER_PRIVATE_KEY to cold storage (before pilot close)
  2. Schedule daily reconciliation cron against mainnet
  3. Complete Snowtrace source verification (by 2026-05-21)

signature:         _________________________ [PENDING]
```

---

### Acceptance 3 — Compliance Counsel

```
accepted_by:       [COMPLIANCE COUNSEL NAME — PENDING SIGNATURE]
role:              Compliance Counsel
timestamp:         [DATE] [TIME] UTC
scope:             Avalanche Limited Pilot Mode — chainId 43114
                   US-only jurisdiction (840) — on-chain enforced
                   ERC-3643 compliance stack active
                   No public user onboarding
                   No institutional access

reason_for_deferral:
  ERC-3643 compliance enforcement (country gate, transfer cap) is active
  on-chain and verified. Pilot participants are operator-controlled and
  pre-approved. No public flows are enabled. Risk profile is consistent
  with internal testing and controlled pilot activity.

expiration_condition:
  Same as Technical Lead acceptance conditions above.
  Additionally expires if any non-US jurisdiction is requested for enablement.

required_remediation_path:
  1. External security audit before expanding jurisdiction allowlist
  2. Formal compliance review before public user onboarding
  3. Legal review of jurisdiction expansion before any country code added

signature:         _________________________ [PENDING]
```

---

## Execution Conditions

No pilot mint may be executed until:

- [ ] All three acceptances above are signed
- [ ] Participant wallet is pre-approved and recorded in pilot ledger
- [ ] Pre-mint checklist in `AXIOM_AVALANCHE_LIMITED_PILOT_CHECKLIST.md` is completed
- [ ] Operator confirms totalSupply + proposed mint amount ≤ 2,500 AXUSD

---

*Axiom Protocol Internal — Accepted-Risk Record v1.0.0 — 2026-05-14*  
*TEMPLATE / PENDING SIGNATURE — not binding until signed by all three parties*
