// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAxiomExchangeHub {
    function getUserLiquidity(uint256 poolId, address user) external view returns (uint256);
    function getPoolCore(uint256 poolId) external view returns (
        address tokenA, address tokenB, uint256 reserveA, uint256 reserveB,
        uint256 totalLiquidity, uint256 lockedLiquidity, bool isActive
    );
}

/**
 * @title AxiomLPStaking
 * @author Axiom Protocol
 * @notice Stake LP positions to earn AXM rewards with time-locked boost tiers
 * @dev Supports 4 lock tiers: 30, 90, 180, 365 days with increasing multipliers
 */
contract AxiomLPStaking is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRECISION = 1e18;

    enum LockTier { FLEX, TIER_30, TIER_90, TIER_180, TIER_365 }

    struct TierConfig {
        uint256 duration;
        uint256 multiplier;
        bool active;
    }

    struct StakePosition {
        uint256 poolId;
        uint256 amount;
        uint256 stakedAt;
        uint256 lockEnd;
        LockTier tier;
        uint256 rewardDebt;
        uint256 pendingRewards;
    }

    struct PoolRewards {
        uint256 accRewardPerShare;
        uint256 lastRewardTime;
        uint256 totalStaked;
        uint256 totalBoostedStaked;
        bool active;
    }

    address public exchangeHub;
    address public rewardToken;
    address public treasurySafe;
    
    uint256 public rewardPerSecond;
    uint256 public totalAllocPoints;
    
    mapping(LockTier => TierConfig) public tierConfigs;
    mapping(uint256 => PoolRewards) public poolRewards;
    mapping(uint256 => uint256) public poolAllocPoints;
    mapping(address => mapping(uint256 => StakePosition)) public userStakes;
    mapping(address => uint256[]) public userStakedPools;

    event Staked(address indexed user, uint256 indexed poolId, uint256 amount, LockTier tier, uint256 lockEnd);
    event Unstaked(address indexed user, uint256 indexed poolId, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed poolId, uint256 amount);
    event EmergencyUnstaked(address indexed user, uint256 indexed poolId, uint256 amount, uint256 penalty);
    event PoolAdded(uint256 indexed poolId, uint256 allocPoints);
    event PoolUpdated(uint256 indexed poolId, uint256 allocPoints);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _exchangeHub,
        address _rewardToken,
        address _treasurySafe,
        uint256 _rewardPerSecond
    ) public initializer {
        require(_exchangeHub != address(0) && _rewardToken != address(0) && _treasurySafe != address(0), "Zero addr");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        exchangeHub = _exchangeHub;
        rewardToken = _rewardToken;
        treasurySafe = _treasurySafe;
        rewardPerSecond = _rewardPerSecond;

        _grantRole(DEFAULT_ADMIN_ROLE, _treasurySafe);
        _grantRole(ADMIN_ROLE, _treasurySafe);
        _grantRole(UPGRADER_ROLE, _treasurySafe);
        _grantRole(OPERATOR_ROLE, msg.sender);

        tierConfigs[LockTier.FLEX] = TierConfig(0, 10000, true);
        tierConfigs[LockTier.TIER_30] = TierConfig(30 days, 12500, true);
        tierConfigs[LockTier.TIER_90] = TierConfig(90 days, 15000, true);
        tierConfigs[LockTier.TIER_180] = TierConfig(180 days, 20000, true);
        tierConfigs[LockTier.TIER_365] = TierConfig(365 days, 30000, true);
    }

    function addPool(uint256 poolId, uint256 allocPoints) external onlyRole(OPERATOR_ROLE) {
        require(!poolRewards[poolId].active, "Pool exists");
        
        updateAllPools();
        
        totalAllocPoints += allocPoints;
        poolAllocPoints[poolId] = allocPoints;
        poolRewards[poolId] = PoolRewards({
            accRewardPerShare: 0,
            lastRewardTime: block.timestamp,
            totalStaked: 0,
            totalBoostedStaked: 0,
            active: true
        });

        emit PoolAdded(poolId, allocPoints);
    }

    function setPoolAllocPoints(uint256 poolId, uint256 allocPoints) external onlyRole(OPERATOR_ROLE) {
        require(poolRewards[poolId].active, "Pool not active");
        
        updatePool(poolId);
        
        totalAllocPoints = totalAllocPoints - poolAllocPoints[poolId] + allocPoints;
        poolAllocPoints[poolId] = allocPoints;

        emit PoolUpdated(poolId, allocPoints);
    }

    function stake(uint256 poolId, uint256 amount, LockTier tier) external nonReentrant whenNotPaused {
        require(amount > 0, "Zero amount");
        require(poolRewards[poolId].active, "Pool not active");
        require(tierConfigs[tier].active, "Tier not active");

        uint256 userLiq = IAxiomExchangeHub(exchangeHub).getUserLiquidity(poolId, msg.sender);
        StakePosition storage pos = userStakes[msg.sender][poolId];
        require(userLiq >= pos.amount + amount, "Insufficient LP");

        updatePool(poolId);

        if (pos.amount > 0) {
            uint256 pending = _calculatePending(poolId, msg.sender);
            pos.pendingRewards += pending;
        } else {
            userStakedPools[msg.sender].push(poolId);
        }

        uint256 lockDuration = tierConfigs[tier].duration;
        uint256 lockEnd = lockDuration > 0 ? block.timestamp + lockDuration : 0;

        if (pos.lockEnd > lockEnd) {
            lockEnd = pos.lockEnd;
            tier = pos.tier;
        }

        uint256 boostedAmount = (amount * tierConfigs[tier].multiplier) / BASIS_POINTS;

        pos.poolId = poolId;
        pos.amount += amount;
        pos.stakedAt = block.timestamp;
        pos.lockEnd = lockEnd;
        pos.tier = tier;
        pos.rewardDebt = (pos.amount * tierConfigs[pos.tier].multiplier / BASIS_POINTS) * poolRewards[poolId].accRewardPerShare / PRECISION;

        poolRewards[poolId].totalStaked += amount;
        poolRewards[poolId].totalBoostedStaked += boostedAmount;

        emit Staked(msg.sender, poolId, amount, tier, lockEnd);
    }

    function unstake(uint256 poolId, uint256 amount) external nonReentrant {
        StakePosition storage pos = userStakes[msg.sender][poolId];
        require(pos.amount >= amount, "Insufficient stake");
        require(block.timestamp >= pos.lockEnd, "Still locked");

        updatePool(poolId);

        uint256 pending = _calculatePending(poolId, msg.sender) + pos.pendingRewards;
        pos.pendingRewards = 0;

        uint256 boostedAmount = (amount * tierConfigs[pos.tier].multiplier) / BASIS_POINTS;

        pos.amount -= amount;
        pos.rewardDebt = (pos.amount * tierConfigs[pos.tier].multiplier / BASIS_POINTS) * poolRewards[poolId].accRewardPerShare / PRECISION;

        poolRewards[poolId].totalStaked -= amount;
        poolRewards[poolId].totalBoostedStaked -= boostedAmount;

        if (pending > 0) {
            IERC20(rewardToken).safeTransfer(msg.sender, pending);
            emit RewardsClaimed(msg.sender, poolId, pending);
        }

        emit Unstaked(msg.sender, poolId, amount);
    }

    function emergencyUnstake(uint256 poolId) external nonReentrant {
        StakePosition storage pos = userStakes[msg.sender][poolId];
        require(pos.amount > 0, "No stake");

        uint256 amount = pos.amount;
        uint256 penalty = 0;

        if (block.timestamp < pos.lockEnd) {
            penalty = (amount * 1000) / BASIS_POINTS;
        }

        uint256 boostedAmount = (amount * tierConfigs[pos.tier].multiplier) / BASIS_POINTS;

        pos.amount = 0;
        pos.pendingRewards = 0;
        pos.rewardDebt = 0;
        pos.lockEnd = 0;

        poolRewards[poolId].totalStaked -= amount;
        poolRewards[poolId].totalBoostedStaked -= boostedAmount;

        emit EmergencyUnstaked(msg.sender, poolId, amount, penalty);
    }

    function claimRewards(uint256 poolId) external nonReentrant {
        StakePosition storage pos = userStakes[msg.sender][poolId];
        require(pos.amount > 0, "No stake");

        updatePool(poolId);

        uint256 pending = _calculatePending(poolId, msg.sender) + pos.pendingRewards;
        require(pending > 0, "No rewards");

        pos.pendingRewards = 0;
        pos.rewardDebt = (pos.amount * tierConfigs[pos.tier].multiplier / BASIS_POINTS) * poolRewards[poolId].accRewardPerShare / PRECISION;

        IERC20(rewardToken).safeTransfer(msg.sender, pending);

        emit RewardsClaimed(msg.sender, poolId, pending);
    }

    function claimAllRewards() external nonReentrant {
        uint256[] memory pools = userStakedPools[msg.sender];
        uint256 totalPending = 0;

        for (uint256 i = 0; i < pools.length; i++) {
            uint256 poolId = pools[i];
            StakePosition storage pos = userStakes[msg.sender][poolId];
            
            if (pos.amount > 0) {
                updatePool(poolId);
                uint256 pending = _calculatePending(poolId, msg.sender) + pos.pendingRewards;
                
                if (pending > 0) {
                    pos.pendingRewards = 0;
                    pos.rewardDebt = (pos.amount * tierConfigs[pos.tier].multiplier / BASIS_POINTS) * poolRewards[poolId].accRewardPerShare / PRECISION;
                    totalPending += pending;
                    
                    emit RewardsClaimed(msg.sender, poolId, pending);
                }
            }
        }

        require(totalPending > 0, "No rewards");
        IERC20(rewardToken).safeTransfer(msg.sender, totalPending);
    }

    function updatePool(uint256 poolId) public {
        PoolRewards storage pool = poolRewards[poolId];
        if (block.timestamp <= pool.lastRewardTime || !pool.active) return;
        
        if (pool.totalBoostedStaked == 0 || totalAllocPoints == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - pool.lastRewardTime;
        uint256 reward = elapsed * rewardPerSecond * poolAllocPoints[poolId] / totalAllocPoints;
        
        pool.accRewardPerShare += (reward * PRECISION) / pool.totalBoostedStaked;
        pool.lastRewardTime = block.timestamp;
    }

    function updateAllPools() public {
        for (uint256 i = 1; i <= 100; i++) {
            if (poolRewards[i].active) {
                updatePool(i);
            }
        }
    }

    function setRewardPerSecond(uint256 newRate) external onlyRole(ADMIN_ROLE) {
        updateAllPools();
        emit RewardRateUpdated(rewardPerSecond, newRate);
        rewardPerSecond = newRate;
    }

    function setTierConfig(LockTier tier, uint256 duration, uint256 multiplier, bool active) external onlyRole(ADMIN_ROLE) {
        tierConfigs[tier] = TierConfig(duration, multiplier, active);
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function pendingRewards(uint256 poolId, address user) external view returns (uint256) {
        StakePosition storage pos = userStakes[user][poolId];
        if (pos.amount == 0) return 0;

        PoolRewards storage pool = poolRewards[poolId];
        uint256 accRewardPerShare = pool.accRewardPerShare;

        if (block.timestamp > pool.lastRewardTime && pool.totalBoostedStaked > 0 && totalAllocPoints > 0) {
            uint256 elapsed = block.timestamp - pool.lastRewardTime;
            uint256 reward = elapsed * rewardPerSecond * poolAllocPoints[poolId] / totalAllocPoints;
            accRewardPerShare += (reward * PRECISION) / pool.totalBoostedStaked;
        }

        uint256 boostedAmount = (pos.amount * tierConfigs[pos.tier].multiplier) / BASIS_POINTS;
        uint256 pending = (boostedAmount * accRewardPerShare / PRECISION) - pos.rewardDebt;
        
        return pending + pos.pendingRewards;
    }

    function getUserStake(uint256 poolId, address user) external view returns (StakePosition memory) {
        return userStakes[user][poolId];
    }

    function getUserStakedPools(address user) external view returns (uint256[] memory) {
        return userStakedPools[user];
    }

    function getPoolInfo(uint256 poolId) external view returns (PoolRewards memory) {
        return poolRewards[poolId];
    }

    function getTierConfig(LockTier tier) external view returns (TierConfig memory) {
        return tierConfigs[tier];
    }

    function _calculatePending(uint256 poolId, address user) internal view returns (uint256) {
        StakePosition storage pos = userStakes[user][poolId];
        uint256 boostedAmount = (pos.amount * tierConfigs[pos.tier].multiplier) / BASIS_POINTS;
        return (boostedAmount * poolRewards[poolId].accRewardPerShare / PRECISION) - pos.rewardDebt;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    uint256[40] private __gap;
}
