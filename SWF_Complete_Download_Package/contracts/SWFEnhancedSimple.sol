// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SWF Enhanced Token - Simplified Version
 * @dev Basic ERC20 token with staking capabilities for immediate deployment
 */
contract SWFEnhancedSimple is ERC20, Ownable {
    
    // Token Economics
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1B tokens
    uint256 public stakingRewardRate = 25; // 25% APR
    
    // Staking System
    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 rewardDebt;
        bool isActive;
    }
    
    mapping(address => StakeInfo) public stakes;
    mapping(address => uint256) public stakingRewards;
    uint256 public totalStaked;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    
    constructor() 
        ERC20("Sovran Wealth Fund Enhanced", "SWFE") 
        Ownable(msg.sender)
    {
        // Mint initial supply to contract for distribution
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    // ===== TOKEN STAKING FUNCTIONS =====
    
    function stakeTokens(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        // Update rewards before changing stake
        updateStakingRewards(msg.sender);
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), _amount);
        
        StakeInfo storage stake = stakes[msg.sender];
        stake.amount += _amount;
        stake.timestamp = block.timestamp;
        stake.isActive = true;
        
        totalStaked += _amount;
        
        emit Staked(msg.sender, _amount);
    }
    
    function unstakeTokens(uint256 _amount) external {
        StakeInfo storage stake = stakes[msg.sender];
        require(stake.amount >= _amount, "Insufficient staked amount");
        
        // Update rewards before changing stake
        updateStakingRewards(msg.sender);
        
        stake.amount -= _amount;
        totalStaked -= _amount;
        
        if (stake.amount == 0) {
            stake.isActive = false;
        }
        
        // Transfer tokens back to user
        _transfer(address(this), msg.sender, _amount);
        
        emit Unstaked(msg.sender, _amount);
    }
    
    function claimStakingRewards() external {
        updateStakingRewards(msg.sender);
        
        uint256 rewards = stakingRewards[msg.sender];
        require(rewards > 0, "No rewards to claim");
        
        stakingRewards[msg.sender] = 0;
        
        // Mint new tokens as rewards
        _mint(msg.sender, rewards);
        
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    function updateStakingRewards(address _user) internal {
        StakeInfo storage stake = stakes[_user];
        
        if (stake.isActive && stake.amount > 0) {
            uint256 timeStaked = block.timestamp - stake.timestamp;
            uint256 rewardAmount = (stake.amount * stakingRewardRate * timeStaked) / (365 days * 100);
            
            stakingRewards[_user] += rewardAmount;
            stake.timestamp = block.timestamp;
        }
    }
    
    // ===== VIEW FUNCTIONS =====
    
    function getStakeInfo(address _user) external view returns (
        uint256 amount,
        uint256 timestamp,
        uint256 pendingRewards,
        bool isActive
    ) {
        StakeInfo memory stake = stakes[_user];
        
        uint256 pending = stakingRewards[_user];
        if (stake.isActive && stake.amount > 0) {
            uint256 timeStaked = block.timestamp - stake.timestamp;
            pending += (stake.amount * stakingRewardRate * timeStaked) / (365 days * 100);
        }
        
        return (stake.amount, stake.timestamp, pending, stake.isActive);
    }
    
    // ===== ADMIN FUNCTIONS =====
    
    function setStakingRewardRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 100, "Rate cannot exceed 100%");
        stakingRewardRate = _newRate;
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = balanceOf(address(this));
        if (balance > 0) {
            _transfer(address(this), owner(), balance);
        }
    }
}