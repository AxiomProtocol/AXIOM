// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./BasketIndex.sol";
import "./RoleRouter.sol";
import "./SoloMethodEngineV2.sol";

/**
 * @title SWFModularEngine
 * @notice Main controller contract that integrates BasketIndex, RoleRouter, and SoloMethodEngineV2
 * @dev Provides a single interface for managing all aspects of the Sovran Wealth Fund ecosystem
 */
contract SWFModularEngine is Ownable {
    // Core token
    IERC20 public swfToken;
    
    // Component contracts
    BasketIndex public basketIndex;
    RoleRouter public roleRouter;
    SoloMethodEngineV2 public stakingEngine;
    
    // Component status
    bool public basketIndexInitialized;
    bool public roleRouterInitialized;
    bool public stakingEngineInitialized;
    
    // Events
    event ComponentInitialized(string name, address component);
    event BasketAssetsUpdated(address[] assets, uint256[] weights);
    event RolesUpdated(address[] wallets, string[] roles, uint256[] shares);
    event APRUpdated(uint256 oldAPR, uint256 newAPR);
    
    /**
     * @notice Constructs the SWFModularEngine contract
     * @param _swfToken Address of the SWF token
     */
    constructor(address _swfToken) Ownable(msg.sender) {
        require(_swfToken != address(0), "Invalid token address");
        swfToken = IERC20(_swfToken);
    }
    
    // ---------- Component Initialization Functions ----------
    
    /**
     * @notice Initialize or update the BasketIndex component
     * @param _basketIndex Address of the BasketIndex contract
     */
    function initializeBasketIndex(address _basketIndex) external onlyOwner {
        require(_basketIndex != address(0), "Invalid address");
        basketIndex = BasketIndex(_basketIndex);
        basketIndexInitialized = true;
        emit ComponentInitialized("BasketIndex", _basketIndex);
    }
    
    /**
     * @notice Initialize or update the RoleRouter component
     * @param _roleRouter Address of the RoleRouter contract
     */
    function initializeRoleRouter(address _roleRouter) external onlyOwner {
        require(_roleRouter != address(0), "Invalid address");
        roleRouter = RoleRouter(_roleRouter);
        roleRouterInitialized = true;
        emit ComponentInitialized("RoleRouter", _roleRouter);
    }
    
    /**
     * @notice Initialize or update the SoloMethodEngineV2 component
     * @param _stakingEngine Address of the SoloMethodEngineV2 contract
     */
    function initializeStakingEngine(address _stakingEngine) external onlyOwner {
        require(_stakingEngine != address(0), "Invalid address");
        stakingEngine = SoloMethodEngineV2(_stakingEngine);
        stakingEngineInitialized = true;
        emit ComponentInitialized("StakingEngine", _stakingEngine);
    }
    
    // ---------- BasketIndex Management Functions ----------
    
    /**
     * @notice Set or update the underlying assets in the basket
     * @param assets Array of asset addresses
     * @param weights Array of weights for each asset (in basis points)
     */
    function setBasketAssets(address[] calldata assets, uint256[] calldata weights) external onlyOwner {
        require(basketIndexInitialized, "BasketIndex not initialized");
        basketIndex.setAssets(assets, weights);
        emit BasketAssetsUpdated(assets, weights);
    }
    
    /**
     * @notice Rebalance the assets in the basket
     */
    function rebalanceBasket() external onlyOwner {
        require(basketIndexInitialized, "BasketIndex not initialized");
        basketIndex.rebalance();
    }
    
    /**
     * @notice Mint basket tokens
     * @param amount Amount of basket tokens to mint
     */
    function mintBasketTokens(uint256 amount) external {
        require(basketIndexInitialized, "BasketIndex not initialized");
        
        // Approve all underlying assets for the basket
        address[] memory assets = basketIndex.getUnderlyingAssets();
        for (uint i = 0; i < assets.length; i++) {
            IERC20 asset = IERC20(assets[i]);
            
            // Calculate amount needed of this asset
            uint256 weight = basketIndex.assetWeights(assets[i]);
            uint256 assetAmount = (amount * weight) / 10000;
            
            // Ensure approval
            asset.approve(address(basketIndex), assetAmount);
        }
        
        // Mint basket tokens
        basketIndex.mint(amount);
    }
    
    /**
     * @notice Burn basket tokens
     * @param amount Amount of basket tokens to burn
     */
    function burnBasketTokens(uint256 amount) external {
        require(basketIndexInitialized, "BasketIndex not initialized");
        basketIndex.burn(amount);
    }
    
    // ---------- RoleRouter Management Functions ----------
    
    /**
     * @notice Set or update the roles and allocations
     * @param wallets Array of wallet addresses
     * @param roles Array of role names
     * @param shares Array of shares (in basis points)
     */
    function setRoles(address[] calldata wallets, string[] calldata roles, uint256[] calldata shares) external onlyOwner {
        require(roleRouterInitialized, "RoleRouter not initialized");
        roleRouter.setRoles(wallets, roles, shares);
        emit RolesUpdated(wallets, roles, shares);
    }
    
    /**
     * @notice Trigger distribution of rewards to role-based wallets
     */
    function distributeRoleRewards() external {
        require(roleRouterInitialized, "RoleRouter not initialized");
        
        // If there are SWF tokens in this contract, transfer them to the role router first
        uint256 balance = swfToken.balanceOf(address(this));
        if (balance > 0) {
            swfToken.approve(address(roleRouter), balance);
            swfToken.transfer(address(roleRouter), balance);
        }
        
        // Distribute rewards
        roleRouter.distributeRewards();
    }
    
    /**
     * @notice Update the main distributor address
     * @param newDistributor New main distributor address
     */
    function setMainDistributor(address newDistributor) external onlyOwner {
        require(roleRouterInitialized, "RoleRouter not initialized");
        roleRouter.setMainDistributor(newDistributor);
    }
    
    /**
     * @notice Update the treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(roleRouterInitialized, "RoleRouter not initialized");
        roleRouter.setTreasury(newTreasury);
    }
    
    // ---------- Staking Engine Management Functions ----------
    
    /**
     * @notice Set the APR for staking rewards
     * @param newAprBps New APR in basis points (e.g., 2500 for 25%)
     */
    function setStakingAPR(uint256 newAprBps) external onlyOwner {
        require(stakingEngineInitialized, "StakingEngine not initialized");
        uint256 oldAPR = stakingEngine.getCurrentAPR();
        stakingEngine.setAPR(newAprBps);
        emit APRUpdated(oldAPR, newAprBps);
    }
    
    /**
     * @notice Stake tokens in the SoloMethodEngine
     * @param amount Amount to stake
     */
    function stakeTokens(uint256 amount) external {
        require(stakingEngineInitialized, "StakingEngine not initialized");
        
        // Approve tokens for staking
        swfToken.approve(address(stakingEngine), amount);
        
        // Stake tokens
        stakingEngine.deposit(amount);
    }
    
    /**
     * @notice Withdraw staked tokens
     * @param amount Amount to withdraw
     */
    function withdrawStakedTokens(uint256 amount) external {
        require(stakingEngineInitialized, "StakingEngine not initialized");
        stakingEngine.withdraw(amount);
    }
    
    /**
     * @notice Claim staking rewards
     */
    function claimStakingRewards() external {
        require(stakingEngineInitialized, "StakingEngine not initialized");
        stakingEngine.claimRewards();
    }
    
    // ---------- Query Functions ----------
    
    /**
     * @notice Get the current APR for staking
     * @return Current APR in basis points
     */
    function getCurrentAPR() external view returns (uint256) {
        require(stakingEngineInitialized, "StakingEngine not initialized");
        return stakingEngine.getCurrentAPR();
    }
    
    /**
     * @notice Get pending rewards for a user
     * @param user User address
     * @return Pending rewards
     */
    function getPendingRewards(address user) external view returns (uint256) {
        require(stakingEngineInitialized, "StakingEngine not initialized");
        return stakingEngine.getPendingRewards(user);
    }
    
    /**
     * @notice Get total staked amount for a user
     * @param user User address
     * @return Total staked amount
     */
    function getTotalStaked(address user) external view returns (uint256) {
        require(stakingEngineInitialized, "StakingEngine not initialized");
        return stakingEngine.getTotalStaked(user);
    }
    
    /**
     * @notice Get the wallet role for a specific address
     * @param wallet Wallet address
     * @return Role name
     */
    function getWalletRole(address wallet) external view returns (string memory) {
        require(roleRouterInitialized, "RoleRouter not initialized");
        return roleRouter.getWalletRole(wallet);
    }
    
    /**
     * @notice Get the wallet share for a specific address
     * @param wallet Wallet address
     * @return Share in basis points
     */
    function getWalletShare(address wallet) external view returns (uint256) {
        require(roleRouterInitialized, "RoleRouter not initialized");
        return roleRouter.getWalletShare(wallet);
    }
    
    /**
     * @notice Get all wallet addresses with roles
     * @return Array of wallet addresses
     */
    function getWalletRoles() external view returns (address[] memory) {
        require(roleRouterInitialized, "RoleRouter not initialized");
        return roleRouter.getWalletRoles();
    }
    
    /**
     * @notice Get all underlying assets in the basket
     * @return Array of asset addresses
     */
    function getBasketAssets() external view returns (address[] memory) {
        require(basketIndexInitialized, "BasketIndex not initialized");
        return basketIndex.getUnderlyingAssets();
    }
    
    /**
     * @notice Get the weights of all assets in the basket
     * @return Array of weights
     */
    function getBasketWeights() external view returns (uint256[] memory) {
        require(basketIndexInitialized, "BasketIndex not initialized");
        return basketIndex.getAssetWeights();
    }
}