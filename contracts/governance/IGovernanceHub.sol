// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGovernanceHub {
    enum ActionType {
        RISK_PARAM_UPDATE,
        PRODUCT_ACTIVATION,
        PRODUCT_DEACTIVATION,
        PRODUCT_REGISTRATION,
        PRODUCT_DEREGISTRATION,
        MANAGER_UPDATE,
        CONTRACT_CONFIG_UPDATE,
        EMERGENCY_UNPAUSE
    }

    enum ActionState {
        Pending,
        Ready,
        Executed,
        Cancelled,
        Expired
    }

    struct QueuedAction {
        bytes32 actionId;
        ActionType actionType;
        address target;
        bytes callData;
        uint256 eta;
        address proposer;
        ActionState state;
        uint256 proposedAt;
    }

    function lendingPaused() external view returns (bool);
    function minimumDelay() external view returns (uint256);
    function gracePeriod() external view returns (uint256);

    function proposeAction(
        ActionType actionType,
        address target,
        bytes calldata callData,
        uint256 eta
    ) external returns (bytes32 actionId);

    function cancelAction(bytes32 actionId) external;
    function executeAction(bytes32 actionId) external returns (bool success, bytes memory result);

    function pauseLending() external;
    function unpauseLending() external;

    function getAction(bytes32 actionId) external view returns (QueuedAction memory);
    function getActionState(bytes32 actionId) external view returns (ActionState);
    function getPendingActions() external view returns (bytes32[] memory);

    event ActionProposed(
        bytes32 indexed actionId,
        ActionType indexed actionType,
        address indexed target,
        bytes callData,
        uint256 eta,
        address proposer
    );

    event ActionCancelled(bytes32 indexed actionId, address indexed canceller);

    event ActionExecuted(
        bytes32 indexed actionId,
        ActionType indexed actionType,
        address indexed target,
        address executor,
        bool success
    );

    event LendingPaused(address indexed guardian);
    event LendingUnpaused(address indexed authority);

    event MinimumDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event GracePeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
}
