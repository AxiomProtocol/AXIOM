// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISovranWealthFund.sol";

/**
 * @title SoloMethodEngineV2
 * @notice Enhanced staking system with 16-wallet structure and dynamic APR
 * @dev Combines staking, role-based wallet distribution, and adjustable reward rates
 */
contract SoloMethodEngineV2 is Ownable {
    // Token to stake
    IERC20 public stakingToken;
    
    // Wallet structure types
    enum WalletRole { BUYER, HOLDER, STAKER, LIQUIDITY, TRACKER }
    
    struct WalletInfo {
        WalletRole role;
        uint256 balance;
    }
    
    // 16-wallet structure per user
    mapping(address => WalletInfo[16]) public userWallets;
    
    // Staking tracking
    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public lastRewardTime;
    mapping(address => uint256) public rewardDebt;
    
    // Dynamic APR settings
    uint256 public aprBasisPoints = 2500; // 25% APR (in basis points)
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant SECONDS_IN_YEAR = 31536000;
    uint256 public constant MIN_STAKE_AMOUNT = 50 * 1e18; // 50 SWF minimum
    
    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Minted(address indexed user, uint256 reward);
    event APRUpdated(uint256 oldAPR, uint256 newAPR);
    
    /**
     * @notice Constructs the SoloMethodEngineV2 contract
     * @param _stakingTokenAddress Address of the token to stake
     */
    constructor(address _stakingTokenAddress) Ownable(msg.sender) {
        require(_stakingTokenAddress != address(0), "Invalid token address");
        stakingToken = IERC20(_stakingTokenAddress);
    }
    
    /**
     * @notice Set a new APR value (in basis points)
     * @param _newAprBps The new APR in basis points (100 = 1%)
     */
    function setAPR(uint256 _newAprBps) external onlyOwner {
        require(_newAprBps <= 5000, "APR too high (max 50%)");
        uint256 oldApr = aprBasisPoints;
        aprBasisPoints = _newAprBps;
        emit APRUpdated(oldApr, _newAprBps);
    }
    
    /**
     * @notice Stake tokens and distribute them across 16 wallets
     * @param amount The amount to stake
     */
    function deposit(uint256 amount) external {
        require(amount >= MIN_STAKE_AMOUNT, "Minimum 50 SWF required");
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);

        // Distribute the amount across 16 wallets evenly
        for (uint8 i = 0; i < 16; i++) {
            userWallets[msg.sender][i] = WalletInfo(WalletRole(i % 5), amount / 16);
        }

        stakedAmount[msg.sender] += amount;
        lastRewardTime[msg.sender] = block.timestamp;
        emit Deposited(msg.sender, amount);
    }
    
    /**
     * @notice Withdraw staked tokens
     * @param amount The amount to withdraw
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(stakedAmount[msg.sender] >= amount, "Insufficient staked balance");
        
        // Update rewards before changing stake
        _updateRewards(msg.sender);
        
        // Update staked amount
        stakedAmount[msg.sender] -= amount;
        
        // Reset wallet distribution
        if (stakedAmount[msg.sender] > 0) {
            // Recalculate wallets with new amount
            uint256 amountPerWallet = stakedAmount[msg.sender] / 16;
            for (uint8 i = 0; i < 16; i++) {
                userWallets[msg.sender][i].balance = amountPerWallet;
            }
        } else {
            // Clear all wallets if fully withdrawn
            for (uint8 i = 0; i < 16; i++) {
                userWallets[msg.sender][i].balance = 0;
            }
        }
        
        // Transfer SWF tokens back to user
        require(stakingToken.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @notice Update user's reward debt for precise tracking
     * @param user The user address to update rewards for
     */
    function _updateRewards(address user) internal {
        uint256 pending = calculateRewards(user);
        rewardDebt[user] = pending;
        lastRewardTime[user] = block.timestamp;
    }
    
    /**
     * @notice Calculate earned rewards with continuous compounding
     * @param user The user address to calculate rewards for
     * @return The calculated reward amount
     */
    function calculateRewards(address user) public view returns (uint256) {
        if (stakedAmount[user] == 0 || lastRewardTime[user] == 0) {
            return rewardDebt[user];
        }
        
        uint256 timeElapsed = block.timestamp - lastRewardTime[user];
        
        // Calculate reward: staked * APR * (timeElapsed / SECONDS_IN_YEAR)
        uint256 reward = (stakedAmount[user] * aprBasisPoints * timeElapsed) / 
                        BPS_DIVISOR / SECONDS_IN_YEAR;
        
        return reward + rewardDebt[user];
    }
    
    /**
     * @notice Claim accumulated rewards
     */
    function claimRewards() public {
        _updateRewards(msg.sender);
        uint256 reward = rewardDebt[msg.sender];
        
        if (reward > 0) {
            rewardDebt[msg.sender] = 0;
            
            // Transfer rewards to user (requires contract to have minter role)
            ISovranWealthFund swfTokenMinter = ISovranWealthFund(address(stakingToken));
            swfTokenMinter.mint(msg.sender, reward);
            emit Minted(msg.sender, reward);
        }
    }
    
    /**
     * @notice Get the distribution of tokens across 16 wallets
     * @param user The user address to check wallet breakdown for
     * @return Array of WalletInfo structures
     */
    function getWalletBreakdown(address user) external view returns (WalletInfo[16] memory) {
        return userWallets[user];
    }
    
    /**
     * @notice Get total staked amount for a user
     * @param user The user address to check staked amount for
     * @return The total staked amount
     */
    function getTotalStaked(address user) external view returns (uint256) {
        return stakedAmount[user];
    }
    
    /**
     * @notice Get pending rewards for a user
     * @param user The user address to check pending rewards for
     * @return The pending reward amount
     */
    function getPendingRewards(address user) external view returns (uint256) {
        return calculateRewards(user);
    }
    
    /**
     * @notice Get current APR in basis points
     * @return The current APR in basis points
     */
    function getCurrentAPR() external view returns (uint256) {
        return aprBasisPoints;
    }
    
    /**
     * @notice Check if the specified address has staked tokens
     * @param user The user address to check
     * @return True if the user has staked tokens, false otherwise
     */
    function isStaker(address user) external view returns (bool) {
        return stakedAmount[user] > 0;
    }
    
    /**
     * @notice Emergency function to recover any tokens accidentally sent to this contract
     * @param token Address of the token to recover
     * @param amount Amount to recover
     */
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(stakingToken), "Cannot recover staking token");
        require(IERC20(token).transfer(owner(), amount), "Token recovery failed");
    }
}