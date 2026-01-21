// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AxiomTradingRewards
 * @author Axiom Protocol
 * @notice Rewards users with AXM tokens based on trading volume
 * @dev Epoch-based reward distribution with volume tracking
 */
contract AxiomTradingRewards is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant PRECISION = 1e18;
    uint256 public constant BASIS_POINTS = 10000;

    struct Epoch {
        uint256 startTime;
        uint256 endTime;
        uint256 totalVolume;
        uint256 rewardPool;
        uint256 rewardPerVolume;
        bool finalized;
    }

    struct UserEpochData {
        uint256 volume;
        bool claimed;
    }

    struct UserStats {
        uint256 totalVolume;
        uint256 totalRewardsClaimed;
        uint256 lastTradeTime;
    }

    address public rewardToken;
    address public treasurySafe;
    address public exchangeHub;

    uint256 public currentEpoch;
    uint256 public epochDuration;
    uint256 public rewardRateBps;
    uint256 public maxRewardPerEpoch;

    mapping(uint256 => Epoch) public epochs;
    mapping(uint256 => mapping(address => UserEpochData)) public userEpochData;
    mapping(address => UserStats) public userStats;
    mapping(address => uint256[]) public userEpochs;

    event EpochStarted(uint256 indexed epochId, uint256 startTime, uint256 rewardPool);
    event EpochFinalized(uint256 indexed epochId, uint256 totalVolume, uint256 rewardPerVolume);
    event VolumeRecorded(address indexed user, uint256 indexed epochId, uint256 volume);
    event RewardsClaimed(address indexed user, uint256 indexed epochId, uint256 amount);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _rewardToken,
        address _treasurySafe,
        address _exchangeHub,
        uint256 _epochDuration,
        uint256 _rewardRateBps,
        uint256 _maxRewardPerEpoch
    ) public initializer {
        require(_rewardToken != address(0) && _treasurySafe != address(0) && _exchangeHub != address(0), "Zero addr");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        rewardToken = _rewardToken;
        treasurySafe = _treasurySafe;
        exchangeHub = _exchangeHub;
        epochDuration = _epochDuration;
        rewardRateBps = _rewardRateBps;
        maxRewardPerEpoch = _maxRewardPerEpoch;

        _grantRole(DEFAULT_ADMIN_ROLE, _treasurySafe);
        _grantRole(ADMIN_ROLE, _treasurySafe);
        _grantRole(UPGRADER_ROLE, _treasurySafe);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(REPORTER_ROLE, _exchangeHub);
    }

    function startNewEpoch(uint256 rewardPool) external onlyRole(OPERATOR_ROLE) {
        if (currentEpoch > 0) {
            Epoch storage prevEpoch = epochs[currentEpoch];
            require(block.timestamp >= prevEpoch.endTime, "Current epoch not ended");
            
            if (!prevEpoch.finalized) {
                _finalizeEpoch(currentEpoch);
            }
        }

        currentEpoch++;
        
        if (rewardPool > 0) {
            IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), rewardPool);
        }

        epochs[currentEpoch] = Epoch({
            startTime: block.timestamp,
            endTime: block.timestamp + epochDuration,
            totalVolume: 0,
            rewardPool: rewardPool,
            rewardPerVolume: 0,
            finalized: false
        });

        emit EpochStarted(currentEpoch, block.timestamp, rewardPool);
    }

    function recordVolume(address user, uint256 volume) external onlyRole(REPORTER_ROLE) {
        require(currentEpoch > 0, "No active epoch");
        Epoch storage epoch = epochs[currentEpoch];
        require(block.timestamp >= epoch.startTime && block.timestamp < epoch.endTime, "Epoch not active");
        require(!epoch.finalized, "Epoch finalized");

        UserEpochData storage userData = userEpochData[currentEpoch][user];
        
        if (userData.volume == 0) {
            userEpochs[user].push(currentEpoch);
        }

        userData.volume += volume;
        epoch.totalVolume += volume;

        UserStats storage stats = userStats[user];
        stats.totalVolume += volume;
        stats.lastTradeTime = block.timestamp;

        emit VolumeRecorded(user, currentEpoch, volume);
    }

    function finalizeEpoch(uint256 epochId) external onlyRole(OPERATOR_ROLE) {
        _finalizeEpoch(epochId);
    }

    function _finalizeEpoch(uint256 epochId) internal {
        Epoch storage epoch = epochs[epochId];
        require(!epoch.finalized, "Already finalized");
        require(block.timestamp >= epoch.endTime || epochId < currentEpoch, "Epoch not ended");

        epoch.finalized = true;

        if (epoch.totalVolume > 0 && epoch.rewardPool > 0) {
            epoch.rewardPerVolume = (epoch.rewardPool * PRECISION) / epoch.totalVolume;
        }

        emit EpochFinalized(epochId, epoch.totalVolume, epoch.rewardPerVolume);
    }

    function claimRewards(uint256 epochId) external nonReentrant {
        Epoch storage epoch = epochs[epochId];
        require(epoch.finalized, "Epoch not finalized");

        UserEpochData storage userData = userEpochData[epochId][msg.sender];
        require(userData.volume > 0, "No volume in epoch");
        require(!userData.claimed, "Already claimed");

        uint256 reward = (userData.volume * epoch.rewardPerVolume) / PRECISION;
        require(reward > 0, "No reward");

        userData.claimed = true;
        userStats[msg.sender].totalRewardsClaimed += reward;

        IERC20(rewardToken).safeTransfer(msg.sender, reward);

        emit RewardsClaimed(msg.sender, epochId, reward);
    }

    function claimAllRewards() external nonReentrant {
        uint256[] memory epochIds = userEpochs[msg.sender];
        uint256 totalReward = 0;

        for (uint256 i = 0; i < epochIds.length; i++) {
            uint256 epochId = epochIds[i];
            Epoch storage epoch = epochs[epochId];
            UserEpochData storage userData = userEpochData[epochId][msg.sender];

            if (epoch.finalized && !userData.claimed && userData.volume > 0) {
                uint256 reward = (userData.volume * epoch.rewardPerVolume) / PRECISION;
                
                if (reward > 0) {
                    userData.claimed = true;
                    totalReward += reward;
                    emit RewardsClaimed(msg.sender, epochId, reward);
                }
            }
        }

        require(totalReward > 0, "No rewards");
        userStats[msg.sender].totalRewardsClaimed += totalReward;
        IERC20(rewardToken).safeTransfer(msg.sender, totalReward);
    }

    function addRewardsToCurrentEpoch(uint256 amount) external onlyRole(OPERATOR_ROLE) {
        require(currentEpoch > 0, "No active epoch");
        Epoch storage epoch = epochs[currentEpoch];
        require(!epoch.finalized, "Epoch finalized");

        IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), amount);
        epoch.rewardPool += amount;
    }

    function setRewardRate(uint256 newRate) external onlyRole(ADMIN_ROLE) {
        emit RewardRateUpdated(rewardRateBps, newRate);
        rewardRateBps = newRate;
    }

    function setEpochDuration(uint256 duration) external onlyRole(ADMIN_ROLE) {
        epochDuration = duration;
    }

    function setMaxRewardPerEpoch(uint256 max) external onlyRole(ADMIN_ROLE) {
        maxRewardPerEpoch = max;
    }

    function grantReporterRole(address reporter) external onlyRole(ADMIN_ROLE) {
        _grantRole(REPORTER_ROLE, reporter);
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function pendingRewards(uint256 epochId, address user) external view returns (uint256) {
        Epoch storage epoch = epochs[epochId];
        UserEpochData storage userData = userEpochData[epochId][user];

        if (!epoch.finalized || userData.claimed || userData.volume == 0) {
            return 0;
        }

        return (userData.volume * epoch.rewardPerVolume) / PRECISION;
    }

    function estimatedRewards(address user) external view returns (uint256) {
        if (currentEpoch == 0) return 0;

        Epoch storage epoch = epochs[currentEpoch];
        UserEpochData storage userData = userEpochData[currentEpoch][user];

        if (epoch.finalized || epoch.totalVolume == 0 || userData.volume == 0) {
            return 0;
        }

        uint256 estimatedRewardPerVolume = (epoch.rewardPool * PRECISION) / epoch.totalVolume;
        return (userData.volume * estimatedRewardPerVolume) / PRECISION;
    }

    function getEpoch(uint256 epochId) external view returns (Epoch memory) {
        return epochs[epochId];
    }

    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }

    function getUserEpochData(uint256 epochId, address user) external view returns (UserEpochData memory) {
        return userEpochData[epochId][user];
    }

    function getUserEpochs(address user) external view returns (uint256[] memory) {
        return userEpochs[user];
    }

    function getCurrentEpochInfo() external view returns (Epoch memory) {
        return epochs[currentEpoch];
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    uint256[40] private __gap;
}
