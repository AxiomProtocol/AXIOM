// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

/**
 * @title  IStrategyManager
 * @notice Minimal interface the vault uses to delegate strategy operations.
 */
interface IStrategyManager {
    function addStrategy(address strategy, string calldata name) external;
    function removeStrategy(address strategy) external;
    /// @notice Single-asset allocation (backward-compat, forwards strategyInfo.asset).
    function allocate(address strategy, uint256 amount) external;
    /// @notice Explicit-asset allocation — forwards the specified assetAddr to strategy.
    function allocateAsset(address strategy, address assetAddr, uint256 amount) external;
    /// @notice Pre-fund secondary (paired) asset without triggering deploy().
    function fundPairedAsset(address strategy, address assetAddr, uint256 amount) external;
    function recall(address strategy, uint256 amount) external returns (uint256);
    function harvest(address strategy) external returns (uint256);
    function totalDeployed(address asset) external view returns (uint256);
}

/**
 * @title  AxiomTreasuryVault
 * @notice ERC-4626 compliant operator treasury vault.
 *
 * ERC-4626 implementation
 * ───────────────────────
 *   • Underlying asset: USDC (primary)
 *   • Share token: ATVS (Axiom Treasury Vault Share) — 18 decimals
 *   • deposit/mint/withdraw/redeem are VAULT_ADMIN-only
 *   • totalAssets() = USDC.balanceOf(vault) + SM.totalDeployed(USDC)
 *   • Full share tokenisation is active; shares are 1:1 on initial deployment
 *     and accrue yield as totalAssets grows relative to totalSupply
 *
 * Secondary assets (AXUSD and future)
 * ─────────────────────────────────────
 *   depositToken(asset, amount) — non-ERC4626 for non-primary assets
 *   tracked via idleBalance[asset]
 *
 * Strategy delegation
 * ────────────────────
 *   All strategy operations delegate through StrategyManager.
 *   Vault → StrategyManager (STRATEGY_ADMIN) → Strategy (MANAGER_ROLE)
 *   Rebalance: vault recalls (funds return to vault) then allocates to destination.
 *
 * Role hierarchy (vault)
 * ──────────────────────
 *   VAULT_ADMIN       — deposit/withdraw/pause/assets/depositToken
 *   STRATEGY_ADMIN    — allocate/recall/harvest/addStrategy/removeStrategy
 *   SENTINEL_EXECUTOR — rebalance
 */
contract AxiomTreasuryVault is ERC4626, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant VAULT_ADMIN       = keccak256("VAULT_ADMIN");
    bytes32 public constant STRATEGY_ADMIN    = keccak256("STRATEGY_ADMIN");
    bytes32 public constant SENTINEL_EXECUTOR = keccak256("SENTINEL_EXECUTOR");

    // ── Immutables ────────────────────────────────────────────────────────────
    IStrategyManager public immutable strategyManager;

    // ── State ─────────────────────────────────────────────────────────────────
    bool public paused;

    /// @notice Accepted assets (primary USDC + secondary AXUSD / others).
    mapping(address => bool) public acceptedAssets;

    /// @notice Idle balance for NON-primary (non-ERC4626) assets only.
    ///         Primary asset (USDC) idle is USDC.balanceOf(address(this)).
    mapping(address => uint256) public idleBalance;

    // ── Events ────────────────────────────────────────────────────────────────
    event TokenDeposited(address indexed asset, uint256 amount, address indexed depositor);
    event TokenWithdrawn(address indexed asset, uint256 amount, address indexed recipient);
    event StrategyAllocated(address indexed strategy, address indexed asset, uint256 amount);
    event StrategyRecalled(address indexed strategy, address indexed asset, uint256 amount);
    event StrategyHarvested(address indexed strategy, address indexed asset, uint256 yieldAmount);
    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    event AssetAccepted(address indexed asset);
    event AssetRejected(address indexed asset);
    event Rebalanced(address indexed fromStrategy, address indexed toStrategy, uint256 amount);
    event IdleBalanceSynced(address indexed assetAddr, uint256 newBalance);
    event VaultPaused(address indexed by);
    event VaultUnpaused(address indexed by);
    event EmergencyWithdraw(address indexed strategy, uint256 amount);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier whenNotPaused() {
        require(!paused, "AxiomTreasuryVault: paused");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param vaultAdmin       Gets VAULT_ADMIN + DEFAULT_ADMIN_ROLE.
     * @param strategyAdmin    Gets STRATEGY_ADMIN.
     * @param sentinelExecutor Gets SENTINEL_EXECUTOR.
     * @param _strategyManager Deployed StrategyManager address.
     * @param usdc             USDC token address — ERC-4626 underlying asset.
     * @param axusd            AXUSD token address — secondary accepted asset.
     */
    constructor(
        address vaultAdmin,
        address strategyAdmin,
        address sentinelExecutor,
        address _strategyManager,
        address usdc,
        address axusd
    )
        ERC4626(IERC20(usdc))
        ERC20("Axiom Treasury Vault Share", "ATVS")
    {
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

    // ── ERC-4626 overrides (primary USDC asset) ───────────────────────────────

    /**
     * @notice Total AUM = idle USDC held in vault + USDC deployed across strategies.
     */
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this))
             + strategyManager.totalDeployed(asset());
    }

    /**
     * @notice Deposit `assets` of USDC, mint `shares` ATVS to `receiver`.
     *         Restricted to VAULT_ADMIN.
     */
    function deposit(uint256 assets, address receiver)
        public override onlyRole(VAULT_ADMIN) whenNotPaused nonReentrant
        returns (uint256)
    {
        return super.deposit(assets, receiver);
    }

    /**
     * @notice Mint `shares` ATVS by depositing the equivalent USDC.
     *         Restricted to VAULT_ADMIN.
     */
    function mint(uint256 shares, address receiver)
        public override onlyRole(VAULT_ADMIN) whenNotPaused nonReentrant
        returns (uint256)
    {
        return super.mint(shares, receiver);
    }

    /**
     * @notice Withdraw `assets` of idle USDC, burn equivalent shares.
     *         Restricted to VAULT_ADMIN.
     */
    function withdraw(uint256 assets, address receiver, address owner)
        public override onlyRole(VAULT_ADMIN) whenNotPaused nonReentrant
        returns (uint256)
    {
        return super.withdraw(assets, receiver, owner);
    }

    /**
     * @notice Redeem `shares` of ATVS for USDC.
     *         Restricted to VAULT_ADMIN.
     */
    function redeem(uint256 shares, address receiver, address owner)
        public override onlyRole(VAULT_ADMIN) whenNotPaused nonReentrant
        returns (uint256)
    {
        return super.redeem(shares, receiver, owner);
    }

    /**
     * @notice Restricts deposit availability — only for non-paused state.
     */
    function maxDeposit(address) public view override returns (uint256) {
        return paused ? 0 : type(uint256).max;
    }

    function maxMint(address) public view override returns (uint256) {
        return paused ? 0 : type(uint256).max;
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        if (paused) return 0;
        return convertToAssets(balanceOf(owner));
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        return paused ? 0 : balanceOf(owner);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * @notice Returns the idle (undeployed) balance of any accepted asset held by this vault.
     *         For the primary ERC-4626 asset (USDC), returns the live token balance.
     *         For secondary assets (AXUSD etc.), returns the idleBalance mapping value.
     *
     * Used by the service layer to compute multi-asset AUM without relying on
     * ERC-4626's single-asset totalAssets().
     */
    function getIdleBalance(address assetAddr) external view returns (uint256) {
        if (assetAddr == asset()) return IERC20(asset()).balanceOf(address(this));
        return idleBalance[assetAddr];
    }

    function setAcceptedAsset(address assetAddr, bool accepted) external onlyRole(VAULT_ADMIN) {
        acceptedAssets[assetAddr] = accepted;
        if (accepted) emit AssetAccepted(assetAddr); else emit AssetRejected(assetAddr);
    }

    function pause() external onlyRole(VAULT_ADMIN) {
        paused = true;
        emit VaultPaused(msg.sender);
    }

    function unpause() external onlyRole(VAULT_ADMIN) {
        paused = false;
        emit VaultUnpaused(msg.sender);
    }

    // ── Secondary-asset deposits (non-ERC4626) ────────────────────────────────

    /**
     * @notice Deposit a secondary asset (e.g. AXUSD) into idle balance.
     *         Use standard ERC-4626 deposit() for the primary asset (USDC).
     */
    function depositToken(address assetAddr, uint256 amount)
        external onlyRole(VAULT_ADMIN) whenNotPaused nonReentrant
    {
        require(acceptedAssets[assetAddr], "AxiomTreasuryVault: asset not accepted");
        require(assetAddr != asset(),       "AxiomTreasuryVault: use deposit() for primary asset");
        require(amount > 0,                 "AxiomTreasuryVault: zero amount");
        IERC20(assetAddr).safeTransferFrom(msg.sender, address(this), amount);
        idleBalance[assetAddr] += amount;
        emit TokenDeposited(assetAddr, amount, msg.sender);
    }

    function withdrawToken(address assetAddr, uint256 amount, address recipient)
        external onlyRole(VAULT_ADMIN) whenNotPaused nonReentrant
    {
        require(assetAddr != asset(), "AxiomTreasuryVault: use withdraw() for primary asset");
        require(idleBalance[assetAddr] >= amount, "AxiomTreasuryVault: insufficient idle");
        idleBalance[assetAddr] -= amount;
        IERC20(assetAddr).safeTransfer(recipient, amount);
        emit TokenWithdrawn(assetAddr, amount, recipient);
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

    // ── Strategy operations (delegated through StrategyManager) ───────────────

    /**
     * @notice Allocate `amount` of `assetAddr` to a strategy via StrategyManager.
     *         Calls SM.allocateAsset() which explicitly forwards `assetAddr` to the
     *         strategy (not the strategy's registered primary asset), enabling AXUSD
     *         allocation to an AaveV3Strategy(AXUSD) or the primary-asset side of
     *         a multi-asset CamelotStrategy.
     *
     *         For the primary asset (USDC): draws from vault's IERC20 balance.
     *         For secondary assets (AXUSD etc.): draws from idleBalance mapping.
     *
     * @dev    For CamelotStrategy USDC+AXUSD LP, call fundStrategyPairedAsset()
     *         with AXUSD first so AXUSD arrives at the strategy, then call this
     *         with USDC — CamelotStrategy.deploy() reads both balances.
     */
    function allocate(address strategy, address assetAddr, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) whenNotPaused nonReentrant
    {
        require(acceptedAssets[assetAddr], "AxiomTreasuryVault: asset not accepted");
        if (assetAddr == asset()) {
            require(
                IERC20(assetAddr).balanceOf(address(this)) >= amount,
                "AxiomTreasuryVault: insufficient USDC balance"
            );
        } else {
            require(idleBalance[assetAddr] >= amount, "AxiomTreasuryVault: insufficient idle");
            idleBalance[assetAddr] -= amount;
        }
        IERC20(assetAddr).safeTransfer(address(strategyManager), amount);
        // Use allocateAsset() — explicitly routes assetAddr, not strategyInfo.asset.
        // This is the correct path for both single-asset (USDC→Aave) and
        // explicit-asset (AXUSD→AaveAXUSD) allocations.
        strategyManager.allocateAsset(strategy, assetAddr, amount);
        emit StrategyAllocated(strategy, assetAddr, amount);
    }

    /**
     * @notice Pre-fund a multi-asset strategy with its secondary (paired) asset
     *         WITHOUT triggering deploy().
     *
     *         CamelotStrategy USDC+AXUSD LP flow:
     *           Step 1: fundStrategyPairedAsset(camelotStrategy, AXUSD, axusdAmt)
     *                   → AXUSD arrives at CamelotStrategy
     *           Step 2: allocate(camelotStrategy, USDC, usdcAmt)
     *                   → USDC arrives + deploy() executes with both balances present
     *
     * @param  strategy  Registered multi-asset IStrategy adapter (e.g. CamelotStrategy).
     * @param  assetAddr Secondary token (e.g. AXUSD). Must be in acceptedAssets.
     * @param  amount    Amount in token's native decimals.
     */
    function fundStrategyPairedAsset(address strategy, address assetAddr, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) whenNotPaused nonReentrant
    {
        require(acceptedAssets[assetAddr], "AxiomTreasuryVault: asset not accepted");
        if (assetAddr == asset()) {
            require(
                IERC20(assetAddr).balanceOf(address(this)) >= amount,
                "AxiomTreasuryVault: insufficient balance"
            );
        } else {
            require(idleBalance[assetAddr] >= amount, "AxiomTreasuryVault: insufficient idle");
            idleBalance[assetAddr] -= amount;
        }
        IERC20(assetAddr).safeTransfer(address(strategyManager), amount);
        strategyManager.fundPairedAsset(strategy, assetAddr, amount);
        emit StrategyAllocated(strategy, assetAddr, amount);
    }

    /**
     * @notice Recall `amount` from a strategy back to vault idle.
     *         Strategy sends funds directly to vault address (vault is the strategy's `vault` var).
     */
    function recallFromStrategy(address strategy, address assetAddr, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) whenNotPaused nonReentrant
    {
        uint256 received = strategyManager.recall(strategy, amount);
        if (assetAddr != asset()) {
            idleBalance[assetAddr] += received;
        }
        // Primary asset: vault's USDC balance increases automatically via transfer-to-vault in strategy.
        emit StrategyRecalled(strategy, assetAddr, received);
    }

    /**
     * @notice Harvest yield from a strategy; yield is sent directly to vault by strategy.
     */
    function harvest(address strategy, address assetAddr)
        external onlyRole(STRATEGY_ADMIN) nonReentrant
    {
        uint256 yieldAmount = strategyManager.harvest(strategy);
        if (yieldAmount > 0 && assetAddr != asset()) {
            idleBalance[assetAddr] += yieldAmount;
        }
        emit StrategyHarvested(strategy, assetAddr, yieldAmount);
    }

    /**
     * @notice Sentinel-gated rebalance: recall from `fromStrategy`, forward to `toStrategy`.
     *
     *         Safe for both single-asset and multi-asset strategies:
     *           1. Snapshot `assetAddr` balance before recall
     *           2. SM.recall(from) → strategy sends tokens to vault
     *              (multi-asset strategies, e.g. CamelotStrategy, may return TWO tokens)
     *           3. Compute `assetReceived` = balance delta for `assetAddr` only
     *              → any secondary tokens (e.g. AXUSD from a USDC Camelot recall)
     *                 remain in vault and can be reconciled via syncIdleBalance()
     *           4. Forward `assetReceived` of `assetAddr` to SM → destination strategy
     *
     *         This prevents the double-count / transfer-failure that would occur if
     *         the `received` return value (which may combine two token types) were used
     *         directly as an `assetAddr`-denominated transfer amount.
     */
    function rebalance(
        address fromStrategy,
        address toStrategy,
        address assetAddr,
        uint256 amount
    ) external onlyRole(SENTINEL_EXECUTOR) whenNotPaused nonReentrant {
        require(acceptedAssets[assetAddr], "AxiomTreasuryVault: asset not accepted");

        // Snapshot before recall to measure what actually arrives as assetAddr.
        uint256 assetBefore   = IERC20(assetAddr).balanceOf(address(this));
        strategyManager.recall(fromStrategy, amount);
        uint256 assetAfter    = IERC20(assetAddr).balanceOf(address(this));
        uint256 assetReceived = assetAfter > assetBefore ? assetAfter - assetBefore : 0;

        require(assetReceived > 0, "AxiomTreasuryVault: assetAddr not received from recall");

        IERC20(assetAddr).safeTransfer(address(strategyManager), assetReceived);
        strategyManager.allocateAsset(toStrategy, assetAddr, assetReceived);
        emit Rebalanced(fromStrategy, toStrategy, assetReceived);
    }

    /**
     * @notice Reconcile `idleBalance[assetAddr]` with the contract's actual ERC20 balance.
     *
     *         Required after a multi-asset LP recall (e.g. CamelotStrategy returns both
     *         USDC and AXUSD): only the `assetAddr` specified in vault.rebalance() is
     *         forwarded to the destination strategy — the remaining secondary token
     *         (e.g. AXUSD) arrives in the vault but is not automatically credited to
     *         idleBalance.  Call syncIdleBalance(AXUSD) afterward to reconcile.
     *
     *         NOT applicable to the primary ERC-4626 asset (USDC) — use ERC-4626
     *         accounting (totalAssets / balanceOf) for that.
     *
     * @param  assetAddr  Secondary accepted asset (e.g. AXUSD) to reconcile.
     */
    function syncIdleBalance(address assetAddr) external onlyRole(VAULT_ADMIN) {
        require(assetAddr != asset(), "AxiomTreasuryVault: use ERC-4626 accounting for primary asset");
        require(acceptedAssets[assetAddr], "AxiomTreasuryVault: asset not accepted");
        uint256 actual = IERC20(assetAddr).balanceOf(address(this));
        idleBalance[assetAddr] = actual;
        emit IdleBalanceSynced(assetAddr, actual);
    }

    /**
     * @notice Emergency full exit from a strategy — vault holds DEFAULT_ADMIN_ROLE
     *         on strategy adapters, so it can call emergencyWithdraw() directly.
     */
    function emergencyWithdrawFromStrategy(address strategy, address assetAddr)
        external onlyRole(VAULT_ADMIN) nonReentrant
    {
        uint256 amount = IStrategy(strategy).emergencyWithdraw();
        if (assetAddr != asset()) {
            idleBalance[assetAddr] += amount;
        }
        emit EmergencyWithdraw(strategy, amount);
    }
}
