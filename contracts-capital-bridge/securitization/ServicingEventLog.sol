// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./SecuritizationTypes.sol";
import "./ISecuritization.sol";

/**
 * @title ServicingEventLog
 * @notice Immutable log of all servicing events (Layer 5G)
 * @dev Part of the Axiom Protocol Capital Bridge Infrastructure
 * 
 * Provides audit trail for:
 * - Payments
 * - Prepayments
 * - Defaults
 * - Modifications
 * - Payoffs
 * - Extensions
 * - Transfers
 */
contract ServicingEventLog is IServicingEventLog, AccessControl, Pausable {
    using SecuritizationTypes for *;
    
    // ========================================================================
    // ROLES
    // ========================================================================
    
    bytes32 public constant SERVICER_ROLE = keccak256("SERVICER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    // ========================================================================
    // STATE
    // ========================================================================
    
    uint256 private _nextEventId = 1;
    
    mapping(uint256 => SecuritizationTypes.ServicingEvent) public events;
    mapping(uint256 => uint256[]) private _instrumentEvents;
    mapping(SecuritizationTypes.ServicingEventType => uint256[]) private _eventsByType;
    
    IInstrumentRegistry public instrumentRegistry;
    
    // ========================================================================
    // ERRORS
    // ========================================================================
    
    error EventNotFound(uint256 eventId);
    error InstrumentNotFound(uint256 instrumentId);
    error InvalidParameter(string param);
    error InstrumentRegistryNotSet();
    
    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================
    
    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
        _grantRole(SERVICER_ROLE, _admin);
    }
    
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    
    /**
     * @notice Set the InstrumentRegistry address
     * @param _instrumentRegistry Address of the InstrumentRegistry contract
     */
    function setInstrumentRegistry(address _instrumentRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_instrumentRegistry != address(0), "Invalid address");
        instrumentRegistry = IInstrumentRegistry(_instrumentRegistry);
    }
    
    // ========================================================================
    // EVENT LOGGING
    // ========================================================================
    
    /**
     * @notice Log a servicing event
     * @param instrumentId Associated instrument
     * @param eventType Type of event
     * @param amount Amount involved (if applicable)
     * @param proofHash Hash of supporting documentation
     * @return eventId The new event ID
     */
    function logEvent(
        uint256 instrumentId,
        SecuritizationTypes.ServicingEventType eventType,
        uint256 amount,
        bytes32 proofHash
    ) external override whenNotPaused onlyRole(SERVICER_ROLE) returns (uint256 eventId) {
        // Validate instrument exists if registry is set
        if (address(instrumentRegistry) != address(0)) {
            SecuritizationTypes.Instrument memory instrument = instrumentRegistry.getInstrument(instrumentId);
            if (instrument.instrumentId == 0) {
                revert InstrumentNotFound(instrumentId);
            }
        }
        
        eventId = _nextEventId++;
        
        events[eventId] = SecuritizationTypes.ServicingEvent({
            eventId: eventId,
            instrumentId: instrumentId,
            eventType: eventType,
            amount: amount,
            proofHash: proofHash,
            timestamp: uint64(block.timestamp),
            reporter: msg.sender
        });
        
        _instrumentEvents[instrumentId].push(eventId);
        _eventsByType[eventType].push(eventId);
        
        emit ServicingEventLogged(
            eventId,
            instrumentId,
            eventType,
            amount,
            proofHash,
            msg.sender,
            uint64(block.timestamp)
        );
    }
    
    /**
     * @notice Log a batch of events (gas efficient)
     * @param instrumentIds Array of instrument IDs
     * @param eventTypes Array of event types
     * @param amounts Array of amounts
     * @param proofHashes Array of proof hashes
     * @return eventIds Array of created event IDs
     */
    function logEventBatch(
        uint256[] calldata instrumentIds,
        SecuritizationTypes.ServicingEventType[] calldata eventTypes,
        uint256[] calldata amounts,
        bytes32[] calldata proofHashes
    ) external whenNotPaused onlyRole(SERVICER_ROLE) returns (uint256[] memory eventIds) {
        uint256 length = instrumentIds.length;
        require(
            length == eventTypes.length && 
            length == amounts.length && 
            length == proofHashes.length,
            "Array length mismatch"
        );
        require(length <= 50, "Batch too large");
        
        eventIds = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 eventId = _nextEventId++;
            
            events[eventId] = SecuritizationTypes.ServicingEvent({
                eventId: eventId,
                instrumentId: instrumentIds[i],
                eventType: eventTypes[i],
                amount: amounts[i],
                proofHash: proofHashes[i],
                timestamp: uint64(block.timestamp),
                reporter: msg.sender
            });
            
            _instrumentEvents[instrumentIds[i]].push(eventId);
            _eventsByType[eventTypes[i]].push(eventId);
            eventIds[i] = eventId;
            
            emit ServicingEventLogged(
                eventId,
                instrumentIds[i],
                eventTypes[i],
                amounts[i],
                proofHashes[i],
                msg.sender,
                uint64(block.timestamp)
            );
        }
    }
    
    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================
    
    function getEvent(uint256 eventId) 
        external view override returns (SecuritizationTypes.ServicingEvent memory) 
    {
        return events[eventId];
    }
    
    function getEventsByInstrument(uint256 instrumentId) 
        external view override returns (uint256[] memory) 
    {
        return _instrumentEvents[instrumentId];
    }
    
    function getEventsByType(SecuritizationTypes.ServicingEventType eventType) 
        external view override returns (uint256[] memory) 
    {
        return _eventsByType[eventType];
    }
    
    function totalEvents() external view override returns (uint256) {
        return _nextEventId - 1;
    }
    
    /**
     * @notice Get event count for an instrument
     * @param instrumentId Instrument to query
     * @return count Number of events
     */
    function getInstrumentEventCount(uint256 instrumentId) external view returns (uint256) {
        return _instrumentEvents[instrumentId].length;
    }
    
    /**
     * @notice Get recent events (paginated)
     * @param offset Start index
     * @param limit Max events to return
     * @return eventIds Array of event IDs
     */
    function getRecentEvents(uint256 offset, uint256 limit) 
        external view returns (uint256[] memory eventIds) 
    {
        uint256 total = _nextEventId - 1;
        if (offset >= total) return new uint256[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        eventIds = new uint256[](end - offset);
        for (uint256 i = 0; i < eventIds.length; i++) {
            eventIds[i] = total - offset - i; // Reverse order (newest first)
        }
    }
    
    // ========================================================================
    // ADMIN FUNCTIONS
    // ========================================================================
    
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
