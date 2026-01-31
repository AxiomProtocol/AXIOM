# AXIOM PROTOCOL SOP Operations Manual

**Document Type:** Internal Operations Manual  
**Classification:** Internal Use Only  
**Version:** 1.0.0  
**Effective Date:** January 31, 2026  
**Last Updated:** January 31, 2026

---

## Table of Contents

1. [Purpose and Scope](#purpose-and-scope)
2. [System Status Baseline](#system-status-baseline)
3. [Execution Phases Overview](#execution-phases-overview)
4. [Phase A: System Activation (0-30 Days)](#phase-a-system-activation-0-30-days)
5. [Phase B: Infrastructure Revenue (30-90 Days)](#phase-b-infrastructure-revenue-30-90-days)
6. [Phase C: Capital Light Deployment (90-180 Days)](#phase-c-capital-light-deployment-90-180-days)
7. [Phase D: Scale and Institutionalization (6-24 Months)](#phase-d-scale-and-institutionalization-6-24-months)
8. [Capital Discipline Principles](#capital-discipline-principles)
9. [Recommended Next Steps Selector](#recommended-next-steps-selector)
10. [Operating Cadence](#operating-cadence)
11. [Roles and Responsibilities](#roles-and-responsibilities)
12. [Artifact List](#artifact-list)
13. [Change Control and Versioning](#change-control-and-versioning)

---

## Purpose and Scope

### Purpose

This document converts the completed Axiom Protocol architecture into an executable operations manual. It serves as the internal playbook for activating Axiom Protocol as a real-world acquisition engine with minimal out-of-pocket capital.

### Scope

This manual applies to all internal operations related to:

- Capital Bridge workflow execution
- Property research and attestation processes
- Node economy activation and management
- Treasury operations and capital deployment
- Governance and compliance activities

### Primary Outcomes

- [ ] Generate protocol-native revenue before asset purchases
- [ ] Build verifiable underwriting and governance history
- [ ] Reduce capital friction for real estate acquisition
- [ ] Position Axiom as infrastructure, not a product

### Guiding Principle

> **Controlled credibility leads to revenue leads to acquisitions.**

---

## System Status Baseline

### Fully Implemented and Locked

The following components are production-ready and must not be modified without governance approval:

| Component | Status | Location |
|-----------|--------|----------|
| Capital Bridge Framework | LOCKED | `contracts/capital-bridge/` |
| Enforced State Transitions | LOCKED | `CapitalBridgeHub.sol` |
| Dual Research Attestation | LOCKED | `ResearchAttestation` struct |
| DeNet Storage Enforcement | ACTIVE | `packages/denet/` |
| Property Research SOP | ACTIVE | `docs/ops/property-research-sop.md` |
| Observer Transparency Dashboard | ACTIVE | `/observer` route |
| Governance Posture | ALIGNED | Institutional review ready |

### Verification Checklist

- [x] Capital Bridge state machine transitions verified
- [x] Dual attestor requirement enforced on-chain
- [x] DeNet CID validation active for packet submissions
- [x] Observer dashboard displaying real-time metrics
- [x] Role-based access control configured
- [x] Emergency pause mechanism tested

---

## Execution Phases Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXECUTION PHASES TIMELINE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase A          Phase B          Phase C          Phase D        │
│  0-30 days        30-90 days       90-180 days      6-24 months    │
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  System  │ -> │  Infra   │ -> │  Capital │ -> │  Scale   │     │
│  │Activation│    │  Revenue │    │   Light  │    │ & Inst.  │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                     │
│  No capital      Treasury         First            1M+ assets      │
│  deployed        inflow           settlements      coordinated     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| Phase | Duration | Objective | Capital Required |
|-------|----------|-----------|------------------|
| A | 0-30 days | Prove operational discipline | None |
| B | 30-90 days | Fund operations from infrastructure | None |
| C | 90-180 days | Establish settlement history | Minimal |
| D | 6-24 months | Coordinate 1M+ in assets | Scaled |

---

## Phase A: System Activation (0-30 Days)

### Objective

Prove operational discipline without risking capital.

### A1: Capital Bridge Dry Runs

**Goal:** Exercise the full property research lifecycle without capital deployment.

#### Actions

1. Submit real properties as PropertyPackets
2. Complete full lifecycle: Draft → Submitted → Dual Attested → Approved → Archived
3. Record zero settlement events (dry run only)

#### Deliverables Checklist

- [ ] 10-25 completed research packets submitted
- [ ] Zero policy violations recorded
- [ ] Clean event logs with no errors
- [ ] All packets reach Archived state

#### Acceptance Criteria

| Criterion | Target | Actual | Pass/Fail |
|-----------|--------|--------|-----------|
| Packets submitted | >= 10 | ___ | [ ] |
| Packets with dual attestation | 100% | ___ | [ ] |
| Policy violations | 0 | ___ | [ ] |
| Emergency pauses | 0 | ___ | [ ] |

### A2: Observer-First Transparency

**Goal:** Publish process metrics to build institutional credibility.

#### Metrics to Publish

Publish process metrics only (not yields):

- [ ] Packet count (total submitted)
- [ ] Approval ratio (approved / total)
- [ ] Attestation freshness (average age)
- [ ] Rejection reasons (categorized)

#### Prohibited Disclosures

- No yield projections
- No return estimates
- No capital deployment amounts

### Phase A Completion Criteria

| Requirement | Status |
|-------------|--------|
| Research pipeline fully exercised | [ ] |
| Zero emergency pauses triggered | [ ] |
| Consistent SOP compliance demonstrated | [ ] |
| Observer dashboard operational | [ ] |

---

## Phase B: Infrastructure Revenue (30-90 Days)

### Objective

Fund operations before deploying capital.

### B1: Node Economy Soft Launch

**Goal:** Activate non-financial nodes to generate protocol revenue.

#### Node Types to Activate

| Node Type | Description | Priority |
|-----------|-------------|----------|
| Research Nodes | Property research validation | High |
| Indexing Nodes | Data indexing services | Medium |
| Storage Nodes | DeNet storage participation | Medium |

#### Activation Requirements

For each node activation:

- [ ] Activation fee collected
- [ ] SLA acceptance signed
- [ ] Identity registration completed
- [ ] No ROI guarantees provided

#### Revenue Sources

| Source | Description | Destination |
|--------|-------------|-------------|
| Activation fees | One-time node registration | Treasury |
| Data access services | API and query fees | Monitoring |
| Research validation | Attestation participation | Security buffers |

### B2: Research Monetization

**Goal:** Monetize decision quality, not assets.

#### Products to Offer

- [ ] Verified underwriting packets
- [ ] Market risk summaries
- [ ] Due diligence artifacts

#### Target Buyers

| Buyer Type | Use Case |
|------------|----------|
| Small funds | Deal sourcing |
| Family offices | Due diligence validation |
| Syndicators | Underwriting verification |
| DeFi RWA protocols | Research inputs |

#### Key Insight

> **Monetize decision quality, not assets.**

### Phase B Completion Criteria

| Requirement | Status |
|-------------|--------|
| Treasury inflow from non-investment sources | [ ] |
| At least one paying external research consumer | [ ] |
| Stable node participation (>= 5 active nodes) | [ ] |
| Revenue covers operational costs | [ ] |

---

## Phase C: Capital Light Deployment (90-180 Days)

### Objective

Establish settlement history with minimal capital exposure.

### C1: Mortgage Note Focus (First Asset Class)

**Goal:** Create real settlement history with controlled risk.

#### Strategy

- Acquire partial notes or participations (not whole loans)
- Record SettlementEvents on-chain
- Log all servicing events for transparency

#### Outcomes

| Outcome | Benefit |
|---------|---------|
| Real settlement history | Proves execution capability |
| Cashflow proof | Demonstrates protocol viability |
| Institutional comfort | Builds credibility for larger deals |

#### Checklist

- [ ] Identify mortgage note sourcing partners
- [ ] Complete first partial note acquisition
- [ ] Record SettlementEvent on-chain
- [ ] Log servicing events in observer dashboard

### C2: First SPV (Delayed Intentionally)

**Goal:** Delay SPV formation until institutional readiness proven.

#### SPV Activation Prerequisites

Only proceed after:

- [ ] Multiple settled authorizations completed
- [ ] Zero governance incidents recorded
- [ ] Clean reporting history established

#### SPV Structure

| Element | Approach |
|---------|----------|
| Legal entity | Off-chain SPV |
| Authorization | On-chain via CapitalBridgeHub |
| Reporting | On-chain transparency |
| Retail exposure | None (no pooled retail) |

### Phase C Completion Criteria

| Requirement | Status |
|-------------|--------|
| First settled transaction recorded | [ ] |
| Zero settlement disputes | [ ] |
| Clean audit trail maintained | [ ] |
| SPV prerequisites met | [ ] |

---

## Phase D: Scale and Institutionalization (6-24 Months)

### Objective

Coordinate 1M+ in assets responsibly.

### Unlocked Capabilities

After completing Phases A-C, the following become available:

| Capability | Description |
|------------|-------------|
| Larger SPVs | Multi-property structures |
| DAO-aligned capital | Community treasury participation |
| Structured note pools | Aggregated debt instruments |
| Layer 5G securitization | On-chain securitization paths |

### Capital Friction Reduction

| Method | Description |
|--------|-------------|
| Seller financing | Reduce upfront capital requirements |
| Capital partners | Shared equity structures |
| Treasury-backed guarantees | Protocol backstop mechanisms |

### Scaling Checklist

- [ ] 1M+ in coordinated assets achieved
- [ ] Multiple active SPVs operational
- [ ] Capital partner relationships established
- [ ] Layer 5G securitization pathway documented

---

## Capital Discipline Principles

### Non-Negotiables

These principles must never be violated:

| # | Principle | Enforcement |
|---|-----------|-------------|
| 1 | No capital deployed without dual attestation | On-chain requirement |
| 2 | No approvals without DeNet-backed records | CID enforcement |
| 3 | No emergency changes without disclosure | Observer transparency |
| 4 | No yield promises | Marketing compliance |
| 5 | No rushed acquisitions | Timelock enforcement |

### Violation Response

Any violation of these principles requires:

1. Immediate pause of affected operations
2. Incident report filed within 24 hours
3. Governance review within 7 days
4. Corrective action plan before resumption

---

## Recommended Next Steps Selector

Choose ONE immediate priority based on current phase:

### If in Phase A (System Activation)

- [ ] **Option 1:** Produce 10 real Property Research Packets

### If in Phase B (Infrastructure Revenue)

- [ ] **Option 2:** Prepare Node Activation Policy and fee schedule
- [ ] **Option 3:** Identify mortgage note sourcing partners

### If in Phase C (Capital Light)

- [ ] **Option 4:** Define first external research buyer profile

### Decision Matrix

| Current Status | Recommended Action | Owner |
|----------------|-------------------|-------|
| No packets submitted | Option 1 | Research Lead |
| >= 10 packets complete | Option 2 | Node Operator Lead |
| Node economy live | Option 3 | Acquisitions Lead |
| First settlement pending | Option 4 | Business Development |

---

## Operating Cadence

### Daily Operations

| Task | Owner | Time |
|------|-------|------|
| Review new packet submissions | Research Attestor A | 9:00 AM |
| Check node health metrics | Node Operator | 10:00 AM |
| Monitor observer dashboard | Operations | 2:00 PM |
| Review attestation queue | Research Attestor B | 4:00 PM |

### Weekly Operations

| Task | Owner | Day |
|------|-------|-----|
| Pipeline review meeting | All roles | Monday |
| Risk committee review | Risk Committee | Wednesday |
| Metrics summary publication | Operations | Friday |

### Monthly Operations

| Task | Owner | Timing |
|------|-------|--------|
| Governance health review | Founder | 1st week |
| Treasury reconciliation | Treasury Lead | 2nd week |
| SOP compliance audit | Operations | 3rd week |
| External reporting | Reporting Oracle | 4th week |

---

## Roles and Responsibilities

### Founder

| Responsibility | Authority Level |
|----------------|-----------------|
| Strategic direction | Final |
| Capital allocation approval | Final |
| Emergency pause authority | Immediate |
| External partnership approval | Final |

### Research Attestor A

| Responsibility | Authority Level |
|----------------|-----------------|
| First attestation on packets | Independent |
| Underwriting model verification | Technical |
| Risk summary validation | Analytical |
| DeNet CID verification | Required |

### Research Attestor B

| Responsibility | Authority Level |
|----------------|-----------------|
| Second attestation on packets | Independent |
| Cross-verification of Attestor A | Required |
| Freshness requirement check | Required |
| Final attestation approval | Shared |

### Reporting Oracle

| Responsibility | Authority Level |
|----------------|-----------------|
| Capital readiness attestation | Technical |
| External data integration | Operational |
| Metrics publication | Scheduled |
| Observer dashboard updates | Continuous |

### Risk Committee

| Responsibility | Authority Level |
|----------------|-----------------|
| Packet approval/rejection | Committee vote |
| Authorization approval | Committee vote |
| Exception handling | Deliberative |
| Policy updates | Proposal only |

### Settlement Authority

| Responsibility | Authority Level |
|----------------|-----------------|
| Settlement event recording | Operational |
| SPV coordination | Delegated |
| Fund disbursement approval | Dual signature |
| Compliance verification | Required |

---

## Artifact List

### Documentation Artifacts

| Artifact | Location | Status |
|----------|----------|--------|
| Ecosystem Whitepaper | `docs/AXIOM_ECOSYSTEM_WHITEPAPER.md` | Complete |
| Property Research SOP | `docs/ops/property-research-sop.md` | Active |
| DeNet Architecture | `docs/storage/denet-architecture.md` | Active |
| DeNet Enforcement Proof | `docs/storage/denet-enforcement-proof.md` | Active |
| Capital Bridge Analysis | `docs/internal/CAPITAL-BRIDGE-MASTER-PROMPT-ANALYSIS.md` | Reference |
| Development Roadmap | `docs/internal/DEVELOPMENT-ROADMAP-2026.md` | Internal |

### Technical Artifacts

| Artifact | Location | Status |
|----------|----------|--------|
| DeNet Client | `packages/denet/denetClient.ts` | Active |
| DeNet Uploader | `packages/denet/denetUploader.ts` | Active |
| CID Enforcement | `packages/denet/cidEnforcement.ts` | Active |
| Submit Packet API | `pages/api/admin/capital-bridge/submit-packet.ts` | Active |

### Dashboard Artifacts

| Artifact | Location | Status |
|----------|----------|--------|
| Observer Dashboard | `/observer` | Active |
| Capital Bridge Metrics | `/observer/capital-bridge` | Active |
| Node Economy Metrics | `/observer/node-economy` | Planned |
| DeNet Metrics Panel | `components/observer/DeNetMetricsPanel.tsx` | Active |

---

## Change Control and Versioning

### Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-31 | Operations Team | Initial release |

### Change Control Process

1. **Proposal:** Submit change request via governance channel
2. **Review:** Risk Committee evaluates impact
3. **Approval:** Founder signs off on significant changes
4. **Implementation:** Operations updates documentation
5. **Notification:** All stakeholders informed

### Document Classification

| Level | Description | Access |
|-------|-------------|--------|
| Internal | This document | Authorized personnel only |
| Confidential | Strategy details | Executive team only |
| Public | Observer metrics | Open access |

### Amendment Rules

- Minor updates: Operations Lead approval
- Section additions: Risk Committee review
- Principle changes: Governance vote required
- Emergency amendments: Founder + Risk Committee

---

## Final Note

> **Axiom is financial infrastructure with memory.**
> 
> **Execution over optics.**

---

*This document is the property of Axiom Protocol. Unauthorized distribution is prohibited.*

**Document Control:**  
- Owner: Operations Team  
- Review Cycle: Monthly  
- Next Review: February 28, 2026
