// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CapitalBridgeTypes
 * @author Axiom Protocol
 * @notice Core data structures, enums, events, and errors for the Capital Bridge system
 * @dev This library defines all types used by CapitalBridgeHub and related contracts
 */
library CapitalBridgeTypes {
    // ========================================================================
    // ENUMS
    // ========================================================================

    enum PacketState {
        Draft,
        Submitted,
        Attested,
        Approved,
        Rejected,
        Archived,
        Expired
    }

    enum AuthorizationState {
        Proposed,
        Active,
        Settled,
        Canceled,
        Expired
    }

    enum RejectionReason {
        None,
        AttestationMismatch,
        RiskExceedsTolerance,
        UnderwritingFlawed,
        TitleIssues,
        MarketConditions,
        Other
    }

    // ========================================================================
    // STRUCTS
    // ========================================================================

    struct ResearchAttestation {
        address attestor;
        bytes32 underwritingModelHash;
        bytes32 riskSummaryHash;
        bytes32 denetCidHash;
        uint64 timestamp;
        bool valid;
    }

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

    struct SPVEntity {
        uint256 spvId;
        bytes32 legalEntityHash;
        bytes32 operatingAgreementHash;
        address paymentAddress;
        uint64 registeredAt;
        bool active;
    }

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

    struct SettlementEvent {
        uint256 settlementId;
        uint256 authId;
        uint256 settledAmount;
        bytes32 proofHash;
        bytes32 settlementCid;
        uint64 timestamp;
        address settler;
    }
}
