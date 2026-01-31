# CapitalBridgeHub Unit Test Specifications

## Test Framework

- **Framework:** Hardhat + Chai + Ethers.js
- **Coverage Target:** 100% branch coverage
- **Gas Profiling:** Enabled

---

## Test Categories

### 1. Deployment Tests

```typescript
describe("Deployment", () => {
  it("should set admin role correctly");
  it("should set guardian role to admin");
  it("should initialize counters to 1");
  it("should set default timelock to 24 hours");
  it("should set default attestation max age to 30 days");
  it("should revert if admin is zero address");
});
```

### 2. Role Management Tests

```typescript
describe("Role Management", () => {
  it("should allow admin to grant RISK_COMMITTEE_ROLE");
  it("should allow admin to grant SETTLEMENT_AUTHORITY_ROLE");
  it("should allow admin to grant GUARDIAN_ROLE");
  it("should allow admin to grant RESEARCH_ATTESTOR_A_ROLE");
  it("should allow admin to grant RESEARCH_ATTESTOR_B_ROLE");
  it("should prevent non-admin from granting roles");
  it("should allow role holder to renounce role");
});
```

### 3. Property Packet Tests

```typescript
describe("submitPropertyPacket", () => {
  it("should create packet with correct ID");
  it("should set state to Submitted");
  it("should set submitter to msg.sender");
  it("should store all hash values correctly");
  it("should set expiry to current + packetExpiryDuration");
  it("should emit PropertyPacketSubmitted event");
  it("should increment nextPacketId");
  it("should revert when paused");
  it("should revert if propertyDataHash is zero");
  it("should revert if dueDiligencePackageCid is zero");
  it("should revert if underwritingModelHash is zero");
  it("should revert if riskSummaryHash is zero");
  it("should revert if maxApprovedCapital is zero");
});

describe("attestResearchPacketA", () => {
  it("should record attestation A correctly");
  it("should set attestation.valid to true");
  it("should emit ResearchAttestedA event");
  it("should not change state if B not yet attested");
  it("should change state to Attested if B already attested");
  it("should revert if caller lacks RESEARCH_ATTESTOR_A_ROLE");
  it("should revert if packet not in Submitted state");
  it("should revert if packet expired");
  it("should revert if caller is same as Attestor B");
  it("should revert if any hash is zero");
});

describe("attestResearchPacketB", () => {
  it("should record attestation B correctly");
  it("should set attestation.valid to true");
  it("should emit ResearchAttestedB event");
  it("should not change state if A not yet attested");
  it("should change state to Attested if A already attested");
  it("should revert if caller lacks RESEARCH_ATTESTOR_B_ROLE");
  it("should revert if packet not in Submitted state");
  it("should revert if packet expired");
  it("should revert if caller is same as Attestor A");
  it("should revert if any hash is zero");
});

describe("clearResearchAttestations", () => {
  it("should clear both attestations");
  it("should set state to Submitted");
  it("should emit ResearchAttestationsCleared event");
  it("should revert if caller lacks RISK_COMMITTEE_ROLE");
  it("should revert if packet not in Submitted or Attested state");
});

describe("approvePropertyPacket", () => {
  it("should set state to Approved");
  it("should set approvedAt timestamp");
  it("should emit PropertyPacketApproved event");
  it("should revert if caller lacks RISK_COMMITTEE_ROLE");
  it("should revert if packet not in Attested state");
  it("should revert if packet expired");
  it("should revert if attestation A missing");
  it("should revert if attestation B missing");
  it("should revert if attestation A expired");
  it("should revert if attestation B expired");
});

describe("rejectPropertyPacket", () => {
  it("should set state to Rejected");
  it("should set rejectionReason correctly");
  it("should emit PropertyPacketRejected event");
  it("should revert if caller lacks RISK_COMMITTEE_ROLE");
  it("should revert if packet not in Submitted or Attested state");
});

describe("archivePropertyPacket", () => {
  it("should set state to Archived");
  it("should emit PropertyPacketArchived event");
  it("should revert if caller lacks DEFAULT_ADMIN_ROLE");
  it("should revert if packet not in Approved or Rejected state");
});

describe("expirePropertyPacket", () => {
  it("should set state to Expired");
  it("should emit PropertyPacketExpired event");
  it("should allow any caller (permissionless)");
  it("should revert if packet not yet expired");
  it("should revert if packet in terminal state");
});
```

### 4. SPV Management Tests

```typescript
describe("registerSPV", () => {
  it("should create SPV with correct ID");
  it("should set active to true");
  it("should store all hash values correctly");
  it("should emit SPVRegistered event");
  it("should increment nextSpvId");
  it("should revert if caller lacks SETTLEMENT_AUTHORITY_ROLE");
  it("should revert if legalEntityHash is zero");
  it("should revert if operatingAgreementHash is zero");
  it("should revert if paymentAddress is zero");
});

describe("deactivateSPV", () => {
  it("should set active to false");
  it("should emit SPVDeactivated event");
  it("should revert if caller lacks DEFAULT_ADMIN_ROLE");
  it("should revert if SPV not found");
  it("should revert if SPV already inactive");
});
```

### 5. Authorization Tests

```typescript
describe("proposeAuthorization", () => {
  it("should create authorization with correct ID");
  it("should set state to Proposed");
  it("should set proposer to msg.sender");
  it("should set proposedAt to current timestamp");
  it("should set expiry correctly");
  it("should emit AuthorizationProposed event");
  it("should increment nextAuthId");
  it("should revert if caller lacks RISK_COMMITTEE_ROLE");
  it("should revert if packet not Approved");
  it("should revert if SPV not active");
  it("should revert if amount exceeds maxApprovedCapital");
  it("should revert if amount is zero");
});

describe("activateAuthorization", () => {
  it("should set state to Active");
  it("should set activatedAt to current timestamp");
  it("should emit AuthorizationActivated event");
  it("should revert if caller lacks SETTLEMENT_AUTHORITY_ROLE");
  it("should revert if authorization not Proposed");
  it("should revert if authorization expired");
  it("should revert if timelock not elapsed");
  it("should revert if readiness gate fails");
  it("should succeed if readiness gate passes");
  it("should succeed if readiness gate not configured");
});

describe("cancelAuthorization", () => {
  it("should set state to Canceled");
  it("should emit AuthorizationCanceled event");
  it("should revert if caller lacks GUARDIAN_ROLE");
  it("should revert if authorization in terminal state");
});

describe("expireAuthorization", () => {
  it("should set state to Expired");
  it("should emit AuthorizationExpired event");
  it("should allow any caller (permissionless)");
  it("should revert if authorization not yet expired");
  it("should revert if authorization in terminal state");
});
```

### 6. Settlement Tests

```typescript
describe("recordSettlementEvent", () => {
  it("should create settlement with correct ID");
  it("should set authorization state to Settled");
  it("should emit SettlementRecorded event");
  it("should increment nextSettlementId");
  it("should revert if caller lacks SETTLEMENT_AUTHORITY_ROLE");
  it("should revert if authorization not Active");
  it("should revert if settledAmount is zero");
  it("should revert if proofHash is zero");
  it("should revert if settlementCid is zero");
  it("should revert if settledAmount exceeds approvedAmount");
});
```

### 7. Admin Function Tests

```typescript
describe("setCapitalReadinessGate", () => {
  it("should update readiness gate address");
  it("should emit CapitalReadinessGateUpdated event");
  it("should allow setting to zero address (disable)");
  it("should revert if caller lacks DEFAULT_ADMIN_ROLE");
});

describe("setTimelockSeconds", () => {
  it("should update timelock duration");
  it("should emit TimelockUpdated event");
  it("should revert if caller lacks DEFAULT_ADMIN_ROLE");
  it("should revert if below MIN_TIMELOCK_SECONDS");
  it("should revert if above MAX_TIMELOCK_SECONDS");
});

describe("setAttestationMaxAgeSeconds", () => {
  it("should update attestation max age");
  it("should emit AttestationMaxAgeUpdated event");
  it("should revert if caller lacks DEFAULT_ADMIN_ROLE");
  it("should revert if below MIN_ATTESTATION_MAX_AGE");
  it("should revert if above MAX_ATTESTATION_MAX_AGE");
});
```

### 8. Emergency Function Tests

```typescript
describe("pause", () => {
  it("should pause contract");
  it("should revert if caller lacks GUARDIAN_ROLE");
  it("should prevent state-changing operations when paused");
});

describe("unpause", () => {
  it("should unpause contract");
  it("should revert if caller lacks DEFAULT_ADMIN_ROLE");
  it("should allow operations after unpause");
});
```

### 9. View Function Tests

```typescript
describe("View Functions", () => {
  it("getPacket should return correct data");
  it("getSPV should return correct data");
  it("getAuthorization should return correct data");
  it("getSettlement should return correct data");
  it("checkAttestationStatus should return correct complete/fresh status");
  it("checkTimelockStatus should return correct elapsed/remaining");
});
```

### 10. Integration Tests

```typescript
describe("Full Lifecycle", () => {
  it("should complete full packet → authorization → settlement lifecycle");
  it("should handle multiple packets concurrently");
  it("should handle multiple authorizations for same packet");
  it("should enforce readiness gate throughout lifecycle");
});
```

### 11. Fuzz Tests

```typescript
describe("Fuzz Tests", () => {
  it("should handle random hash values correctly");
  it("should handle random amount values within limits");
  it("should handle random timestamps correctly");
  it("should not allow state machine violations under any inputs");
});
```

---

## Coverage Targets

| Category | Target |
|----------|--------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

---

## Gas Benchmarks

| Function | Target Gas |
|----------|------------|
| submitPropertyPacket | < 200,000 |
| attestResearchPacketA | < 100,000 |
| attestResearchPacketB | < 100,000 |
| approvePropertyPacket | < 80,000 |
| proposeAuthorization | < 150,000 |
| activateAuthorization | < 100,000 |
| recordSettlementEvent | < 150,000 |
