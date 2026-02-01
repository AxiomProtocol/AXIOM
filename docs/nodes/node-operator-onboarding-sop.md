# Node Operator Onboarding SOP

**Version:** 1.0.0  
**Last Updated:** 2026-02-01  
**Classification:** Internal Use Only  
**Owner:** Capital Bridge Operations

---

## Overview

This document provides the standard operating procedures for onboarding new Node Operators to the Axiom Capital Bridge program. The onboarding process ensures that operators are properly verified, trained, and certified before participating in settlement activities.

---

## Table of Contents

1. [Onboarding Pipeline](#1-onboarding-pipeline)
2. [Phase Details](#2-phase-details)
3. [Verification Tiers](#3-verification-tiers)
4. [Key Management](#4-key-management)
5. [Dry-Run Requirements](#5-dry-run-requirements)
6. [Certification Checklist](#6-certification-checklist)
7. [Production Readiness](#7-production-readiness)
8. [First 10 Settlements](#8-first-10-settlements)

---

## 1. Onboarding Pipeline

### Status Flow

```
APPLIED → VERIFIED → PROVISIONED → DRY_RUN_PASSED → CERTIFIED → ACTIVE
```

### Status Definitions

| Status | Description | Duration |
|--------|-------------|----------|
| APPLIED | Application submitted, pending review | 1-3 days |
| VERIFIED | Identity verification complete | 1-7 days |
| PROVISIONED | Keys and access credentials issued | 1-2 days |
| DRY_RUN_PASSED | Dry-run exercises completed successfully | 3-7 days |
| CERTIFIED | Final certification complete, pending activation | 1 day |
| ACTIVE | Full operational status | Ongoing |

### Transition Rules

- **No status skipping**: Must complete each phase sequentially
- **No regression**: Cannot move backward except via suspension/revocation
- **Timeout**: Applications expire after 30 days without progress
- **Reapplication**: Expired applications may reapply after 7-day cooling period

---

## 2. Phase Details

### Phase 1: Application (APPLIED)

**Trigger**: Candidate submits application form

**Required Information**:
- Full legal name or entity name
- Jurisdiction of residence/incorporation
- Wallet address (Arbitrum One compatible)
- Email address
- Requested role (Observer, Validator, or Attestor)
- Conflict of interest disclosure
- Agreement to Node Charter

**Outputs**:
- Application record created
- Application ID assigned
- Confirmation email sent

**CLI Command**:
```bash
npm run nodes:apply
```

### Phase 2: Verification (VERIFIED)

**Trigger**: Application review complete

**Verification by Tier**:

| Tier | Role | Requirements |
|------|------|--------------|
| LIGHT | Observer | Email verification, wallet signature |
| STANDARD | Validator | LIGHT + KYC documents, professional reference |
| STRONG | Attestor | STANDARD + enhanced DD, competency test, bonding |

**Required Artifacts** (stored as CID/SHA256):
- `verificationArtifacts.emailProofHash`
- `verificationArtifacts.walletSignatureHash`
- `verificationArtifacts.kycDocumentHash` (STANDARD, STRONG)
- `verificationArtifacts.referenceCheckHash` (STANDARD, STRONG)
- `verificationArtifacts.competencyTestHash` (STRONG)
- `verificationArtifacts.bondingProofHash` (STRONG)

**Outputs**:
- Verification tier confirmed
- Artifact hashes recorded
- Status updated to VERIFIED

**CLI Command**:
```bash
npm run nodes:verify
```

### Phase 3: Provisioning (PROVISIONED)

**Trigger**: Verification complete

**Provisioning Actions**:
1. Generate operator keypair (or register existing wallet)
2. Assign operator ID
3. Configure role permissions in registry
4. Issue API credentials (if applicable)
5. Grant access to operator tooling

**Required Configurations**:
- Wallet address registered
- Role assigned in internal registry
- Access credentials generated
- Tooling access confirmed

**Outputs**:
- Operator ID assigned
- Credentials issued
- Status updated to PROVISIONED

**CLI Command**:
```bash
npm run nodes:provision
```

### Phase 4: Dry-Run (DRY_RUN_PASSED)

**Trigger**: Provisioning complete

**Dry-Run Requirements**:

**Observer**:
- Generate 1 sample metrics report
- Access transparency dashboard
- Submit 1 weekly report draft

**Validator**:
- All Observer requirements
- Complete 2 artifact validations (test packets)
- Submit 2 validation reports
- Pass validation accuracy check (>95%)

**Attestor**:
- All Validator requirements
- Complete 2 attestation dry-runs
- Participate in 1 dual attestation simulation
- Pass attestation accuracy check (>98%)

**Outputs**:
- Dry-run exercise records
- Performance scores
- Status updated to DRY_RUN_PASSED

**CLI Command**:
```bash
npm run nodes:dryrun
```

### Phase 5: Certification (CERTIFIED)

**Trigger**: Dry-run exercises passed

**Certification Requirements**:
1. All dry-run exercises passed
2. Charter acknowledgment signed
3. Emergency procedures reviewed
4. Contact information confirmed
5. Availability commitment confirmed

**Certification Checklist**:
- [ ] All verification artifacts valid
- [ ] Dry-run performance meets thresholds
- [ ] Charter acknowledgment recorded
- [ ] Emergency contacts registered
- [ ] SLA commitment confirmed

**Outputs**:
- Certification record created
- Certification hash computed
- Status updated to CERTIFIED

**CLI Command**:
```bash
npm run nodes:certify
```

### Phase 6: Activation (ACTIVE)

**Trigger**: Certification complete + activation approval

**Activation Requirements**:
1. Certification complete
2. No pending issues or holds
3. Activation approval from coordinator
4. Onboarding documentation archived

**Outputs**:
- Status updated to ACTIVE
- Operator visible in active registry
- Eligible for assignment

**CLI Command**:
```bash
npm run nodes:activate
```

---

## 3. Verification Tiers

### LIGHT Tier (Observer)

**Purpose**: Basic identity confirmation for read-only access

**Requirements**:
1. Email verification (click confirmation link)
2. Wallet signature (sign message with registered wallet)

**Timeline**: 1-2 days

**Artifacts Required**:
- Email proof hash
- Wallet signature hash

### STANDARD Tier (Validator)

**Purpose**: KYC-level verification for validation activities

**Requirements**:
1. All LIGHT requirements
2. Government-issued ID verification
3. Proof of address (utility bill, bank statement)
4. Professional reference check

**Timeline**: 3-7 days

**Artifacts Required**:
- All LIGHT artifacts
- KYC document hash
- Address proof hash
- Reference check hash

### STRONG Tier (Attestor)

**Purpose**: Enhanced due diligence for attestation authority

**Requirements**:
1. All STANDARD requirements
2. Enhanced background check
3. Competency assessment (written + practical)
4. Bonding deposit (if required)
5. Interview with program coordinator

**Timeline**: 7-14 days

**Artifacts Required**:
- All STANDARD artifacts
- Background check hash
- Competency test hash
- Bonding proof hash
- Interview record hash

---

## 4. Key Management

### Wallet Requirements

- Arbitrum One compatible wallet
- Controlled by operator (not custodial exchange)
- Sufficient ETH for gas (recommended: 0.01 ETH minimum)

### Key Generation Options

1. **Operator-Managed**: Operator provides existing wallet address
2. **Generated**: New keypair generated during provisioning

### Security Requirements

- Private keys must never be shared
- Hardware wallet recommended for Attestors
- Backup procedures documented
- Key rotation supported (contact coordinator)

### Credential Storage

All verification artifacts are stored as hashes:
- SHA256 for documents
- CID for larger artifact bundles

---

## 5. Dry-Run Requirements

### Test Environment

Dry-runs use test packets in `data/property-packets/` with Track A and Track B templates.

### Exercise Completion

| Role | Required Exercises | Passing Score |
|------|-------------------|---------------|
| Observer | 2 reports | Complete |
| Validator | 4 validations | >95% accuracy |
| Attestor | 2 attestations + 1 dual sim | >98% accuracy |

### Scoring Criteria

**Validation Scoring**:
- Artifact completeness check: 25%
- CID/hash format validation: 25%
- Underwriting review: 25%
- Documentation quality: 25%

**Attestation Scoring**:
- All validation criteria: 60%
- Dual attestation coordination: 20%
- Timing/responsiveness: 20%

### Failure Handling

- First failure: Retry with feedback
- Second failure: Extended training required
- Third failure: Application terminated

---

## 6. Certification Checklist

### Pre-Certification Review

- [ ] Application complete and accurate
- [ ] Verification tier completed
- [ ] All artifacts have valid hashes
- [ ] Provisioning complete
- [ ] All dry-run exercises passed
- [ ] Performance meets role thresholds

### Certification Documents

- [ ] Node Charter acknowledgment signed
- [ ] Privacy policy acceptance
- [ ] SLA commitment form
- [ ] Emergency contact form
- [ ] Conflict of interest attestation

### Final Verification

- [ ] Wallet address confirmed
- [ ] Communication channels tested
- [ ] Tooling access verified
- [ ] Role permissions correct

---

## 7. Production Readiness

### Go-Live Checklist

Before activating a new operator:

1. **Documentation Complete**
   - All onboarding artifacts archived
   - Certification hash computed and stored

2. **Technical Readiness**
   - Wallet funded with gas
   - Tooling access confirmed
   - Test transaction successful

3. **Operational Readiness**
   - Availability confirmed
   - Response time tested
   - Escalation paths clear

4. **Compliance Readiness**
   - Conflict check current
   - Verification artifacts valid
   - Charter acknowledgment recorded

---

## 8. First 10 Settlements

### Supervision Period

New operators are under enhanced supervision for their first 10 settlements:

- All work reviewed by senior operator
- Extended timelines allowed (1.5x standard)
- Daily check-ins with coordinator
- Immediate feedback on issues

### Success Criteria

| Metric | Target |
|--------|--------|
| On-time completion | 90% |
| Accuracy | Role threshold |
| Escalation rate | <10% |
| Incident rate | 0 CRITICAL, <1 HIGH |

### Graduation

After successful completion of 10 settlements:
- Supervision removed
- Standard timelines apply
- Full reward rates apply
- Eligible for advanced assignments

---

## Command Reference

```bash
# Full onboarding flow
npm run nodes:apply          # Submit application
npm run nodes:verify         # Complete verification
npm run nodes:provision      # Provision credentials
npm run nodes:dryrun         # Run dry-run exercises
npm run nodes:certify        # Complete certification
npm run nodes:activate       # Activate operator

# End-to-end demo
npm run nodes:run
```

---

## Related Documents

- [Node Charter](./node-charter.md)
- [Node Compensation Policy](./node-compensation-policy.md)
- [Operator Registry Schema](../ops/schemas/node-operator.schema.json)
- [Onboarding Schema](../ops/schemas/node-onboarding.schema.json)
