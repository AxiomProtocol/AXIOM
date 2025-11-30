// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CapitalPoolsAndFunds
 * @notice Investment pool and fund management system for Axiom Smart City
 * @dev Manages various investment funds including real estate, infrastructure, and node funds
 * 
 * Features:
 * - Multiple fund types (Real Estate, Infrastructure, Node Operations, Development)
 * - Automated yield distribution to investors
 * - Configurable management fees
 * - Performance-based incentives
 * - Minimum investment thresholds
 * - Lock-up periods for stability
 * - Withdrawal queues for liquidity management
 */
contract CapitalPoolsAndFunds is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FUND_MANAGER_ROLE = keccak256("FUND_MANAGER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // External contracts
    address public axmToken;
    address public adminSafe;
    address public treasurySafe;
    
    // Global counters
    uint256 public totalFunds;
    uint256 public totalInvestments;
    
    // Fee parameters (basis points, 10000 = 100%)
    uint256 public defaultManagementFeeBps = 200;    // 2% annual management fee
    uint256 public defaultPerformanceFeeBps = 2000;  // 20% performance fee
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum FundType { RealEstate, Infrastructure, NodeOperations, Development, Mixed }
    enum FundStatus { Active, Paused, Closed, Liquidating }
    enum InvestmentStatus { Active, Withdrawn, Liquidated }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Fund {
        uint256 fundId;
        string name;
        FundType fundType;
        address fundManager;
        uint256 totalCapital;              // Total AXM deposited
        uint256 totalShares;               // Total shares issued
        uint256 minimumInvestment;         // Minimum investment amount
        uint256 lockupPeriod;              // Lock-up period in seconds
        uint256 managementFeeBps;          // Annual management fee
        uint256 performanceFeeBps;         // Performance fee on profits
        uint256 createdAt;
        uint256 lastFeeCollection;
        uint256 totalYieldDistributed;
        uint256 totalFeesCollected;
        FundStatus status;
    }
    
    struct Investment {
        uint256 investmentId;
        uint256 fundId;
        address investor;
        uint256 amountInvested;            // AXM invested
        uint256 sharesOwned;               // Shares in the fund
        uint256 investmentDate;
        uint256 lastYieldClaim;
        uint256 totalYieldClaimed;
        InvestmentStatus status;
    }
    
    struct YieldDistribution {
        uint256 fundId;
        uint256 totalYield;                // Total yield to distribute
        uint256 yieldPerShare;             // Yield per share (scaled by 1e18)
        uint256 timestamp;
    }
    
    struct WithdrawalRequest {
        uint256 requestId;
        uint256 investmentId;
        address investor;
        uint256 sharesRequested;
        uint256 requestDate;
        bool processed;
        uint256 amountReceived;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => Fund) public funds;
    mapping(uint256 => Investment) public investments;
    mapping(address => uint256[]) public investorFunds;
    mapping(uint256 => uint256[]) public fundInvestments;  // fundId => investment IDs
    mapping(uint256 => YieldDistribution[]) public yieldHistory;
    mapping(uint256 => uint256) public accumulatedYieldPerShare;  // fundId => accumulated yield per share
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    mapping(uint256 => uint256[]) public pendingWithdrawals;  // fundId => withdrawal request IDs
    mapping(address => uint256) public pendingYieldClaims;    // investor => claimable yield
    
    uint256 public totalWithdrawalRequests;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event FundCreated(
        uint256 indexed fundId,
        string name,
        FundType indexed fundType,
        address indexed manager,
        uint256 minimumInvestment
    );
    
    event InvestmentMade(
        uint256 indexed investmentId,
        uint256 indexed fundId,
        address indexed investor,
        uint256 amount,
        uint256 shares
    );
    
    event YieldDistributed(
        uint256 indexed fundId,
        uint256 totalYield,
        uint256 yieldPerShare
    );
    
    event YieldClaimed(
        address indexed investor,
        uint256 amount
    );
    
    event WithdrawalRequested(
        uint256 indexed requestId,
        uint256 indexed investmentId,
        address indexed investor,
        uint256 shares
    );
    
    event WithdrawalProcessed(
        uint256 indexed requestId,
        address indexed investor,
        uint256 amount
    );
    
    event ManagementFeeCollected(
        uint256 indexed fundId,
        uint256 amount
    );
    
    event PerformanceFeeCollected(
        uint256 indexed fundId,
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
    }
    
    // ============================================
    // FUND MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a new investment fund
     * @param name Fund name
     * @param fundType Type of fund
     * @param fundManager Address managing the fund
     * @param minimumInvestment Minimum investment amount
     * @param lockupPeriod Lock-up period in days
     * @param managementFeeBps Annual management fee in basis points
     * @param performanceFeeBps Performance fee in basis points
     */
    function createFund(
        string calldata name,
        FundType fundType,
        address fundManager,
        uint256 minimumInvestment,
        uint256 lockupPeriod,
        uint256 managementFeeBps,
        uint256 performanceFeeBps
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256) {
        require(fundManager != address(0), "Invalid manager");
        require(minimumInvestment > 0, "Invalid minimum");
        require(managementFeeBps <= 1000, "Management fee too high"); // Max 10%
        require(performanceFeeBps <= 5000, "Performance fee too high"); // Max 50%
        
        totalFunds++;
        uint256 fundId = totalFunds;
        
        Fund storage fund = funds[fundId];
        fund.fundId = fundId;
        fund.name = name;
        fund.fundType = fundType;
        fund.fundManager = fundManager;
        fund.minimumInvestment = minimumInvestment;
        fund.lockupPeriod = lockupPeriod * 1 days;
        fund.managementFeeBps = managementFeeBps;
        fund.performanceFeeBps = performanceFeeBps;
        fund.createdAt = block.timestamp;
        fund.lastFeeCollection = block.timestamp;
        fund.status = FundStatus.Active;
        
        // Grant manager role
        _grantRole(FUND_MANAGER_ROLE, fundManager);
        
        emit FundCreated(fundId, name, fundType, fundManager, minimumInvestment);
        
        return fundId;
    }
    
    /**
     * @notice Invest in a fund
     * @param fundId Fund to invest in
     * @param amount Amount of AXM to invest
     */
    function invest(
        uint256 fundId,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint256) {
        Fund storage fund = funds[fundId];
        require(fund.status == FundStatus.Active, "Fund not active");
        require(amount >= fund.minimumInvestment, "Below minimum investment");
        
        // Transfer investment from investor
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate shares to issue
        uint256 shares;
        if (fund.totalShares == 0) {
            // First investment: 1:1 ratio
            shares = amount;
        } else {
            // Subsequent investments: proportional to existing shares
            shares = (amount * fund.totalShares) / fund.totalCapital;
        }
        
        // Update fund
        fund.totalCapital += amount;
        fund.totalShares += shares;
        
        // Create investment record
        totalInvestments++;
        uint256 investmentId = totalInvestments;
        
        Investment storage investment = investments[investmentId];
        investment.investmentId = investmentId;
        investment.fundId = fundId;
        investment.investor = msg.sender;
        investment.amountInvested = amount;
        investment.sharesOwned = shares;
        investment.investmentDate = block.timestamp;
        investment.lastYieldClaim = block.timestamp;
        investment.status = InvestmentStatus.Active;
        
        // Track investor's funds
        investorFunds[msg.sender].push(fundId);
        fundInvestments[fundId].push(investmentId);
        
        emit InvestmentMade(investmentId, fundId, msg.sender, amount, shares);
        
        return investmentId;
    }
    
    /**
     * @notice Deposit yield into a fund for distribution
     * @param fundId Fund to deposit yield into
     * @param amount Yield amount to deposit
     * @dev Must deposit actual AXM tokens before distribution. Requires outstanding shares.
     */
    function depositYield(
        uint256 fundId,
        uint256 amount
    ) external nonReentrant onlyRole(FUND_MANAGER_ROLE) {
        Fund storage fund = funds[fundId];
        require(fund.status == FundStatus.Active, "Fund not active");
        require(amount > 0, "Invalid amount");
        require(fund.totalShares > 0, "No shares outstanding");
        
        // Transfer yield into contract
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Collect performance fee if applicable
        uint256 performanceFee = (amount * fund.performanceFeeBps) / 10000;
        uint256 netYield = amount - performanceFee;
        
        if (performanceFee > 0) {
            IERC20(axmToken).safeTransfer(treasurySafe, performanceFee);
            fund.totalFeesCollected += performanceFee;
            emit PerformanceFeeCollected(fundId, performanceFee);
        }
        
        // Calculate yield per share (scaled by 1e18 for precision)
        uint256 yieldPerShare = (netYield * 1e18) / fund.totalShares;
        
        // Update accumulated yield per share
        accumulatedYieldPerShare[fundId] += yieldPerShare;
        
        fund.totalYieldDistributed += netYield;
        
        // Record distribution
        yieldHistory[fundId].push(YieldDistribution({
            fundId: fundId,
            totalYield: netYield,
            yieldPerShare: yieldPerShare,
            timestamp: block.timestamp
        }));
        
        emit YieldDistributed(fundId, netYield, yieldPerShare);
    }
    
    /**
     * @notice Claim accumulated yield from investments
     * @param investmentId Investment to claim yield from
     */
    function claimYield(uint256 investmentId) external nonReentrant {
        Investment storage investment = investments[investmentId];
        require(investment.investor == msg.sender, "Not your investment");
        require(investment.status == InvestmentStatus.Active, "Investment not active");
        
        uint256 fundId = investment.fundId;
        uint256 accumulatedYield = accumulatedYieldPerShare[fundId];
        
        // Calculate claimable yield
        uint256 yieldAmount = (investment.sharesOwned * accumulatedYield) / 1e18;
        uint256 claimable = yieldAmount - investment.totalYieldClaimed;
        
        require(claimable > 0, "No yield to claim");
        
        // Update investment
        investment.totalYieldClaimed += claimable;
        investment.lastYieldClaim = block.timestamp;
        
        // Transfer yield to investor
        IERC20(axmToken).safeTransfer(msg.sender, claimable);
        
        emit YieldClaimed(msg.sender, claimable);
    }
    
    /**
     * @notice Request withdrawal from fund
     * @param investmentId Investment to withdraw from
     * @param shares Number of shares to withdraw
     */
    function requestWithdrawal(
        uint256 investmentId,
        uint256 shares
    ) external nonReentrant whenNotPaused returns (uint256) {
        Investment storage investment = investments[investmentId];
        require(investment.investor == msg.sender, "Not your investment");
        require(investment.status == InvestmentStatus.Active, "Investment not active");
        require(shares > 0 && shares <= investment.sharesOwned, "Invalid shares");
        
        uint256 fundId = investment.fundId;
        Fund storage fund = funds[fundId];
        
        // Check lock-up period
        require(
            block.timestamp >= investment.investmentDate + fund.lockupPeriod,
            "Lock-up period not ended"
        );
        
        // Create withdrawal request
        totalWithdrawalRequests++;
        uint256 requestId = totalWithdrawalRequests;
        
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        request.requestId = requestId;
        request.investmentId = investmentId;
        request.investor = msg.sender;
        request.sharesRequested = shares;
        request.requestDate = block.timestamp;
        request.processed = false;
        
        pendingWithdrawals[fundId].push(requestId);
        
        emit WithdrawalRequested(requestId, investmentId, msg.sender, shares);
        
        return requestId;
    }
    
    /**
     * @notice Process a withdrawal request
     * @param requestId Withdrawal request to process
     * @dev Settles accrued yield before withdrawal and adjusts totalYieldClaimed for remaining shares
     */
    function processWithdrawal(
        uint256 requestId
    ) external nonReentrant onlyRole(FUND_MANAGER_ROLE) {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(!request.processed, "Already processed");
        
        Investment storage investment = investments[request.investmentId];
        uint256 fundId = investment.fundId;
        Fund storage fund = funds[fundId];
        
        // Step 1: Settle any pending yield before withdrawal
        uint256 accumulatedYield = accumulatedYieldPerShare[fundId];
        uint256 totalYieldEntitled = (investment.sharesOwned * accumulatedYield) / 1e18;
        uint256 pendingYield = totalYieldEntitled - investment.totalYieldClaimed;
        
        uint256 totalPayout = 0;
        
        if (pendingYield > 0) {
            // Pay pending yield to investor
            IERC20(axmToken).safeTransfer(request.investor, pendingYield);
            investment.totalYieldClaimed += pendingYield;
            totalPayout += pendingYield;
        }
        
        // Step 2: Calculate withdrawal amount based on shares
        uint256 withdrawalAmount = (request.sharesRequested * fund.totalCapital) / fund.totalShares;
        
        // Step 3: Update investment shares
        uint256 sharesRemaining = investment.sharesOwned - request.sharesRequested;
        investment.sharesOwned = sharesRemaining;
        
        // Step 4: Adjust totalYieldClaimed proportionally to remaining shares
        if (sharesRemaining > 0) {
            // Scale totalYieldClaimed to remaining share balance
            investment.totalYieldClaimed = (sharesRemaining * accumulatedYield) / 1e18;
        } else {
            // Full withdrawal - mark as withdrawn
            investment.totalYieldClaimed = 0;
            investment.status = InvestmentStatus.Withdrawn;
        }
        
        // Step 5: Update fund
        fund.totalShares -= request.sharesRequested;
        fund.totalCapital -= withdrawalAmount;
        
        // Step 6: Mark request as processed
        request.processed = true;
        request.amountReceived = withdrawalAmount;
        
        totalPayout += withdrawalAmount;
        
        // Step 7: Transfer withdrawal amount to investor
        IERC20(axmToken).safeTransfer(request.investor, withdrawalAmount);
        
        emit WithdrawalProcessed(requestId, request.investor, totalPayout);
    }
    
    /**
     * @notice Collect management fee from a fund
     * @param fundId Fund to collect fees from
     */
    function collectManagementFee(uint256 fundId) external onlyRole(FUND_MANAGER_ROLE) {
        Fund storage fund = funds[fundId];
        require(fund.status == FundStatus.Active, "Fund not active");
        
        // Calculate time elapsed since last collection
        uint256 timeElapsed = block.timestamp - fund.lastFeeCollection;
        require(timeElapsed >= 30 days, "Too soon to collect");
        
        // Calculate annual fee prorated for time elapsed
        uint256 annualFee = (fund.totalCapital * fund.managementFeeBps) / 10000;
        uint256 fee = (annualFee * timeElapsed) / 365 days;
        
        require(fee > 0, "No fee to collect");
        require(fund.totalCapital >= fee, "Insufficient capital");
        
        // Update fund
        fund.totalCapital -= fee;
        fund.lastFeeCollection = block.timestamp;
        fund.totalFeesCollected += fee;
        
        // Transfer fee to treasury
        IERC20(axmToken).safeTransfer(treasurySafe, fee);
        
        emit ManagementFeeCollected(fundId, fee);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update fund status
     */
    function updateFundStatus(
        uint256 fundId,
        FundStatus newStatus
    ) external onlyRole(ADMIN_ROLE) {
        Fund storage fund = funds[fundId];
        fund.status = newStatus;
    }
    
    /**
     * @notice Update default fee parameters
     */
    function updateDefaultFees(
        uint256 _managementFeeBps,
        uint256 _performanceFeeBps
    ) external onlyRole(ADMIN_ROLE) {
        require(_managementFeeBps <= 1000, "Management fee too high");
        require(_performanceFeeBps <= 5000, "Performance fee too high");
        
        defaultManagementFeeBps = _managementFeeBps;
        defaultPerformanceFeeBps = _performanceFeeBps;
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
     * @notice Get fund details
     */
    function getFund(uint256 fundId) external view returns (Fund memory) {
        return funds[fundId];
    }
    
    /**
     * @notice Get investment details
     */
    function getInvestment(uint256 investmentId) external view returns (Investment memory) {
        return investments[investmentId];
    }
    
    /**
     * @notice Get investor's funds
     */
    function getInvestorFunds(address investor) external view returns (uint256[] memory) {
        return investorFunds[investor];
    }
    
    /**
     * @notice Get fund's investments
     */
    function getFundInvestments(uint256 fundId) external view returns (uint256[] memory) {
        return fundInvestments[fundId];
    }
    
    /**
     * @notice Get yield history for a fund
     */
    function getYieldHistory(uint256 fundId) external view returns (YieldDistribution[] memory) {
        return yieldHistory[fundId];
    }
    
    /**
     * @notice Get pending withdrawals for a fund
     */
    function getPendingWithdrawals(uint256 fundId) external view returns (uint256[] memory) {
        return pendingWithdrawals[fundId];
    }
    
    /**
     * @notice Calculate claimable yield for an investment
     */
    function getClaimableYield(uint256 investmentId) external view returns (uint256) {
        Investment memory investment = investments[investmentId];
        if (investment.status != InvestmentStatus.Active) return 0;
        
        uint256 fundId = investment.fundId;
        uint256 accumulatedYield = accumulatedYieldPerShare[fundId];
        
        uint256 yieldAmount = (investment.sharesOwned * accumulatedYield) / 1e18;
        uint256 claimable = yieldAmount - investment.totalYieldClaimed;
        
        return claimable;
    }
    
    /**
     * @notice Get current value of an investment
     */
    function getInvestmentValue(uint256 investmentId) external view returns (uint256) {
        Investment memory investment = investments[investmentId];
        if (investment.status != InvestmentStatus.Active) return 0;
        
        uint256 fundId = investment.fundId;
        Fund memory fund = funds[fundId];
        
        if (fund.totalShares == 0) return 0;
        
        return (investment.sharesOwned * fund.totalCapital) / fund.totalShares;
    }
}
