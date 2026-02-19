// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface ILandOptionRegistry {
    function payOptionFee(uint256 optionId) external;
}

contract LandAcquisitionPool is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant STEWARD_ROLE = keccak256("STEWARD_ROLE");

    enum PoolStatus { Forming, Active, Funded, Distributed, Cancelled }

    struct Pool {
        uint256 poolId;
        uint256 landOptionId;
        string name;
        uint256 targetAmount;
        uint256 monthlyContribution;
        uint256 memberLimit;
        uint256 memberCount;
        uint256 totalContributed;
        uint256 cycleCount;
        uint256 currentCycle;
        uint256 cycleStartDate;
        uint256 cycleDurationDays;
        PoolStatus status;
        address steward;
        address beneficiary;
    }

    struct Member {
        uint256 totalContributed;
        uint256 cyclesCompleted;
        uint256 joinDate;
        bool active;
        uint256 missedPayments;
    }

    struct Contribution {
        uint256 amount;
        uint256 timestamp;
        uint256 cycle;
    }

    IERC20 public paymentToken;
    ILandOptionRegistry public landOptionRegistry;
    address public treasury;

    uint256 public nextPoolId = 1;
    uint256 public platformFeeBps = 100;

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => Member)) public members;
    mapping(uint256 => address[]) public poolMembers;
    mapping(uint256 => mapping(address => Contribution[])) public contributions;
    mapping(address => uint256[]) public memberPools;

    event PoolCreated(uint256 indexed poolId, uint256 indexed landOptionId, string name, uint256 targetAmount);
    event MemberJoined(uint256 indexed poolId, address indexed member, uint256 contribution);
    event ContributionMade(uint256 indexed poolId, address indexed member, uint256 amount, uint256 cycle);
    event PoolActivated(uint256 indexed poolId, uint256 cycleStartDate);
    event CycleCompleted(uint256 indexed poolId, uint256 cycle, uint256 totalCollected);
    event PoolFunded(uint256 indexed poolId, uint256 totalAmount);
    event FundsDistributed(uint256 indexed poolId, address indexed recipient, uint256 amount);
    event MemberRemoved(uint256 indexed poolId, address indexed member, string reason);
    event PoolCancelled(uint256 indexed poolId, string reason);

    constructor(
        address _paymentToken,
        address _landOptionRegistry,
        address _treasury
    ) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_landOptionRegistry != address(0), "Invalid land option registry");
        require(_treasury != address(0), "Invalid treasury");
        
        paymentToken = IERC20(_paymentToken);
        landOptionRegistry = ILandOptionRegistry(_landOptionRegistry);
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function createPool(
        uint256 landOptionId,
        string calldata name,
        uint256 targetAmount,
        uint256 monthlyContribution,
        uint256 memberLimit,
        uint256 cycleCount,
        uint256 cycleDurationDays
    ) external onlyRole(STEWARD_ROLE) returns (uint256) {
        require(targetAmount > 0, "Invalid target");
        require(monthlyContribution > 0, "Invalid contribution");
        require(memberLimit >= 5 && memberLimit <= 50, "Member limit 5-50");
        require(cycleCount >= 6 && cycleCount <= 24, "Cycle count 6-24");
        require(cycleDurationDays >= 28 && cycleDurationDays <= 31, "Cycle 28-31 days");

        uint256 poolId = nextPoolId++;

        Pool storage newPool = pools[poolId];
        newPool.poolId = poolId;
        newPool.landOptionId = landOptionId;
        newPool.name = name;
        newPool.targetAmount = targetAmount;
        newPool.monthlyContribution = monthlyContribution;
        newPool.memberLimit = memberLimit;
        newPool.memberCount = 0;
        newPool.totalContributed = 0;
        newPool.cycleCount = cycleCount;
        newPool.currentCycle = 0;
        newPool.cycleStartDate = 0;
        newPool.cycleDurationDays = cycleDurationDays;
        newPool.status = PoolStatus.Forming;
        newPool.steward = msg.sender;
        newPool.beneficiary = address(0);

        emit PoolCreated(poolId, landOptionId, name, targetAmount);
        return poolId;
    }

    function joinPool(uint256 poolId) external nonReentrant whenNotPaused {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Forming, "Pool not forming");
        require(pool.memberCount < pool.memberLimit, "Pool full");
        require(!members[poolId][msg.sender].active, "Already member");

        require(
            paymentToken.transferFrom(msg.sender, address(this), pool.monthlyContribution),
            "Initial contribution failed"
        );

        members[poolId][msg.sender] = Member({
            totalContributed: pool.monthlyContribution,
            cyclesCompleted: 1,
            joinDate: block.timestamp,
            active: true,
            missedPayments: 0
        });

        poolMembers[poolId].push(msg.sender);
        memberPools[msg.sender].push(poolId);
        pool.memberCount++;
        pool.totalContributed += pool.monthlyContribution;

        contributions[poolId][msg.sender].push(Contribution({
            amount: pool.monthlyContribution,
            timestamp: block.timestamp,
            cycle: 0
        }));

        emit MemberJoined(poolId, msg.sender, pool.monthlyContribution);

        if (pool.memberCount >= pool.memberLimit) {
            _activatePool(poolId);
        }
    }

    function _activatePool(uint256 poolId) internal {
        Pool storage pool = pools[poolId];
        pool.status = PoolStatus.Active;
        pool.cycleStartDate = block.timestamp;
        pool.currentCycle = 1;

        emit PoolActivated(poolId, block.timestamp);
    }

    function activatePoolManually(uint256 poolId) external onlyRole(STEWARD_ROLE) {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Forming, "Not forming");
        require(pool.memberCount >= 5, "Need at least 5 members");
        
        _activatePool(poolId);
    }

    function contribute(uint256 poolId) external nonReentrant whenNotPaused {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Active, "Pool not active");
        
        Member storage member = members[poolId][msg.sender];
        require(member.active, "Not a member");

        require(
            paymentToken.transferFrom(msg.sender, address(this), pool.monthlyContribution),
            "Contribution failed"
        );

        member.totalContributed += pool.monthlyContribution;
        member.cyclesCompleted++;
        pool.totalContributed += pool.monthlyContribution;

        contributions[poolId][msg.sender].push(Contribution({
            amount: pool.monthlyContribution,
            timestamp: block.timestamp,
            cycle: pool.currentCycle
        }));

        emit ContributionMade(poolId, msg.sender, pool.monthlyContribution, pool.currentCycle);

        if (pool.totalContributed >= pool.targetAmount) {
            pool.status = PoolStatus.Funded;
            emit PoolFunded(poolId, pool.totalContributed);
        }
    }

    function advanceCycle(uint256 poolId) external onlyRole(STEWARD_ROLE) {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Active, "Pool not active");
        require(
            block.timestamp >= pool.cycleStartDate + (pool.cycleDurationDays * 1 days),
            "Cycle not complete"
        );

        uint256 cycleCollected = 0;
        address[] storage memberList = poolMembers[poolId];
        
        for (uint256 i = 0; i < memberList.length; i++) {
            Member storage member = members[poolId][memberList[i]];
            if (member.active && member.cyclesCompleted < pool.currentCycle) {
                member.missedPayments++;
                if (member.missedPayments >= 3) {
                    member.active = false;
                    pool.memberCount--;
                    emit MemberRemoved(poolId, memberList[i], "Missed 3 payments");
                }
            }
        }

        emit CycleCompleted(poolId, pool.currentCycle, cycleCollected);

        pool.currentCycle++;
        pool.cycleStartDate = block.timestamp;

        if (pool.currentCycle > pool.cycleCount || pool.totalContributed >= pool.targetAmount) {
            pool.status = PoolStatus.Funded;
            emit PoolFunded(poolId, pool.totalContributed);
        }
    }

    function distributeFunds(uint256 poolId, address recipient) external onlyRole(ADMIN_ROLE) nonReentrant {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Funded, "Pool not funded");
        require(recipient != address(0), "Invalid recipient");
        require(pool.totalContributed > 0, "No funds to distribute");

        uint256 platformFee = (pool.totalContributed * platformFeeBps) / 10000;
        uint256 distributionAmount = pool.totalContributed - platformFee;

        require(
            paymentToken.transfer(treasury, platformFee),
            "Platform fee transfer failed"
        );

        require(
            paymentToken.transfer(recipient, distributionAmount),
            "Distribution failed"
        );

        pool.beneficiary = recipient;
        pool.status = PoolStatus.Distributed;

        emit FundsDistributed(poolId, recipient, distributionAmount);
    }

    function withdrawFromCancelledPool(uint256 poolId) external nonReentrant {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Cancelled, "Pool not cancelled");

        Member storage member = members[poolId][msg.sender];
        require(member.totalContributed > 0, "No contributions");
        
        uint256 refundAmount = member.totalContributed;
        require(refundAmount > 0, "No refund available");
        member.totalContributed = 0;
        member.active = false;

        require(
            paymentToken.transfer(msg.sender, refundAmount),
            "Refund failed"
        );
    }

    function cancelPool(uint256 poolId, string calldata reason) external onlyRole(ADMIN_ROLE) {
        Pool storage pool = pools[poolId];
        require(pool.status != PoolStatus.Distributed, "Already distributed");

        pool.status = PoolStatus.Cancelled;
        emit PoolCancelled(poolId, reason);
    }

    function getPool(uint256 poolId) external view returns (Pool memory) {
        return pools[poolId];
    }

    function getMember(uint256 poolId, address memberAddress) external view returns (Member memory) {
        return members[poolId][memberAddress];
    }

    function getPoolMembers(uint256 poolId) external view returns (address[] memory) {
        return poolMembers[poolId];
    }

    function getMemberContributions(uint256 poolId, address memberAddress) external view returns (Contribution[] memory) {
        return contributions[poolId][memberAddress];
    }

    function getMemberPools(address memberAddress) external view returns (uint256[] memory) {
        return memberPools[memberAddress];
    }

    function getPoolProgress(uint256 poolId) external view returns (uint256 raised, uint256 target, uint256 percentage) {
        Pool storage pool = pools[poolId];
        raised = pool.totalContributed;
        target = pool.targetAmount;
        percentage = target > 0 ? (raised * 100) / target : 0;
    }

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
    }

    function setPlatformFee(uint256 newFeeBps) external onlyRole(ADMIN_ROLE) {
        require(newFeeBps <= 500, "Fee too high");
        platformFeeBps = newFeeBps;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
