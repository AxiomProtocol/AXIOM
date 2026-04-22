// SPDX-License-Identifier: GPL-2.0-or-later
// Adapted from Euler V2 — https://github.com/euler-xyz/evk-periphery
pragma solidity ^0.8.24;

/// @title IRMLinearKink
/// @notice Stateless linear-kink interest rate model compatible with Euler V2 EVK vaults.
///         Constructor parameters are immutably baked in so each deployment is unique.
///         Rate unit: WAD/second (1e18 = 100% per second, astronomically high in practice).
contract IRMLinearKink {
    uint256 public immutable baseRate;   // WAD/s rate at 0% utilization
    uint256 public immutable slope1;     // WAD/s rate added per 100% utilization up to kink
    uint256 public immutable slope2;     // WAD/s rate added per 100% utilization above kink
    uint256 public immutable kink;       // WAD utilization at which slope changes (e.g. 0.8e18 = 80%)

    constructor(
        uint256 _baseRate,
        uint256 _slope1,
        uint256 _slope2,
        uint256 _kink
    ) {
        require(_kink <= 1e18, "IRMLinearKink: kink > 1");
        baseRate = _baseRate;
        slope1   = _slope1;
        slope2   = _slope2;
        kink     = _kink;
    }

    /// @notice Returns the borrow rate per second (WAD) given current utilization.
    /// @param cash    Amount of idle assets in the vault
    /// @param borrows Amount of outstanding borrows
    function computeInterestRate(address, uint256 cash, uint256 borrows) external view returns (uint256) {
        return _computeRate(cash, borrows);
    }

    /// @notice Same as computeInterestRate — some EVK versions use this name
    function interestRate(address, uint256 cash, uint256 borrows) external view returns (uint256) {
        return _computeRate(cash, borrows);
    }

    function _computeRate(uint256 cash, uint256 borrows) internal view returns (uint256) {
        uint256 total = cash + borrows;
        if (total == 0) return baseRate;

        uint256 util = (borrows * 1e18) / total; // WAD utilization

        if (util <= kink) {
            // Linear from baseRate to baseRate + slope1 at kink
            return baseRate + (slope1 * util) / 1e18;
        } else {
            // Base rate at kink + additional slope2 above kink
            uint256 rateAtKink = baseRate + slope1;
            return rateAtKink + (slope2 * (util - kink)) / (1e18 - kink);
        }
    }
}
