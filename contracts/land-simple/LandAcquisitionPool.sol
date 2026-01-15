// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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
        PoolStatus status;
        address steward;
    }

    struct Member {
        uint256 totalContributed;
        uint256 cyclesCompleted;
        uint256 joinDate;
        bool active;
    }

    IERC20 public paymentToken;
    ILandOptionRegistry public landOptionRegistry;
    address public treasury;

    uint256 public nextPoolId = 1;
    uint256 public platformFeeBps = 100;

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => Member)) public members;
    mapping(uint256 => address[]) public poolMembers;
    mapping(address => uint256[]) public memberPools;

    event PoolCreated(uint256 indexed poolId, uint256 indexed landOptionId, string name, uint256 targetAmount);
    event MemberJoined(uint256 indexed poolId, address indexed member, uint256 contribution);
    event ContributionMade(uint256 indexed poolId, address indexed member, uint256 amount, uint256 cycle);
    event PoolActivated(uint256 indexed poolId);
    event PoolFunded(uint256 indexed poolId, uint256 totalAmount);

    constructor(
        address _paymentToken,
        address _landOptionRegistry,
        address _treasury
    ) {
        require(_paymentToken != address(0), "Invalid payment token");
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
        uint256 cycleCount
    ) external onlyRole(STEWARD_ROLE) returns (uint256) {
        require(targetAmount > 0, "Invalid target");
        require(monthlyContribution > 0, "Invalid contribution");
        require(memberLimit >= 5 && memberLimit <= 50, "Member limit 5-50");
        require(cycleCount >= 6 && cycleCount <= 24, "Cycle count 6-24");

        uint256 poolId = nextPoolId++;

        Pool storage pool = pools[poolId];
        pool.poolId = poolId;
        pool.landOptionId = landOptionId;
        pool.name = name;
        pool.targetAmount = targetAmount;
        pool.monthlyContribution = monthlyContribution;
        pool.memberLimit = memberLimit;
        pool.cycleCount = cycleCount;
        pool.status = PoolStatus.Forming;
        pool.steward = msg.sender;

        emit PoolCreated(poolId, landOptionId, name, targetAmount);
        return poolId;
    }

    function joinPool(uint256 poolId) external nonReentrant whenNotPaused {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Forming, "Pool not accepting members");
        require(pool.memberCount < pool.memberLimit, "Pool is full");
        require(!members[poolId][msg.sender].active, "Already a member");

        require(
            paymentToken.transferFrom(msg.sender, address(this), pool.monthlyContribution),
            "Initial contribution failed"
        );

        members[poolId][msg.sender] = Member({
            totalContributed: pool.monthlyContribution,
            cyclesCompleted: 1,
            joinDate: block.timestamp,
            active: true
        });

        pool.memberCount++;
        pool.totalContributed += pool.monthlyContribution;
        poolMembers[poolId].push(msg.sender);
        memberPools[msg.sender].push(poolId);

        emit MemberJoined(poolId, msg.sender, pool.monthlyContribution);
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

        emit ContributionMade(poolId, msg.sender, pool.monthlyContribution, pool.currentCycle);
    }

    function activatePool(uint256 poolId) external onlyRole(ADMIN_ROLE) {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Forming, "Pool not in forming status");
        require(pool.memberCount >= 5, "Minimum 5 members required");

        pool.status = PoolStatus.Active;
        pool.currentCycle = 1;

        emit PoolActivated(poolId);
    }

    function getPool(uint256 poolId) external view returns (Pool memory) {
        return pools[poolId];
    }

    function getMember(uint256 poolId, address user) external view returns (Member memory) {
        return members[poolId][user];
    }

    function getPoolMembers(uint256 poolId) external view returns (address[] memory) {
        return poolMembers[poolId];
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}
