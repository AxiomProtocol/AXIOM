// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SoloMethodEngine
 * @notice Staking contract for SWF tokens with adjustable APR
 * @dev This contract allows users to stake SWF tokens and earn rewards based on the APR
 */
contract SoloMethodEngine is Ownable {
    // SWF token contract
    IERC20 public stakingToken;
    
    // Total tokens staked
    uint256 public totalStaked;
    
    // APR in basis points (25% = 2500 basis points)
    uint256 public aprBasisPoints = 2500;
    
    // Last update timestamp
    uint256 public lastUpdate;
    
    // User staking information
    mapping(address => uint256) public staked;
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public lastStaked;

    // Constants for calculations
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant SECONDS_IN_YEAR = 31536000;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event APRUpdated(uint256 oldApr, uint256 newApr);

    /**
     * @notice Initializes the SoloMethodEngine contract
     * @param _token Address of the staking token (SWF)
     * @param initialOwner Address of the initial owner
     */
    constructor(address _token, address initialOwner) Ownable(initialOwner) {
        require(_token != address(0), "Invalid token address");
        stakingToken = IERC20(_token);
    }

    /**
     * @notice Sets the APR for staking rewards
     * @param _bps APR in basis points (100 basis points = 1%)
     */
    function setAPR(uint256 _bps) external onlyOwner {
        require(_bps <= 5000, "APR too high"); // Max 50%
        uint256 oldApr = aprBasisPoints;
        aprBasisPoints = _bps;
        emit APRUpdated(oldApr, _bps);
    }

    /**
     * @notice Allows users to stake tokens
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external {
        require(amount > 0, "Stake more than 0");
        _updateRewards(msg.sender);
        stakingToken.transferFrom(msg.sender, address(this), amount);
        staked[msg.sender] += amount;
        totalStaked += amount;
        lastStaked[msg.sender] = block.timestamp;
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @notice Allows users to withdraw their staked tokens
     * @param amount Amount of tokens to withdraw
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Withdraw more than 0");
        require(staked[msg.sender] >= amount, "Not enough staked");
        _updateRewards(msg.sender);
        staked[msg.sender] -= amount;
        totalStaked -= amount;
        stakingToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @notice Allows users to claim their earned rewards
     */
    function claimRewards() external {
        uint256 reward = earned(msg.sender);
        require(reward > 0, "No rewards to claim");
        rewardDebt[msg.sender] = 0;
        lastStaked[msg.sender] = block.timestamp;
        stakingToken.transfer(msg.sender, reward);
        emit RewardPaid(msg.sender, reward);
    }

    /**
     * @notice Updates the user's rewards
     * @param user Address of the user
     */
    function _updateRewards(address user) internal {
        uint256 pending = earned(user);
        rewardDebt[user] = pending;
        lastStaked[user] = block.timestamp;
    }

    /**
     * @notice Calculates the rewards earned by a user
     * @param user Address of the user
     * @return Amount of rewards earned
     */
    function earned(address user) public view returns (uint256) {
        if (staked[user] == 0) return rewardDebt[user];
        uint256 timeElapsed = block.timestamp - lastStaked[user];
        uint256 reward = (staked[user] * aprBasisPoints * timeElapsed) / BPS_DIVISOR / SECONDS_IN_YEAR;
        return reward + rewardDebt[user];
    }
    
    /**
     * @notice Returns the number of tokens a user has staked
     * @param user Address of the user
     * @return Amount of tokens staked
     */
    function getStaked(address user) external view returns (uint256) {
        return staked[user];
    }
    
    /**
     * @notice Returns the current APR as a percentage
     * @return APR percentage (e.g., 25.00 for 25%)
     */
    function getAPR() external view returns (uint256) {
        return aprBasisPoints / 100;
    }
}