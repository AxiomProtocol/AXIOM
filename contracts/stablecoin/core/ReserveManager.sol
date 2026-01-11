// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IBackstopVault.sol";
import "../interfaces/ITBillVault.sol";

contract ReserveManager is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");

    IBackstopVault public backstopVault;
    ITBillVault public tbillVault;
    address public vaultEngine;

    uint256 public targetTBillRatio;
    uint256 public targetBackstopRatio;
    uint256 public rebalanceThreshold;

    uint256 public constant BASIS_POINTS = 10000;

    struct ReserveStatus {
        uint256 totalReserves;
        uint256 tbillValue;
        uint256 backstopValue;
        uint256 vaultCollateral;
        uint256 currentTBillRatio;
        uint256 currentBackstopRatio;
        bool needsRebalance;
    }

    event RebalanceExecuted(uint256 tbillDelta, uint256 backstopDelta);
    event TargetRatiosUpdated(uint256 tbillRatio, uint256 backstopRatio);
    event RebalanceThresholdUpdated(uint256 newThreshold);
    event BackstopVaultUpdated(address indexed oldVault, address indexed newVault);
    event TBillVaultUpdated(address indexed oldVault, address indexed newVault);

    constructor(
        address _backstopVault,
        address _tbillVault,
        address _vaultEngine,
        uint256 _targetTBillRatio,
        uint256 _targetBackstopRatio
    ) {
        require(_targetTBillRatio + _targetBackstopRatio <= BASIS_POINTS, "ReserveManager: ratios exceed 100%");

        backstopVault = IBackstopVault(_backstopVault);
        tbillVault = ITBillVault(_tbillVault);
        vaultEngine = _vaultEngine;

        targetTBillRatio = _targetTBillRatio;
        targetBackstopRatio = _targetBackstopRatio;
        rebalanceThreshold = 500;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    function getReserveStatus() external view returns (ReserveStatus memory) {
        uint256 tbillValue = tbillVault.getTotalValue();
        uint256 backstopValue = backstopVault.getBalance();
        
        uint256 totalReserves = tbillValue + backstopValue;

        uint256 currentTBillRatio = 0;
        uint256 currentBackstopRatio = 0;

        if (totalReserves > 0) {
            currentTBillRatio = (tbillValue * BASIS_POINTS) / totalReserves;
            currentBackstopRatio = (backstopValue * BASIS_POINTS) / totalReserves;
        }

        bool needsRebalance = false;
        if (currentTBillRatio > targetTBillRatio + rebalanceThreshold ||
            currentTBillRatio < targetTBillRatio - rebalanceThreshold ||
            currentBackstopRatio > targetBackstopRatio + rebalanceThreshold ||
            currentBackstopRatio < targetBackstopRatio - rebalanceThreshold) {
            needsRebalance = true;
        }

        return ReserveStatus({
            totalReserves: totalReserves,
            tbillValue: tbillValue,
            backstopValue: backstopValue,
            vaultCollateral: 0,
            currentTBillRatio: currentTBillRatio,
            currentBackstopRatio: currentBackstopRatio,
            needsRebalance: needsRebalance
        });
    }

    function getHealthFactor() external view returns (uint256) {
        uint256 tbillValue = tbillVault.getTotalValue();
        uint256 backstopValue = backstopVault.getBalance();
        uint256 totalReserves = tbillValue + backstopValue;

        if (totalReserves == 0) return 0;

        uint256 tbillHealth = (tbillValue * BASIS_POINTS) / totalReserves;
        uint256 backstopHealth = (backstopValue * BASIS_POINTS) / totalReserves;

        uint256 tbillDeviation = tbillHealth > targetTBillRatio 
            ? tbillHealth - targetTBillRatio 
            : targetTBillRatio - tbillHealth;
        
        uint256 backstopDeviation = backstopHealth > targetBackstopRatio 
            ? backstopHealth - targetBackstopRatio 
            : targetBackstopRatio - backstopHealth;

        uint256 totalDeviation = tbillDeviation + backstopDeviation;
        
        if (totalDeviation >= BASIS_POINTS) return 0;
        return BASIS_POINTS - totalDeviation;
    }

    function setTargetRatios(uint256 _tbillRatio, uint256 _backstopRatio) external onlyRole(ADMIN_ROLE) {
        require(_tbillRatio + _backstopRatio <= BASIS_POINTS, "ReserveManager: ratios exceed 100%");
        targetTBillRatio = _tbillRatio;
        targetBackstopRatio = _backstopRatio;
        emit TargetRatiosUpdated(_tbillRatio, _backstopRatio);
    }

    function setRebalanceThreshold(uint256 _threshold) external onlyRole(ADMIN_ROLE) {
        require(_threshold <= 2000, "ReserveManager: threshold too high");
        rebalanceThreshold = _threshold;
        emit RebalanceThresholdUpdated(_threshold);
    }

    function setBackstopVault(address _vault) external onlyRole(ADMIN_ROLE) {
        require(_vault != address(0), "ReserveManager: zero address");
        address oldVault = address(backstopVault);
        backstopVault = IBackstopVault(_vault);
        emit BackstopVaultUpdated(oldVault, _vault);
    }

    function setTBillVault(address _vault) external onlyRole(ADMIN_ROLE) {
        require(_vault != address(0), "ReserveManager: zero address");
        address oldVault = address(tbillVault);
        tbillVault = ITBillVault(_vault);
        emit TBillVaultUpdated(oldVault, _vault);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
