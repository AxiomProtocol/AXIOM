# Axiom Protocol Internal Development Roadmap

## 2026 Technical Development Guide

**Document Date:** January 31, 2026  
**Classification:** Internal Development Reference  
**Observation Window End:** March 26, 2026

---

## Executive Summary

This roadmap guides the implementation of institutional-grade capital bridge infrastructure for the Axiom Protocol. All development must be additive (no breaking changes) and aligned with the observation window timeline.

---

## Current State Assessment

### Completed Infrastructure

| Category | Components | Status |
|----------|------------|--------|
| Core Token | AXM (15B supply) | Deployed |
| Stablecoin | AXUSD + GENIUS compliance | Deployed |
| Lending | Euler V2 integration | Live |
| Governance | GovernanceHub + 24h timelock | Deployed |
| Real Estate | Fix & Flip + DSCR loans | Deployed |
| Community | SUSU + KeyGrow | Deployed |
| Transparency | Observer Dashboard | Active |
| API | 20+ endpoints | Active |

### Total Deployed Contracts: 60+

### Missing Infrastructure (To Build)

| Category | Components | Priority |
|----------|------------|----------|
| Capital Bridge | CapitalBridgeHub | P1 |
| Readiness Gate | CapitalReadinessGate | P1 |
| Securitization | Layer 5G contracts | P1 |
| Node Economy | Registry + Rewards | P2 |
| Research System | Attestation infrastructure | P2 |

---

## Development Phases

### Phase 1: Observation Window (Now - March 26, 2026)

**Objective:** Build documentation and contracts, do not deploy capital.

#### Q1 2026 Deliverables

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| 1-2 | Documentation | Layer 5 sublayers, Property SOP, Node spec |
| 3-4 | Contract Dev | CapitalBridgeHub, CapitalReadinessGate |
| 5-6 | Integration | API endpoints, audit harness |
| 7-8 | Review | Internal audit, external prep |
| 9-10 | Finalization | Build commands, deployment prep |
| 11-12 | Observation | Monitor Euler, collect metrics |

#### Key Constraints During Observation

- No treasury capital deployment
- External liquidity only (Euler V2)
- Contract development allowed
- Testing allowed
- Documentation required

---

### Phase 2: Capital Bridge Activation (Q2 2026)

**Objective:** Deploy capital bridge, begin SPV coordination.

#### April 2026

| Week | Task |
|------|------|
| 1 | Deploy CapitalBridgeHub to testnet |
| 2 | Deploy CapitalReadinessGate to testnet |
| 3 | Integration testing |
| 4 | Security audit initiation |

#### May 2026

| Week | Task |
|------|------|
| 1 | Audit remediation |
| 2 | Mainnet deployment prep |
| 3 | CapitalBridgeHub mainnet deployment |
| 4 | CapitalReadinessGate mainnet deployment |

#### June 2026

| Week | Task |
|------|------|
| 1 | First property packet submission |
| 2 | Research attestation workflow testing |
| 3 | SPV registration |
| 4 | First authorization proposal |

---

### Phase 3: Securitization (Q3 2026)

**Objective:** Implement Layer 5G securitization infrastructure.

#### July 2026

| Week | Task |
|------|------|
| 1 | InstrumentRegistry contract development |
| 2 | PoolRegistry contract development |
| 3 | ServicingEventLog contract development |
| 4 | Unit testing |

#### August 2026

| Week | Task |
|------|------|
| 1 | Integration with CapitalBridgeHub |
| 2 | Testnet deployment |
| 3 | Accredited investor pathway testing |
| 4 | Internal treasury pathway testing |

#### September 2026

| Week | Task |
|------|------|
| 1 | Security audit |
| 2 | Audit remediation |
| 3 | Mainnet deployment |
| 4 | First instrument registration |

---

### Phase 4: Node Economy (Q4 2026)

**Objective:** Implement decentralized node infrastructure.

#### October 2026

| Week | Task |
|------|------|
| 1 | Node registry contract development |
| 2 | Activation policy implementation |
| 3 | SLA enforcement contracts |
| 4 | Research node qualification |

#### November 2026

| Week | Task |
|------|------|
| 1 | Reward distribution contracts |
| 2 | Slashing mechanism |
| 3 | Testnet deployment |
| 4 | Node operator onboarding |

#### December 2026

| Week | Task |
|------|------|
| 1 | Mainnet deployment |
| 2 | First storage nodes active |
| 3 | First research nodes qualified |
| 4 | Year-end review |

---

## Contract Development Specifications

### CapitalBridgeHub.sol

**Location:** `contracts/capital-bridge/CapitalBridgeHub.sol`

**Dependencies:**
- OpenZeppelin AccessControl
- OpenZeppelin Pausable
- OpenZeppelin ReentrancyGuard
- CapitalBridgeTypes.sol
- CapitalReadinessGate.sol

**State Variables:**

```solidity
mapping(uint256 => PropertyPacket) public packets;
mapping(uint256 => SPVEntity) public spvEntities;
mapping(uint256 => AcquisitionAuthorization) public authorizations;
mapping(uint256 => SettlementEvent) public settlements;

uint256 public nextPacketId;
uint256 public nextSpvId;
uint256 public nextAuthId;
uint256 public nextSettlementId;

uint256 public timelockSeconds = 24 hours;
uint256 public attestationMaxAgeSeconds = 30 days;

ICapitalReadinessGate public readinessGate;
```

**Access Control Matrix:**

| Function | DEFAULT_ADMIN | RISK_COMMITTEE | SETTLEMENT_AUTH | GUARDIAN | ATTESTOR_A | ATTESTOR_B | Any |
|----------|---------------|----------------|-----------------|----------|------------|------------|-----|
| submitPropertyPacket | | | | | | | X |
| attestResearchPacketA | | | | | X | | |
| attestResearchPacketB | | | | | | X | |
| clearResearchAttestations | | X | | | | | |
| approvePropertyPacket | | X | | | | | |
| rejectPropertyPacket | | X | | | | | |
| archivePropertyPacket | X | | | | | | |
| registerSPV | | | X | | | | |
| proposeAuthorization | | X | | | | | |
| activateAuthorization | | | X | | | | |
| cancelAuthorization | | | | X | | | |
| expireAuthorization | | | | | | | X |
| recordSettlementEvent | | | X | | | | |
| pause | | | | X | | | |
| unpause | X | | | | | | |

---

### CapitalReadinessGate.sol

**Location:** `contracts/readiness/CapitalReadinessGate.sol`

**Dependencies:**
- OpenZeppelin AccessControl

**State Variables:**

```solidity
struct ReadinessConfig {
    bytes32 requiredAuditHash;
    uint16 minimumUptimeBps;
    uint16 minimumObservationDaysElapsed;
    uint16 maxIncidentsAllowed;
    uint256 minimumTVLUsd;
    uint256 freezeWindowSeconds;
}

struct ReadinessAttestation {
    uint256 uptimeBps;
    uint256 incidentsCount;
    uint256 tvlUsd;
    uint256 lastUpdated;
    uint256 observationStartTimestamp;
    bytes32 auditHash;
}

ReadinessConfig public config;
ReadinessAttestation public latestAttestation;
```

**Functions:**

```solidity
function assertReady() external view returns (bool);
function postAttestation(ReadinessAttestation calldata attestation) external;
function updateConfig(ReadinessConfig calldata newConfig) external;
```

---

### Layer 5G Contracts

**InstrumentRegistry.sol**

```solidity
struct Instrument {
    uint256 instrumentId;
    InstrumentType instrumentType; // WholeLoan, Participation, Note, RevenueShare, RentStream
    bytes32 underlyingAssetHash;
    uint256 principalAmount;
    uint256 issuedAt;
    address holder;
    bool active;
}

mapping(uint256 => Instrument) public instruments;
```

**PoolRegistry.sol**

```solidity
struct Pool {
    uint256 poolId;
    bytes32 eligibilityFilterHash;
    bytes32 formationRulesHash;
    bytes32 cashflowScheduleHash;
    uint256[] instrumentIds;
    uint256 createdAt;
    bool active;
}

mapping(uint256 => Pool) public pools;
```

**ServicingEventLog.sol**

```solidity
struct ServicingEvent {
    uint256 eventId;
    uint256 instrumentId;
    ServicingEventType eventType; // Payment, Default, Modification, Payoff
    uint256 amount;
    bytes32 proofHash;
    uint256 timestamp;
}

ServicingEvent[] public events;
```

---

## API Development Specifications

### Capital Bridge Endpoints

**GET /api/capital-bridge/packets**

```typescript
interface PacketResponse {
  packets: PropertyPacket[];
  total: number;
  page: number;
  pageSize: number;
}
```

**GET /api/capital-bridge/attestations**

```typescript
interface AttestationResponse {
  attestations: ResearchAttestation[];
  packetId: number;
  attestorA: string;
  attestorB: string;
}
```

**GET /api/capital-bridge/authorizations**

```typescript
interface AuthorizationResponse {
  authorizations: AcquisitionAuthorization[];
  total: number;
  activeCount: number;
  settledCount: number;
}
```

**GET /api/capital-bridge/settlements**

```typescript
interface SettlementResponse {
  settlements: SettlementEvent[];
  totalSettled: string;
}
```

**GET /api/readiness/status**

```typescript
interface ReadinessResponse {
  config: ReadinessConfig;
  latestAttestation: ReadinessAttestation;
  isReady: boolean;
  failureReasons: string[];
}
```

---

## File Structure

### New Files to Create

```
contracts/
├── capital-bridge/
│   ├── CapitalBridgeTypes.sol
│   └── CapitalBridgeHub.sol
├── readiness/
│   └── CapitalReadinessGate.sol
└── securitization/
    ├── InstrumentRegistry.sol
    ├── PoolRegistry.sol
    └── ServicingEventLog.sol

docs/
├── internal/
│   ├── CAPITAL-BRIDGE-MASTER-PROMPT-ANALYSIS.md
│   └── DEVELOPMENT-ROADMAP-2026.md
├── whitepaper/
│   ├── axiom-technical-whitepaper-v1.md
│   ├── appendix-links.md
│   └── appendix-contracts.md
├── architecture/
│   └── layer-5-sublayers.md
├── ops/
│   ├── property-research-sop.md
│   ├── property-packet-schema.json
│   └── underwriting-model-schema.json
├── node-economy/
│   ├── node-economy-spec.md
│   ├── node-activation-policy.md
│   ├── node-sla-template.md
│   └── research-node-attestation-policy.md
└── observer/
    └── observer-dashboard-spec.md

scripts/
└── audit-harness.ts

pages/api/
├── capital-bridge/
│   ├── packets.ts
│   ├── attestations.ts
│   ├── authorizations.ts
│   └── settlements.ts
└── readiness/
    └── status.ts
```

---

## Success Criteria

### Phase 1 Success (End of Observation Window)

- [ ] All documentation complete
- [ ] CapitalBridgeHub contract complete with tests
- [ ] CapitalReadinessGate contract complete with tests
- [ ] Audit harness passing
- [ ] API endpoints functional
- [ ] Euler V2 metrics positive

### Phase 2 Success (Q2 2026)

- [ ] Mainnet deployment complete
- [ ] First property packet submitted
- [ ] Research attestation workflow verified
- [ ] First SPV registered
- [ ] First authorization activated

### Phase 3 Success (Q3 2026)

- [ ] Layer 5G contracts deployed
- [ ] First instrument registered
- [ ] First pool formed
- [ ] Servicing events recording

### Phase 4 Success (Q4 2026)

- [ ] Node registry live
- [ ] Storage nodes operational
- [ ] Research nodes qualified
- [ ] Reward distribution active

---

## Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Contract bug | Medium | High | Audit, testing, timelock |
| Integration failure | Low | Medium | Incremental deployment |
| Gas optimization | Medium | Low | Arbitrum L2, batch operations |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Research quality | Medium | High | Dual attestation, freshness checks |
| SPV coordination | Medium | Medium | Legal hashes, on-chain proofs |
| Regulatory change | Low | High | Compliance layer, governance |

### Market Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low adoption | Medium | Medium | External-first strategy, grants |
| Liquidity crisis | Low | High | Readiness gate, backstop |
| Competition | Medium | Low | Feature velocity, transparency |

---

## Resource Requirements

### Development Team

| Role | Count | Focus |
|------|-------|-------|
| Smart Contract Dev | 2 | CapitalBridge, Securitization |
| Backend Dev | 1 | API endpoints, audit harness |
| Frontend Dev | 1 | Observer dashboard updates |
| Security Engineer | 1 | Audit, testing |

### External Resources

| Resource | Purpose | Timeline |
|----------|---------|----------|
| Smart Contract Audit | CapitalBridge review | Q2 2026 |
| Legal Review | SPV structure | Q2 2026 |
| Node Infrastructure | DeNet integration | Q4 2026 |

---

## Governance Integration

All new modules must integrate with existing GovernanceHub:

1. **Role Assignment** - Through GovernanceHub proposal
2. **Parameter Changes** - 24h timelock minimum
3. **Emergency Pause** - GUARDIAN_ROLE via GovernanceHub
4. **Upgrades** - Timelock + multi-sig

### Existing Roles (Reuse)

| Role | Contract |
|------|----------|
| DEFAULT_ADMIN_ROLE | All |
| RISK_COMMITTEE_ROLE | New: CapitalBridgeHub |
| SETTLEMENT_AUTHORITY_ROLE | New: CapitalBridgeHub |
| GUARDIAN_ROLE | New: CapitalBridgeHub |

### New Roles (Create)

| Role | Contract |
|------|----------|
| REPORTING_ORACLE_ROLE | CapitalReadinessGate |
| RESEARCH_ATTESTOR_A_ROLE | CapitalBridgeHub |
| RESEARCH_ATTESTOR_B_ROLE | CapitalBridgeHub |

---

## Appendix: Critical Links

| Resource | URL |
|----------|-----|
| Axiom Codebase | https://github.com/AxiomProtocol/AXIOM |
| Arbitrum Nitro | https://github.com/OffchainLabs/nitro |
| Euler V2 Docs | https://docs.euler.finance/ |
| Camelot DEX | https://camelot.exchange/ |
| DeNet Storage | https://denet.pro/ |
| Chainlink Oracles | https://data.chain.link/ |

---

## Document Control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial creation |

**Last Updated:** January 31, 2026  
**Classification:** Internal Development Reference  
**Review Cycle:** Monthly
