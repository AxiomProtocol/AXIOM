// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./ICollateralRisk.sol";

/**
 * @title  WithdrawalRateLimiter
 * @notice Rolling-window net-outflow cap per market. Caps the total
 *         outflow (mint redeem, loan disbursement, withdrawal, etc.)
 *         that any single market can move within a configurable
 *         rolling window so that a compromised operator key, oracle
 *         glitch, or runaway flow cannot drain a market in a single
 *         block.
 *
 *         Consumers (MintRedeemController, AXIOMFixedLoan, future
 *         lending markets) call `requireOutflowAllowed(marketId, amt)`
 *         immediately before the transfer. The same call records the
 *         outflow against the rolling window — the limiter is
 *         single-call so a consumer cannot accidentally check without
 *         recording.
 *
 *         Emergency bypass is intentionally constrained: the
 *         GUARDIAN_ROLE can flip `bypassActive` to true ONLY when the
 *         IncidentController reports the market or the protocol as
 *         halted. This forces the guardian to commit to a halt before
 *         the rate limiter can be disabled, preventing a single
 *         compromised key from "turning off" the limiter to drain a
 *         market that is otherwise live.
 *
 *         Window mechanics: the contract records cumulative outflow
 *         per market in fixed-size buckets (windowSecs / 12 = bucket
 *         size). On each new outflow, buckets older than `windowSecs`
 *         are aged out. The current window total is the sum of all
 *         live buckets.
 */
contract WithdrawalRateLimiter {

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    uint8 public constant BUCKETS = 12;

    struct MarketConfig {
        // Maximum cumulative outflow allowed within one rolling window.
        // 0 = market not configured = fail-closed (every outflow reverts).
        uint256 windowCap;
        // Length of the rolling window in seconds.
        uint32  windowSecs;
        // True if the market is configured. We use this rather than
        // `windowCap > 0` so a governor can intentionally configure a
        // zero-cap (frozen) market.
        bool    configured;
    }

    struct Bucket {
        uint64  startTimestamp; // unix seconds
        uint192 total;          // accumulated outflow in this bucket
    }

    IIncidentController public incident;

    mapping(bytes32 => mapping(address => bool)) private _roles;

    mapping(bytes32 => MarketConfig) public marketConfig;
    // marketId => ringbuffer of buckets, length BUCKETS, indexed mod BUCKETS.
    mapping(bytes32 => Bucket[BUCKETS]) private _buckets;

    bool public bypassActive;

    event MarketConfigured(bytes32 indexed marketId, uint256 windowCap, uint32 windowSecs);
    event OutflowRecorded(
        bytes32 indexed marketId,
        address indexed consumer,
        uint256 amount,
        uint256 windowTotalAfter
    );
    event BypassActivated(address indexed actor, string reason);
    event BypassDeactivated(address indexed actor);
    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);
    event IncidentControllerSet(address controller);

    error MissingRole(bytes32 role, address account);
    error MarketNotConfigured(bytes32 marketId);
    error WindowCapExceeded(
        bytes32 marketId,
        uint256 requested,
        uint256 windowTotal,
        uint256 windowCap
    );
    error BypassRequiresHalt();
    error WindowSecsZero();
    error IncidentControllerUnset();

    modifier onlyRole(bytes32 role) {
        if (!_roles[role][msg.sender]) revert MissingRole(role, msg.sender);
        _;
    }

    constructor(address governor, address guardian, address incident_) {
        require(governor != address(0), "RL: zero governor");
        require(guardian != address(0), "RL: zero guardian");
        require(incident_ != address(0), "RL: zero incident");
        _grantRole(GOVERNOR_ROLE, governor);
        _grantRole(GUARDIAN_ROLE, guardian);
        incident = IIncidentController(incident_);
        emit IncidentControllerSet(incident_);
    }

    // ───────────────────────────────────────────────────────────────
    // Governor wiring
    // ───────────────────────────────────────────────────────────────

    function setIncidentController(address incident_) external onlyRole(GOVERNOR_ROLE) {
        require(incident_ != address(0), "RL: zero incident");
        incident = IIncidentController(incident_);
        emit IncidentControllerSet(incident_);
    }

    function configureMarket(
        bytes32 marketId,
        uint256 windowCap,
        uint32  windowSecs
    ) external onlyRole(GOVERNOR_ROLE) {
        if (windowSecs == 0) revert WindowSecsZero();
        marketConfig[marketId] = MarketConfig({
            windowCap:  windowCap,
            windowSecs: windowSecs,
            configured: true
        });
        emit MarketConfigured(marketId, windowCap, windowSecs);
    }

    function grantRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(account != address(0), "RL: zero account");
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        if (!_roles[role][account]) return;
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

    // ───────────────────────────────────────────────────────────────
    // Emergency bypass — guardian can only flip on if a halt is live
    // ───────────────────────────────────────────────────────────────

    /// @notice Activate bypass. The IncidentController MUST already
    ///         report the protocol as globally halted. This forces the
    ///         guardian to commit to a halt before the limiter can be
    ///         disabled, eliminating the "turn off the limiter to
    ///         drain a live market" attack path.
    function activateBypass(string calldata reason) external {
        if (!_roles[GUARDIAN_ROLE][msg.sender] && !_roles[GOVERNOR_ROLE][msg.sender]) {
            revert MissingRole(GUARDIAN_ROLE, msg.sender);
        }
        if (address(incident) == address(0)) revert IncidentControllerUnset();
        if (!incident.isGloballyHalted()) revert BypassRequiresHalt();
        bypassActive = true;
        emit BypassActivated(msg.sender, reason);
    }

    /// @notice Deactivate bypass. Governor only. Intended to flow
    ///         through a TimelockController in production.
    function deactivateBypass() external onlyRole(GOVERNOR_ROLE) {
        bypassActive = false;
        emit BypassDeactivated(msg.sender);
    }

    // ───────────────────────────────────────────────────────────────
    // Consumer call — fail-closed admission + record
    // ───────────────────────────────────────────────────────────────

    /// @notice Single-call admission + record. Reverts if the outflow
    ///         would exceed the rolling-window cap. Records the
    ///         outflow into the current bucket on success.
    ///
    ///         Bypass: if `bypassActive` is true (only possible when
    ///         the protocol is globally halted, see activateBypass)
    ///         the call still records the outflow but does not enforce
    ///         the cap. This lets governance run a controlled unwind
    ///         without the limiter blocking redemptions.
    function requireOutflowAllowed(bytes32 marketId, uint256 amount)
        external
        onlyRole(CONSUMER_ROLE)
    {
        MarketConfig memory cfg = marketConfig[marketId];
        if (!cfg.configured) revert MarketNotConfigured(marketId);

        uint256 windowTotal = _windowTotal(marketId, cfg.windowSecs);
        uint256 newTotal    = windowTotal + amount;

        if (!bypassActive && newTotal > cfg.windowCap) {
            revert WindowCapExceeded(marketId, amount, windowTotal, cfg.windowCap);
        }

        _recordOutflow(marketId, cfg.windowSecs, amount);

        emit OutflowRecorded(marketId, msg.sender, amount, newTotal);
    }

    // ───────────────────────────────────────────────────────────────
    // Read helpers (public — anyone can query)
    // ───────────────────────────────────────────────────────────────

    function currentWindowTotal(bytes32 marketId) external view returns (uint256) {
        MarketConfig memory cfg = marketConfig[marketId];
        if (!cfg.configured) return 0;
        return _windowTotal(marketId, cfg.windowSecs);
    }

    function remainingWindowCapacity(bytes32 marketId) external view returns (uint256) {
        MarketConfig memory cfg = marketConfig[marketId];
        if (!cfg.configured) return 0;
        uint256 t = _windowTotal(marketId, cfg.windowSecs);
        return t >= cfg.windowCap ? 0 : (cfg.windowCap - t);
    }

    // ───────────────────────────────────────────────────────────────
    // Internal — bucket math
    // ───────────────────────────────────────────────────────────────

    function _bucketSize(uint32 windowSecs) internal pure returns (uint64) {
        // Round up to ensure BUCKETS * bucketSize >= windowSecs.
        return uint64((windowSecs + BUCKETS - 1) / BUCKETS);
    }

    function _bucketIndex(uint64 timestamp, uint64 bucketSize) internal pure returns (uint8) {
        return uint8((timestamp / bucketSize) % BUCKETS);
    }

    function _windowTotal(bytes32 marketId, uint32 windowSecs) internal view returns (uint256) {
        uint64 nowTs       = uint64(block.timestamp);
        uint64 bucketSize  = _bucketSize(windowSecs);
        uint64 windowStart = nowTs > windowSecs ? (nowTs - windowSecs) : 0;
        uint256 sum;
        for (uint8 i = 0; i < BUCKETS; i++) {
            Bucket storage b = _buckets[marketId][i];
            // A bucket counts if its start is within the window AND it
            // is at most `windowSecs` old (i.e. has not aged out and
            // been overwritten conceptually).
            if (b.startTimestamp >= windowStart && b.startTimestamp + bucketSize > windowStart) {
                sum += uint256(b.total);
            }
        }
        return sum;
    }

    function _recordOutflow(bytes32 marketId, uint32 windowSecs, uint256 amount) internal {
        uint64 nowTs      = uint64(block.timestamp);
        uint64 bucketSize = _bucketSize(windowSecs);
        uint64 bStart     = (nowTs / bucketSize) * bucketSize;
        uint8  idx        = _bucketIndex(nowTs, bucketSize);
        Bucket storage b  = _buckets[marketId][idx];
        if (b.startTimestamp != bStart) {
            // Rolled into a new bucket slot — overwrite the stale one.
            b.startTimestamp = bStart;
            b.total = uint192(amount);
        } else {
            b.total = uint192(uint256(b.total) + amount);
        }
    }
}
