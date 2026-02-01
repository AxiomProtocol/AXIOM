// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SusuPersonalVault
 * @notice Self-custody SUSU system where each member's funds stay in their personal vault
 * @dev Unlike pooled SUSU, funds never leave the member's vault until their payout turn.
 * 
 * Key Differences from PooledSUSU:
 * - Each member locks their TOTAL commitment upfront in their own vault
 * - Funds are segregated - no pooling until payout time
 * - Member can exit early with penalty (forfeiture to remaining members)
 * - Smart contract enforces rotation schedule via time-locked releases
 * - True self-custody: protocol cannot access funds, only enforce rules
 * 
 * Self-Custody Guarantees:
 * - Funds locked in personal vaults, not shared pools
 * - No admin can withdraw member funds
 * - Member initiates all deposits and can exit (with penalty)
 * - Transparent on-chain rotation and payout logic
 */
contract SusuPersonalVault is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_MEMBERS = 2;
    uint256 public constant MAX_MEMBERS = 20; // Smaller for Solo SUSU (requires upfront capital)
    uint256 public constant MIN_CYCLE_DURATION = 1 days;
    uint256 public constant MAX_CYCLE_DURATION = 90 days;
    uint256 public constant MAX_EARLY_EXIT_PENALTY_BPS = 2000; // 20% max penalty

    enum CircleStatus { Forming, Active, Completed, Cancelled }
    enum MemberStatus { Pending, Committed, Active, Exited, Defaulted }

    struct Circle {
        uint256 circleId;
        address organizer;
        address token;
        uint256 targetMembers;
        uint256 contributionPerCycle;  // What each member commits per cycle
        uint256 totalCycles;           // Number of rotations (equals targetMembers)
        uint256 cycleDuration;
        uint256 startTime;
        uint256 currentCycle;
        uint16 protocolFeeBps;
        uint16 earlyExitPenaltyBps;
        CircleStatus status;
        uint256 createdAt;
        uint256 totalCommitted;        // Total locked across all vaults
        uint256 totalPaidOut;
    }

    struct PersonalVault {
        address owner;
        uint256 lockedAmount;          // Total committed funds in vault
        uint256 availableForPayout;    // Amount that can be released this cycle
        uint256 payoutPosition;        // When this member receives (1 to totalCycles)
        uint256 committedAt;
        uint256 totalReceived;
        bool hasReceivedPayout;
        MemberStatus status;
    }

    struct PayoutRecord {
        address recipient;
        uint256 amount;
        uint256 processedAt;
        bool processed;
    }

    // State
    uint256 public totalCircles;
    address public treasuryVault;
    uint16 public defaultProtocolFeeBps = 100; // 1%
    uint16 public defaultEarlyExitPenaltyBps = 1000; // 10%

    mapping(uint256 => Circle) public circles;
    mapping(uint256 => address[]) public circleMembers;
    mapping(uint256 => mapping(address => PersonalVault)) public vaults;
    mapping(uint256 => mapping(uint256 => address)) public payoutOrder; // circleId => position => wallet
    mapping(uint256 => mapping(uint256 => PayoutRecord)) public payoutRecords; // circleId => cycle => record

    // Events
    event CircleCreated(
        uint256 indexed circleId,
        address indexed organizer,
        address token,
        uint256 targetMembers,
        uint256 contributionPerCycle,
        uint256 cycleDuration
    );
    event VaultCommitted(
        uint256 indexed circleId,
        address indexed member,
        uint256 amount,
        uint256 payoutPosition
    );
    event CircleStarted(uint256 indexed circleId, uint256 startTime);
    event PayoutProcessed(
        uint256 indexed circleId,
        uint256 indexed cycle,
        address indexed recipient,
        uint256 amount
    );
    event EarlyExit(
        uint256 indexed circleId,
        address indexed member,
        uint256 refundAmount,
        uint256 penaltyAmount
    );
    event CircleCompleted(uint256 indexed circleId);
    event CircleCancelled(uint256 indexed circleId, string reason);

    constructor(address _treasuryVault) {
        treasuryVault = _treasuryVault;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============================================
    // CIRCLE CREATION
    // ============================================

    /**
     * @notice Create a new Solo SUSU circle
     * @param token ERC20 token for the circle
     * @param targetMembers Number of members (2-20)
     * @param contributionPerCycle Amount each member commits per cycle
     * @param cycleDuration Duration of each rotation cycle
     * @param startTime When the circle starts (must be future, after all commit)
     */
    function createCircle(
        address token,
        uint256 targetMembers,
        uint256 contributionPerCycle,
        uint256 cycleDuration,
        uint256 startTime
    ) external whenNotPaused returns (uint256) {
        require(token != address(0), "Invalid token");
        require(targetMembers >= MIN_MEMBERS && targetMembers <= MAX_MEMBERS, "Invalid member count");
        require(contributionPerCycle > 0, "Invalid contribution amount");
        require(cycleDuration >= MIN_CYCLE_DURATION && cycleDuration <= MAX_CYCLE_DURATION, "Invalid cycle duration");
        require(startTime > block.timestamp + 1 days, "Start time must be at least 1 day in future");

        totalCircles++;
        uint256 circleId = totalCircles;

        Circle storage circle = circles[circleId];
        circle.circleId = circleId;
        circle.organizer = msg.sender;
        circle.token = token;
        circle.targetMembers = targetMembers;
        circle.contributionPerCycle = contributionPerCycle;
        circle.totalCycles = targetMembers;
        circle.cycleDuration = cycleDuration;
        circle.startTime = startTime;
        circle.currentCycle = 0;
        circle.protocolFeeBps = defaultProtocolFeeBps;
        circle.earlyExitPenaltyBps = defaultEarlyExitPenaltyBps;
        circle.status = CircleStatus.Forming;
        circle.createdAt = block.timestamp;

        emit CircleCreated(
            circleId,
            msg.sender,
            token,
            targetMembers,
            contributionPerCycle,
            cycleDuration
        );

        return circleId;
    }

    // ============================================
    // SELF-CUSTODY COMMITMENT (Join & Lock Funds)
    // ============================================

    /**
     * @notice Commit funds to personal vault and join circle
     * @dev Member locks their TOTAL commitment upfront (contributionPerCycle * totalCycles)
     * This ensures they can fulfill all obligations. Funds stay in THEIR vault.
     * @param circleId The circle to join
     * @param preferredPosition Preferred payout position (0 for any available)
     */
    function commitToVault(
        uint256 circleId,
        uint256 preferredPosition
    ) external whenNotPaused nonReentrant {
        Circle storage circle = circles[circleId];
        require(circle.status == CircleStatus.Forming, "Circle not accepting members");
        require(circleMembers[circleId].length < circle.targetMembers, "Circle is full");
        require(vaults[circleId][msg.sender].owner == address(0), "Already committed");

        // Calculate total commitment (all cycles upfront)
        uint256 totalCommitment = circle.contributionPerCycle * circle.totalCycles;

        // Determine payout position
        uint256 position;
        if (preferredPosition > 0 && preferredPosition <= circle.totalCycles) {
            require(payoutOrder[circleId][preferredPosition] == address(0), "Position taken");
            position = preferredPosition;
        } else {
            position = _getNextAvailablePosition(circleId, circle.totalCycles);
        }
        require(position > 0, "No positions available");

        // Transfer funds to THIS contract (held in member's logical vault)
        IERC20(circle.token).safeTransferFrom(msg.sender, address(this), totalCommitment);

        // Create personal vault
        PersonalVault storage vault = vaults[circleId][msg.sender];
        vault.owner = msg.sender;
        vault.lockedAmount = totalCommitment;
        vault.availableForPayout = 0;
        vault.payoutPosition = position;
        vault.committedAt = block.timestamp;
        vault.status = MemberStatus.Committed;

        // Register member
        circleMembers[circleId].push(msg.sender);
        payoutOrder[circleId][position] = msg.sender;
        circle.totalCommitted += totalCommitment;

        emit VaultCommitted(circleId, msg.sender, totalCommitment, position);

        // Auto-start if circle is full
        if (circleMembers[circleId].length == circle.targetMembers) {
            _startCircle(circleId);
        }
    }

    /**
     * @notice Get next available payout position
     */
    function _getNextAvailablePosition(uint256 circleId, uint256 totalPositions) internal view returns (uint256) {
        for (uint256 i = 1; i <= totalPositions; i++) {
            if (payoutOrder[circleId][i] == address(0)) {
                return i;
            }
        }
        return 0;
    }

    /**
     * @notice Start the circle when all members have committed
     */
    function _startCircle(uint256 circleId) internal {
        Circle storage circle = circles[circleId];
        
        // Activate all member vaults
        for (uint256 i = 0; i < circleMembers[circleId].length; i++) {
            address member = circleMembers[circleId][i];
            vaults[circleId][member].status = MemberStatus.Active;
        }

        circle.status = CircleStatus.Active;
        circle.currentCycle = 1;
        
        // Adjust start time if it's in the past
        if (circle.startTime <= block.timestamp) {
            circle.startTime = block.timestamp;
        }

        emit CircleStarted(circleId, circle.startTime);
    }

    // ============================================
    // ROTATION & PAYOUT PROCESSING
    // ============================================

    /**
     * @notice Process payout for current cycle
     * @dev Anyone can call this to trigger payout when cycle is ready
     * Funds are released from each member's vault to the recipient
     */
    function processPayout(uint256 circleId) external whenNotPaused nonReentrant {
        Circle storage circle = circles[circleId];
        require(circle.status == CircleStatus.Active, "Circle not active");
        require(circle.currentCycle > 0 && circle.currentCycle <= circle.totalCycles, "Invalid cycle");
        require(!payoutRecords[circleId][circle.currentCycle].processed, "Cycle already processed");

        // Check if cycle window has passed
        uint256 cycleStart = circle.startTime + ((circle.currentCycle - 1) * circle.cycleDuration);
        require(block.timestamp >= cycleStart, "Cycle not started yet");

        // Get recipient for this cycle
        address recipient = payoutOrder[circleId][circle.currentCycle];
        require(recipient != address(0), "No recipient for cycle");
        require(!vaults[circleId][recipient].hasReceivedPayout, "Recipient already received");

        // Calculate payout from each member's vault
        uint256 grossPayout = 0;
        uint256 memberCount = circleMembers[circleId].length;

        for (uint256 i = 0; i < memberCount; i++) {
            address member = circleMembers[circleId][i];
            PersonalVault storage vault = vaults[circleId][member];
            
            if (vault.status == MemberStatus.Active || vault.status == MemberStatus.Committed) {
                // Deduct contribution from member's vault
                uint256 contribution = circle.contributionPerCycle;
                require(vault.lockedAmount >= contribution, "Insufficient vault balance");
                vault.lockedAmount -= contribution;
                grossPayout += contribution;
            }
        }

        // Calculate protocol fee
        uint256 protocolFee = (grossPayout * circle.protocolFeeBps) / BPS_DENOMINATOR;
        uint256 netPayout = grossPayout - protocolFee;

        // Transfer protocol fee to treasury
        if (protocolFee > 0 && treasuryVault != address(0)) {
            IERC20(circle.token).safeTransfer(treasuryVault, protocolFee);
        }

        // Transfer net payout to recipient
        IERC20(circle.token).safeTransfer(recipient, netPayout);

        // Update recipient vault
        PersonalVault storage recipientVault = vaults[circleId][recipient];
        recipientVault.hasReceivedPayout = true;
        recipientVault.totalReceived = netPayout;

        // Record payout
        payoutRecords[circleId][circle.currentCycle] = PayoutRecord({
            recipient: recipient,
            amount: netPayout,
            processedAt: block.timestamp,
            processed: true
        });

        circle.totalPaidOut += netPayout;

        emit PayoutProcessed(circleId, circle.currentCycle, recipient, netPayout);

        // Advance to next cycle or complete
        if (circle.currentCycle >= circle.totalCycles) {
            circle.status = CircleStatus.Completed;
            emit CircleCompleted(circleId);
        } else {
            circle.currentCycle++;
        }
    }

    // ============================================
    // EARLY EXIT (Self-Custody Exit with Penalty)
    // ============================================

    /**
     * @notice Exit circle early and withdraw remaining funds (with penalty)
     * @dev Member can always exit, but forfeits penalty to remaining members
     * This maintains self-custody principle: you can always get your funds out
     */
    function exitEarly(uint256 circleId) external nonReentrant {
        Circle storage circle = circles[circleId];
        PersonalVault storage vault = vaults[circleId][msg.sender];
        
        require(vault.owner == msg.sender, "Not your vault");
        require(vault.status == MemberStatus.Active || vault.status == MemberStatus.Committed, "Cannot exit");
        require(vault.lockedAmount > 0, "No funds to withdraw");

        uint256 remainingFunds = vault.lockedAmount;
        uint256 penalty = 0;

        // Apply penalty if circle is active (not just forming)
        if (circle.status == CircleStatus.Active) {
            penalty = (remainingFunds * circle.earlyExitPenaltyBps) / BPS_DENOMINATOR;
        }

        uint256 refundAmount = remainingFunds - penalty;

        // Clear vault
        vault.lockedAmount = 0;
        vault.status = MemberStatus.Exited;

        // Transfer refund to member
        if (refundAmount > 0) {
            IERC20(circle.token).safeTransfer(msg.sender, refundAmount);
        }

        // Distribute penalty to remaining active members
        if (penalty > 0) {
            _distributePenalty(circleId, penalty, msg.sender);
        }

        circle.totalCommitted -= remainingFunds;

        emit EarlyExit(circleId, msg.sender, refundAmount, penalty);

        // Cancel circle if not enough members remain
        uint256 activeMembers = _countActiveMembers(circleId);
        if (activeMembers < MIN_MEMBERS && circle.status == CircleStatus.Active) {
            _cancelCircle(circleId, "Insufficient members after exit");
        }
    }

    /**
     * @notice Distribute penalty to remaining active members
     */
    function _distributePenalty(uint256 circleId, uint256 penalty, address excludeMember) internal {
        uint256 activeCount = 0;
        address[] memory activeMembers = new address[](circleMembers[circleId].length);

        // Find active members
        for (uint256 i = 0; i < circleMembers[circleId].length; i++) {
            address member = circleMembers[circleId][i];
            if (member != excludeMember && 
                (vaults[circleId][member].status == MemberStatus.Active ||
                 vaults[circleId][member].status == MemberStatus.Committed)) {
                activeMembers[activeCount] = member;
                activeCount++;
            }
        }

        if (activeCount == 0) return;

        // Distribute equally
        uint256 sharePerMember = penalty / activeCount;
        for (uint256 i = 0; i < activeCount; i++) {
            vaults[circleId][activeMembers[i]].lockedAmount += sharePerMember;
        }

        circles[circleId].totalCommitted += penalty;
    }

    /**
     * @notice Count active members in circle
     */
    function _countActiveMembers(uint256 circleId) internal view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < circleMembers[circleId].length; i++) {
            MemberStatus status = vaults[circleId][circleMembers[circleId][i]].status;
            if (status == MemberStatus.Active || status == MemberStatus.Committed) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Cancel circle and refund all members
     */
    function _cancelCircle(uint256 circleId, string memory reason) internal {
        Circle storage circle = circles[circleId];
        circle.status = CircleStatus.Cancelled;

        // Refund all remaining vaults
        for (uint256 i = 0; i < circleMembers[circleId].length; i++) {
            address member = circleMembers[circleId][i];
            PersonalVault storage vault = vaults[circleId][member];
            
            if (vault.lockedAmount > 0) {
                uint256 refund = vault.lockedAmount;
                vault.lockedAmount = 0;
                vault.status = MemberStatus.Exited;
                IERC20(circle.token).safeTransfer(member, refund);
            }
        }

        emit CircleCancelled(circleId, reason);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get circle details
     */
    function getCircle(uint256 circleId) external view returns (Circle memory) {
        return circles[circleId];
    }

    /**
     * @notice Get member's vault in a circle
     */
    function getVault(uint256 circleId, address member) external view returns (PersonalVault memory) {
        return vaults[circleId][member];
    }

    /**
     * @notice Get all members of a circle
     */
    function getCircleMembers(uint256 circleId) external view returns (address[] memory) {
        return circleMembers[circleId];
    }

    /**
     * @notice Get current cycle recipient
     */
    function getCurrentRecipient(uint256 circleId) external view returns (address) {
        Circle storage circle = circles[circleId];
        if (circle.currentCycle == 0 || circle.currentCycle > circle.totalCycles) {
            return address(0);
        }
        return payoutOrder[circleId][circle.currentCycle];
    }

    /**
     * @notice Calculate total commitment required to join
     */
    function getRequiredCommitment(uint256 circleId) external view returns (uint256) {
        Circle storage circle = circles[circleId];
        return circle.contributionPerCycle * circle.totalCycles;
    }

    /**
     * @notice Check if circle is ready to process payout
     */
    function isPayoutReady(uint256 circleId) external view returns (bool) {
        Circle storage circle = circles[circleId];
        if (circle.status != CircleStatus.Active) return false;
        if (payoutRecords[circleId][circle.currentCycle].processed) return false;
        
        uint256 cycleStart = circle.startTime + ((circle.currentCycle - 1) * circle.cycleDuration);
        return block.timestamp >= cycleStart;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    function setTreasuryVault(address _treasuryVault) external onlyRole(ADMIN_ROLE) {
        treasuryVault = _treasuryVault;
    }

    function setDefaultProtocolFeeBps(uint16 _feeBps) external onlyRole(ADMIN_ROLE) {
        require(_feeBps <= 500, "Fee too high");
        defaultProtocolFeeBps = _feeBps;
    }

    function setDefaultEarlyExitPenaltyBps(uint16 _penaltyBps) external onlyRole(ADMIN_ROLE) {
        require(_penaltyBps <= MAX_EARLY_EXIT_PENALTY_BPS, "Penalty too high");
        defaultEarlyExitPenaltyBps = _penaltyBps;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency cancel a circle (admin only)
     * @dev Full refunds, no penalties - only for emergency situations
     */
    function emergencyCancelCircle(uint256 circleId, string memory reason) external onlyRole(ADMIN_ROLE) {
        Circle storage circle = circles[circleId];
        require(circle.status != CircleStatus.Completed, "Circle already completed");
        require(circle.status != CircleStatus.Cancelled, "Circle already cancelled");
        
        _cancelCircle(circleId, reason);
    }
}
