// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./NodeEconomyTypes.sol";
import "./INodeEconomy.sol";

contract NodeRegistry is INodeRegistry, AccessControl, ReentrancyGuard, Pausable {
    using NodeEconomyTypes for *;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant NODE_MANAGER_ROLE = keccak256("NODE_MANAGER_ROLE");
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");

    uint256 private _nextNodeId = 1;
    
    mapping(uint256 => NodeEconomyTypes.NodeInfo) private _nodes;
    mapping(address => uint256[]) private _operatorNodes;
    mapping(NodeEconomyTypes.NodeClass => NodeEconomyTypes.StakeRequirement) private _stakeRequirements;
    mapping(NodeEconomyTypes.NodeClass => uint256) private _activeNodeCounts;
    
    address public rewardsContract;
    address public slashingContract;

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, admin);
        
        _stakeRequirements[NodeEconomyTypes.NodeClass.Storage] = NodeEconomyTypes.StakeRequirement({
            minStake: 0.1 ether,
            lockPeriod: 30 days,
            active: true
        });
        _stakeRequirements[NodeEconomyTypes.NodeClass.Execution] = NodeEconomyTypes.StakeRequirement({
            minStake: 0.5 ether,
            lockPeriod: 60 days,
            active: true
        });
        _stakeRequirements[NodeEconomyTypes.NodeClass.Indexing] = NodeEconomyTypes.StakeRequirement({
            minStake: 0.25 ether,
            lockPeriod: 30 days,
            active: true
        });
        _stakeRequirements[NodeEconomyTypes.NodeClass.Research] = NodeEconomyTypes.StakeRequirement({
            minStake: 1 ether,
            lockPeriod: 90 days,
            active: true
        });
    }

    function setContracts(address _rewards, address _slashing) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardsContract = _rewards;
        slashingContract = _slashing;
    }

    function setStakeRequirement(
        NodeEconomyTypes.NodeClass nodeClass,
        uint256 minStake,
        uint256 lockPeriod
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _stakeRequirements[nodeClass] = NodeEconomyTypes.StakeRequirement({
            minStake: minStake,
            lockPeriod: lockPeriod,
            active: true
        });
        emit StakeRequirementUpdated(nodeClass, minStake, lockPeriod);
    }

    function registerNode(
        NodeEconomyTypes.NodeClass nodeClass,
        bytes32 metadataHash
    ) external whenNotPaused returns (uint256) {
        require(metadataHash != bytes32(0), "Invalid metadata");
        require(_stakeRequirements[nodeClass].active, "Node class not active");
        
        uint256 nodeId = _nextNodeId++;
        
        _nodes[nodeId] = NodeEconomyTypes.NodeInfo({
            nodeId: nodeId,
            operator: msg.sender,
            nodeClass: nodeClass,
            status: NodeEconomyTypes.NodeStatus.Inactive,
            stakeAmount: 0,
            activatedAt: 0,
            lastActiveAt: 0,
            metadataHash: metadataHash,
            totalRewardsEarned: 0,
            slashCount: 0
        });
        
        _operatorNodes[msg.sender].push(nodeId);
        
        emit NodeRegistered(nodeId, msg.sender, nodeClass);
        return nodeId;
    }

    function activateNode(uint256 nodeId) external payable nonReentrant whenNotPaused {
        NodeEconomyTypes.NodeInfo storage node = _nodes[nodeId];
        require(node.nodeId != 0, "Node not found");
        require(node.operator == msg.sender, "Not operator");
        require(node.status == NodeEconomyTypes.NodeStatus.Inactive, "Node not inactive");
        
        NodeEconomyTypes.StakeRequirement memory req = _stakeRequirements[node.nodeClass];
        uint256 totalStake = node.stakeAmount + msg.value;
        require(totalStake >= req.minStake, "Insufficient stake");
        
        node.stakeAmount = totalStake;
        node.status = NodeEconomyTypes.NodeStatus.Active;
        node.activatedAt = block.timestamp;
        node.lastActiveAt = block.timestamp;
        
        _activeNodeCounts[node.nodeClass]++;
        
        emit NodeActivated(nodeId, totalStake);
    }

    function deactivateNode(uint256 nodeId) external nonReentrant {
        NodeEconomyTypes.NodeInfo storage node = _nodes[nodeId];
        require(node.nodeId != 0, "Node not found");
        require(node.operator == msg.sender, "Not operator");
        require(node.status == NodeEconomyTypes.NodeStatus.Active, "Node not active");
        
        node.status = NodeEconomyTypes.NodeStatus.Inactive;
        _activeNodeCounts[node.nodeClass]--;
        
        emit NodeDeactivated(nodeId);
    }

    function suspendNode(uint256 nodeId, string calldata reason) external onlyRole(SLASHER_ROLE) {
        NodeEconomyTypes.NodeInfo storage node = _nodes[nodeId];
        require(node.nodeId != 0, "Node not found");
        require(node.status == NodeEconomyTypes.NodeStatus.Active, "Node not active");
        
        node.status = NodeEconomyTypes.NodeStatus.Suspended;
        _activeNodeCounts[node.nodeClass]--;
        
        emit NodeSuspended(nodeId, reason);
    }

    function reactivateNode(uint256 nodeId) external onlyRole(NODE_MANAGER_ROLE) {
        NodeEconomyTypes.NodeInfo storage node = _nodes[nodeId];
        require(node.nodeId != 0, "Node not found");
        require(node.status == NodeEconomyTypes.NodeStatus.Suspended, "Node not suspended");
        
        NodeEconomyTypes.StakeRequirement memory req = _stakeRequirements[node.nodeClass];
        require(node.stakeAmount >= req.minStake, "Insufficient stake after slash");
        
        node.status = NodeEconomyTypes.NodeStatus.Active;
        node.lastActiveAt = block.timestamp;
        _activeNodeCounts[node.nodeClass]++;
        
        emit NodeActivated(nodeId, node.stakeAmount);
    }

    function decommissionNode(uint256 nodeId) external {
        NodeEconomyTypes.NodeInfo storage node = _nodes[nodeId];
        require(node.nodeId != 0, "Node not found");
        require(node.operator == msg.sender || hasRole(GUARDIAN_ROLE, msg.sender), "Not authorized");
        require(node.status != NodeEconomyTypes.NodeStatus.Active, "Deactivate first");
        
        node.status = NodeEconomyTypes.NodeStatus.Decommissioned;
        
        emit NodeDecommissioned(nodeId);
    }

    function updateMetadata(uint256 nodeId, bytes32 metadataHash) external {
        NodeEconomyTypes.NodeInfo storage node = _nodes[nodeId];
        require(node.nodeId != 0, "Node not found");
        require(node.operator == msg.sender, "Not operator");
        require(metadataHash != bytes32(0), "Invalid metadata");
        
        node.metadataHash = metadataHash;
        
        emit MetadataUpdated(nodeId, metadataHash);
    }

    function withdrawStake(uint256 nodeId) external nonReentrant {
        NodeEconomyTypes.NodeInfo storage node = _nodes[nodeId];
        require(node.nodeId != 0, "Node not found");
        require(node.operator == msg.sender, "Not operator");
        require(node.status == NodeEconomyTypes.NodeStatus.Inactive || 
                node.status == NodeEconomyTypes.NodeStatus.Decommissioned, "Must be inactive");
        
        NodeEconomyTypes.StakeRequirement memory req = _stakeRequirements[node.nodeClass];
        require(block.timestamp >= node.activatedAt + req.lockPeriod, "Lock period active");
        
        uint256 amount = node.stakeAmount;
        require(amount > 0, "No stake");
        
        node.stakeAmount = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit StakeUpdated(nodeId, amount, 0);
    }

    function reduceStake(uint256 nodeId, uint256 amount) external onlyRole(SLASHER_ROLE) {
        NodeEconomyTypes.NodeInfo storage node = _nodes[nodeId];
        require(node.nodeId != 0, "Node not found");
        require(node.stakeAmount >= amount, "Insufficient stake");
        
        uint256 oldAmount = node.stakeAmount;
        node.stakeAmount -= amount;
        node.slashCount++;
        
        emit StakeUpdated(nodeId, oldAmount, node.stakeAmount);
    }

    function recordReward(uint256 nodeId, uint256 amount) external {
        require(msg.sender == rewardsContract, "Not rewards contract");
        NodeEconomyTypes.NodeInfo storage node = _nodes[nodeId];
        require(node.nodeId != 0, "Node not found");
        
        node.totalRewardsEarned += amount;
        node.lastActiveAt = block.timestamp;
    }

    function getNode(uint256 nodeId) external view returns (NodeEconomyTypes.NodeInfo memory) {
        require(_nodes[nodeId].nodeId != 0, "Node not found");
        return _nodes[nodeId];
    }

    function getNodesByOperator(address operator) external view returns (uint256[] memory) {
        return _operatorNodes[operator];
    }

    function getActiveNodeCount(NodeEconomyTypes.NodeClass nodeClass) external view returns (uint256) {
        return _activeNodeCounts[nodeClass];
    }

    function isNodeActive(uint256 nodeId) external view returns (bool) {
        return _nodes[nodeId].status == NodeEconomyTypes.NodeStatus.Active;
    }

    function getStakeRequirement(NodeEconomyTypes.NodeClass nodeClass) external view returns (NodeEconomyTypes.StakeRequirement memory) {
        return _stakeRequirements[nodeClass];
    }

    function getTotalNodeCount() external view returns (uint256) {
        return _nextNodeId - 1;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
    }

    receive() external payable {}
}
