// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library VaultMath {
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant PRECISION = 1e18;

    function calculateCollateralRatio(
        uint256 collateralValue,
        uint256 debtAmount
    ) internal pure returns (uint256) {
        if (debtAmount == 0) return type(uint256).max;
        return (collateralValue * BASIS_POINTS) / debtAmount;
    }

    function calculateAccruedInterest(
        uint256 principal,
        uint256 annualRateBps,
        uint256 timeElapsed
    ) internal pure returns (uint256) {
        if (principal == 0 || annualRateBps == 0 || timeElapsed == 0) return 0;
        return (principal * annualRateBps * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
    }

    function calculateLiquidationAmount(
        uint256 debtToCover,
        uint256 collateralPrice,
        uint256 liquidationPenaltyBps
    ) internal pure returns (uint256) {
        uint256 debtValue = debtToCover * PRECISION;
        uint256 penaltyMultiplier = BASIS_POINTS + liquidationPenaltyBps;
        return (debtValue * penaltyMultiplier) / (collateralPrice * BASIS_POINTS);
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}
