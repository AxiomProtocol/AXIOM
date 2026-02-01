// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RealtorModule
 * @notice Real estate transaction and realtor service management for Axiom Smart City
 * @dev Manages property listings, realtor commissions, and transaction facilitation
 * 
 * Features:
 * - Realtor registration and verification
 * - Property listing management
 * - Commission tracking and automated payments
 * - Buyer-seller matching
 * - Transaction escrow services
 * - Referral rewards for successful transactions
 */
contract RealtorModule is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // External contracts
    address public axmToken;
    address public landRegistry;
    address public identityHub;
    
    // Safe wallets
    address public adminSafe;
    address public treasurySafe;
    
    // Global counters
    uint256 public totalRealtors;
    uint256 public totalListings;
    uint256 public totalTransactions;
    
    // Commission rates (basis points, 10000 = 100%)
    uint256 public defaultCommissionBps = 300;      // 3% default commission
    uint256 public platformFeeBps = 50;             // 0.5% platform fee
    
    // Minimum listing price
    uint256 public minimumListingPrice = 1000 * 10**18;  // 1000 AXM
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum RealtorStatus { Pending, Active, Suspended, Revoked }
    enum ListingStatus { Active, Pending, Sold, Cancelled, Expired }
    enum TransactionStatus { Pending, Escrowed, Completed, Cancelled }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Realtor {
        uint256 realtorId;
        address realtorAddress;
        string name;
        string licenseNumber;
        string metadata;                   // IPFS hash with credentials, bio, etc.
        uint256 registrationDate;
        uint256 totalSales;
        uint256 totalCommissionEarned;
        uint256 successfulTransactions;
        RealtorStatus status;
    }
    
    struct PropertyListing {
        uint256 listingId;
        uint256 parcelId;                  // From LandAndAssetRegistry
        address seller;
        uint256 realtorId;
        uint256 price;                     // In AXM tokens
        uint256 commissionBps;             // Commission rate for this listing
        string metadata;                   // IPFS hash with photos, description, etc.
        uint256 listedDate;
        uint256 expirationDate;
        uint256 activeTransactionId;       // Active transaction ID (0 if none)
        ListingStatus status;
    }
    
    struct Transaction {
        uint256 transactionId;
        uint256 listingId;
        address buyer;
        address seller;
        uint256 realtorId;
        uint256 price;
        uint256 commission;
        uint256 platformFee;
        uint256 escrowAmount;
        uint256 transactionDate;
        uint256 completionDate;
        TransactionStatus status;
    }
    
    struct CommissionPayment {
        uint256 realtorId;
        uint256 transactionId;
        uint256 amount;
        uint256 timestamp;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => Realtor) public realtors;
    mapping(address => uint256) public addressToRealtorId;
    mapping(uint256 => PropertyListing) public listings;
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => uint256[]) public realtorListings;    // realtorId => listing IDs
    mapping(uint256 => uint256[]) public realtorTransactions; // realtorId => transaction IDs
    mapping(address => uint256[]) public buyerTransactions;
    mapping(address => uint256[]) public sellerTransactions;
    mapping(uint256 => CommissionPayment[]) public commissionHistory;
    mapping(address => uint256) public pendingCommissions;    // Realtor => pending withdrawals
    
    // ============================================
    // EVENTS
    // ============================================
    
    event RealtorRegistered(
        uint256 indexed realtorId,
        address indexed realtorAddress,
        string name,
        string licenseNumber
    );
    
    event RealtorStatusChanged(
        uint256 indexed realtorId,
        RealtorStatus oldStatus,
        RealtorStatus newStatus
    );
    
    event PropertyListed(
        uint256 indexed listingId,
        uint256 indexed parcelId,
        address indexed seller,
        uint256 realtorId,
        uint256 price
    );
    
    event ListingStatusChanged(
        uint256 indexed listingId,
        ListingStatus oldStatus,
        ListingStatus newStatus
    );
    
    event TransactionCreated(
        uint256 indexed transactionId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 price
    );
    
    event TransactionCompleted(
        uint256 indexed transactionId,
        address buyer,
        address seller,
        uint256 price,
        uint256 commission
    );
    
    event CommissionPaid(
        uint256 indexed realtorId,
        uint256 indexed transactionId,
        uint256 amount
    );
    
    event CommissionWithdrawn(
        address indexed realtor,
        uint256 amount
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _axmToken,
        address _landRegistry,
        address _adminSafe,
        address _treasurySafe
    ) {
        require(_axmToken != address(0), "Invalid AXM token");
        require(_landRegistry != address(0), "Invalid land registry");
        require(_adminSafe != address(0), "Invalid admin safe");
        require(_treasurySafe != address(0), "Invalid treasury safe");
        
        axmToken = _axmToken;
        landRegistry = _landRegistry;
        adminSafe = _adminSafe;
        treasurySafe = _treasurySafe;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _adminSafe);
        _grantRole(ADMIN_ROLE, _adminSafe);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============================================
    // REALTOR MANAGEMENT
    // ============================================
    
    /**
     * @notice Register as a realtor
     * @param name Realtor name
     * @param licenseNumber Real estate license number
     * @param metadata IPFS hash with credentials and bio
     */
    function registerRealtor(
        string calldata name,
        string calldata licenseNumber,
        string calldata metadata
    ) external whenNotPaused returns (uint256) {
        require(addressToRealtorId[msg.sender] == 0, "Already registered");
        require(bytes(name).length > 0, "Invalid name");
        require(bytes(licenseNumber).length > 0, "Invalid license");
        
        totalRealtors++;
        uint256 realtorId = totalRealtors;
        
        Realtor storage realtor = realtors[realtorId];
        realtor.realtorId = realtorId;
        realtor.realtorAddress = msg.sender;
        realtor.name = name;
        realtor.licenseNumber = licenseNumber;
        realtor.metadata = metadata;
        realtor.registrationDate = block.timestamp;
        realtor.status = RealtorStatus.Pending;
        
        addressToRealtorId[msg.sender] = realtorId;
        
        emit RealtorRegistered(realtorId, msg.sender, name, licenseNumber);
        
        return realtorId;
    }
    
    /**
     * @notice Verify a realtor
     * @param realtorId Realtor to verify
     */
    function verifyRealtor(uint256 realtorId) external onlyRole(VERIFIER_ROLE) {
        Realtor storage realtor = realtors[realtorId];
        require(realtor.status == RealtorStatus.Pending, "Not pending");
        
        RealtorStatus oldStatus = realtor.status;
        realtor.status = RealtorStatus.Active;
        
        emit RealtorStatusChanged(realtorId, oldStatus, RealtorStatus.Active);
    }
    
    /**
     * @notice Update realtor status
     * @param realtorId Realtor to update
     * @param newStatus New status
     */
    function updateRealtorStatus(
        uint256 realtorId,
        RealtorStatus newStatus
    ) external onlyRole(ADMIN_ROLE) {
        Realtor storage realtor = realtors[realtorId];
        RealtorStatus oldStatus = realtor.status;
        realtor.status = newStatus;
        
        emit RealtorStatusChanged(realtorId, oldStatus, newStatus);
    }
    
    // ============================================
    // PROPERTY LISTING MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a property listing
     * @param parcelId Property parcel ID from LandAndAssetRegistry
     * @param price Listing price in AXM
     * @param commissionBps Commission rate in basis points
     * @param metadata IPFS hash with property details
     * @param durationDays Listing duration in days
     */
    function createListing(
        uint256 parcelId,
        uint256 price,
        uint256 commissionBps,
        string calldata metadata,
        uint256 durationDays
    ) external nonReentrant whenNotPaused returns (uint256) {
        uint256 realtorId = addressToRealtorId[msg.sender];
        require(realtorId > 0, "Not a registered realtor");
        require(realtors[realtorId].status == RealtorStatus.Active, "Realtor not active");
        require(price >= minimumListingPrice, "Below minimum price");
        require(commissionBps <= 1000, "Commission too high"); // Max 10%
        require(durationDays > 0 && durationDays <= 365, "Invalid duration");
        
        totalListings++;
        uint256 listingId = totalListings;
        
        PropertyListing storage listing = listings[listingId];
        listing.listingId = listingId;
        listing.parcelId = parcelId;
        listing.seller = msg.sender;
        listing.realtorId = realtorId;
        listing.price = price;
        listing.commissionBps = commissionBps;
        listing.metadata = metadata;
        listing.listedDate = block.timestamp;
        listing.expirationDate = block.timestamp + (durationDays * 1 days);
        listing.status = ListingStatus.Active;
        
        realtorListings[realtorId].push(listingId);
        
        emit PropertyListed(listingId, parcelId, msg.sender, realtorId, price);
        
        return listingId;
    }
    
    /**
     * @notice Create a listing on behalf of a seller
     * @param parcelId Property parcel ID
     * @param seller Property seller
     * @param price Listing price
     * @param commissionBps Commission rate
     * @param metadata Property metadata
     * @param durationDays Listing duration
     */
    function createListingForSeller(
        uint256 parcelId,
        address seller,
        uint256 price,
        uint256 commissionBps,
        string calldata metadata,
        uint256 durationDays
    ) external nonReentrant whenNotPaused returns (uint256) {
        uint256 realtorId = addressToRealtorId[msg.sender];
        require(realtorId > 0, "Not a registered realtor");
        require(realtors[realtorId].status == RealtorStatus.Active, "Realtor not active");
        require(seller != address(0), "Invalid seller");
        require(price >= minimumListingPrice, "Below minimum price");
        require(commissionBps <= 1000, "Commission too high");
        require(durationDays > 0 && durationDays <= 365, "Invalid duration");
        
        totalListings++;
        uint256 listingId = totalListings;
        
        PropertyListing storage listing = listings[listingId];
        listing.listingId = listingId;
        listing.parcelId = parcelId;
        listing.seller = seller;
        listing.realtorId = realtorId;
        listing.price = price;
        listing.commissionBps = commissionBps;
        listing.metadata = metadata;
        listing.listedDate = block.timestamp;
        listing.expirationDate = block.timestamp + (durationDays * 1 days);
        listing.status = ListingStatus.Active;
        
        realtorListings[realtorId].push(listingId);
        
        emit PropertyListed(listingId, parcelId, seller, realtorId, price);
        
        return listingId;
    }
    
    /**
     * @notice Update listing status
     * @param listingId Listing to update
     * @param newStatus New status
     */
    function updateListingStatus(
        uint256 listingId,
        ListingStatus newStatus
    ) external {
        PropertyListing storage listing = listings[listingId];
        require(
            msg.sender == listing.seller || 
            addressToRealtorId[msg.sender] == listing.realtorId ||
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        ListingStatus oldStatus = listing.status;
        listing.status = newStatus;
        
        emit ListingStatusChanged(listingId, oldStatus, newStatus);
    }
    
    // ============================================
    // TRANSACTION MANAGEMENT
    // ============================================
    
    /**
     * @notice Initiate a property purchase
     * @param listingId Listing to purchase
     * @dev Buyer deposits full purchase price into escrow
     */
    function initiatePurchase(uint256 listingId) external nonReentrant whenNotPaused returns (uint256) {
        PropertyListing storage listing = listings[listingId];
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(listing.activeTransactionId == 0, "Listing already under contract");
        require(block.timestamp <= listing.expirationDate, "Listing expired");
        require(msg.sender != listing.seller, "Cannot buy your own listing");
        
        uint256 price = listing.price;
        
        // Transfer purchase price to escrow
        IERC20(axmToken).safeTransferFrom(msg.sender, address(this), price);
        
        // Create transaction
        totalTransactions++;
        uint256 transactionId = totalTransactions;
        
        Transaction storage txn = transactions[transactionId];
        txn.transactionId = transactionId;
        txn.listingId = listingId;
        txn.buyer = msg.sender;
        txn.seller = listing.seller;
        txn.realtorId = listing.realtorId;
        txn.price = price;
        txn.escrowAmount = price;
        txn.transactionDate = block.timestamp;
        txn.status = TransactionStatus.Escrowed;
        
        // Calculate commission and platform fee
        txn.commission = (price * listing.commissionBps) / 10000;
        txn.platformFee = (price * platformFeeBps) / 10000;
        
        // Mark listing as pending and bind to this transaction
        listing.status = ListingStatus.Pending;
        listing.activeTransactionId = transactionId;
        
        // Track transaction
        realtorTransactions[listing.realtorId].push(transactionId);
        buyerTransactions[msg.sender].push(transactionId);
        sellerTransactions[listing.seller].push(transactionId);
        
        emit TransactionCreated(transactionId, listingId, msg.sender, price);
        
        return transactionId;
    }
    
    /**
     * @notice Complete a transaction
     * @param transactionId Transaction to complete
     * @dev Distributes funds: seller gets net amount, realtor gets commission, platform gets fee
     */
    function completeTransaction(uint256 transactionId) external nonReentrant onlyRole(ADMIN_ROLE) {
        Transaction storage txn = transactions[transactionId];
        require(txn.status == TransactionStatus.Escrowed, "Not in escrow");
        
        PropertyListing storage listing = listings[txn.listingId];
        require(listing.status == ListingStatus.Pending, "Listing not pending");
        require(listing.activeTransactionId == transactionId, "Transaction mismatch");
        
        // Calculate distribution
        uint256 sellerAmount = txn.price - txn.commission - txn.platformFee;
        
        // Update transaction
        txn.status = TransactionStatus.Completed;
        txn.completionDate = block.timestamp;
        
        // Update listing (mark as sold and clear active transaction)
        listing.status = ListingStatus.Sold;
        listing.activeTransactionId = 0;
        
        // Update realtor stats
        Realtor storage realtor = realtors[txn.realtorId];
        realtor.totalSales += txn.price;
        realtor.totalCommissionEarned += txn.commission;
        realtor.successfulTransactions++;
        
        // Add commission to pending withdrawals
        pendingCommissions[realtor.realtorAddress] += txn.commission;
        
        // Record commission payment
        commissionHistory[txn.realtorId].push(CommissionPayment({
            realtorId: txn.realtorId,
            transactionId: transactionId,
            amount: txn.commission,
            timestamp: block.timestamp
        }));
        
        // Transfer funds
        IERC20(axmToken).safeTransfer(txn.seller, sellerAmount);
        IERC20(axmToken).safeTransfer(treasurySafe, txn.platformFee);
        
        emit TransactionCompleted(transactionId, txn.buyer, txn.seller, txn.price, txn.commission);
        emit CommissionPaid(txn.realtorId, transactionId, txn.commission);
    }
    
    /**
     * @notice Cancel a transaction
     * @param transactionId Transaction to cancel
     * @dev Returns escrowed funds to buyer and reopens listing
     */
    function cancelTransaction(uint256 transactionId) external nonReentrant {
        Transaction storage txn = transactions[transactionId];
        require(txn.status == TransactionStatus.Escrowed, "Not in escrow");
        require(
            msg.sender == txn.buyer || 
            msg.sender == txn.seller || 
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        PropertyListing storage listing = listings[txn.listingId];
        require(listing.status == ListingStatus.Pending, "Listing not pending");
        require(listing.activeTransactionId == transactionId, "Transaction mismatch");
        
        // Update transaction
        txn.status = TransactionStatus.Cancelled;
        
        // Reopen listing for new purchases
        listing.status = ListingStatus.Active;
        listing.activeTransactionId = 0;
        
        // Return escrow to buyer
        IERC20(axmToken).safeTransfer(txn.buyer, txn.escrowAmount);
    }
    
    /**
     * @notice Withdraw accumulated commissions
     */
    function withdrawCommission() external nonReentrant {
        uint256 amount = pendingCommissions[msg.sender];
        require(amount > 0, "No pending commissions");
        
        pendingCommissions[msg.sender] = 0;
        IERC20(axmToken).safeTransfer(msg.sender, amount);
        
        emit CommissionWithdrawn(msg.sender, amount);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update commission rates
     */
    function updateCommissionRates(
        uint256 _defaultCommissionBps,
        uint256 _platformFeeBps
    ) external onlyRole(ADMIN_ROLE) {
        require(_defaultCommissionBps <= 1000, "Commission too high");
        require(_platformFeeBps <= 1000, "Platform fee too high");
        
        defaultCommissionBps = _defaultCommissionBps;
        platformFeeBps = _platformFeeBps;
    }
    
    /**
     * @notice Update minimum listing price
     */
    function updateMinimumListingPrice(uint256 _minimumListingPrice) external onlyRole(ADMIN_ROLE) {
        minimumListingPrice = _minimumListingPrice;
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
     * @notice Get realtor details
     */
    function getRealtor(uint256 realtorId) external view returns (Realtor memory) {
        return realtors[realtorId];
    }
    
    /**
     * @notice Get listing details
     */
    function getListing(uint256 listingId) external view returns (PropertyListing memory) {
        return listings[listingId];
    }
    
    /**
     * @notice Get transaction details
     */
    function getTransaction(uint256 transactionId) external view returns (Transaction memory) {
        return transactions[transactionId];
    }
    
    /**
     * @notice Get realtor's listings
     */
    function getRealtorListings(uint256 realtorId) external view returns (uint256[] memory) {
        return realtorListings[realtorId];
    }
    
    /**
     * @notice Get realtor's transactions
     */
    function getRealtorTransactions(uint256 realtorId) external view returns (uint256[] memory) {
        return realtorTransactions[realtorId];
    }
    
    /**
     * @notice Get buyer's transactions
     */
    function getBuyerTransactions(address buyer) external view returns (uint256[] memory) {
        return buyerTransactions[buyer];
    }
    
    /**
     * @notice Get seller's transactions
     */
    function getSellerTransactions(address seller) external view returns (uint256[] memory) {
        return sellerTransactions[seller];
    }
    
    /**
     * @notice Get commission history for a realtor
     */
    function getCommissionHistory(uint256 realtorId) external view returns (CommissionPayment[] memory) {
        return commissionHistory[realtorId];
    }
}
