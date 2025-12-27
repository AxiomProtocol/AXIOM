// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title veAXM (Vote-Escrowed AXM)
 * @notice Vote-escrow locking mechanism for AXM governance and real yield
 * @dev AIP-001 Implementation: Curve-style veCRV locking with time-weighted voting
 * 
 * Features:
 * - Lock AXM for 1-4 years to receive veAXM voting power
 * - Time-weighted voting power (longer lock = more power)
 * - Governance voting on proposals and insurance claims
 * - Real yield distribution from protocol fees
 * - Non-transferable (true commitment)
 * - Lock extension capability
 * 
 * Voting Power Formula:
 * - veAXM = AXM_locked * (lock_time_remaining / MAX_LOCK)
 * - MAX_LOCK = 4 years (208 weeks)
 * - Power decays linearly as lock expires
 */
contract veAXM is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REWARDS_DISTRIBUTOR_ROLE = keccak256("REWARDS_DISTRIBUTOR_ROLE");

    uint256 public constant WEEK = 7 days;
    uint256 public constant MIN_LOCK_DURATION = 4 weeks;
    uint256 public constant MAX_LOCK_DURATION = 4 * 365 days;
    uint256 public constant PRECISION = 1e18;

    IERC20 public axmToken;
    
    string public name = "Vote-Escrowed AXM";
    string public symbol = "veAXM";
    uint8 public decimals = 18;

    uint256 public totalLocked;
    uint256 public totalVotingPower;
    uint256 public totalLockers;

    struct Lock {
        uint256 amount;
        uint256 unlockTime;
        uint256 lockStart;
        uint256 initialVotingPower;
    }

    struct RewardEpoch {
        uint256 epochId;
        uint256 totalRewards;
        uint256 rewardsPerVePower;
        uint256 startTime;
        uint256 endTime;
        bool distributed;
    }

    mapping(address => Lock) public locks;
    mapping(uint256 => RewardEpoch) public rewardEpochs;
    mapping(address => mapping(uint256 => bool)) public claimedEpoch;
    mapping(address => uint256) public totalClaimed;

    uint256 public currentEpoch;
    uint256 public totalRewardsDistributed;

    event Locked(address indexed user, uint256 amount, uint256 unlockTime, uint256 votingPower);
    event Extended(address indexed user, uint256 newUnlockTime, uint256 newVotingPower);
    event Increased(address indexed user, uint256 additionalAmount, uint256 newVotingPower);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsAdded(uint256 indexed epochId, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed epochId, uint256 amount);

    constructor(address _axmToken) {
        require(_axmToken != address(0), "Invalid AXM token");
        axmToken = IERC20(_axmToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(REWARDS_DISTRIBUTOR_ROLE, msg.sender);
    }

    function createLock(uint256 amount, uint256 lockDuration) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(lockDuration >= MIN_LOCK_DURATION, "Lock too short");
        require(lockDuration <= MAX_LOCK_DURATION, "Lock too long");
        require(locks[msg.sender].amount == 0, "Lock already exists");
        
        uint256 unlockTime = ((block.timestamp + lockDuration) / WEEK) * WEEK;
        
        axmToken.safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 votingPower = calculateVotingPower(amount, unlockTime);
        
        locks[msg.sender] = Lock({
            amount: amount,
            unlockTime: unlockTime,
            lockStart: block.timestamp,
            initialVotingPower: votingPower
        });
        
        totalLocked += amount;
        totalVotingPower += votingPower;
        totalLockers++;
        
        emit Locked(msg.sender, amount, unlockTime, votingPower);
    }

    function increaseLockAmount(uint256 additionalAmount) external nonReentrant whenNotPaused {
        require(additionalAmount > 0, "Amount must be positive");
        Lock storage lock = locks[msg.sender];
        require(lock.amount > 0, "No existing lock");
        require(lock.unlockTime > block.timestamp, "Lock expired");
        
        axmToken.safeTransferFrom(msg.sender, address(this), additionalAmount);
        
        uint256 oldPower = balanceOf(msg.sender);
        
        lock.amount += additionalAmount;
        
        uint256 newPower = calculateVotingPower(lock.amount, lock.unlockTime);
        lock.initialVotingPower = newPower;
        lock.lockStart = block.timestamp;
        
        totalLocked += additionalAmount;
        totalVotingPower = totalVotingPower - oldPower + newPower;
        
        emit Increased(msg.sender, additionalAmount, newPower);
    }

    function extendLock(uint256 newDuration) external nonReentrant whenNotPaused {
        Lock storage lock = locks[msg.sender];
        require(lock.amount > 0, "No existing lock");
        
        uint256 newUnlockTime = ((block.timestamp + newDuration) / WEEK) * WEEK;
        require(newUnlockTime > lock.unlockTime, "New unlock must be later");
        require(newDuration <= MAX_LOCK_DURATION, "Lock too long");
        
        uint256 oldPower = balanceOf(msg.sender);
        
        lock.unlockTime = newUnlockTime;
        
        uint256 newPower = calculateVotingPower(lock.amount, newUnlockTime);
        lock.initialVotingPower = newPower;
        lock.lockStart = block.timestamp;
        
        totalVotingPower = totalVotingPower - oldPower + newPower;
        
        emit Extended(msg.sender, newUnlockTime, newPower);
    }

    function withdraw() external nonReentrant {
        Lock storage lock = locks[msg.sender];
        require(lock.amount > 0, "No lock exists");
        require(block.timestamp >= lock.unlockTime, "Lock not expired");
        
        uint256 amount = lock.amount;
        
        totalLocked -= amount;
        totalLockers--;
        
        delete locks[msg.sender];
        
        axmToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }

    function balanceOf(address user) public view returns (uint256) {
        Lock memory lock = locks[user];
        if (lock.amount == 0 || block.timestamp >= lock.unlockTime) {
            return 0;
        }
        return calculateVotingPower(lock.amount, lock.unlockTime);
    }

    function calculateVotingPower(uint256 amount, uint256 unlockTime) public view returns (uint256) {
        if (unlockTime <= block.timestamp) {
            return 0;
        }
        uint256 timeRemaining = unlockTime - block.timestamp;
        return (amount * timeRemaining) / MAX_LOCK_DURATION;
    }

    function totalSupply() external view returns (uint256) {
        return totalVotingPower;
    }

    function addRewards(uint256 amount) external onlyRole(REWARDS_DISTRIBUTOR_ROLE) nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(totalVotingPower > 0, "No voting power");
        
        axmToken.safeTransferFrom(msg.sender, address(this), amount);
        
        currentEpoch++;
        
        rewardEpochs[currentEpoch] = RewardEpoch({
            epochId: currentEpoch,
            totalRewards: amount,
            rewardsPerVePower: (amount * PRECISION) / totalVotingPower,
            startTime: block.timestamp,
            endTime: block.timestamp + WEEK,
            distributed: true
        });
        
        totalRewardsDistributed += amount;
        
        emit RewardsAdded(currentEpoch, amount);
    }

    function claimRewards(uint256 epochId) external nonReentrant {
        require(epochId > 0 && epochId <= currentEpoch, "Invalid epoch");
        require(!claimedEpoch[msg.sender][epochId], "Already claimed");
        
        RewardEpoch memory epoch = rewardEpochs[epochId];
        require(epoch.distributed, "Epoch not distributed");
        
        uint256 userPower = balanceOf(msg.sender);
        require(userPower > 0, "No voting power");
        
        uint256 reward = (userPower * epoch.rewardsPerVePower) / PRECISION;
        require(reward > 0, "No rewards");
        
        claimedEpoch[msg.sender][epochId] = true;
        totalClaimed[msg.sender] += reward;
        
        axmToken.safeTransfer(msg.sender, reward);
        
        emit RewardsClaimed(msg.sender, epochId, reward);
    }

    function getClaimableRewards(address user) external view returns (uint256) {
        uint256 totalClaimable = 0;
        uint256 userPower = balanceOf(user);
        
        if (userPower == 0) {
            return 0;
        }
        
        for (uint256 i = 1; i <= currentEpoch; i++) {
            if (!claimedEpoch[user][i] && rewardEpochs[i].distributed) {
                uint256 reward = (userPower * rewardEpochs[i].rewardsPerVePower) / PRECISION;
                totalClaimable += reward;
            }
        }
        
        return totalClaimable;
    }

    function getLock(address user) external view returns (Lock memory) {
        return locks[user];
    }

    function getLockerCount() external view returns (uint256) {
        return totalLockers;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
