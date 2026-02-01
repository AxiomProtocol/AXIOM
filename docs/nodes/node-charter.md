# Axiom Node Operator Charter

**Version:** 1.0.0  
**Effective Date:** 2026-02-01  
**Classification:** Public  
**Owner:** Axiom Protocol Governance

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Eligibility](#2-eligibility)
3. [Operator Roles](#3-operator-roles)
4. [Duties and Responsibilities](#4-duties-and-responsibilities)
5. [Attestation Standards](#5-attestation-standards)
6. [Prohibited Conduct](#6-prohibited-conduct)
7. [Enforcement and Penalties](#7-enforcement-and-penalties)
8. [Compensation Principles](#8-compensation-principles)
9. [Dispute Handling](#9-dispute-handling)
10. [Revocation Procedures](#10-revocation-procedures)
11. [Public Transparency Expectations](#11-public-transparency-expectations)

---

## 1. Purpose

The Axiom Node Operator Program establishes a decentralized network of qualified participants who validate, attest, and monitor Capital Bridge settlement activities. Node Operators serve as the human verification layer ensuring that:

- Property packets meet underwriting standards before settlement authorization
- Dual attestation requirements are fulfilled by independent parties
- Transparency metrics are publicly reported
- Misconduct is identified and addressed promptly

This Charter defines the rights, responsibilities, and expectations for all Node Operators participating in the Axiom ecosystem.

---

## 2. Eligibility

### 2.1 Minimum Requirements

All Node Operator candidates must:

1. **Legal Capacity**: Be a natural person of legal age or authorized representative of an entity
2. **Jurisdiction**: Operate from a jurisdiction where participation is legally permitted
3. **Technical Capability**: Demonstrate ability to interact with Axiom smart contracts and tooling
4. **Identity Verification**: Complete the verification tier appropriate for their role
5. **No Conflicts**: Disclose any conflicts of interest before onboarding

### 2.2 Verification Tiers

| Tier | Role | Requirements |
|------|------|--------------|
| LIGHT | Observer | Email verification, wallet attestation |
| STANDARD | Validator | LIGHT + KYC (name, address, ID), professional reference |
| STRONG | Attestor | STANDARD + enhanced due diligence, competency assessment, bonding |

### 2.3 Disqualifying Factors

The following disqualify candidates from participation:

- Active regulatory sanctions or enforcement actions
- Prior revocation from Axiom Node Program
- Unresolved conflicts of interest
- Failure to complete required verification
- Providing false or misleading information during onboarding

---

## 3. Operator Roles

### 3.1 Observer (Read-Only)

**Access Level**: Read-only metrics and reporting

**Capabilities**:
- View settlement pipeline status
- Access transparency dashboards
- Generate and publish weekly reports
- Monitor protocol health indicators

**Restrictions**:
- Cannot submit attestations
- Cannot validate artifacts
- Cannot participate in settlement authorization

### 3.2 Validator

**Access Level**: Artifact validation and underwriting review

**Capabilities**:
- All Observer capabilities
- Review property packet artifacts for completeness
- Verify underwriting calculations and assumptions
- Submit validation reports
- Sign validation attestations (non-final)

**Restrictions**:
- Cannot provide final settlement attestation
- Must defer to Attestor for authorization decisions

### 3.3 Attestor

**Access Level**: Full attestation authority

**Capabilities**:
- All Validator capabilities
- Provide final attestation for settlement authorization
- Participate in dual attestation requirements
- Review and sign off on post-settlement audits

**Requirements**:
- Must complete STRONG verification tier
- Must maintain active bonding (if required)
- Must pair with a different Attestor for dual attestation

---

## 4. Duties and Responsibilities

### 4.1 General Duties (All Roles)

1. **Availability**: Maintain reasonable response times during operating hours
2. **Confidentiality**: Protect non-public information accessed during duties
3. **Accuracy**: Provide truthful and accurate reports and attestations
4. **Disclosure**: Promptly disclose any conflicts of interest
5. **Compliance**: Adhere to this Charter and all Axiom policies
6. **Cooperation**: Assist in investigations and audits when requested

### 4.2 Role-Specific Duties

**Observers**:
- Generate weekly transparency reports
- Monitor and flag anomalies
- Maintain public metrics dashboards

**Validators**:
- Complete artifact validation within 48 hours of assignment
- Document validation findings with supporting evidence
- Escalate issues requiring Attestor review

**Attestors**:
- Complete attestation review within 72 hours of validation completion
- Ensure all prerequisites are satisfied before signing
- Coordinate with paired Attestor for dual attestation
- Submit post-settlement audit within 7 days of settlement

### 4.3 Service Level Expectations

| Metric | Observer | Validator | Attestor |
|--------|----------|-----------|----------|
| Response Time | 72h | 48h | 24h |
| Availability | 90% | 95% | 99% |
| Accuracy | N/A | 98% | 99.5% |
| Report Timeliness | Weekly | Per-packet | Per-packet |

---

## 5. Attestation Standards

### 5.1 Pre-Attestation Requirements

Before any attestation can be recorded, the following must be verified:

1. **Operator Status**: Operator must be in ACTIVE status
2. **Role Authorization**: Operator must hold the required role for the attestation type
3. **Artifact Readiness**: All required artifacts must be present with valid CID/SHA256 references
4. **No Placeholders**: Zero placeholder values in artifact bundle
5. **Underwriting Complete**: Underwriting must be finalized with computed hash
6. **Conflict Check**: No conflicts of interest with the packet or parties

### 5.2 Attestation Record Structure

Every attestation must include:

- `packetId`: Reference to the property packet
- `trackType`: TRACK_A (Performing) or TRACK_B (Light NPL)
- `artifactBundleHashOrCid`: Hash/CID of artifact bundle at time of attestation
- `underwritingHashOrCid`: Hash of underwriting snapshot
- `operatorId`: Unique operator identifier
- `role`: Role under which attestation is provided
- `timestamp`: ISO8601 timestamp
- `signatureStub`: Cryptographic signature reference
- `conflictCheckPassed`: Boolean confirmation of conflict check

### 5.3 Dual Attestation Requirement

Settlement authorization requires attestations from TWO different Attestors who:

- Are from different competency categories (when applicable)
- Have no shared conflicts of interest
- Completed independent reviews
- Signed within the same settlement window (24-hour timelock period)

---

## 6. Prohibited Conduct

The following conduct is strictly prohibited:

### 6.1 Attestation Misconduct

- Signing attestations without completing required review
- Colluding with other Attestors to bypass independent review
- Providing false or misleading attestation information
- Attesting on packets where conflicts of interest exist

### 6.2 Information Misuse

- Sharing confidential packet information with unauthorized parties
- Front-running settlement opportunities
- Trading on non-public information
- Leaking operator or protocol information

### 6.3 Process Violations

- Attempting to bypass verification requirements
- Falsifying onboarding documentation
- Operating under multiple identities
- Interfering with other operators' duties

### 6.4 System Abuse

- Attempting unauthorized access to systems
- Submitting malicious or corrupted artifacts
- Denial of service attacks
- Exploiting protocol vulnerabilities without disclosure

---

## 7. Enforcement and Penalties

### 7.1 Incident Severity Levels

| Severity | Examples | Consequences |
|----------|----------|--------------|
| LOW | Minor SLA miss, documentation error | Warning, remediation |
| MEDIUM | Repeated SLA violations, minor process deviations | Suspension, reward reduction |
| HIGH | Conflict non-disclosure, negligent attestation | Extended suspension, reward clawback |
| CRITICAL | Fraud, collusion, intentional misconduct | Immediate revocation, full clawback, public disclosure |

### 7.2 Investigation Process

1. **Report**: Incident filed with supporting evidence
2. **Acknowledgment**: Operator notified within 24 hours
3. **Investigation**: Evidence review and operator response
4. **Determination**: Finding issued with supporting rationale
5. **Appeal**: 7-day window for operator to appeal
6. **Final Decision**: Binding outcome and enforcement action

### 7.3 Slashing Schedule

| Finding | Unpaid Reward Slash | Additional Penalty |
|---------|---------------------|-------------------|
| LOW (confirmed) | 0% | None |
| MEDIUM (confirmed) | 25% | 30-day suspension |
| HIGH (confirmed) | 50% | 90-day suspension |
| CRITICAL (confirmed) | 100% | Permanent revocation |

---

## 8. Compensation Principles

### 8.1 Milestone-Based Accrual

Compensation accrues in USD terms based on settlement milestones:

| Milestone | USD Value | Eligible Roles |
|-----------|-----------|----------------|
| PACKET_ACCEPTED | $10 | Observer (20%), Validator (60%), Attestor (100%) |
| UNDERWRITING_FINALIZED | $20 | Validator (60%), Attestor (100%) |
| ARTIFACTS_PREVALIDATED | $20 | Validator (60%), Attestor (100%) |
| DUAL_ATTESTATION_RECORDED | $25 | Attestor (100%) |
| POST_SETTLEMENT_AUDIT | $25 | Observer (20%), Validator (60%), Attestor (100%) |

**Total per settlement cycle**: $100 USD equivalent

### 8.2 Payment Mechanics

- **Observation Window**: Payouts in AXIOM token at posted rate
- **Post-Observation**: AXUSD payment option available
- **Conversion Window**: Operators may opt to defer for AXUSD conversion

### 8.3 Payment Frequency

- Rewards accrue per milestone completion
- Payout previews generated weekly
- Actual payouts processed monthly or upon threshold

---

## 9. Dispute Handling

### 9.1 Dispute Types

- **Compensation Disputes**: Disagreement over reward calculations
- **Role Disputes**: Disagreement over role assignment or capabilities
- **Incident Disputes**: Disagreement over incident findings
- **Process Disputes**: Disagreement over procedure application

### 9.2 Resolution Process

1. **Informal Resolution**: Direct communication with program coordinator
2. **Formal Dispute**: Written submission with supporting documentation
3. **Review Panel**: Three-member review (1 governance, 2 senior operators)
4. **Binding Decision**: Final decision within 14 days

### 9.3 Escalation

Disputes not resolved through standard process may be escalated to:
- Axiom Governance Council
- Independent arbitration (for disputes exceeding $10,000)

---

## 10. Revocation Procedures

### 10.1 Voluntary Withdrawal

Operators may voluntarily withdraw by:

1. Submitting written notice
2. Completing any pending assignments
3. Transferring any in-progress work
4. Receiving final compensation settlement

### 10.2 Involuntary Revocation

Revocation may occur for:

- CRITICAL incident finding
- Repeated HIGH severity findings (3 within 12 months)
- Extended inactivity (90+ days without activity)
- Verification status expiration without renewal
- Regulatory or legal prohibition

### 10.3 Revocation Effects

Upon revocation:

- Immediate suspension of all capabilities
- Pending rewards subject to clawback review
- Access credentials invalidated
- Public disclosure (for cause revocations)
- 12-month cooling-off period before reapplication

---

## 11. Public Transparency Expectations

### 11.1 Disclosed Information

The following information is publicly disclosed:

- Aggregate operator counts by role and status
- Settlement statistics (count, volume, time-to-settlement)
- Attestation metrics (pass/fail rates, timing)
- Incident summaries (count by severity, no operator identification for LOW/MEDIUM)
- Governance incident count (target: zero)

### 11.2 Confidential Information

The following remains confidential:

- Individual operator identities (unless disclosed for cause)
- Specific packet details before settlement
- Investigation details during active review
- Compensation amounts for individual operators

### 11.3 Reporting Schedule

| Report | Frequency | Audience |
|--------|-----------|----------|
| Weekly Metrics | Weekly | Public |
| Monthly Summary | Monthly | Public |
| Quarterly Review | Quarterly | Governance + Public |
| Incident Report | As needed | Governance (summary public) |

---

## Amendments

This Charter may be amended by Axiom Governance through standard proposal process. Material changes require:

- 7-day notice period
- Operator comment period
- Governance approval
- 30-day implementation window

---

## Acceptance

By completing onboarding and achieving ACTIVE status, Node Operators acknowledge they have read, understood, and agree to abide by this Charter.

---

*Last Revised: 2026-02-01*
