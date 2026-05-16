# Axiom Protocol — Sui Phase 8 Authorization Policy

**Classification:** Internal — Operator  
**Version:** 0.8.0  
**Date:** 2026-05-16  
**Applies to:** All campaign lifecycle operations, treasury operations, root updates

---

## 1. Purpose

This document defines the authorization matrix for all on-chain and off-chain operations in the Axiom Sui Phase 8 claim campaign system.  It specifies who can approve each operation, what pre-conditions must be met, and the risk classification.

---

## 2. Roles

| Role | Description | On-chain representation |
|---|---|---|
| **Operator** | Day-to-day campaign manager | Address holding `AdminCap` |
| **Lead Engineer** | Senior technical approver | Off-chain PGP-signed approval |
| **Protocol Governance** | Axiom governance council | Off-chain resolution record |
| **Finance** | Treasury and fund allocation | Off-chain authorization memo |
| **Claimant** | Community member claiming reward | Any Sui address |

---

## 3. Authorization Matrix

### 3.1 Campaign Lifecycle

| Operation | Move Function | Minimum Approval | Risk | Notes |
|---|---|---|---|---|
| Create campaign | `create_campaign_entry` | 1 Operator | Low | AdminCap required |
| Fund campaign | `fund_campaign` | 1 Operator + Finance memo | Low | AdminCap required; fund only after Finance confirmation |
| Activate campaign | `activate` | 1 Operator | Low | AdminCap required |
| Pause campaign | `pause` | 1 Operator | Low | AdminCap required; can be done immediately for incident response |
| Unpause campaign | `unpause` | 2 Operators | Medium | Requires second operator sign-off before resuming claims |
| Update Merkle root | `update_merkle_root` | 2 Operators + Audit trail | High | Root update invalidates prior proofs; full CSV audit required |
| Close campaign (permanent) | `close_campaign` | 2 Operators + Finance | High | Irreversible; sweep destination address must be pre-approved |
| Destroy AdminCap | `destroy_admin_cap` | Governance ceremony | Critical | Irreversible; requires full governance council approval |
| Transfer AdminCap | `transfer_admin_cap` | Lead Engineer + Governance | Critical | New holder must acknowledge key management policy |

### 3.2 Treasury Operations

| Operation | Move Function | Minimum Approval | Risk |
|---|---|---|---|
| Guarded mint | `guarded_mint` | 1 Operator (TreasuryAdminCap) | Medium |
| Update daily cap | `update_daily_cap` | Lead Engineer + Operator | High |
| Freeze treasury | `freeze_treasury` | Governance ceremony | Critical |

### 3.3 Public Operations (No Approval Required)

| Operation | Move Function | Authorization |
|---|---|---|
| Submit claim | `claim` | Any eligible Sui address with valid Merkle proof |
| Query campaign | Read-only | Public |
| Generate proof | Off-chain | Any eligible address with eligibility CSV |

---

## 4. Approval Procedures

### 4.1 Low Risk (1 Operator)

1. Operator verifies pre-conditions (campaign state, pool balance, expiry).
2. Operator executes transaction from hardware wallet.
3. Operator records transaction digest and reason in audit log.

### 4.2 Medium Risk (2 Operators)

1. First operator prepares unsigned PTB and submits for review.
2. Second operator reviews parameters independently.
3. Both operators record approval in the off-chain governance log.
4. First operator executes transaction.
5. Both operators verify the resulting on-chain state.

### 4.3 High Risk (2 Operators + Additional)

1. Operation proposal drafted with full rationale, parameters, and impact analysis.
2. All required approvers review and sign off in the governance log.
3. 24-hour waiting period before execution (unless emergency).
4. Execution requires both operators present simultaneously.
5. Post-execution audit within 4 hours.

### 4.4 Critical (Governance Ceremony)

1. Governance council convenes (quorum required).
2. Proposal presented, debated, and recorded.
3. Unanimous consent of designated signers required.
4. 72-hour notice period before execution.
5. Execution recorded in immutable governance log with all signer attestations.

---

## 5. Emergency Authorization

In the event of a confirmed security incident (e.g., AdminCap key compromise, proof forgery detected):

1. **Immediate action:** Any single Operator may `pause` any affected campaign without prior approval.
2. **Within 1 hour:** Lead Engineer and at least one Operator must be reached and briefed.
3. **Within 4 hours:** Incident response plan executed per the Key Management policy.
4. **Within 24 hours:** Full post-incident report submitted to governance.

---

## 6. Audit Trail Requirements

All operations in the Medium, High, and Critical categories must produce an audit record containing:

- Timestamp (UTC)
- Operation name and Move function
- Transaction digest on Suiscan
- Epoch number
- Rationale / change request reference
- All approver names and their signatures / PGP-signed attestations

Audit records are stored in the Axiom governance repository and are treated as permanent records.

---

## 7. Violations

Unauthorized execution of any operation above the operator's authorization tier, or failure to produce a required audit record within the required timeframe, constitutes a policy violation.

Violations are reported to the Axiom governance council and may result in:

- Immediate rotation of the AdminCap
- Suspension of operator access
- Disclosure to relevant governance token holders per the Axiom disclosure policy
