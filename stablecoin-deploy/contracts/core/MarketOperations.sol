// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAxiomStable.sol";
import "../interfaces/IBackstopVault.sol";
import "../interfaces/IMarketOperations.sol";

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract MarketOperations is AccessControl, ReentrancyGuard, Pausable, IMarketOperations {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    IAxiomStable public immutable axusd;
    IERC20 public immutable collateral;
    IUniswapV2Router public immutable router;
    IUniswapV2Pair public immutable pair;
    IBackstopVault public backstopVault;
    
    uint8 public immutable collateralDecimals;
    uint256 public immutable decimalScaler;

    uint256 public lowerPegBound;
    uint256 public upperPegBound;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant PEG_TARGET = 1e18;

    uint256 public dailyBuyLimit;
    uint256 public dailySellLimit;
    uint256 public dailyBuyUsed;
    uint256 public dailySellUsed;
    uint256 public lastResetTimestamp;

    bool public axusdIsToken0;

    event DailyLimitsUpdated(uint256 buyLimit, uint256 sellLimit);
    event BackstopVaultUpdated(address indexed newVault);

    constructor(
        address _axusd,
        address _collateral,
        uint8 _collateralDecimals,
        address _router,
        address _pair,
        uint256 _lowerBound,
        uint256 _upperBound,
        uint256 _dailyBuyLimit,
        uint256 _dailySellLimit
    ) {
        require(_axusd != address(0), "MarketOps: zero axusd");
        require(_collateral != address(0), "MarketOps: zero collateral");
        require(_router != address(0), "MarketOps: zero router");
        require(_pair != address(0), "MarketOps: zero pair");
        require(_lowerBound < PEG_TARGET, "MarketOps: invalid lower bound");
        require(_upperBound > PEG_TARGET, "MarketOps: invalid upper bound");

        axusd = IAxiomStable(_axusd);
        collateral = IERC20(_collateral);
        collateralDecimals = _collateralDecimals;
        decimalScaler = 10 ** (18 - _collateralDecimals);
        router = IUniswapV2Router(_router);
        pair = IUniswapV2Pair(_pair);

        lowerPegBound = _lowerBound;
        upperPegBound = _upperBound;
        dailyBuyLimit = _dailyBuyLimit;
        dailySellLimit = _dailySellLimit;
        lastResetTimestamp = block.timestamp;

        axusdIsToken0 = pair.token0() == _axusd;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }

    function _resetDailyLimitsIfNeeded() internal {
        if (block.timestamp >= lastResetTimestamp + 1 days) {
            dailyBuyUsed = 0;
            dailySellUsed = 0;
            lastResetTimestamp = block.timestamp;
        }
    }

    function defendPegBuy(
        uint256 axusdAmount,
        uint256 minCollateralOut
    ) external override nonReentrant whenNotPaused onlyRole(OPERATOR_ROLE) {
        require(axusdAmount > 0, "MarketOps: zero amount");
        
        uint256 currentPrice = getCurrentPrice();
        require(currentPrice > upperPegBound, "MarketOps: peg not above bound");

        _resetDailyLimitsIfNeeded();
        require(dailyBuyUsed + axusdAmount <= dailyBuyLimit, "MarketOps: daily buy limit");

        axusd.mint(address(this), axusdAmount);

        IERC20(address(axusd)).approve(address(router), axusdAmount);

        address[] memory path = new address[](2);
        path[0] = address(axusd);
        path[1] = address(collateral);

        uint256[] memory amounts = router.swapExactTokensForTokens(
            axusdAmount,
            minCollateralOut,
            path,
            address(this),
            block.timestamp + 300
        );

        dailyBuyUsed += axusdAmount;

        uint256 newPrice = getCurrentPrice();
        emit PegDefenseExecuted(axusdAmount, amounts[1], newPrice);
    }

    function defendPegSell(
        uint256 collateralAmount,
        uint256 minAxusdOut
    ) external override nonReentrant whenNotPaused onlyRole(OPERATOR_ROLE) {
        require(collateralAmount > 0, "MarketOps: zero amount");

        uint256 currentPrice = getCurrentPrice();
        require(currentPrice < lowerPegBound, "MarketOps: peg not below bound");

        _resetDailyLimitsIfNeeded();
        require(dailySellUsed + collateralAmount <= dailySellLimit, "MarketOps: daily sell limit");

        require(collateral.balanceOf(address(this)) >= collateralAmount, "MarketOps: insufficient collateral");

        collateral.approve(address(router), collateralAmount);

        address[] memory path = new address[](2);
        path[0] = address(collateral);
        path[1] = address(axusd);

        uint256[] memory amounts = router.swapExactTokensForTokens(
            collateralAmount,
            minAxusdOut,
            path,
            address(this),
            block.timestamp + 300
        );

        axusd.burn(address(this), amounts[1]);

        dailySellUsed += collateralAmount;

        uint256 newPrice = getCurrentPrice();
        emit PegDefenseExecuted(amounts[1], collateralAmount, newPrice);
    }

    function provideLiquidity(
        uint256 axusdAmount,
        uint256 collateralAmount,
        uint256 minLpTokens
    ) external override nonReentrant whenNotPaused onlyRole(OPERATOR_ROLE) {
        require(axusdAmount > 0 && collateralAmount > 0, "MarketOps: zero amounts");

        axusd.mint(address(this), axusdAmount);

        require(collateral.balanceOf(address(this)) >= collateralAmount, "MarketOps: insufficient collateral");

        IERC20(address(axusd)).approve(address(router), axusdAmount);
        collateral.approve(address(router), collateralAmount);

        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            address(axusd),
            address(collateral),
            axusdAmount,
            collateralAmount,
            (axusdAmount * 95) / 100,
            (collateralAmount * 95) / 100,
            address(this),
            block.timestamp + 300
        );

        require(liquidity >= minLpTokens, "MarketOps: insufficient LP");

        emit LiquidityProvided(address(pair), amountA, amountB);
    }

    function removeLiquidity(
        uint256 lpTokens,
        uint256 minAxusd,
        uint256 minCollateral
    ) external override nonReentrant whenNotPaused onlyRole(OPERATOR_ROLE) {
        require(lpTokens > 0, "MarketOps: zero LP tokens");

        IERC20(address(pair)).approve(address(router), lpTokens);

        (uint256 amountAxusd, uint256 amountCollateral) = router.removeLiquidity(
            address(axusd),
            address(collateral),
            lpTokens,
            minAxusd,
            minCollateral,
            address(this),
            block.timestamp + 300
        );

        axusd.burn(address(this), amountAxusd);

        emit LiquidityRemoved(address(pair), lpTokens);
    }

    function getCurrentPrice() public view override returns (uint256) {
        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();

        if (reserve0 == 0 || reserve1 == 0) return PEG_TARGET;

        if (axusdIsToken0) {
            uint256 collateralReserveNormalized = uint256(reserve1) * decimalScaler;
            return (collateralReserveNormalized * PRECISION) / uint256(reserve0);
        } else {
            uint256 collateralReserveNormalized = uint256(reserve0) * decimalScaler;
            return (collateralReserveNormalized * PRECISION) / uint256(reserve1);
        }
    }

    function isPegDefenseNeeded() external view override returns (bool) {
        uint256 price = getCurrentPrice();
        return price < lowerPegBound || price > upperPegBound;
    }

    function setPriceThresholds(uint256 _lowerBound, uint256 _upperBound) external onlyRole(ADMIN_ROLE) {
        require(_lowerBound < PEG_TARGET, "MarketOps: invalid lower");
        require(_upperBound > PEG_TARGET, "MarketOps: invalid upper");
        lowerPegBound = _lowerBound;
        upperPegBound = _upperBound;
        emit PriceThresholdUpdated(_lowerBound, _upperBound);
    }

    function setDailyLimits(uint256 _buyLimit, uint256 _sellLimit) external onlyRole(ADMIN_ROLE) {
        dailyBuyLimit = _buyLimit;
        dailySellLimit = _sellLimit;
        emit DailyLimitsUpdated(_buyLimit, _sellLimit);
    }

    function setBackstopVault(address _vault) external onlyRole(ADMIN_ROLE) {
        require(_vault != address(0), "MarketOps: zero vault");
        backstopVault = IBackstopVault(_vault);
        emit BackstopVaultUpdated(_vault);
    }

    function withdrawCollateral(address recipient, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(recipient != address(0), "MarketOps: zero recipient");
        collateral.safeTransfer(recipient, amount);
    }

    function getRemainingLimits() external view returns (uint256 buyRemaining, uint256 sellRemaining) {
        if (block.timestamp >= lastResetTimestamp + 1 days) {
            return (dailyBuyLimit, dailySellLimit);
        }
        buyRemaining = dailyBuyLimit > dailyBuyUsed ? dailyBuyLimit - dailyBuyUsed : 0;
        sellRemaining = dailySellLimit > dailySellUsed ? dailySellLimit - dailySellUsed : 0;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
