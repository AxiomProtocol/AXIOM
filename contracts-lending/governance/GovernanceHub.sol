// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IGovernanceHub.sol";

contract GovernanceHub is AccessControl, ReentrancyGuard, IGovernanceHub {
    bytes32 public constant RISK_COMMITTEE_ROLE = keccak256("RISK_COMMITTEE_ROLE");
    bytes32 public constant SETTLEMENT_AUTHORITY_ROLE = keccak256("SETTLEMENT_AUTHORITY_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 public constant MIN_DELAY_FLOOR = 1 hours;
    uint256 public constant MAX_DELAY_CAP = 30 days;
    uint256 public constant DEFAULT_DELAY = 24 hours;
    uint256 public constant DEFAULT_GRACE_PERIOD = 14 days;

    bool public override lendingPaused;
    uint256 public override minimumDelay;
    uint256 public override gracePeriod;
    uint256 public actionNonce;

    mapping(bytes32 => QueuedAction) private _actions;
    bytes32[] private _pendingActionIds;
    mapping(bytes32 => uint256) private _pendingIndex;

    address[] public authorizedTargets;
    mapping(address => bool) public isAuthorizedTarget;

    event TargetAuthorized(address indexed target);
    event TargetRevoked(address indexed target);

    constructor(address admin) {
        require(admin != address(0), "GovernanceHub: zero admin");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RISK_COMMITTEE_ROLE, admin);
        _grantRole(SETTLEMENT_AUTHORITY_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, admin);

        minimumDelay = DEFAULT_DELAY;
        gracePeriod = DEFAULT_GRACE_PERIOD;
        lendingPaused = false;
    }

    function proposeAction(
        ActionType actionType,
        address target,
        bytes calldata callData,
        uint256 eta
    ) external override nonReentrant returns (bytes32 actionId) {
        require(isAuthorizedTarget[target], "GovernanceHub: unauthorized target");
        require(eta >= block.timestamp + minimumDelay, "GovernanceHub: eta too soon");
        require(eta <= block.timestamp + MAX_DELAY_CAP, "GovernanceHub: eta too far");

        _checkRoleForAction(actionType);

        actionId = keccak256(abi.encode(
            actionType,
            target,
            callData,
            eta,
            msg.sender,
            actionNonce++
        ));

        require(_actions[actionId].proposedAt == 0, "GovernanceHub: duplicate action");

        _actions[actionId] = QueuedAction({
            actionId: actionId,
            actionType: actionType,
            target: target,
            callData: callData,
            eta: eta,
            proposer: msg.sender,
            state: ActionState.Pending,
            proposedAt: block.timestamp
        });

        _pendingActionIds.push(actionId);
        _pendingIndex[actionId] = _pendingActionIds.length - 1;

        emit ActionProposed(actionId, actionType, target, callData, eta, msg.sender);
    }

    function cancelAction(bytes32 actionId) external override nonReentrant {
        QueuedAction storage action = _actions[actionId];
        require(action.proposedAt != 0, "GovernanceHub: action not found");
        require(
            action.state == ActionState.Pending || action.state == ActionState.Ready,
            "GovernanceHub: cannot cancel"
        );

        bool canCancel = hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
                         hasRole(GUARDIAN_ROLE, msg.sender) ||
                         action.proposer == msg.sender;
        require(canCancel, "GovernanceHub: not authorized to cancel");

        action.state = ActionState.Cancelled;
        _removeFromPending(actionId);

        emit ActionCancelled(actionId, msg.sender);
    }

    function executeAction(bytes32 actionId) external override nonReentrant returns (bool success, bytes memory result) {
        QueuedAction storage action = _actions[actionId];
        require(action.proposedAt != 0, "GovernanceHub: action not found");
        require(
            action.state == ActionState.Pending || action.state == ActionState.Ready,
            "GovernanceHub: not executable"
        );
        require(block.timestamp >= action.eta, "GovernanceHub: eta not reached");
        require(block.timestamp <= action.eta + gracePeriod, "GovernanceHub: action expired");

        _checkRoleForAction(action.actionType);

        action.state = ActionState.Executed;
        _removeFromPending(actionId);

        (success, result) = action.target.call(action.callData);

        emit ActionExecuted(actionId, action.actionType, action.target, msg.sender, success);
    }

    function pauseLending() external override {
        require(hasRole(GUARDIAN_ROLE, msg.sender), "GovernanceHub: not guardian");
        require(!lendingPaused, "GovernanceHub: already paused");

        lendingPaused = true;
        emit LendingPaused(msg.sender);
    }

    function unpauseLending() external override {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            hasRole(SETTLEMENT_AUTHORITY_ROLE, msg.sender),
            "GovernanceHub: not authorized"
        );
        require(lendingPaused, "GovernanceHub: not paused");

        lendingPaused = false;
        emit LendingUnpaused(msg.sender);
    }

    function setMinimumDelay(uint256 newDelay) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "GovernanceHub: not admin");
        require(newDelay >= MIN_DELAY_FLOOR, "GovernanceHub: delay too short");
        require(newDelay <= MAX_DELAY_CAP, "GovernanceHub: delay too long");

        uint256 oldDelay = minimumDelay;
        minimumDelay = newDelay;
        emit MinimumDelayUpdated(oldDelay, newDelay);
    }

    function setGracePeriod(uint256 newPeriod) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "GovernanceHub: not admin");
        require(newPeriod >= 1 days, "GovernanceHub: grace too short");
        require(newPeriod <= 30 days, "GovernanceHub: grace too long");

        uint256 oldPeriod = gracePeriod;
        gracePeriod = newPeriod;
        emit GracePeriodUpdated(oldPeriod, newPeriod);
    }

    function authorizeTarget(address target) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "GovernanceHub: not admin");
        require(target != address(0), "GovernanceHub: zero address");
        require(!isAuthorizedTarget[target], "GovernanceHub: already authorized");

        isAuthorizedTarget[target] = true;
        authorizedTargets.push(target);
        emit TargetAuthorized(target);
    }

    function revokeTarget(address target) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "GovernanceHub: not admin");
        require(isAuthorizedTarget[target], "GovernanceHub: not authorized");

        isAuthorizedTarget[target] = false;
        for (uint256 i = 0; i < authorizedTargets.length; i++) {
            if (authorizedTargets[i] == target) {
                authorizedTargets[i] = authorizedTargets[authorizedTargets.length - 1];
                authorizedTargets.pop();
                break;
            }
        }
        emit TargetRevoked(target);
    }

    function getAction(bytes32 actionId) external view override returns (QueuedAction memory) {
        return _actions[actionId];
    }

    function getActionState(bytes32 actionId) external view override returns (ActionState) {
        QueuedAction storage action = _actions[actionId];
        if (action.proposedAt == 0) {
            return ActionState.Pending;
        }
        if (action.state == ActionState.Executed || action.state == ActionState.Cancelled) {
            return action.state;
        }
        if (block.timestamp > action.eta + gracePeriod) {
            return ActionState.Expired;
        }
        if (block.timestamp >= action.eta) {
            return ActionState.Ready;
        }
        return ActionState.Pending;
    }

    function getPendingActions() external view override returns (bytes32[] memory) {
        return _pendingActionIds;
    }

    function getAuthorizedTargets() external view returns (address[] memory) {
        return authorizedTargets;
    }

    function getPendingActionsCount() external view returns (uint256) {
        return _pendingActionIds.length;
    }

    function computeActionId(
        ActionType actionType,
        address target,
        bytes calldata callData,
        uint256 eta,
        address proposer,
        uint256 nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(actionType, target, callData, eta, proposer, nonce));
    }

    function _checkRoleForAction(ActionType actionType) internal view {
        if (actionType == ActionType.RISK_PARAM_UPDATE) {
            require(
                hasRole(RISK_COMMITTEE_ROLE, msg.sender),
                "GovernanceHub: not risk committee"
            );
        } else if (
            actionType == ActionType.PRODUCT_ACTIVATION ||
            actionType == ActionType.PRODUCT_DEACTIVATION ||
            actionType == ActionType.PRODUCT_REGISTRATION ||
            actionType == ActionType.PRODUCT_DEREGISTRATION ||
            actionType == ActionType.MANAGER_UPDATE
        ) {
            require(
                hasRole(SETTLEMENT_AUTHORITY_ROLE, msg.sender),
                "GovernanceHub: not settlement authority"
            );
        } else if (actionType == ActionType.CONTRACT_CONFIG_UPDATE) {
            require(
                hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
                "GovernanceHub: not admin"
            );
        } else if (actionType == ActionType.EMERGENCY_UNPAUSE) {
            require(
                hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
                hasRole(SETTLEMENT_AUTHORITY_ROLE, msg.sender),
                "GovernanceHub: not authorized for unpause"
            );
        } else {
            revert("GovernanceHub: unknown action type");
        }
    }

    function _removeFromPending(bytes32 actionId) internal {
        uint256 index = _pendingIndex[actionId];
        uint256 lastIndex = _pendingActionIds.length - 1;

        if (index != lastIndex) {
            bytes32 lastActionId = _pendingActionIds[lastIndex];
            _pendingActionIds[index] = lastActionId;
            _pendingIndex[lastActionId] = index;
        }

        _pendingActionIds.pop();
        delete _pendingIndex[actionId];
    }
}
