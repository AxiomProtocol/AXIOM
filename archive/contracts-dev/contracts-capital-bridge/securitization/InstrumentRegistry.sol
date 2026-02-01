// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SecuritizationTypes.sol";
import "./ISecuritization.sol";

/**
 * @title InstrumentRegistry
 * @notice Registry for standardized financial instruments (Layer 5G)
 * @dev Part of the Axiom Protocol Capital Bridge Infrastructure
 * 
 * Manages the lifecycle of standardized instruments including:
 * - Whole Loans
 * - Participations
 * - Notes
 * - Revenue Shares
 * - Rent Streams
 */
contract InstrumentRegistry is IInstrumentRegistry, AccessControl, Pausable, ReentrancyGuard {
    using SecuritizationTypes for *;
    
    // ========================================================================
    // ROLES
    // ========================================================================
    
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant SERVICER_ROLE = keccak256("SERVICER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    // ========================================================================
    // STATE
    // ========================================================================
    
    uint256 private _nextInstrumentId = 1;
    
    mapping(uint256 => SecuritizationTypes.Instrument) public instruments;
    mapping(address => uint256[]) private _holderInstruments;
    mapping(uint256 => uint256[]) private _poolInstruments;
    
    address public poolRegistry;
    
    // ========================================================================
    // ERRORS
    // ========================================================================
    
    error InstrumentNotFound(uint256 instrumentId);
    error InvalidState(SecuritizationTypes.InstrumentState current, SecuritizationTypes.InstrumentState required);
    error InvalidParameter(string param);
    error NotInstrumentHolder(uint256 instrumentId, address caller);
    error AlreadyAssignedToPool(uint256 instrumentId, uint256 currentPool);
    error PoolRegistryNotSet();
    error OnlyPoolRegistry();
    error PoolMismatch(uint256 instrumentId, uint256 expectedPool, uint256 actualPool);
    
    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================
    
    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
        _grantRole(ISSUER_ROLE, _admin);
        _grantRole(SERVICER_ROLE, _admin);
    }
    
    // ========================================================================
    // MODIFIERS
    // ========================================================================
    
    modifier instrumentExists(uint256 instrumentId) {
        if (instruments[instrumentId].instrumentId == 0) {
            revert InstrumentNotFound(instrumentId);
        }
        _;
    }
    
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    
    /**
     * @notice Set the PoolRegistry address
     * @param _poolRegistry Address of the PoolRegistry contract
     */
    function setPoolRegistry(address _poolRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_poolRegistry != address(0), "Invalid address");
        poolRegistry = _poolRegistry;
    }
    
    // ========================================================================
    // INSTRUMENT LIFECYCLE
    // ========================================================================
    
    /**
     * @notice Create a new instrument
     * @param instrumentType Type of instrument
     * @param underlyingAssetHash Hash of underlying asset data
     * @param principalAmount Principal value in AXUSD
     * @param interestRateBps Annual interest rate in basis points
     * @param maturityDate Unix timestamp of maturity
     * @param holder Initial holder address
     * @return instrumentId The new instrument ID
     */
    function createInstrument(
        SecuritizationTypes.InstrumentType instrumentType,
        bytes32 underlyingAssetHash,
        uint256 principalAmount,
        uint16 interestRateBps,
        uint64 maturityDate,
        address holder
    ) external override whenNotPaused onlyRole(ISSUER_ROLE) nonReentrant returns (uint256 instrumentId) {
        if (underlyingAssetHash == bytes32(0)) revert InvalidParameter("underlyingAssetHash");
        if (principalAmount == 0) revert InvalidParameter("principalAmount");
        if (holder == address(0)) revert InvalidParameter("holder");
        if (maturityDate <= block.timestamp) revert InvalidParameter("maturityDate");
        if (interestRateBps > 5000) revert InvalidParameter("interestRateBps"); // Max 50%
        
        instrumentId = _nextInstrumentId++;
        
        instruments[instrumentId] = SecuritizationTypes.Instrument({
            instrumentId: instrumentId,
            instrumentType: instrumentType,
            underlyingAssetHash: underlyingAssetHash,
            principalAmount: principalAmount,
            interestRateBps: interestRateBps,
            maturityDate: maturityDate,
            issuedAt: uint64(block.timestamp),
            holder: holder,
            state: SecuritizationTypes.InstrumentState.Active,
            poolId: 0
        });
        
        _holderInstruments[holder].push(instrumentId);
        
        emit InstrumentCreated(
            instrumentId,
            instrumentType,
            underlyingAssetHash,
            principalAmount,
            holder,
            uint64(block.timestamp)
        );
    }
    
    /**
     * @notice Update instrument state
     * @param instrumentId Instrument to update
     * @param newState New state
     */
    function updateInstrumentState(
        uint256 instrumentId,
        SecuritizationTypes.InstrumentState newState
    ) external override whenNotPaused onlyRole(SERVICER_ROLE) instrumentExists(instrumentId) {
        SecuritizationTypes.Instrument storage instrument = instruments[instrumentId];
        SecuritizationTypes.InstrumentState oldState = instrument.state;
        
        // Validate state transitions
        if (oldState == SecuritizationTypes.InstrumentState.Retired) {
            revert InvalidState(oldState, newState);
        }
        
        instrument.state = newState;
        
        emit InstrumentStateChanged(instrumentId, oldState, newState, uint64(block.timestamp));
    }
    
    /**
     * @notice Transfer instrument to new holder
     * @param instrumentId Instrument to transfer
     * @param newHolder New holder address
     */
    function transferInstrument(
        uint256 instrumentId,
        address newHolder
    ) external override whenNotPaused instrumentExists(instrumentId) nonReentrant {
        if (newHolder == address(0)) revert InvalidParameter("newHolder");
        
        SecuritizationTypes.Instrument storage instrument = instruments[instrumentId];
        
        // Only holder or admin can transfer
        if (msg.sender != instrument.holder && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotInstrumentHolder(instrumentId, msg.sender);
        }
        
        // Cannot transfer retired instruments
        if (instrument.state == SecuritizationTypes.InstrumentState.Retired) {
            revert InvalidState(instrument.state, SecuritizationTypes.InstrumentState.Active);
        }
        
        address oldHolder = instrument.holder;
        instrument.holder = newHolder;
        
        // Update holder mappings
        _removeFromHolderList(oldHolder, instrumentId);
        _holderInstruments[newHolder].push(instrumentId);
        
        emit InstrumentTransferred(instrumentId, oldHolder, newHolder, uint64(block.timestamp));
    }
    
    /**
     * @notice Assign instrument to a pool (called by PoolRegistry)
     * @param instrumentId Instrument to assign
     * @param poolId Pool to assign to
     */
    function assignToPool(
        uint256 instrumentId,
        uint256 poolId
    ) external override instrumentExists(instrumentId) {
        if (poolRegistry == address(0)) revert PoolRegistryNotSet();
        if (msg.sender != poolRegistry) revert OnlyPoolRegistry();
        
        SecuritizationTypes.Instrument storage instrument = instruments[instrumentId];
        
        if (instrument.poolId != 0) {
            revert AlreadyAssignedToPool(instrumentId, instrument.poolId);
        }
        
        if (instrument.state != SecuritizationTypes.InstrumentState.Active) {
            revert InvalidState(instrument.state, SecuritizationTypes.InstrumentState.Active);
        }
        
        instrument.poolId = poolId;
        _poolInstruments[poolId].push(instrumentId);
        
        emit InstrumentAssignedToPool(instrumentId, poolId, uint64(block.timestamp));
    }
    
    /**
     * @notice Remove instrument from pool (called by PoolRegistry)
     * @param instrumentId Instrument to remove
     * @param expectedPoolId Pool ID that must match the instrument's current pool
     */
    function removeFromPool(uint256 instrumentId, uint256 expectedPoolId) external instrumentExists(instrumentId) {
        if (poolRegistry == address(0)) revert PoolRegistryNotSet();
        if (msg.sender != poolRegistry) revert OnlyPoolRegistry();
        
        SecuritizationTypes.Instrument storage instrument = instruments[instrumentId];
        
        // Critical: Verify instrument belongs to the expected pool
        if (instrument.poolId != expectedPoolId) {
            revert PoolMismatch(instrumentId, expectedPoolId, instrument.poolId);
        }
        
        uint256 oldPoolId = instrument.poolId;
        instrument.poolId = 0;
        
        _removeFromPoolList(oldPoolId, instrumentId);
    }
    
    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================
    
    function getInstrument(uint256 instrumentId) 
        external view override returns (SecuritizationTypes.Instrument memory) 
    {
        return instruments[instrumentId];
    }
    
    function getInstrumentsByHolder(address holder) 
        external view override returns (uint256[] memory) 
    {
        return _holderInstruments[holder];
    }
    
    function getInstrumentsByPool(uint256 poolId) 
        external view override returns (uint256[] memory) 
    {
        return _poolInstruments[poolId];
    }
    
    function totalInstruments() external view override returns (uint256) {
        return _nextInstrumentId - 1;
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
    
    // ========================================================================
    // INTERNAL FUNCTIONS
    // ========================================================================
    
    function _removeFromHolderList(address holder, uint256 instrumentId) internal {
        uint256[] storage list = _holderInstruments[holder];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == instrumentId) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
    }
    
    function _removeFromPoolList(uint256 poolId, uint256 instrumentId) internal {
        uint256[] storage list = _poolInstruments[poolId];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == instrumentId) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
    }
}
