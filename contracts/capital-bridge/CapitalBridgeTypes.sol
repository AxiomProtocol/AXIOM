// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CapitalBridgeTypes
 * @author Axiom Protocol
 * @notice Core data structures, enums, events, and errors for the Capital Bridge system
 * @dev This library defines all types used by CapitalBridgeHub and related contracts
 * 
 * SECURITY CONSIDERATIONS:
 * - All struct fields are explicitly typed to prevent overflow/underflow
 * - Timestamps use uint64 for gas efficiency while supporting dates until year 584942417355
 * - Amounts use uint256 for full precision with standard ERC20 decimals
 * - All hashes use bytes32 for content-addressed references (CID, document hashes)
 * - State enums prevent invalid state transitions via explicit ordering
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * @notice State machine for PropertyPacket lifecycle
 * @dev State transitions are strictly ordered and validated in CapitalBridgeHub
 * 
 * Valid transitions:
 * - Draft -> Submitted (via submitPropertyPacket)
 * - Submitted -> Attested (automatic when both attestations complete)
 * - Attested -> Approved (via approvePropertyPacket)
 * - Attested -> Rejected (via rejectPropertyPacket)
 * - Submitted -> Rejected (via rejectPropertyPacket if attestations cleared)
 * - Approved -> Archived (via archivePropertyPacket)
 * - Rejected -> Archived (via archivePropertyPacket)
 * - Any -> Expired (permissionless after expiry timestamp)
 */
enum PacketState {
    Draft,      // 0: Initial state, not yet submitted
    Submitted,  // 1: Submitted for attestation
    Attested,   // 2: Both attestations A and B complete
    Approved,   // 3: Risk committee approved
    Rejected,   // 4: Risk committee rejected
    Archived,   // 5: Permanently archived (immutable)
    Expired     // 6: Time-based expiration
}

/**
 * @notice State machine for AcquisitionAuthorization lifecycle
 * @dev Enforces 24-hour timelock between Proposed and Active states
 * 
 * Valid transitions:
 * - Proposed -> Active (via activateAuthorization after timelock)
 * - Proposed -> Canceled (via cancelAuthorization)
 * - Active -> Settled (via recordSettlementEvent)
 * - Active -> Canceled (via cancelAuthorization)
 * - Proposed/Active -> Expired (permissionless after expiry)
 */
enum AuthorizationState {
    Proposed,   // 0: Proposed, waiting for timelock
    Active,     // 1: Active, can execute settlement
    Settled,    // 2: Settlement complete (terminal)
    Canceled,   // 3: Canceled by guardian (terminal)
    Expired     // 4: Time-based expiration (terminal)
}

/**
 * @notice Reason codes for packet rejection
 * @dev Used for audit trail and analytics
 */
enum RejectionReason {
    None,                   // 0: Not rejected
    AttestationMismatch,    // 1: Attestations don't match or conflict
    RiskExceedsTolerance,   // 2: Risk metrics outside acceptable range
    UnderwritingFlawed,     // 3: Underwriting model has errors
    TitleIssues,            // 4: Title search revealed problems
    MarketConditions,       // 5: Market conditions changed
    Other                   // 6: Other reason (see notes)
}

// ============================================================================
// STRUCTS
// ============================================================================

/**
 * @notice Research attestation from an independent attestor
 * @dev Attestations must be from distinct role holders (A cannot satisfy B)
 * 
 * @param attestor Address of the attestor (must hold appropriate role)
 * @param underwritingModelHash Keccak256 hash of the underwriting model
 * @param riskSummaryHash Keccak256 hash of the risk summary document
 * @param denetCidHash Keccak256 hash of the DeNet CID containing full due diligence
 * @param timestamp Block timestamp when attestation was created
 * @param valid Whether this attestation is currently valid (can be cleared)
 */
struct ResearchAttestation {
    address attestor;
    bytes32 underwritingModelHash;
    bytes32 riskSummaryHash;
    bytes32 denetCidHash;
    uint64 timestamp;
    bool valid;
}

/**
 * @notice Property packet containing all due diligence references
 * @dev Core object for capital bridge coordination
 * 
 * @param packetId Unique identifier (auto-incremented)
 * @param submitter Address that submitted the packet
 * @param propertyDataHash Keccak256 hash of property JSON data
 * @param dueDiligencePackageCid DeNet CID hash of full due diligence package
 * @param underwritingModelHash Keccak256 hash of underwriting model
 * @param riskSummaryHash Keccak256 hash of risk summary
 * @param maxApprovedCapital Maximum capital that can be authorized
 * @param state Current state in lifecycle
 * @param rejectionReason Reason if rejected
 * @param submittedAt Timestamp of submission
 * @param approvedAt Timestamp of approval (0 if not approved)
 * @param expiresAt Timestamp when packet expires
 * @param attestationA First independent attestation
 * @param attestationB Second independent attestation
 */
struct PropertyPacket {
    uint256 packetId;
    address submitter;
    bytes32 propertyDataHash;
    bytes32 dueDiligencePackageCid;
    bytes32 underwritingModelHash;
    bytes32 riskSummaryHash;
    uint256 maxApprovedCapital;
    PacketState state;
    RejectionReason rejectionReason;
    uint64 submittedAt;
    uint64 approvedAt;
    uint64 expiresAt;
    ResearchAttestation attestationA;
    ResearchAttestation attestationB;
}

/**
 * @notice SPV entity for off-chain property holding
 * @dev Legal entity that will hold acquired properties
 * 
 * @param spvId Unique identifier (auto-incremented)
 * @param legalEntityHash Keccak256 hash of legal entity documents
 * @param operatingAgreementHash Keccak256 hash of operating agreement
 * @param paymentAddress Address for receiving funds
 * @param registeredAt Timestamp of registration
 * @param active Whether SPV is active and can receive authorizations
 */
struct SPVEntity {
    uint256 spvId;
    bytes32 legalEntityHash;
    bytes32 operatingAgreementHash;
    address paymentAddress;
    uint64 registeredAt;
    bool active;
}

/**
 * @notice Authorization for capital deployment to SPV
 * @dev Subject to 24-hour timelock before activation
 * 
 * @param authId Unique identifier (auto-incremented)
 * @param packetId Referenced PropertyPacket
 * @param spvId Referenced SPV entity
 * @param approvedAmount Amount approved for deployment (must be <= packet.maxApprovedCapital)
 * @param proposedAt Timestamp when proposed (timelock starts)
 * @param activatedAt Timestamp when activated (0 if not yet active)
 * @param expiresAt Timestamp when authorization expires
 * @param state Current state in lifecycle
 * @param proposer Address that proposed the authorization
 */
struct AcquisitionAuthorization {
    uint256 authId;
    uint256 packetId;
    uint256 spvId;
    uint256 approvedAmount;
    uint64 proposedAt;
    uint64 activatedAt;
    uint64 expiresAt;
    AuthorizationState state;
    address proposer;
}

/**
 * @notice Settlement event recording capital deployment
 * @dev Immutable record of settlement for audit trail
 * 
 * @param settlementId Unique identifier (auto-incremented)
 * @param authId Referenced authorization
 * @param settledAmount Actual amount settled
 * @param proofHash Keccak256 hash of settlement proof document
 * @param settlementCid DeNet CID of settlement documentation
 * @param timestamp Block timestamp of settlement
 * @param settler Address that recorded settlement
 */
struct SettlementEvent {
    uint256 settlementId;
    uint256 authId;
    uint256 settledAmount;
    bytes32 proofHash;
    bytes32 settlementCid;
    uint64 timestamp;
    address settler;
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * @notice Emitted when a new property packet is submitted
 */
event PropertyPacketSubmitted(
    uint256 indexed packetId,
    address indexed submitter,
    bytes32 propertyDataHash,
    uint256 maxApprovedCapital,
    uint64 expiresAt
);

/**
 * @notice Emitted when Attestor A provides attestation
 */
event ResearchAttestedA(
    uint256 indexed packetId,
    address indexed attestor,
    bytes32 underwritingModelHash,
    bytes32 riskSummaryHash,
    bytes32 denetCidHash,
    uint64 timestamp
);

/**
 * @notice Emitted when Attestor B provides attestation
 */
event ResearchAttestedB(
    uint256 indexed packetId,
    address indexed attestor,
    bytes32 underwritingModelHash,
    bytes32 riskSummaryHash,
    bytes32 denetCidHash,
    uint64 timestamp
);

/**
 * @notice Emitted when research attestations are cleared
 */
event ResearchAttestationsCleared(
    uint256 indexed packetId,
    address indexed clearedBy,
    uint64 timestamp
);

/**
 * @notice Emitted when a property packet is approved
 */
event PropertyPacketApproved(
    uint256 indexed packetId,
    address indexed approver,
    uint64 timestamp
);

/**
 * @notice Emitted when a property packet is rejected
 */
event PropertyPacketRejected(
    uint256 indexed packetId,
    address indexed rejector,
    RejectionReason reason,
    uint64 timestamp
);

/**
 * @notice Emitted when a property packet is archived
 */
event PropertyPacketArchived(
    uint256 indexed packetId,
    address indexed archivedBy,
    uint64 timestamp
);

/**
 * @notice Emitted when a property packet expires
 */
event PropertyPacketExpired(
    uint256 indexed packetId,
    uint64 timestamp
);

/**
 * @notice Emitted when a new SPV is registered
 */
event SPVRegistered(
    uint256 indexed spvId,
    bytes32 legalEntityHash,
    address paymentAddress,
    uint64 timestamp
);

/**
 * @notice Emitted when an SPV is deactivated
 */
event SPVDeactivated(
    uint256 indexed spvId,
    address indexed deactivatedBy,
    uint64 timestamp
);

/**
 * @notice Emitted when an authorization is proposed
 */
event AuthorizationProposed(
    uint256 indexed authId,
    uint256 indexed packetId,
    uint256 indexed spvId,
    uint256 approvedAmount,
    address proposer,
    uint64 proposedAt,
    uint64 timelockEndsAt
);

/**
 * @notice Emitted when an authorization is activated after timelock
 */
event AuthorizationActivated(
    uint256 indexed authId,
    address indexed activatedBy,
    uint64 timestamp
);

/**
 * @notice Emitted when an authorization is canceled
 */
event AuthorizationCanceled(
    uint256 indexed authId,
    address indexed canceledBy,
    uint64 timestamp
);

/**
 * @notice Emitted when an authorization expires
 */
event AuthorizationExpired(
    uint256 indexed authId,
    uint64 timestamp
);

/**
 * @notice Emitted when a settlement is recorded
 */
event SettlementRecorded(
    uint256 indexed settlementId,
    uint256 indexed authId,
    uint256 settledAmount,
    bytes32 proofHash,
    address settler,
    uint64 timestamp
);

/**
 * @notice Emitted when timelock duration is updated
 */
event TimelockUpdated(
    uint256 oldTimelock,
    uint256 newTimelock,
    address indexed updatedBy,
    uint64 timestamp
);

/**
 * @notice Emitted when attestation max age is updated
 */
event AttestationMaxAgeUpdated(
    uint256 oldMaxAge,
    uint256 newMaxAge,
    address indexed updatedBy,
    uint64 timestamp
);

/**
 * @notice Emitted when capital readiness gate is updated
 */
event CapitalReadinessGateUpdated(
    address oldGate,
    address newGate,
    address indexed updatedBy,
    uint64 timestamp
);

// ============================================================================
// ERRORS
// ============================================================================

/// @notice Thrown when caller lacks required role
error UnauthorizedRole(address caller, bytes32 requiredRole);

/// @notice Thrown when packet is in invalid state for operation
error InvalidPacketState(uint256 packetId, PacketState currentState, PacketState requiredState);

/// @notice Thrown when authorization is in invalid state for operation
error InvalidAuthorizationState(uint256 authId, AuthorizationState currentState, AuthorizationState requiredState);

/// @notice Thrown when packet does not exist
error PacketNotFound(uint256 packetId);

/// @notice Thrown when SPV does not exist
error SPVNotFound(uint256 spvId);

/// @notice Thrown when authorization does not exist
error AuthorizationNotFound(uint256 authId);

/// @notice Thrown when SPV is not active
error SPVNotActive(uint256 spvId);

/// @notice Thrown when attestation is expired (exceeds maxAgeSeconds)
error AttestationExpired(uint256 packetId, uint64 attestedAt, uint64 maxAge);

/// @notice Thrown when attestor A tries to also attest as B
error DuplicateAttestor(address attestor);

/// @notice Thrown when attestation hashes don't match packet
error AttestationHashMismatch(uint256 packetId, bytes32 expected, bytes32 provided);

/// @notice Thrown when approved amount exceeds packet maximum
error AmountExceedsMaximum(uint256 requested, uint256 maximum);

/// @notice Thrown when timelock has not elapsed
error TimelockNotElapsed(uint256 authId, uint64 proposedAt, uint64 timelockSeconds);

/// @notice Thrown when readiness gate check fails
error ReadinessGateFailed(string reason);

/// @notice Thrown when authorization is already settled
error AuthorizationAlreadySettled(uint256 authId);

/// @notice Thrown when packet has expired
error PacketExpired(uint256 packetId, uint64 expiredAt);

/// @notice Thrown when authorization has expired
error AuthorizationExpiredError(uint256 authId, uint64 expiredAt);

/// @notice Thrown when both attestations are not present
error AttestationsIncomplete(uint256 packetId);

/// @notice Thrown when zero address is provided
error ZeroAddressNotAllowed();

/// @notice Thrown when zero amount is provided
error ZeroAmountNotAllowed();

/// @notice Thrown when zero hash is provided
error ZeroHashNotAllowed();

/// @notice Thrown when parameter update is timelocked
error ParameterUpdateTimelocked(bytes32 parameterHash, uint64 unlockTime);

/// @notice Thrown when packet expiry is in the past
error ExpiryInPast(uint64 expiresAt, uint64 currentTime);

/// @notice Thrown when duration is too short
error DurationTooShort(uint256 provided, uint256 minimum);

/// @notice Thrown when duration is too long
error DurationTooLong(uint256 provided, uint256 maximum);
