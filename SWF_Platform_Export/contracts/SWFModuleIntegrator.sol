// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SWFModules.sol";

/**
 * @title SWFModuleIntegrator
 * @dev Central contract that manages interactions between SWF modules
 */
contract SWFModuleIntegrator is Ownable {
    // Core module references
    IERC20 public swfToken;
    LiquidityVault public liquidityVault;
    GovernanceDividendPool public governancePool;
    SWFVaultAdapter public vaultAdapter;
    address public treasury;
    
    // Reward distribution configuration
    uint256 public lastRewardDistribution;
    uint256 public rewardDistributionFrequency = 7 days;
    uint8 public rewardsPercentage = 50; // 50% of funds go to rewards

    // Events
    event StakedInGovernancePool(address indexed user, uint256 amount);
    event LPTokensStaked(address indexed user, uint256 amount);
    event DepositedToVault(address indexed user, uint256 amount);
    event RewardsDistributed(uint256 amount, uint256 timestamp);
    event ConfigUpdated(string parameter, uint256 value);
    
    /**
     * @dev Constructor - initializes the integrator with module addresses
     */
    constructor(
        address _swfToken,
        address _liquidityVault,
        address payable _governancePool,
        address _vaultAdapter,
        address _treasury
    ) Ownable(msg.sender) {
        swfToken = IERC20(_swfToken);
        liquidityVault = LiquidityVault(_liquidityVault);
        governancePool = GovernanceDividendPool(_governancePool);
        vaultAdapter = SWFVaultAdapter(_vaultAdapter);
        treasury = _treasury;
        lastRewardDistribution = block.timestamp;
    }
    
    /**
     * @dev Stakes SWF tokens in the governance pool
     * @param amount Amount of SWF tokens to stake
     */
    function stakeInGovernancePool(uint256 amount) external {
        require(amount > 0, "Zero amount");
        
        // Transfer tokens from user to this contract
        swfToken.transferFrom(msg.sender, address(this), amount);
        
        // Approve governance pool to spend tokens
        swfToken.approve(address(governancePool), amount);
        
        // Stake in governance pool
        governancePool.stake(amount);
        
        emit StakedInGovernancePool(msg.sender, amount);
    }
    
    /**
     * @dev Stakes LP tokens in the liquidity vault
     * @param amount Amount of LP tokens to stake
     */
    function stakeLPTokens(uint256 amount) external {
        require(amount > 0, "Zero amount");
        
        // Get LP token address from liquidity vault
        IERC20 lpToken = IERC20(liquidityVault.lpToken());
        
        // Transfer LP tokens from user to this contract
        lpToken.transferFrom(msg.sender, address(this), amount);
        
        // Approve liquidity vault to spend LP tokens
        lpToken.approve(address(liquidityVault), amount);
        
        // Stake in liquidity vault
        liquidityVault.stake(amount);
        
        emit LPTokensStaked(msg.sender, amount);
    }
    
    /**
     * @dev Deposits SWF tokens to the vault adapter
     * @param amount Amount of SWF tokens to deposit
     */
    function depositToVault(uint256 amount) external {
        require(amount > 0, "Zero amount");
        
        // Transfer tokens from user to this contract
        swfToken.transferFrom(msg.sender, address(this), amount);
        
        // Approve vault adapter to spend tokens
        swfToken.approve(address(vaultAdapter), amount);
        
        // Deposit to vault adapter
        vaultAdapter.deposit(amount);
        
        emit DepositedToVault(msg.sender, amount);
    }
    
    /**
     * @dev Forwards funds from vault adapter to the vault (treasury)
     * @param amount Amount of SWF tokens to forward
     */
    function forwardToVault(uint256 amount) external onlyOwner {
        vaultAdapter.forwardToVault(amount);
    }
    
    /**
     * @dev Distributes rewards from the treasury to stakers
     * Only callable by owner and after rewardDistributionFrequency has passed
     */
    function distributeRewards() external onlyOwner {
        require(
            block.timestamp >= lastRewardDistribution + rewardDistributionFrequency,
            "Too soon to distribute"
        );
        
        // Calculate total rewards
        uint256 treasuryBalance = swfToken.balanceOf(treasury);
        uint256 rewardAmount = (treasuryBalance * rewardsPercentage) / 100;
        
        // Update last distribution time
        lastRewardDistribution = block.timestamp;
        
        // Transfer rewards from treasury to governance pool
        require(
            swfToken.transferFrom(treasury, address(governancePool), rewardAmount),
            "Transfer failed"
        );
        
        emit RewardsDistributed(rewardAmount, block.timestamp);
    }
    
    /**
     * @dev Updates the reward distribution frequency
     * @param newFrequency New frequency in seconds
     */
    function setRewardDistributionFrequency(uint256 newFrequency) external onlyOwner {
        require(newFrequency > 0, "Invalid frequency");
        rewardDistributionFrequency = newFrequency;
        emit ConfigUpdated("rewardDistributionFrequency", newFrequency);
    }
    
    /**
     * @dev Updates the rewards percentage
     * @param newPercentage New percentage (0-100)
     */
    function setRewardsPercentage(uint8 newPercentage) external onlyOwner {
        require(newPercentage <= 100, "Invalid percentage");
        rewardsPercentage = newPercentage;
        emit ConfigUpdated("rewardsPercentage", newPercentage);
    }
    
    /**
     * @dev Gets user information across all modules
     * @param user User address to query
     * @return lpStaked LP tokens staked in liquidity vault
     * @return swfStaked SWF tokens staked in governance pool
     * @return swfDeposited SWF tokens deposited in vault adapter
     */
    function getUserInfo(address user) external view returns (
        uint256 lpStaked,
        uint256 swfStaked,
        uint256 swfDeposited
    ) {
        lpStaked = liquidityVault.staked(user);
        swfStaked = governancePool.stakes(user);
        swfDeposited = vaultAdapter.deposits(user);
        return (lpStaked, swfStaked, swfDeposited);
    }
    
    /**
     * @dev Gets total amount of LP tokens staked in liquidity vault
     * @return Total LP tokens staked
     */
    function getTotalLiquidityStaked() external view returns (uint256) {
        return liquidityVault.totalStaked();
    }
    
    /**
     * @dev Gets total amount of SWF tokens staked in governance pool
     * @return Total SWF tokens staked
     */
    function getTotalGovernanceStaked() external view returns (uint256) {
        return governancePool.totalStaked();
    }
    
    /**
     * @dev Gets total amount of SWF tokens deposited in vault adapter
     * @return Total SWF tokens deposited
     */
    function getTotalVaultDeposits() external view returns (uint256) {
        return vaultAdapter.totalDeposits();
    }
}