// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStrategy
 * @notice Interface that every Axiom Treasury strategy adapter must implement.
 *         The StrategyManager calls these functions to deploy capital, harvest
 *         yield, and perform emergency exits.
 */
interface IStrategy {
    /// @notice The ERC-20 asset this strategy operates on (e.g. USDC).
    function asset() external view returns (address);

    /// @notice The AxiomTreasuryVault that owns this strategy.
    function vault() external view returns (address);

    /// @notice Current market value of the deployed position in `asset` units.
    function currentValue() external view returns (uint256);

    /// @notice Total principal deployed into this strategy in `asset` units.
    function principal() external view returns (uint256);

    /// @notice Unrealized yield = currentValue - principal (may be negative as int256).
    function unrealizedYield() external view returns (int256);

    /// @notice Timestamp of the last rebalance / deployment operation.
    function lastRebalancedAt() external view returns (uint256);

    /**
     * @notice Deploy `amount` of `asset` into the underlying protocol.
     * @dev    Caller must have transferred `amount` to this contract first,
     *         or the adapter pulls from the vault via transferFrom.
     */
    function deploy(uint256 amount) external;

    /**
     * @notice Withdraw `amount` of `asset` from the underlying protocol
     *         back to the vault.
     * @return actualAmount The amount actually returned (may differ for fee-on-exit).
     */
    function withdraw(uint256 amount) external returns (uint256 actualAmount);

    /**
     * @notice Harvest accumulated yield from the underlying protocol,
     *         sending it to the vault.
     * @return yieldAmount The amount of yield harvested in `asset` units.
     */
    function harvest() external returns (uint256 yieldAmount);

    /**
     * @notice Emergency full exit — withdraw all funds to the vault regardless
     *         of slippage or partial fills.
     * @return amount Total amount returned to the vault.
     */
    function emergencyWithdraw() external returns (uint256 amount);
}
