// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RoleRouter
 * @notice Maps rewards to wallet roles based on predefined allocations
 * @dev Handles the distribution of tokens to different role-based wallets
 */
contract RoleRouter is Ownable {
    // Token to be distributed
    IERC20 public rewardToken;
    
    // Main addresses
    address public mainDistributor;
    address public treasury;
    
    // Role management
    address[] public walletRoles;
    mapping(address => string) public roleNames;
    mapping(string => uint256) public roleDistribution; // in basis points
    
    // Constant for basis points calculations
    uint256 public constant BASIS_POINTS = 10000;
    
    // Events
    event RolesUpdated(address[] wallets, string[] roles, uint256[] shares);
    event RewardsDistributed(uint256 totalAmount);
    event MainDistributorUpdated(address oldDistributor, address newDistributor);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    
    /**
     * @notice Constructs the RoleRouter contract
     * @param _rewardToken Address of the token to distribute
     * @param _mainDistributor Address of the main distributor
     * @param _treasury Address of the treasury
     */
    constructor(address _rewardToken, address _mainDistributor, address _treasury) Ownable(msg.sender) {
        require(_rewardToken != address(0), "Invalid token address");
        require(_mainDistributor != address(0), "Invalid main distributor address");
        require(_treasury != address(0), "Invalid treasury address");
        
        rewardToken = IERC20(_rewardToken);
        mainDistributor = _mainDistributor;
        treasury = _treasury;
    }
    
    /**
     * @notice Set or update the roles, wallet addresses, and their allocation shares
     * @param wallets Array of wallet addresses
     * @param roles Array of role names for each wallet
     * @param shares Array of shares for each role (in basis points)
     */
    function setRoles(address[] calldata wallets, string[] calldata roles, uint256[] calldata shares) external onlyOwner {
        require(wallets.length == roles.length, "Wallets and roles length mismatch");
        require(roles.length == shares.length, "Roles and shares length mismatch");
        
        // Clear existing roles
        for (uint i = 0; i < walletRoles.length; i++) {
            roleNames[walletRoles[i]] = "";
            roleDistribution[roleNames[walletRoles[i]]] = 0;
        }
        delete walletRoles;
        
        // Add new roles
        uint256 totalShares = 0;
        for (uint i = 0; i < wallets.length; i++) {
            require(wallets[i] != address(0), "Invalid wallet address");
            walletRoles.push(wallets[i]);
            roleNames[wallets[i]] = roles[i];
            roleDistribution[roles[i]] = shares[i];
            totalShares += shares[i];
        }
        
        // Ensure total shares add up to 100%
        require(totalShares == BASIS_POINTS, "Shares must sum to 10000 basis points (100%)");
        
        emit RolesUpdated(wallets, roles, shares);
    }
    
    /**
     * @notice Distribute rewards according to the role allocations
     */
    function distributeRewards() external {
        require(walletRoles.length > 0, "No wallet roles defined");
        
        // Get total available rewards
        uint256 total = rewardToken.balanceOf(address(this));
        require(total > 0, "No rewards to distribute");
        
        uint256 distributed = 0;
        
        // Distribute to each wallet according to its role's share
        for (uint i = 0; i < walletRoles.length; i++) {
            address wallet = walletRoles[i];
            string memory role = roleNames[wallet];
            uint256 share = roleDistribution[role];
            
            if (share > 0) {
                uint256 payout = (total * share) / BASIS_POINTS;
                distributed += payout;
                
                require(
                    rewardToken.transfer(wallet, payout),
                    "Token transfer failed"
                );
            }
        }
        
        // If there's any remainder due to rounding, send it to the treasury
        if (distributed < total) {
            uint256 remainder = total - distributed;
            require(
                rewardToken.transfer(treasury, remainder),
                "Remainder transfer failed"
            );
        }
        
        emit RewardsDistributed(total);
    }
    
    /**
     * @notice Update the main distributor address
     * @param _newDistributor New main distributor address
     */
    function setMainDistributor(address _newDistributor) external onlyOwner {
        require(_newDistributor != address(0), "Invalid address");
        address oldDistributor = mainDistributor;
        mainDistributor = _newDistributor;
        emit MainDistributorUpdated(oldDistributor, _newDistributor);
    }
    
    /**
     * @notice Update the treasury address
     * @param _newTreasury New treasury address
     */
    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid address");
        address oldTreasury = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }
    
    /**
     * @notice Get all wallet addresses with roles
     * @return Array of wallet addresses
     */
    function getWalletRoles() external view returns (address[] memory) {
        return walletRoles;
    }
    
    /**
     * @notice Get the allocation share for a specific wallet
     * @param wallet Address of the wallet
     * @return Share in basis points
     */
    function getWalletShare(address wallet) external view returns (uint256) {
        string memory role = roleNames[wallet];
        return roleDistribution[role];
    }
    
    /**
     * @notice Get the role name for a specific wallet
     * @param wallet Address of the wallet
     * @return Role name
     */
    function getWalletRole(address wallet) external view returns (string memory) {
        return roleNames[wallet];
    }
    
    /**
     * @notice Emergency function to recover any tokens accidentally sent to this contract
     * @param token Address of the token to recover
     * @param amount Amount to recover
     */
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(IERC20(token).transfer(owner(), amount), "Token recovery failed");
    }
}