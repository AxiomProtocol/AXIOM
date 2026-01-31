# Capital Bridge Security Audit Checklist

## Institutional-Grade Security Requirements

**Contract Version:** 1.0  
**Audit Date:** Pending  
**Auditor:** TBD  
**Network:** Arbitrum One (Testnet → Mainnet)

---

## 1. Access Control Verification

### Role Hierarchy

| Check | Description | Status |
|-------|-------------|--------|
| [ ] | DEFAULT_ADMIN_ROLE is properly restricted | Pending |
| [ ] | RISK_COMMITTEE_ROLE can only approve/reject packets | Pending |
| [ ] | SETTLEMENT_AUTHORITY_ROLE can only register SPVs and activate authorizations | Pending |
| [ ] | GUARDIAN_ROLE can pause and cancel (emergency only) | Pending |
| [ ] | RESEARCH_ATTESTOR_A_ROLE can only attest as A | Pending |
| [ ] | RESEARCH_ATTESTOR_B_ROLE can only attest as B | Pending |
| [ ] | REPORTING_ORACLE_ROLE can only post attestations | Pending |

### Role Separation

| Check | Description | Status |
|-------|-------------|--------|
| [ ] | Attestor A cannot also be Attestor B | Pending |
| [ ] | Role grant requires admin privilege | Pending |
| [ ] | Role revoke requires admin privilege | Pending |
| [ ] | No single role has unrestricted access | Pending |

---

## 2. State Machine Integrity

### PropertyPacket State Transitions

| Transition | Valid | Tested |
|------------|-------|--------|
| Draft → Submitted | Yes | Pending |
| Submitted → Attested | Yes (auto) | Pending |
| Attested → Approved | Yes | Pending |
| Attested → Rejected | Yes | Pending |
| Submitted → Rejected | Yes | Pending |
| Approved → Archived | Yes | Pending |
| Rejected → Archived | Yes | Pending |
| Any → Expired | Yes (permissionless) | Pending |
| Archived → Any | No | Pending |
| Expired → Any | No | Pending |

### Authorization State Transitions

| Transition | Valid | Tested |
|------------|-------|--------|
| Proposed → Active | Yes (after timelock) | Pending |
| Proposed → Canceled | Yes | Pending |
| Active → Settled | Yes | Pending |
| Active → Canceled | Yes | Pending |
| Proposed/Active → Expired | Yes (permissionless) | Pending |
| Settled → Any | No | Pending |
| Canceled → Any | No | Pending |
| Expired → Any | No | Pending |

---

## 3. Invariant Verification

### Critical Invariants

| Invariant | Description | Tested |
|-----------|-------------|--------|
| [ ] | Authorization cannot activate before timelock elapsed | Pending |
| [ ] | approvedAmount <= packet.maxApprovedCapital | Pending |
| [ ] | SettlementEvent must reference Active authorization | Pending |
| [ ] | Settled authorizations cannot be reused | Pending |
| [ ] | All hashes must be non-zero | Pending |
| [ ] | Both attestations required before approval | Pending |
| [ ] | Attestors must be distinct addresses | Pending |
| [ ] | Attestation freshness enforced | Pending |

---

## 4. Reentrancy Protection

| Function | Protected | Tested |
|----------|-----------|--------|
| submitPropertyPacket | Yes (nonReentrant) | Pending |
| attestResearchPacketA | Yes (nonReentrant) | Pending |
| attestResearchPacketB | Yes (nonReentrant) | Pending |
| clearResearchAttestations | Yes (nonReentrant) | Pending |
| approvePropertyPacket | Yes (nonReentrant) | Pending |
| rejectPropertyPacket | Yes (nonReentrant) | Pending |
| archivePropertyPacket | Yes (nonReentrant) | Pending |
| expirePropertyPacket | Yes (nonReentrant) | Pending |
| registerSPV | Yes (nonReentrant) | Pending |
| deactivateSPV | Yes (nonReentrant) | Pending |
| proposeAuthorization | Yes (nonReentrant) | Pending |
| activateAuthorization | Yes (nonReentrant) | Pending |
| cancelAuthorization | Yes (nonReentrant) | Pending |
| expireAuthorization | Yes (nonReentrant) | Pending |
| recordSettlementEvent | Yes (nonReentrant) | Pending |

---

## 5. Input Validation

### Zero Value Checks

| Parameter | Validated | Tested |
|-----------|-----------|--------|
| propertyDataHash | Yes | Pending |
| dueDiligencePackageCid | Yes | Pending |
| underwritingModelHash | Yes | Pending |
| riskSummaryHash | Yes | Pending |
| maxApprovedCapital | Yes | Pending |
| denetCidHash | Yes | Pending |
| legalEntityHash | Yes | Pending |
| operatingAgreementHash | Yes | Pending |
| paymentAddress | Yes | Pending |
| approvedAmount | Yes | Pending |
| settledAmount | Yes | Pending |
| proofHash | Yes | Pending |
| settlementCid | Yes | Pending |

### Range Checks

| Parameter | Min | Max | Validated |
|-----------|-----|-----|-----------|
| timelockSeconds | 1 hour | 7 days | Yes |
| attestationMaxAgeSeconds | 1 day | 180 days | Yes |
| uptimeBps | 0 | 10000 | Yes |
| minimumObservationDaysElapsed | 0 | 365 | Yes |

---

## 6. Timelock Verification

| Check | Description | Status |
|-------|-------------|--------|
| [ ] | 24-hour default timelock enforced | Pending |
| [ ] | Timelock cannot be reduced below MIN_TIMELOCK_SECONDS | Pending |
| [ ] | Timelock cannot exceed MAX_TIMELOCK_SECONDS | Pending |
| [ ] | Timelock update emits event | Pending |
| [ ] | activateAuthorization reverts if timelock not elapsed | Pending |

---

## 7. Readiness Gate Integration

| Check | Description | Status |
|-------|-------------|--------|
| [ ] | activateAuthorization calls assertReady() | Pending |
| [ ] | Disabled if readinessGate == address(0) | Pending |
| [ ] | Uses staticcall (cannot modify state) | Pending |
| [ ] | Reverts with ReadinessGateFailed on failure | Pending |

---

## 8. Event Emission

### Complete Event Coverage

| Event | Emitted Correctly | Indexed Fields |
|-------|-------------------|----------------|
| PropertyPacketSubmitted | Pending | packetId, submitter |
| ResearchAttestedA | Pending | packetId, attestor |
| ResearchAttestedB | Pending | packetId, attestor |
| ResearchAttestationsCleared | Pending | packetId |
| PropertyPacketApproved | Pending | packetId |
| PropertyPacketRejected | Pending | packetId |
| PropertyPacketArchived | Pending | packetId |
| PropertyPacketExpired | Pending | packetId |
| SPVRegistered | Pending | spvId |
| SPVDeactivated | Pending | spvId |
| AuthorizationProposed | Pending | authId, packetId, spvId |
| AuthorizationActivated | Pending | authId |
| AuthorizationCanceled | Pending | authId |
| AuthorizationExpired | Pending | authId |
| SettlementRecorded | Pending | settlementId, authId |
| TimelockUpdated | Pending | - |
| AttestationMaxAgeUpdated | Pending | - |
| CapitalReadinessGateUpdated | Pending | - |

---

## 9. Gas Optimization

| Function | Current Gas | Optimized | Notes |
|----------|-------------|-----------|-------|
| submitPropertyPacket | TBD | TBD | Storage-heavy |
| attestResearchPacketA | TBD | TBD | Moderate |
| approvePropertyPacket | TBD | TBD | Moderate |
| proposeAuthorization | TBD | TBD | Moderate |
| activateAuthorization | TBD | TBD | External call |
| recordSettlementEvent | TBD | TBD | Storage-heavy |

---

## 10. Edge Cases

| Scenario | Handled | Tested |
|----------|---------|--------|
| Attestation by same address for A and B | Reverts | Pending |
| Authorization for non-existent packet | Reverts | Pending |
| Authorization for non-existent SPV | Reverts | Pending |
| Settlement for non-active authorization | Reverts | Pending |
| Settlement amount > approved amount | Reverts | Pending |
| Approval of expired packet | Reverts | Pending |
| Activation of expired authorization | Reverts | Pending |
| Stale attestations | Reverts | Pending |
| Cleared attestations mid-approval | State reset | Pending |

---

## 11. Upgrade Safety

| Check | Description | Status |
|-------|-------------|--------|
| [ ] | No selfdestruct | Verified |
| [ ] | No delegatecall to untrusted | Verified |
| [ ] | Immutable once deployed (non-upgradeable) | By design |
| [ ] | State variables properly ordered | Pending |

---

## 12. External Dependencies

| Dependency | Version | Audited |
|------------|---------|---------|
| @openzeppelin/contracts | ^5.0.0 | Yes (OZ) |
| AccessControl | 5.0.0 | Yes (OZ) |
| Pausable | 5.0.0 | Yes (OZ) |
| ReentrancyGuard | 5.0.0 | Yes (OZ) |

---

## 13. Testnet Deployment Checklist

| Step | Description | Status |
|------|-------------|--------|
| [ ] | Deploy to Arbitrum Sepolia | Pending |
| [ ] | Verify all roles assigned correctly | Pending |
| [ ] | Test full packet lifecycle | Pending |
| [ ] | Test full authorization lifecycle | Pending |
| [ ] | Test timelock enforcement | Pending |
| [ ] | Test readiness gate integration | Pending |
| [ ] | Test emergency pause/unpause | Pending |
| [ ] | Run gas profiling | Pending |
| [ ] | Conduct fuzzing tests | Pending |

---

## 14. Mainnet Deployment Checklist

| Step | Description | Status |
|------|-------------|--------|
| [ ] | Complete testnet testing | Pending |
| [ ] | External security audit completed | Pending |
| [ ] | All critical/high issues resolved | Pending |
| [ ] | Governance approval obtained | Pending |
| [ ] | Observation window requirements met | Pending |
| [ ] | Deploy with correct admin addresses | Pending |
| [ ] | Verify contract on Arbiscan | Pending |
| [ ] | Configure in CapitalBridgeHub | Pending |
| [ ] | Run smoke tests on mainnet | Pending |
| [ ] | Update documentation | Pending |

---

## Audit Sign-Off

| Auditor | Date | Signature |
|---------|------|-----------|
| Internal Review | Pending | - |
| External Auditor | Pending | - |
| Risk Committee | Pending | - |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial checklist |
