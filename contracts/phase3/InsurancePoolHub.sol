// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract InsurancePoolHub is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CLAIMS_ADJUSTER_ROLE = keccak256("CLAIMS_ADJUSTER_ROLE");
    bytes32 public constant UNDERWRITER_ROLE = keccak256("UNDERWRITER_ROLE");

    IERC20 public immutable axusd;
    address public treasury;

    struct CoveragePool {
        string name;
        string coverageType;
        string description;
        uint256 totalCoverage;
        uint256 availableCoverage;
        uint256 premiumRateBps;   // annual premium as basis points of coverage
        uint256 minCoverage;
        uint256 maxCoverage;
        uint256 reserves;
        bool active;
    }

    struct Policy {
        bytes32 poolId;
        address holder;
        uint256 coverageAmount;
        uint256 premiumPaid;
        uint256 startTime;
        uint256 endTime;
        bool active;
        bool claimed;
    }

    struct Claim {
        uint256 policyId;
        address claimant;
        uint256 amount;
        string reason;
        uint256 submittedAt;
        ClaimStatus status;
    }

    enum ClaimStatus { Pending, Approved, Rejected, Paid }

    mapping(bytes32 => CoveragePool) public pools;
    bytes32[] public poolIds;
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public userPolicies;
    mapping(uint256 => Claim) public claims;

    uint256 public policyCounter;
    uint256 public claimCounter;
    uint256 public totalPremiumsCollected;
    uint256 public totalClaimsPaid;
    uint256 public constant BPS = 10000;

    event PoolCreated(bytes32 indexed poolId, string name, string coverageType, uint256 premiumRateBps);
    event PolicyPurchased(uint256 indexed policyId, address indexed holder, bytes32 indexed poolId, uint256 coverage, uint256 premium);
    event PolicyRenewed(uint256 indexed policyId, uint256 newEndTime, uint256 premiumPaid);
    event ClaimSubmitted(uint256 indexed claimId, uint256 indexed policyId, address claimant, uint256 amount);
    event ClaimApproved(uint256 indexed claimId, uint256 amount);
    event ClaimRejected(uint256 indexed claimId, string reason);
    event ClaimPaid(uint256 indexed claimId, address recipient, uint256 amount);
    event ReservesDeposited(bytes32 indexed poolId, uint256 amount);

    constructor(address _axusd, address _treasury) {
        require(_axusd != address(0), "Invalid AXUSD address");
        require(_treasury != address(0), "Invalid treasury address");

        axusd = IERC20(_axusd);
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(CLAIMS_ADJUSTER_ROLE, msg.sender);
        _grantRole(UNDERWRITER_ROLE, msg.sender);
    }

    function createPool(
        bytes32 poolId,
        string calldata name,
        string calldata coverageType,
        string calldata description,
        uint256 totalCoverage,
        uint256 premiumRateBps,
        uint256 minCoverage,
        uint256 maxCoverage
    ) external onlyRole(ADMIN_ROLE) {
        require(pools[poolId].totalCoverage == 0, "Pool already exists");
        require(totalCoverage > 0, "Invalid coverage");
        require(minCoverage <= maxCoverage, "Invalid min/max");

        pools[poolId] = CoveragePool({
            name: name,
            coverageType: coverageType,
            description: description,
            totalCoverage: totalCoverage,
            availableCoverage: totalCoverage,
            premiumRateBps: premiumRateBps,
            minCoverage: minCoverage,
            maxCoverage: maxCoverage,
            reserves: 0,
            active: true
        });

        poolIds.push(poolId);
        emit PoolCreated(poolId, name, coverageType, premiumRateBps);
    }

    function purchaseCoverage(bytes32 poolId, uint256 coverageAmount, uint256 durationMonths)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 policyId)
    {
        CoveragePool storage pool = pools[poolId];
        require(pool.active, "Pool not active");
        require(coverageAmount >= pool.minCoverage, "Below minimum coverage");
        require(coverageAmount <= pool.maxCoverage, "Above maximum coverage");
        require(coverageAmount <= pool.availableCoverage, "Insufficient coverage available");
        require(durationMonths >= 1 && durationMonths <= 12, "Duration 1-12 months");

        uint256 annualPremium = (coverageAmount * pool.premiumRateBps) / BPS;
        uint256 premium = (annualPremium * durationMonths) / 12;

        axusd.safeTransferFrom(msg.sender, address(this), premium);

        policyId = ++policyCounter;
        policies[policyId] = Policy({
            poolId: poolId,
            holder: msg.sender,
            coverageAmount: coverageAmount,
            premiumPaid: premium,
            startTime: block.timestamp,
            endTime: block.timestamp + (durationMonths * 30 days),
            active: true,
            claimed: false
        });

        userPolicies[msg.sender].push(policyId);
        pool.availableCoverage -= coverageAmount;
        pool.reserves += premium;
        totalPremiumsCollected += premium;

        emit PolicyPurchased(policyId, msg.sender, poolId, coverageAmount, premium);
    }

    function renewPolicy(uint256 policyId, uint256 durationMonths)
        external
        nonReentrant
        whenNotPaused
    {
        Policy storage policy = policies[policyId];
        require(policy.holder == msg.sender, "Not policy holder");
        require(policy.active, "Policy not active");
        require(!policy.claimed, "Policy already claimed");
        require(durationMonths >= 1 && durationMonths <= 12, "Duration 1-12 months");

        CoveragePool storage pool = pools[policy.poolId];
        uint256 annualPremium = (policy.coverageAmount * pool.premiumRateBps) / BPS;
        uint256 premium = (annualPremium * durationMonths) / 12;

        axusd.safeTransferFrom(msg.sender, address(this), premium);

        if (block.timestamp > policy.endTime) {
            policy.startTime = block.timestamp;
            policy.endTime = block.timestamp + (durationMonths * 30 days);
        } else {
            policy.endTime += (durationMonths * 30 days);
        }

        policy.premiumPaid += premium;
        pool.reserves += premium;
        totalPremiumsCollected += premium;

        emit PolicyRenewed(policyId, policy.endTime, premium);
    }

    function submitClaim(uint256 policyId, uint256 amount, string calldata reason)
        external
        nonReentrant
        returns (uint256 claimId)
    {
        Policy storage policy = policies[policyId];
        require(policy.holder == msg.sender, "Not policy holder");
        require(policy.active, "Policy not active");
        require(!policy.claimed, "Already claimed");
        require(block.timestamp <= policy.endTime, "Policy expired");
        require(amount <= policy.coverageAmount, "Exceeds coverage");

        claimId = ++claimCounter;
        claims[claimId] = Claim({
            policyId: policyId,
            claimant: msg.sender,
            amount: amount,
            reason: reason,
            submittedAt: block.timestamp,
            status: ClaimStatus.Pending
        });

        emit ClaimSubmitted(claimId, policyId, msg.sender, amount);
    }

    function approveClaim(uint256 claimId, uint256 approvedAmount)
        external
        onlyRole(CLAIMS_ADJUSTER_ROLE)
    {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Pending, "Claim not pending");
        require(approvedAmount <= claim.amount, "Exceeds claim amount");

        claim.amount = approvedAmount;
        claim.status = ClaimStatus.Approved;

        emit ClaimApproved(claimId, approvedAmount);
    }

    function rejectClaim(uint256 claimId, string calldata reason)
        external
        onlyRole(CLAIMS_ADJUSTER_ROLE)
    {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Pending, "Claim not pending");

        claim.status = ClaimStatus.Rejected;
        emit ClaimRejected(claimId, reason);
    }

    function payClaim(uint256 claimId)
        external
        nonReentrant
        onlyRole(CLAIMS_ADJUSTER_ROLE)
    {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Approved, "Claim not approved");

        Policy storage policy = policies[claim.policyId];
        CoveragePool storage pool = pools[policy.poolId];

        require(pool.reserves >= claim.amount, "Insufficient reserves");

        pool.reserves -= claim.amount;
        pool.availableCoverage += policy.coverageAmount;
        policy.claimed = true;
        policy.active = false;
        claim.status = ClaimStatus.Paid;
        totalClaimsPaid += claim.amount;

        axusd.safeTransfer(claim.claimant, claim.amount);

        emit ClaimPaid(claimId, claim.claimant, claim.amount);
    }

    function depositReserves(bytes32 poolId, uint256 amount)
        external
        onlyRole(UNDERWRITER_ROLE)
    {
        require(pools[poolId].totalCoverage > 0, "Pool does not exist");

        axusd.safeTransferFrom(msg.sender, address(this), amount);
        pools[poolId].reserves += amount;

        emit ReservesDeposited(poolId, amount);
    }

    function getPool(bytes32 poolId)
        external
        view
        returns (
            string memory name,
            string memory coverageType,
            uint256 totalCoverage,
            uint256 availableCoverage,
            uint256 premiumRateBps,
            uint256 reserves,
            bool active
        )
    {
        CoveragePool storage pool = pools[poolId];
        return (
            pool.name,
            pool.coverageType,
            pool.totalCoverage,
            pool.availableCoverage,
            pool.premiumRateBps,
            pool.reserves,
            pool.active
        );
    }

    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return userPolicies[user];
    }

    function getPoolCount() external view returns (uint256) {
        return poolIds.length;
    }

    function getStats()
        external
        view
        returns (
            uint256 _totalPremiums,
            uint256 _totalClaims,
            uint256 _poolCount,
            uint256 _policyCount,
            uint256 _claimCount
        )
    {
        return (totalPremiumsCollected, totalClaimsPaid, poolIds.length, policyCounter, claimCounter);
    }

    function setPoolActive(bytes32 poolId, bool active) external onlyRole(ADMIN_ROLE) {
        pools[poolId].active = active;
    }

    function updatePoolCoverage(bytes32 poolId, uint256 newTotalCoverage) external onlyRole(ADMIN_ROLE) {
        CoveragePool storage pool = pools[poolId];
        require(pool.totalCoverage > 0, "Pool does not exist");

        uint256 usedCoverage = pool.totalCoverage - pool.availableCoverage;
        require(newTotalCoverage >= usedCoverage, "Cannot reduce below used coverage");

        pool.availableCoverage = newTotalCoverage - usedCoverage;
        pool.totalCoverage = newTotalCoverage;
    }

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
    }

    function withdrawToTreasury(uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(axusd.balanceOf(address(this)) >= amount, "Insufficient balance");
        axusd.safeTransfer(treasury, amount);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
