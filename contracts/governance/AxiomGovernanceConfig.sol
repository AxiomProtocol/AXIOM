// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AxiomGovernanceConfig
 * @notice Central governance configuration registry
 * @dev Tracks which functions are timelocked vs emergency-accessible
 * 
 * Function Classification:
 * - TIMELOCKED: Must go through TimelockController (24h+ delay)
 * - EMERGENCY: Immediate execution by authorized role
 * - UNRESTRICTED: No special governance requirements
 */
contract AxiomGovernanceConfig is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum FunctionType {
        UNRESTRICTED,   // No governance requirements
        TIMELOCKED,     // Must go through timelock
        EMERGENCY       // Immediate by guardian/admin
    }

    struct FunctionConfig {
        FunctionType funcType;
        bytes32 requiredRole;
        bool exists;
    }

    /// @notice Contract address => function selector => configuration
    mapping(address => mapping(bytes4 => FunctionConfig)) public functionConfigs;
    
    /// @notice List of registered contracts
    address[] public registeredContracts;
    mapping(address => bool) public isRegistered;

    /// @notice Timelock controller address
    address public timelockController;

    /// @notice One-way lock flag
    bool public registryLocked;

    event ContractRegistered(address indexed contractAddr, string name);
    event FunctionConfigured(
        address indexed contractAddr,
        bytes4 indexed selector,
        FunctionType funcType,
        bytes32 requiredRole
    );
    event TimelockControllerSet(address indexed controller);
    event RegistryLocked(address indexed locker, uint256 timestamp);

    error RegistryAlreadyLocked();
    error ContractNotRegistered(address contractAddr);
    error TimelockRequired(address contractAddr, bytes4 selector);
    error EmergencyOnlyFunction(address contractAddr, bytes4 selector);

    constructor(address admin, address _timelockController) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
        timelockController = _timelockController;
    }

    /**
     * @notice Register a contract for governance tracking
     * @param contractAddr Contract address
     * @param name Contract name for logging
     */
    function registerContract(address contractAddr, string calldata name) 
        external 
        onlyRole(REGISTRAR_ROLE) 
    {
        require(!registryLocked, "Registry locked");
        require(!isRegistered[contractAddr], "Already registered");
        
        registeredContracts.push(contractAddr);
        isRegistered[contractAddr] = true;
        
        emit ContractRegistered(contractAddr, name);
    }

    /**
     * @notice Configure a function's governance requirements
     * @param contractAddr Target contract
     * @param selector Function selector (bytes4)
     * @param funcType Type of governance (TIMELOCKED, EMERGENCY, UNRESTRICTED)
     * @param requiredRole Role required to execute (if any)
     */
    function configureFunction(
        address contractAddr,
        bytes4 selector,
        FunctionType funcType,
        bytes32 requiredRole
    ) external onlyRole(REGISTRAR_ROLE) {
        require(!registryLocked, "Registry locked");
        require(isRegistered[contractAddr], "Contract not registered");
        
        functionConfigs[contractAddr][selector] = FunctionConfig({
            funcType: funcType,
            requiredRole: requiredRole,
            exists: true
        });
        
        emit FunctionConfigured(contractAddr, selector, funcType, requiredRole);
    }

    /**
     * @notice Batch configure multiple functions
     * @param contractAddr Target contract
     * @param selectors Array of function selectors
     * @param funcTypes Array of function types
     * @param requiredRoles Array of required roles
     */
    function batchConfigureFunctions(
        address contractAddr,
        bytes4[] calldata selectors,
        FunctionType[] calldata funcTypes,
        bytes32[] calldata requiredRoles
    ) external onlyRole(REGISTRAR_ROLE) {
        require(!registryLocked, "Registry locked");
        require(isRegistered[contractAddr], "Contract not registered");
        require(
            selectors.length == funcTypes.length && 
            funcTypes.length == requiredRoles.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < selectors.length; i++) {
            functionConfigs[contractAddr][selectors[i]] = FunctionConfig({
                funcType: funcTypes[i],
                requiredRole: requiredRoles[i],
                exists: true
            });
            
            emit FunctionConfigured(contractAddr, selectors[i], funcTypes[i], requiredRoles[i]);
        }
    }

    /**
     * @notice Lock the registry forever
     * @dev After lock, no new contracts or function configs can be added
     */
    function lockRegistry() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (registryLocked) {
            revert RegistryAlreadyLocked();
        }
        
        registryLocked = true;
        emit RegistryLocked(msg.sender, block.timestamp);
    }

    /**
     * @notice Check if a function call requires timelock
     * @param contractAddr Target contract
     * @param selector Function selector
     * @return True if timelock required
     */
    function requiresTimelock(address contractAddr, bytes4 selector) 
        external 
        view 
        returns (bool) 
    {
        FunctionConfig memory config = functionConfigs[contractAddr][selector];
        return config.exists && config.funcType == FunctionType.TIMELOCKED;
    }

    /**
     * @notice Check if a function is emergency-only
     * @param contractAddr Target contract
     * @param selector Function selector
     * @return True if emergency function
     */
    function isEmergencyFunction(address contractAddr, bytes4 selector) 
        external 
        view 
        returns (bool) 
    {
        FunctionConfig memory config = functionConfigs[contractAddr][selector];
        return config.exists && config.funcType == FunctionType.EMERGENCY;
    }

    /**
     * @notice Get function configuration
     * @param contractAddr Target contract
     * @param selector Function selector
     * @return funcType Function type
     * @return requiredRole Required role
     * @return exists Whether config exists
     */
    function getFunctionConfig(address contractAddr, bytes4 selector)
        external
        view
        returns (FunctionType funcType, bytes32 requiredRole, bool exists)
    {
        FunctionConfig memory config = functionConfigs[contractAddr][selector];
        return (config.funcType, config.requiredRole, config.exists);
    }

    /**
     * @notice Get all registered contracts
     * @return Array of registered contract addresses
     */
    function getRegisteredContracts() external view returns (address[] memory) {
        return registeredContracts;
    }

    /**
     * @notice Update timelock controller address
     * @param newController New timelock controller address
     */
    function setTimelockController(address newController) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(!registryLocked, "Registry locked");
        timelockController = newController;
        emit TimelockControllerSet(newController);
    }
}
