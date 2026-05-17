// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

/**
 * @notice Minimal Aave v3 Pool interface — only functions this adapter needs.
 */
interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/**
 * @title  AaveV3Strategy
 * @notice Generic IStrategy adapter that supplies vault capital into any Aave v3
 *         lending market on Arbitrum One and harvests yield back to the vault.
 *
 *         The adapter is fully parameterised at construction — deploy one instance
 *         per Aave market (USDC, AXUSD, USDT, etc.) and register each with the
 *         StrategyManager under a distinct name.
 *
 * Arbitrum One market addresses (verified 2026-05)
 * ──────────────────────────────────────────────────
 *   Aave v3 Pool     : 0x794a61358D6845594F94dc1DB02A252b5b4814aD
 *
 *   USDC market
 *     asset  (USDC)  : 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
 *     aToken (aUSDC) : 0x724dc807b04555b71ed48a6896b6F41593b8C637
 *
 *   AXUSD market (deploy a second instance for AXUSD Aave yield)
 *     asset  (AXUSD) : see contracts.ts / NEXT_PUBLIC_AXUSD_ADDRESS env var
 *     aToken (aAXUSD): set via AAVE_V3_AXUSD_ATOKEN env var at deploy time
 *
 * Capital flows for AXUSD market via multi-asset SM:
 *   vault.depositToken(AXUSD, amt)                         — AXUSD enters vault
 *   vault.allocate(axusdAaveStrategy, AXUSD, amt)          — calls SM.allocateAsset
 *   SM.allocateAsset(axusdAaveStrategy, AXUSD, amt)        — forwards AXUSD + deploy()
 *   AaveV3Strategy(AXUSD).deploy(amt)                      — supply to Aave AXUSD market
 */
contract AaveV3Strategy is IStrategy, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// Role constants — must match AxiomTreasuryVault and StrategyManager exactly.
    /// Only STRATEGY_ADMIN is granted/used here (to the StrategyManager).
    bytes32 public constant VAULT_ADMIN       = keccak256("VAULT_ADMIN");
    bytes32 public constant STRATEGY_ADMIN    = keccak256("STRATEGY_ADMIN");
    bytes32 public constant SENTINEL_EXECUTOR = keccak256("SENTINEL_EXECUTOR");

    // ── Immutables ────────────────────────────────────────────────────────────
    address public immutable override asset;
    address public immutable override vault;
    IAavePool public immutable aavePool;
    IERC20 public immutable aToken;

    // ── State ─────────────────────────────────────────────────────────────────
    uint256 public override principal;
    uint256 public override lastRebalancedAt;

    // ── Events ────────────────────────────────────────────────────────────────
    event Deployed(uint256 amount);
    event Withdrawn(uint256 requested, uint256 actual);
    event Harvested(uint256 yieldAmount);
    event EmergencyExit(uint256 amount);

    constructor(
        address _vault,
        address _asset,
        address _aavePool,
        address _aToken,
        address manager
    ) {
        vault    = _vault;
        asset    = _asset;
        aavePool = IAavePool(_aavePool);
        aToken   = IERC20(_aToken);
        _grantRole(DEFAULT_ADMIN_ROLE, _vault);
        _grantRole(STRATEGY_ADMIN, manager);  // manager = StrategyManager address
    }

    // ── IStrategy implementation ──────────────────────────────────────────────

    function currentValue() external view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    function unrealizedYield() external view override returns (int256) {
        return int256(aToken.balanceOf(address(this))) - int256(principal);
    }

    /**
     * @notice Deploy `amount` of `asset` into Aave v3.
     *         Caller must have already transferred `amount` to this contract.
     */
    function deploy(uint256 amount) external override onlyRole(STRATEGY_ADMIN) nonReentrant {
        require(amount > 0, "AaveV3Strategy: zero amount");
        IERC20(asset).forceApprove(address(aavePool), amount);
        aavePool.supply(asset, amount, address(this), 0);
        principal += amount;
        lastRebalancedAt = block.timestamp;
        emit Deployed(amount);
    }

    /**
     * @notice Withdraw `amount` from Aave back to the vault.
     */
    function withdraw(uint256 amount) external override onlyRole(STRATEGY_ADMIN) nonReentrant returns (uint256 actualAmount) {
        require(amount > 0, "AaveV3Strategy: zero amount");
        actualAmount = aavePool.withdraw(asset, amount, vault);
        if (principal >= actualAmount) {
            principal -= actualAmount;
        } else {
            principal = 0;
        }
        lastRebalancedAt = block.timestamp;
        emit Withdrawn(amount, actualAmount);
    }

    /**
     * @notice Harvest yield (aToken balance > principal) to the vault.
     */
    function harvest() external override onlyRole(STRATEGY_ADMIN) nonReentrant returns (uint256 yieldAmount) {
        uint256 current = aToken.balanceOf(address(this));
        if (current <= principal) return 0;
        yieldAmount = current - principal;
        aavePool.withdraw(asset, yieldAmount, vault);
        emit Harvested(yieldAmount);
    }

    /**
     * @notice Emergency full exit — withdraw everything to the vault.
     */
    function emergencyWithdraw() external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant returns (uint256 amount) {
        amount = aavePool.withdraw(asset, type(uint256).max, vault);
        principal = 0;
        lastRebalancedAt = block.timestamp;
        emit EmergencyExit(amount);
    }
}
