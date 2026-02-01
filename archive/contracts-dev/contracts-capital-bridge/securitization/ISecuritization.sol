// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SecuritizationTypes.sol";

/**
 * @title IInstrumentRegistry
 * @notice Interface for the InstrumentRegistry contract
 */
interface IInstrumentRegistry {
    
    // Events
    event InstrumentCreated(
        uint256 indexed instrumentId,
        SecuritizationTypes.InstrumentType instrumentType,
        bytes32 underlyingAssetHash,
        uint256 principalAmount,
        address indexed holder,
        uint64 timestamp
    );
    
    event InstrumentStateChanged(
        uint256 indexed instrumentId,
        SecuritizationTypes.InstrumentState oldState,
        SecuritizationTypes.InstrumentState newState,
        uint64 timestamp
    );
    
    event InstrumentTransferred(
        uint256 indexed instrumentId,
        address indexed from,
        address indexed to,
        uint64 timestamp
    );
    
    event InstrumentAssignedToPool(
        uint256 indexed instrumentId,
        uint256 indexed poolId,
        uint64 timestamp
    );
    
    // Functions
    function createInstrument(
        SecuritizationTypes.InstrumentType instrumentType,
        bytes32 underlyingAssetHash,
        uint256 principalAmount,
        uint16 interestRateBps,
        uint64 maturityDate,
        address holder
    ) external returns (uint256 instrumentId);
    
    function updateInstrumentState(
        uint256 instrumentId,
        SecuritizationTypes.InstrumentState newState
    ) external;
    
    function transferInstrument(
        uint256 instrumentId,
        address newHolder
    ) external;
    
    function assignToPool(
        uint256 instrumentId,
        uint256 poolId
    ) external;
    
    function getInstrument(uint256 instrumentId) 
        external view returns (SecuritizationTypes.Instrument memory);
    
    function getInstrumentsByHolder(address holder) 
        external view returns (uint256[] memory);
    
    function getInstrumentsByPool(uint256 poolId) 
        external view returns (uint256[] memory);
    
    function totalInstruments() external view returns (uint256);
}

/**
 * @title IPoolRegistry
 * @notice Interface for the PoolRegistry contract
 */
interface IPoolRegistry {
    
    // Events
    event PoolCreated(
        uint256 indexed poolId,
        string name,
        bytes32 eligibilityFilterHash,
        uint64 timestamp
    );
    
    event PoolActivated(
        uint256 indexed poolId,
        uint256 instrumentCount,
        uint64 timestamp
    );
    
    event PoolStateChanged(
        uint256 indexed poolId,
        SecuritizationTypes.PoolState oldState,
        SecuritizationTypes.PoolState newState,
        uint64 timestamp
    );
    
    event InstrumentAddedToPool(
        uint256 indexed poolId,
        uint256 indexed instrumentId,
        uint64 timestamp
    );
    
    event InstrumentRemovedFromPool(
        uint256 indexed poolId,
        uint256 indexed instrumentId,
        uint64 timestamp
    );
    
    // Functions
    function createPool(
        string calldata name,
        bytes32 eligibilityFilterHash,
        bytes32 formationRulesHash,
        bytes32 cashflowScheduleHash,
        uint16 minInstruments,
        uint16 maxConcentrationBps,
        uint16 targetWaLtvBps
    ) external returns (uint256 poolId);
    
    function addInstrumentToPool(
        uint256 poolId,
        uint256 instrumentId
    ) external;
    
    function removeInstrumentFromPool(
        uint256 poolId,
        uint256 instrumentId
    ) external;
    
    function activatePool(uint256 poolId) external;
    
    function closePool(uint256 poolId) external;
    
    function getPool(uint256 poolId) 
        external view returns (SecuritizationTypes.Pool memory);
    
    function getPoolInstruments(uint256 poolId) 
        external view returns (uint256[] memory);
    
    function totalPools() external view returns (uint256);
}

/**
 * @title IServicingEventLog
 * @notice Interface for the ServicingEventLog contract
 */
interface IServicingEventLog {
    
    // Events
    event ServicingEventLogged(
        uint256 indexed eventId,
        uint256 indexed instrumentId,
        SecuritizationTypes.ServicingEventType eventType,
        uint256 amount,
        bytes32 proofHash,
        address indexed reporter,
        uint64 timestamp
    );
    
    // Functions
    function logEvent(
        uint256 instrumentId,
        SecuritizationTypes.ServicingEventType eventType,
        uint256 amount,
        bytes32 proofHash
    ) external returns (uint256 eventId);
    
    function getEvent(uint256 eventId) 
        external view returns (SecuritizationTypes.ServicingEvent memory);
    
    function getEventsByInstrument(uint256 instrumentId) 
        external view returns (uint256[] memory);
    
    function getEventsByType(SecuritizationTypes.ServicingEventType eventType) 
        external view returns (uint256[] memory);
    
    function totalEvents() external view returns (uint256);
}
