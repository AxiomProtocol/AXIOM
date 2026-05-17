// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

/**
 * @title  IStrategyManager
 * @notice Minimal interface the vault uses to delegate all strategy operations.
 */
interface IStrategyManager {
    function addStrategy(address strategy, string calldata name) external;
    function removeStrategy(address strategy) external;
    function allocate(address strategy, uint256 amount) external;
    function recall(address strategy, uint256 amount) external returns (uint256);
    function harvest(address strategy) external returns (uint256);
    function rebalance(address fromStrategy, address toStrategy, uint256 amount) external;
    function totalDeployed(address asset) external view returns (uint256);
}

/**
 * @title  AxiomTreasuryVault
 * @notice Operator-only treasury vault that holds USDC / AXUSD protocol capital
 *         and delegates all yield-strategy operations to StrategyManager.
 *
 * Architecture
 * ────────────
 *   Vault   — custody, deposit/withdraw, idle-balance accounting.
 *   StrategyManager — registers strategies, holds MANAGER_ROLE on each,
 *                     executes allocate / recall / harvest / rebalance.
 *
 * The vault NEVER calls strategy adapters directly; it always delegates
 * through StrategyManager. This enforces a clean separation of concerns and
 * prevents parallel control-plane conflicts.
 *
 * Role hierarchy (on the Vault)
 * ─────────────────────────────
 *   VAULT_ADMIN       — deposit / withdraw / pause / add-remove accepted assets
 *   STRATEGY_ADMIN    — delegate allocate / recall / harvest / add-remove strategies
 *   SENTINEL_EXECUTOR — trigger rebalances between strategies
 */
contract AxiomTreasuryVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant VAULT_ADMIN       = keccak256("VAULT_ADMIN");
    bytes32 public constant STRATEGY_ADMIN    = keccak256("STRATEGY_ADMIN");
    bytes32 public constant SENTINEL_EXECUTOR = keccak256("SENTINEL_EXECUTOR");

    // ── Immutables ────────────────────────────────────────────────────────────
    IStrategyManager public immutable strategyManager;

    // ── State ─────────────────────────────────────────────────────────────────
    bool public paused;

    /// @notice Accepted deposit assets (USDC, AXUSD).
    mapping(address => bool) public acceptedAssets;

    /// @notice Per-asset idle balance held in this contract (not deployed).
    mapping(address => uint256) public idleBalance;

    // ── Events ────────────────────────────────────────────────────────────────
    event Deposit(address indexed asset, uint256 amount, address indexed depositor);
    event Withdrawal(address indexed asset, uint256 amount, address indexed recipient);
    event StrategyAllocated(address indexed strategy, address indexed asset, uint256 amount);
    event StrategyRecalled(address indexed strategy, address indexed asset, uint256 amount);
    event StrategyHarvested(address indexed strategy, address indexed asset, uint256 yieldAmount);
    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    event AssetAccepted(address indexed asset);
    event AssetRejected(address indexed asset);
    event Rebalanced(address indexed fromStrategy, address indexed toStrategy, uint256 amount);
    event VaultPaused(address indexed by);
    event VaultUnpaused(address indexed by);
    event EmergencyWithdraw(address indexed strategy, uint256 amount);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier whenNotPaused() {
        require(!paused, "AxiomTreasuryVault: paused");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        address vaultAdmin,
        address strategyAdmin,
        address sentinelExecutor,
        address _strategyManager,
        address usdc,
        address axusd
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, vaultAdmin);
        _grantRole(VAULT_ADMIN,        vaultAdmin);
        _grantRole(STRATEGY_ADMIN,     strategyAdmin);
        _grantRole(SENTINEL_EXECUTOR,  sentinelExecutor);

        strategyManager = IStrategyManager(_strategyManager);

        acceptedAssets[usdc]  = true;
        acceptedAssets[axusd] = true;

        emit AssetAccepted(usdc);
        emit AssetAccepted(axusd);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setAcceptedAsset(address asset, bool accepted) external onlyRole(VAULT_ADMIN) {
        acceptedAssets[asset] = accepted;
        if (accepted) emit AssetAccepted(asset); else emit AssetRejected(asset);
    }

    function pause() external onlyRole(VAULT_ADMIN) {
        paused = true;
        emit VaultPaused(msg.sender);
    }

    function unpause() external onlyRole(VAULT_ADMIN) {
        paused = false;
        emit VaultUnpaused(msg.sender);
    }

    // ── Strategy registry (delegated to StrategyManager) ──────────────────────

    function addStrategy(address strategy, string calldata name) external onlyRole(STRATEGY_ADMIN) {
        strategyManager.addStrategy(strategy, name);
        emit StrategyAdded(strategy);
    }

    function removeStrategy(address strategy) external onlyRole(STRATEGY_ADMIN) {
        strategyManager.removeStrategy(strategy);
        emit StrategyRemoved(strategy);
    }

    // ── Deposit / Withdraw (operator only) ────────────────────────────────────

    /**
     * @notice Operator deposits `amount` of `asset` into the vault idle balance.
     *         Caller must pre-approve the vault to spend `amount`.
     */
    function deposit(address asset, uint256 amount)
        external onlyRole(VAULT_ADMIN) whenNotPaused nonReentrant
    {
        require(acceptedAssets[asset], "AxiomTreasuryVault: asset not accepted");
        require(amount > 0, "AxiomTreasuryVault: zero amount");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        idleBalance[asset] += amount;
        emit Deposit(asset, amount, msg.sender);
    }

    /**
     * @notice Operator withdraws idle (un-deployed) capital.
     */
    function withdraw(address asset, uint256 amount, address recipient)
        external onlyRole(VAULT_ADMIN) whenNotPaused nonReentrant
    {
        require(idleBalance[asset] >= amount, "AxiomTreasuryVault: insufficient idle");
        idleBalance[asset] -= amount;
        IERC20(asset).safeTransfer(recipient, amount);
        emit Withdrawal(asset, amount, recipient);
    }

    // ── Strategy operations (delegated through StrategyManager) ───────────────

    /**
     * @notice Allocate `amount` of `asset` to a strategy via StrategyManager.
     *         Vault transfers tokens to StrategyManager; SM transfers to strategy
     *         then calls strategy.deploy().
     */
    function allocate(address strategy, address asset, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) whenNotPaused nonReentrant
    {
        require(acceptedAssets[asset], "AxiomTreasuryVault: asset not accepted");
        require(idleBalance[asset] >= amount, "AxiomTreasuryVault: insufficient idle");
        idleBalance[asset] -= amount;
        IERC20(asset).safeTransfer(address(strategyManager), amount);
        strategyManager.allocate(strategy, amount);
        emit StrategyAllocated(strategy, asset, amount);
    }

    /**
     * @notice Recall `amount` from a strategy back to idle.
     *         StrategyManager calls strategy.withdraw() which sends funds
     *         directly back to this vault address.
     */
    function recallFromStrategy(address strategy, address asset, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) whenNotPaused nonReentrant
    {
        uint256 received = strategyManager.recall(strategy, amount);
        idleBalance[asset] += received;
        emit StrategyRecalled(strategy, asset, received);
    }

    /**
     * @notice Harvest yield from a strategy.
     *         StrategyManager calls strategy.harvest() which sends yield
     *         directly to this vault address.
     */
    function harvest(address strategy, address asset)
        external onlyRole(STRATEGY_ADMIN) nonReentrant
    {
        uint256 yieldAmount = strategyManager.harvest(strategy);
        if (yieldAmount > 0) {
            idleBalance[asset] += yieldAmount;
        }
        emit StrategyHarvested(strategy, asset, yieldAmount);
    }

    /**
     * @notice Sentinel-gated rebalance: moves `amount` from `fromStrategy`
     *         to `toStrategy` via StrategyManager.
     */
    function rebalance(
        address fromStrategy,
        address toStrategy,
        address asset,
        uint256 amount
    ) external onlyRole(SENTINEL_EXECUTOR) whenNotPaused nonReentrant {
        strategyManager.rebalance(fromStrategy, toStrategy, amount);
        emit Rebalanced(fromStrategy, toStrategy, amount);
    }

    /**
     * @notice Emergency exit — calls strategy.emergencyWithdraw() directly
     *         via DEFAULT_ADMIN_ROLE (vault is DEFAULT_ADMIN on strategies).
     */
    function emergencyWithdrawFromStrategy(address strategy, address asset)
        external onlyRole(VAULT_ADMIN) nonReentrant
    {
        uint256 amount = IStrategy(strategy).emergencyWithdraw();
        idleBalance[asset] += amount;
        emit EmergencyWithdraw(strategy, amount);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /**
     * @notice Total AUM = idle + deployed capital for `asset`.
     */
    function totalAssets(address asset) public view returns (uint256) {
        return idleBalance[asset] + strategyManager.totalDeployed(asset);
    }
}
