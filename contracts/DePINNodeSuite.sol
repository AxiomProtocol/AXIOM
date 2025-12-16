// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DePINNodeSuite
 * @notice Decentralized Physical Infrastructure Network node management system
 * @dev Handles node registration, leasing, revenue sharing, and performance tracking
 * 
 * Features:
 * - Multiple node types (Validator, Storage, Compute, IoT, Network)
 * - Node leasing marketplace with revenue sharing
 * - Performance tracking and uptime monitoring
 * - Staking requirements and slashing for poor performance
 * - Automated revenue distribution to node lessees
 * - Integration with CitizenReputationOracle for operator verification
 */
contract DePINNodeSuite is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant NODE_MANAGER_ROLE = keccak256("NODE_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // External contract addresses
    address public axmToken;
    address public reputationOracle;
    address public identityHub;
    
    // Safe wallet addresses
    address public adminSafe;
    address public treasurySafe;
    
    // Global counters
    uint256 public totalNodes;
    uint256 public activeNodes;
    uint256 public totalLeases;
    
    // Staking requirements per node type (in AXM tokens)
    mapping(NodeType => uint256) public stakingRequirements;
    
    // Lease fee split (basis points, 10000 = 100%)
    uint256 public leaseFeeToTreasuryBps = 500;  // 5% to treasury, 95% to operator
    
    // Operational revenue share percentages (basis points, 10000 = 100%)
    uint256 public lesseeShareBps = 7000;        // 70% to lessee
    uint256 public operatorShareBps = 2500;      // 25% to operator
    uint256 public treasuryShareBps = 500;       // 5% to treasury
    
    // Performance thresholds
    uint256 public minimumUptimePercentage = 9500;  // 95% uptime required
    uint256 public slashingPercentage = 1000;       // 10% slash for violations
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum NodeType { Validator, Storage, Compute, IoT, Network }
    enum NodeStatus { Pending, Active, Suspended, Retired }
    enum LeaseStatus { Active, Completed, Terminated, Defaulted }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Node {
        uint256 nodeId;
        NodeType nodeType;
        address operator;
        string ipAddress;
        string metadata;               // IPFS hash with specs, location, etc.
        uint256 stakedAmount;
        uint256 registrationDate;
        uint256 totalUptime;           // In seconds
        uint256 totalDowntime;         // In seconds
        uint256 lastHealthCheck;
        uint256 totalRevenueGenerated;
        uint256 slashedAmount;
        NodeStatus status;
        bool isLeased;
        uint256 currentLeaseId;
    }
    
    struct NodeLease {
        uint256 leaseId;
        uint256 nodeId;
        address lessee;                // Who is leasing the node
        address operator;              // Node operator
        uint256 monthlyFee;           // In AXM tokens
        uint256 leaseDuration;        // In months
        uint256 startDate;
        uint256 endDate;
        uint256 securityDeposit;
        uint256 totalRevenue;         // Revenue generated during lease
        uint256 totalPaid;            // Fees paid by lessee
        uint256 lastPaymentDate;
        LeaseStatus status;
    }
    
    struct PerformanceRecord {
        uint256 nodeId;
        uint256 timestamp;
        uint256 uptimeSeconds;
        uint256 downtimeSeconds;
        uint256 revenueGenerated;
        bool healthCheckPassed;
    }
    
    struct RevenueDistribution {
        uint256 leaseId;
        uint256 totalRevenue;
        uint256 lesseeShare;
        uint256 operatorShare;
        uint256 treasuryShare;
        uint256 timestamp;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => Node) public nodes;
    mapping(address => uint256[]) public operatorNodes;
    mapping(uint256 => NodeLease) public leases;
    mapping(address => uint256[]) public lesseeLeases;
    mapping(uint256 => PerformanceRecord[]) public performanceHistory;
    mapping(uint256 => RevenueDistribution[]) public revenueHistory;
    mapping(address => uint256) public pendingWithdrawals;  // Accumulated earnings
    mapping(uint256 => uint256) public escrowedRevenue;      // Operational revenue escrowed per node
    mapping(address => uint256) public pendingLeaseDeposits; // Pre-deposited funds for leases
    
    // ============================================
    // EVENTS
    // ============================================
    
    event NodeRegistered(
        uint256 indexed nodeId,
        NodeType indexed nodeType,
        address indexed operator,
        uint256 stakedAmount
    );
    
    event NodeLeaseCreated(
        uint256 indexed leaseId,
        uint256 indexed nodeId,
        address indexed lessee,
        uint256 monthlyFee,
        uint256 duration
    );
    
    event LeaseFeePayment(
        uint256 indexed leaseId,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );
    
    event RevenueDistributed(
        uint256 indexed leaseId,
        uint256 indexed nodeId,
        uint256 totalRevenue,
        uint256 lesseeShare,
        uint256 operatorShare
    );
    
    event PerformanceRecorded(
        uint256 indexed nodeId,
        uint256 uptimeSeconds,
        uint256 downtimeSeconds,
        bool healthCheckPassed
    );
    
    event NodeSlashed(
        uint256 indexed nodeId,
        address indexed operator,
        uint256 amount,
        string reason
    );
    
    event NodeStatusChanged(
        uint256 indexed nodeId,
        NodeStatus oldStatus,
        NodeStatus newStatus
    );
    
    event WithdrawalProcessed(
        address indexed recipient,
        uint256 amount
    );
    
    event OperationalRevenueDeposited(
        uint256 indexed nodeId,
        address indexed depositor,
        uint256 amount
    );
    
    event LeaseDepositReceived(
        address indexed depositor,
        uint256 amount
    );
    
    event LeaseDepositWithdrawn(
        address indexed recipient,
        uint256 amount
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _axmToken,
        address _adminSafe,
        address _treasurySafe
    ) {
        require(_axmToken != address(0), "Invalid AXM token");
        require(_adminSafe != address(0), "Invalid admin safe");
        require(_treasurySafe != address(0), "Invalid treasury safe");
        
        axmToken = _axmToken;
        adminSafe = _adminSafe;
        treasurySafe = _treasurySafe;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _adminSafe);
        _grantRole(ADMIN_ROLE, _adminSafe);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Set default staking requirements
        stakingRequirements[NodeType.Validator] = 10000 * 10**18;   // 10,000 AXM
        stakingRequirements[NodeType.Storage] = 5000 * 10**18;      // 5,000 AXM
        stakingRequirements[NodeType.Compute] = 7500 * 10**18;      // 7,500 AXM
        stakingRequirements[NodeType.IoT] = 1000 * 10**18;          // 1,000 AXM
        stakingRequirements[NodeType.Network] = 5000 * 10**18;      // 5,000 AXM
    }
    
    // ============================================
    // NODE REGISTRATION & MANAGEMENT
    // ============================================
    
    /**
     * @notice Register a new DePIN node
     * @param nodeType Type of node (Validator, Storage, etc.)
     * @param ipAddress Node IP address
     * @param metadata IPFS hash with node specifications
     */
    function registerNode(
        NodeType nodeType,
        string calldata ipAddress,
        string calldata metadata
    ) external nonReentrant whenNotPaused returns (uint256) {
        uint256 requiredStake = stakingRequirements[nodeType];
        require(requiredStake > 0, "Invalid node type");
        
        // Collect staking requirement
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), requiredStake);
        
        totalNodes++;
        activeNodes++;
        uint256 nodeId = totalNodes;
        
        Node storage node = nodes[nodeId];
        node.nodeId = nodeId;
        node.nodeType = nodeType;
        node.operator = msg.sender;
        node.ipAddress = ipAddress;
        node.metadata = metadata;
        node.stakedAmount = requiredStake;
        node.registrationDate = block.timestamp;
        node.lastHealthCheck = block.timestamp;
        node.status = NodeStatus.Pending;
        
        operatorNodes[msg.sender].push(nodeId);
        
        emit NodeRegistered(nodeId, nodeType, msg.sender, requiredStake);
        
        return nodeId;
    }
    
    /**
     * @notice Activate a pending node
     * @param nodeId Node to activate
     */
    function activateNode(uint256 nodeId) external onlyRole(NODE_MANAGER_ROLE) {
        Node storage node = nodes[nodeId];
        require(node.status == NodeStatus.Pending, "Node not pending");
        
        NodeStatus oldStatus = node.status;
        node.status = NodeStatus.Active;
        
        emit NodeStatusChanged(nodeId, oldStatus, NodeStatus.Active);
    }
    
    /**
     * @notice Update node performance metrics
     * @param nodeId Node to update
     * @param uptimeSeconds Uptime since last check
     * @param downtimeSeconds Downtime since last check
     * @param revenueGenerated Revenue generated since last check
     * @param healthCheckPassed Whether health check passed
     */
    function updatePerformance(
        uint256 nodeId,
        uint256 uptimeSeconds,
        uint256 downtimeSeconds,
        uint256 revenueGenerated,
        bool healthCheckPassed
    ) external onlyRole(ORACLE_ROLE) {
        Node storage node = nodes[nodeId];
        require(node.status == NodeStatus.Active, "Node not active");
        
        node.totalUptime += uptimeSeconds;
        node.totalDowntime += downtimeSeconds;
        node.totalRevenueGenerated += revenueGenerated;
        node.lastHealthCheck = block.timestamp;
        
        // Record performance
        performanceHistory[nodeId].push(PerformanceRecord({
            nodeId: nodeId,
            timestamp: block.timestamp,
            uptimeSeconds: uptimeSeconds,
            downtimeSeconds: downtimeSeconds,
            revenueGenerated: revenueGenerated,
            healthCheckPassed: healthCheckPassed
        }));
        
        emit PerformanceRecorded(nodeId, uptimeSeconds, downtimeSeconds, healthCheckPassed);
        
        // Check uptime threshold and slash if necessary
        uint256 totalTime = node.totalUptime + node.totalDowntime;
        if (totalTime > 0) {
            uint256 uptimePercentage = (node.totalUptime * 10000) / totalTime;
            
            if (uptimePercentage < minimumUptimePercentage) {
                _slashNode(nodeId, "Low uptime");
            }
        }
        
        // Distribute revenue if node is leased
        if (node.isLeased && revenueGenerated > 0) {
            _distributeRevenue(node.currentLeaseId, revenueGenerated);
        }
    }
    
    /**
     * @notice Slash a node for poor performance
     */
    function _slashNode(uint256 nodeId, string memory reason) internal {
        Node storage node = nodes[nodeId];
        
        uint256 slashAmount = (node.stakedAmount * slashingPercentage) / 10000;
        if (slashAmount > 0) {
            node.stakedAmount -= slashAmount;
            node.slashedAmount += slashAmount;
            
            // Send slashed amount to treasury
            IERC20(axmToken).safeTransfer(treasurySafe, slashAmount);
            
            emit NodeSlashed(nodeId, node.operator, slashAmount, reason);
        }
    }
    
    // ============================================
    // NODE LEASING
    // ============================================
    
    /**
     * @notice Create a lease for a node (called by lessee directly)
     * @param nodeId Node to lease
     * @param monthlyFee Monthly lease fee in AXM
     * @param leaseDuration Duration in months
     * @param securityDeposit Security deposit amount
     * @dev SECURITY: Caller IS the lessee - transfers only from msg.sender
     */
    function createLease(
        uint256 nodeId,
        uint256 monthlyFee,
        uint256 leaseDuration,
        uint256 securityDeposit
    ) external whenNotPaused returns (uint256) {
        return _createLeaseInternal(nodeId, msg.sender, monthlyFee, leaseDuration, securityDeposit, true);
    }
    
    /**
     * @notice Create a lease for a node on behalf of lessee (admin only)
     * @param nodeId Node to lease
     * @param lessee Address leasing the node (must have pre-deposited funds)
     * @param monthlyFee Monthly lease fee in AXM
     * @param leaseDuration Duration in months
     * @param securityDeposit Security deposit amount
     * @dev SECURITY: Admin-only, uses lessee's pre-deposited funds, NO transferFrom from lessee
     */
    function createLeaseAsAdmin(
        uint256 nodeId,
        address lessee,
        uint256 monthlyFee,
        uint256 leaseDuration,
        uint256 securityDeposit
    ) external onlyRole(NODE_MANAGER_ROLE) whenNotPaused returns (uint256) {
        return _createLeaseInternal(nodeId, lessee, monthlyFee, leaseDuration, securityDeposit, false);
    }
    
    /**
     * @dev Internal lease creation logic
     * @param isLesseeCalling True if lessee is calling directly, false if admin is calling
     */
    function _createLeaseInternal(
        uint256 nodeId,
        address lessee,
        uint256 monthlyFee,
        uint256 leaseDuration,
        uint256 securityDeposit,
        bool isLesseeCalling
    ) internal returns (uint256) {
        Node storage node = nodes[nodeId];
        require(node.status == NodeStatus.Active, "Node not active");
        require(!node.isLeased, "Node already leased");
        require(lessee != address(0), "Invalid lessee");
        require(monthlyFee > 0, "Invalid monthly fee");
        require(leaseDuration > 0, "Invalid duration");
        
        totalLeases++;
        uint256 leaseId = totalLeases;
        
        NodeLease storage lease = leases[leaseId];
        lease.leaseId = leaseId;
        lease.nodeId = nodeId;
        lease.lessee = lessee;
        lease.operator = node.operator;
        lease.monthlyFee = monthlyFee;
        lease.leaseDuration = leaseDuration;
        lease.startDate = block.timestamp;
        lease.endDate = block.timestamp + (leaseDuration * 30 days);
        lease.securityDeposit = securityDeposit;
        lease.status = LeaseStatus.Active;
        
        node.isLeased = true;
        node.currentLeaseId = leaseId;
        
        lesseeLeases[lessee].push(leaseId);
        
        // Collect security deposit
        if (securityDeposit > 0) {
            if (isLesseeCalling) {
                // Lessee calling - transfer from msg.sender (which IS the lessee)
                IERC20(axmToken).safeTransferFrom(msg.sender, address(this), securityDeposit);
            } else {
                // Admin calling - use lessee's pre-deposited funds only
                require(
                    pendingLeaseDeposits[lessee] >= securityDeposit,
                    "Lessee must deposit security first"
                );
                pendingLeaseDeposits[lessee] -= securityDeposit;
            }
        }
        
        emit NodeLeaseCreated(leaseId, nodeId, lessee, monthlyFee, leaseDuration);
        
        return leaseId;
    }
    
    /**
     * @notice Deposit security funds for a lease (called by lessee before admin creates lease)
     * @param amount Amount to deposit
     * @dev Only msg.sender can deposit to their own balance
     */
    function depositForLease(uint256 amount) external whenNotPaused {
        require(amount > 0, "Amount must be positive");
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), amount);
        pendingLeaseDeposits[msg.sender] += amount;
        emit LeaseDepositReceived(msg.sender, amount);
    }
    
    /**
     * @notice Withdraw unused lease deposit
     * @dev Only msg.sender can withdraw their own deposits
     */
    function withdrawLeaseDeposit(uint256 amount) external nonReentrant whenNotPaused {
        require(pendingLeaseDeposits[msg.sender] >= amount, "Insufficient deposit");
        pendingLeaseDeposits[msg.sender] -= amount;
        IERC20(axmToken).safeTransfer(msg.sender, amount);
        emit LeaseDepositWithdrawn(msg.sender, amount);
    }
    
    /**
     * @notice Pay monthly lease fee
     * @param leaseId Lease to pay for
     * @dev Lease fees are split: treasury rake (5%) + operator (95%)
     */
    function payLeaseFee(uint256 leaseId) external nonReentrant whenNotPaused {
        NodeLease storage lease = leases[leaseId];
        require(lease.status == LeaseStatus.Active, "Lease not active");
        require(msg.sender == lease.lessee, "Only lessee can pay");
        require(block.timestamp <= lease.endDate, "Lease expired");
        
        uint256 amount = lease.monthlyFee;
        
        // Transfer fee from lessee
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), amount);
        
        lease.totalPaid += amount;
        lease.lastPaymentDate = block.timestamp;
        
        // Split lease fee: treasury rake + remainder to operator (sums to 100%)
        uint256 treasuryShare = (amount * leaseFeeToTreasuryBps) / 10000;
        uint256 operatorShare = amount - treasuryShare;
        
        // Credit operator's pending withdrawals
        pendingWithdrawals[lease.operator] += operatorShare;
        
        // Send treasury share immediately
        if (treasuryShare > 0) {
            IERC20(axmToken).safeTransfer(treasurySafe, treasuryShare);
        }
        
        emit LeaseFeePayment(leaseId, msg.sender, amount, block.timestamp);
    }
    
    /**
     * @notice Deposit operational revenue for a node
     * @param nodeId Node that generated revenue
     * @param amount Revenue amount to deposit
     * @dev Must be called before revenue can be distributed. Operator/Oracle deposits actual AXM tokens.
     */
    function depositOperationalRevenue(
        uint256 nodeId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        Node storage node = nodes[nodeId];
        require(node.status == NodeStatus.Active, "Node not active");
        require(amount > 0, "Invalid amount");
        
        // Transfer revenue into contract
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Add to escrowed revenue for this node
        escrowedRevenue[nodeId] += amount;
        
        emit OperationalRevenueDeposited(nodeId, msg.sender, amount);
    }
    
    /**
     * @notice Distribute revenue from node operations
     * @dev Consumes escrowed revenue deposited via depositOperationalRevenue()
     */
    function _distributeRevenue(uint256 leaseId, uint256 revenue) internal {
        NodeLease storage lease = leases[leaseId];
        uint256 nodeId = lease.nodeId;
        
        // Ensure sufficient escrowed revenue exists
        require(escrowedRevenue[nodeId] >= revenue, "Insufficient escrowed revenue");
        
        // Consume escrowed revenue
        escrowedRevenue[nodeId] -= revenue;
        
        lease.totalRevenue += revenue;
        
        // Calculate shares (must sum to 100%)
        uint256 lesseeShare = (revenue * lesseeShareBps) / 10000;
        uint256 operatorShare = (revenue * operatorShareBps) / 10000;
        uint256 treasuryShare = (revenue * treasuryShareBps) / 10000;
        
        // Add to pending withdrawals
        pendingWithdrawals[lease.lessee] += lesseeShare;
        pendingWithdrawals[lease.operator] += operatorShare;
        
        // Send treasury share immediately
        if (treasuryShare > 0) {
            IERC20(axmToken).safeTransfer(treasurySafe, treasuryShare);
        }
        
        // Record distribution
        revenueHistory[leaseId].push(RevenueDistribution({
            leaseId: leaseId,
            totalRevenue: revenue,
            lesseeShare: lesseeShare,
            operatorShare: operatorShare,
            treasuryShare: treasuryShare,
            timestamp: block.timestamp
        }));
        
        emit RevenueDistributed(leaseId, nodeId, revenue, lesseeShare, operatorShare);
    }
    
    /**
     * @notice Withdraw accumulated earnings
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawals");
        
        pendingWithdrawals[msg.sender] = 0;
        IERC20(axmToken).safeTransfer(msg.sender, amount);
        
        emit WithdrawalProcessed(msg.sender, amount);
    }
    
    /**
     * @notice Terminate a lease
     * @param leaseId Lease to terminate
     * @param refundDeposit Whether to refund security deposit
     */
    function terminateLease(
        uint256 leaseId,
        bool refundDeposit
    ) external onlyRole(NODE_MANAGER_ROLE) {
        NodeLease storage lease = leases[leaseId];
        require(lease.status == LeaseStatus.Active, "Lease not active");
        
        lease.status = LeaseStatus.Terminated;
        
        Node storage node = nodes[lease.nodeId];
        node.isLeased = false;
        node.currentLeaseId = 0;
        
        // Refund security deposit if applicable
        if (refundDeposit && lease.securityDeposit > 0) {
            IERC20(axmToken).safeTransfer(lease.lessee, lease.securityDeposit);
        }
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update staking requirement for a node type
     */
    function updateStakingRequirement(
        NodeType nodeType,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        stakingRequirements[nodeType] = amount;
    }
    
    /**
     * @notice Update revenue share percentages
     */
    function updateRevenueShares(
        uint256 _lesseeShareBps,
        uint256 _operatorShareBps,
        uint256 _treasuryShareBps
    ) external onlyRole(ADMIN_ROLE) {
        require(_lesseeShareBps + _operatorShareBps + _treasuryShareBps == 10000, "Must sum to 100%");
        
        lesseeShareBps = _lesseeShareBps;
        operatorShareBps = _operatorShareBps;
        treasuryShareBps = _treasuryShareBps;
    }
    
    /**
     * @notice Update performance thresholds
     */
    function updatePerformanceThresholds(
        uint256 _minimumUptimePercentage,
        uint256 _slashingPercentage
    ) external onlyRole(ADMIN_ROLE) {
        require(_minimumUptimePercentage <= 10000, "Invalid uptime");
        require(_slashingPercentage <= 10000, "Invalid slashing");
        
        minimumUptimePercentage = _minimumUptimePercentage;
        slashingPercentage = _slashingPercentage;
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
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Get node details
     */
    function getNode(uint256 nodeId) external view returns (Node memory) {
        return nodes[nodeId];
    }
    
    /**
     * @notice Get lease details
     */
    function getLease(uint256 leaseId) external view returns (NodeLease memory) {
        return leases[leaseId];
    }
    
    /**
     * @notice Get nodes operated by an address
     */
    function getOperatorNodes(address operator) external view returns (uint256[] memory) {
        return operatorNodes[operator];
    }
    
    /**
     * @notice Get leases for a lessee
     */
    function getLesseeLeases(address lessee) external view returns (uint256[] memory) {
        return lesseeLeases[lessee];
    }
    
    /**
     * @notice Get performance history for a node
     */
    function getPerformanceHistory(uint256 nodeId) external view returns (PerformanceRecord[] memory) {
        return performanceHistory[nodeId];
    }
    
    /**
     * @notice Get revenue distribution history for a lease
     */
    function getRevenueHistory(uint256 leaseId) external view returns (RevenueDistribution[] memory) {
        return revenueHistory[leaseId];
    }
    
    /**
     * @notice Calculate node uptime percentage
     */
    function getUptimePercentage(uint256 nodeId) external view returns (uint256) {
        Node memory node = nodes[nodeId];
        uint256 totalTime = node.totalUptime + node.totalDowntime;
        
        if (totalTime == 0) return 0;
        
        return (node.totalUptime * 10000) / totalTime;
    }
}
