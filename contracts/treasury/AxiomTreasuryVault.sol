// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

/**
 * @title  AxiomTreasuryVault
 * @notice Operator-only treasury vault that holds USDC / AXUSD protocol capital
 *         and allocates it to authorised strategy adapters for yield generation.
 *
 * Role hierarchy
 * ─────────────
 *   VAULT_ADMIN         — add/remove accepted assets; pause the vault
 *   STRATEGY_ADMIN      — allocate capital to / harvest from strategies
 *   SENTINEL_EXECUTOR   — trigger rebalances between strategies (Axiom Sentinel)
 *
 * Design notes
 * ────────────
 * • No public deposits. The operator (VAULT_ADMIN) deposits directly.
 * • ERC-4626 interface is approximated via totalAssets(); full share
 *   tokenisation is deferred to the Reg D offering milestone.
 * • Events are emitted on every state change so the off-chain event
 *   poller can reconstruct a full audit trail.
 */
contract AxiomTreasuryVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant VAULT_ADMIN       = keccak256("VAULT_ADMIN");
    bytes32 public constant STRATEGY_ADMIN    = keccak256("STRATEGY_ADMIN");
    bytes32 public constant SENTINEL_EXECUTOR = keccak256("SENTINEL_EXECUTOR");

    // ── State ─────────────────────────────────────────────────────────────────
    bool public paused;

    /// @notice Accepted deposit assets (e.g. USDC, AXUSD).
    mapping(address => bool) public acceptedAssets;

    /// @notice Registered strategy adapters.
    mapping(address => bool) public strategies;
    address[] public strategyList;

    /// @notice Per-asset idle balance held in this contract (not deployed).
    mapping(address => uint256) public idleBalance;

    // ── Events ────────────────────────────────────────────────────────────────
    event Deposit(address indexed asset, uint256 amount, address indexed depositor);
    event Withdrawal(address indexed asset, uint256 amount, address indexed recipient);
    event StrategyAllocated(address indexed strategy, address indexed asset, uint256 amount);
    event StrategyHarvested(address indexed strategy, uint256 yieldAmount);
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
        address usdc,
        address axusd
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, vaultAdmin);
        _grantRole(VAULT_ADMIN,       vaultAdmin);
        _grantRole(STRATEGY_ADMIN,    strategyAdmin);
        _grantRole(SENTINEL_EXECUTOR, sentinelExecutor);

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

    function addStrategy(address strategy) external onlyRole(STRATEGY_ADMIN) {
        require(!strategies[strategy], "AxiomTreasuryVault: already registered");
        strategies[strategy] = true;
        strategyList.push(strategy);
        emit StrategyAdded(strategy);
    }

    function removeStrategy(address strategy) external onlyRole(STRATEGY_ADMIN) {
        require(strategies[strategy], "AxiomTreasuryVault: not registered");
        require(IStrategy(strategy).currentValue() == 0, "AxiomTreasuryVault: strategy still deployed");
        strategies[strategy] = false;
        uint256 len = strategyList.length;
        for (uint256 i = 0; i < len; i++) {
            if (strategyList[i] == strategy) {
                strategyList[i] = strategyList[len - 1];
                strategyList.pop();
                break;
            }
        }
        emit StrategyRemoved(strategy);
    }

    function pause() external onlyRole(VAULT_ADMIN) {
        paused = true;
        emit VaultPaused(msg.sender);
    }

    function unpause() external onlyRole(VAULT_ADMIN) {
        paused = false;
        emit VaultUnpaused(msg.sender);
    }

    // ── Deposit / Withdraw (operator only) ───────────────────────────────────

    /**
     * @notice Operator deposits `amount` of `asset` into the vault idle balance.
     */
    function deposit(address asset, uint256 amount) external onlyRole(VAULT_ADMIN) whenNotPaused nonReentrant {
        require(acceptedAssets[asset], "AxiomTreasuryVault: asset not accepted");
        require(amount > 0, "AxiomTreasuryVault: zero amount");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        idleBalance[asset] += amount;
        emit Deposit(asset, amount, msg.sender);
    }

    /**
     * @notice Operator withdraws idle (un-deployed) `amount` of `asset`.
     */
    function withdraw(address asset, uint256 amount, address recipient)
        external onlyRole(VAULT_ADMIN) whenNotPaused nonReentrant
    {
        require(idleBalance[asset] >= amount, "AxiomTreasuryVault: insufficient idle balance");
        idleBalance[asset] -= amount;
        IERC20(asset).safeTransfer(recipient, amount);
        emit Withdrawal(asset, amount, recipient);
    }

    // ── Strategy operations ───────────────────────────────────────────────────

    /**
     * @notice Allocate `amount` of `asset` to a registered strategy.
     * @dev    Only STRATEGY_ADMIN may call. Transfers from idle balance.
     */
    function allocate(address strategy, address asset, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) whenNotPaused nonReentrant
    {
        require(strategies[strategy], "AxiomTreasuryVault: strategy not registered");
        require(acceptedAssets[asset], "AxiomTreasuryVault: asset not accepted");
        require(idleBalance[asset] >= amount, "AxiomTreasuryVault: insufficient idle balance");
        idleBalance[asset] -= amount;
        IERC20(asset).safeTransfer(strategy, amount);
        IStrategy(strategy).deploy(amount);
        emit StrategyAllocated(strategy, asset, amount);
    }

    /**
     * @notice Withdraw `amount` from strategy back to idle balance.
     */
    function recallFromStrategy(address strategy, address asset, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) whenNotPaused nonReentrant
    {
        require(strategies[strategy], "AxiomTreasuryVault: strategy not registered");
        uint256 received = IStrategy(strategy).withdraw(amount);
        idleBalance[asset] += received;
        emit Withdrawal(asset, received, address(this));
    }

    /**
     * @notice Harvest yield from a strategy, crediting idle balance.
     */
    function harvest(address strategy, address asset)
        external onlyRole(STRATEGY_ADMIN) nonReentrant
    {
        require(strategies[strategy], "AxiomTreasuryVault: strategy not registered");
        uint256 yieldAmount = IStrategy(strategy).harvest();
        if (yieldAmount > 0) {
            idleBalance[asset] += yieldAmount;
        }
        emit StrategyHarvested(strategy, yieldAmount);
    }

    /**
     * @notice Sentinel-gated rebalance: withdraw `amount` from `fromStrategy`,
     *         then allocate the proceeds to `toStrategy`.
     */
    function rebalance(
        address fromStrategy,
        address toStrategy,
        address asset,
        uint256 amount
    ) external onlyRole(SENTINEL_EXECUTOR) whenNotPaused nonReentrant {
        require(strategies[fromStrategy], "AxiomTreasuryVault: fromStrategy not registered");
        require(strategies[toStrategy],   "AxiomTreasuryVault: toStrategy not registered");
        uint256 received = IStrategy(fromStrategy).withdraw(amount);
        IERC20(asset).safeTransfer(toStrategy, received);
        IStrategy(toStrategy).deploy(received);
        emit Rebalanced(fromStrategy, toStrategy, received);
    }

    /**
     * @notice Emergency exit from a strategy — pulls all funds to idle.
     */
    function emergencyWithdrawFromStrategy(address strategy, address asset)
        external onlyRole(VAULT_ADMIN) nonReentrant
    {
        require(strategies[strategy], "AxiomTreasuryVault: strategy not registered");
        uint256 amount = IStrategy(strategy).emergencyWithdraw();
        idleBalance[asset] += amount;
        emit EmergencyWithdraw(strategy, amount);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /**
     * @notice Total AUM = idle balances across all accepted assets
     *         + deployed value across all strategies.
     * @dev    Returns USD-denominated total only when all assets are 1:1 USD
     *         (USDC / AXUSD). Update this logic when non-stablecoin assets
     *         are accepted.
     */
    function totalAssets(address asset) public view returns (uint256 total) {
        total = idleBalance[asset];
        uint256 len = strategyList.length;
        for (uint256 i = 0; i < len; i++) {
            if (IStrategy(strategyList[i]).asset() == asset) {
                total += IStrategy(strategyList[i]).currentValue();
            }
        }
    }

    function strategyCount() external view returns (uint256) {
        return strategyList.length;
    }

    function getStrategyList() external view returns (address[] memory) {
        return strategyList;
    }
}
