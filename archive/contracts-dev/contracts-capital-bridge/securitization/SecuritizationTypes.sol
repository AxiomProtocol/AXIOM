// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SecuritizationTypes
 * @notice Type definitions for Layer 5G Securitization contracts
 * @dev Part of the Axiom Protocol Capital Bridge Infrastructure
 */
library SecuritizationTypes {
    
    // ========================================================================
    // INSTRUMENT TYPES
    // ========================================================================
    
    /**
     * @notice Types of standardized instruments
     */
    enum InstrumentType {
        WholeLoan,      // Full ownership of underlying loan
        Participation,  // Fractional participation in loan
        Note,           // Promissory note backed by asset
        RevenueShare,   // Share of revenue stream
        RentStream      // Tokenized rent payment stream
    }
    
    /**
     * @notice Instrument state lifecycle
     */
    enum InstrumentState {
        Draft,      // Initial state, not yet active
        Active,     // Currently active and earning
        Matured,    // Reached maturity date
        Defaulted,  // Underlying asset in default
        Retired     // Fully paid off or retired
    }
    
    /**
     * @notice Standardized instrument representing a financial position
     * @param instrumentId Unique identifier
     * @param instrumentType Type of instrument
     * @param underlyingAssetHash Hash of underlying asset data (loan, property, etc.)
     * @param principalAmount Principal value in AXUSD (6 decimals)
     * @param interestRateBps Annual interest rate in basis points
     * @param maturityDate Unix timestamp of maturity
     * @param issuedAt Unix timestamp of issuance
     * @param holder Current holder address
     * @param state Current instrument state
     * @param poolId Pool ID if assigned to a pool (0 if unassigned)
     */
    struct Instrument {
        uint256 instrumentId;
        InstrumentType instrumentType;
        bytes32 underlyingAssetHash;
        uint256 principalAmount;
        uint16 interestRateBps;
        uint64 maturityDate;
        uint64 issuedAt;
        address holder;
        InstrumentState state;
        uint256 poolId;
    }
    
    // ========================================================================
    // POOL TYPES
    // ========================================================================
    
    /**
     * @notice Pool state lifecycle
     */
    enum PoolState {
        Forming,    // Accepting new instruments
        Active,     // Fully formed and operational
        Closed,     // No longer accepting, existing instruments still active
        Liquidated  // All instruments settled
    }
    
    /**
     * @notice Pool of aggregated instruments
     * @param poolId Unique identifier
     * @param name Human-readable pool name
     * @param eligibilityFilterHash Hash of eligibility criteria document
     * @param formationRulesHash Hash of formation rules document
     * @param cashflowScheduleHash Hash of cashflow schedule document
     * @param minInstruments Minimum instruments required for activation
     * @param maxConcentrationBps Max single instrument concentration (basis points)
     * @param targetWaLtvBps Target weighted average LTV (basis points)
     * @param createdAt Unix timestamp of creation
     * @param activatedAt Unix timestamp of activation (0 if not active)
     * @param state Current pool state
     */
    struct Pool {
        uint256 poolId;
        string name;
        bytes32 eligibilityFilterHash;
        bytes32 formationRulesHash;
        bytes32 cashflowScheduleHash;
        uint16 minInstruments;
        uint16 maxConcentrationBps;
        uint16 targetWaLtvBps;
        uint64 createdAt;
        uint64 activatedAt;
        PoolState state;
    }
    
    // ========================================================================
    // SERVICING EVENT TYPES
    // ========================================================================
    
    /**
     * @notice Types of servicing events
     */
    enum ServicingEventType {
        Payment,        // Regular payment received
        Prepayment,     // Early principal payment
        Default,        // Missed payment / default event
        Modification,   // Loan modification
        Payoff,         // Full payoff
        Extension,      // Maturity extension
        Transfer        // Instrument transferred
    }
    
    /**
     * @notice Record of a servicing activity
     * @param eventId Unique identifier
     * @param instrumentId Associated instrument
     * @param eventType Type of event
     * @param amount Amount involved (if applicable)
     * @param proofHash Hash of supporting documentation
     * @param timestamp Unix timestamp of event
     * @param reporter Address that reported the event
     */
    struct ServicingEvent {
        uint256 eventId;
        uint256 instrumentId;
        ServicingEventType eventType;
        uint256 amount;
        bytes32 proofHash;
        uint64 timestamp;
        address reporter;
    }
}
