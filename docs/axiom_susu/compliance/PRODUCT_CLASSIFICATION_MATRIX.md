# SUSU Product Classification Matrix

**Version:** 1.0.0  
**Generated:** December 22, 2025  
**Purpose:** Compliance classification for all SUSU features and adjacent modules

---

## Overview

This matrix classifies every SUSU feature by:
- Custody status (non-custodial / custodial / hybrid)
- Value flow type (p2p transfer / pooled rotation / escrow / rewards / templates / reputation / onboarding / disputes)
- Risk profile
- Required disclosures and acknowledgements
- Marketing claim boundaries
- Capital Mode applicability

---

## Products

### 1. SUSU Pool Creation

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_pool_creation` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Pooled Rotation |
| **Capital Mode Trigger** | Yes |

**Description:** Create a new rotating savings pool with configurable parameters including member count, contribution amount, cycle duration, and payout order.

**Risks:**
- Pool parameters cannot be changed once pool starts
- Organizer sets initial terms binding all members
- Gas fees required for on-chain creation
- Protocol fees apply to all contributions

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| pool_terms | Pool Terms | This pool operates under fixed terms that cannot be modified once started. All members agree to the same contribution schedule and payout rotation. |
| protocol_fees | Protocol Fees | A protocol fee of up to 2.5% is deducted from each contribution to support platform operations. This fee is non-refundable. |
| smart_contract_risk | Smart Contract Risk | This pool operates via smart contract on Arbitrum One. While contracts are audited, blockchain transactions are irreversible. |

**Required Acknowledgements:**
- I understand pool terms are fixed once the pool starts
- I understand protocol fees will be deducted from contributions
- I understand this involves smart contract interaction

**Audit Events:** `pool_created`, `pool_parameters_set`

**Marketing Boundaries:**
| Allowed | Prohibited |
|---------|------------|
| Community savings circles | Investment returns |
| Rotating savings and credit association | Guaranteed profits |
| Traditional SUSU/ROSCA format | Interest earnings |
| Smart contract managed | Yield generation |
| Transparent rotation schedule | Bank-grade security, FDIC insured, Risk-free |

---

### 2. SUSU Contribution

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_contribution` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Pooled Rotation |
| **Capital Mode Trigger** | Yes |

**Description:** Make a contribution to a SUSU pool during an active cycle. Tokens are transferred to the pool for later distribution to the designated recipient.

**Risks:**
- Contributions are locked until your payout cycle
- Late contributions may incur penalties
- Missing contributions affects all pool members
- Tokens cannot be recovered until pool completion or exit

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| contribution_commitment | Contribution Commitment | By contributing, you commit to making all future cycle contributions. Missing contributions may affect your standing and other members. |
| token_transfer | Token Transfer | Your tokens will be transferred to the pool smart contract. They are held non-custodially until payout distribution. |
| grace_period | Grace Period | Contributions must be made within the cycle window. A grace period may apply for late contributions, subject to pool rules. |

**Required Acknowledgements:**
- I understand my tokens will be transferred to the pool
- I commit to making future contributions as scheduled
- I understand missing contributions affects other members

**Evidence Artifacts:** `transaction_hash`, `contribution_receipt`

**Audit Events:** `contribution_made`, `token_transfer`

**Marketing Boundaries:**
| Allowed | Prohibited |
|---------|------------|
| Pool contributions | Deposit |
| Group savings | Investment |
| Shared commitment | Stake |
| Rotating access to pooled funds | Earn interest, Generate returns |

---

### 3. SUSU Payout

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_payout` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Pooled Rotation |
| **Capital Mode Trigger** | Yes |

**Description:** Receive the pooled contributions for the current cycle according to the predetermined rotation order.

**Risks:**
- Payout amount depends on all members contributing
- Protocol fees are deducted before payout
- Payout order is fixed once pool starts
- Early recipients have obligation to continue contributing

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| payout_calculation | Payout Calculation | Your payout equals total contributions minus protocol fees. If any member misses a contribution, the payout amount may be reduced. |
| rotation_order | Rotation Order | The payout order was determined when the pool started. This order cannot be changed during pool operation. |

**Required Acknowledgements:**
- I understand the payout amount may vary based on contributions
- I will continue contributing after receiving my payout

**Evidence Artifacts:** `transaction_hash`, `payout_receipt`

**Audit Events:** `payout_processed`, `cycle_advanced`

**Marketing Boundaries:**
| Allowed | Prohibited |
|---------|------------|
| Receive pooled funds | Profits |
| Rotating distribution | Returns |
| Community fund access | Interest payment, Dividends |

---

### 4. Join SUSU Pool

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_pool_join` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Onboarding |
| **Capital Mode Trigger** | No |

**Description:** Join an existing SUSU pool that accepts new members before it starts.

**Risks:**
- Joining commits you to full pool participation
- You cannot choose your payout position in some pools
- Pool terms are set by organizer
- You must have sufficient tokens for all contributions

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| pool_commitment | Pool Commitment | By joining, you commit to participating for the full duration of the pool. Exiting early may result in forfeiture of contributed funds. |
| terms_acceptance | Terms Acceptance | You are agreeing to the pool charter set by the organizer. Review all terms before joining. |

**Required Acknowledgements:**
- I have reviewed and accept the pool charter
- I commit to participating for the full pool duration
- I understand exit may result in forfeiture

**Audit Events:** `member_joined`, `charter_accepted`

---

### 5. Exit SUSU Pool

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_pool_exit` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Disputes |
| **Capital Mode Trigger** | No |

**Description:** Leave a SUSU pool before completion. May result in forfeiture of contributions depending on pool rules.

**Risks:**
- Early exit may forfeit all contributions
- Penalties may apply based on charter
- Affects remaining pool members
- Decision is irreversible once processed

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| forfeiture_terms | Forfeiture Terms | Exiting before your payout cycle may result in forfeiture of some or all contributions. Review the charter for specific terms. |
| member_impact | Impact on Members | Your exit affects the pool dynamics and may impact other members' payout amounts. |

**Required Acknowledgements:**
- I understand I may forfeit my contributions
- I accept any exit penalties per the charter
- I understand this affects other pool members

**Evidence Artifacts:** `exit_receipt`

**Audit Events:** `member_exited`, `forfeiture_amount`

---

### 6. Purpose Group

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_purpose_group` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Onboarding |
| **Capital Mode Trigger** | No |

**Description:** Off-chain group for coordinating interest before forming an on-chain SUSU pool. No funds move until graduation.

**Risks:**
- Group may not reach minimum members to graduate
- No binding commitment until on-chain graduation
- Terms may change before graduation

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| off_chain_status | Off-Chain Status | This is a coordination group only. No funds are involved until the group graduates to an on-chain pool. |
| graduation_requirements | Graduation Requirements | The group must meet minimum member requirements before graduating to an on-chain pool. |

**Required Acknowledgements:**
- I understand this is an off-chain coordination group
- I understand no funds move until graduation

**Audit Events:** `group_created`, `group_joined`

---

### 7. Graduation to On-Chain

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_graduation` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Onboarding |
| **Capital Mode Trigger** | Yes |

**Description:** Transition a purpose group to a fully on-chain SUSU pool. This creates binding smart contract commitments.

**Risks:**
- Graduation is irreversible
- Creates binding financial commitment
- Smart contract terms cannot be changed
- Gas fees required for all members

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| on_chain_transition | On-Chain Transition | This action creates a permanent smart contract on Arbitrum One. All future interactions will be on-chain. |
| binding_commitment | Binding Commitment | By graduating, all members enter a binding agreement to contribute and participate per the charter. |
| smart_contract_permanence | Smart Contract Permanence | The pool terms are encoded in an immutable smart contract. No party, including Axiom, can modify these terms. |

**Required Acknowledgements:**
- I understand this creates an irreversible on-chain commitment
- I accept the charter terms encoded in the smart contract
- I understand Axiom cannot modify pool terms after graduation

**Evidence Artifacts:** `charter_hash`, `member_signatures`

**Audit Events:** `graduation_initiated`, `pool_created`, `charter_locked`

---

### 8. Regional Interest Hub

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_interest_hub` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Onboarding |
| **Capital Mode Trigger** | No |

**Description:** Regional grouping for discovering purpose groups in your area. No financial function.

**Risks:**
- Hub membership is informational only
- No guarantee of group availability

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| hub_purpose | Hub Purpose | Hubs are for discovery and community building. No funds move through hubs. |

**Audit Events:** `hub_joined`

---

### 9. SUSU Charter

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_charter` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Templates |
| **Capital Mode Trigger** | No |

**Description:** Governance document defining pool terms, rotation rules, dispute resolution, and exit policies.

**Risks:**
- Charter terms are binding once accepted
- Cannot be modified mid-pool
- Dispute resolution follows charter terms

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| charter_binding | Binding Agreement | The charter is a binding agreement between all pool members. Review all terms carefully before accepting. |

**Required Acknowledgements:**
- I have read and understood the charter
- I agree to be bound by charter terms

**Evidence Artifacts:** `charter_hash`, `acceptance_signature`

**Audit Events:** `charter_created`, `charter_accepted`

---

### 10. Member Ejection

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_member_ejection` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Disputes |
| **Capital Mode Trigger** | No |

**Description:** Remove a member from a SUSU pool for charter violations or non-participation.

**Risks:**
- Ejected member may lose contributions
- Affects pool rotation order
- May trigger dispute process
- Organizer discretion applies

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| ejection_grounds | Ejection Grounds | Members may be ejected for charter violations including missed contributions, fraudulent behavior, or disruption. |
| ejection_impact | Impact of Ejection | Ejected members may forfeit contributions. The pool rotation will be adjusted accordingly. |

**Evidence Artifacts:** `ejection_reason`, `violation_evidence`

**Audit Events:** `member_ejected`, `ejection_reason_logged`

---

### 11. Reliability Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_reliability_profile` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Reputation |
| **Capital Mode Trigger** | No |

**Description:** Track record of a user's SUSU participation including on-time contributions, completed pools, and peer ratings.

**Risks:**
- Profile reflects actual behavior
- Cannot be edited or deleted
- Visible to other SUSU members

**Required Disclosures:**
| ID | Title | Content |
|----|-------|---------|
| profile_visibility | Profile Visibility | Your reliability profile is visible to other SUSU members when you join groups or pools. |
| profile_data | Data Tracked | We track on-time contributions, completed pools, exit history, and peer ratings. |

**Required Acknowledgements:**
- I understand my participation creates a public profile

**Audit Events:** `profile_updated`, `rating_received`

**Marketing Boundaries:**
| Allowed | Prohibited |
|---------|------------|
| Build savings reputation | Credit score |
| Track record visibility | Financial rating |
| Peer accountability | Loan qualification |

---

### 12. Mission Card

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_mission_card` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Templates |
| **Capital Mode Trigger** | No |

**Description:** Shareable card showing SUSU participation goals and progress. Used for social engagement and referrals.

**Risks:**
- Sharing reveals participation info
- Goals are non-binding

**Audit Events:** `mission_card_created`, `mission_card_shared`

**Marketing Boundaries:**
| Allowed | Prohibited |
|---------|------------|
| Share your savings goals | Referral bonuses |
| Invite friends | Earn money by sharing |
| Progress tracking | MLM structure |

---

### 13. SUSU Template

| Attribute | Value |
|-----------|-------|
| **ID** | `susu_template` |
| **Custody Status** | Non-custodial |
| **Value Flow Type** | Templates |
| **Capital Mode Trigger** | No |

**Description:** Pre-configured pool settings for common use cases like emergency funds, home savings, or business capital.

**Risks:**
- Templates are starting points only
- Organizer can modify before pool starts

**Audit Events:** `template_used`

**Marketing Boundaries:**
| Allowed | Prohibited |
|---------|------------|
| Quick start templates | Optimized returns |
| Community-tested configurations | Best investment structure |
| Popular pool formats | |

---

## Capital Mode Thresholds

Capital Mode automatically activates when any of these thresholds are crossed:

| Threshold | Default Value | Description |
|-----------|---------------|-------------|
| `contribution_amount_per_period_usd` | $500 | Per-member contribution per cycle |
| `total_pot_estimate_usd` | $10,000 | Contribution × Members estimate |
| `group_size` | 10 members | Number of pool participants |
| `cycle_length_days` | 30 days | Duration of each cycle |

### Purpose Category Risk Multipliers

Different purposes have different risk profiles that adjust threshold sensitivity:

| Purpose Category | Multiplier | Effect |
|-----------------|------------|--------|
| Emergency | 1.5x | Higher threshold (more lenient) |
| Mutual Aid | 1.5x | Higher threshold |
| Tuition | 1.0x | Standard threshold |
| Other | 1.0x | Standard threshold |
| Business | 0.8x | Lower threshold (more sensitive) |
| Housing | 0.8x | Lower threshold |
| Land | 0.7x | Lowest threshold (most sensitive) |

**Example:** A business savings pool triggers Capital Mode at $400/contribution (500 × 0.8) instead of $500.

---

## Summary by Custody Status

| Status | Products |
|--------|----------|
| **Non-Custodial** | All 13 products |
| **Custodial** | None |
| **Hybrid** | None |

## Summary by Value Flow Type

| Type | Products |
|------|----------|
| **Pooled Rotation** | Pool Creation, Contribution, Payout |
| **Onboarding** | Join Pool, Purpose Group, Graduation, Interest Hub |
| **Disputes** | Exit Pool, Member Ejection |
| **Templates** | Charter, Mission Card, SUSU Template |
| **Reputation** | Reliability Profile |

## Summary by Capital Mode Trigger

| Trigger | Products |
|---------|----------|
| **Yes** | Pool Creation, Contribution, Payout, Graduation |
| **No** | Join Pool, Exit Pool, Purpose Group, Interest Hub, Charter, Member Ejection, Reliability Profile, Mission Card, Template |
