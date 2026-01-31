// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CapitalBridgeTypes.sol";

/**
 * @title ICapitalBridge
 * @author Axiom Protocol
 * @notice Interface for CapitalBridgeHub external integrations
 */
interface ICapitalBridge {
    // ========================================================================
    // PACKET MANAGEMENT
    // ========================================================================
    
    function submitPropertyPacket(
        bytes32 propertyDataHash,
        bytes32 dueDiligencePackageCid,
        bytes32 underwritingModelHash,
        bytes32 riskSummaryHash,
        uint256 maxApprovedCapital
    ) external returns (uint256 packetId);
    
    function attestResearchPacketA(
        uint256 packetId,
        bytes32 underwritingModelHash,
        bytes32 riskSummaryHash,
        bytes32 denetCidHash
    ) external;
    
    function attestResearchPacketB(
        uint256 packetId,
        bytes32 underwritingModelHash,
        bytes32 riskSummaryHash,
        bytes32 denetCidHash
    ) external;
    
    function clearResearchAttestations(uint256 packetId) external;
    
    function approvePropertyPacket(uint256 packetId) external;
    
    function rejectPropertyPacket(uint256 packetId, RejectionReason reason) external;
    
    function archivePropertyPacket(uint256 packetId) external;
    
    function expirePropertyPacket(uint256 packetId) external;

    // ========================================================================
    // SPV MANAGEMENT
    // ========================================================================
    
    function registerSPV(
        bytes32 legalEntityHash,
        bytes32 operatingAgreementHash,
        address paymentAddress
    ) external returns (uint256 spvId);
    
    function deactivateSPV(uint256 spvId) external;

    // ========================================================================
    // AUTHORIZATION MANAGEMENT
    // ========================================================================
    
    function proposeAuthorization(
        uint256 packetId,
        uint256 spvId,
        uint256 approvedAmount
    ) external returns (uint256 authId);
    
    function activateAuthorization(uint256 authId) external;
    
    function cancelAuthorization(uint256 authId) external;
    
    function expireAuthorization(uint256 authId) external;

    // ========================================================================
    // SETTLEMENT
    // ========================================================================
    
    function recordSettlementEvent(
        uint256 authId,
        uint256 settledAmount,
        bytes32 proofHash,
        bytes32 settlementCid
    ) external returns (uint256 settlementId);

    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================
    
    function getPacket(uint256 packetId) external view returns (PropertyPacket memory);
    
    function getSPV(uint256 spvId) external view returns (SPVEntity memory);
    
    function getAuthorization(uint256 authId) external view returns (AcquisitionAuthorization memory);
    
    function getSettlement(uint256 settlementId) external view returns (SettlementEvent memory);
    
    function checkAttestationStatus(uint256 packetId) external view returns (bool complete, bool fresh);
    
    function checkTimelockStatus(uint256 authId) external view returns (bool elapsed, uint256 remainingSeconds);
    
    // ========================================================================
    // STATE VARIABLES
    // ========================================================================
    
    function nextPacketId() external view returns (uint256);
    
    function nextSpvId() external view returns (uint256);
    
    function nextAuthId() external view returns (uint256);
    
    function nextSettlementId() external view returns (uint256);
    
    function timelockSeconds() external view returns (uint256);
    
    function attestationMaxAgeSeconds() external view returns (uint256);
    
    function readinessGate() external view returns (address);
}

/**
 * @title ICapitalReadinessGate
 * @author Axiom Protocol
 * @notice Interface for CapitalReadinessGate external calls
 */
interface ICapitalReadinessGate {
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
        uint64 lastUpdated;
        uint64 observationStartTimestamp;
        bytes32 auditHash;
    }
    
    function assertReady() external view returns (bool ready);
    
    function checkReadiness() external view returns (bool isReady, string memory failureReason);
    
    function postAttestation(
        uint256 uptimeBps,
        uint256 incidentsCount,
        uint256 tvlUsd,
        bytes32 auditHash
    ) external;
    
    function updateConfig(ReadinessConfig calldata newConfig) external;
    
    function getConfig() external view returns (ReadinessConfig memory);
    
    function getAttestation() external view returns (ReadinessAttestation memory);
    
    function getObservationDaysElapsed() external view returns (uint256);
    
    function checkFreezeStatus() external view returns (bool inFreeze, uint64 unfreezeAt);
    
    function getAttestationFreshness() external view returns (uint256 secondsRemaining);
}
