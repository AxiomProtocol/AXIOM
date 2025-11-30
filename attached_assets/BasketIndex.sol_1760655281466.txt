// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BasketIndex
 * @notice ERC20 token that represents a basket of underlying tokens with weighted allocations
 * @dev Allows for creating a token backed by multiple underlying assets
 */
contract BasketIndex is ERC20, Ownable {
    // Array of underlying asset addresses
    address[] public underlyingAssets;
    
    // Mapping of asset address to its weight in the basket (in basis points, 10000 = 100%)
    mapping(address => uint256) public assetWeights;
    
    // Total basis points allocated (should sum to 10000)
    uint256 public totalWeightBasis = 0;
    
    // Constant for basis points calculations
    uint256 public constant BASIS_POINTS = 10000;
    
    // Events
    event AssetsUpdated(address[] assets, uint256[] weights);
    event Rebalanced(uint256 timestamp);
    
    /**
     * @notice Constructs the BasketIndex contract
     * @param name The name of the basket token
     * @param symbol The symbol of the basket token
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender) {
        // Initialize with empty basket
    }
    
    /**
     * @notice Sets or updates the underlying assets and their weights
     * @param assets Array of token addresses in the basket
     * @param weights Array of weights for each token (in basis points, should sum to 10000)
     */
    function setAssets(address[] calldata assets, uint256[] calldata weights) external onlyOwner {
        require(assets.length == weights.length, "Assets and weights length mismatch");
        
        // Reset existing assets
        for (uint i = 0; i < underlyingAssets.length; i++) {
            assetWeights[underlyingAssets[i]] = 0;
        }
        
        // Clear the existing array
        delete underlyingAssets;
        
        // Reset total weight
        totalWeightBasis = 0;
        
        // Add new assets and weights
        for (uint i = 0; i < assets.length; i++) {
            require(assets[i] != address(0), "Invalid asset address");
            require(weights[i] > 0, "Weight must be greater than 0");
            
            underlyingAssets.push(assets[i]);
            assetWeights[assets[i]] = weights[i];
            totalWeightBasis += weights[i];
        }
        
        // Ensure weights sum to 100%
        require(totalWeightBasis == BASIS_POINTS, "Weights must sum to 10000 basis points (100%)");
        
        emit AssetsUpdated(assets, weights);
    }
    
    /**
     * @notice Mint basket tokens by depositing underlying assets
     * @param amount The amount of basket tokens to mint
     */
    function mint(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(underlyingAssets.length > 0, "No assets in basket");
        
        // For each underlying asset, transfer the proportional amount
        for (uint i = 0; i < underlyingAssets.length; i++) {
            address asset = underlyingAssets[i];
            uint256 weight = assetWeights[asset];
            
            // Calculate amount of this asset needed
            uint256 assetAmount = (amount * weight) / BASIS_POINTS;
            
            // Transfer the asset from the user to this contract
            require(
                IERC20(asset).transferFrom(msg.sender, address(this), assetAmount),
                "Transfer of underlying asset failed"
            );
        }
        
        // Mint the basket tokens to the user
        _mint(msg.sender, amount);
    }
    
    /**
     * @notice Burn basket tokens to withdraw underlying assets
     * @param amount The amount of basket tokens to burn
     */
    function burn(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Burn the basket tokens
        _burn(msg.sender, amount);
        
        // For each underlying asset, transfer the proportional amount back to the user
        for (uint i = 0; i < underlyingAssets.length; i++) {
            address asset = underlyingAssets[i];
            uint256 weight = assetWeights[asset];
            
            // Calculate amount of this asset to return
            uint256 assetAmount = (amount * weight) / BASIS_POINTS;
            
            // Transfer the asset from this contract to the user
            require(
                IERC20(asset).transfer(msg.sender, assetAmount),
                "Transfer of underlying asset failed"
            );
        }
    }
    
    /**
     * @notice Rebalance the basket by adjusting the underlying assets according to current weights
     * @dev This function would be called after weight changes to rebalance the portfolio
     */
    function rebalance() external onlyOwner {
        require(underlyingAssets.length > 0, "No assets in basket");
        
        // Implementation would depend on specific rebalancing logic
        // This could involve swapping assets using DEXs, etc.
        
        emit Rebalanced(block.timestamp);
    }
    
    /**
     * @notice Get the list of underlying assets
     * @return Array of asset addresses
     */
    function getUnderlyingAssets() external view returns (address[] memory) {
        return underlyingAssets;
    }
    
    /**
     * @notice Get the weights of all assets
     * @return Array of weights corresponding to the assets
     */
    function getAssetWeights() external view returns (uint256[] memory) {
        uint256[] memory weights = new uint256[](underlyingAssets.length);
        
        for (uint i = 0; i < underlyingAssets.length; i++) {
            weights[i] = assetWeights[underlyingAssets[i]];
        }
        
        return weights;
    }
    
    /**
     * @notice Calculate the total value of the basket in terms of a reference token
     * @param referenceToken The token to value the basket in (e.g., USDC)
     * @return Total value of the basket in reference token units
     * @dev This is a simplified implementation and would need price oracles in practice
     */
    function calculateBasketValue(address referenceToken) external view returns (uint256) {
        // In a real implementation, this would use price oracles
        // Simplified placeholder implementation
        return 0;
    }
}