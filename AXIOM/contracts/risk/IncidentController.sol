// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./ICollateralRisk.sol";

/**
 * @title  IncidentController
 * @notice Global and per-market kill-switch + unwind-mode flag for the
 *         Collateral Exploit Prevention framework.
 *
 *         GUARDIAN_ROLE actions take effect immediately (no timelock)
 *         and are intentionally impossible to "accidentally" reverse:
 *           - haltGlobal()/haltMarket()      → fail-closed
 *           - resumeGlobal()/resumeMarket()  → GOVERNOR_ROLE only,
 *                                              intended to flow through
 *                                              a TimelockController.
 *           - setUnwindMode(marketId)        → withdraw / repay only;
 *                                              new borrows / mints denied.
 *
 *         Every consumer of the framework (borrow, mint, redeem) MUST
 *         read this contract on every call so a flip is reflected
 *         atomically across the protocol.
 */
contract IncidentController is IIncidentController {

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    mapping(bytes32 => mapping(address => bool)) private _roles;

    bool public globalHalted;
    mapping(bytes32 => bool) public marketHalted;
    mapping(bytes32 => bool) public marketUnwind;

    event GlobalHalt(address indexed actor, string reason);
    event GlobalResume(address indexed actor);
    event MarketHalt(bytes32 indexed marketId, address indexed actor, string reason);
    event MarketResume(bytes32 indexed marketId, address indexed actor);
    event UnwindModeSet(bytes32 indexed marketId, bool active, address indexed actor);
    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    error MissingRole(bytes32 role, address account);

    constructor(address governor, address guardian) {
        require(governor != address(0), "Incident: zero governor");
        require(guardian != address(0), "Incident: zero guardian");
        _grantRole(GOVERNOR_ROLE, governor);
        _grantRole(GUARDIAN_ROLE, guardian);
    }

    modifier onlyRole(bytes32 role) {
        if (!_roles[role][msg.sender]) revert MissingRole(role, msg.sender);
        _;
    }

    modifier onlyGuardianOrGovernor() {
        if (!_roles[GUARDIAN_ROLE][msg.sender] && !_roles[GOVERNOR_ROLE][msg.sender]) {
            revert MissingRole(GUARDIAN_ROLE, msg.sender);
        }
        _;
    }

    function haltGlobal(string calldata reason) external onlyGuardianOrGovernor {
        globalHalted = true;
        emit GlobalHalt(msg.sender, reason);
    }

    function resumeGlobal() external onlyRole(GOVERNOR_ROLE) {
        globalHalted = false;
        emit GlobalResume(msg.sender);
    }

    function haltMarket(bytes32 marketId, string calldata reason) external onlyGuardianOrGovernor {
        marketHalted[marketId] = true;
        emit MarketHalt(marketId, msg.sender, reason);
    }

    function resumeMarket(bytes32 marketId) external onlyRole(GOVERNOR_ROLE) {
        marketHalted[marketId] = false;
        emit MarketResume(marketId, msg.sender);
    }

    /// @notice In unwind mode the market accepts repayments and withdrawals
    ///         only — new borrows / mints MUST be denied by consumers.
    function setUnwindMode(bytes32 marketId, bool active) external onlyGuardianOrGovernor {
        marketUnwind[marketId] = active;
        emit UnwindModeSet(marketId, active, msg.sender);
    }

    function isGloballyHalted() external view returns (bool) { return globalHalted; }
    function isMarketHalted(bytes32 marketId) external view returns (bool) {
        return globalHalted || marketHalted[marketId];
    }
    function unwindMode(bytes32 marketId) external view returns (bool) {
        return marketUnwind[marketId];
    }

    function grantRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(account != address(0), "Incident: zero account");
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(_roles[role][account], "Incident: not granted");
        _roles[role][account] = false;
        emit RoleRevoked(role, account);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function _grantRole(bytes32 role, address account) internal {
        _roles[role][account] = true;
        emit RoleGranted(role, account);
    }
}
