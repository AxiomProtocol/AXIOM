// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

/**
 * @notice Minimal ERC-4626 interface — all Euler v2 vaults implement this.
 */
interface IEulerVault {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function maxWithdraw(address owner) external view returns (uint256);
    function maxRedeem(address owner) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function asset() external view returns (address);
}

/**
 * @title  EulerV2Strategy
 * @notice Generic IStrategy adapter that supplies vault capital into any Euler v2
 *         ERC-4626 lending vault on Arbitrum One and harvests yield back to the vault.
 *
 *         Deploy one instance per Euler market; register each with the StrategyManager
 *         under a distinct name.  Supports any asset (USDC, WETH, thBILL, etc.) as
 *         long as the asset matches the Euler vault's underlying.
 *
 * Arbitrum One — confirmed market vault addresses (2026-05)
 * ──────────────────────────────────────────────────────────
 *   WETH  — K3 Capital Arbitrum Market : 0x78E3E051D32157AACD550fBB78458762d8f7edFF
 *   USDC  — K3 Capital Theo Market     : see EULER_USDC_THEO_VAULT env var
 *   thBILL — K3 Capital Theo Market    : see EULER_THBILL_THEO_VAULT env var
 *
 * Capital flow (example — USDC Theo market):
 *   vault.allocate(eulerUsdcStrategy, USDC, amount)
 *   → SM.allocateAsset(eulerUsdcStrategy, USDC, amount)
 *   → EulerV2Strategy.deploy(amount)          — USDC deposited into Euler vault
 *   → Euler vault mints eVault shares to strategy
 *   → yield accrues per-block via share price appreciation
 *   → harvest() withdraws yield (maxWithdraw - principal) to vault
 *
 * Harvest mechanics
 * ─────────────────
 *   Euler yield is implicit: share price rises over time.
 *   currentValue()  = eulerVault.maxWithdraw(address(this))
 *   yield           = currentValue() - principal
 *   harvest()       = withdraw(yield, vault, address(this))
 */
contract EulerV2Strategy is IStrategy, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant VAULT_ADMIN       = keccak256("VAULT_ADMIN");
    bytes32 public constant STRATEGY_ADMIN    = keccak256("STRATEGY_ADMIN");
    bytes32 public constant SENTINEL_EXECUTOR = keccak256("SENTINEL_EXECUTOR");

    // ── Immutables ────────────────────────────────────────────────────────────
    /// @inheritdoc IStrategy
    address public immutable override asset;
    /// @inheritdoc IStrategy
    address public immutable override vault;
    /// @notice The Euler v2 ERC-4626 vault this strategy deposits into.
    IEulerVault public immutable eulerVault;

    // ── State ─────────────────────────────────────────────────────────────────
    /// @inheritdoc IStrategy
    uint256 public override principal;
    /// @inheritdoc IStrategy
    uint256 public override lastRebalancedAt;

    // ── Events ────────────────────────────────────────────────────────────────
    event Deployed(uint256 amount, uint256 sharesReceived);
    event Withdrawn(uint256 requested, uint256 actual);
    event Harvested(uint256 yieldAmount);
    event EmergencyExit(uint256 amount);

    /**
     * @param _vault       AxiomTreasuryVault address (gets DEFAULT_ADMIN_ROLE).
     * @param _asset       Underlying ERC-20 token (must match eulerVault.asset()).
     * @param _eulerVault  Deployed Euler v2 ERC-4626 vault for this market.
     * @param _manager     StrategyManager address (gets STRATEGY_ADMIN).
     */
    constructor(
        address _vault,
        address _asset,
        address _eulerVault,
        address _manager
    ) {
        require(_vault     != address(0), "EulerV2Strategy: zero vault");
        require(_asset     != address(0), "EulerV2Strategy: zero asset");
        require(_eulerVault != address(0), "EulerV2Strategy: zero eulerVault");
        require(_manager   != address(0), "EulerV2Strategy: zero manager");
        require(
            IEulerVault(_eulerVault).asset() == _asset,
            "EulerV2Strategy: asset mismatch"
        );

        vault      = _vault;
        asset      = _asset;
        eulerVault = IEulerVault(_eulerVault);

        _grantRole(DEFAULT_ADMIN_ROLE, _vault);
        _grantRole(STRATEGY_ADMIN,     _manager);
    }

    // ── IStrategy implementation ──────────────────────────────────────────────

    /**
     * @notice Current market value = max USDC/WETH/etc withdrawable from Euler.
     *         Euler yield is implicit in rising share price, so this grows
     *         automatically without any claim transaction.
     */
    function currentValue() external view override returns (uint256) {
        return eulerVault.maxWithdraw(address(this));
    }

    /**
     * @notice Unrealized yield = current withdrawable value minus recorded principal.
     *         Can be negative if Euler vault suffers a loss (unlikely for lending-only).
     */
    function unrealizedYield() external view override returns (int256) {
        return int256(eulerVault.maxWithdraw(address(this))) - int256(principal);
    }

    /**
     * @notice Deploy `amount` of `asset` into the Euler vault.
     *         StrategyManager transfers `amount` to this contract before calling.
     */
    function deploy(uint256 amount) external override onlyRole(STRATEGY_ADMIN) nonReentrant {
        require(amount > 0, "EulerV2Strategy: zero amount");
        IERC20(asset).forceApprove(address(eulerVault), amount);
        uint256 shares = eulerVault.deposit(amount, address(this));
        principal        += amount;
        lastRebalancedAt  = block.timestamp;
        emit Deployed(amount, shares);
    }

    /**
     * @notice Withdraw `amount` of `asset` from the Euler vault back to the vault.
     *         Uses ERC-4626 withdraw() which takes an asset amount (not shares).
     */
    function withdraw(uint256 amount) external override onlyRole(STRATEGY_ADMIN) nonReentrant returns (uint256 actualAmount) {
        require(amount > 0, "EulerV2Strategy: zero amount");
        // ERC-4626 withdraw: burns the minimum shares needed to return `amount` assets.
        // Actual amount delivered = amount (exact-output), but cap at maxWithdraw for safety.
        uint256 withdrawable = eulerVault.maxWithdraw(address(this));
        uint256 toWithdraw   = amount > withdrawable ? withdrawable : amount;
        require(toWithdraw > 0, "EulerV2Strategy: nothing withdrawable");

        actualAmount = toWithdraw;
        eulerVault.withdraw(toWithdraw, vault, address(this));

        if (principal >= toWithdraw) {
            principal -= toWithdraw;
        } else {
            principal = 0;
        }
        lastRebalancedAt = block.timestamp;
        emit Withdrawn(amount, actualAmount);
    }

    /**
     * @notice Harvest yield above principal to the vault.
     *         Euler yield is implicit — maxWithdraw(this) grows above principal
     *         as the share price rises.  We withdraw only the excess.
     */
    function harvest() external override onlyRole(STRATEGY_ADMIN) nonReentrant returns (uint256 yieldAmount) {
        uint256 current = eulerVault.maxWithdraw(address(this));
        if (current <= principal) return 0;
        yieldAmount = current - principal;
        eulerVault.withdraw(yieldAmount, vault, address(this));
        emit Harvested(yieldAmount);
        // principal unchanged — only surplus is extracted
    }

    /**
     * @notice Emergency full exit — redeem all shares, send everything to vault.
     *         Called by AxiomTreasuryVault.emergencyWithdrawFromStrategy() which
     *         holds DEFAULT_ADMIN_ROLE.
     */
    function emergencyWithdraw() external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant returns (uint256 amount) {
        uint256 shares = eulerVault.maxRedeem(address(this));
        if (shares == 0) return 0;
        amount           = eulerVault.redeem(shares, vault, address(this));
        principal        = 0;
        lastRebalancedAt = block.timestamp;
        emit EmergencyExit(amount);
    }
}
