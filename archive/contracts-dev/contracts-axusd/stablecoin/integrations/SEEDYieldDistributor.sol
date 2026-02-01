// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISEED {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function lockEnd(address account) external view returns (uint256);
}

contract SEEDYieldDistributor is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REVENUE_ROUTER_ROLE = keccak256("REVENUE_ROUTER_ROLE");

    IERC20 public axusd;
    ISEED public seed;
    address public treasuryVault;

    uint256 public constant EPOCH_DURATION = 7 days;
    uint256 public constant MIN_CLAIM_AMOUNT = 1 * 10**18;

    uint256 public currentEpoch;
    uint256 public epochStartTime;
    uint256 public totalDistributed;
    uint256 public totalClaimed;

    struct Epoch {
        uint256 epochId;
        uint256 totalRevenue;
        uint256 totalSEEDSupply;
        uint256 revenuePerSEED;
        uint256 startTime;
        uint256 endTime;
        bool finalized;
    }

    struct UserClaim {
        uint256 lastClaimedEpoch;
        uint256 totalClaimed;
        uint256 pendingRewards;
    }

    mapping(uint256 => Epoch) public epochs;
    mapping(address => UserClaim) public userClaims;
    mapping(uint256 => mapping(address => bool)) public epochClaimed;
    mapping(uint256 => uint256) public epochUserSEEDBalance;

    event RevenueDeposited(uint256 indexed epochId, uint256 amount, string source);
    event EpochFinalized(uint256 indexed epochId, uint256 totalRevenue, uint256 revenuePerSEED);
    event YieldClaimed(address indexed user, uint256 indexed epochId, uint256 amount);
    event NewEpochStarted(uint256 indexed epochId, uint256 startTime);

    constructor(
        address _axusd,
        address _seed,
        address _treasuryVault
    ) {
        require(_axusd != address(0), "Invalid AXUSD");
        require(_seed != address(0), "Invalid SEED");
        require(_treasuryVault != address(0), "Invalid treasury");

        axusd = IERC20(_axusd);
        seed = ISEED(_seed);
        treasuryVault = _treasuryVault;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        currentEpoch = 1;
        epochStartTime = block.timestamp;

        epochs[currentEpoch] = Epoch({
            epochId: currentEpoch,
            totalRevenue: 0,
            totalSEEDSupply: 0,
            revenuePerSEED: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + EPOCH_DURATION,
            finalized: false
        });

        emit NewEpochStarted(currentEpoch, block.timestamp);
    }

    function depositRevenue(uint256 amount, string calldata source) external onlyRole(REVENUE_ROUTER_ROLE) nonReentrant {
        require(amount > 0, "Zero amount");

        axusd.safeTransferFrom(msg.sender, address(this), amount);

        Epoch storage epoch = epochs[currentEpoch];
        epoch.totalRevenue += amount;
        totalDistributed += amount;

        emit RevenueDeposited(currentEpoch, amount, source);
    }

    function finalizeEpoch() external onlyRole(ADMIN_ROLE) {
        Epoch storage epoch = epochs[currentEpoch];
        require(!epoch.finalized, "Already finalized");
        require(block.timestamp >= epoch.endTime, "Epoch not ended");

        uint256 totalSEED = seed.totalSupply();
        epoch.totalSEEDSupply = totalSEED;

        if (totalSEED > 0 && epoch.totalRevenue > 0) {
            epoch.revenuePerSEED = (epoch.totalRevenue * 10**18) / totalSEED;
        }

        epoch.finalized = true;

        emit EpochFinalized(currentEpoch, epoch.totalRevenue, epoch.revenuePerSEED);

        currentEpoch++;
        epochs[currentEpoch] = Epoch({
            epochId: currentEpoch,
            totalRevenue: 0,
            totalSEEDSupply: 0,
            revenuePerSEED: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + EPOCH_DURATION,
            finalized: false
        });

        emit NewEpochStarted(currentEpoch, block.timestamp);
    }

    function claim(uint256 epochId) external nonReentrant whenNotPaused {
        require(epochId > 0 && epochId < currentEpoch, "Invalid epoch");
        require(!epochClaimed[epochId][msg.sender], "Already claimed");

        Epoch storage epoch = epochs[epochId];
        require(epoch.finalized, "Epoch not finalized");

        uint256 userSEED = seed.balanceOf(msg.sender);
        require(userSEED > 0, "No SEED balance");

        uint256 userLockEnd = seed.lockEnd(msg.sender);
        require(userLockEnd > epoch.startTime, "Lock expired before epoch");

        uint256 reward = (userSEED * epoch.revenuePerSEED) / 10**18;
        require(reward >= MIN_CLAIM_AMOUNT, "Reward below minimum");

        epochClaimed[epochId][msg.sender] = true;

        UserClaim storage userClaim = userClaims[msg.sender];
        userClaim.lastClaimedEpoch = epochId;
        userClaim.totalClaimed += reward;
        totalClaimed += reward;

        axusd.safeTransfer(msg.sender, reward);

        emit YieldClaimed(msg.sender, epochId, reward);
    }

    function claimMultipleEpochs(uint256[] calldata epochIds) external nonReentrant whenNotPaused {
        uint256 totalReward = 0;
        uint256 userSEED = seed.balanceOf(msg.sender);
        require(userSEED > 0, "No SEED balance");

        for (uint256 i = 0; i < epochIds.length; i++) {
            uint256 epochId = epochIds[i];
            if (epochId == 0 || epochId >= currentEpoch) continue;
            if (epochClaimed[epochId][msg.sender]) continue;

            Epoch storage epoch = epochs[epochId];
            if (!epoch.finalized) continue;

            uint256 userLockEnd = seed.lockEnd(msg.sender);
            if (userLockEnd <= epoch.startTime) continue;

            uint256 reward = (userSEED * epoch.revenuePerSEED) / 10**18;
            if (reward < MIN_CLAIM_AMOUNT) continue;

            epochClaimed[epochId][msg.sender] = true;
            totalReward += reward;

            emit YieldClaimed(msg.sender, epochId, reward);
        }

        require(totalReward > 0, "No rewards to claim");

        UserClaim storage userClaim = userClaims[msg.sender];
        userClaim.totalClaimed += totalReward;
        totalClaimed += totalReward;

        axusd.safeTransfer(msg.sender, totalReward);
    }

    function getPendingRewards(address user) external view returns (uint256 totalPending, uint256[] memory epochIds, uint256[] memory amounts) {
        uint256 userSEED = seed.balanceOf(user);
        if (userSEED == 0) return (0, new uint256[](0), new uint256[](0));

        uint256 count = 0;
        for (uint256 i = 1; i < currentEpoch; i++) {
            if (!epochClaimed[i][user] && epochs[i].finalized) {
                count++;
            }
        }

        epochIds = new uint256[](count);
        amounts = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 1; i < currentEpoch; i++) {
            if (!epochClaimed[i][user] && epochs[i].finalized) {
                Epoch storage epoch = epochs[i];
                uint256 reward = (userSEED * epoch.revenuePerSEED) / 10**18;
                if (reward >= MIN_CLAIM_AMOUNT) {
                    epochIds[index] = i;
                    amounts[index] = reward;
                    totalPending += reward;
                    index++;
                }
            }
        }
    }

    function getEpochInfo(uint256 epochId) external view returns (
        uint256 totalRevenue,
        uint256 totalSEEDSupply,
        uint256 revenuePerSEED,
        bool finalized,
        uint256 startTime,
        uint256 endTime
    ) {
        Epoch storage epoch = epochs[epochId];
        return (
            epoch.totalRevenue,
            epoch.totalSEEDSupply,
            epoch.revenuePerSEED,
            epoch.finalized,
            epoch.startTime,
            epoch.endTime
        );
    }

    function getUserClaimInfo(address user) external view returns (
        uint256 lastClaimedEpoch,
        uint256 totalClaimedAmount,
        uint256 seedBalance
    ) {
        UserClaim storage claim = userClaims[user];
        return (claim.lastClaimedEpoch, claim.totalClaimed, seed.balanceOf(user));
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(uint256 amount) external onlyRole(ADMIN_ROLE) {
        axusd.safeTransfer(treasuryVault, amount);
    }
}
