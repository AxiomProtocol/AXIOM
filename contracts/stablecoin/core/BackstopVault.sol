// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IBackstopVault.sol";

contract BackstopVault is AccessControl, ReentrancyGuard, Pausable, IBackstopVault {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant MARKET_OPS_ROLE = keccak256("MARKET_OPS_ROLE");

    bool public emergencyMode;
    uint256 public marketOpsLimit;
    uint256 public marketOpsUsedToday;
    uint256 public lastMarketOpsReset;

    uint256 public constant EMERGENCY_TIMELOCK = 24 hours;
    mapping(bytes32 => uint256) public pendingEmergencyWithdrawals;

    uint256 public emergencyDailyLimit;
    uint256 public emergencyWithdrawnToday;
    uint256 public lastEmergencyWithdrawReset;

    event EmergencyWithdrawalQueued(bytes32 indexed withdrawalId, address recipient, uint256 amount, uint256 executeAfter);
    event MarketOpsLimitUpdated(uint256 newLimit);

    constructor(uint256 _marketOpsLimit, uint256 _emergencyDailyLimit) {
        marketOpsLimit = _marketOpsLimit;
        emergencyDailyLimit = _emergencyDailyLimit > 0 ? _emergencyDailyLimit : 100 ether;
        lastMarketOpsReset = block.timestamp;
        lastEmergencyWithdrawReset = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    function setEmergencyDailyLimit(uint256 newLimit) external onlyRole(ADMIN_ROLE) {
        emergencyDailyLimit = newLimit;
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function deposit() external payable override {
        require(msg.value > 0, "BackstopVault: zero deposit");
        emit Deposited(msg.sender, msg.value);
    }

    function activateEmergencyMode() external override onlyRole(GUARDIAN_ROLE) {
        require(!emergencyMode, "BackstopVault: already emergency");
        emergencyMode = true;
        emit EmergencyModeActivated(msg.sender);
    }

    function deactivateEmergencyMode() external override onlyRole(ADMIN_ROLE) {
        require(emergencyMode, "BackstopVault: not emergency");
        emergencyMode = false;
        emit EmergencyModeDeactivated(msg.sender);
    }

    function queueEmergencyWithdraw(
        address recipient,
        uint256 amount,
        string calldata reason
    ) external onlyRole(GUARDIAN_ROLE) returns (bytes32) {
        require(emergencyMode, "BackstopVault: not emergency mode");
        require(recipient != address(0), "BackstopVault: zero recipient");
        require(amount > 0 && amount <= address(this).balance, "BackstopVault: invalid amount");

        bytes32 withdrawalId = keccak256(abi.encodePacked(recipient, amount, reason, block.timestamp));
        uint256 executeAfter = block.timestamp + EMERGENCY_TIMELOCK;
        pendingEmergencyWithdrawals[withdrawalId] = executeAfter;

        emit EmergencyWithdrawalQueued(withdrawalId, recipient, amount, executeAfter);
        return withdrawalId;
    }

    function executeEmergencyWithdraw(
        bytes32 withdrawalId,
        address recipient,
        uint256 amount,
        string calldata reason,
        uint256 queuedTimestamp
    ) external nonReentrant onlyRole(ADMIN_ROLE) {
        require(emergencyMode, "BackstopVault: not emergency mode");
        
        bytes32 expectedId = keccak256(abi.encodePacked(recipient, amount, reason, queuedTimestamp));
        require(withdrawalId == expectedId, "BackstopVault: invalid withdrawal params");
        
        uint256 executeAfter = pendingEmergencyWithdrawals[withdrawalId];
        
        require(executeAfter > 0, "BackstopVault: not queued");
        require(block.timestamp >= executeAfter, "BackstopVault: timelock active");
        require(amount <= address(this).balance, "BackstopVault: insufficient balance");

        delete pendingEmergencyWithdrawals[withdrawalId];

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "BackstopVault: transfer failed");

        emit EmergencyWithdrawal(recipient, amount, reason);
    }

    function emergencyWithdraw(
        address,
        uint256,
        string calldata
    ) external override nonReentrant onlyRole(ADMIN_ROLE) {
        revert("BackstopVault: use executeEmergencyWithdraw with timelock");
    }

    function withdrawForMarketOps(uint256 amount) external override nonReentrant onlyRole(MARKET_OPS_ROLE) whenNotPaused {
        require(!emergencyMode, "BackstopVault: emergency mode active");
        require(amount > 0, "BackstopVault: zero amount");
        require(amount <= address(this).balance, "BackstopVault: insufficient balance");

        _resetMarketOpsIfNeeded();
        require(marketOpsUsedToday + amount <= marketOpsLimit, "BackstopVault: daily limit exceeded");

        marketOpsUsedToday += amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "BackstopVault: transfer failed");

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

    function getBalance() external view override returns (uint256) {
        return address(this).balance;
    }

    function isEmergencyMode() external view override returns (bool) {
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
