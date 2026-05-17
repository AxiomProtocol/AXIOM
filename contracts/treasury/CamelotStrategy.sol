// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

/**
 * @notice Minimal Camelot V3 NonFungiblePositionManager interface.
 */
interface ICamelotPositionManager {
    struct MintParams {
        address token0;
        address token1;
        int24   tickLower;
        int24   tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    function mint(MintParams calldata params) external returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
    function collect(CollectParams calldata params) external returns (uint256 amount0, uint256 amount1);
    function decreaseLiquidity(DecreaseLiquidityParams calldata params) external returns (uint256 amount0, uint256 amount1);
    function positions(uint256 tokenId) external view returns (
        uint96 nonce, address operator, address token0, address token1,
        int24 tickLower, int24 tickUpper, uint128 liquidity,
        uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128,
        uint128 tokensOwed0, uint128 tokensOwed1
    );
}

/**
 * @title  CamelotStrategy
 * @notice IStrategy adapter that provides AXUSD/USDC concentrated liquidity
 *         on Camelot V3 (Arbitrum One).
 *
 * Arbitrum One addresses (verified 2026-05)
 * ─────────────────────────────────────────
 *   Camelot V3 NonfungiblePositionManager :
 *       0x00c7f3082833e796A5b3e4Bd59f6642FF44DCD46
 *   USDC   : 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
 *   AXUSD  : set at deploy time (ERC-3643 token address)
 *
 * Position strategy
 * ─────────────────
 * • Full-range position to maximise capital efficiency for a stable pair.
 * • AXUSD is token1 (sorted by address at deploy time).
 * • Fees accumulated in the position are harvested to the vault.
 * • Only the manager role (StrategyManager) may call deploy / withdraw / harvest.
 */
contract CamelotStrategy is IStrategy, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// Role constants — must match AxiomTreasuryVault and StrategyManager exactly.
    /// Only STRATEGY_ADMIN is granted/used here (to the StrategyManager).
    bytes32 public constant VAULT_ADMIN       = keccak256("VAULT_ADMIN");
    bytes32 public constant STRATEGY_ADMIN    = keccak256("STRATEGY_ADMIN");
    bytes32 public constant SENTINEL_EXECUTOR = keccak256("SENTINEL_EXECUTOR");

    // ── Immutables ────────────────────────────────────────────────────────────
    address public immutable override asset;  // primary deployment asset (USDC)
    address public immutable override vault;
    address public immutable pairedAsset;      // AXUSD
    ICamelotPositionManager public immutable positionManager;

    // ── State ─────────────────────────────────────────────────────────────────
    uint256 public tokenId;                    // active LP position token ID (0 = no position)
    uint256 public override principal;         // USDC (primary asset) contributed to active LP
    uint256 public pairedPrincipal;            // AXUSD (paired asset) contributed to active LP
    uint256 public override lastRebalancedAt;

    // Full-range ticks for a concentrated liquidity pool
    int24 public constant TICK_LOWER = -887272;
    int24 public constant TICK_UPPER =  887272;
    uint256 private constant DEADLINE_BUFFER = 15 minutes;

    // ── Events ────────────────────────────────────────────────────────────────
    event PositionMinted(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
    event Withdrawn(uint256 tokenId, uint256 amount0, uint256 amount1);
    event Harvested(uint256 fees0, uint256 fees1, uint256 yieldAssetAmount);
    event EmergencyExit(uint256 amount0, uint256 amount1);

    constructor(
        address _vault,
        address _asset,
        address _pairedAsset,
        address _positionManager,
        address manager
    ) {
        vault           = _vault;
        asset           = _asset;
        pairedAsset     = _pairedAsset;
        positionManager = ICamelotPositionManager(_positionManager);
        _grantRole(DEFAULT_ADMIN_ROLE, _vault);
        _grantRole(STRATEGY_ADMIN, manager);  // manager = StrategyManager address
    }

    // ── IStrategy implementation ──────────────────────────────────────────────

    /**
     * @notice USD-equivalent value locked in this strategy:
     *
     *   principal       — USDC contributed to LP (tracked from actual used0/used1)
     *   pairedPrincipal — AXUSD contributed to LP (1:1 USD peg for a stable pair)
     *   owed0 + owed1   — accumulated fee revenues pending collection
     *
     * This ensures StrategyManager.totalDeployed(USDC) captures the full two-sided
     * LP position value when CamelotStrategy is registered with primary asset = USDC.
     */
    function currentValue() external view override returns (uint256) {
        if (tokenId == 0) return 0;
        (, , , , , , , , , uint128 owed0, uint128 owed1) =
            positionManager.positions(tokenId);
        return principal + pairedPrincipal + uint256(owed0) + uint256(owed1);
    }

    function unrealizedYield() external view override returns (int256) {
        if (tokenId == 0) return 0;
        (, , , , , , , , , uint128 owed0, uint128 owed1) =
            positionManager.positions(tokenId);
        return int256(uint256(owed0) + uint256(owed1));
    }

    /**
     * @notice Deploy into a two-sided USDC/AXUSD Camelot V3 LP position.
     *
     * Capital model
     * ─────────────
     * The StrategyManager sends `amount` USDC to this contract before calling
     * deploy(). The AXUSD side MUST be pre-funded by the vault admin via a
     * direct transfer (or vault.rebalance()) before calling deploy() — an LP
     * position on a stable pair requires both tokens to mint non-zero liquidity.
     *
     * deploy() uses the full live USDC and AXUSD balances of this contract so
     * that any leftover amounts from a prior partial harvest are included. The
     * `amount` parameter acts as a minimum USDC check; principal is tracked as
     * the total USDC contributed.
     *
     * @dev Reverts with "CamelotStrategy: zero liquidity minted" when the pool
     *      returns liquidity == 0, which would happen if AXUSD has not been
     *      pre-funded. This prevents a silent zero-value deployment.
     */
    function deploy(uint256 amount) external override onlyRole(STRATEGY_ADMIN) nonReentrant {
        require(amount > 0, "CamelotStrategy: zero amount");
        require(tokenId == 0, "CamelotStrategy: position already open; withdraw first");

        // Use the full live balances of both tokens held by this strategy.
        uint256 usdcBal  = IERC20(asset).balanceOf(address(this));
        uint256 axusdBal = IERC20(pairedAsset).balanceOf(address(this));
        require(usdcBal >= amount,  "CamelotStrategy: insufficient USDC; SM transfer may have failed");
        require(axusdBal > 0,       "CamelotStrategy: AXUSD not pre-funded; vault admin must transfer paired asset");

        // Determine canonical (token0, token1) order required by Algebra/Camelot V3.
        (address token0, address token1) = asset < pairedAsset
            ? (asset, pairedAsset)
            : (pairedAsset, asset);
        uint256 a0 = asset < pairedAsset ? usdcBal : axusdBal;
        uint256 a1 = asset < pairedAsset ? axusdBal : usdcBal;

        IERC20(token0).forceApprove(address(positionManager), a0);
        IERC20(token1).forceApprove(address(positionManager), a1);

        (uint256 tid, uint128 liquidity, uint256 used0, uint256 used1) = positionManager.mint(
            ICamelotPositionManager.MintParams({
                token0:         token0,
                token1:         token1,
                tickLower:      TICK_LOWER,
                tickUpper:      TICK_UPPER,
                amount0Desired: a0,
                amount1Desired: a1,
                amount0Min:     0,
                amount1Min:     0,
                recipient:      address(this),
                deadline:       block.timestamp + DEADLINE_BUFFER
            })
        );
        // Guard against a zero-liquidity mint (both tokens needed for stable pair).
        require(liquidity > 0, "CamelotStrategy: zero liquidity minted — check paired asset balance");
        tokenId = tid;

        // Track actual consumed amounts (not pre-mint wallet balances) so principal
        // reflects only capital genuinely locked in the LP, not dust or rounding.
        // Map used0/used1 back to USDC/AXUSD based on canonical sort order.
        uint256 usedUsdc  = asset < pairedAsset ? used0 : used1;
        uint256 usedAxusd = asset < pairedAsset ? used1 : used0;
        principal        += usedUsdc;
        pairedPrincipal  += usedAxusd;

        lastRebalancedAt = block.timestamp;
        emit PositionMinted(tid, liquidity, used0, used1);
    }

    /**
     * @notice Withdraw `amount` of `asset` from the LP position back to the vault.
     *
     * Partial withdrawal algorithm
     * ────────────────────────────
     *   proportion   = amount / currentValue()
     *   liquidityOut = positionLiquidity × proportion
     *
     * If amount ≥ currentValue() (full exit) the entire position is closed and
     * the NFT is burned. Otherwise a proportional share of liquidity is removed
     * and the position remains open.
     *
     * Note: Camelot V3 uses full-range ticks (−887272 / +887272) for the
     * USDC/AXUSD stable pair, so both r0 and r1 from collect() are in USDC-
     * equivalent units for an equal-weight stable pool.
     */
    function withdraw(uint256 amount) external override onlyRole(STRATEGY_ADMIN) nonReentrant returns (uint256 actualAmount) {
        require(tokenId != 0, "CamelotStrategy: no open position");
        require(amount > 0,   "CamelotStrategy: zero amount");

        // Inline currentValue() to avoid external-call overhead and reentrancy surface
        (, , , , , , uint128 posLiquidity, , , uint128 owed0, uint128 owed1) =
            positionManager.positions(tokenId);
        // Total position value = USDC principal + AXUSD principal + owed fees
        uint256 total = principal + pairedPrincipal + uint256(owed0) + uint256(owed1);

        // Full exit when amount covers the entire position value (or within dust)
        if (amount >= total || total == 0) {
            return _closeFullPosition(posLiquidity);
        }

        // Partial exit: remove proportional liquidity
        uint128 liquidityOut = uint128(uint256(posLiquidity) * amount / total);
        require(liquidityOut > 0, "CamelotStrategy: computed liquidity is zero");

        positionManager.decreaseLiquidity(ICamelotPositionManager.DecreaseLiquidityParams({
            tokenId:    tokenId,
            liquidity:  liquidityOut,
            amount0Min: 0,
            amount1Min: 0,
            deadline:   block.timestamp + DEADLINE_BUFFER
        }));
        (uint256 r0, uint256 r1) = positionManager.collect(ICamelotPositionManager.CollectParams({
            tokenId:    tokenId,
            recipient:  vault,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        }));
        actualAmount = r0 + r1;

        // Decrement principal and pairedPrincipal proportionally to the share exited.
        // Uses total pre-collection for the fraction so owed fees are included.
        if (total > 0) {
            uint256 fraction = actualAmount >= total ? 1e18 : actualAmount * 1e18 / total;
            uint256 primDecrement   = principal       * fraction / 1e18;
            uint256 pairedDecrement = pairedPrincipal * fraction / 1e18;
            if (primDecrement   > principal)       primDecrement   = principal;
            if (pairedDecrement > pairedPrincipal) pairedDecrement = pairedPrincipal;
            principal       -= primDecrement;
            pairedPrincipal -= pairedDecrement;
        }

        lastRebalancedAt = block.timestamp;
        emit Withdrawn(tokenId, r0, r1);
    }

    /**
     * @dev Close the full LP position and return all funds to vault.
     */
    function _closeFullPosition(uint128 liquidity) internal returns (uint256 actualAmount) {
        uint256 prevId = tokenId;
        positionManager.decreaseLiquidity(ICamelotPositionManager.DecreaseLiquidityParams({
            tokenId:    tokenId,
            liquidity:  liquidity,
            amount0Min: 0,
            amount1Min: 0,
            deadline:   block.timestamp + DEADLINE_BUFFER
        }));
        (uint256 r0, uint256 r1) = positionManager.collect(ICamelotPositionManager.CollectParams({
            tokenId:    tokenId,
            recipient:  vault,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        }));
        tokenId         = 0;
        principal       = 0;
        pairedPrincipal = 0;
        lastRebalancedAt = block.timestamp;
        actualAmount = r0 + r1;
        emit Withdrawn(prevId, r0, r1);
    }

    /**
     * @notice Harvest accumulated fees without closing the position.
     */
    function harvest() external override onlyRole(STRATEGY_ADMIN) nonReentrant returns (uint256 yieldAmount) {
        if (tokenId == 0) return 0;
        (uint256 f0, uint256 f1) = positionManager.collect(ICamelotPositionManager.CollectParams({
            tokenId:    tokenId,
            recipient:  vault,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        }));
        yieldAmount = f0 + f1;
        emit Harvested(f0, f1, yieldAmount);
    }

    /**
     * @notice Emergency full exit regardless of slippage.
     */
    function emergencyWithdraw() external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant returns (uint256 amount) {
        if (tokenId == 0) return 0;
        (, , , , , , uint128 liquidity, , , , ) = positionManager.positions(tokenId);
        positionManager.decreaseLiquidity(ICamelotPositionManager.DecreaseLiquidityParams({
            tokenId:    tokenId,
            liquidity:  liquidity,
            amount0Min: 0,
            amount1Min: 0,
            deadline:   block.timestamp + DEADLINE_BUFFER
        }));
        (uint256 r0, uint256 r1) = positionManager.collect(ICamelotPositionManager.CollectParams({
            tokenId:    tokenId,
            recipient:  vault,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        }));
        tokenId         = 0;
        principal       = 0;
        pairedPrincipal = 0;
        amount = r0 + r1;
        emit EmergencyExit(r0, r1);
    }

}
