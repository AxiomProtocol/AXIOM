
# Axiom Protocol — Emergency Powers Policy

**Version:** 1.0  
**Effective Date:** 2026-03-30  
**Owner:** Governance Safe (0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d)  
**Classification:** Operational — Not Investment Advice

---

## 1. Purpose

This document defines which Axiom Protocol administrative functions may bypass the 24-hour Timelock Controller delay, the conditions under which those powers may be invoked, the minimum authorization required for each action, and the post-action disclosure requirements.

All emergency actions are logged to the `admin_action_log` database table and visible in the Founder Operations dashboard.

---

## 2. Governance Structure

| Role | Holder | Contracts | Timelock Required |
|---|---|---|---|
| EMERGENCY_ROLE (pause/sweep) | Governance Safe (3-of-5) | All Pausable | No — immediate |
| OPERATOR_ROLE (freeze/unfreeze) | Deployer EOA → Safe (pending) | AXUSD Token | No |
| MINTER_ROLE (mint/burn) | Deployer EOA + Governance Safe | AXUSD Token | No (Safe proposal for ≥10k) |
| COMPLIANCE_ROLE (claims/whitelist) | Deployer EOA → Safe (pending) | Identity Registry, Compliance | No |
| UPGRADER_ROLE (proxy admin) | Timelock | All Upgradeable | Yes — 24h |

---

## 3. Functions That Bypass Timelock

The following functions may be executed without waiting for the 24-hour Timelock delay. They are reserved for emergency response only.

### 3.1 Emergency Pause

**Function:** `pause()` on all pausable contracts  
**Holder:** Governance Safe (3-of-5)  
**Trigger Conditions:**
- Active exploit or suspected exploit in progress
- Regulatory order requiring immediate halt
- Critical vulnerability disclosed by security researcher or audit

**Authorization Required:** 3-of-5 Safe signatures  
**Two-Person Rule:** Applies — no single keyholder may initiate and confirm alone  
**Disclosure:** Public notice within 24 hours; reason posted to governance forum

### 3.2 Emergency Sweep (Fund Extraction)

**Function:** `emergencySweep()` on AxiomTreasuryAndRevenueHub  
**Holder:** Governance Safe (3-of-5)  
**Trigger Conditions:**
- Imminent contract compromise with funds at risk
- Court order or regulatory seizure requirement

**Authorization Required:** 3-of-5 Safe signatures  
**Two-Person Rule:** Applies  
**Disclosure:** Public notice within 24 hours; destination address posted to governance forum

### 3.3 Address Freeze

**Function:** `freezeAddress(wallet, true)` on AXUSD Token  
**Holder:** OPERATOR_ROLE (currently Deployer EOA; migrating to Safe)  
**Trigger Conditions:**
- Confirmed sanctions match (OFAC SDN list)
- Court order naming specific address
- Compromise of a verified investor account confirmed by identity provider

**Authorization Required:** Single OPERATOR_ROLE keyholder  
**Two-Person Rule:** Does NOT apply for individual address freeze (speed required for sanctions compliance)  
**Disclosure:** Logged to admin_action_log; reported in next monthly governance report

### 3.4 Forced Transfer

**Function:** `forcedTransfer(from, to, amount)` on AXUSD Token  
**Holder:** EMERGENCY_ROLE (Governance Safe)  
**Trigger Conditions:**
- Court order requiring asset recovery
- Confirmed theft from a verified investor with on-chain evidence

**Authorization Required:** 3-of-5 Safe signatures  
**Two-Person Rule:** Applies  
**Disclosure:** Public notice within 24 hours

---

## 4. Functions That Require Timelock (24-Hour Delay)

The following functions are gated by the AxiomTimelockController and cannot be executed without queuing:

- `upgradeProxy()` — proxy admin upgrade
- `transferOwnership()` — contract ownership transfer
- `grantRole()` / `revokeRole()` — permission changes
- Revenue router parameter updates

The Governance Safe holds PROPOSER_ROLE on the Timelock. The Timelock's EXECUTOR_ROLE is held by `address(0)` (anyone can execute after the delay).

---

## 5. Mint Authorization

AXUSD minting is authorized under the following rules:

| Amount | Mechanism | Required |
|---|---|---|
| < 10,000 AXUSD | Deployer EOA direct | Single MINTER_ROLE holder |
| ≥ 10,000 AXUSD | Safe transaction proposal | 3-of-5 Governance Safe + app.safe.global approval |

All mints are logged to `admin_action_log`. Pending Safe proposals appear as `status: pending_safe`.

---

## 6. Admin Action Logging

Every invocation of an emergency or admin function writes a record to the `admin_action_log` table with:

- `action_type` — function name (e.g., `freezeAddress`, `mint`, `pause`)
- `caller_address` — the address initiating the action
- `target_address` — the affected wallet or contract
- `amount` — token amount, if applicable
- `tx_hash` — on-chain transaction hash
- `role` — the governance role that authorized the action
- `status` — `success`, `failed`, or `pending_safe`
- `created_at` — timestamp

The Founder Operations dashboard at `/founder-ops` displays the last 50 admin actions in the Governance Migration tab.

---

## 7. Two-Person Rule

For all EMERGENCY_ROLE actions (pause, sweep, forced transfer):

1. No single Safe owner may be both the proposer and the final confirming signer
2. The transaction must be proposed by one owner and confirmed by at least two others (satisfying the 3-of-5 threshold with distinct parties)
3. Exceptions require written documentation filed within 24 hours

---

## 8. Post-Action Disclosure Requirements

| Action | Disclosure Timeline | Channel |
|---|---|---|
| Emergency Pause | Within 24 hours | Public governance notice |
| Emergency Sweep | Within 24 hours | Public governance notice + destination address |
| Forced Transfer | Within 24 hours | Public governance notice |
| Address Freeze (sanctions) | Within 5 business days | Monthly governance report |
| Mint (≥10k AXUSD) | Immediate | Safe transaction visible on-chain |
| Mint (<10k AXUSD) | Monthly report | admin_action_log |

---

## 9. Policy Review

This policy is reviewed quarterly by the governance multisig. Material changes require a Timelock-queued transaction to update the on-chain governance parameters.

---

*This document is operational policy. It does not constitute legal advice, investment advice, or a guarantee of any specific outcome.*
