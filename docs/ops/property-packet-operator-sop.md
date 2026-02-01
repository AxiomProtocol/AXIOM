# Property Packet Operator SOP

**Version:** 1.0.0  
**Last Updated:** 2026-01-31  
**Classification:** Internal Use Only  
**Owner:** Capital Bridge Operations

---

## Overview

This document provides standard operating procedures for operators managing Property Packets through the Capital Bridge workflow. It covers packet creation, underwriting finalization, participation clause drafting, and artifact validation.

---

## Table of Contents

1. [When to Create a Packet](#1-when-to-create-a-packet)
2. [Packet Creation Workflow](#2-packet-creation-workflow)
3. [Underwriting Finalization](#3-underwriting-finalization)
4. [Participation Clause Drafting](#4-participation-clause-drafting)
5. [Artifact Pre-validation](#5-artifact-pre-validation)
6. [First Two Settlements Checklist](#6-first-two-settlements-checklist)
7. [Command Reference](#7-command-reference)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. When to Create a Packet

### Trigger Conditions

Create a Property Packet when ALL of the following are true:

**Track A (Performing)**
- [ ] Asset is a mortgage note with 6+ months payment history
- [ ] No payments more than 30 days late in last 12 months
- [ ] Servicer is active and responsive
- [ ] Title/lien position is clear or can be verified
- [ ] Participation opportunity has been identified

**Track B (Light NPL)**
- [ ] Asset is a mortgage note with 1-6 missed payments
- [ ] NOT in active bankruptcy (Chapter 7 or 13)
- [ ] NOT scheduled for foreclosure sale within 30 days
- [ ] Borrower contact available (or property can be inspected)
- [ ] Viable workout path exists (reinstatement, modification, etc.)
- [ ] Participation opportunity has been identified

### Do NOT Create a Packet If:

- Deep NPL (7+ missed payments without workout path)
- Active bankruptcy proceedings
- Imminent foreclosure (< 30 days to sale)
- Title defects that cannot be resolved
- No servicer or servicer is unresponsive
- Property is condemned or uninhabitable

---

## 2. Packet Creation Workflow

### Step 1: Initialize Packet

```bash
npx ts-node scripts/property-packet/create-packets.ts
```

This creates two template packets:
- `data/property-packets/track-a-performing.packet.json`
- `data/property-packets/track-b-light-npl.packet.json`

### Step 2: Populate Real Data

Open the packet JSON files and replace placeholder values:

**Required Field Updates:**
- `packetId`: Keep generated ID or update to match your naming convention
- `createdBy`: Replace with operator wallet address (0x...)
- `propertyAddress`: Full property address
- `unpaidPrincipalBalance`: Current UPB from servicer
- `interestRate`: Note interest rate
- `monthlyPayment`: Current P&I payment
- `servicerName`: Current servicer
- `propertyValue`: BPO, AVM, or appraisal value

**Track B Additional Fields:**
- `delinquencyStatus`: Full delinquency breakdown
- `borrowerContactStatus`: RESPONSIVE, UNRESPONSIVE, or UNKNOWN
- `workoutOptionsAvailable`: Array of workout strategies

### Step 3: Upload Artifacts

Upload required documents to DeNet storage:

```bash
# Example artifact upload (adjust for your setup)
npx ts-node scripts/denet/upload.ts --file ./path/to/servicer-statement.pdf --type servicerStatement
```

After upload, update the `artifactIndex` in the packet JSON with:
- `cid`: The DeNet content identifier (bafybeig...)
- `sha256`: The SHA256 hash of the file
- `filename`: Original filename
- `uploadedAt`: Upload timestamp

---

## 3. Underwriting Finalization

### Inputs Required

**Track A:**
- Current UPB
- Interest rate
- Monthly payment
- Property value (or estimate)
- Payment history months

**Track B (additional):**
- Missed payment count
- Total past due amount
- Borrower contact status
- Workout options with probability ratings

### Running Underwriting

```bash
npx ts-node scripts/property-packet/finalize-underwriting.ts
```

### Underwriting Outputs

| Field | Track A | Track B |
|-------|---------|---------|
| Purchase Price | UPB * 0.92 | UPB * (1 - discount) |
| Participation | 30% of purchase | 25% of purchase |
| Yield Range | Conservative cashflow-based | NPL return range |
| LTV Proxy | UPB / Property Value | Same |
| Risk Tier | Based on LTV, history | Based on delinquency |
| Recovery Estimate | N/A | Expected recovery range |
| Workout Probability | N/A | Success likelihood |

### Conservative Defaults

The underwriting script applies these conservative assumptions:

- **Track A:** 8% purchase discount, 5% cashflow haircut
- **Track B:** 25% base NPL discount + 3% per missed payment

### Manual Overrides

To override computed values, edit the packet JSON directly after running the script:

```json
{
  "underwriting": {
    "purchasePrice": 180000,  // Override computed value
    "participationAmount": 50000,
    "riskTier": "MEDIUM",
    "reviewNotes": "Manual adjustment based on recent appraisal"
  }
}
```

---

## 4. Participation Clause Drafting

### What Changes Per Track

| Clause Section | Track A | Track B |
|----------------|---------|---------|
| Participation Cap | 30% typical | 25% typical |
| Payment Waterfall | Standard servicing | Workout cost priority |
| Default Handling | Standard consent thresholds | Broader workout authority |
| Transfer Lock-up | None | 6 months |
| Risk Disclosure | Standard | Enhanced NPL disclosure |

### Running Clause Generation

```bash
npx ts-node scripts/property-packet/draft-participation-clauses.ts
```

### Output Files

- `data/property-packets/track-a-performing.participation-clauses.md`
- `data/property-packets/track-b-light-npl.participation-clauses.md`

### Important Notes

- Clauses are DRAFTS for internal review only
- NOT legal advice - require legal counsel review before execution
- Hash reference is computed and stored for audit trail

---

## 5. Artifact Pre-validation

### What "Ready" Means

A packet is READY for settlement when:

1. **All required artifacts are present** in the artifact index
2. **CID format is valid** (starts with `bafy`, length > 10)
3. **SHA256 hash is valid** (64 hex characters)
4. **No PLACEHOLDER values remain**
5. **Underwriting is finalized** with hash computed

### Running Validation

```bash
npx ts-node scripts/property-packet/prevalidate-settlement-artifacts.ts
```

### Required Artifacts

**Track A:**
- paymentHistoryProof
- servicerStatement
- lienPositionVerification
- participationAgreement
- cashflowSchedule

**Track B:**
- delinquencyStatusSummary
- borrowerContactLog
- workoutOptionsMatrix
- timelineAssumptions
- downsideDisclosure
- servicingEventLogTemplate
- participationAgreement

### Validation Report

The script generates: `docs/ops/reports/settlement-artifact-readiness.md`

Review this report for:
- Missing artifacts
- Invalid CID/hash formats
- Placeholder values that need replacement

---

## 6. First Two Settlements Checklist

Use this 10-step checklist for the first two settlements to establish operational patterns.

### Pre-Settlement (Day -7 to Day 0)

| Step | Action | Timestamp | Completed |
|------|--------|-----------|-----------|
| 1 | Create packet with real asset data | | [ ] |
| 2 | Upload all required artifacts to DeNet | | [ ] |
| 3 | Run underwriting finalization | | [ ] |
| 4 | Generate participation clauses | | [ ] |
| 5 | Run artifact pre-validation (must be READY) | | [ ] |

### Settlement Initiation (Day 0)

| Step | Action | Timestamp | Completed |
|------|--------|-----------|-----------|
| 6 | Obtain ATTESTOR_A signature | | [ ] |
| 7 | Obtain ATTESTOR_B signature (different signer) | | [ ] |
| 8 | Submit packet hash to CapitalBridgeHub | | [ ] |
| 9 | Initiate 24-hour timelock | | [ ] |
| 10 | After timelock: Execute settlement authorization | | [ ] |

### Post-Settlement Verification

- [ ] Verify on-chain transaction success
- [ ] Confirm artifact CIDs match submitted hashes
- [ ] Update packet status to SETTLED
- [ ] Archive packet with full audit trail
- [ ] Update observer dashboard metrics

### First Settlement Notes

For the first two settlements:
- Allow extra time for each step (2x normal)
- Document any issues or process improvements
- Have legal counsel available for clause review
- Verify all role assignments before attestation
- Test timelock cancellation procedure (but don't cancel real settlement)

---

## 7. Command Reference

### Full Workflow

```bash
# Run all steps in sequence
npx ts-node scripts/property-packet/run-full-packet-flow.ts
```

### Individual Steps

```bash
# Step 1: Create packets
npx ts-node scripts/property-packet/create-packets.ts

# Step 2: Finalize underwriting
npx ts-node scripts/property-packet/finalize-underwriting.ts

# Step 3: Draft participation clauses
npx ts-node scripts/property-packet/draft-participation-clauses.ts

# Step 4: Pre-validate artifacts
npx ts-node scripts/property-packet/prevalidate-settlement-artifacts.ts
```

### npm Script Aliases

```bash
npm run packets:create
npm run packets:underwrite
npm run packets:clauses
npm run packets:prevalidate
npm run packets:run
```

### DeNet Artifact Commands

```bash
# Upload artifact
npx ts-node scripts/denet/upload.ts --file ./document.pdf --type servicerStatement

# Verify CID
npx ts-node scripts/denet/verify.ts --cid bafybeig...
```

---

## 8. Troubleshooting

### Common Issues

**"Packet files not found"**
- Run `create-packets.ts` first to generate templates
- Check that `data/property-packets/` directory exists

**"PLACEHOLDER values remain"**
- Upload real documents to DeNet
- Update artifact index with real CID and SHA256 values
- Re-run pre-validation

**"Invalid CID format"**
- CID must start with `bafy` followed by alphanumeric characters
- Verify DeNet upload completed successfully
- Check for copy/paste errors

**"Underwriting hash mismatch"**
- Do not manually edit underwriting values after hash computation
- Re-run `finalize-underwriting.ts` if inputs changed

**"Dual attestation failed"**
- ATTESTOR_A and ATTESTOR_B must be different signers
- Verify role assignments on CapitalBridgeHub contract
- Check signer has sufficient gas for transaction

### Getting Help

- Review schema documentation: `docs/ops/schemas/`
- Check packet templates: `docs/ops/property-packets/`
- DeNet setup: `docs/ops/denet-sop.md`
- Contact: Capital Bridge Operations Team

---

## Related Documents

- [Track A Performing Packet](./property-packets/packet-track-a-performing.md)
- [Track B Light NPL Packet](./property-packets/packet-track-b-light-npl.md)
- [Property Packet Schema](./schemas/property-packet.schema.json)
- [Underwriting Schema](./schemas/underwriting.schema.json)
- [Settlement Artifacts Schema](./schemas/settlement-artifacts.schema.json)
- [DeNet Enforcement Proof](../storage/denet-enforcement-proof.md)
- [SOP Operations Manual](./sop-operations-manual.md)
