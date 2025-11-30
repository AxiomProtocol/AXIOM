// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title UtilityAndMeteringHub
 * @notice Smart city utility management and metering system for Axiom Smart City
 * @dev Manages electricity, water, gas, internet, and waste services with IoT integration
 * 
 * Features:
 * - Multi-utility service management (electricity, water, gas, internet, waste)
 * - IoT meter integration for automated usage tracking
 * - Tiered pricing based on consumption levels
 * - Automated billing and payment processing
 * - Subsidies and credits for low-income residents
 * - Service deposit and activation management
 * - Usage analytics and reporting
 */
contract UtilityAndMeteringHub is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant METER_ORACLE_ROLE = keccak256("METER_ORACLE_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // External contracts
    address public axmToken;
    address public identityHub;
    address public treasurySafe;
    
    // Global counters
    uint256 public totalAccounts;
    uint256 public totalMeters;
    uint256 public totalBills;
    
    // Billing periods (in seconds)
    uint256 public billingPeriod = 30 days;
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum UtilityType { Electricity, Water, Gas, Internet, Waste }
    enum AccountStatus { Inactive, Active, Suspended, Disconnected }
    enum BillStatus { Pending, Paid, Overdue, Cancelled }
    enum MeterStatus { Active, Inactive, Maintenance, Faulty }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct UtilityAccount {
        uint256 accountId;
        address customer;
        uint256 parcelId;              // Property parcel ID
        UtilityType utilityType;
        uint256 meterId;
        uint256 depositAmount;         // Security deposit
        uint256 activationDate;
        uint256 lastBillingDate;
        uint256 totalConsumption;      // Lifetime consumption
        uint256 totalPaid;
        AccountStatus status;
    }
    
    struct Meter {
        uint256 meterId;
        uint256 accountId;
        string deviceId;               // IoT device identifier
        UtilityType utilityType;
        uint256 lastReading;
        uint256 lastReadingTimestamp;
        uint256 totalReadings;
        MeterStatus status;
    }
    
    struct Bill {
        uint256 billId;
        uint256 accountId;
        UtilityType utilityType;
        uint256 billingPeriodStart;
        uint256 billingPeriodEnd;
        uint256 consumptionAmount;     // kWh, gallons, therms, GB, lbs
        uint256 baseCharge;
        uint256 usageCharge;
        uint256 subsidyAmount;         // Credits applied
        uint256 totalAmount;           // Net amount due
        uint256 dueDate;
        uint256 paymentDate;
        BillStatus status;
    }
    
    struct PricingTier {
        uint256 maxUsage;              // Upper limit for this tier (0 = unlimited)
        uint256 ratePerUnit;           // Price per unit in AXM (scaled by 1e18)
    }
    
    struct MeterReading {
        uint256 meterId;
        uint256 reading;
        uint256 timestamp;
        address oracle;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => UtilityAccount) public accounts;
    mapping(address => uint256[]) public customerAccounts;
    mapping(uint256 => Meter) public meters;
    mapping(uint256 => Bill) public bills;
    mapping(uint256 => uint256[]) public accountBills;       // accountId => bill IDs
    mapping(UtilityType => PricingTier[]) public pricingTiers;
    mapping(UtilityType => uint256) public baseCharges;      // Monthly base charge
    mapping(UtilityType => uint256) public depositRequirements;
    mapping(uint256 => MeterReading[]) public meterHistory;  // meterId => readings
    mapping(address => uint256) public subsidyBalances;      // Customer => subsidy credits
    
    // ============================================
    // EVENTS
    // ============================================
    
    event AccountCreated(
        uint256 indexed accountId,
        address indexed customer,
        UtilityType utilityType,
        uint256 depositAmount
    );
    
    event AccountStatusChanged(
        uint256 indexed accountId,
        AccountStatus oldStatus,
        AccountStatus newStatus
    );
    
    event MeterRegistered(
        uint256 indexed meterId,
        uint256 indexed accountId,
        string deviceId,
        UtilityType utilityType
    );
    
    event MeterReadingRecorded(
        uint256 indexed meterId,
        uint256 reading,
        uint256 timestamp
    );
    
    event BillGenerated(
        uint256 indexed billId,
        uint256 indexed accountId,
        uint256 consumptionAmount,
        uint256 totalAmount
    );
    
    event BillPaid(
        uint256 indexed billId,
        address indexed customer,
        uint256 amount
    );
    
    event SubsidyAdded(
        address indexed customer,
        uint256 amount
    );
    
    event DepositRefunded(
        uint256 indexed accountId,
        address customer,
        uint256 amount
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _axmToken,
        address _identityHub,
        address _treasurySafe
    ) {
        require(_axmToken != address(0), "Invalid AXM token");
        require(_treasurySafe != address(0), "Invalid treasury safe");
        
        axmToken = _axmToken;
        identityHub = _identityHub;
        treasurySafe = _treasurySafe;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Initialize default pricing tiers (example values)
        _initializeDefaultPricing();
    }
    
    function _initializeDefaultPricing() private {
        // Electricity: $0.12/kWh base, $0.15/kWh tier 2, $0.20/kWh tier 3
        pricingTiers[UtilityType.Electricity].push(PricingTier(500, 0.12 ether));
        pricingTiers[UtilityType.Electricity].push(PricingTier(1000, 0.15 ether));
        pricingTiers[UtilityType.Electricity].push(PricingTier(0, 0.20 ether));
        baseCharges[UtilityType.Electricity] = 10 ether;
        depositRequirements[UtilityType.Electricity] = 100 ether;
        
        // Water: $0.005/gallon base, $0.008/gallon tier 2
        pricingTiers[UtilityType.Water].push(PricingTier(5000, 0.005 ether));
        pricingTiers[UtilityType.Water].push(PricingTier(0, 0.008 ether));
        baseCharges[UtilityType.Water] = 15 ether;
        depositRequirements[UtilityType.Water] = 75 ether;
        
        // Gas: $0.80/therm
        pricingTiers[UtilityType.Gas].push(PricingTier(0, 0.80 ether));
        baseCharges[UtilityType.Gas] = 12 ether;
        depositRequirements[UtilityType.Gas] = 80 ether;
        
        // Internet: $60/month flat
        pricingTiers[UtilityType.Internet].push(PricingTier(0, 0));
        baseCharges[UtilityType.Internet] = 60 ether;
        depositRequirements[UtilityType.Internet] = 100 ether;
        
        // Waste: $0.10/lb
        pricingTiers[UtilityType.Waste].push(PricingTier(0, 0.10 ether));
        baseCharges[UtilityType.Waste] = 20 ether;
        depositRequirements[UtilityType.Waste] = 50 ether;
    }
    
    // ============================================
    // ACCOUNT MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a new utility account
     * @param parcelId Property parcel ID
     * @param utilityType Type of utility service
     * @return accountId New account ID
     */
    function createAccount(
        uint256 parcelId,
        UtilityType utilityType
    ) external nonReentrant whenNotPaused returns (uint256) {
        uint256 depositAmount = depositRequirements[utilityType];
        
        // Transfer deposit
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), depositAmount);
        
        // Create account
        totalAccounts++;
        uint256 accountId = totalAccounts;
        
        UtilityAccount storage account = accounts[accountId];
        account.accountId = accountId;
        account.customer = msg.sender;
        account.parcelId = parcelId;
        account.utilityType = utilityType;
        account.depositAmount = depositAmount;
        account.activationDate = block.timestamp;
        account.lastBillingDate = block.timestamp;
        account.status = AccountStatus.Active;
        
        customerAccounts[msg.sender].push(accountId);
        
        emit AccountCreated(accountId, msg.sender, utilityType, depositAmount);
        
        return accountId;
    }
    
    /**
     * @notice Update account status
     */
    function updateAccountStatus(
        uint256 accountId,
        AccountStatus newStatus
    ) external onlyRole(OPERATOR_ROLE) {
        UtilityAccount storage account = accounts[accountId];
        AccountStatus oldStatus = account.status;
        account.status = newStatus;
        
        emit AccountStatusChanged(accountId, oldStatus, newStatus);
    }
    
    /**
     * @notice Close account and refund deposit
     */
    function closeAccount(uint256 accountId) external nonReentrant {
        UtilityAccount storage account = accounts[accountId];
        require(msg.sender == account.customer || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        require(account.status != AccountStatus.Disconnected, "Already closed");
        
        // Check for outstanding bills
        uint256[] memory billIds = accountBills[accountId];
        for (uint256 i = 0; i < billIds.length; i++) {
            require(bills[billIds[i]].status == BillStatus.Paid || 
                    bills[billIds[i]].status == BillStatus.Cancelled, "Outstanding bills");
        }
        
        // Refund deposit
        uint256 refundAmount = account.depositAmount;
        account.status = AccountStatus.Disconnected;
        account.depositAmount = 0;
        
        IERC20(axmToken).safeTransfer(account.customer, refundAmount);
        
        emit DepositRefunded(accountId, account.customer, refundAmount);
    }
    
    // ============================================
    // METER MANAGEMENT
    // ============================================
    
    /**
     * @notice Register a new meter for an account
     */
    function registerMeter(
        uint256 accountId,
        string calldata deviceId
    ) external onlyRole(OPERATOR_ROLE) returns (uint256) {
        UtilityAccount storage account = accounts[accountId];
        require(account.accountId > 0, "Account not found");
        require(account.meterId == 0, "Meter already registered");
        
        totalMeters++;
        uint256 meterId = totalMeters;
        
        Meter storage meter = meters[meterId];
        meter.meterId = meterId;
        meter.accountId = accountId;
        meter.deviceId = deviceId;
        meter.utilityType = account.utilityType;
        meter.status = MeterStatus.Active;
        
        account.meterId = meterId;
        
        emit MeterRegistered(meterId, accountId, deviceId, account.utilityType);
        
        return meterId;
    }
    
    /**
     * @notice Record a meter reading (called by IoT oracles)
     * @dev Enforces monotonic readings to prevent tampering
     */
    function recordMeterReading(
        uint256 meterId,
        uint256 reading
    ) external onlyRole(METER_ORACLE_ROLE) {
        Meter storage meter = meters[meterId];
        require(meter.status == MeterStatus.Active, "Meter not active");
        require(reading >= meter.lastReading, "Reading must be monotonic");
        
        meter.lastReading = reading;
        meter.lastReadingTimestamp = block.timestamp;
        meter.totalReadings++;
        
        // Store reading history
        meterHistory[meterId].push(MeterReading({
            meterId: meterId,
            reading: reading,
            timestamp: block.timestamp,
            oracle: msg.sender
        }));
        
        emit MeterReadingRecorded(meterId, reading, block.timestamp);
    }
    
    /**
     * @notice Reset meter baseline (for meter replacement/recalibration)
     * @dev Operator-only function for legitimate meter swaps
     */
    function resetMeterBaseline(
        uint256 meterId,
        uint256 newBaseline
    ) external onlyRole(OPERATOR_ROLE) {
        Meter storage meter = meters[meterId];
        require(meter.meterId > 0, "Meter not found");
        
        meter.lastReading = newBaseline;
        meter.lastReadingTimestamp = block.timestamp;
        
        // Store reset in history for auditability
        meterHistory[meterId].push(MeterReading({
            meterId: meterId,
            reading: newBaseline,
            timestamp: block.timestamp,
            oracle: msg.sender
        }));
    }
    
    /**
     * @notice Update meter status
     */
    function updateMeterStatus(
        uint256 meterId,
        MeterStatus newStatus
    ) external onlyRole(OPERATOR_ROLE) {
        meters[meterId].status = newStatus;
    }
    
    // ============================================
    // BILLING AND PAYMENTS
    // ============================================
    
    /**
     * @notice Generate a bill for an account
     * @dev Called by operators at end of billing period
     */
    function generateBill(uint256 accountId) external nonReentrant onlyRole(OPERATOR_ROLE) returns (uint256) {
        UtilityAccount storage account = accounts[accountId];
        require(account.status == AccountStatus.Active, "Account not active");
        require(block.timestamp >= account.lastBillingDate + billingPeriod, "Billing period not elapsed");
        
        Meter storage meter = meters[account.meterId];
        require(meter.meterId > 0, "No meter registered");
        
        // Calculate consumption for this period
        uint256 currentReading = meter.lastReading;
        MeterReading[] storage history = meterHistory[account.meterId];
        uint256 previousReading = 0;
        
        if (history.length > 1) {
            previousReading = history[history.length - 2].reading;
        }
        
        uint256 consumption = currentReading > previousReading ? currentReading - previousReading : 0;
        
        // Calculate charges
        uint256 baseCharge = baseCharges[account.utilityType];
        uint256 usageCharge = _calculateUsageCharge(account.utilityType, consumption);
        
        // Apply subsidies
        uint256 subsidyAmount = 0;
        uint256 totalBeforeSubsidy = baseCharge + usageCharge;
        
        if (subsidyBalances[account.customer] > 0) {
            subsidyAmount = subsidyBalances[account.customer] >= totalBeforeSubsidy 
                ? totalBeforeSubsidy 
                : subsidyBalances[account.customer];
            subsidyBalances[account.customer] -= subsidyAmount;
        }
        
        uint256 totalAmount = totalBeforeSubsidy - subsidyAmount;
        
        // Create bill
        totalBills++;
        uint256 billId = totalBills;
        
        Bill storage bill = bills[billId];
        bill.billId = billId;
        bill.accountId = accountId;
        bill.utilityType = account.utilityType;
        bill.billingPeriodStart = account.lastBillingDate;
        bill.billingPeriodEnd = block.timestamp;
        bill.consumptionAmount = consumption;
        bill.baseCharge = baseCharge;
        bill.usageCharge = usageCharge;
        bill.subsidyAmount = subsidyAmount;
        bill.totalAmount = totalAmount;
        bill.dueDate = block.timestamp + 15 days;
        bill.status = BillStatus.Pending;
        
        accountBills[accountId].push(billId);
        
        // Update account
        account.lastBillingDate = block.timestamp;
        account.totalConsumption += consumption;
        
        emit BillGenerated(billId, accountId, consumption, totalAmount);
        
        return billId;
    }
    
    /**
     * @notice Calculate usage charge based on tiered pricing
     * @dev Uses cumulative thresholds to bill each tier correctly
     */
    function _calculateUsageCharge(
        UtilityType utilityType,
        uint256 consumption
    ) private view returns (uint256) {
        PricingTier[] storage tiers = pricingTiers[utilityType];
        uint256 totalCharge = 0;
        uint256 remainingConsumption = consumption;
        uint256 previousThreshold = 0;
        
        for (uint256 i = 0; i < tiers.length; i++) {
            if (remainingConsumption == 0) break;
            
            uint256 tierMax = tiers[i].maxUsage;
            uint256 tierRate = tiers[i].ratePerUnit;
            
            // Calculate tier width
            uint256 tierWidth;
            if (tierMax == 0) {
                // Unlimited tier - consumes all remaining
                tierWidth = remainingConsumption;
            } else {
                // Tier width is difference from previous threshold
                tierWidth = tierMax - previousThreshold;
            }
            
            // Bill the minimum of remaining consumption or tier width
            uint256 unitsInTier = remainingConsumption < tierWidth ? remainingConsumption : tierWidth;
            totalCharge += unitsInTier * tierRate / 1e18;
            
            remainingConsumption -= unitsInTier;
            
            // Update threshold for next tier (if not unlimited)
            if (tierMax > 0) {
                previousThreshold = tierMax;
            }
        }
        
        return totalCharge;
    }
    
    /**
     * @notice Pay a bill
     */
    function payBill(uint256 billId) external nonReentrant whenNotPaused {
        Bill storage bill = bills[billId];
        require(bill.status == BillStatus.Pending || bill.status == BillStatus.Overdue, "Bill not payable");
        
        UtilityAccount storage account = accounts[bill.accountId];
        require(msg.sender == account.customer, "Not account owner");
        
        // Transfer payment
        IERC20(axmToken).safeTransferFrom(msg.sender, treasurySafe, bill.totalAmount);
        
        // Update bill
        bill.status = BillStatus.Paid;
        bill.paymentDate = block.timestamp;
        
        // Update account
        account.totalPaid += bill.totalAmount;
        
        emit BillPaid(billId, msg.sender, bill.totalAmount);
    }
    
    /**
     * @notice Mark bills as overdue (called by operator)
     */
    function markBillOverdue(uint256 billId) external onlyRole(OPERATOR_ROLE) {
        Bill storage bill = bills[billId];
        require(bill.status == BillStatus.Pending, "Not pending");
        require(block.timestamp > bill.dueDate, "Not past due");
        
        bill.status = BillStatus.Overdue;
    }
    
    // ============================================
    // SUBSIDY MANAGEMENT
    // ============================================
    
    /**
     * @notice Add subsidy credits to customer account
     */
    function addSubsidy(
        address customer,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        subsidyBalances[customer] += amount;
        
        emit SubsidyAdded(customer, amount);
    }
    
    /**
     * @notice Batch add subsidies
     */
    function batchAddSubsidies(
        address[] calldata customers,
        uint256[] calldata amounts
    ) external onlyRole(ADMIN_ROLE) {
        require(customers.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < customers.length; i++) {
            subsidyBalances[customers[i]] += amounts[i];
            emit SubsidyAdded(customers[i], amounts[i]);
        }
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update pricing tier
     */
    function updatePricingTier(
        UtilityType utilityType,
        uint256 tierIndex,
        uint256 maxUsage,
        uint256 ratePerUnit
    ) external onlyRole(ADMIN_ROLE) {
        require(tierIndex < pricingTiers[utilityType].length, "Invalid tier");
        
        pricingTiers[utilityType][tierIndex] = PricingTier(maxUsage, ratePerUnit);
    }
    
    /**
     * @notice Update base charge
     */
    function updateBaseCharge(
        UtilityType utilityType,
        uint256 newBaseCharge
    ) external onlyRole(ADMIN_ROLE) {
        baseCharges[utilityType] = newBaseCharge;
    }
    
    /**
     * @notice Update deposit requirement
     */
    function updateDepositRequirement(
        UtilityType utilityType,
        uint256 newDeposit
    ) external onlyRole(ADMIN_ROLE) {
        depositRequirements[utilityType] = newDeposit;
    }
    
    /**
     * @notice Update billing period
     */
    function updateBillingPeriod(uint256 newPeriod) external onlyRole(ADMIN_ROLE) {
        require(newPeriod >= 1 days, "Period too short");
        billingPeriod = newPeriod;
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
    
    function getAccount(uint256 accountId) external view returns (UtilityAccount memory) {
        return accounts[accountId];
    }
    
    function getMeter(uint256 meterId) external view returns (Meter memory) {
        return meters[meterId];
    }
    
    function getBill(uint256 billId) external view returns (Bill memory) {
        return bills[billId];
    }
    
    function getCustomerAccounts(address customer) external view returns (uint256[] memory) {
        return customerAccounts[customer];
    }
    
    function getAccountBills(uint256 accountId) external view returns (uint256[] memory) {
        return accountBills[accountId];
    }
    
    function getMeterHistory(uint256 meterId) external view returns (MeterReading[] memory) {
        return meterHistory[meterId];
    }
    
    function getPricingTiers(UtilityType utilityType) external view returns (PricingTier[] memory) {
        return pricingTiers[utilityType];
    }
    
    function getSubsidyBalance(address customer) external view returns (uint256) {
        return subsidyBalances[customer];
    }
}
