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
 * @dev AIP-001 Implementation: Curve-style veCRV locking with checkpointed voting power
 * 
 * Features:
 * - Lock AXM for 1-4 years to receive veAXM voting power
 * - Time-weighted voting power with proper decay tracking
 * - Checkpoint system for accurate total supply tracking
 * - Epoch-based reward snapshots for fair distribution
 * - Real yield distribution from protocol fees
 * - Non-transferable (true commitment)
 * 
 * Voting Power Formula:
 * - veAXM = AXM_locked * (lock_time_remaining / MAX_LOCK)
 * - MAX_LOCK = 4 years (208 weeks)
 * - Power decays linearly as lock expires
 * 
 * Checkpoint System:
 * - Global checkpoints track total voting power over time
 * - User checkpoints snapshot voting power at epoch start
 * - Rewards distributed based on snapshot, not current balance
 */
contract veAXM is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REWARDS_DISTRIBUTOR_ROLE = keccak256("REWARDS_DISTRIBUTOR_ROLE");

    uint256 public constant WEEK = 7 days;
    uint256 public constant MIN_LOCK_DURATION = 4 weeks;
    uint256 public constant MAX_LOCK_DURATION = 4 * 365 days;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_EPOCHS_PER_CLAIM = 50;

    IERC20 public axmToken;
    
    string public constant name = "Vote-Escrowed AXM";
    string public constant symbol = "veAXM";
    uint8 public constant decimals = 18;

    uint256 public totalLocked;
    uint256 public totalLockers;

    struct Lock {
        uint256 amount;
        uint256 unlockTime;
        uint256 lockStart;
    }

    struct Point {
        int128 bias;
        int128 slope;
        uint256 ts;
    }

    struct RewardEpoch {
        uint256 epochId;
        uint256 totalRewards;
        uint256 totalVotingPowerSnapshot;
        uint256 startTime;
        uint256 endTime;
        bool active;
    }

    mapping(address => Lock) public locks;
    
    uint256 public epoch;
    mapping(uint256 => Point) public pointHistory;
    mapping(address => uint256) public userPointEpoch;
    mapping(address => mapping(uint256 => Point)) public userPointHistory;
    
    mapping(uint256 => int128) public slopeChanges;
    
    mapping(uint256 => RewardEpoch) public rewardEpochs;
    mapping(address => mapping(uint256 => bool)) public claimedEpoch;
    mapping(address => uint256) public totalClaimed;

    uint256 public currentRewardEpoch;
    uint256 public totalRewardsDistributed;

    event Locked(address indexed user, uint256 amount, uint256 unlockTime, uint256 votingPower);
    event Extended(address indexed user, uint256 newUnlockTime, uint256 newVotingPower);
    event Increased(address indexed user, uint256 additionalAmount, uint256 newVotingPower);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsAdded(uint256 indexed epochId, uint256 amount, uint256 totalVotingPower);
    event RewardsClaimed(address indexed user, uint256 indexed epochId, uint256 amount);
    event Checkpoint(uint256 indexed epoch, int128 bias, int128 slope, uint256 ts);

    constructor(address _axmToken) {
        require(_axmToken != address(0), "Invalid AXM token");
        axmToken = IERC20(_axmToken);
        
        pointHistory[0] = Point({bias: 0, slope: 0, ts: block.timestamp});
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(REWARDS_DISTRIBUTOR_ROLE, msg.sender);
    }

    function checkpoint() public {
        _checkpoint(address(0), Lock(0, 0, 0), Lock(0, 0, 0));
    }

    function _checkpoint(address user, Lock memory oldLock, Lock memory newLock) internal {
        Point memory userOldPoint;
        Point memory userNewPoint;
        int128 oldSlope = 0;
        int128 newSlope = 0;
        
        if (user != address(0)) {
            if (oldLock.unlockTime > block.timestamp && oldLock.amount > 0) {
                userOldPoint.slope = int128(int256(oldLock.amount / MAX_LOCK_DURATION));
                userOldPoint.bias = userOldPoint.slope * int128(int256(oldLock.unlockTime - block.timestamp));
            }
            
            if (newLock.unlockTime > block.timestamp && newLock.amount > 0) {
                userNewPoint.slope = int128(int256(newLock.amount / MAX_LOCK_DURATION));
                userNewPoint.bias = userNewPoint.slope * int128(int256(newLock.unlockTime - block.timestamp));
            }
            
            oldSlope = slopeChanges[oldLock.unlockTime];
            if (newLock.unlockTime != 0) {
                if (newLock.unlockTime == oldLock.unlockTime) {
                    newSlope = oldSlope;
                } else {
                    newSlope = slopeChanges[newLock.unlockTime];
                }
            }
        }
        
        Point memory lastPoint = pointHistory[epoch];
        uint256 lastCheckpoint = lastPoint.ts;
        
        Point memory initialLastPoint = lastPoint;
        
        uint256 ti = (lastCheckpoint / WEEK) * WEEK;
        for (uint256 i = 0; i < 255; i++) {
            ti += WEEK;
            int128 dSlope = 0;
            if (ti > block.timestamp) {
                ti = block.timestamp;
            } else {
                dSlope = slopeChanges[ti];
            }
            
            lastPoint.bias -= lastPoint.slope * int128(int256(ti - lastCheckpoint));
            lastPoint.slope += dSlope;
            
            if (lastPoint.bias < 0) {
                lastPoint.bias = 0;
            }
            if (lastPoint.slope < 0) {
                lastPoint.slope = 0;
            }
            
            lastCheckpoint = ti;
            lastPoint.ts = ti;
            
            epoch++;
            if (ti == block.timestamp) {
                break;
            } else {
                pointHistory[epoch] = lastPoint;
            }
        }
        
        if (user != address(0)) {
            lastPoint.bias += userNewPoint.bias - userOldPoint.bias;
            lastPoint.slope += userNewPoint.slope - userOldPoint.slope;
            
            if (lastPoint.bias < 0) {
                lastPoint.bias = 0;
            }
            if (lastPoint.slope < 0) {
                lastPoint.slope = 0;
            }
        }
        
        pointHistory[epoch] = lastPoint;
        emit Checkpoint(epoch, lastPoint.bias, lastPoint.slope, lastPoint.ts);
        
        if (user != address(0)) {
            if (oldLock.unlockTime > block.timestamp) {
                oldSlope += userOldPoint.slope;
                if (newLock.unlockTime == oldLock.unlockTime) {
                    oldSlope -= userNewPoint.slope;
                }
                slopeChanges[oldLock.unlockTime] = oldSlope;
            }
            
            if (newLock.unlockTime > block.timestamp) {
                if (newLock.unlockTime > oldLock.unlockTime) {
                    newSlope -= userNewPoint.slope;
                    slopeChanges[newLock.unlockTime] = newSlope;
                }
            }
            
            userPointEpoch[user]++;
            userNewPoint.ts = block.timestamp;
            userPointHistory[user][userPointEpoch[user]] = userNewPoint;
        }
    }

    function createLock(uint256 amount, uint256 lockDuration) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(lockDuration >= MIN_LOCK_DURATION, "Lock too short");
        require(lockDuration <= MAX_LOCK_DURATION, "Lock too long");
        require(locks[msg.sender].amount == 0, "Lock already exists");
        
        uint256 unlockTime = ((block.timestamp + lockDuration) / WEEK) * WEEK;
        
        axmToken.safeTransferFrom(msg.sender, address(this), amount);
        
        Lock memory newLock = Lock({
            amount: amount,
            unlockTime: unlockTime,
            lockStart: block.timestamp
        });
        
        locks[msg.sender] = newLock;
        totalLocked += amount;
        totalLockers++;
        
        _checkpoint(msg.sender, Lock(0, 0, 0), newLock);
        
        uint256 votingPower = balanceOf(msg.sender);
        emit Locked(msg.sender, amount, unlockTime, votingPower);
    }

    function increaseLockAmount(uint256 additionalAmount) external nonReentrant whenNotPaused {
        require(additionalAmount > 0, "Amount must be positive");
        Lock storage lock = locks[msg.sender];
        require(lock.amount > 0, "No existing lock");
        require(lock.unlockTime > block.timestamp, "Lock expired");
        
        Lock memory oldLock = lock;
        
        axmToken.safeTransferFrom(msg.sender, address(this), additionalAmount);
        
        lock.amount += additionalAmount;
        totalLocked += additionalAmount;
        
        _checkpoint(msg.sender, oldLock, lock);
        
        uint256 votingPower = balanceOf(msg.sender);
        emit Increased(msg.sender, additionalAmount, votingPower);
    }

    function extendLock(uint256 newDuration) external nonReentrant whenNotPaused {
        Lock storage lock = locks[msg.sender];
        require(lock.amount > 0, "No existing lock");
        
        uint256 newUnlockTime = ((block.timestamp + newDuration) / WEEK) * WEEK;
        require(newUnlockTime > lock.unlockTime, "New unlock must be later");
        require(newDuration <= MAX_LOCK_DURATION, "Lock too long");
        
        Lock memory oldLock = lock;
        lock.unlockTime = newUnlockTime;
        
        _checkpoint(msg.sender, oldLock, lock);
        
        uint256 votingPower = balanceOf(msg.sender);
        emit Extended(msg.sender, newUnlockTime, votingPower);
    }

    function withdraw() external nonReentrant {
        Lock storage lock = locks[msg.sender];
        require(lock.amount > 0, "No lock exists");
        require(block.timestamp >= lock.unlockTime, "Lock not expired");
        
        uint256 amount = lock.amount;
        Lock memory oldLock = lock;
        
        totalLocked -= amount;
        totalLockers--;
        
        delete locks[msg.sender];
        
        _checkpoint(msg.sender, oldLock, Lock(0, 0, 0));
        
        axmToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }

    function balanceOf(address user) public view returns (uint256) {
        uint256 userEpoch = userPointEpoch[user];
        if (userEpoch == 0) {
            return 0;
        }
        
        Point memory lastPoint = userPointHistory[user][userEpoch];
        lastPoint.bias -= lastPoint.slope * int128(int256(block.timestamp - lastPoint.ts));
        
        if (lastPoint.bias < 0) {
            return 0;
        }
        return uint256(int256(lastPoint.bias));
    }

    function totalSupply() public view returns (uint256) {
        Point memory lastPoint = pointHistory[epoch];
        lastPoint.bias -= lastPoint.slope * int128(int256(block.timestamp - lastPoint.ts));
        
        if (lastPoint.bias < 0) {
            return 0;
        }
        return uint256(int256(lastPoint.bias));
    }

    function balanceOfAt(address user, uint256 timestamp) public view returns (uint256) {
        uint256 userEpoch = userPointEpoch[user];
        if (userEpoch == 0) {
            return 0;
        }
        
        uint256 targetEpoch = userEpoch;
        for (uint256 i = userEpoch; i >= 1; i--) {
            if (userPointHistory[user][i].ts <= timestamp) {
                targetEpoch = i;
                break;
            }
            if (i == 1) {
                return 0;
            }
        }
        
        Point memory point = userPointHistory[user][targetEpoch];
        
        if (timestamp < point.ts) {
            return 0;
        }
        
        int128 elapsed = int128(int256(timestamp - point.ts));
        int128 adjustedBias = point.bias - (point.slope * elapsed);
        
        if (adjustedBias < 0) {
            return 0;
        }
        return uint256(int256(adjustedBias));
    }

    function addRewards(uint256 amount) external onlyRole(REWARDS_DISTRIBUTOR_ROLE) nonReentrant {
        require(amount > 0, "Amount must be positive");
        
        checkpoint();
        
        uint256 currentTotalSupply = totalSupply();
        require(currentTotalSupply > 0, "No voting power");
        
        axmToken.safeTransferFrom(msg.sender, address(this), amount);
        
        currentRewardEpoch++;
        
        rewardEpochs[currentRewardEpoch] = RewardEpoch({
            epochId: currentRewardEpoch,
            totalRewards: amount,
            totalVotingPowerSnapshot: currentTotalSupply,
            startTime: block.timestamp,
            endTime: block.timestamp + WEEK,
            active: true
        });
        
        totalRewardsDistributed += amount;
        
        emit RewardsAdded(currentRewardEpoch, amount, currentTotalSupply);
    }

    function claimRewards(uint256 rewardEpochId) external nonReentrant {
        require(rewardEpochId > 0 && rewardEpochId <= currentRewardEpoch, "Invalid epoch");
        require(!claimedEpoch[msg.sender][rewardEpochId], "Already claimed");
        
        RewardEpoch memory rewEpoch = rewardEpochs[rewardEpochId];
        require(rewEpoch.active, "Epoch not active");
        
        uint256 userPower = balanceOfAt(msg.sender, rewEpoch.startTime);
        require(userPower > 0, "No voting power at epoch start");
        
        uint256 reward = (rewEpoch.totalRewards * userPower) / rewEpoch.totalVotingPowerSnapshot;
        require(reward > 0, "No rewards");
        
        claimedEpoch[msg.sender][rewardEpochId] = true;
        totalClaimed[msg.sender] += reward;
        
        axmToken.safeTransfer(msg.sender, reward);
        
        emit RewardsClaimed(msg.sender, rewardEpochId, reward);
    }

    function getClaimableRewards(address user) external view returns (uint256) {
        uint256 totalClaimable = 0;
        
        uint256 startEpoch = currentRewardEpoch > MAX_EPOCHS_PER_CLAIM ? currentRewardEpoch - MAX_EPOCHS_PER_CLAIM + 1 : 1;
        
        for (uint256 i = startEpoch; i <= currentRewardEpoch; i++) {
            if (!claimedEpoch[user][i] && rewardEpochs[i].active) {
                uint256 power = balanceOfAt(user, rewardEpochs[i].startTime);
                if (power > 0) {
                    uint256 reward = (rewardEpochs[i].totalRewards * power) / rewardEpochs[i].totalVotingPowerSnapshot;
                    totalClaimable += reward;
                }
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

    function getRewardEpoch(uint256 epochId) external view returns (RewardEpoch memory) {
        return rewardEpochs[epochId];
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
