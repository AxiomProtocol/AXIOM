// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CrossChainAndLaunchModule
 * @notice Cross-chain bridge and multi-chain deployment manager for Axiom Smart City
 * @dev Manages AXM token bridges and deployment coordination across multiple chains
 * 
 * Features:
 * - Cross-chain token bridges (Base, Polygon, Solana via LayerZero/Axelar)
 * - Multi-chain deployment tracking
 * - Bridge fee management and revenue distribution
 * - Lock/mint and burn/unlock mechanisms
 * - Chain-specific configuration management
 * - Emergency pause and recovery mechanisms
 * - Deployment status tracking
 */
contract CrossChainAndLaunchModule is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BRIDGE_OPERATOR_ROLE = keccak256("BRIDGE_OPERATOR_ROLE");
    bytes32 public constant DEPLOYMENT_MANAGER_ROLE = keccak256("DEPLOYMENT_MANAGER_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    address public axmToken;
    address public treasurySafe;
    
    // Bridge configuration
    uint256 public bridgeFee = 0.001 ether;        // 0.1% bridge fee
    uint256 public minBridgeAmount = 10 * 10**18;  // 10 AXM minimum
    uint256 public maxBridgeAmount = 1000000 * 10**18;  // 1M AXM maximum
    uint256 public bridgeTimeout = 7 days;         // Auto-cancel after 7 days
    
    // Global counters
    uint256 public totalBridgeTransfers;
    uint256 public totalDeployments;
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum ChainType { Arbitrum, Base, Polygon, Solana, Cosmos }
    enum BridgeStatus { Pending, Completed, Failed, Cancelled }
    enum DeploymentStatus { Planned, InProgress, Deployed, Verified, Failed }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct ChainConfig {
        uint256 chainId;
        ChainType chainType;
        string name;
        address bridgeAddress;
        address tokenAddress;           // AXM address on target chain
        bool isActive;
        uint256 totalBridged;
        uint256 totalDeployments;
    }
    
    struct BridgeTransfer {
        uint256 transferId;
        address sender;
        address recipient;
        uint256 amount;
        ChainType sourceChain;
        ChainType targetChain;
        uint256 fee;
        uint256 timestamp;
        BridgeStatus status;
        bytes32 txHash;                 // Target chain transaction hash
    }
    
    struct Deployment {
        uint256 deploymentId;
        ChainType chain;
        string contractName;
        address contractAddress;
        address deployer;
        uint256 deploymentDate;
        DeploymentStatus status;
        string metadataURI;             // IPFS hash with deployment details
    }
    
    struct BridgeStats {
        uint256 totalTransfers;
        uint256 totalVolume;
        uint256 totalFees;
        uint256 pendingTransfers;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(ChainType => ChainConfig) public chainConfigs;
    mapping(uint256 => BridgeTransfer) public bridgeTransfers;
    mapping(address => uint256[]) public userTransfers;
    mapping(uint256 => Deployment) public deployments;
    mapping(ChainType => uint256[]) public chainDeployments;
    mapping(ChainType => BridgeStats) public chainStats;
    
    // Transfer-based escrow tracking (prevents accounting errors)
    mapping(uint256 => uint256) public transferEscrow;  // transferId => escrowed amount
    uint256 public totalEscrowed;
    
    // Bridge reserve tracking (backs remote-minted tokens)
    uint256 public bridgeReserve;  // Tokens locked to back minted supply on other chains
    
    // ============================================
    // EVENTS
    // ============================================
    
    event ChainConfigured(
        ChainType indexed chainType,
        string name,
        address bridgeAddress
    );
    
    event BridgeTransferInitiated(
        uint256 indexed transferId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        ChainType sourceChain,
        ChainType targetChain
    );
    
    event BridgeTransferCompleted(
        uint256 indexed transferId,
        bytes32 txHash
    );
    
    event DeploymentRegistered(
        uint256 indexed deploymentId,
        ChainType indexed chain,
        string contractName,
        address contractAddress
    );
    
    event DeploymentStatusUpdated(
        uint256 indexed deploymentId,
        DeploymentStatus oldStatus,
        DeploymentStatus newStatus
    );
    
    event BridgeFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _axmToken,
        address _treasurySafe
    ) {
        require(_axmToken != address(0), "Invalid AXM token");
        require(_treasurySafe != address(0), "Invalid treasury safe");
        
        axmToken = _axmToken;
        treasurySafe = _treasurySafe;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Initialize Arbitrum as home chain
        _initializeChain(ChainType.Arbitrum, 42161, "Arbitrum One", address(this), _axmToken);
    }
    
    function _initializeChain(
        ChainType chainType,
        uint256 chainId,
        string memory name,
        address bridgeAddress,
        address tokenAddress
    ) private {
        ChainConfig storage config = chainConfigs[chainType];
        config.chainId = chainId;
        config.chainType = chainType;
        config.name = name;
        config.bridgeAddress = bridgeAddress;
        config.tokenAddress = tokenAddress;
        config.isActive = true;
    }
    
    // ============================================
    // CHAIN CONFIGURATION
    // ============================================
    
    /**
     * @notice Configure a new chain for bridging
     */
    function configureChain(
        ChainType chainType,
        uint256 chainId,
        string calldata name,
        address bridgeAddress,
        address tokenAddress
    ) external onlyRole(ADMIN_ROLE) {
        require(bridgeAddress != address(0), "Invalid bridge address");
        require(tokenAddress != address(0), "Invalid token address");
        
        ChainConfig storage config = chainConfigs[chainType];
        config.chainId = chainId;
        config.chainType = chainType;
        config.name = name;
        config.bridgeAddress = bridgeAddress;
        config.tokenAddress = tokenAddress;
        config.isActive = true;
        
        emit ChainConfigured(chainType, name, bridgeAddress);
    }
    
    /**
     * @notice Toggle chain active status
     */
    function setChainActive(
        ChainType chainType,
        bool isActive
    ) external onlyRole(ADMIN_ROLE) {
        chainConfigs[chainType].isActive = isActive;
    }
    
    // ============================================
    // BRIDGE OPERATIONS
    // ============================================
    
    /**
     * @notice Initiate bridge transfer from Arbitrum to another chain
     * @dev Locks tokens on source chain, mints on target chain (via bridge operator)
     */
    function initiateBridgeTransfer(
        address recipient,
        uint256 amount,
        ChainType targetChain
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(amount >= minBridgeAmount, "Amount below minimum");
        require(amount <= maxBridgeAmount, "Amount above maximum");
        require(chainConfigs[targetChain].isActive, "Target chain not active");
        require(recipient != address(0), "Invalid recipient");
        
        // Calculate fee
        uint256 fee = (amount * bridgeFee) / 1 ether;
        uint256 netAmount = amount - fee;
        
        // Transfer tokens to this contract (includes fee)
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Transfer fee to treasury immediately
        if (fee > 0) {
            IERC20(axmToken).safeTransfer(treasurySafe, fee);
        }
        
        // Create transfer record
        totalBridgeTransfers++;
        uint256 transferId = totalBridgeTransfers;
        
        BridgeTransfer storage transfer = bridgeTransfers[transferId];
        transfer.transferId = transferId;
        transfer.sender = msg.sender;
        transfer.recipient = recipient;
        transfer.amount = netAmount;
        transfer.sourceChain = ChainType.Arbitrum;
        transfer.targetChain = targetChain;
        transfer.fee = fee;
        transfer.timestamp = block.timestamp;
        transfer.status = BridgeStatus.Pending;
        
        userTransfers[msg.sender].push(transferId);
        
        // Escrow net amount for this transfer
        transferEscrow[transferId] = netAmount;
        totalEscrowed += netAmount;
        
        // Update stats
        chainStats[ChainType.Arbitrum].totalTransfers++;
        chainStats[ChainType.Arbitrum].totalVolume += amount;
        chainStats[ChainType.Arbitrum].totalFees += fee;
        chainStats[ChainType.Arbitrum].pendingTransfers++;
        
        chainConfigs[ChainType.Arbitrum].totalBridged += netAmount;
        
        emit BridgeTransferInitiated(
            transferId,
            msg.sender,
            recipient,
            netAmount,
            ChainType.Arbitrum,
            targetChain
        );
        
        return transferId;
    }
    
    /**
     * @notice Complete bridge transfer (called by bridge operator)
     * @dev Moves escrowed funds to bridge reserve to back remote-minted tokens
     */
    function completeBridgeTransfer(
        uint256 transferId,
        bytes32 txHash
    ) external onlyRole(BRIDGE_OPERATOR_ROLE) {
        BridgeTransfer storage transfer = bridgeTransfers[transferId];
        require(transfer.status == BridgeStatus.Pending, "Transfer not pending");
        
        transfer.status = BridgeStatus.Completed;
        transfer.txHash = txHash;
        
        // Move from escrow to bridge reserve (backs minted tokens on target chain)
        uint256 escrowedAmount = transferEscrow[transferId];
        transferEscrow[transferId] = 0;
        totalEscrowed -= escrowedAmount;
        bridgeReserve += escrowedAmount;
        
        // Update stats
        chainStats[transfer.sourceChain].pendingTransfers--;
        
        emit BridgeTransferCompleted(transferId, txHash);
    }
    
    /**
     * @notice Cancel bridge transfer and refund
     * @dev User can cancel after timeout, admin can cancel anytime
     */
    function cancelBridgeTransfer(uint256 transferId) external nonReentrant {
        BridgeTransfer storage transfer = bridgeTransfers[transferId];
        require(transfer.status == BridgeStatus.Pending, "Transfer not pending");
        
        // Authorization: sender after timeout OR admin anytime
        bool isSender = msg.sender == transfer.sender;
        bool isAdmin = hasRole(ADMIN_ROLE, msg.sender);
        bool isTimedOut = block.timestamp > transfer.timestamp + bridgeTimeout;
        
        require((isSender && isTimedOut) || isAdmin, "Not authorized or not timed out");
        
        transfer.status = BridgeStatus.Cancelled;
        
        // Release escrow and refund to sender
        uint256 escrowedAmount = transferEscrow[transferId];
        transferEscrow[transferId] = 0;
        totalEscrowed -= escrowedAmount;
        
        IERC20(axmToken).safeTransfer(transfer.sender, escrowedAmount);
        
        // Update stats
        chainStats[transfer.sourceChain].pendingTransfers--;
    }
    
    // ============================================
    // DEPLOYMENT TRACKING
    // ============================================
    
    /**
     * @notice Register a deployment on a chain
     */
    function registerDeployment(
        ChainType chain,
        string calldata contractName,
        address contractAddress,
        string calldata metadataURI
    ) external onlyRole(DEPLOYMENT_MANAGER_ROLE) returns (uint256) {
        require(chainConfigs[chain].isActive, "Chain not active");
        require(contractAddress != address(0), "Invalid contract address");
        
        totalDeployments++;
        uint256 deploymentId = totalDeployments;
        
        Deployment storage deployment = deployments[deploymentId];
        deployment.deploymentId = deploymentId;
        deployment.chain = chain;
        deployment.contractName = contractName;
        deployment.contractAddress = contractAddress;
        deployment.deployer = msg.sender;
        deployment.deploymentDate = block.timestamp;
        deployment.status = DeploymentStatus.Deployed;
        deployment.metadataURI = metadataURI;
        
        chainDeployments[chain].push(deploymentId);
        chainConfigs[chain].totalDeployments++;
        
        emit DeploymentRegistered(deploymentId, chain, contractName, contractAddress);
        
        return deploymentId;
    }
    
    /**
     * @notice Update deployment status
     */
    function updateDeploymentStatus(
        uint256 deploymentId,
        DeploymentStatus newStatus
    ) external onlyRole(DEPLOYMENT_MANAGER_ROLE) {
        Deployment storage deployment = deployments[deploymentId];
        DeploymentStatus oldStatus = deployment.status;
        deployment.status = newStatus;
        
        emit DeploymentStatusUpdated(deploymentId, oldStatus, newStatus);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update bridge fee
     */
    function updateBridgeFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        require(newFee <= 0.01 ether, "Fee too high"); // Max 1%
        
        uint256 oldFee = bridgeFee;
        bridgeFee = newFee;
        
        emit BridgeFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @notice Update bridge amount limits
     */
    function updateBridgeLimits(
        uint256 newMinAmount,
        uint256 newMaxAmount
    ) external onlyRole(ADMIN_ROLE) {
        require(newMinAmount < newMaxAmount, "Invalid limits");
        
        minBridgeAmount = newMinAmount;
        maxBridgeAmount = newMaxAmount;
    }
    
    /**
     * @notice Update bridge timeout
     */
    function updateBridgeTimeout(uint256 newTimeout) external onlyRole(ADMIN_ROLE) {
        require(newTimeout >= 1 days && newTimeout <= 30 days, "Timeout out of range");
        bridgeTimeout = newTimeout;
    }
    
    /**
     * @notice Emergency withdraw excess tokens (admin only)
     * @dev Can only withdraw non-escrowed and non-reserved funds to protect user assets and bridge integrity
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        if (token == axmToken) {
            // Protect user escrowed funds AND bridge reserve (backs minted supply)
            uint256 contractBalance = IERC20(axmToken).balanceOf(address(this));
            uint256 protectedFunds = totalEscrowed + bridgeReserve;
            uint256 availableForWithdraw = contractBalance > protectedFunds 
                ? contractBalance - protectedFunds 
                : 0;
            require(amount <= availableForWithdraw, "Cannot withdraw protected funds");
        }
        
        IERC20(token).safeTransfer(treasurySafe, amount);
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getChainConfig(ChainType chainType) external view returns (ChainConfig memory) {
        return chainConfigs[chainType];
    }
    
    function getBridgeTransfer(uint256 transferId) external view returns (BridgeTransfer memory) {
        return bridgeTransfers[transferId];
    }
    
    function getUserTransfers(address user) external view returns (uint256[] memory) {
        return userTransfers[user];
    }
    
    function getDeployment(uint256 deploymentId) external view returns (Deployment memory) {
        return deployments[deploymentId];
    }
    
    function getChainDeployments(ChainType chain) external view returns (uint256[] memory) {
        return chainDeployments[chain];
    }
    
    function getChainStats(ChainType chain) external view returns (BridgeStats memory) {
        return chainStats[chain];
    }
    
    function getTotalEscrowed() external view returns (uint256) {
        return totalEscrowed;
    }
    
    function getTransferEscrow(uint256 transferId) external view returns (uint256) {
        return transferEscrow[transferId];
    }
    
    function getBridgeReserve() external view returns (uint256) {
        return bridgeReserve;
    }
    
    /**
     * @notice Get available funds for emergency withdraw (excludes protected funds)
     */
    function getAvailableForWithdraw() external view returns (uint256) {
        uint256 contractBalance = IERC20(axmToken).balanceOf(address(this));
        uint256 protectedFunds = totalEscrowed + bridgeReserve;
        return contractBalance > protectedFunds ? contractBalance - protectedFunds : 0;
    }
}

