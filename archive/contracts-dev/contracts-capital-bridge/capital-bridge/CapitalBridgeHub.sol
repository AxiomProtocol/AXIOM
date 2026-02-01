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
 */
contract CapitalBridgeHub is AccessControl, Pausable, ReentrancyGuard {
    using CapitalBridgeTypes for *;

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
    // EVENTS
    // ========================================================================

    event PropertyPacketSubmitted(uint256 indexed packetId, address indexed submitter, bytes32 propertyDataHash, uint256 maxApprovedCapital, uint64 expiresAt);
    event ResearchAttestedA(uint256 indexed packetId, address indexed attestor, bytes32 underwritingModelHash, bytes32 riskSummaryHash, bytes32 denetCidHash, uint64 timestamp);
    event ResearchAttestedB(uint256 indexed packetId, address indexed attestor, bytes32 underwritingModelHash, bytes32 riskSummaryHash, bytes32 denetCidHash, uint64 timestamp);
    event ResearchAttestationsCleared(uint256 indexed packetId, address indexed clearedBy, uint64 timestamp);
    event PropertyPacketApproved(uint256 indexed packetId, address indexed approver, uint64 timestamp);
    event PropertyPacketRejected(uint256 indexed packetId, address indexed rejector, CapitalBridgeTypes.RejectionReason reason, uint64 timestamp);
    event PropertyPacketArchived(uint256 indexed packetId, address indexed archivedBy, uint64 timestamp);
    event PropertyPacketExpired(uint256 indexed packetId, uint64 timestamp);
    event SPVRegistered(uint256 indexed spvId, bytes32 legalEntityHash, address paymentAddress, uint64 timestamp);
    event SPVDeactivated(uint256 indexed spvId, address indexed deactivatedBy, uint64 timestamp);
    event AuthorizationProposed(uint256 indexed authId, uint256 indexed packetId, uint256 indexed spvId, uint256 approvedAmount, address proposer, uint64 proposedAt, uint64 timelockEndsAt);
    event AuthorizationActivated(uint256 indexed authId, address indexed activatedBy, uint64 timestamp);
    event AuthorizationCanceled(uint256 indexed authId, address indexed canceledBy, uint64 timestamp);
    event AuthorizationExpired(uint256 indexed authId, uint64 timestamp);
    event SettlementRecorded(uint256 indexed settlementId, uint256 indexed authId, uint256 settledAmount, bytes32 proofHash, address settler, uint64 timestamp);
    event TimelockUpdated(uint256 oldTimelock, uint256 newTimelock, address indexed updatedBy, uint64 timestamp);
    event AttestationMaxAgeUpdated(uint256 oldMaxAge, uint256 newMaxAge, address indexed updatedBy, uint64 timestamp);
    event CapitalReadinessGateUpdated(address oldGate, address newGate, address indexed updatedBy, uint64 timestamp);

    // ========================================================================
    // ERRORS
    // ========================================================================

    error UnauthorizedRole(address caller, bytes32 requiredRole);
    error InvalidPacketState(uint256 packetId, CapitalBridgeTypes.PacketState currentState, CapitalBridgeTypes.PacketState requiredState);
    error InvalidAuthorizationState(uint256 authId, CapitalBridgeTypes.AuthorizationState currentState, CapitalBridgeTypes.AuthorizationState requiredState);
    error PacketNotFound(uint256 packetId);
    error SPVNotFound(uint256 spvId);
    error AuthorizationNotFound(uint256 authId);
    error SPVNotActive(uint256 spvId);
    error AttestationExpired(uint256 packetId, uint64 attestedAt, uint64 maxAge);
    error DuplicateAttestor(address attestor);
    error AmountExceedsMaximum(uint256 requested, uint256 maximum);
    error TimelockNotElapsed(uint256 authId, uint64 proposedAt, uint64 timelockSeconds);
    error ReadinessGateFailed(string reason);
    error PacketExpired(uint256 packetId, uint64 expiredAt);
    error AuthorizationExpiredError(uint256 authId, uint64 expiredAt);
    error AttestationsIncomplete(uint256 packetId);
    error ZeroAddressNotAllowed();
    error ZeroAmountNotAllowed();
    error ZeroHashNotAllowed();
    error DurationTooShort(uint256 provided, uint256 minimum);
    error DurationTooLong(uint256 provided, uint256 maximum);

    // ========================================================================
    // STATE VARIABLES
    // ========================================================================
    
    mapping(uint256 => CapitalBridgeTypes.PropertyPacket) public packets;
    mapping(uint256 => CapitalBridgeTypes.SPVEntity) public spvEntities;
    mapping(uint256 => CapitalBridgeTypes.AcquisitionAuthorization) public authorizations;
    mapping(uint256 => CapitalBridgeTypes.SettlementEvent) public settlements;
    
    uint256 public nextPacketId = 1;
    uint256 public nextSpvId = 1;
    uint256 public nextAuthId = 1;
    uint256 public nextSettlementId = 1;
    
    uint256 public timelockSeconds = 24 hours;
    uint256 public attestationMaxAgeSeconds = 30 days;
    uint256 public packetExpiryDuration = 90 days;
    uint256 public authorizationExpiryDuration = 30 days;
    
    address public readinessGate;
    
    uint256 public constant MIN_TIMELOCK_SECONDS = 1 hours;
    uint256 public constant MAX_TIMELOCK_SECONDS = 7 days;
    uint256 public constant MIN_ATTESTATION_MAX_AGE = 1 days;
    uint256 public constant MAX_ATTESTATION_MAX_AGE = 180 days;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================
    
    constructor(address _admin) {
        if (_admin == address(0)) revert ZeroAddressNotAllowed();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
    }

    // ========================================================================
    // MODIFIERS
    // ========================================================================
    
    modifier packetExists(uint256 packetId) {
        if (packets[packetId].packetId == 0) revert PacketNotFound(packetId);
        _;
    }
    
    modifier spvExists(uint256 spvId) {
        if (spvEntities[spvId].spvId == 0) revert SPVNotFound(spvId);
        _;
    }
    
    modifier authExists(uint256 authId) {
        if (authorizations[authId].authId == 0) revert AuthorizationNotFound(authId);
        _;
    }

    // ========================================================================
    // PACKET MANAGEMENT
    // ========================================================================
    
    function submitPropertyPacket(
        bytes32 propertyDataHash,
        bytes32 dueDiligencePackageCid,
        bytes32 underwritingModelHash,
        bytes32 riskSummaryHash,
        uint256 maxApprovedCapital
    ) external whenNotPaused nonReentrant returns (uint256 packetId) {
        if (propertyDataHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (dueDiligencePackageCid == bytes32(0)) revert ZeroHashNotAllowed();
        if (underwritingModelHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (riskSummaryHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (maxApprovedCapital == 0) revert ZeroAmountNotAllowed();
        
        packetId = nextPacketId++;
        uint64 currentTime = uint64(block.timestamp);
        uint64 expiresAt = currentTime + uint64(packetExpiryDuration);
        
        CapitalBridgeTypes.PropertyPacket storage packet = packets[packetId];
        packet.packetId = packetId;
        packet.submitter = msg.sender;
        packet.propertyDataHash = propertyDataHash;
        packet.dueDiligencePackageCid = dueDiligencePackageCid;
        packet.underwritingModelHash = underwritingModelHash;
        packet.riskSummaryHash = riskSummaryHash;
        packet.maxApprovedCapital = maxApprovedCapital;
        packet.state = CapitalBridgeTypes.PacketState.Submitted;
        packet.rejectionReason = CapitalBridgeTypes.RejectionReason.None;
        packet.submittedAt = currentTime;
        packet.expiresAt = expiresAt;
        
        emit PropertyPacketSubmitted(packetId, msg.sender, propertyDataHash, maxApprovedCapital, expiresAt);
    }
    
    function attestResearchPacketA(
        uint256 packetId,
        bytes32 underwritingModelHash,
        bytes32 riskSummaryHash,
        bytes32 denetCidHash
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(RESEARCH_ATTESTOR_A_ROLE) {
        CapitalBridgeTypes.PropertyPacket storage packet = packets[packetId];
        
        if (packet.state != CapitalBridgeTypes.PacketState.Submitted && packet.state != CapitalBridgeTypes.PacketState.Attested) {
            revert InvalidPacketState(packetId, packet.state, CapitalBridgeTypes.PacketState.Submitted);
        }
        
        if (block.timestamp >= packet.expiresAt) revert PacketExpired(packetId, packet.expiresAt);
        if (underwritingModelHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (riskSummaryHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (denetCidHash == bytes32(0)) revert ZeroHashNotAllowed();
        
        if (packet.attestationB.valid && packet.attestationB.attestor == msg.sender) {
            revert DuplicateAttestor(msg.sender);
        }
        
        uint64 currentTime = uint64(block.timestamp);
        
        packet.attestationA.attestor = msg.sender;
        packet.attestationA.underwritingModelHash = underwritingModelHash;
        packet.attestationA.riskSummaryHash = riskSummaryHash;
        packet.attestationA.denetCidHash = denetCidHash;
        packet.attestationA.timestamp = currentTime;
        packet.attestationA.valid = true;
        
        if (packet.attestationB.valid) {
            packet.state = CapitalBridgeTypes.PacketState.Attested;
        }
        
        emit ResearchAttestedA(packetId, msg.sender, underwritingModelHash, riskSummaryHash, denetCidHash, currentTime);
    }
    
    function attestResearchPacketB(
        uint256 packetId,
        bytes32 underwritingModelHash,
        bytes32 riskSummaryHash,
        bytes32 denetCidHash
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(RESEARCH_ATTESTOR_B_ROLE) {
        CapitalBridgeTypes.PropertyPacket storage packet = packets[packetId];
        
        if (packet.state != CapitalBridgeTypes.PacketState.Submitted && packet.state != CapitalBridgeTypes.PacketState.Attested) {
            revert InvalidPacketState(packetId, packet.state, CapitalBridgeTypes.PacketState.Submitted);
        }
        
        if (block.timestamp >= packet.expiresAt) revert PacketExpired(packetId, packet.expiresAt);
        if (underwritingModelHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (riskSummaryHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (denetCidHash == bytes32(0)) revert ZeroHashNotAllowed();
        
        if (packet.attestationA.valid && packet.attestationA.attestor == msg.sender) {
            revert DuplicateAttestor(msg.sender);
        }
        
        uint64 currentTime = uint64(block.timestamp);
        
        packet.attestationB.attestor = msg.sender;
        packet.attestationB.underwritingModelHash = underwritingModelHash;
        packet.attestationB.riskSummaryHash = riskSummaryHash;
        packet.attestationB.denetCidHash = denetCidHash;
        packet.attestationB.timestamp = currentTime;
        packet.attestationB.valid = true;
        
        if (packet.attestationA.valid) {
            packet.state = CapitalBridgeTypes.PacketState.Attested;
        }
        
        emit ResearchAttestedB(packetId, msg.sender, underwritingModelHash, riskSummaryHash, denetCidHash, currentTime);
    }
    
    function clearResearchAttestations(
        uint256 packetId
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(RISK_COMMITTEE_ROLE) {
        CapitalBridgeTypes.PropertyPacket storage packet = packets[packetId];
        
        if (packet.state != CapitalBridgeTypes.PacketState.Submitted && packet.state != CapitalBridgeTypes.PacketState.Attested) {
            revert InvalidPacketState(packetId, packet.state, CapitalBridgeTypes.PacketState.Submitted);
        }
        
        delete packet.attestationA;
        delete packet.attestationB;
        packet.state = CapitalBridgeTypes.PacketState.Submitted;
        
        emit ResearchAttestationsCleared(packetId, msg.sender, uint64(block.timestamp));
    }
    
    function approvePropertyPacket(
        uint256 packetId
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(RISK_COMMITTEE_ROLE) {
        CapitalBridgeTypes.PropertyPacket storage packet = packets[packetId];
        
        if (packet.state != CapitalBridgeTypes.PacketState.Attested) {
            revert InvalidPacketState(packetId, packet.state, CapitalBridgeTypes.PacketState.Attested);
        }
        
        if (block.timestamp >= packet.expiresAt) revert PacketExpired(packetId, packet.expiresAt);
        if (!packet.attestationA.valid || !packet.attestationB.valid) revert AttestationsIncomplete(packetId);
        
        uint64 currentTime = uint64(block.timestamp);
        if (currentTime - packet.attestationA.timestamp > attestationMaxAgeSeconds) {
            revert AttestationExpired(packetId, packet.attestationA.timestamp, uint64(attestationMaxAgeSeconds));
        }
        if (currentTime - packet.attestationB.timestamp > attestationMaxAgeSeconds) {
            revert AttestationExpired(packetId, packet.attestationB.timestamp, uint64(attestationMaxAgeSeconds));
        }
        
        packet.state = CapitalBridgeTypes.PacketState.Approved;
        packet.approvedAt = currentTime;
        
        emit PropertyPacketApproved(packetId, msg.sender, currentTime);
    }
    
    function rejectPropertyPacket(
        uint256 packetId,
        CapitalBridgeTypes.RejectionReason reason
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(RISK_COMMITTEE_ROLE) {
        CapitalBridgeTypes.PropertyPacket storage packet = packets[packetId];
        
        if (packet.state != CapitalBridgeTypes.PacketState.Submitted && packet.state != CapitalBridgeTypes.PacketState.Attested) {
            revert InvalidPacketState(packetId, packet.state, CapitalBridgeTypes.PacketState.Submitted);
        }
        
        packet.state = CapitalBridgeTypes.PacketState.Rejected;
        packet.rejectionReason = reason;
        
        emit PropertyPacketRejected(packetId, msg.sender, reason, uint64(block.timestamp));
    }
    
    function archivePropertyPacket(
        uint256 packetId
    ) external whenNotPaused nonReentrant packetExists(packetId) onlyRole(DEFAULT_ADMIN_ROLE) {
        CapitalBridgeTypes.PropertyPacket storage packet = packets[packetId];
        
        if (packet.state != CapitalBridgeTypes.PacketState.Approved && packet.state != CapitalBridgeTypes.PacketState.Rejected) {
            revert InvalidPacketState(packetId, packet.state, CapitalBridgeTypes.PacketState.Approved);
        }
        
        packet.state = CapitalBridgeTypes.PacketState.Archived;
        emit PropertyPacketArchived(packetId, msg.sender, uint64(block.timestamp));
    }
    
    function expirePropertyPacket(uint256 packetId) external nonReentrant packetExists(packetId) {
        CapitalBridgeTypes.PropertyPacket storage packet = packets[packetId];
        
        if (packet.state == CapitalBridgeTypes.PacketState.Archived || 
            packet.state == CapitalBridgeTypes.PacketState.Expired ||
            packet.state == CapitalBridgeTypes.PacketState.Rejected) {
            revert InvalidPacketState(packetId, packet.state, CapitalBridgeTypes.PacketState.Submitted);
        }
        
        if (block.timestamp < packet.expiresAt) revert PacketExpired(packetId, packet.expiresAt);
        
        packet.state = CapitalBridgeTypes.PacketState.Expired;
        emit PropertyPacketExpired(packetId, uint64(block.timestamp));
    }

    // ========================================================================
    // SPV MANAGEMENT
    // ========================================================================
    
    function registerSPV(
        bytes32 legalEntityHash,
        bytes32 operatingAgreementHash,
        address paymentAddress
    ) external whenNotPaused nonReentrant onlyRole(SETTLEMENT_AUTHORITY_ROLE) returns (uint256 spvId) {
        if (legalEntityHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (operatingAgreementHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (paymentAddress == address(0)) revert ZeroAddressNotAllowed();
        
        spvId = nextSpvId++;
        
        CapitalBridgeTypes.SPVEntity storage spv = spvEntities[spvId];
        spv.spvId = spvId;
        spv.legalEntityHash = legalEntityHash;
        spv.operatingAgreementHash = operatingAgreementHash;
        spv.paymentAddress = paymentAddress;
        spv.registeredAt = uint64(block.timestamp);
        spv.active = true;
        
        emit SPVRegistered(spvId, legalEntityHash, paymentAddress, uint64(block.timestamp));
    }
    
    function deactivateSPV(uint256 spvId) external whenNotPaused nonReentrant spvExists(spvId) onlyRole(DEFAULT_ADMIN_ROLE) {
        CapitalBridgeTypes.SPVEntity storage spv = spvEntities[spvId];
        if (!spv.active) revert SPVNotActive(spvId);
        spv.active = false;
        emit SPVDeactivated(spvId, msg.sender, uint64(block.timestamp));
    }

    // ========================================================================
    // AUTHORIZATION MANAGEMENT
    // ========================================================================
    
    function proposeAuthorization(
        uint256 packetId,
        uint256 spvId,
        uint256 approvedAmount
    ) external whenNotPaused nonReentrant packetExists(packetId) spvExists(spvId) onlyRole(RISK_COMMITTEE_ROLE) returns (uint256 authId) {
        CapitalBridgeTypes.PropertyPacket storage packet = packets[packetId];
        CapitalBridgeTypes.SPVEntity storage spv = spvEntities[spvId];
        
        if (packet.state != CapitalBridgeTypes.PacketState.Approved) {
            revert InvalidPacketState(packetId, packet.state, CapitalBridgeTypes.PacketState.Approved);
        }
        
        if (!spv.active) revert SPVNotActive(spvId);
        if (approvedAmount > packet.maxApprovedCapital) revert AmountExceedsMaximum(approvedAmount, packet.maxApprovedCapital);
        if (approvedAmount == 0) revert ZeroAmountNotAllowed();
        
        authId = nextAuthId++;
        uint64 currentTime = uint64(block.timestamp);
        uint64 expiresAt = currentTime + uint64(authorizationExpiryDuration);
        
        CapitalBridgeTypes.AcquisitionAuthorization storage auth = authorizations[authId];
        auth.authId = authId;
        auth.packetId = packetId;
        auth.spvId = spvId;
        auth.approvedAmount = approvedAmount;
        auth.proposedAt = currentTime;
        auth.expiresAt = expiresAt;
        auth.state = CapitalBridgeTypes.AuthorizationState.Proposed;
        auth.proposer = msg.sender;
        
        emit AuthorizationProposed(authId, packetId, spvId, approvedAmount, msg.sender, currentTime, currentTime + uint64(timelockSeconds));
    }
    
    function activateAuthorization(uint256 authId) external whenNotPaused nonReentrant authExists(authId) onlyRole(SETTLEMENT_AUTHORITY_ROLE) {
        CapitalBridgeTypes.AcquisitionAuthorization storage auth = authorizations[authId];
        
        if (auth.state != CapitalBridgeTypes.AuthorizationState.Proposed) {
            revert InvalidAuthorizationState(authId, auth.state, CapitalBridgeTypes.AuthorizationState.Proposed);
        }
        
        if (block.timestamp >= auth.expiresAt) revert AuthorizationExpiredError(authId, auth.expiresAt);
        if (block.timestamp < auth.proposedAt + timelockSeconds) {
            revert TimelockNotElapsed(authId, auth.proposedAt, uint64(timelockSeconds));
        }
        
        if (readinessGate != address(0)) {
            (bool success,) = readinessGate.staticcall(abi.encodeWithSignature("assertReady()"));
            if (!success) revert ReadinessGateFailed("Gate check failed");
        }
        
        auth.state = CapitalBridgeTypes.AuthorizationState.Active;
        auth.activatedAt = uint64(block.timestamp);
        
        emit AuthorizationActivated(authId, msg.sender, uint64(block.timestamp));
    }
    
    function cancelAuthorization(uint256 authId) external whenNotPaused nonReentrant authExists(authId) onlyRole(GUARDIAN_ROLE) {
        CapitalBridgeTypes.AcquisitionAuthorization storage auth = authorizations[authId];
        
        if (auth.state != CapitalBridgeTypes.AuthorizationState.Proposed && auth.state != CapitalBridgeTypes.AuthorizationState.Active) {
            revert InvalidAuthorizationState(authId, auth.state, CapitalBridgeTypes.AuthorizationState.Proposed);
        }
        
        auth.state = CapitalBridgeTypes.AuthorizationState.Canceled;
        emit AuthorizationCanceled(authId, msg.sender, uint64(block.timestamp));
    }
    
    function expireAuthorization(uint256 authId) external nonReentrant authExists(authId) {
        CapitalBridgeTypes.AcquisitionAuthorization storage auth = authorizations[authId];
        
        if (auth.state == CapitalBridgeTypes.AuthorizationState.Settled || 
            auth.state == CapitalBridgeTypes.AuthorizationState.Canceled ||
            auth.state == CapitalBridgeTypes.AuthorizationState.Expired) {
            revert InvalidAuthorizationState(authId, auth.state, CapitalBridgeTypes.AuthorizationState.Proposed);
        }
        
        if (block.timestamp < auth.expiresAt) revert AuthorizationExpiredError(authId, auth.expiresAt);
        
        auth.state = CapitalBridgeTypes.AuthorizationState.Expired;
        emit AuthorizationExpired(authId, uint64(block.timestamp));
    }

    // ========================================================================
    // SETTLEMENT
    // ========================================================================
    
    function recordSettlementEvent(
        uint256 authId,
        uint256 settledAmount,
        bytes32 proofHash,
        bytes32 settlementCid
    ) external whenNotPaused nonReentrant authExists(authId) onlyRole(SETTLEMENT_AUTHORITY_ROLE) returns (uint256 settlementId) {
        CapitalBridgeTypes.AcquisitionAuthorization storage auth = authorizations[authId];
        
        if (auth.state != CapitalBridgeTypes.AuthorizationState.Active) {
            revert InvalidAuthorizationState(authId, auth.state, CapitalBridgeTypes.AuthorizationState.Active);
        }
        
        if (settledAmount == 0) revert ZeroAmountNotAllowed();
        if (proofHash == bytes32(0)) revert ZeroHashNotAllowed();
        if (settlementCid == bytes32(0)) revert ZeroHashNotAllowed();
        if (settledAmount > auth.approvedAmount) revert AmountExceedsMaximum(settledAmount, auth.approvedAmount);
        
        settlementId = nextSettlementId++;
        uint64 currentTime = uint64(block.timestamp);
        
        CapitalBridgeTypes.SettlementEvent storage settlement = settlements[settlementId];
        settlement.settlementId = settlementId;
        settlement.authId = authId;
        settlement.settledAmount = settledAmount;
        settlement.proofHash = proofHash;
        settlement.settlementCid = settlementCid;
        settlement.timestamp = currentTime;
        settlement.settler = msg.sender;
        
        auth.state = CapitalBridgeTypes.AuthorizationState.Settled;
        
        emit SettlementRecorded(settlementId, authId, settledAmount, proofHash, msg.sender, currentTime);
    }

    // ========================================================================
    // ADMIN FUNCTIONS
    // ========================================================================
    
    function setCapitalReadinessGate(address newGate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldGate = readinessGate;
        readinessGate = newGate;
        emit CapitalReadinessGateUpdated(oldGate, newGate, msg.sender, uint64(block.timestamp));
    }
    
    function setTimelockSeconds(uint256 newTimelockSeconds) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTimelockSeconds < MIN_TIMELOCK_SECONDS) revert DurationTooShort(newTimelockSeconds, MIN_TIMELOCK_SECONDS);
        if (newTimelockSeconds > MAX_TIMELOCK_SECONDS) revert DurationTooLong(newTimelockSeconds, MAX_TIMELOCK_SECONDS);
        
        uint256 oldTimelock = timelockSeconds;
        timelockSeconds = newTimelockSeconds;
        emit TimelockUpdated(oldTimelock, newTimelockSeconds, msg.sender, uint64(block.timestamp));
    }
    
    function setAttestationMaxAgeSeconds(uint256 newMaxAgeSeconds) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newMaxAgeSeconds < MIN_ATTESTATION_MAX_AGE) revert DurationTooShort(newMaxAgeSeconds, MIN_ATTESTATION_MAX_AGE);
        if (newMaxAgeSeconds > MAX_ATTESTATION_MAX_AGE) revert DurationTooLong(newMaxAgeSeconds, MAX_ATTESTATION_MAX_AGE);
        
        uint256 oldMaxAge = attestationMaxAgeSeconds;
        attestationMaxAgeSeconds = newMaxAgeSeconds;
        emit AttestationMaxAgeUpdated(oldMaxAge, newMaxAgeSeconds, msg.sender, uint64(block.timestamp));
    }

    // ========================================================================
    // EMERGENCY FUNCTIONS
    // ========================================================================
    
    function pause() external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================
    
    function getPacket(uint256 packetId) external view returns (CapitalBridgeTypes.PropertyPacket memory) {
        return packets[packetId];
    }
    
    function getSPV(uint256 spvId) external view returns (CapitalBridgeTypes.SPVEntity memory) {
        return spvEntities[spvId];
    }
    
    function getAuthorization(uint256 authId) external view returns (CapitalBridgeTypes.AcquisitionAuthorization memory) {
        return authorizations[authId];
    }
    
    function getSettlement(uint256 settlementId) external view returns (CapitalBridgeTypes.SettlementEvent memory) {
        return settlements[settlementId];
    }
    
    function checkAttestationStatus(uint256 packetId) external view returns (bool complete, bool fresh) {
        CapitalBridgeTypes.PropertyPacket storage packet = packets[packetId];
        complete = packet.attestationA.valid && packet.attestationB.valid;
        if (complete) {
            uint64 currentTime = uint64(block.timestamp);
            bool aFresh = (currentTime - packet.attestationA.timestamp) <= attestationMaxAgeSeconds;
            bool bFresh = (currentTime - packet.attestationB.timestamp) <= attestationMaxAgeSeconds;
            fresh = aFresh && bFresh;
        }
    }
    
    function checkTimelockStatus(uint256 authId) external view returns (bool elapsed, uint256 remainingSeconds) {
        CapitalBridgeTypes.AcquisitionAuthorization storage auth = authorizations[authId];
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
