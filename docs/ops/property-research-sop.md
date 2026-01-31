# Property Research Standard Operating Procedure

## CapitalBridgeHub Integration Guide

**Document Date:** January 31, 2026  
**Status:** Operational Procedure  
**Version:** 1.0

---

## Overview

This document defines the standard operating procedure for property research, due diligence, and capital deployment coordination via the CapitalBridgeHub smart contract. All property acquisitions must follow this procedure to ensure research quality and institutional compliance.

---

## Workflow Stages

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROPERTY RESEARCH SOP                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Stage 1: Discovery                    (Off-Chain)              │
│      │                                                           │
│      ▼                                                           │
│  Stage 2: Initial Analysis             (Off-Chain)              │
│      │                                                           │
│      ▼                                                           │
│  Stage 3: Due Diligence               (Off-Chain + DeNet)       │
│      │                                                           │
│      ▼                                                           │
│  Stage 4: PropertyPacket Submission   (On-Chain) ◀── MILESTONE  │
│      │                                                           │
│      ▼                                                           │
│  Stage 5: Attestation A               (On-Chain) ◀── MILESTONE  │
│      │                                                           │
│      ▼                                                           │
│  Stage 6: Attestation B               (On-Chain) ◀── MILESTONE  │
│      │                                                           │
│      ▼                                                           │
│  Stage 7: Risk Committee Decision     (On-Chain) ◀── MILESTONE  │
│      │                                                           │
│      ├── Approved ──▶ Stage 8: Authorization                    │
│      │                                                           │
│      └── Rejected ──▶ Stage 10: Archival                        │
│                                                                  │
│  Stage 8: Authorization Activation    (On-Chain) ◀── MILESTONE  │
│      │                                                           │
│      ▼                                                           │
│  Stage 9: Settlement                  (On-Chain) ◀── MILESTONE  │
│      │                                                           │
│      ▼                                                           │
│  Stage 10: Archival                   (On-Chain + DeNet)        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Discovery

**Location:** Off-Chain  
**Responsible Party:** Deal Sourcing Team  
**Duration:** Varies

### Required Actions

1. Identify candidate property
2. Confirm property type eligibility
3. Confirm geographic eligibility
4. Gather preliminary property data
5. Perform initial financial viability check

### Required Fields

| Field | Description | Source |
|-------|-------------|--------|
| Property Address | Full address | MLS/Public Records |
| Property Type | Residential/Commercial/Land | Listing |
| Asking Price | Current asking price | Listing |
| Square Footage | Building and lot size | Public Records |
| Year Built | Construction year | Public Records |
| Zoning | Current zoning classification | County |

### Output

- Discovery Report (internal memo)
- Go/No-Go decision

---

## Stage 2: Initial Analysis

**Location:** Off-Chain  
**Responsible Party:** Underwriting Team  
**Duration:** 3-5 business days

### Required Actions

1. Order preliminary title search
2. Request preliminary appraisal estimate
3. Calculate preliminary LTV
4. Estimate renovation costs (if applicable)
5. Project exit value
6. Calculate projected IRR

### Required Fields

| Field | Description | Source |
|-------|-------------|--------|
| Preliminary Title Status | Liens, encumbrances | Title Company |
| Estimated Value | ARV or As-Is value | Comparable sales |
| Estimated Renovation Cost | Itemized budget | Contractor estimate |
| Target Acquisition Price | Max offer price | Underwriting model |
| Projected LTV | Loan-to-value ratio | Calculation |
| Projected IRR | Internal rate of return | Pro forma |

### Output

- Initial Analysis Report
- Underwriting Model v0.1

---

## Stage 3: Due Diligence

**Location:** Off-Chain + DeNet Storage  
**Responsible Party:** Due Diligence Team  
**Duration:** 7-14 business days

### Required Actions

1. Order full appraisal
2. Order title commitment
3. Order property inspection
4. Order environmental assessment (if applicable)
5. Verify legal entity for acquisition
6. Finalize underwriting model
7. Upload all documents to DeNet

### Required Documents (DeNet CIDs)

| Document | CID Hash | Required |
|----------|----------|----------|
| Full Appraisal | [denet_cid] | Yes |
| Title Commitment | [denet_cid] | Yes |
| Property Inspection | [denet_cid] | Yes |
| Phase I Environmental | [denet_cid] | If applicable |
| Survey | [denet_cid] | If available |
| Purchase Agreement | [denet_cid] | Yes |
| Entity Documents | [denet_cid] | Yes |

### DeNet Upload Requirements

```
denet/
├── property/
│   ├── appraisal.pdf
│   ├── title-commitment.pdf
│   ├── inspection-report.pdf
│   └── survey.pdf
├── legal/
│   ├── purchase-agreement.pdf
│   └── spv-operating-agreement.pdf
└── underwriting/
    ├── underwriting-model.xlsx
    └── risk-summary.pdf
```

### Output

- Due Diligence Package (CID)
- Underwriting Model v1.0 (CID)
- Risk Summary Document (CID)

---

## Stage 4: PropertyPacket Submission

**Location:** On-Chain (CapitalBridgeHub)  
**Responsible Party:** Deal Coordinator  
**Event:** `PropertyPacketSubmitted`

### Required On-Chain Fields

```solidity
struct PropertyPacket {
    uint256 packetId;                    // Auto-generated
    bytes32 propertyDataHash;            // Keccak256 of property JSON
    bytes32 dueDiligencePackageCid;      // DeNet CID hash
    bytes32 underwritingModelHash;       // Keccak256 of model
    bytes32 riskSummaryHash;             // Keccak256 of risk summary
    uint256 maxApprovedCapital;          // Maximum capital request
    PacketState state;                   // Draft -> Submitted
    uint256 submittedAt;                 // Block timestamp
}
```

### Submission Checklist

- [ ] All due diligence documents uploaded to DeNet
- [ ] CIDs verified and accessible
- [ ] Underwriting model finalized
- [ ] Risk summary completed
- [ ] Max capital amount determined
- [ ] SPV entity identified

### Verification Command

```bash
cast call $CAPITAL_BRIDGE_HUB "packets(uint256)" $PACKET_ID --rpc-url $RPC_URL
```

---

## Stage 5: Attestation A

**Location:** On-Chain (CapitalBridgeHub)  
**Responsible Party:** RESEARCH_ATTESTOR_A_ROLE holder  
**Event:** `ResearchAttestedA`

### Attestor A Requirements

1. Review due diligence package
2. Verify underwriting model assumptions
3. Confirm risk summary accuracy
4. Sign attestation with role key

### Attestation Data Structure

```solidity
struct ResearchAttestation {
    address attestor;                     // Attestor A address
    bytes32 underwritingModelHash;        // Must match packet
    bytes32 riskSummaryHash;              // Must match packet
    bytes32 denetCidHash;                 // DeNet package CID
    uint256 timestamp;                    // Attestation time
    bool valid;                           // Currently valid
}
```

### Attestation Criteria

| Criterion | Threshold | Pass/Fail |
|-----------|-----------|-----------|
| LTV | <= 75% | Required |
| DSCR (if rental) | >= 1.25x | Required |
| Title Clear | Yes | Required |
| Appraisal Valid | < 90 days | Required |
| Inspection Clean | No major issues | Required |
| Environmental Clear | No Phase II needed | Required |

### Freshness Requirement

- Attestation valid for `attestationMaxAgeSeconds` (default: 30 days)
- If expired, must re-attest before approval

---

## Stage 6: Attestation B

**Location:** On-Chain (CapitalBridgeHub)  
**Responsible Party:** RESEARCH_ATTESTOR_B_ROLE holder  
**Event:** `ResearchAttestedB`

### Attestor B Requirements

1. Independent review (cannot be same person as A)
2. Must hold RESEARCH_ATTESTOR_B_ROLE (not A role)
3. Review same due diligence package
4. Confirm agreement with Attestor A findings
5. Sign attestation with role key

### Independence Enforcement

```solidity
require(
    !hasRole(RESEARCH_ATTESTOR_A_ROLE, msg.sender),
    "Attestor A cannot also be Attestor B"
);
```

### Output

- Both attestations A and B present
- Packet state: Submitted → Attested

---

## Stage 7: Risk Committee Decision

**Location:** On-Chain (CapitalBridgeHub)  
**Responsible Party:** RISK_COMMITTEE_ROLE holder  
**Events:** `PropertyPacketApproved` or `PropertyPacketRejected`

### Approval Requirements

1. Both attestations A and B present and valid
2. Attestations not expired (within maxAgeSeconds)
3. Risk committee review complete
4. Approval signed with role key

### Approval Command

```bash
cast send $CAPITAL_BRIDGE_HUB "approvePropertyPacket(uint256)" $PACKET_ID \
  --private-key $RISK_COMMITTEE_KEY \
  --rpc-url $RPC_URL
```

### Rejection Reasons

| Reason Code | Description |
|-------------|-------------|
| 1 | Attestation mismatch |
| 2 | Risk exceeds tolerance |
| 3 | Underwriting model flawed |
| 4 | Title issues discovered |
| 5 | Market conditions changed |
| 6 | Other (see notes) |

### Rejection Command

```bash
cast send $CAPITAL_BRIDGE_HUB "rejectPropertyPacket(uint256,uint8)" $PACKET_ID $REASON_CODE \
  --private-key $RISK_COMMITTEE_KEY \
  --rpc-url $RPC_URL
```

---

## Stage 8: Authorization Activation

**Location:** On-Chain (CapitalBridgeHub)  
**Responsible Party:** SETTLEMENT_AUTHORITY_ROLE holder  
**Event:** `AuthorizationActivated`

### Authorization Proposal

First, propose the authorization (starts timelock):

```bash
cast send $CAPITAL_BRIDGE_HUB "proposeAuthorization(uint256,uint256,uint256)" \
  $PACKET_ID $SPV_ID $APPROVED_AMOUNT \
  --private-key $RISK_COMMITTEE_KEY \
  --rpc-url $RPC_URL
```

### Timelock Wait

- Minimum: 24 hours (timelockSeconds)
- Authorization cannot activate until timelock elapsed

### Readiness Gate Check

Before activation, readiness gate must pass:

```solidity
function activateAuthorization(uint256 authId) external {
    require(hasRole(SETTLEMENT_AUTHORITY_ROLE, msg.sender));
    require(block.timestamp >= authorization.proposedAt + timelockSeconds);
    readinessGate.assertReady();  // Must pass
    // ... activation logic
}
```

### Activation Command

After timelock elapsed:

```bash
cast send $CAPITAL_BRIDGE_HUB "activateAuthorization(uint256)" $AUTH_ID \
  --private-key $SETTLEMENT_AUTHORITY_KEY \
  --rpc-url $RPC_URL
```

---

## Stage 9: Settlement

**Location:** On-Chain (CapitalBridgeHub)  
**Responsible Party:** SETTLEMENT_AUTHORITY_ROLE holder  
**Event:** `SettlementRecorded`

### Settlement Event

After off-chain SPV execution completes:

```solidity
struct SettlementEvent {
    uint256 settlementId;            // Auto-generated
    uint256 authId;                  // Referenced authorization
    uint256 settledAmount;           // Actual amount settled
    bytes32 proofHash;               // Proof document CID
    uint256 timestamp;               // Settlement time
}
```

### Settlement Command

```bash
cast send $CAPITAL_BRIDGE_HUB "recordSettlementEvent(uint256,uint256,bytes32)" \
  $AUTH_ID $SETTLED_AMOUNT $PROOF_HASH \
  --private-key $SETTLEMENT_AUTHORITY_KEY \
  --rpc-url $RPC_URL
```

### Post-Settlement

- Authorization marked as Settled
- Cannot be reused
- SPV now holds property

---

## Stage 10: Archival

**Location:** On-Chain + DeNet  
**Responsible Party:** DEFAULT_ADMIN_ROLE holder  
**Event:** `PropertyPacketArchived`

### Archival Requirements

1. Settlement complete OR rejection finalized
2. All documents preserved on DeNet
3. On-chain record immutable
4. Packet state → Archived

### Archival Command

```bash
cast send $CAPITAL_BRIDGE_HUB "archivePropertyPacket(uint256)" $PACKET_ID \
  --private-key $ADMIN_KEY \
  --rpc-url $RPC_URL
```

### Immutability Guarantee

Once archived:
- State cannot change
- Documents permanently preserved
- Audit trail complete

---

## Mapping: SOP Stages to CapitalBridgeHub Events

| Stage | Event | On-Chain |
|-------|-------|----------|
| 1. Discovery | (none) | No |
| 2. Initial Analysis | (none) | No |
| 3. Due Diligence | (none, DeNet upload) | No |
| 4. Packet Submission | PropertyPacketSubmitted | Yes |
| 5. Attestation A | ResearchAttestedA | Yes |
| 6. Attestation B | ResearchAttestedB | Yes |
| 7. Approval | PropertyPacketApproved | Yes |
| 7. Rejection | PropertyPacketRejected | Yes |
| 8. Authorization | AuthorizationActivated | Yes |
| 9. Settlement | SettlementRecorded | Yes |
| 10. Archival | PropertyPacketArchived | Yes |

---

## Version Control

### Document Versioning

- SOP version tracked in header
- Changes require governance approval
- Historical versions preserved

### Schema Versioning

- property-packet-schema.json: v1.0
- underwriting-model-schema.json: v1.0
- All schemas have version field

---

## Appendix: Required Roles

| Role | Stage Access |
|------|--------------|
| Deal Sourcing | Stages 1-3 |
| Underwriting | Stages 2-3 |
| Due Diligence | Stage 3 |
| Deal Coordinator | Stage 4 |
| RESEARCH_ATTESTOR_A_ROLE | Stage 5 |
| RESEARCH_ATTESTOR_B_ROLE | Stage 6 |
| RISK_COMMITTEE_ROLE | Stage 7 |
| SETTLEMENT_AUTHORITY_ROLE | Stages 8-9 |
| DEFAULT_ADMIN_ROLE | Stage 10 |

---

## Related Documentation

- [DeNet Enforcement Proof](../storage/denet-enforcement-proof.md) - Canonical evidence of DeNet CID enforcement
- [DeNet Architecture](../storage/denet-architecture.md) - Technical storage implementation
- [DeNet Operations SOP](./denet-sop.md) - Standard operating procedures for storage
- [Capital Bridge Analysis](../internal/CAPITAL-BRIDGE-MASTER-PROMPT-ANALYSIS.md) - Implementation plan

---

## Document Control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial creation |
| 1.1 | 2026-01-31 | Added DeNet enforcement cross-references |

**Last Updated:** January 31, 2026  
**Classification:** Operational Procedure
