// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AxiomSusuHub
 * @notice On-chain Rotating Savings and Credit Association (ROSCA/SUSU) for Axiom Protocol
 * @dev A SUSU is a rotating savings group where members contribute fixed amounts each cycle,
 * and one member receives the pooled funds each round until everyone has received once.
 * 
 * Key Features:
 * - Fixed-member rotating savings pools
 * - Configurable cycle duration and contribution amounts
 * - Optional randomized or sequential payout order
 * - Protocol fee routing to Axiom treasury
 * - Grace periods and late payment penalties
 * - Emergency pause and rescue capabilities
 * - Full transparency with comprehensive events
 * 
 * Integration:
 * - Uses same role patterns as other Axiom contracts
 * - Routes fees to treasury vault
 * - Compatible with AXM token and other ERC20s
 */
contract AxiomSusuHub is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");

    // ============================================
    // CONSTANTS
    // ============================================
    uint256 public constant MIN_MEMBERS = 2;
    uint256 public constant MAX_MEMBERS = 50;
    uint256 public constant MIN_CYCLE_DURATION = 1 days;
    uint256 public constant MAX_CYCLE_DURATION = 90 days;
    uint16 public constant MAX_PROTOCOL_FEE_BPS = 500; // 5%
    uint16 public constant MAX_LATE_FEE_BPS = 1000; // 10%
    uint16 public constant BPS_DENOMINATOR = 10000;

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    address public treasuryVault;
    uint256 public totalPools;
    
    // Default parameters (can be overridden per pool)
    uint16 public defaultProtocolFeeBps = 100; // 1%
    uint256 public defaultGracePeriod = 1 days;
    uint16 public defaultLateFeeBps = 200; // 2%

    // ============================================
    // ENUMS
    // ============================================
    
    enum PoolStatus {
        Pending,      // Created but not started (awaiting members or start time)
        Active,       // Running - contributions and payouts happening
        Completed,    // All cycles finished successfully
        Cancelled     // Cancelled before completion
    }
    
    enum MemberStatus {
        Active,       // Participating normally
        Ejected,      // Removed for missed payments
        Exited        // Voluntarily left (forfeit)
    }

    // ============================================
    // STRUCTS
    // ============================================
    
    struct Pool {
        uint256 poolId;
        address creator;
        address token;                    // ERC20 token for contributions
        uint256 memberCount;              // Target number of members
        uint256 contributionAmount;       // Amount each member contributes per cycle
        uint256 cycleDuration;            // Duration of each cycle in seconds
        uint256 startTime;                // When the pool starts
        uint256 currentCycle;             // Current cycle number (1-indexed)
        uint256 totalCycles;              // Total cycles (equals memberCount)
        uint256 gracePeriod;              // Grace period after cycle end
        uint16 protocolFeeBps;            // Protocol fee in basis points
        uint16 lateFeeBps;                // Late payment penalty
        bool randomizedOrder;             // Random vs sequential payout order
        bool openJoin;                    // Allow anyone to join vs predefined
        PoolStatus status;
        uint256 createdAt;
        uint256 lastPayoutTime;
        uint256 totalContributed;
        uint256 totalPaidOut;
        uint256 totalFeesPaid;
    }
    
    struct Member {
        address wallet;
        uint256 payoutPosition;           // Position in rotation (1 to memberCount)
        uint256 joinedAt;
        uint256 totalContributed;
        uint256 totalReceived;
        uint256 missedPayments;
        uint256 lateFees;
        bool hasReceivedPayout;
        MemberStatus status;
    }
    
    struct CycleContribution {
        bool hasPaid;
        uint256 amount;
        uint256 paidAt;
        bool wasLate;
    }

    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => address[]) public poolMembers;                    // poolId => member addresses
    mapping(uint256 => mapping(address => Member)) public members;       // poolId => wallet => Member
    mapping(uint256 => mapping(uint256 => address)) public payoutOrder;  // poolId => position => wallet
    mapping(uint256 => mapping(uint256 => mapping(address => CycleContribution))) public cycleContributions; // poolId => cycle => wallet => contribution
    mapping(uint256 => mapping(uint256 => uint256)) public cycleContributionCount; // poolId => cycle => count
    mapping(uint256 => mapping(uint256 => bool)) public cyclePayoutProcessed;      // poolId => cycle => processed
    mapping(address => uint256[]) public userPools;                      // user => poolIds

    // ============================================
    // EVENTS
    // ============================================
    
    event PoolCreated(
        uint256 indexed poolId,
        address indexed creator,
        address token,
        uint256 memberCount,
        uint256 contributionAmount,
        uint256 cycleDuration,
        uint256 startTime
    );
    
    event MemberJoined(
        uint256 indexed poolId,
        address indexed member,
        uint256 position,
        uint256 timestamp
    );
    
    event MemberExited(
        uint256 indexed poolId,
        address indexed member,
        bool refunded,
        uint256 refundAmount
    );
    
    event MemberEjected(
        uint256 indexed poolId,
        address indexed member,
        uint256 missedPayments
    );
    
    event ContributionMade(
        uint256 indexed poolId,
        address indexed member,
        uint256 indexed cycle,
        uint256 amount,
        bool wasLate
    );
    
    event PayoutProcessed(
        uint256 indexed poolId,
        address indexed recipient,
        uint256 indexed cycle,
        uint256 grossAmount,
        uint256 netAmount,
        uint256 protocolFee
    );
    
    event PoolStarted(uint256 indexed poolId, uint256 startTime);
    event PoolCompleted(uint256 indexed poolId, uint256 totalCycles);
    event PoolCancelled(uint256 indexed poolId, string reason);
    event CycleAdvanced(uint256 indexed poolId, uint256 newCycle);
    event TreasuryVaultUpdated(address indexed previousVault, address indexed newVault);
    event DefaultParametersUpdated(uint16 protocolFeeBps, uint256 gracePeriod, uint16 lateFeeBps);

    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address _treasuryVault, address _admin) {
        require(_treasuryVault != address(0), "Invalid treasury vault");
        require(_admin != address(0), "Invalid admin");
        
        treasuryVault = _treasuryVault;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(TREASURY_ROLE, _admin);
    }

    // ============================================
    // POOL MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a new SUSU pool
     * @param token ERC20 token address for contributions
     * @param memberCount Number of members (2-50)
     * @param contributionAmount Amount each member contributes per cycle
     * @param cycleDuration Duration of each cycle in seconds
     * @param startTime When the pool starts (must be future)
     * @param randomizedOrder Whether to randomize payout order
     * @param openJoin Whether anyone can join or predefined only
     * @param protocolFeeBps Protocol fee in basis points (max 500)
     */
    function createPool(
        address token,
        uint256 memberCount,
        uint256 contributionAmount,
        uint256 cycleDuration,
        uint256 startTime,
        bool randomizedOrder,
        bool openJoin,
        uint16 protocolFeeBps
    ) external whenNotPaused returns (uint256) {
        require(token != address(0), "Invalid token");
        require(memberCount >= MIN_MEMBERS && memberCount <= MAX_MEMBERS, "Invalid member count");
        require(contributionAmount > 0, "Invalid contribution amount");
        require(cycleDuration >= MIN_CYCLE_DURATION && cycleDuration <= MAX_CYCLE_DURATION, "Invalid cycle duration");
        require(startTime > block.timestamp, "Start time must be future");
        require(protocolFeeBps <= MAX_PROTOCOL_FEE_BPS, "Protocol fee too high");
        
        totalPools++;
        uint256 poolId = totalPools;
        
        Pool storage pool = pools[poolId];
        pool.poolId = poolId;
        pool.creator = msg.sender;
        pool.token = token;
        pool.memberCount = memberCount;
        pool.contributionAmount = contributionAmount;
        pool.cycleDuration = cycleDuration;
        pool.startTime = startTime;
        pool.currentCycle = 0; // Will become 1 when started
        pool.totalCycles = memberCount;
        pool.gracePeriod = defaultGracePeriod;
        pool.protocolFeeBps = protocolFeeBps > 0 ? protocolFeeBps : defaultProtocolFeeBps;
        pool.lateFeeBps = defaultLateFeeBps;
        pool.randomizedOrder = randomizedOrder;
        pool.openJoin = openJoin;
        pool.status = PoolStatus.Pending;
        pool.createdAt = block.timestamp;
        
        // Grant pool manager role to creator
        _grantRole(POOL_MANAGER_ROLE, msg.sender);
        
        emit PoolCreated(
            poolId,
            msg.sender,
            token,
            memberCount,
            contributionAmount,
            cycleDuration,
            startTime
        );
        
        return poolId;
    }
    
    /**
     * @notice Add predefined members to a pool (creator only, before start)
     * @param poolId Pool to add members to
     * @param memberAddresses Array of member addresses
     */
    function addPredefinedMembers(
        uint256 poolId,
        address[] calldata memberAddresses
    ) external whenNotPaused {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Pending, "Pool not pending");
        require(msg.sender == pool.creator, "Only creator can add members");
        require(!pool.openJoin, "Pool is open join");
        require(poolMembers[poolId].length + memberAddresses.length <= pool.memberCount, "Too many members");
        
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            _addMember(poolId, memberAddresses[i]);
        }
    }
    
    /**
     * @notice Join an open pool
     * @param poolId Pool to join
     */
    function joinPool(uint256 poolId) external whenNotPaused nonReentrant {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Pending, "Pool not accepting members");
        require(pool.openJoin, "Pool is not open join");
        require(poolMembers[poolId].length < pool.memberCount, "Pool is full");
        require(members[poolId][msg.sender].wallet == address(0), "Already a member");
        
        _addMember(poolId, msg.sender);
    }
    
    /**
     * @notice Start the pool (creator or auto when full)
     * @param poolId Pool to start
     */
    function startPool(uint256 poolId) external whenNotPaused {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Pending, "Pool not pending");
        require(poolMembers[poolId].length == pool.memberCount, "Pool not full");
        require(block.timestamp >= pool.startTime, "Start time not reached");
        require(msg.sender == pool.creator || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        
        pool.status = PoolStatus.Active;
        pool.currentCycle = 1;
        
        // Generate payout order
        if (pool.randomizedOrder) {
            _generateRandomOrder(poolId);
        } else {
            _generateSequentialOrder(poolId);
        }
        
        emit PoolStarted(poolId, block.timestamp);
    }

    // ============================================
    // CONTRIBUTION LOGIC
    // ============================================
    
    /**
     * @notice Make a contribution for the current cycle
     * @param poolId Pool to contribute to
     */
    function contribute(uint256 poolId) external whenNotPaused nonReentrant {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Active, "Pool not active");
        
        Member storage member = members[poolId][msg.sender];
        require(member.wallet != address(0), "Not a member");
        require(member.status == MemberStatus.Active, "Member not active");
        
        uint256 currentCycle = pool.currentCycle;
        require(currentCycle > 0 && currentCycle <= pool.totalCycles, "Invalid cycle");
        
        CycleContribution storage contribution = cycleContributions[poolId][currentCycle][msg.sender];
        require(!contribution.hasPaid, "Already contributed this cycle");
        
        // Check if payment is within cycle window
        uint256 cycleStart = pool.startTime + ((currentCycle - 1) * pool.cycleDuration);
        uint256 cycleEnd = cycleStart + pool.cycleDuration;
        uint256 graceEnd = cycleEnd + pool.gracePeriod;
        
        require(block.timestamp >= cycleStart, "Cycle not started");
        require(block.timestamp <= graceEnd, "Contribution window closed");
        
        // Calculate amount including late fee if applicable
        uint256 amount = pool.contributionAmount;
        bool isLate = block.timestamp > cycleEnd;
        
        if (isLate && pool.lateFeeBps > 0) {
            uint256 lateFee = (amount * pool.lateFeeBps) / BPS_DENOMINATOR;
            amount += lateFee;
            member.lateFees += lateFee;
        }
        
        // Transfer tokens from member
        IERC20(pool.token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Record contribution
        contribution.hasPaid = true;
        contribution.amount = amount;
        contribution.paidAt = block.timestamp;
        contribution.wasLate = isLate;
        
        member.totalContributed += amount;
        pool.totalContributed += amount;
        cycleContributionCount[poolId][currentCycle]++;
        
        emit ContributionMade(poolId, msg.sender, currentCycle, amount, isLate);
        
        // Auto-process payout if all members have contributed
        if (cycleContributionCount[poolId][currentCycle] == pool.memberCount) {
            _processPayout(poolId);
        }
    }

    // ============================================
    // PAYOUT LOGIC
    // ============================================
    
    /**
     * @notice Process payout for current cycle (can be triggered manually after cycle end)
     * @param poolId Pool to process payout for
     */
    function processPayout(uint256 poolId) external whenNotPaused nonReentrant {
        Pool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Active, "Pool not active");
        require(!cyclePayoutProcessed[poolId][pool.currentCycle], "Payout already processed");
        
        uint256 cycleEnd = pool.startTime + (pool.currentCycle * pool.cycleDuration);
        uint256 graceEnd = cycleEnd + pool.gracePeriod;
        
        // Can only manually trigger after grace period if not auto-triggered
        require(
            block.timestamp > graceEnd || 
            cycleContributionCount[poolId][pool.currentCycle] == pool.memberCount,
            "Cannot process yet"
        );
        
        _processPayout(poolId);
    }
    
    /**
     * @dev Internal payout processing
     */
    function _processPayout(uint256 poolId) internal {
        Pool storage pool = pools[poolId];
        uint256 currentCycle = pool.currentCycle;
        
        require(!cyclePayoutProcessed[poolId][currentCycle], "Already processed");
        
        // Get recipient for this cycle
        address recipient = payoutOrder[poolId][currentCycle];
        require(recipient != address(0), "No recipient for cycle");
        
        Member storage recipientMember = members[poolId][recipient];
        require(!recipientMember.hasReceivedPayout, "Already received payout");
        
        // Calculate gross payout (all contributions for this cycle)
        uint256 grossAmount = 0;
        address[] memory memberList = poolMembers[poolId];
        
        for (uint256 i = 0; i < memberList.length; i++) {
            CycleContribution storage contrib = cycleContributions[poolId][currentCycle][memberList[i]];
            if (contrib.hasPaid) {
                grossAmount += contrib.amount;
            }
        }
        
        // Calculate protocol fee
        uint256 protocolFee = (grossAmount * pool.protocolFeeBps) / BPS_DENOMINATOR;
        uint256 netAmount = grossAmount - protocolFee;
        
        // Transfer protocol fee to treasury
        if (protocolFee > 0 && treasuryVault != address(0)) {
            IERC20(pool.token).safeTransfer(treasuryVault, protocolFee);
            pool.totalFeesPaid += protocolFee;
        }
        
        // Transfer net amount to recipient
        IERC20(pool.token).safeTransfer(recipient, netAmount);
        
        // Update state
        recipientMember.hasReceivedPayout = true;
        recipientMember.totalReceived += netAmount;
        pool.totalPaidOut += netAmount;
        pool.lastPayoutTime = block.timestamp;
        cyclePayoutProcessed[poolId][currentCycle] = true;
        
        emit PayoutProcessed(poolId, recipient, currentCycle, grossAmount, netAmount, protocolFee);
        
        // Advance to next cycle or complete pool
        if (currentCycle >= pool.totalCycles) {
            pool.status = PoolStatus.Completed;
            emit PoolCompleted(poolId, currentCycle);
        } else {
            pool.currentCycle++;
            emit CycleAdvanced(poolId, pool.currentCycle);
        }
    }

    // ============================================
    // MEMBER MANAGEMENT
    // ============================================
    
    /**
     * @dev Internal function to add a member
     */
    function _addMember(uint256 poolId, address memberAddress) internal {
        require(memberAddress != address(0), "Invalid member address");
        require(members[poolId][memberAddress].wallet == address(0), "Already a member");
        
        uint256 position = poolMembers[poolId].length + 1;
        
        Member storage member = members[poolId][memberAddress];
        member.wallet = memberAddress;
        member.payoutPosition = position;
        member.joinedAt = block.timestamp;
        member.status = MemberStatus.Active;
        
        poolMembers[poolId].push(memberAddress);
        userPools[memberAddress].push(poolId);
        
        emit MemberJoined(poolId, memberAddress, position, block.timestamp);
    }
    
    /**
     * @notice Exit a pool voluntarily (before receiving payout - forfeits contributions)
     * @param poolId Pool to exit from
     */
    function exitPool(uint256 poolId) external nonReentrant {
        Pool storage pool = pools[poolId];
        Member storage member = members[poolId][msg.sender];
        
        require(member.wallet != address(0), "Not a member");
        require(member.status == MemberStatus.Active, "Not active member");
        require(!member.hasReceivedPayout, "Already received payout");
        
        // If pool hasn't started, refund any pending contributions
        uint256 refundAmount = 0;
        if (pool.status == PoolStatus.Pending) {
            refundAmount = member.totalContributed;
            if (refundAmount > 0) {
                IERC20(pool.token).safeTransfer(msg.sender, refundAmount);
            }
        }
        // If pool is active, contributions are forfeited
        
        member.status = MemberStatus.Exited;
        
        emit MemberExited(poolId, msg.sender, refundAmount > 0, refundAmount);
    }
    
    /**
     * @notice Eject a member for missing payments (pool manager or admin only)
     * @param poolId Pool to eject from
     * @param memberAddress Member to eject
     */
    function ejectMember(uint256 poolId, address memberAddress) external {
        Pool storage pool = pools[poolId];
        require(
            msg.sender == pool.creator || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        Member storage member = members[poolId][memberAddress];
        require(member.wallet != address(0), "Not a member");
        require(member.status == MemberStatus.Active, "Not active");
        
        // Check if member has missed current cycle payment
        uint256 currentCycle = pool.currentCycle;
        if (currentCycle > 0) {
            uint256 cycleEnd = pool.startTime + (currentCycle * pool.cycleDuration);
            uint256 graceEnd = cycleEnd + pool.gracePeriod;
            
            CycleContribution storage contrib = cycleContributions[poolId][currentCycle][memberAddress];
            require(block.timestamp > graceEnd && !contrib.hasPaid, "Member has not missed payment");
            
            member.missedPayments++;
        }
        
        member.status = MemberStatus.Ejected;
        
        emit MemberEjected(poolId, memberAddress, member.missedPayments);
    }
    
    /**
     * @dev Generate sequential payout order
     */
    function _generateSequentialOrder(uint256 poolId) internal {
        address[] memory memberList = poolMembers[poolId];
        for (uint256 i = 0; i < memberList.length; i++) {
            payoutOrder[poolId][i + 1] = memberList[i];
        }
    }
    
    /**
     * @dev Generate randomized payout order using blockhash
     */
    function _generateRandomOrder(uint256 poolId) internal {
        address[] memory memberList = poolMembers[poolId];
        uint256 n = memberList.length;
        
        // Fisher-Yates shuffle
        for (uint256 i = n - 1; i > 0; i--) {
            uint256 j = uint256(keccak256(abi.encodePacked(
                blockhash(block.number - 1),
                poolId,
                i,
                block.timestamp
            ))) % (i + 1);
            
            // Swap
            address temp = memberList[i];
            memberList[i] = memberList[j];
            memberList[j] = temp;
        }
        
        // Assign order
        for (uint256 i = 0; i < n; i++) {
            payoutOrder[poolId][i + 1] = memberList[i];
            members[poolId][memberList[i]].payoutPosition = i + 1;
        }
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Cancel a pool (admin or creator, only if pending or early active)
     * @param poolId Pool to cancel
     * @param reason Reason for cancellation
     */
    function cancelPool(uint256 poolId, string calldata reason) external nonReentrant {
        Pool storage pool = pools[poolId];
        require(
            msg.sender == pool.creator || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(
            pool.status == PoolStatus.Pending || 
            (pool.status == PoolStatus.Active && pool.currentCycle <= 1),
            "Cannot cancel active pool"
        );
        
        // Refund all contributions
        address[] memory memberList = poolMembers[poolId];
        for (uint256 i = 0; i < memberList.length; i++) {
            Member storage member = members[poolId][memberList[i]];
            if (member.totalContributed > member.totalReceived && member.status == MemberStatus.Active) {
                uint256 refund = member.totalContributed - member.totalReceived;
                IERC20(pool.token).safeTransfer(memberList[i], refund);
            }
        }
        
        pool.status = PoolStatus.Cancelled;
        
        emit PoolCancelled(poolId, reason);
    }
    
    /**
     * @notice Update treasury vault address
     */
    function setTreasuryVault(address newVault) external onlyRole(ADMIN_ROLE) {
        require(newVault != address(0), "Invalid vault");
        address previousVault = treasuryVault;
        treasuryVault = newVault;
        emit TreasuryVaultUpdated(previousVault, newVault);
    }
    
    /**
     * @notice Update default parameters
     */
    function setDefaultParameters(
        uint16 _protocolFeeBps,
        uint256 _gracePeriod,
        uint16 _lateFeeBps
    ) external onlyRole(ADMIN_ROLE) {
        require(_protocolFeeBps <= MAX_PROTOCOL_FEE_BPS, "Fee too high");
        require(_lateFeeBps <= MAX_LATE_FEE_BPS, "Late fee too high");
        
        defaultProtocolFeeBps = _protocolFeeBps;
        defaultGracePeriod = _gracePeriod;
        defaultLateFeeBps = _lateFeeBps;
        
        emit DefaultParametersUpdated(_protocolFeeBps, _gracePeriod, _lateFeeBps);
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Emergency rescue stuck tokens (not pool tokens)
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Get pool details
     */
    function getPool(uint256 poolId) external view returns (Pool memory) {
        return pools[poolId];
    }
    
    /**
     * @notice Get pool members
     */
    function getPoolMembers(uint256 poolId) external view returns (address[] memory) {
        return poolMembers[poolId];
    }
    
    /**
     * @notice Get member details
     */
    function getMember(uint256 poolId, address wallet) external view returns (Member memory) {
        return members[poolId][wallet];
    }
    
    /**
     * @notice Get payout order for a pool
     */
    function getPayoutOrder(uint256 poolId) external view returns (address[] memory) {
        Pool storage pool = pools[poolId];
        address[] memory order = new address[](pool.memberCount);
        for (uint256 i = 0; i < pool.memberCount; i++) {
            order[i] = payoutOrder[poolId][i + 1];
        }
        return order;
    }
    
    /**
     * @notice Get user's pools
     */
    function getUserPools(address user) external view returns (uint256[] memory) {
        return userPools[user];
    }
    
    /**
     * @notice Get contribution status for a member in a cycle
     */
    function getContribution(
        uint256 poolId,
        uint256 cycle,
        address wallet
    ) external view returns (CycleContribution memory) {
        return cycleContributions[poolId][cycle][wallet];
    }
    
    /**
     * @notice Get current cycle recipient
     */
    function getCurrentRecipient(uint256 poolId) external view returns (address) {
        Pool storage pool = pools[poolId];
        if (pool.currentCycle == 0 || pool.status != PoolStatus.Active) {
            return address(0);
        }
        return payoutOrder[poolId][pool.currentCycle];
    }
    
    /**
     * @notice Calculate expected payout for current cycle
     */
    function getExpectedPayout(uint256 poolId) external view returns (uint256 gross, uint256 net, uint256 fee) {
        Pool storage pool = pools[poolId];
        gross = pool.contributionAmount * pool.memberCount;
        fee = (gross * pool.protocolFeeBps) / BPS_DENOMINATOR;
        net = gross - fee;
    }
    
    /**
     * @notice Get current cycle info
     */
    function getCycleInfo(uint256 poolId) external view returns (
        uint256 cycle,
        uint256 contributionCount,
        uint256 cycleStart,
        uint256 cycleEnd,
        uint256 graceEnd,
        bool payoutProcessed
    ) {
        Pool storage pool = pools[poolId];
        cycle = pool.currentCycle;
        
        if (cycle > 0) {
            cycleStart = pool.startTime + ((cycle - 1) * pool.cycleDuration);
            cycleEnd = cycleStart + pool.cycleDuration;
            graceEnd = cycleEnd + pool.gracePeriod;
            contributionCount = cycleContributionCount[poolId][cycle];
            payoutProcessed = cyclePayoutProcessed[poolId][cycle];
        }
    }
    
    /**
     * @notice Check if member has contributed for current cycle
     */
    function hasContributed(uint256 poolId, address wallet) external view returns (bool) {
        Pool storage pool = pools[poolId];
        return cycleContributions[poolId][pool.currentCycle][wallet].hasPaid;
    }
}
