# Capital Bridge Master Prompt Analysis

## Executive Summary

This document analyzes the 10-step implementation plan for building institutional-grade capital bridge infrastructure. The master prompt outlines a comprehensive system for connecting on-chain capital with off-chain real estate acquisitions via SPVs.

**Document Date:** January 31, 2026  
**Analyst:** Axiom Protocol Development Team  
**Classification:** Internal Development Reference

---

## Master Prompt Structure Overview

| Step | Title | Status | Priority | Complexity |
|------|-------|--------|----------|------------|
| 0 | Repo Discovery & Inventory | DONE | P0 | Low |
| 1 | Technical Whitepaper v1 | DONE | P0 | Medium |
| 2 | Layer 5 Sublayers (incl. 5G) | TODO | P1 | Medium |
| 3 | CapitalBridgeHub Contract | TODO | P1 | High |
| 4 | CapitalReadinessGate Contract | TODO | P1 | Medium |
| 5 | Property Research SOP | TODO | P2 | Medium |
| 6 | Node Economy Spec | DONE | P2 | Medium |
| 7 | Observer Dashboard Spec | TODO | P2 | Low |
| 8 | Read-Only API Endpoints | TODO | P3 | Low |
| 9 | Audit Harness | TODO | P1 | High |
| 10 | Deployment Commands | TODO | P3 | Low |

---

## Step-by-Step Analysis

### STEP 0: Repo Discovery & Inventory

**Purpose:** Create baseline inventory of all existing components.

**Required Outputs:**
- `docs/deployments.md`
- `docs/contract-registry.md`
- `docs/current-roles-and-permissions.md`
- `docs/module-to-contract-map.md`
- `docs/build-report.md`

**Current Status:** COMPLETED via AXIOM_ECOSYSTEM_WHITEPAPER.md
- 60+ contracts documented
- All addresses catalogued
- Roles identified

**Gap Analysis:**
- Need separate files for institutional consumption
- Need explicit role holder addresses
- Need module-to-contract mapping table

---

### STEP 1: Technical Whitepaper v1

**Purpose:** Create build-ready technical documentation incorporating the 8-layer architecture.

**Required Outputs:**
- `docs/whitepaper/axiom-technical-whitepaper-v1.md`
- `docs/whitepaper/appendix-links.md`
- `docs/whitepaper/appendix-contracts.md`

**8-Layer Architecture Defined:**

| Layer | Name | Purpose |
|-------|------|---------|
| 1 | Physical Asset Layer | Non-on-chain inputs (properties, notes, rehab data) |
| 2 | Data & Verification Layer | Convert off-chain to immutable records (DeNet, CID) |
| 3 | Oracle & Metrics Layer | Risk signals (LTV, DSCR, utilization) |
| 4 | Arbitrum Execution Layer | Sovereign transaction verification |
| 5 | Core Protocol Layer | AXUSD, Euler, lending, settlement |
| 6 | Governance & Compliance Layer | Observation windows, disclosures, dashboards |
| 7 | Node Economy Layer | Storage, execution, indexing, research nodes |
| 8 | Capital Deployment Layer | SPV acquisitions, mortgage notes, rehab financing |

**Current Status:** PARTIALLY DONE
- General ecosystem whitepaper exists
- Need to restructure into 8-layer format
- Need specific build-ready sections

---

### STEP 2: Layer 5 Sublayers (Including 5G)

**Purpose:** Define sublayers within the Core Protocol Layer.

**Layer 5 Sublayers:**

| Sublayer | Name | Purpose | Status |
|----------|------|---------|--------|
| 5A | Settlement & Accounting | Payment routing, interest split | EXISTS |
| 5B | Credit Origination Interfaces | Loan creation workflows | EXISTS |
| 5C | Risk Controls & Parameterization | LTV, DSCR enforcement | EXISTS |
| 5D | Revenue Routing | Fee distribution | EXISTS |
| 5E | Capital Bridge to SPV | Off-chain coordination | NEW |
| 5F | Transparency & Observer | Dashboards, reporting | EXISTS |
| 5G | Securitization & Note Aggregation | Pool formation, instruments | NEW |

**Layer 5G Requirements (NEW):**

1. **Standardized Instruments:**
   - Whole Loan
   - Participation
   - Note
   - Revenue Share
   - Rent Stream Contract

2. **Pool Concept:**
   - Eligibility filters
   - Formation rules
   - Audit trail
   - Cashflow schedule hashes

3. **Registry Outputs:**
   - Instrument Registry
   - Pool Registry
   - Servicing Event Log

4. **Constraints:**
   - No public issuance required
   - Support internal treasury pathways
   - Support accredited-only pathways

---

### STEP 3: CapitalBridgeHub Contract

**Purpose:** Coordinate capital deployment to SPVs with research attestation.

**Required Roles (AccessControl):**

| Role | Purpose |
|------|---------|
| DEFAULT_ADMIN_ROLE | Full administrative control |
| RISK_COMMITTEE_ROLE | Risk parameter management |
| SETTLEMENT_AUTHORITY_ROLE | Settlement operations |
| REPORTING_ORACLE_ROLE | Readiness attestations |
| GUARDIAN_ROLE | Emergency controls |
| RESEARCH_ATTESTOR_A_ROLE | First attestation signer |
| RESEARCH_ATTESTOR_B_ROLE | Second attestation signer |

**Core Objects:**

```solidity
struct PropertyPacket {
    uint256 packetId;
    bytes32 propertyDataHash;
    bytes32 titleDocHash;
    bytes32 appraisalHash;
    uint256 maxApprovedCapital;
    PacketState state;
    uint256 submittedAt;
    uint256 approvedAt;
    ResearchAttestation attestationA;
    ResearchAttestation attestationB;
}

struct SPVEntity {
    uint256 spvId;
    bytes32 legalEntityHash;
    address paymentAddress;
    bool active;
}

struct AcquisitionAuthorization {
    uint256 authId;
    uint256 packetId;
    uint256 spvId;
    uint256 approvedAmount;
    uint256 proposedAt;
    uint256 activatedAt;
    AuthState state;
}

struct SettlementEvent {
    uint256 settlementId;
    uint256 authId;
    uint256 settledAmount;
    bytes32 proofHash;
    uint256 timestamp;
}

struct ResearchAttestation {
    address attestor;
    bytes32 underwritingModelHash;
    bytes32 riskSummaryHash;
    bytes32 denetCidHash;
    uint256 timestamp;
    bool valid;
}
```

**State Machines:**

```
PropertyPacket States:
Draft -> Submitted -> Attested -> Approved OR Rejected -> Archived OR Expired

Authorization States:
Proposed -> Timelocked -> Active -> Settled OR Canceled OR Expired
```

**Critical Invariants:**

1. Authorization Active only after 24h timelock elapsed
2. approvedAmount <= packet.maxApprovedCapital
3. SettlementEvent must reference an Authorization
4. Settled authorizations cannot be reused
5. All metadata references must be CID hash or content hash
6. Both attestations A and B required before approval
7. Attestors must be distinct role holders
8. Attestation freshness: maxAgeSeconds (default 30 days)

**Functions to Implement:**

| Function | Role Required | Purpose |
|----------|---------------|---------|
| submitPropertyPacket | Any | Create new packet |
| attestResearchPacketA | RESEARCH_ATTESTOR_A_ROLE | First attestation |
| attestResearchPacketB | RESEARCH_ATTESTOR_B_ROLE | Second attestation |
| clearResearchAttestations | RISK_COMMITTEE_ROLE | Clear attestations |
| approvePropertyPacket | RISK_COMMITTEE_ROLE | Approve packet |
| rejectPropertyPacket | RISK_COMMITTEE_ROLE | Reject packet |
| archivePropertyPacket | DEFAULT_ADMIN_ROLE | Archive packet |
| registerSPV | SETTLEMENT_AUTHORITY_ROLE | Register SPV entity |
| proposeAuthorization | RISK_COMMITTEE_ROLE | Propose capital deployment |
| activateAuthorization | SETTLEMENT_AUTHORITY_ROLE | Activate after timelock |
| cancelAuthorization | GUARDIAN_ROLE | Cancel authorization |
| expireAuthorization | Any (permissionless) | Expire if time elapsed |
| recordSettlementEvent | SETTLEMENT_AUTHORITY_ROLE | Record settlement |
| setCapitalReadinessGate | DEFAULT_ADMIN_ROLE + timelock | Set gate address |
| setTimelockSeconds | DEFAULT_ADMIN_ROLE + timelock | Update timelock |
| setAttestationMaxAgeSeconds | DEFAULT_ADMIN_ROLE + timelock | Update max age |
| pause | GUARDIAN_ROLE | Pause contract |
| unpause | DEFAULT_ADMIN_ROLE | Unpause contract |

---

### STEP 4: CapitalReadinessGate Contract

**Purpose:** Prevent authorization activation unless minimum readiness thresholds met.

**Readiness Configuration:**

| Parameter | Type | Purpose |
|-----------|------|---------|
| requiredAuditHash | bytes32 | Required audit reference |
| minimumUptimeBps | uint16 | Minimum uptime (basis points) |
| minimumObservationDaysElapsed | uint16 | Days since observation start |
| maxIncidentsAllowed | uint16 | Maximum security incidents |
| minimumTVLUsd | uint256 | Minimum TVL (0 = disabled) |
| freezeWindowSeconds | uint256 | Freeze period (0 = disabled) |

**Readiness Attestation Data:**

```solidity
struct ReadinessAttestation {
    uint256 uptimeBps;
    uint256 incidentsCount;
    uint256 tvlUsd;
    uint256 lastUpdated;
    uint256 observationStartTimestamp;
    bytes32 auditHash;
}
```

**Integration:**
- CapitalBridgeHub.activateAuthorization must call gate.assertReady()
- Additive module only (does not modify existing contracts)

---

### STEP 5: Property Research SOP

**Purpose:** Define operational procedures for property research and attestation.

**Required Outputs:**
- `docs/ops/property-research-sop.md`
- `docs/ops/property-packet-schema.json`
- `docs/ops/underwriting-model-schema.json`

**SOP Stages:**

1. **Discovery** - Property identification
2. **Initial Analysis** - Preliminary valuation
3. **Due Diligence** - Title, appraisal, inspection
4. **Underwriting** - Financial modeling
5. **Attestation A** - First independent review
6. **Attestation B** - Second independent review
7. **Approval/Rejection** - Risk committee decision
8. **Authorization** - Capital allocation
9. **Settlement** - SPV execution
10. **Archival** - Record preservation

**Mapping to CapitalBridgeHub Events:**

| SOP Stage | Event |
|-----------|-------|
| Discovery | (off-chain) |
| Initial Analysis | (off-chain) |
| Due Diligence | PropertyPacketSubmitted |
| Attestation A | ResearchAttestedA |
| Attestation B | ResearchAttestedB |
| Approval | PropertyPacketApproved |
| Rejection | PropertyPacketRejected |
| Authorization | AuthorizationActivated |
| Settlement | SettlementRecorded |
| Archival | PropertyPacketArchived |

---

### STEP 6: Node Economy Spec

**Purpose:** Define node classes, activation, and reward models.

**Node Classes:**

| Class | Function | Hardware | Reward Source |
|-------|----------|----------|---------------|
| Storage | DeNet data hosting | SSD, bandwidth | Storage fees |
| Execution | Arbitrum replicas | Full node | Query fees |
| Indexing | Event indexing | Database, CPU | API fees |
| Research | Property research | N/A (human) | Attestation fees |

**Research Node Qualification:**
- RESEARCH_ATTESTOR_A_ROLE eligibility
- RESEARCH_ATTESTOR_B_ROLE eligibility
- Cannot hold both roles simultaneously
- Must pass accreditation
- Must maintain attestation quality metrics

**Reward Model:**
- Non-inflationary
- Funded from protocol revenue
- Performance-based

---

### STEP 7: Observer Dashboard Spec

**Purpose:** Define metrics for institutional transparency.

**Dashboard Sections:**

| Section | Metrics |
|---------|---------|
| Euler Vault | TVL, utilization, rates, collateral breakdown |
| Revenue Routing | Protocol take rate, distributions |
| Capital Bridge | Packets count, attested, approved, authorized, settled |
| Readiness Gate | Uptime, incidents, audit hash, days elapsed |
| Securitization 5G | Instruments, pools, servicing events |
| Research | Attestation count, freshness, failure reasons |

---

### STEP 8: Read-Only API Endpoints

**Purpose:** Safe read-only access to capital bridge data.

**Endpoints:**

| Endpoint | Response |
|----------|----------|
| GET /api/capital-bridge/packets | List of property packets |
| GET /api/capital-bridge/attestations | Attestation history |
| GET /api/capital-bridge/authorizations | Authorization list |
| GET /api/capital-bridge/settlements | Settlement records |
| GET /api/readiness/status | Current readiness state |

---

### STEP 9: Audit Harness

**Purpose:** Ensure no breaking changes to existing contracts.

**Audit Harness Requirements:**

1. Compile all contracts
2. Run unit tests
3. Role and permission diff
4. Validate invariants
5. Confirm no existing artifacts changed
6. Fail build on breaking change

**Output Files:**
- `docs/module-to-contract-map.md` (updated)
- `docs/permissions-diff.md`
- `docs/deployments.md` (updated)
- `docs/build-report.md`

---

### STEP 10: Deployment Commands

**Command 1: Build & Test**
```bash
npm install && npm run test && npm run audit-harness && npm run build:docs && git add . && git commit -m "Build: Capital Bridge modules"
```

**Command 2: Push to Origin**
```bash
git push origin main
```

---

## Existing vs. New Components

### Already Exists (Step 0 Inventory)

| Component | Location | Status |
|-----------|----------|--------|
| GovernanceHub | 0x52Dc85fd653a75323b5307f4D2629ab9A070530E | Deployed |
| 24h Timelock | GovernanceHub | Active |
| Role-based Access | All contracts | Active |
| Observer Dashboard | /observer | Active |
| Euler Integration | 0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059 | Deployed |
| Revenue Routing | AXUSDRevenueRouter | Deployed |
| Risk Controls | RiskConfig V3, DSCRRiskConfig V3 | Deployed |

### Must Be Built (New)

| Component | Files | Priority |
|-----------|-------|----------|
| CapitalBridgeHub | contracts/capital-bridge/*.sol | P1 |
| CapitalReadinessGate | contracts/readiness/*.sol | P1 |
| Layer 5G Securitization | docs/architecture/ + contracts | P1 |
| Property Research SOP | docs/ops/ | P2 |
| Node Economy Spec | docs/node-economy/ | P2 |
| Audit Harness | scripts/audit-harness.ts | P1 |

---

## Constraint Analysis

### Non-Negotiable Constraints

1. **No Breaking Changes** - All changes must be additive
2. **Role-Gated Privileged Access** - Use AccessControl
3. **Timelocked Parameters** - 24h minimum for sensitive changes
4. **Audit Harness Required** - Must pass before merge
5. **Markdown in /docs** - All documentation
6. **Solidity in /contracts** - All contracts
7. **Tooling in /scripts** - All scripts

### Observation Window Alignment

Current observation window ends: **March 26, 2026**

During observation window:
- No treasury capital deployment
- External liquidity only (Euler)
- Documentation and preparation allowed
- Contract development allowed (not deployment)

Post observation window:
- Capital bridge activation possible
- SPV coordination enabled
- Research attestation system live

---

## Risk Assessment

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Breaking existing contracts | Audit harness, hash verification |
| Role escalation | Distinct role enforcement |
| Attestation gaming | Two independent attestors required |
| Timelock bypass | On-chain enforcement |

### Operational Risks

| Risk | Mitigation |
|------|------------|
| Research quality | Attestation freshness, quality metrics |
| SPV coordination | Legal documentation hashes |
| Settlement disputes | On-chain proof hashes |

---

## Implementation Timeline

### Phase 1: Documentation (Week 1-2)
- Complete Layer 5 sublayers document
- Create Property Research SOP
- Create Node Economy Spec
- Update Observer Dashboard Spec

### Phase 2: Contract Development (Week 3-4)
- CapitalBridgeTypes.sol
- CapitalBridgeHub.sol
- CapitalReadinessGate.sol
- Unit tests

### Phase 3: Integration (Week 5-6)
- API endpoints
- Audit harness
- Build commands
- Documentation finalization

### Phase 4: Review (Week 7-8)
- Internal audit
- External review preparation
- Institutional readiness check

---

## Next Actions

1. Create Layer 5 sublayers document
2. Draft CapitalBridgeHub contract specification
3. Draft CapitalReadinessGate contract specification
4. Create Property Research SOP
5. Create Node Economy Spec
6. Implement audit harness
7. Add API endpoints

---

**Document Version:** 1.0  
**Last Updated:** January 31, 2026  
**Classification:** Internal Development Reference
