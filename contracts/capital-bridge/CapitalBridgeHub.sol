// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CapitalBridgeTypes.sol";

/**
 * @title CapitalBridgeHub
 * @author Axiom Protocol
 * @notice Coordinates on-chain capital with off-chain SPV acquisitions
 * @dev Implements institutional-grade controls for property packet management,
 *      research attestation, and timelocked capital authorization
 * 
 * SECURITY ARCHITECTURE:
 * - Role-based access control (7 distinct roles)
 * - Dual attestation requirement (A + B, must be different addresses)
 * - 24-hour timelock on authorization activation
 * - Readiness gate integration for institutional thresholds
 * - Emergency pause capability
 * - Reentrancy protection on all state-changing functions
 * - Explicit state machine transitions with event emission
 * 
 * INVARIANTS:
 * 1. Authorization can only be Active after timelock elapsed
 * 2. approvedAmount <= packet.maxApprovedCapital
 * 3. SettlementEvent must reference an Active authorization
 * 4. Settled authorizations cannot be reused
 * 5. All metadata references must be non-zero hashes
 * 6. Both attestations A and B required before approval
 * 7. Attestors must hold different roles (A cannot satisfy B)
 * 8. Attestation freshness enforced (maxAgeSeconds)
 */
contract CapitalBridgeHub is AccessControl, Pausable, ReentrancyGuard {
    // ========================================================================
    // ROLES
    // ========================================================================
    
    bytes32 public constant RISK_COMMITTEE_ROLE = keccak256("RISK_COMMITTEE_ROLE");
    bytes32 public constant SETTLEMENT_AUTHORITY_ROLE = keccak256("SETTLEMENT_AUTHORITY_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant RESEARCH_ATTESTOR_A_ROLE = keccak256("RESEARCH_ATTESTOR_A_ROLE");
    bytes32 public constant RESEARCH_ATTESTOR_B_ROLE = keccak256("RESEARCH_ATTESTOR_B_ROLE");
    bytes32 public constant REPORTING_ORACLE_ROLE = keccak256("REPORTING_ORACLE_ROLE");

    // ========================================================================
    // STATE VARIABLES
    // ========================================================================
    
    /// @notice Mapping of packet ID to PropertyPacket
    mapping(uint256 => PropertyPacket) public packets;
    
    /// @notice Mapping of SPV ID to SPVEntity
    mapping(uint256 => SPVEntity) public spvEntities;
    
    /// @notice Mapping of authorization ID to AcquisitionAuthorization
    mapping(uint256 => AcquisitionAuthorization) public authorizations;
    
    /// @notice Mapping of settlement ID to SettlementEvent
    mapping(uint256 => SettlementEvent) public settlements;
    
    /// @notice Counter for packet IDs
    uint256 public nextPacketId = 1;
    
    /// @notice Counter for SPV IDs
    uint256 public nextSpvId = 1;
    
    /// @notice Counter for authorization IDs
    uint256 public nextAuthId = 1;
    
    /// @notice Counter for settlement IDs
    uint256 public nextSettlementId = 1;
    
    /// @notice Timelock duration for authorization activation (default 24 hours)
    uint256 public timelockSeconds = 24 hours;
    
    /// @notice Maximum age for attestations to be considered valid (default 30 days)
    uint256 public attestationMaxAgeSeconds = 30 days;
    
    /// @notice Default packet expiry duration (default 90 days)
    uint256 public packetExpiryDuration = 90 days;
    
    /// @notice Default authorization expiry duration (default 30 days)
    uint256 public authorizationExpiryDuration = 30 days;
    
    /// @notice Address of the CapitalReadinessGate contract
    address public readinessGate;
    
    /// @notice Minimum timelock duration (cannot be reduced below this)
    uint256 public constant MIN_TIMELOCK_SECONDS = 1 hours;
    
    /// @notice Maximum timelock duration
    uint256 public constant MAX_TIMELOCK_SECONDS = 7 days;
    
    /// @notice Minimum attestation max age
    uint256 public constant MIN_ATTESTATION_MAX_AGE = 1 days;
    
    /// @notice Maximum attestation max age
    uint256 public constant MAX_ATTESTATION_MAX_AGE = 180 days;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================
    
    /**
     * @notice Initialize the CapitalBridgeHub with admin address
     * @param _admin Address to receive DEFAULT_ADMIN_ROLE
     */
    constructor(address _admin) {
        if (_admin == address(0)) revert ZeroAddressNotAllowed();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
    }

    // ========================================================================
    // MODIFIERS
    // ========================================================================
    
    /**
     * @dev Ensures packet exists
     */
    modifier packetExists(uint256 packetId) {
        if (packets[packetId].packetId == 0) revert PacketNotFound(packetId);
        _;
    }
    
    /**
     * @dev Ensures SPV exists
     */
    modifier spvExists(uint256 spvId) {
        if (spvEntities[spvId].spvId == 0) revert SPVNotFound(spvId);
        _;
    }
    
    /**
     * @dev Ensures authorization exists
     */
    modifier authExists(uint256 authId) {
        if (authorizations[authId].authId == 0) revert AuthorizationNotFound(authId);
        _;
    }

    // ========================================================================
    // PACKET MANAGEMENT
    // ========================================================================
    
    /**
     * @notice Submit a new property packet for attestation
     * @param propertyDataHash Keccak256 hash of property JSON data
     * @param dueDiligencePackageCid DeNet CID hash of due diligence package
     * @param underwritingModelHash Keccak256 hash of underwriting model
     * @param riskSummaryHash Keccak256 hash of risk summary
     * @param maxApprovedCapital Maximum capital that can be authorized
     * @return packetId The ID of the created packet
     */
    function submitPropertyPacket(
        bytes32 propertyDataHash,
        bytes32 dueDiligencePackageCid,
        bytes32 underwritingModelHash,
        bytes32 riskSummaryHash,
        uint256 maxApprovedCapital
    ) external whenNotPaused nonReentrant returns (uint256 packetId) {
        // Validate inputs
        if (propertyDataHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (dueDiligencePackageCid == bytes32(0)) revert ZeroHashNotAllowed();
        if (underwritingModelHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (riskSummaryHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (maxApprovedCapital == 0) revert ZeroAmountNotAllowed();
        
        packetId = nextPacketId++;
        uint64 currentTime = uint64(block.timestamp);
        uint64 expiresAt = currentTime + uint64(packetExpiryDuration);
        
        packets[packetId] = PropertyPacket({
            packetId: packetId,
            submitter: msg.sender,
            propertyDataHash: propertyDataHash,
            dueDiligencePackageCid: dueDiligencePackageCid,
            underwritingModelHash: underwritingModelHash,
            riskSummaryHash: riskSummaryHash,
            maxApprovedCapital: maxApprovedCapital,
            state: PacketState.Submitted,
            rejectionReason: RejectionReason.None,
            submittedAt: currentTime,
            approvedAt: 0,
            expiresAt: expiresAt,
            attestationA: ResearchAttestation({
                attestor: address(0),
                underwritingModelHash: bytes32(0),
                riskSummaryHash: bytes32(0),
                denetCidHash: bytes32(0),
                timestamp: 0,
                valid: false
            }),
            attestationB: ResearchAttestation({
                attestor: address(0),
                underwritingModelHash: bytes32(0),
                riskSummaryHash: bytes32(0),
                denetCidHash: bytes32(0),
                timestamp: 0,
                valid: false
            })
        });
        
        emit PropertyPacketSubmitted(
            packetId,
            msg.sender,
            propertyDataHash,
            maxApprovedCapital,
            expiresAt
        );
    }
    
    /**
     * @notice Provide Attestation A for a property packet
     * @param packetId The packet to attest
     * @param underwritingModelHash Hash of reviewed underwriting model
     * @param riskSummaryHash Hash of reviewed risk summary
     * @param denetCidHash DeNet CID of attestor's analysis
     */
    function attestResearchPacketA(
        uint256 packetId,
        bytes32 underwritingModelHash,
        bytes32 riskSummaryHash,
        bytes32 denetCidHash
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(RESEARCH_ATTESTOR_A_ROLE) {
        PropertyPacket storage packet = packets[packetId];
        
        // Validate state
        if (packet.state != PacketState.Submitted && packet.state != PacketState.Attested) {
            revert InvalidPacketState(packetId, packet.state, PacketState.Submitted);
        }
        
        // Check expiry
        if (block.timestamp >= packet.expiresAt) {
            revert PacketExpired(packetId, packet.expiresAt);
        }
        
        // Validate hashes
        if (underwritingModelHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (riskSummaryHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (denetCidHash == bytes32(0)) revert ZeroHashNotAllowed();
        
        // Ensure attestor A is not also attestor B
        if (packet.attestationB.valid && packet.attestationB.attestor == msg.sender) {
            revert DuplicateAttestor(msg.sender);
        }
        
        uint64 currentTime = uint64(block.timestamp);
        
        packet.attestationA = ResearchAttestation({
            attestor: msg.sender,
            underwritingModelHash: underwritingModelHash,
            riskSummaryHash: riskSummaryHash,
            denetCidHash: denetCidHash,
            timestamp: currentTime,
            valid: true
        });
        
        // Check if both attestations complete
        if (packet.attestationB.valid) {
            packet.state = PacketState.Attested;
        }
        
        emit ResearchAttestedA(
            packetId,
            msg.sender,
            underwritingModelHash,
            riskSummaryHash,
            denetCidHash,
            currentTime
        );
    }
    
    /**
     * @notice Provide Attestation B for a property packet
     * @param packetId The packet to attest
     * @param underwritingModelHash Hash of reviewed underwriting model
     * @param riskSummaryHash Hash of reviewed risk summary
     * @param denetCidHash DeNet CID of attestor's analysis
     */
    function attestResearchPacketB(
        uint256 packetId,
        bytes32 underwritingModelHash,
        bytes32 riskSummaryHash,
        bytes32 denetCidHash
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(RESEARCH_ATTESTOR_B_ROLE) {
        PropertyPacket storage packet = packets[packetId];
        
        // Validate state
        if (packet.state != PacketState.Submitted && packet.state != PacketState.Attested) {
            revert InvalidPacketState(packetId, packet.state, PacketState.Submitted);
        }
        
        // Check expiry
        if (block.timestamp >= packet.expiresAt) {
            revert PacketExpired(packetId, packet.expiresAt);
        }
        
        // Validate hashes
        if (underwritingModelHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (riskSummaryHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (denetCidHash == bytes32(0)) revert ZeroHashNotAllowed();
        
        // Ensure attestor B is not also attestor A
        if (packet.attestationA.valid && packet.attestationA.attestor == msg.sender) {
            revert DuplicateAttestor(msg.sender);
        }
        
        uint64 currentTime = uint64(block.timestamp);
        
        packet.attestationB = ResearchAttestation({
            attestor: msg.sender,
            underwritingModelHash: underwritingModelHash,
            riskSummaryHash: riskSummaryHash,
            denetCidHash: denetCidHash,
            timestamp: currentTime,
            valid: true
        });
        
        // Check if both attestations complete
        if (packet.attestationA.valid) {
            packet.state = PacketState.Attested;
        }
        
        emit ResearchAttestedB(
            packetId,
            msg.sender,
            underwritingModelHash,
            riskSummaryHash,
            denetCidHash,
            currentTime
        );
    }
    
    /**
     * @notice Clear research attestations (resets to Submitted state)
     * @param packetId The packet to clear attestations for
     */
    function clearResearchAttestations(
        uint256 packetId
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(RISK_COMMITTEE_ROLE) {
        PropertyPacket storage packet = packets[packetId];
        
        // Can only clear from Submitted or Attested state
        if (packet.state != PacketState.Submitted && packet.state != PacketState.Attested) {
            revert InvalidPacketState(packetId, packet.state, PacketState.Submitted);
        }
        
        // Clear attestations
        packet.attestationA = ResearchAttestation({
            attestor: address(0),
            underwritingModelHash: bytes32(0),
            riskSummaryHash: bytes32(0),
            denetCidHash: bytes32(0),
            timestamp: 0,
            valid: false
        });
        
        packet.attestationB = ResearchAttestation({
            attestor: address(0),
            underwritingModelHash: bytes32(0),
            riskSummaryHash: bytes32(0),
            denetCidHash: bytes32(0),
            timestamp: 0,
            valid: false
        });
        
        packet.state = PacketState.Submitted;
        
        emit ResearchAttestationsCleared(packetId, msg.sender, uint64(block.timestamp));
    }
    
    /**
     * @notice Approve a property packet (requires both attestations)
     * @param packetId The packet to approve
     */
    function approvePropertyPacket(
        uint256 packetId
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(RISK_COMMITTEE_ROLE) {
        PropertyPacket storage packet = packets[packetId];
        
        // Must be in Attested state
        if (packet.state != PacketState.Attested) {
            revert InvalidPacketState(packetId, packet.state, PacketState.Attested);
        }
        
        // Check expiry
        if (block.timestamp >= packet.expiresAt) {
            revert PacketExpired(packetId, packet.expiresAt);
        }
        
        // Verify both attestations are valid and fresh
        if (!packet.attestationA.valid || !packet.attestationB.valid) {
            revert AttestationsIncomplete(packetId);
        }
        
        // Check attestation freshness
        uint64 currentTime = uint64(block.timestamp);
        if (currentTime - packet.attestationA.timestamp > attestationMaxAgeSeconds) {
            revert AttestationExpired(packetId, packet.attestationA.timestamp, uint64(attestationMaxAgeSeconds));
        }
        if (currentTime - packet.attestationB.timestamp > attestationMaxAgeSeconds) {
            revert AttestationExpired(packetId, packet.attestationB.timestamp, uint64(attestationMaxAgeSeconds));
        }
        
        packet.state = PacketState.Approved;
        packet.approvedAt = currentTime;
        
        emit PropertyPacketApproved(packetId, msg.sender, currentTime);
    }
    
    /**
     * @notice Reject a property packet
     * @param packetId The packet to reject
     * @param reason The rejection reason code
     */
    function rejectPropertyPacket(
        uint256 packetId,
        RejectionReason reason
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(RISK_COMMITTEE_ROLE) {
        PropertyPacket storage packet = packets[packetId];
        
        // Can reject from Submitted or Attested state
        if (packet.state != PacketState.Submitted && packet.state != PacketState.Attested) {
            revert InvalidPacketState(packetId, packet.state, PacketState.Submitted);
        }
        
        packet.state = PacketState.Rejected;
        packet.rejectionReason = reason;
        
        emit PropertyPacketRejected(packetId, msg.sender, reason, uint64(block.timestamp));
    }
    
    /**
     * @notice Archive a property packet (terminal state)
     * @param packetId The packet to archive
     */
    function archivePropertyPacket(
        uint256 packetId
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(DEFAULT_ADMIN_ROLE) {
        PropertyPacket storage packet = packets[packetId];
        
        // Can archive from Approved or Rejected state
        if (packet.state != PacketState.Approved && packet.state != PacketState.Rejected) {
            revert InvalidPacketState(packetId, packet.state, PacketState.Approved);
        }
        
        packet.state = PacketState.Archived;
        
        emit PropertyPacketArchived(packetId, msg.sender, uint64(block.timestamp));
    }
    
    /**
     * @notice Expire a property packet (permissionless if past expiry)
     * @param packetId The packet to expire
     */
    function expirePropertyPacket(
        uint256 packetId
    ) external nonReentrant packetExists(packetId) {
        PropertyPacket storage packet = packets[packetId];
        
        // Only non-terminal states can expire
        if (packet.state == PacketState.Archived || 
            packet.state == PacketState.Expired ||
            packet.state == PacketState.Rejected) {
            revert InvalidPacketState(packetId, packet.state, PacketState.Submitted);
        }
        
        // Must be past expiry
        if (block.timestamp < packet.expiresAt) {
            revert PacketExpired(packetId, packet.expiresAt);
        }
        
        packet.state = PacketState.Expired;
        
        emit PropertyPacketExpired(packetId, uint64(block.timestamp));
    }

    // ========================================================================
    // SPV MANAGEMENT
    // ========================================================================
    
    /**
     * @notice Register a new SPV entity
     * @param legalEntityHash Keccak256 hash of legal entity documents
     * @param operatingAgreementHash Keccak256 hash of operating agreement
     * @param paymentAddress Address for receiving funds
     * @return spvId The ID of the created SPV
     */
    function registerSPV(
        bytes32 legalEntityHash,
        bytes32 operatingAgreementHash,
        address paymentAddress
    ) external whenNotPaused nonReentrant onlyRole(SETTLEMENT_AUTHORITY_ROLE) returns (uint256 spvId) {
        if (legalEntityHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (operatingAgreementHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (paymentAddress == address(0)) revert ZeroAddressNotAllowed();
        
        spvId = nextSpvId++;
        
        spvEntities[spvId] = SPVEntity({
            spvId: spvId,
            legalEntityHash: legalEntityHash,
            operatingAgreementHash: operatingAgreementHash,
            paymentAddress: paymentAddress,
            registeredAt: uint64(block.timestamp),
            active: true
        });
        
        emit SPVRegistered(spvId, legalEntityHash, paymentAddress, uint64(block.timestamp));
    }
    
    /**
     * @notice Deactivate an SPV entity
     * @param spvId The SPV to deactivate
     */
    function deactivateSPV(
        uint256 spvId
    ) external whenNotPaused nonReentrant spvExists(spvId) onlyRole(DEFAULT_ADMIN_ROLE) {
        SPVEntity storage spv = spvEntities[spvId];
        
        if (!spv.active) revert SPVNotActive(spvId);
        
        spv.active = false;
        
        emit SPVDeactivated(spvId, msg.sender, uint64(block.timestamp));
    }

    // ========================================================================
    // AUTHORIZATION MANAGEMENT
    // ========================================================================
    
    /**
     * @notice Propose a capital authorization (starts timelock)
     * @param packetId The approved packet to authorize
     * @param spvId The SPV to receive funds
     * @param approvedAmount Amount to authorize (must be <= maxApprovedCapital)
     * @return authId The ID of the created authorization
     */
    function proposeAuthorization(
        uint256 packetId,
        uint256 spvId,
        uint256 approvedAmount
    ) external whenNotPaused nonReentrant packetExists(packetId) spvExists(spvId) onlyRole(RISK_COMMITTEE_ROLE) returns (uint256 authId) {
        PropertyPacket storage packet = packets[packetId];
        SPVEntity storage spv = spvEntities[spvId];
        
        // Packet must be approved
        if (packet.state != PacketState.Approved) {
            revert InvalidPacketState(packetId, packet.state, PacketState.Approved);
        }
        
        // SPV must be active
        if (!spv.active) revert SPVNotActive(spvId);
        
        // Amount must not exceed maximum
        if (approvedAmount > packet.maxApprovedCapital) {
            revert AmountExceedsMaximum(approvedAmount, packet.maxApprovedCapital);
        }
        
        if (approvedAmount == 0) revert ZeroAmountNotAllowed();
        
        authId = nextAuthId++;
        uint64 currentTime = uint64(block.timestamp);
        uint64 expiresAt = currentTime + uint64(authorizationExpiryDuration);
        
        authorizations[authId] = AcquisitionAuthorization({
            authId: authId,
            packetId: packetId,
            spvId: spvId,
            approvedAmount: approvedAmount,
            proposedAt: currentTime,
            activatedAt: 0,
            expiresAt: expiresAt,
            state: AuthorizationState.Proposed,
            proposer: msg.sender
        });
        
        emit AuthorizationProposed(
            authId,
            packetId,
            spvId,
            approvedAmount,
            msg.sender,
            currentTime,
            currentTime + uint64(timelockSeconds)
        );
    }
    
    /**
     * @notice Activate an authorization after timelock (calls readiness gate)
     * @param authId The authorization to activate
     */
    function activateAuthorization(
        uint256 authId
    ) external whenNotPaused nonReentrant authExists(authId) onlyRole(SETTLEMENT_AUTHORITY_ROLE) {
        AcquisitionAuthorization storage auth = authorizations[authId];
        
        // Must be in Proposed state
        if (auth.state != AuthorizationState.Proposed) {
            revert InvalidAuthorizationState(authId, auth.state, AuthorizationState.Proposed);
        }
        
        // Check expiry
        if (block.timestamp >= auth.expiresAt) {
            revert AuthorizationExpiredError(authId, auth.expiresAt);
        }
        
        // Check timelock elapsed
        if (block.timestamp < auth.proposedAt + timelockSeconds) {
            revert TimelockNotElapsed(authId, auth.proposedAt, uint64(timelockSeconds));
        }
        
        // Check readiness gate if configured
        if (readinessGate != address(0)) {
            (bool success, bytes memory data) = readinessGate.staticcall(
                abi.encodeWithSignature("assertReady()")
            );
            if (!success) {
                revert ReadinessGateFailed("Gate check failed");
            }
        }
        
        auth.state = AuthorizationState.Active;
        auth.activatedAt = uint64(block.timestamp);
        
        emit AuthorizationActivated(authId, msg.sender, uint64(block.timestamp));
    }
    
    /**
     * @notice Cancel an authorization
     * @param authId The authorization to cancel
     */
    function cancelAuthorization(
        uint256 authId
    ) external whenNotPaused nonReentrant authExists(authId) onlyRole(GUARDIAN_ROLE) {
        AcquisitionAuthorization storage auth = authorizations[authId];
        
        // Can only cancel Proposed or Active authorizations
        if (auth.state != AuthorizationState.Proposed && auth.state != AuthorizationState.Active) {
            revert InvalidAuthorizationState(authId, auth.state, AuthorizationState.Proposed);
        }
        
        auth.state = AuthorizationState.Canceled;
        
        emit AuthorizationCanceled(authId, msg.sender, uint64(block.timestamp));
    }
    
    /**
     * @notice Expire an authorization (permissionless if past expiry)
     * @param authId The authorization to expire
     */
    function expireAuthorization(
        uint256 authId
    ) external nonReentrant authExists(authId) {
        AcquisitionAuthorization storage auth = authorizations[authId];
        
        // Only non-terminal states can expire
        if (auth.state == AuthorizationState.Settled || 
            auth.state == AuthorizationState.Canceled ||
            auth.state == AuthorizationState.Expired) {
            revert InvalidAuthorizationState(authId, auth.state, AuthorizationState.Proposed);
        }
        
        // Must be past expiry
        if (block.timestamp < auth.expiresAt) {
            revert AuthorizationExpiredError(authId, auth.expiresAt);
        }
        
        auth.state = AuthorizationState.Expired;
        
        emit AuthorizationExpired(authId, uint64(block.timestamp));
    }

    // ========================================================================
    // SETTLEMENT
    // ========================================================================
    
    /**
     * @notice Record a settlement event
     * @param authId The authorization being settled
     * @param settledAmount Actual amount settled
     * @param proofHash Keccak256 hash of settlement proof
     * @param settlementCid DeNet CID of settlement documentation
     * @return settlementId The ID of the created settlement
     */
    function recordSettlementEvent(
        uint256 authId,
        uint256 settledAmount,
        bytes32 proofHash,
        bytes32 settlementCid
    ) external whenNotPaused nonReentrant authExists(authId) onlyRole(SETTLEMENT_AUTHORITY_ROLE) returns (uint256 settlementId) {
        AcquisitionAuthorization storage auth = authorizations[authId];
        
        // Must be Active
        if (auth.state != AuthorizationState.Active) {
            revert InvalidAuthorizationState(authId, auth.state, AuthorizationState.Active);
        }
        
        // Validate inputs
        if (settledAmount == 0) revert ZeroAmountNotAllowed();
        if (proofHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (settlementCid == bytes32(0)) revert ZeroHashNotAllowed();
        
        // Settled amount should not exceed approved
        if (settledAmount > auth.approvedAmount) {
            revert AmountExceedsMaximum(settledAmount, auth.approvedAmount);
        }
        
        settlementId = nextSettlementId++;
        uint64 currentTime = uint64(block.timestamp);
        
        settlements[settlementId] = SettlementEvent({
            settlementId: settlementId,
            authId: authId,
            settledAmount: settledAmount,
            proofHash: proofHash,
            settlementCid: settlementCid,
            timestamp: currentTime,
            settler: msg.sender
        });
        
        // Mark authorization as settled (terminal state)
        auth.state = AuthorizationState.Settled;
        
        emit SettlementRecorded(
            settlementId,
            authId,
            settledAmount,
            proofHash,
            msg.sender,
            currentTime
        );
    }

    // ========================================================================
    // ADMIN FUNCTIONS (Timelocked via GovernanceHub)
    // ========================================================================
    
    /**
     * @notice Update the capital readiness gate address
     * @param newGate New gate address (can be address(0) to disable)
     */
    function setCapitalReadinessGate(
        address newGate
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldGate = readinessGate;
        readinessGate = newGate;
        
        emit CapitalReadinessGateUpdated(oldGate, newGate, msg.sender, uint64(block.timestamp));
    }
    
    /**
     * @notice Update the timelock duration
     * @param newTimelockSeconds New timelock duration in seconds
     */
    function setTimelockSeconds(
        uint256 newTimelockSeconds
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTimelockSeconds < MIN_TIMELOCK_SECONDS) {
            revert DurationTooShort(newTimelockSeconds, MIN_TIMELOCK_SECONDS);
        }
        if (newTimelockSeconds > MAX_TIMELOCK_SECONDS) {
            revert DurationTooLong(newTimelockSeconds, MAX_TIMELOCK_SECONDS);
        }
        
        uint256 oldTimelock = timelockSeconds;
        timelockSeconds = newTimelockSeconds;
        
        emit TimelockUpdated(oldTimelock, newTimelockSeconds, msg.sender, uint64(block.timestamp));
    }
    
    /**
     * @notice Update the attestation max age
     * @param newMaxAgeSeconds New max age in seconds
     */
    function setAttestationMaxAgeSeconds(
        uint256 newMaxAgeSeconds
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newMaxAgeSeconds < MIN_ATTESTATION_MAX_AGE) {
            revert DurationTooShort(newMaxAgeSeconds, MIN_ATTESTATION_MAX_AGE);
        }
        if (newMaxAgeSeconds > MAX_ATTESTATION_MAX_AGE) {
            revert DurationTooLong(newMaxAgeSeconds, MAX_ATTESTATION_MAX_AGE);
        }
        
        uint256 oldMaxAge = attestationMaxAgeSeconds;
        attestationMaxAgeSeconds = newMaxAgeSeconds;
        
        emit AttestationMaxAgeUpdated(oldMaxAge, newMaxAgeSeconds, msg.sender, uint64(block.timestamp));
    }

    // ========================================================================
    // EMERGENCY FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Pause all operations (GUARDIAN only)
     */
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause operations (ADMIN only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================
    
    /**
     * @notice Get packet details
     * @param packetId The packet ID
     * @return The PropertyPacket struct
     */
    function getPacket(uint256 packetId) external view returns (PropertyPacket memory) {
        return packets[packetId];
    }
    
    /**
     * @notice Get SPV details
     * @param spvId The SPV ID
     * @return The SPVEntity struct
     */
    function getSPV(uint256 spvId) external view returns (SPVEntity memory) {
        return spvEntities[spvId];
    }
    
    /**
     * @notice Get authorization details
     * @param authId The authorization ID
     * @return The AcquisitionAuthorization struct
     */
    function getAuthorization(uint256 authId) external view returns (AcquisitionAuthorization memory) {
        return authorizations[authId];
    }
    
    /**
     * @notice Get settlement details
     * @param settlementId The settlement ID
     * @return The SettlementEvent struct
     */
    function getSettlement(uint256 settlementId) external view returns (SettlementEvent memory) {
        return settlements[settlementId];
    }
    
    /**
     * @notice Check if attestations are complete and valid for a packet
     * @param packetId The packet to check
     * @return complete Whether both attestations are present
     * @return fresh Whether both attestations are within maxAgeSeconds
     */
    function checkAttestationStatus(uint256 packetId) external view returns (bool complete, bool fresh) {
        PropertyPacket storage packet = packets[packetId];
        
        complete = packet.attestationA.valid && packet.attestationB.valid;
        
        if (complete) {
            uint64 currentTime = uint64(block.timestamp);
            bool aFresh = (currentTime - packet.attestationA.timestamp) <= attestationMaxAgeSeconds;
            bool bFresh = (currentTime - packet.attestationB.timestamp) <= attestationMaxAgeSeconds;
            fresh = aFresh && bFresh;
        }
    }
    
    /**
     * @notice Check if authorization timelock has elapsed
     * @param authId The authorization to check
     * @return elapsed Whether timelock has passed
     * @return remainingSeconds Seconds until timelock completes (0 if elapsed)
     */
    function checkTimelockStatus(uint256 authId) external view returns (bool elapsed, uint256 remainingSeconds) {
        AcquisitionAuthorization storage auth = authorizations[authId];
        
        uint256 unlockTime = auth.proposedAt + timelockSeconds;
        
        if (block.timestamp >= unlockTime) {
            elapsed = true;
            remainingSeconds = 0;
        } else {
            elapsed = false;
            remainingSeconds = unlockTime - block.timestamp;
        }
    }
}
