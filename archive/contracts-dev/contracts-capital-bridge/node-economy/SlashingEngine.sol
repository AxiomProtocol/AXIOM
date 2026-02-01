// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./NodeEconomyTypes.sol";
import "./INodeEconomy.sol";

interface INodeRegistryForSlashing {
    function getNode(uint256 nodeId) external view returns (NodeEconomyTypes.NodeInfo memory);
    function reduceStakeAndTransfer(uint256 nodeId, uint256 amount) external;
    function suspendNode(uint256 nodeId, string calldata reason) external;
}

contract SlashingEngine is ISlashingEngine, AccessControl, ReentrancyGuard, Pausable {
    using NodeEconomyTypes for *;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    INodeRegistryForSlashing public nodeRegistry;
    
    uint256 private _nextSlashId = 1;
    uint256 public constant MAX_SLASH_HISTORY_CHECK = 100;
    
    mapping(NodeEconomyTypes.NodeClass => NodeEconomyTypes.SlashingParams) private _slashingParams;
    mapping(uint256 => NodeEconomyTypes.SlashEvent) private _slashEvents;
    mapping(uint256 => uint256[]) private _nodeSlashHistory;
    mapping(uint256 => uint256) private _lastSlashTime;
    mapping(uint256 => bytes32) private _slashAppeals;
    mapping(uint256 => bool) private _appealResolved;
    mapping(uint256 => uint256) private _slashEscrow;
    
    address public treasury;
    uint256 public totalSlashed;
    uint256 public totalEscrowed;

    event FundsReceived(uint256 indexed nodeId, uint256 amount);
    event AppealRefunded(uint256 indexed slashId, address indexed operator, uint256 amount);

    constructor(address admin, address _nodeRegistry) {
        require(_nodeRegistry != address(0), "Invalid registry");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, admin);
        
        nodeRegistry = INodeRegistryForSlashing(_nodeRegistry);
        treasury = admin;
        
        _slashingParams[NodeEconomyTypes.NodeClass.Storage] = NodeEconomyTypes.SlashingParams({
            slashPercentBps: 1000,
            cooldownPeriod: 1 days,
            maxSlashesBeforeSuspension: 3,
            active: true
        });
        _slashingParams[NodeEconomyTypes.NodeClass.Execution] = NodeEconomyTypes.SlashingParams({
            slashPercentBps: 1500,
            cooldownPeriod: 12 hours,
            maxSlashesBeforeSuspension: 2,
            active: true
        });
        _slashingParams[NodeEconomyTypes.NodeClass.Indexing] = NodeEconomyTypes.SlashingParams({
            slashPercentBps: 1000,
            cooldownPeriod: 1 days,
            maxSlashesBeforeSuspension: 3,
            active: true
        });
        _slashingParams[NodeEconomyTypes.NodeClass.Research] = NodeEconomyTypes.SlashingParams({
            slashPercentBps: 2000,
            cooldownPeriod: 7 days,
            maxSlashesBeforeSuspension: 2,
            active: true
        });
    }

    function setSlashingParams(
        NodeEconomyTypes.NodeClass nodeClass,
        uint256 slashPercentBps,
        uint256 cooldownPeriod,
        uint256 maxSlashes
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(slashPercentBps <= 5000, "Slash too high");
        require(cooldownPeriod >= 1 hours, "Cooldown too short");
        require(maxSlashes >= 1, "Max slashes too low");
        
        _slashingParams[nodeClass] = NodeEconomyTypes.SlashingParams({
            slashPercentBps: slashPercentBps,
            cooldownPeriod: cooldownPeriod,
            maxSlashesBeforeSuspension: maxSlashes,
            active: true
        });
        
        emit SlashingParamsUpdated(nodeClass, slashPercentBps, cooldownPeriod);
    }

    function setTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    function slashNode(
        uint256 nodeId,
        NodeEconomyTypes.SlashReason reason,
        bytes32 evidenceHash
    ) external onlyRole(SLASHER_ROLE) whenNotPaused nonReentrant {
        require(evidenceHash != bytes32(0), "Evidence required");
        
        NodeEconomyTypes.NodeInfo memory node = nodeRegistry.getNode(nodeId);
        require(node.status == NodeEconomyTypes.NodeStatus.Active || 
                node.status == NodeEconomyTypes.NodeStatus.Suspended, "Node not slashable");
        
        NodeEconomyTypes.SlashingParams memory params = _slashingParams[node.nodeClass];
        require(params.active, "Slashing disabled for class");
        require(block.timestamp >= _lastSlashTime[nodeId] + params.cooldownPeriod, "Cooldown active");
        
        uint256 slashAmount = node.stakeAmount * params.slashPercentBps / 10000;
        require(slashAmount > 0, "No stake to slash");
        
        uint256 slashId = _nextSlashId++;
        
        _slashEvents[slashId] = NodeEconomyTypes.SlashEvent({
            slashId: slashId,
            nodeId: nodeId,
            reason: reason,
            amount: slashAmount,
            slasher: msg.sender,
            timestamp: block.timestamp,
            evidenceHash: evidenceHash
        });
        
        _nodeSlashHistory[nodeId].push(slashId);
        _lastSlashTime[nodeId] = block.timestamp;
        
        nodeRegistry.reduceStakeAndTransfer(nodeId, slashAmount);
        
        _slashEscrow[slashId] = slashAmount;
        totalEscrowed += slashAmount;
        totalSlashed += slashAmount;
        
        uint256 recentSlashes = _countRecentSlashes(nodeId, params.cooldownPeriod * params.maxSlashesBeforeSuspension);
        if (recentSlashes >= params.maxSlashesBeforeSuspension) {
            nodeRegistry.suspendNode(nodeId, "Excessive slashes");
        }
        
        emit NodeSlashed(nodeId, slashId, reason, slashAmount);
    }

    function _countRecentSlashes(uint256 nodeId, uint256 window) internal view returns (uint256) {
        uint256[] memory history = _nodeSlashHistory[nodeId];
        uint256 count = 0;
        uint256 cutoff = block.timestamp - window;
        
        uint256 startIdx = history.length > MAX_SLASH_HISTORY_CHECK ? history.length - MAX_SLASH_HISTORY_CHECK : 0;
        
        for (uint256 i = history.length; i > startIdx; i--) {
            NodeEconomyTypes.SlashEvent memory evt = _slashEvents[history[i - 1]];
            if (evt.timestamp < cutoff) break;
            count++;
        }
        
        return count;
    }

    function appealSlash(uint256 slashId, bytes32 appealHash) external {
        NodeEconomyTypes.SlashEvent memory evt = _slashEvents[slashId];
        require(evt.slashId != 0, "Slash not found");
        require(_slashAppeals[slashId] == bytes32(0), "Already appealed");
        require(!_appealResolved[slashId], "Appeal resolved");
        
        NodeEconomyTypes.NodeInfo memory node = nodeRegistry.getNode(evt.nodeId);
        require(node.operator == msg.sender, "Not operator");
        require(block.timestamp <= evt.timestamp + 7 days, "Appeal window closed");
        
        _slashAppeals[slashId] = appealHash;
        
        emit SlashAppealed(slashId, appealHash);
    }

    function resolveAppeal(uint256 slashId, bool upheld) external onlyRole(ARBITER_ROLE) nonReentrant {
        require(_slashAppeals[slashId] != bytes32(0), "No appeal");
        require(!_appealResolved[slashId], "Already resolved");
        
        _appealResolved[slashId] = true;
        
        uint256 escrowedAmount = _slashEscrow[slashId];
        
        if (!upheld && escrowedAmount > 0) {
            NodeEconomyTypes.SlashEvent memory evt = _slashEvents[slashId];
            NodeEconomyTypes.NodeInfo memory node = nodeRegistry.getNode(evt.nodeId);
            
            require(address(this).balance >= escrowedAmount, "Insufficient escrow balance");
            
            _slashEscrow[slashId] = 0;
            totalEscrowed -= escrowedAmount;
            totalSlashed -= escrowedAmount;
            
            (bool success, ) = node.operator.call{value: escrowedAmount}("");
            require(success, "Refund failed");
            
            emit AppealRefunded(slashId, node.operator, escrowedAmount);
        } else if (upheld && escrowedAmount > 0) {
            _slashEscrow[slashId] = 0;
            totalEscrowed -= escrowedAmount;
        }
        
        emit SlashAppealResolved(slashId, upheld);
    }

    function finalizeExpiredEscrows(uint256[] calldata slashIds) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < slashIds.length; i++) {
            uint256 slashId = slashIds[i];
            NodeEconomyTypes.SlashEvent memory evt = _slashEvents[slashId];
            
            if (evt.slashId == 0) continue;
            if (_slashEscrow[slashId] == 0) continue;
            if (block.timestamp <= evt.timestamp + 14 days) continue;
            
            uint256 amount = _slashEscrow[slashId];
            _slashEscrow[slashId] = 0;
            totalEscrowed -= amount;
        }
    }

    function withdrawToTreasury() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        uint256 available = address(this).balance - totalEscrowed;
        require(available > 0, "No funds available");
        
        (bool success, ) = treasury.call{value: available}("");
        require(success, "Transfer failed");
    }

    function getSlashEvent(uint256 slashId) external view returns (NodeEconomyTypes.SlashEvent memory) {
        require(_slashEvents[slashId].slashId != 0, "Slash not found");
        return _slashEvents[slashId];
    }

    function getNodeSlashHistory(uint256 nodeId) external view returns (uint256[] memory) {
        return _nodeSlashHistory[nodeId];
    }

    function getSlashingParams(NodeEconomyTypes.NodeClass nodeClass) external view returns (NodeEconomyTypes.SlashingParams memory) {
        return _slashingParams[nodeClass];
    }

    function getAppealStatus(uint256 slashId) external view returns (bool hasAppeal, bool resolved, bytes32 appealHash) {
        hasAppeal = _slashAppeals[slashId] != bytes32(0);
        resolved = _appealResolved[slashId];
        appealHash = _slashAppeals[slashId];
    }

    function getEscrowedAmount(uint256 slashId) external view returns (uint256) {
        return _slashEscrow[slashId];
    }

    function getAvailableForWithdrawal() external view returns (uint256) {
        if (address(this).balance <= totalEscrowed) return 0;
        return address(this).balance - totalEscrowed;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
    }

    receive() external payable {
        emit FundsReceived(0, msg.value);
    }
}
