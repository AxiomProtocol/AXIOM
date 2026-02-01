// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SecuritizationTypes.sol";
import "./ISecuritization.sol";
import "./InstrumentRegistry.sol";

/**
 * @title PoolRegistry
 * @notice Registry for instrument pools (Layer 5G)
 * @dev Part of the Axiom Protocol Capital Bridge Infrastructure
 * 
 * Manages pool formation with:
 * - Eligibility filters
 * - Formation rules
 * - Cashflow schedules
 * - Instrument aggregation
 */
contract PoolRegistry is IPoolRegistry, AccessControl, Pausable, ReentrancyGuard {
    using SecuritizationTypes for *;
    
    // ========================================================================
    // ROLES
    // ========================================================================
    
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    // ========================================================================
    // STATE
    // ========================================================================
    
    uint256 private _nextPoolId = 1;
    
    mapping(uint256 => SecuritizationTypes.Pool) public pools;
    mapping(uint256 => uint256[]) private _poolInstrumentIds;
    
    IInstrumentRegistry public instrumentRegistry;
    
    // ========================================================================
    // ERRORS
    // ========================================================================
    
    error PoolNotFound(uint256 poolId);
    error InvalidState(SecuritizationTypes.PoolState current, SecuritizationTypes.PoolState required);
    error InvalidParameter(string param);
    error InstrumentRegistryNotSet();
    error InstrumentNotEligible(uint256 instrumentId, string reason);
    error MinInstrumentsNotMet(uint256 current, uint256 required);
    error ConcentrationExceeded(uint256 instrumentId, uint256 concentrationBps);
    
    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================
    
    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
        _grantRole(POOL_MANAGER_ROLE, _admin);
    }
    
    // ========================================================================
    // MODIFIERS
    // ========================================================================
    
    modifier poolExists(uint256 poolId) {
        if (pools[poolId].poolId == 0) {
            revert PoolNotFound(poolId);
        }
        _;
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
    // POOL LIFECYCLE
    // ========================================================================
    
    /**
     * @notice Create a new pool
     * @param name Human-readable pool name
     * @param eligibilityFilterHash Hash of eligibility criteria document
     * @param formationRulesHash Hash of formation rules document
     * @param cashflowScheduleHash Hash of cashflow schedule document
     * @param minInstruments Minimum instruments required for activation
     * @param maxConcentrationBps Max single instrument concentration
     * @param targetWaLtvBps Target weighted average LTV
     * @return poolId The new pool ID
     */
    function createPool(
        string calldata name,
        bytes32 eligibilityFilterHash,
        bytes32 formationRulesHash,
        bytes32 cashflowScheduleHash,
        uint16 minInstruments,
        uint16 maxConcentrationBps,
        uint16 targetWaLtvBps
    ) external override whenNotPaused onlyRole(POOL_MANAGER_ROLE) nonReentrant returns (uint256 poolId) {
        if (bytes(name).length == 0) revert InvalidParameter("name");
        if (eligibilityFilterHash == bytes32(0)) revert InvalidParameter("eligibilityFilterHash");
        if (minInstruments == 0) revert InvalidParameter("minInstruments");
        if (maxConcentrationBps == 0 || maxConcentrationBps > 10000) revert InvalidParameter("maxConcentrationBps");
        if (targetWaLtvBps > 10000) revert InvalidParameter("targetWaLtvBps");
        
        poolId = _nextPoolId++;
        
        pools[poolId] = SecuritizationTypes.Pool({
            poolId: poolId,
            name: name,
            eligibilityFilterHash: eligibilityFilterHash,
            formationRulesHash: formationRulesHash,
            cashflowScheduleHash: cashflowScheduleHash,
            minInstruments: minInstruments,
            maxConcentrationBps: maxConcentrationBps,
            targetWaLtvBps: targetWaLtvBps,
            createdAt: uint64(block.timestamp),
            activatedAt: 0,
            state: SecuritizationTypes.PoolState.Forming
        });
        
        emit PoolCreated(poolId, name, eligibilityFilterHash, uint64(block.timestamp));
    }
    
    /**
     * @notice Add an instrument to a pool
     * @param poolId Pool to add to
     * @param instrumentId Instrument to add
     */
    function addInstrumentToPool(
        uint256 poolId,
        uint256 instrumentId
    ) external override whenNotPaused onlyRole(POOL_MANAGER_ROLE) poolExists(poolId) nonReentrant {
        if (address(instrumentRegistry) == address(0)) revert InstrumentRegistryNotSet();
        
        SecuritizationTypes.Pool storage pool = pools[poolId];
        
        // Can only add to forming pools
        if (pool.state != SecuritizationTypes.PoolState.Forming) {
            revert InvalidState(pool.state, SecuritizationTypes.PoolState.Forming);
        }
        
        // Verify instrument exists and is active
        SecuritizationTypes.Instrument memory instrument = instrumentRegistry.getInstrument(instrumentId);
        if (instrument.instrumentId == 0) {
            revert InstrumentNotEligible(instrumentId, "not found");
        }
        if (instrument.state != SecuritizationTypes.InstrumentState.Active) {
            revert InstrumentNotEligible(instrumentId, "not active");
        }
        if (instrument.poolId != 0) {
            revert InstrumentNotEligible(instrumentId, "already in pool");
        }
        
        // Check concentration limits
        uint256 totalPrincipal = _calculatePoolPrincipal(poolId) + instrument.principalAmount;
        uint256 concentrationBps = (instrument.principalAmount * 10000) / totalPrincipal;
        if (concentrationBps > pool.maxConcentrationBps) {
            revert ConcentrationExceeded(instrumentId, concentrationBps);
        }
        
        // Assign instrument to pool
        instrumentRegistry.assignToPool(instrumentId, poolId);
        _poolInstrumentIds[poolId].push(instrumentId);
        
        emit InstrumentAddedToPool(poolId, instrumentId, uint64(block.timestamp));
    }
    
    /**
     * @notice Remove an instrument from a pool
     * @param poolId Pool to remove from
     * @param instrumentId Instrument to remove
     */
    function removeInstrumentFromPool(
        uint256 poolId,
        uint256 instrumentId
    ) external override whenNotPaused onlyRole(POOL_MANAGER_ROLE) poolExists(poolId) nonReentrant {
        if (address(instrumentRegistry) == address(0)) revert InstrumentRegistryNotSet();
        
        SecuritizationTypes.Pool storage pool = pools[poolId];
        
        // Can only remove from forming pools
        if (pool.state != SecuritizationTypes.PoolState.Forming) {
            revert InvalidState(pool.state, SecuritizationTypes.PoolState.Forming);
        }
        
        // Critical: Verify instrument actually belongs to this pool before removal
        SecuritizationTypes.Instrument memory instrument = instrumentRegistry.getInstrument(instrumentId);
        if (instrument.poolId != poolId) {
            revert InstrumentNotEligible(instrumentId, "not in this pool");
        }
        
        // Remove from pool list
        _removeFromPoolList(poolId, instrumentId);
        
        // Update instrument registry with pool verification
        InstrumentRegistry(address(instrumentRegistry)).removeFromPool(instrumentId, poolId);
        
        emit InstrumentRemovedFromPool(poolId, instrumentId, uint64(block.timestamp));
    }
    
    /**
     * @notice Activate a pool after formation requirements are met
     * @param poolId Pool to activate
     */
    function activatePool(uint256 poolId) 
        external override whenNotPaused onlyRole(POOL_MANAGER_ROLE) poolExists(poolId) 
    {
        SecuritizationTypes.Pool storage pool = pools[poolId];
        
        if (pool.state != SecuritizationTypes.PoolState.Forming) {
            revert InvalidState(pool.state, SecuritizationTypes.PoolState.Forming);
        }
        
        uint256 instrumentCount = _poolInstrumentIds[poolId].length;
        if (instrumentCount < pool.minInstruments) {
            revert MinInstrumentsNotMet(instrumentCount, pool.minInstruments);
        }
        
        SecuritizationTypes.PoolState oldState = pool.state;
        pool.state = SecuritizationTypes.PoolState.Active;
        pool.activatedAt = uint64(block.timestamp);
        
        emit PoolStateChanged(poolId, oldState, SecuritizationTypes.PoolState.Active, uint64(block.timestamp));
        emit PoolActivated(poolId, instrumentCount, uint64(block.timestamp));
    }
    
    /**
     * @notice Close a pool to new instruments
     * @param poolId Pool to close
     */
    function closePool(uint256 poolId) 
        external override whenNotPaused onlyRole(POOL_MANAGER_ROLE) poolExists(poolId) 
    {
        SecuritizationTypes.Pool storage pool = pools[poolId];
        
        if (pool.state == SecuritizationTypes.PoolState.Liquidated) {
            revert InvalidState(pool.state, SecuritizationTypes.PoolState.Active);
        }
        
        SecuritizationTypes.PoolState oldState = pool.state;
        pool.state = SecuritizationTypes.PoolState.Closed;
        
        emit PoolStateChanged(poolId, oldState, SecuritizationTypes.PoolState.Closed, uint64(block.timestamp));
    }
    
    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================
    
    function getPool(uint256 poolId) 
        external view override returns (SecuritizationTypes.Pool memory) 
    {
        return pools[poolId];
    }
    
    function getPoolInstruments(uint256 poolId) 
        external view override returns (uint256[] memory) 
    {
        return _poolInstrumentIds[poolId];
    }
    
    function totalPools() external view override returns (uint256) {
        return _nextPoolId - 1;
    }
    
    function getPoolPrincipal(uint256 poolId) external view returns (uint256) {
        return _calculatePoolPrincipal(poolId);
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
    
    function _calculatePoolPrincipal(uint256 poolId) internal view returns (uint256 total) {
        if (address(instrumentRegistry) == address(0)) return 0;
        
        uint256[] storage instrumentIds = _poolInstrumentIds[poolId];
        for (uint256 i = 0; i < instrumentIds.length; i++) {
            SecuritizationTypes.Instrument memory instrument = instrumentRegistry.getInstrument(instrumentIds[i]);
            total += instrument.principalAmount;
        }
    }
    
    function _removeFromPoolList(uint256 poolId, uint256 instrumentId) internal {
        uint256[] storage list = _poolInstrumentIds[poolId];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == instrumentId) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
    }
}
