// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BackstopVaultUSDC
 * @notice GENIUS Act compliant emergency reserve vault using USDC
 * @dev Replaces ETH-based BackstopVault with USDC for regulatory compliance
 * 
 * GENIUS Act Requirements Met:
 * - 100% backing with approved stablecoins (USDC)
 * - Emergency withdrawal with 24hr timelock
 * - Daily limits on market operations
 * - Full audit trail via events
 */
contract BackstopVaultUSDC is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant MARKET_OPS_ROLE = keccak256("MARKET_OPS_ROLE");

    IERC20 public immutable usdc;
    
    bool public emergencyMode;
    uint256 public marketOpsLimit;
    uint256 public marketOpsUsedToday;
    uint256 public lastMarketOpsReset;

    uint256 public constant EMERGENCY_TIMELOCK = 24 hours;
    mapping(bytes32 => uint256) public pendingEmergencyWithdrawals;

    uint256 public emergencyDailyLimit;
    uint256 public emergencyWithdrawnToday;
    uint256 public lastEmergencyWithdrawReset;

    event Deposited(address indexed from, uint256 amount);
    event EmergencyModeActivated(address indexed by);
    event EmergencyModeDeactivated(address indexed by);
    event EmergencyWithdrawalQueued(bytes32 indexed withdrawalId, address recipient, uint256 amount, uint256 executeAfter);
    event EmergencyWithdrawal(address indexed recipient, uint256 amount, string reason);
    event MarketOpWithdrawal(address indexed to, uint256 amount);
    event MarketOpsLimitUpdated(uint256 newLimit);

    error FlashLoanDetected();
    error BlockLimitExceeded();

    constructor(
        address _usdc,
        uint256 _marketOpsLimit, 
        uint256 _emergencyDailyLimit
    ) {
        require(_usdc != address(0), "BackstopVaultUSDC: zero usdc");
        
        usdc = IERC20(_usdc);
        marketOpsLimit = _marketOpsLimit;
        emergencyDailyLimit = _emergencyDailyLimit > 0 ? _emergencyDailyLimit : 100_000 * 1e6; // 100k USDC
        lastMarketOpsReset = block.timestamp;
        lastEmergencyWithdrawReset = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    /**
     * @notice Deposit USDC into the backstop vault
     * @param amount Amount of USDC to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "BackstopVaultUSDC: zero deposit");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Activate emergency mode (Guardian only)
     */
    function activateEmergencyMode() external onlyRole(GUARDIAN_ROLE) {
        require(!emergencyMode, "BackstopVaultUSDC: already emergency");
        emergencyMode = true;
        emit EmergencyModeActivated(msg.sender);
    }

    /**
     * @notice Deactivate emergency mode (Admin only)
     */
    function deactivateEmergencyMode() external onlyRole(ADMIN_ROLE) {
        require(emergencyMode, "BackstopVaultUSDC: not emergency");
        emergencyMode = false;
        emit EmergencyModeDeactivated(msg.sender);
    }

    /**
     * @notice Queue an emergency withdrawal with 24hr timelock
     * @param recipient Address to receive funds
     * @param amount Amount of USDC
     * @param reason Documented reason for withdrawal
     */
    function queueEmergencyWithdraw(
        address recipient,
        uint256 amount,
        string calldata reason
    ) external onlyRole(GUARDIAN_ROLE) returns (bytes32) {
        require(emergencyMode, "BackstopVaultUSDC: not emergency mode");
        require(recipient != address(0), "BackstopVaultUSDC: zero recipient");
        require(amount > 0 && amount <= usdc.balanceOf(address(this)), "BackstopVaultUSDC: invalid amount");

        bytes32 withdrawalId = keccak256(abi.encodePacked(recipient, amount, reason, block.timestamp));
        uint256 executeAfter = block.timestamp + EMERGENCY_TIMELOCK;
        pendingEmergencyWithdrawals[withdrawalId] = executeAfter;

        emit EmergencyWithdrawalQueued(withdrawalId, recipient, amount, executeAfter);
        return withdrawalId;
    }

    /**
     * @notice Execute a queued emergency withdrawal after timelock
     */
    function executeEmergencyWithdraw(
        bytes32 withdrawalId,
        address recipient,
        uint256 amount,
        string calldata reason,
        uint256 queuedTimestamp
    ) external nonReentrant onlyRole(ADMIN_ROLE) {
        require(emergencyMode, "BackstopVaultUSDC: not emergency mode");
        
        bytes32 expectedId = keccak256(abi.encodePacked(recipient, amount, reason, queuedTimestamp));
        require(withdrawalId == expectedId, "BackstopVaultUSDC: invalid withdrawal params");
        
        uint256 executeAfter = pendingEmergencyWithdrawals[withdrawalId];
        
        require(executeAfter > 0, "BackstopVaultUSDC: not queued");
        require(block.timestamp >= executeAfter, "BackstopVaultUSDC: timelock active");
        require(amount <= usdc.balanceOf(address(this)), "BackstopVaultUSDC: insufficient balance");

        delete pendingEmergencyWithdrawals[withdrawalId];

        usdc.safeTransfer(recipient, amount);

        emit EmergencyWithdrawal(recipient, amount, reason);
    }

    /**
     * @notice Withdraw USDC for market operations (daily limit enforced)
     * @param amount Amount to withdraw
     */
    function withdrawForMarketOps(uint256 amount) external nonReentrant onlyRole(MARKET_OPS_ROLE) whenNotPaused {
        require(!emergencyMode, "BackstopVaultUSDC: emergency mode active");
        require(amount > 0, "BackstopVaultUSDC: zero amount");
        require(amount <= usdc.balanceOf(address(this)), "BackstopVaultUSDC: insufficient balance");

        _resetMarketOpsIfNeeded();
        require(marketOpsUsedToday + amount <= marketOpsLimit, "BackstopVaultUSDC: daily limit exceeded");

        marketOpsUsedToday += amount;

        usdc.safeTransfer(msg.sender, amount);

        emit MarketOpWithdrawal(msg.sender, amount);
    }

    function _resetMarketOpsIfNeeded() internal {
        if (block.timestamp >= lastMarketOpsReset + 1 days) {
            marketOpsUsedToday = 0;
            lastMarketOpsReset = block.timestamp;
        }
    }

    function setMarketOpsLimit(uint256 newLimit) external onlyRole(ADMIN_ROLE) {
        marketOpsLimit = newLimit;
        emit MarketOpsLimitUpdated(newLimit);
    }

    function setEmergencyDailyLimit(uint256 newLimit) external onlyRole(ADMIN_ROLE) {
        emergencyDailyLimit = newLimit;
    }

    /**
     * @notice Get current USDC balance
     */
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function isEmergencyMode() external view returns (bool) {
        return emergencyMode;
    }

    function getRemainingMarketOpsLimit() external view returns (uint256) {
        if (block.timestamp >= lastMarketOpsReset + 1 days) {
            return marketOpsLimit;
        }
        return marketOpsLimit > marketOpsUsedToday ? marketOpsLimit - marketOpsUsedToday : 0;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
