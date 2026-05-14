# Axiom Protocol — Avalanche Limited Pilot Policy

**Document type:** Limited Pilot Authorization Policy  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Version:** 1.0.0  
**Created:** 2026-05-14  
**Status:** ACTIVE — LIMITED PILOT MODE  
**Supersedes:** Post-Launch Restricted Mode (effective 2026-05-14)  

---

## Statement of Mode

The Axiom Protocol Avalanche C-Chain deployment is operating in **LIMITED PILOT MODE**.

This is not an unrestricted launch.  
This is not a full production launch.  
This is not open TVL.  
This is not institutional-ready.  

Minting is operator-controlled. Participant access is restricted. All compliance gates and safety controls remain active. Accepted-risk deferrals are documented and time-limited by cap or condition.

---

## 1. Pilot Purpose

The limited pilot establishes a controlled, low-TVL operational period on Avalanche mainnet to:

1. Confirm Capinfra AVALANCHE adapter behavior under live mainnet conditions (not Fuji)
2. Confirm ERC-3643 transfer compliance (country gate, transfer cap) against real on-chain participants
3. Confirm reserve reconciliation script behavior against real mainnet minting events
4. Generate a real operational record prior to Gnosis Safe role migration and external audit
5. Identify any operational gaps before scaling to meaningful TVL

---

## 2. Scope

| Scope Item | In Pilot | Excluded from Pilot |
|---|---|---|
| Avalanche C-Chain mainnet | ✓ | — |
| Arbitrum One | — | Remains canonical — no change |
| AXUSD minting (operator-controlled) | ✓ (capped) | Open/automated minting |
| ERC-3643 compliance enforcement | ✓ Active | — |
| Public user onboarding | — | Excluded from pilot |
| Institutional investor access | — | Excluded from pilot |
| ACH / wire rails | — | Deferred — not in scope |
| Fiat redemption / bank payout | — | Deferred — not in scope |
| Additional jurisdictions beyond US | — | Excluded from pilot |
| Polygon, Sui | — | Not touched |

---

## 3. Allowed Users

| User Type | Allowed |
|---|---|
| Protocol operators (identified by operator wallet) | ✓ Yes |
| Founder wallets (pre-approved, explicitly listed) | ✓ Yes |
| Explicitly approved test participants (wallet pre-registered) | ✓ Yes |
| General public | ✗ No |
| Unverified wallets | ✗ No |
| Non-US-domiciled participants | ✗ No |

All participant wallets must be:
1. Explicitly pre-approved by the operator before any mint
2. US-domiciled (jurisdiction code 840)
3. Registered in the pilot ledger (`AXIOM_AVALANCHE_LIMITED_PILOT_LEDGER.md`) before first mint

---

## 4. Allowed Jurisdiction

**United States only (ISO 3166-1 numeric: 840)**

This is enforced on-chain at the CountryAllowModule level. Non-US transfers will be rejected by the smart contract regardless of operator intent. No additional jurisdictions will be enabled during the pilot period.

---

## 5. Minting Model

**Operator-controlled only.**

- All minting decisions are made manually by an authorized operator
- Each mint requires: participant wallet pre-approval + operator initials in pilot ledger
- No automated minting process is active during pilot
- Each mint must be followed by immediate reconciliation verification

Minting authority currently resides with the deployer EOA (`0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`). This is an accepted-risk configuration documented in `AXIOM_AVALANCHE_LIMITED_PILOT_ACCEPTED_RISK.md`.

---

## 6. Pilot Caps

| Cap | Value | Enforcement |
|---|---|---|
| **Total pilot TVL cap** | 2,500 AXUSD | Manual — operator must not exceed; reconciliation monitors |
| **Total AXUSD minted cap** | 2,500 AXUSD | Manual — operator checks totalSupply before each mint |
| **Single-wallet mint cap** | 1,000 AXUSD | Manual — operator enforces at time of mint |
| **Per-wallet daily transfer cap** | 5,000 AXUSD/day | On-chain — enforced by TransferLimitModule |
| **Allowed jurisdictions** | US only (840) | On-chain — enforced by CountryAllowModule |

**Note:** The on-chain transfer cap (5,000 AXUSD/day) exceeds the single-wallet mint cap (1,000 AXUSD) by design. The transfer cap is a circuit-breaker; the mint cap is the primary pilot constraint. Caps are additive controls, not competing ones.

**Cap breach is a stop condition.** See Section 9.

---

## 7. Accepted Deferrals

The following controls are explicitly deferred for the pilot period. These deferrals are accepted risks, not oversights. Each has a defined remediation path.

| Deferral | Control | Deferred Until | Risk Level |
|---|---|---|---|
| D01 | Gnosis Safe deployment | Before meaningful TVL scale | CRITICAL |
| D02 | DEFAULT_ADMIN role migration to Safe | After Safe deployment | CRITICAL |
| D03 | AGENT_ROLE migration to dedicated ops address | Before meaningful TVL | CRITICAL |
| D04 | MINTER_ROLE migration to issuance process | Before meaningful TVL | CRITICAL |
| D05 | Deployer EOA role renunciation | After D02–D04 complete | CRITICAL |
| D06 | DEPLOYER_PRIVATE_KEY cold-storage migration | Temporarily deferred — see note | HIGH |
| D07 | External security audit | Before TVL exceeds pilot cap | HIGH |

**D06 note:** Cold-storage migration requires coordination to avoid disrupting the operator's ability to execute pilot mints. Migration to cold storage must occur before any TVL exceeds 2,500 AXUSD or at the close of the pilot period, whichever comes first.

Full accepted-risk record: `AXIOM_AVALANCHE_LIMITED_PILOT_ACCEPTED_RISK.md`

---

## 8. Required Monitoring During Pilot

| Monitoring Item | Frequency | Method |
|---|---|---|
| Reserve reconciliation (totalSupply vs Capinfra auth) | After every mint + daily | `scripts/reconcile-avalanche-reserve.ts` |
| Deployer key activity check | Daily | On-chain nonce + transaction monitoring |
| Role-state check | Before each mint | Read-only RPC: `isAgent(deployer)`, role queries |
| Transfer module status | Before each mint | Read-only RPC: `getTransferLimit(MC)` |
| Country allowlist status | Before each mint | Read-only RPC: `isCountryAllowed(MC, 840)` |
| Pilot cap check | Before each mint | Compare `totalSupply()` against 2,500 AXUSD cap |
| Incident log review | Daily | `documents/operations/incident-log/` |

---

## 9. Stop Conditions

The pilot must **immediately halt** if any of the following occur. No further minting until the condition is investigated and resolved:

| ID | Stop Condition | Action |
|---|---|---|
| S01 | Unauthorized mint detected (totalSupply increase without operator initials in ledger) | HALT + escalate |
| S02 | Role anomaly (unexpected agent, admin, or minter address change) | HALT + escalate |
| S03 | Failed reconciliation (supply discrepancy above 0.01 AXUSD threshold) | HALT + investigate |
| S04 | Cap breach (cumulative minted ≥ 2,500 AXUSD) | HALT + review before any additional mint |
| S05 | Transfer module failure or detachment (CAM or TLM no longer bound) | HALT + escalate |
| S06 | Country allowlist anomaly (non-840 country enabled or 840 disabled) | HALT + escalate |
| S07 | Deployer key activity without operator knowledge | HALT + escalate + immediate incident response |
| S08 | Snowtrace shows contract code change (re-deployment at same address) | HALT + escalate |

---

## 10. Exit Criteria from Pilot to Full Production

The pilot period ends and full production launch may proceed only when ALL of the following are satisfied:

| ID | Criterion | Status |
|---|---|---|
| E01 | Gnosis Safe deployed on Avalanche mainnet | OPEN |
| E02 | DEFAULT_ADMIN migrated to Safe | OPEN |
| E03 | AGENT_ROLE migrated to dedicated ops address | OPEN |
| E04 | MINTER_ROLE migrated to issuance process | OPEN |
| E05 | Deployer EOA has renounced all roles | OPEN |
| E06 | External security audit completed and report signed | OPEN |
| E07 | DEPLOYER_PRIVATE_KEY in cold storage or retired | OPEN |
| E08 | Snowtrace source verification complete (all 8 contracts) | OPEN |
| E09 | Daily reconciliation cron running and confirmed on mainnet | OPEN |
| E09 | Pilot ledger reviewed — no unresolved anomalies | OPEN |
| E10 | Operator sign-off on readiness for full production | OPEN |

---

## 11. Required Controls Before Scale

Before the pilot cap (2,500 AXUSD) is raised or production launch authorized:

1. Complete all exit criteria (E01–E10) above
2. Conduct load/stress test on Capinfra AVALANCHE adapter at higher volume
3. Confirm cross-chain reconciliation model handles multiple concurrent mints
4. Formal go/no-go review by Technical Lead, Operations Lead, and Compliance Counsel

---

*Axiom Protocol Internal — Avalanche Limited Pilot Policy v1.0.0 — 2026-05-14*
