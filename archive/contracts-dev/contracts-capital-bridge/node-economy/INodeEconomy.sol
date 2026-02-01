// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NodeEconomyTypes.sol";

interface INodeRegistry {
    event NodeRegistered(uint256 indexed nodeId, address indexed operator, NodeEconomyTypes.NodeClass nodeClass);
    event NodeActivated(uint256 indexed nodeId, uint256 stakeAmount);
    event NodeDeactivated(uint256 indexed nodeId);
    event NodeSuspended(uint256 indexed nodeId, string reason);
    event NodeDecommissioned(uint256 indexed nodeId);
    event StakeUpdated(uint256 indexed nodeId, uint256 oldAmount, uint256 newAmount);
    event MetadataUpdated(uint256 indexed nodeId, bytes32 metadataHash);
    event StakeRequirementUpdated(NodeEconomyTypes.NodeClass nodeClass, uint256 minStake, uint256 lockPeriod);

    function registerNode(NodeEconomyTypes.NodeClass nodeClass, bytes32 metadataHash) external returns (uint256);
    function activateNode(uint256 nodeId) external payable;
    function deactivateNode(uint256 nodeId) external;
    function updateMetadata(uint256 nodeId, bytes32 metadataHash) external;
    function withdrawStake(uint256 nodeId) external;
    
    function getNode(uint256 nodeId) external view returns (NodeEconomyTypes.NodeInfo memory);
    function getNodesByOperator(address operator) external view returns (uint256[] memory);
    function getActiveNodeCount(NodeEconomyTypes.NodeClass nodeClass) external view returns (uint256);
    function isNodeActive(uint256 nodeId) external view returns (bool);
}

interface INodeRewards {
    event RewardConfigUpdated(NodeEconomyTypes.NodeClass nodeClass, uint256 baseReward, uint256 multiplier);
    event EpochCompleted(uint256 indexed epochId, uint256 totalRewards, uint256 nodesRewarded);
    event RewardClaimed(uint256 indexed nodeId, address indexed operator, uint256 amount);
    event PerformanceUpdated(uint256 indexed nodeId, uint256 uptimeBps, uint256 tasksCompleted, uint256 qualityScore);

    function updatePerformance(uint256 nodeId, uint256 uptimeBps, uint256 tasksCompleted, uint256 qualityScore) external;
    function processEpochRewards() external;
    function claimRewards(uint256 nodeId) external;
    
    function getPendingRewards(uint256 nodeId) external view returns (uint256);
    function getPerformanceMetrics(uint256 nodeId) external view returns (NodeEconomyTypes.PerformanceMetrics memory);
    function getCurrentEpoch() external view returns (uint256);
    function getEpochReward(uint256 epochId) external view returns (NodeEconomyTypes.EpochReward memory);
}

interface ISlashingEngine {
    event SlashingParamsUpdated(NodeEconomyTypes.NodeClass nodeClass, uint256 slashPercent, uint256 cooldown);
    event NodeSlashed(uint256 indexed nodeId, uint256 indexed slashId, NodeEconomyTypes.SlashReason reason, uint256 amount);
    event SlashAppealed(uint256 indexed slashId, bytes32 appealHash);
    event SlashAppealResolved(uint256 indexed slashId, bool upheld);

    function slashNode(uint256 nodeId, NodeEconomyTypes.SlashReason reason, bytes32 evidenceHash) external;
    function appealSlash(uint256 slashId, bytes32 appealHash) external;
    function resolveAppeal(uint256 slashId, bool upheld) external;
    
    function getSlashEvent(uint256 slashId) external view returns (NodeEconomyTypes.SlashEvent memory);
    function getNodeSlashHistory(uint256 nodeId) external view returns (uint256[] memory);
    function getSlashingParams(NodeEconomyTypes.NodeClass nodeClass) external view returns (NodeEconomyTypes.SlashingParams memory);
}
