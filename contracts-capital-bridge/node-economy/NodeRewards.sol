// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./NodeEconomyTypes.sol";
import "./INodeEconomy.sol";

interface INodeRegistryForRewards {
    function getNode(uint256 nodeId) external view returns (NodeEconomyTypes.NodeInfo memory);
    function isNodeActive(uint256 nodeId) external view returns (bool);
    function recordReward(uint256 nodeId, uint256 amount) external;
    function getActiveNodeCount(NodeEconomyTypes.NodeClass nodeClass) external view returns (uint256);
}

contract NodeRewards is INodeRewards, AccessControl, ReentrancyGuard, Pausable {
    using NodeEconomyTypes for *;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant REWARDS_MANAGER_ROLE = keccak256("REWARDS_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    INodeRegistryForRewards public nodeRegistry;
    
    uint256 public currentEpoch;
    uint256 public epochStartTime;
    uint256 public constant DEFAULT_EPOCH_DURATION = 7 days;
    
    mapping(NodeEconomyTypes.NodeClass => NodeEconomyTypes.RewardConfig) private _rewardConfigs;
    mapping(uint256 => NodeEconomyTypes.PerformanceMetrics) private _nodePerformance;
    mapping(uint256 => uint256) private _pendingRewards;
    mapping(uint256 => NodeEconomyTypes.EpochReward) private _epochRewards;
    mapping(uint256 => mapping(uint256 => bool)) private _epochNodeRewarded;

    constructor(address admin, address _nodeRegistry) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, admin);
        
        nodeRegistry = INodeRegistryForRewards(_nodeRegistry);
        currentEpoch = 1;
        epochStartTime = block.timestamp;
        
        _rewardConfigs[NodeEconomyTypes.NodeClass.Storage] = NodeEconomyTypes.RewardConfig({
            baseRewardPerEpoch: 0.01 ether,
            performanceMultiplierBps: 5000,
            epochDuration: DEFAULT_EPOCH_DURATION,
            active: true
        });
        _rewardConfigs[NodeEconomyTypes.NodeClass.Execution] = NodeEconomyTypes.RewardConfig({
            baseRewardPerEpoch: 0.05 ether,
            performanceMultiplierBps: 7500,
            epochDuration: DEFAULT_EPOCH_DURATION,
            active: true
        });
        _rewardConfigs[NodeEconomyTypes.NodeClass.Indexing] = NodeEconomyTypes.RewardConfig({
            baseRewardPerEpoch: 0.02 ether,
            performanceMultiplierBps: 5000,
            epochDuration: DEFAULT_EPOCH_DURATION,
            active: true
        });
        _rewardConfigs[NodeEconomyTypes.NodeClass.Research] = NodeEconomyTypes.RewardConfig({
            baseRewardPerEpoch: 0.1 ether,
            performanceMultiplierBps: 10000,
            epochDuration: DEFAULT_EPOCH_DURATION,
            active: true
        });
    }

    function setRewardConfig(
        NodeEconomyTypes.NodeClass nodeClass,
        uint256 baseReward,
        uint256 multiplierBps,
        uint256 epochDuration
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(epochDuration >= 1 days, "Epoch too short");
        require(multiplierBps <= 20000, "Multiplier too high");
        
        _rewardConfigs[nodeClass] = NodeEconomyTypes.RewardConfig({
            baseRewardPerEpoch: baseReward,
            performanceMultiplierBps: multiplierBps,
            epochDuration: epochDuration,
            active: true
        });
        
        emit RewardConfigUpdated(nodeClass, baseReward, multiplierBps);
    }

    function updatePerformance(
        uint256 nodeId,
        uint256 uptimeBps,
        uint256 tasksCompleted,
        uint256 qualityScore
    ) external onlyRole(ORACLE_ROLE) {
        require(uptimeBps <= 10000, "Invalid uptime");
        require(qualityScore <= 10000, "Invalid quality score");
        require(nodeRegistry.isNodeActive(nodeId), "Node not active");
        
        _nodePerformance[nodeId] = NodeEconomyTypes.PerformanceMetrics({
            uptimeBps: uptimeBps,
            tasksCompleted: tasksCompleted,
            qualityScore: qualityScore,
            lastUpdated: block.timestamp
        });
        
        emit PerformanceUpdated(nodeId, uptimeBps, tasksCompleted, qualityScore);
    }

    function calculateNodeReward(uint256 nodeId) public view returns (uint256) {
        NodeEconomyTypes.NodeInfo memory node = nodeRegistry.getNode(nodeId);
        if (node.status != NodeEconomyTypes.NodeStatus.Active) {
            return 0;
        }
        
        NodeEconomyTypes.RewardConfig memory config = _rewardConfigs[node.nodeClass];
        if (!config.active) {
            return 0;
        }
        
        NodeEconomyTypes.PerformanceMetrics memory perf = _nodePerformance[nodeId];
        
        uint256 baseReward = config.baseRewardPerEpoch;
        
        uint256 performanceScore = 5000;
        if (perf.lastUpdated > 0) {
            performanceScore = (perf.uptimeBps + perf.qualityScore) / 2;
        }
        
        uint256 multiplier = 10000 + (performanceScore * config.performanceMultiplierBps / 10000);
        
        return baseReward * multiplier / 10000;
    }

    function processEpochRewards() external onlyRole(REWARDS_MANAGER_ROLE) whenNotPaused {
        NodeEconomyTypes.RewardConfig memory config = _rewardConfigs[NodeEconomyTypes.NodeClass.Storage];
        require(block.timestamp >= epochStartTime + config.epochDuration, "Epoch not complete");
        
        currentEpoch++;
        epochStartTime = block.timestamp;
        
        emit EpochCompleted(currentEpoch - 1, 0, 0);
    }

    function distributeReward(uint256 nodeId) external onlyRole(REWARDS_MANAGER_ROLE) whenNotPaused nonReentrant {
        require(!_epochNodeRewarded[currentEpoch][nodeId], "Already rewarded this epoch");
        require(nodeRegistry.isNodeActive(nodeId), "Node not active");
        
        uint256 reward = calculateNodeReward(nodeId);
        require(reward > 0, "No reward");
        require(address(this).balance >= reward, "Insufficient funds");
        
        _pendingRewards[nodeId] += reward;
        _epochNodeRewarded[currentEpoch][nodeId] = true;
        
        nodeRegistry.recordReward(nodeId, reward);
        
        _epochRewards[currentEpoch].totalRewards += reward;
        _epochRewards[currentEpoch].nodesRewarded++;
        _epochRewards[currentEpoch].epochId = currentEpoch;
        _epochRewards[currentEpoch].timestamp = block.timestamp;
    }

    function claimRewards(uint256 nodeId) external nonReentrant whenNotPaused {
        NodeEconomyTypes.NodeInfo memory node = nodeRegistry.getNode(nodeId);
        require(node.operator == msg.sender, "Not operator");
        
        uint256 amount = _pendingRewards[nodeId];
        require(amount > 0, "No pending rewards");
        
        _pendingRewards[nodeId] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit RewardClaimed(nodeId, msg.sender, amount);
    }

    function getPendingRewards(uint256 nodeId) external view returns (uint256) {
        return _pendingRewards[nodeId];
    }

    function getPerformanceMetrics(uint256 nodeId) external view returns (NodeEconomyTypes.PerformanceMetrics memory) {
        return _nodePerformance[nodeId];
    }

    function getCurrentEpoch() external view returns (uint256) {
        return currentEpoch;
    }

    function getEpochReward(uint256 epochId) external view returns (NodeEconomyTypes.EpochReward memory) {
        return _epochRewards[epochId];
    }

    function getRewardConfig(NodeEconomyTypes.NodeClass nodeClass) external view returns (NodeEconomyTypes.RewardConfig memory) {
        return _rewardConfigs[nodeClass];
    }

    function getTimeUntilNextEpoch() external view returns (uint256) {
        NodeEconomyTypes.RewardConfig memory config = _rewardConfigs[NodeEconomyTypes.NodeClass.Storage];
        uint256 epochEnd = epochStartTime + config.epochDuration;
        if (block.timestamp >= epochEnd) {
            return 0;
        }
        return epochEnd - block.timestamp;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
    }

    function fundRewards() external payable {}

    receive() external payable {}
}
