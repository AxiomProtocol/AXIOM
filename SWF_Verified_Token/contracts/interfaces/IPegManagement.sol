// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title IPegManagement
 * @dev Interface for peg management functionality
 */
interface IPegManagement {
    /**
     * @dev Returns the price of an asset
     * @param symbol The asset symbol
     * @return price The current price of the asset
     */
    function getAssetPrice(string memory symbol) external view returns (uint256 price);
    
    /**
     * @dev Returns the value of the entire basket
     * @return basketValue The current value of the entire basket
     */
    function getBasketValue() external view returns (uint256 basketValue);
    
    /**
     * @dev Updates the reserve balance for a specific asset
     * @param symbol The asset symbol
     * @param newBalance The new reserve balance
     */
    function updateReserveBalance(string memory symbol, uint256 newBalance) external;
    
    /**
     * @dev Returns information about a specific asset
     * @param symbol The asset symbol
     * @return weight Weight in the basket
     * @return price Current price
     * @return reserveBalance Current reserve balance
     * @return reserveRatio Required reserve ratio
     */
    function getAssetInfo(string memory symbol) 
        external 
        view 
        returns (
            uint256 weight,
            uint256 price,
            uint256 reserveBalance,
            uint256 reserveRatio
        );
}