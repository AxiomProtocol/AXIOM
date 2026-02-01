// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LeaseAndRentEngine (KeyGrow)
 * @notice Complete rent-to-own system for Axiom Smart City
 * @dev Handles rent collection, escrow management, equity accumulation, and tenant incentives
 * 
 * Features:
 * - Rent-to-own programs with configurable equity percentages
 * - Multi-escrow system (payment, maintenance, vacancy, tenant booster)
 * - Referral rewards for tenant acquisition
 * - Integration with LandAndAssetRegistry
 * - Automated payment processing and equity tracking
 */
contract LeaseAndRentEngine is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant LEASE_MANAGER_ROLE = keccak256("LEASE_MANAGER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // External contract addresses
    address public landRegistry;
    address public axmToken;
    
    // Safe wallet addresses
    address public adminSafe;
    address public complianceSafe;
    
    // Global counters
    uint256 public totalLeases;
    uint256 public activeLeases;
    
    // Fee distribution percentages (basis points, 10000 = 100%)
    uint256 public maintenanceEscrowBps = 1000;  // 10% to maintenance
    uint256 public vacancyReserveBps = 500;      // 5% to vacancy reserve
    uint256 public tenantBoosterBps = 300;       // 3% to tenant incentives
    uint256 public treasuryBps = 200;            // 2% to treasury
    // Remainder goes to property owner
    
    // Rent-to-own parameters
    uint256 public defaultEquityPercentage = 2000; // 20% of rent builds equity toward purchase price
    
    // Referral rewards
    uint256 public referralRewardAmount = 100 * 10**18; // 100 AXM per successful referral
    
    // ============================================
    // STRUCTS
    // ============================================
    
    enum LeaseStatus { Active, Completed, Terminated, Default }
    
    /**
     * @notice Rent-to-own settlement modes
     * ESCROW_UPFRONT: Full purchase price escrowed upfront, rent unlocks equity
     * PROGRESSIVE: Each rent payment includes purchase portion that accumulates
     * BALLOON: Rent builds equity credits, final balloon payment required at threshold
     */
    enum SettlementMode { ESCROW_UPFRONT, PROGRESSIVE, BALLOON }
    
    struct Lease {
        uint256 leaseId;
        uint256 parcelId;                    // ID from LandAndAssetRegistry
        address tenant;
        address propertyOwner;
        uint256 monthlyRent;                 // In AXM tokens (rent portion only)
        uint256 leaseDuration;               // In months
        uint256 startDate;
        uint256 endDate;
        uint256 securityDeposit;
        uint256 purchasePrice;               // Total purchase price for rent-to-own
        uint256 purchasePortionPerMonth;     // Monthly purchase payment (PROGRESSIVE mode)
        uint256 purchaseRemainder;           // Remaining tokens to distribute (PROGRESSIVE mode)
        uint256 equityPercentage;            // Basis points of rent that builds equity credits
        uint256 accumulatedEquity;           // Equity credits earned (ESCROW/BALLOON) or funds paid (PROGRESSIVE)
        uint256 escrowedPurchaseFunds;       // Purchase funds held in escrow
        uint256 totalPaid;
        uint256 lastPaymentDate;
        uint256 missedPayments;
        LeaseStatus status;
        SettlementMode settlementMode;       // How purchase price is settled
        bool isRentToOwn;
        address referrer;                    // Who referred this tenant
    }
    
    struct EscrowBalance {
        uint256 maintenanceEscrow;
        uint256 vacancyReserve;
        uint256 tenantBooster;
        uint256 ownerBalance;
    }
    
    struct PaymentRecord {
        uint256 leaseId;
        uint256 amount;
        uint256 timestamp;
        uint256 equityEarned;
        address payer;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => Lease) public leases;
    mapping(address => uint256[]) public tenantLeases;
    mapping(address => uint256[]) public ownerProperties;
    mapping(uint256 => EscrowBalance) public escrowBalances; // Per parcel
    mapping(uint256 => PaymentRecord[]) public paymentHistory;
    mapping(address => uint256) public referralRewards; // Unclaimed referral rewards
    mapping(address => uint256) public tenantBoosterRewards; // Tenant incentive rewards
    mapping(address => uint256) public pendingLeaseDeposits; // Pre-deposited funds for leases
    
    // ============================================
    // EVENTS
    // ============================================
    
    event LeaseCreated(
        uint256 indexed leaseId,
        uint256 indexed parcelId,
        address indexed tenant,
        address propertyOwner,
        uint256 monthlyRent,
        bool isRentToOwn
    );
    
    event RentPaid(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 amount,
        uint256 equityEarned,
        uint256 timestamp
    );
    
    event EquityAccumulated(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 newEquity,
        uint256 totalEquity
    );
    
    event BalloonPaymentMade(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 amount
    );
    
    event OwnershipTransferred(
        uint256 indexed leaseId,
        uint256 indexed parcelId,
        address indexed newOwner,
        uint256 finalEquity
    );
    
    event LeaseTerminated(
        uint256 indexed leaseId,
        address indexed tenant,
        LeaseStatus finalStatus,
        uint256 refundedDeposit
    );
    
    event LeaseDepositReceived(
        address indexed depositor,
        uint256 amount
    );
    
    event LeaseDepositWithdrawn(
        address indexed recipient,
        uint256 amount
    );
    
    event MaintenanceWithdrawal(
        uint256 indexed parcelId,
        address indexed owner,
        uint256 amount
    );
    
    event ReferralRewardPaid(
        address indexed referrer,
        address indexed tenant,
        uint256 amount
    );
    
    event TenantBoosterAwarded(
        address indexed tenant,
        uint256 amount,
        string reason
    );
    
    event FeeDistributionUpdated(
        uint256 maintenanceBps,
        uint256 vacancyBps,
        uint256 tenantBoosterBps,
        uint256 treasuryBps
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _axmToken,
        address _adminSafe,
        address _complianceSafe
    ) {
        require(_axmToken != address(0), "Invalid AXM token");
        require(_adminSafe != address(0), "Invalid admin safe");
        require(_complianceSafe != address(0), "Invalid compliance safe");
        
        axmToken = _axmToken;
        adminSafe = _adminSafe;
        complianceSafe = _complianceSafe;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _adminSafe);
        _grantRole(ADMIN_ROLE, _adminSafe);
        _grantRole(TREASURY_ROLE, _complianceSafe);
        _grantRole(COMPLIANCE_ROLE, _complianceSafe);
        _grantRole(LEASE_MANAGER_ROLE, _adminSafe);
    }
    
    // ============================================
    // LEASE CREATION & MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a new lease agreement (called by tenant directly)
     * @param parcelId ID of the property from LandAndAssetRegistry
     * @param propertyOwner Address of the property owner
     * @param monthlyRent Monthly rent amount in AXM
     * @param leaseDuration Duration in months
     * @param securityDeposit Security deposit amount
     * @param purchasePrice Total purchase price (only for rent-to-own)
     * @param isRentToOwn Whether this is a rent-to-own lease
     * @param referrer Address of referrer (address(0) if none)
     * @dev SECURITY: Caller IS the tenant - transfers only from msg.sender
     */
    function createLease(
        uint256 parcelId,
        address propertyOwner,
        uint256 monthlyRent,
        uint256 leaseDuration,
        uint256 securityDeposit,
        uint256 purchasePrice,
        bool isRentToOwn,
        SettlementMode settlementMode,
        address referrer
    ) external whenNotPaused returns (uint256) {
        return _createLeaseInternal(
            parcelId, msg.sender, propertyOwner, monthlyRent, leaseDuration,
            securityDeposit, purchasePrice, isRentToOwn, settlementMode, referrer, true
        );
    }
    
    /**
     * @notice Create a lease on behalf of tenant (admin only)
     * @param parcelId ID of the property from LandAndAssetRegistry
     * @param tenant Address of the tenant (must have pre-deposited funds)
     * @param propertyOwner Address of the property owner
     * @param monthlyRent Monthly rent amount in AXM
     * @param leaseDuration Duration in months
     * @param securityDeposit Security deposit amount
     * @param purchasePrice Total purchase price (only for rent-to-own)
     * @param isRentToOwn Whether this is a rent-to-own lease
     * @param referrer Address of referrer (address(0) if none)
     * @dev SECURITY: Admin-only, uses tenant's pre-deposited funds, NO transferFrom from tenant
     */
    function createLeaseAsAdmin(
        uint256 parcelId,
        address tenant,
        address propertyOwner,
        uint256 monthlyRent,
        uint256 leaseDuration,
        uint256 securityDeposit,
        uint256 purchasePrice,
        bool isRentToOwn,
        SettlementMode settlementMode,
        address referrer
    ) external onlyRole(LEASE_MANAGER_ROLE) whenNotPaused returns (uint256) {
        return _createLeaseInternal(
            parcelId, tenant, propertyOwner, monthlyRent, leaseDuration,
            securityDeposit, purchasePrice, isRentToOwn, settlementMode, referrer, false
        );
    }
    
    /**
     * @dev Internal lease creation logic
     * @param isTenantCalling True if tenant is calling directly, false if admin is calling
     */
    function _createLeaseInternal(
        uint256 parcelId,
        address tenant,
        address propertyOwner,
        uint256 monthlyRent,
        uint256 leaseDuration,
        uint256 securityDeposit,
        uint256 purchasePrice,
        bool isRentToOwn,
        SettlementMode settlementMode,
        address referrer,
        bool isTenantCalling
    ) internal returns (uint256) {
        require(tenant != address(0), "Invalid tenant");
        require(propertyOwner != address(0), "Invalid owner");
        require(monthlyRent > 0, "Invalid rent");
        require(leaseDuration > 0, "Invalid duration");
        if (isRentToOwn) {
            require(purchasePrice > 0, "Purchase price required for rent-to-own");
        }
        
        totalLeases++;
        activeLeases++;
        uint256 leaseId = totalLeases;
        
        Lease storage lease = leases[leaseId];
        lease.leaseId = leaseId;
        lease.parcelId = parcelId;
        lease.tenant = tenant;
        lease.propertyOwner = propertyOwner;
        lease.monthlyRent = monthlyRent;
        lease.leaseDuration = leaseDuration;
        lease.startDate = block.timestamp;
        lease.endDate = block.timestamp + (leaseDuration * 30 days);
        lease.securityDeposit = securityDeposit;
        lease.purchasePrice = purchasePrice;
        lease.status = LeaseStatus.Active;
        lease.isRentToOwn = isRentToOwn;
        lease.settlementMode = settlementMode;
        lease.referrer = referrer;
        
        if (isRentToOwn) {
            lease.equityPercentage = defaultEquityPercentage;
            
            // Calculate purchase portion for PROGRESSIVE mode
            if (settlementMode == SettlementMode.PROGRESSIVE) {
                require(purchasePrice >= leaseDuration, "Purchase price too low for progressive mode");
                lease.purchasePortionPerMonth = purchasePrice / leaseDuration;
                lease.purchaseRemainder = purchasePrice % leaseDuration;
            }
        }
        
        tenantLeases[tenant].push(leaseId);
        ownerProperties[propertyOwner].push(leaseId);
        
        // Handle security deposit
        if (securityDeposit > 0) {
            if (isTenantCalling) {
                // Tenant calling - transfer from msg.sender (which IS the tenant)
                IERC20(axmToken).safeTransferFrom(msg.sender, address(this), securityDeposit);
            } else {
                // Admin calling - use tenant's pre-deposited funds only
                require(
                    pendingLeaseDeposits[tenant] >= securityDeposit,
                    "Tenant must deposit security first"
                );
                pendingLeaseDeposits[tenant] -= securityDeposit;
            }
        }
        
        // ESCROW_UPFRONT: Collect full purchase price upfront
        if (isRentToOwn && settlementMode == SettlementMode.ESCROW_UPFRONT) {
            if (isTenantCalling) {
                IERC20(axmToken).safeTransferFrom(msg.sender, address(this), purchasePrice);
            } else {
                require(
                    pendingLeaseDeposits[tenant] >= purchasePrice,
                    "Tenant must deposit purchase price first"
                );
                pendingLeaseDeposits[tenant] -= purchasePrice;
            }
            lease.escrowedPurchaseFunds = purchasePrice;
        }
        
        // Pay referral reward if applicable
        if (referrer != address(0) && referralRewardAmount > 0) {
            referralRewards[referrer] += referralRewardAmount;
        }
        
        emit LeaseCreated(leaseId, parcelId, tenant, propertyOwner, monthlyRent, isRentToOwn);
        
        return leaseId;
    }
    
    /**
     * @notice Deposit funds for a lease (called by tenant before admin creates lease)
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
     * @notice Pay monthly rent
     * @param leaseId The lease ID
     */
    function payRent(uint256 leaseId) external nonReentrant whenNotPaused {
        Lease storage lease = leases[leaseId];
        require(lease.status == LeaseStatus.Active, "Lease not active");
        require(msg.sender == lease.tenant, "Only tenant can pay");
        require(block.timestamp <= lease.endDate, "Lease expired");
        
        uint256 rentAmount = lease.monthlyRent;
        uint256 totalPayment = rentAmount;
        uint256 purchasePayment = 0;
        uint256 equityEarned = 0;
        
        // PROGRESSIVE mode: Collect rent + purchase portion (distribute remainder across early payments)
        if (lease.isRentToOwn && lease.settlementMode == SettlementMode.PROGRESSIVE) {
            purchasePayment = lease.purchasePortionPerMonth;
            
            // Distribute remainder across earliest installments (add 1 token per payment until exhausted)
            if (lease.purchaseRemainder > 0) {
                purchasePayment += 1;
                lease.purchaseRemainder -= 1;
            }
            
            totalPayment = rentAmount + purchasePayment;
        }
        
        // Transfer payment from tenant
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), totalPayment);
        
        // Distribute rent portion according to fee structure
        uint256 toMaintenance = (rentAmount * maintenanceEscrowBps) / 10000;
        uint256 toVacancy = (rentAmount * vacancyReserveBps) / 10000;
        uint256 toTenantBooster = (rentAmount * tenantBoosterBps) / 10000;
        uint256 toTreasury = (rentAmount * treasuryBps) / 10000;
        uint256 toOwner = rentAmount - toMaintenance - toVacancy - toTenantBooster - toTreasury;
        
        // Update escrow balances
        EscrowBalance storage escrow = escrowBalances[lease.parcelId];
        escrow.maintenanceEscrow += toMaintenance;
        escrow.vacancyReserve += toVacancy;
        escrow.tenantBooster += toTenantBooster;
        escrow.ownerBalance += toOwner;
        
        // Send treasury portion to compliance safe
        if (toTreasury > 0) {
            IERC20(axmToken).safeTransfer(complianceSafe, toTreasury);
        }
        
        // Handle rent-to-own settlement modes
        if (lease.isRentToOwn) {
            if (lease.settlementMode == SettlementMode.ESCROW_UPFRONT) {
                // Build equity credits toward 100% (capped at purchase price)
                equityEarned = (rentAmount * lease.equityPercentage) / 10000;
                
                // Cap equity at purchase price
                if (lease.accumulatedEquity + equityEarned > lease.purchasePrice) {
                    equityEarned = lease.purchasePrice - lease.accumulatedEquity;
                }
                
                lease.accumulatedEquity += equityEarned;
                
                // Check if 100% equity reached (purchase price already escrowed)
                if (lease.accumulatedEquity >= lease.purchasePrice) {
                    _transferOwnership(leaseId);
                }
                
            } else if (lease.settlementMode == SettlementMode.PROGRESSIVE) {
                // Escrow the purchase portion (already collected in totalPayment above)
                lease.escrowedPurchaseFunds += purchasePayment;
                equityEarned = purchasePayment;
                lease.accumulatedEquity += equityEarned;
                
                // Invariant: escrowedPurchaseFunds must equal accumulatedEquity in PROGRESSIVE mode
                assert(lease.escrowedPurchaseFunds == lease.accumulatedEquity);
                
                // Transfer ownership when full purchase price escrowed
                if (lease.escrowedPurchaseFunds >= lease.purchasePrice) {
                    _transferOwnership(leaseId);
                }
                
            } else if (lease.settlementMode == SettlementMode.BALLOON) {
                // Build equity credits (no purchase funds yet), capped at purchase price
                equityEarned = (rentAmount * lease.equityPercentage) / 10000;
                
                // Cap equity at purchase price
                if (lease.accumulatedEquity + equityEarned > lease.purchasePrice) {
                    equityEarned = lease.purchasePrice - lease.accumulatedEquity;
                }
                
                lease.accumulatedEquity += equityEarned;
                
                // Don't auto-transfer, tenant must call completePurchase() with balloon payment
            }
            
            emit EquityAccumulated(leaseId, lease.tenant, equityEarned, lease.accumulatedEquity);
        }
        
        // Update lease state
        lease.totalPaid += totalPayment;
        lease.lastPaymentDate = block.timestamp;
        
        // Record payment
        paymentHistory[leaseId].push(PaymentRecord({
            leaseId: leaseId,
            amount: totalPayment,
            timestamp: block.timestamp,
            equityEarned: equityEarned,
            payer: msg.sender
        }));
        
        emit RentPaid(leaseId, msg.sender, totalPayment, equityEarned, block.timestamp);
    }
    
    /**
     * @notice Transfer ownership and settle purchase price with property owner
     * @dev Handles different settlement modes appropriately:
     *      - ESCROW_UPFRONT: Full purchase price already escrowed, release to owner
     *      - PROGRESSIVE: Accumulated purchase payments escrowed, release to owner
     *      - BALLOON: Balloon payment escrowed (equity credits already compensated via rent)
     */
    function _transferOwnership(uint256 leaseId) internal {
        Lease storage lease = leases[leaseId];
        require(lease.isRentToOwn, "Not rent-to-own");
        
        // Validate funds based on settlement mode
        if (lease.settlementMode == SettlementMode.BALLOON) {
            // For balloon mode: escrowedPurchaseFunds = balloon payment
            // Owner already received equity credit value through rent
            uint256 expectedBalloon = lease.purchasePrice - lease.accumulatedEquity;
            require(lease.escrowedPurchaseFunds >= expectedBalloon, "Balloon payment insufficient");
        } else {
            // For ESCROW_UPFRONT and PROGRESSIVE: full purchase price must be escrowed
            require(lease.escrowedPurchaseFunds >= lease.purchasePrice, "Purchase price not fully funded");
        }
        
        lease.status = LeaseStatus.Completed;
        activeLeases--;
        
        // Release escrowed purchase funds to property owner
        IERC20(axmToken).safeTransfer(lease.propertyOwner, lease.escrowedPurchaseFunds);
        
        emit OwnershipTransferred(
            leaseId,
            lease.parcelId,
            lease.tenant,
            lease.escrowedPurchaseFunds
        );
        
        // Return security deposit to tenant
        if (lease.securityDeposit > 0) {
            IERC20(axmToken).safeTransfer(lease.tenant, lease.securityDeposit);
        }
    }
    
    /**
     * @notice Complete purchase with balloon payment (BALLOON mode only)
     * @param leaseId The lease ID
     * @dev Tenant pays remaining balance after equity credits. Property owner
     *      already received value of equity credits through past rent payments.
     *      If equity credits >= purchase price, ownership transfers with zero payment.
     */
    function completePurchase(uint256 leaseId) external nonReentrant whenNotPaused {
        Lease storage lease = leases[leaseId];
        require(lease.status == LeaseStatus.Active, "Lease not active");
        require(msg.sender == lease.tenant, "Only tenant can complete purchase");
        require(lease.isRentToOwn, "Not rent-to-own");
        require(lease.settlementMode == SettlementMode.BALLOON, "Only for balloon payment mode");
        
        // Calculate balloon payment (remaining balance after equity credits)
        // Equity credits represent value owner already received via rent
        uint256 balloonPayment = lease.purchasePrice > lease.accumulatedEquity 
            ? lease.purchasePrice - lease.accumulatedEquity 
            : 0;
        
        // Collect balloon payment if needed (may be zero if equity credits >= purchase price)
        if (balloonPayment > 0) {
            IERC20(axmToken).safeTransferFrom(msg.sender, address(this), balloonPayment);
            lease.escrowedPurchaseFunds = balloonPayment;
            emit BalloonPaymentMade(leaseId, msg.sender, balloonPayment);
        } else {
            // Equity credits fully cover purchase price, no payment needed
            lease.escrowedPurchaseFunds = 0;
        }
        
        // Transfer ownership
        _transferOwnership(leaseId);
    }
    
    /**
     * @notice Terminate a lease
     * @param leaseId The lease to terminate
     * @param refundDeposit Whether to refund security deposit
     */
    function terminateLease(
        uint256 leaseId,
        bool refundDeposit
    ) external onlyRole(LEASE_MANAGER_ROLE) {
        Lease storage lease = leases[leaseId];
        require(lease.status == LeaseStatus.Active, "Lease not active");
        
        lease.status = LeaseStatus.Terminated;
        activeLeases--;
        
        uint256 refundAmount = 0;
        if (refundDeposit && lease.securityDeposit > 0) {
            refundAmount = lease.securityDeposit;
            IERC20(axmToken).safeTransfer(lease.tenant, refundAmount);
        }
        
        emit LeaseTerminated(leaseId, lease.tenant, lease.status, refundAmount);
    }
    
    // ============================================
    // ESCROW MANAGEMENT
    // ============================================
    
    /**
     * @notice Withdraw maintenance escrow funds
     * @param parcelId The property parcel ID
     * @param amount Amount to withdraw
     */
    function withdrawMaintenanceEscrow(
        uint256 parcelId,
        uint256 amount
    ) external nonReentrant onlyRole(LEASE_MANAGER_ROLE) {
        EscrowBalance storage escrow = escrowBalances[parcelId];
        require(escrow.maintenanceEscrow >= amount, "Insufficient balance");
        
        escrow.maintenanceEscrow -= amount;
        IERC20(axmToken).safeTransfer(msg.sender, amount);
        
        emit MaintenanceWithdrawal(parcelId, msg.sender, amount);
    }
    
    /**
     * @notice Owner withdraws their accumulated rent
     * @param parcelId The property parcel ID
     * @param amount Amount to withdraw
     */
    function withdrawOwnerBalance(
        uint256 parcelId,
        uint256 amount
    ) external nonReentrant {
        EscrowBalance storage escrow = escrowBalances[parcelId];
        require(escrow.ownerBalance >= amount, "Insufficient balance");
        
        // Verify caller owns property with this parcel
        bool isOwner = false;
        uint256[] memory properties = ownerProperties[msg.sender];
        for (uint256 i = 0; i < properties.length; i++) {
            if (leases[properties[i]].parcelId == parcelId) {
                isOwner = true;
                break;
            }
        }
        require(isOwner, "Not property owner");
        
        escrow.ownerBalance -= amount;
        IERC20(axmToken).safeTransfer(msg.sender, amount);
    }
    
    // ============================================
    // REWARDS & INCENTIVES
    // ============================================
    
    /**
     * @notice Claim referral rewards
     */
    function claimReferralRewards() external nonReentrant {
        uint256 amount = referralRewards[msg.sender];
        require(amount > 0, "No rewards");
        
        referralRewards[msg.sender] = 0;
        IERC20(axmToken).safeTransfer(msg.sender, amount);
        
        emit ReferralRewardPaid(msg.sender, address(0), amount);
    }
    
    /**
     * @notice Award tenant booster incentives
     * @param parcelId The parcel ID whose escrow will fund the reward
     * @param tenant Tenant to reward
     * @param amount Reward amount
     * @param reason Reason for reward
     */
    function awardTenantBooster(
        uint256 parcelId,
        address tenant,
        uint256 amount,
        string calldata reason
    ) external onlyRole(LEASE_MANAGER_ROLE) {
        EscrowBalance storage escrow = escrowBalances[parcelId];
        require(escrow.tenantBooster >= amount, "Insufficient tenant booster escrow");
        
        escrow.tenantBooster -= amount;
        tenantBoosterRewards[tenant] += amount;
        
        emit TenantBoosterAwarded(tenant, amount, reason);
    }
    
    /**
     * @notice Claim tenant booster rewards
     */
    function claimTenantBooster() external nonReentrant {
        uint256 amount = tenantBoosterRewards[msg.sender];
        require(amount > 0, "No rewards");
        
        tenantBoosterRewards[msg.sender] = 0;
        IERC20(axmToken).safeTransfer(msg.sender, amount);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update fee distribution percentages
     */
    function updateFeeDistribution(
        uint256 _maintenanceBps,
        uint256 _vacancyBps,
        uint256 _tenantBoosterBps,
        uint256 _treasuryBps
    ) external onlyRole(ADMIN_ROLE) {
        require(
            _maintenanceBps + _vacancyBps + _tenantBoosterBps + _treasuryBps < 10000,
            "Total fees >= 100%"
        );
        
        maintenanceEscrowBps = _maintenanceBps;
        vacancyReserveBps = _vacancyBps;
        tenantBoosterBps = _tenantBoosterBps;
        treasuryBps = _treasuryBps;
        
        emit FeeDistributionUpdated(
            _maintenanceBps,
            _vacancyBps,
            _tenantBoosterBps,
            _treasuryBps
        );
    }
    
    /**
     * @notice Update default equity percentage for new rent-to-own leases
     */
    function updateDefaultEquityPercentage(
        uint256 _equityPercentage
    ) external onlyRole(ADMIN_ROLE) {
        require(_equityPercentage <= 10000, "Invalid equity %");
        
        defaultEquityPercentage = _equityPercentage;
    }
    
    /**
     * @notice Update referral reward amount
     */
    function updateReferralReward(uint256 _amount) external onlyRole(ADMIN_ROLE) {
        referralRewardAmount = _amount;
    }
    
    /**
     * @notice Set land registry address
     */
    function setLandRegistry(address _landRegistry) external onlyRole(ADMIN_ROLE) {
        require(_landRegistry != address(0), "Invalid address");
        landRegistry = _landRegistry;
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
     * @notice Get lease details
     */
    function getLease(uint256 leaseId) external view returns (Lease memory) {
        return leases[leaseId];
    }
    
    /**
     * @notice Get all leases for a tenant
     */
    function getTenantLeases(address tenant) external view returns (uint256[] memory) {
        return tenantLeases[tenant];
    }
    
    /**
     * @notice Get all properties for an owner
     */
    function getOwnerProperties(address owner) external view returns (uint256[] memory) {
        return ownerProperties[owner];
    }
    
    /**
     * @notice Get escrow balances for a parcel
     */
    function getEscrowBalance(uint256 parcelId) external view returns (EscrowBalance memory) {
        return escrowBalances[parcelId];
    }
    
    /**
     * @notice Get payment history for a lease
     */
    function getPaymentHistory(uint256 leaseId) external view returns (PaymentRecord[] memory) {
        return paymentHistory[leaseId];
    }
    
    /**
     * @notice Calculate equity percentage achieved toward purchase price
     */
    function getEquityPercentage(uint256 leaseId) external view returns (uint256) {
        Lease memory lease = leases[leaseId];
        if (!lease.isRentToOwn || lease.purchasePrice == 0) return 0;
        
        return (lease.accumulatedEquity * 10000) / lease.purchasePrice;
    }
    
    /**
     * @notice Get balloon payment details for BALLOON mode leases
     * @return balloonAmount The remaining balance to be paid
     * @return canComplete Whether tenant can complete purchase now
     */
    function getBalloonPaymentInfo(uint256 leaseId) external view returns (
        uint256 balloonAmount,
        bool canComplete
    ) {
        Lease memory lease = leases[leaseId];
        
        if (!lease.isRentToOwn || lease.settlementMode != SettlementMode.BALLOON) {
            return (0, false);
        }
        
        if (lease.status != LeaseStatus.Active) {
            return (0, false);
        }
        
        balloonAmount = lease.purchasePrice > lease.accumulatedEquity 
            ? lease.purchasePrice - lease.accumulatedEquity 
            : 0;
        
        // Can complete if there's a positive balloon payment needed
        canComplete = balloonAmount > 0;
        
        return (balloonAmount, canComplete);
    }
}
