// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MarketsAndListingsHub
 * @notice Wall Street integration and Real World Asset (RWA) marketplace for Axiom Smart City
 * @dev Tokenized securities, real estate, bonds, and institutional products
 * 
 * Features:
 * - Tokenized stocks, bonds, ETFs, and mutual funds
 * - Real estate investment trusts (REITs) and fractional property ownership
 * - Secondary market trading with order book
 * - KYC/AML compliance for accredited investors
 * - Dividend and coupon payment distribution
 * - Regulatory compliance hooks (Reg D, Reg S, Reg A+)
 * - Price oracle integration for fair market value
 * - Settlement and custody management
 */
contract MarketsAndListingsHub is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant MARKET_MAKER_ROLE = keccak256("MARKET_MAKER_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // Trading fee (basis points, 0.1% = 10 bps)
    uint256 public tradingFeeBps = 10;  // 0.1%
    uint256 public constant MAX_FEE_BPS = 500;  // 5% max
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Fee collection
    address public feeCollector;
    
    // Payment token (USDC for settlement)
    IERC20 public immutable paymentToken;
    
    // Global counters
    uint256 public totalListings;
    uint256 public totalOrders;
    uint256 public totalTrades;
    
    // Minimum order size (prevents spam)
    uint256 public minOrderSize = 100 * 1e6;  // $100 minimum
    
    // Maximum orders to match per transaction (prevents DOS)
    uint256 public constant MAX_ORDERS_PER_MATCH = 10;
    
    // Maximum iterations per match (prevents DOS from scanning stale orders)
    uint256 public constant MAX_ITERATIONS_PER_MATCH = 50;
    
    // Escrow balances (user => token => amount)
    mapping(address => mapping(address => uint256)) public escrowBalances;
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum AssetType {
        Stock,           // Tokenized equities
        Bond,            // Government/corporate bonds
        ETF,             // Exchange-traded funds
        MutualFund,      // Mutual fund shares
        REIT,            // Real estate investment trust
        RealEstate,      // Fractional property ownership
        Commodity,       // Gold, silver, oil, etc.
        Derivative       // Options, futures
    }
    
    enum ListingStatus { Active, Suspended, Delisted }
    enum OrderType { Buy, Sell }
    enum OrderStatus { Open, PartiallyFilled, Filled, Cancelled }
    enum ComplianceStatus { Pending, Approved, Rejected }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct OrderBook {
        uint256[] orderIds;                      // Active order IDs (dense array)
        mapping(uint256 => uint256) indexOf;     // orderId => array index (for O(1) removal)
    }
    
    struct AssetListing {
        uint256 listingId;
        string symbol;              // Ticker symbol (e.g., "AAPL", "TSLA")
        string name;                // Full name
        AssetType assetType;
        address tokenAddress;       // ERC20 token representing the asset
        address issuer;             // Entity that issued the asset
        uint256 totalSupply;        // Total tokens issued
        uint256 pricePerToken;      // Current price (in USD, scaled by 1e6)
        ListingStatus status;
        uint256 listedAt;
        bool requiresKYC;           // KYC required for trading
        bool accreditedOnly;        // Accredited investors only
        string regulatoryFramework; // Reg D, Reg S, Reg A+, etc.
    }
    
    struct Order {
        uint256 orderId;
        uint256 listingId;
        address trader;
        OrderType orderType;
        uint256 quantity;           // Number of tokens
        uint256 pricePerToken;      // Limit price (must be > 0)
        uint256 filledQuantity;
        uint256 maxSlippageBps;     // Maximum slippage tolerance (100 = 1%)
        OrderStatus status;
        uint256 createdAt;
        uint256 expiresAt;          // 0 = no expiration
        uint256 escrowedAmount;     // Amount escrowed for this order
    }
    
    struct Trade {
        uint256 tradeId;
        uint256 listingId;
        uint256 buyOrderId;
        uint256 sellOrderId;
        address buyer;
        address seller;
        uint256 quantity;
        uint256 pricePerToken;
        uint256 tradedAt;
        uint256 feeAmount;
    }
    
    struct InvestorProfile {
        bool isKYCVerified;
        bool isAccredited;
        uint256 kycExpiresAt;
        ComplianceStatus complianceStatus;
        uint256 totalTradesCount;
        uint256 totalVolumeUSD;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => AssetListing) public listings;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => Trade) public trades;
    mapping(address => InvestorProfile) public investors;
    
    // Symbol to listingId mapping
    mapping(string => uint256) public symbolToListing;
    
    // User orders tracking
    mapping(address => uint256[]) public userOrders;
    
    // CRITICAL FIX: Indexed order books with O(1) removal (listingId => OrderBook)
    mapping(uint256 => OrderBook) private listingBuyBooks;
    mapping(uint256 => OrderBook) private listingSellBooks;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event ListingCreated(
        uint256 indexed listingId,
        string symbol,
        AssetType assetType,
        address indexed issuer
    );
    
    event OrderPlaced(
        uint256 indexed orderId,
        uint256 indexed listingId,
        address indexed trader,
        OrderType orderType,
        uint256 quantity,
        uint256 pricePerToken
    );
    
    event OrderCancelled(
        uint256 indexed orderId,
        address indexed trader
    );
    
    event TradeExecuted(
        uint256 indexed tradeId,
        uint256 indexed listingId,
        address indexed buyer,
        address seller,
        uint256 quantity,
        uint256 pricePerToken
    );
    
    event InvestorVerified(
        address indexed investor,
        bool isKYCVerified,
        bool isAccredited
    );
    
    event ListingStatusUpdated(
        uint256 indexed listingId,
        ListingStatus newStatus
    );
    
    event Deposited(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    
    event Withdrawn(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address _feeCollector, address _paymentToken) {
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_paymentToken != address(0), "Invalid payment token");
        
        feeCollector = _feeCollector;
        paymentToken = IERC20(_paymentToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============================================
    // LISTING MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a new asset listing
     */
    function createListing(
        string calldata symbol,
        string calldata name,
        AssetType assetType,
        address tokenAddress,
        uint256 totalSupply,
        uint256 initialPrice,
        bool requiresKYC,
        bool accreditedOnly,
        string calldata regulatoryFramework
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 10, "Invalid symbol");
        require(bytes(name).length > 0, "Invalid name");
        require(tokenAddress != address(0), "Invalid token address");
        require(totalSupply > 0, "Invalid supply");
        require(initialPrice > 0, "Invalid price");
        require(symbolToListing[symbol] == 0, "Symbol already exists");
        
        totalListings++;
        uint256 listingId = totalListings;
        
        AssetListing storage listing = listings[listingId];
        listing.listingId = listingId;
        listing.symbol = symbol;
        listing.name = name;
        listing.assetType = assetType;
        listing.tokenAddress = tokenAddress;
        listing.issuer = msg.sender;
        listing.totalSupply = totalSupply;
        listing.pricePerToken = initialPrice;
        listing.status = ListingStatus.Active;
        listing.listedAt = block.timestamp;
        listing.requiresKYC = requiresKYC;
        listing.accreditedOnly = accreditedOnly;
        listing.regulatoryFramework = regulatoryFramework;
        
        symbolToListing[symbol] = listingId;
        
        emit ListingCreated(listingId, symbol, assetType, msg.sender);
        
        return listingId;
    }
    
    /**
     * @notice Update listing status
     */
    function updateListingStatus(
        uint256 listingId,
        ListingStatus newStatus
    ) external onlyRole(ADMIN_ROLE) {
        AssetListing storage listing = listings[listingId];
        require(listing.listingId != 0, "Listing not found");
        
        listing.status = newStatus;
        
        emit ListingStatusUpdated(listingId, newStatus);
    }
    
    /**
     * @notice Update listing price (issuer or market maker)
     */
    function updateListingPrice(
        uint256 listingId,
        uint256 newPrice
    ) external {
        AssetListing storage listing = listings[listingId];
        require(listing.listingId != 0, "Listing not found");
        require(
            listing.issuer == msg.sender || hasRole(MARKET_MAKER_ROLE, msg.sender),
            "Not authorized"
        );
        require(newPrice > 0, "Invalid price");
        
        listing.pricePerToken = newPrice;
    }
    
    // ============================================
    // ESCROW & DEPOSITS
    // ============================================
    
    /**
     * @notice Deposit tokens into escrow for trading
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Invalid amount");
        
        // Transfer tokens to contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Credit escrow balance
        escrowBalances[msg.sender][token] += amount;
        
        emit Deposited(msg.sender, token, amount);
    }
    
    /**
     * @notice Withdraw tokens from escrow
     */
    function withdraw(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Invalid amount");
        require(escrowBalances[msg.sender][token] >= amount, "Insufficient balance");
        
        // Debit escrow balance
        escrowBalances[msg.sender][token] -= amount;
        
        // Transfer tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, token, amount);
    }
    
    // ============================================
    // INVESTOR COMPLIANCE
    // ============================================
    
    /**
     * @notice Verify investor KYC/accreditation status
     */
    function verifyInvestor(
        address investor,
        bool isKYCVerified,
        bool isAccredited,
        uint256 kycExpiresAt
    ) external onlyRole(COMPLIANCE_ROLE) {
        require(investor != address(0), "Invalid investor");
        require(kycExpiresAt > block.timestamp, "Invalid expiration");
        
        InvestorProfile storage profile = investors[investor];
        profile.isKYCVerified = isKYCVerified;
        profile.isAccredited = isAccredited;
        profile.kycExpiresAt = kycExpiresAt;
        profile.complianceStatus = ComplianceStatus.Approved;
        
        emit InvestorVerified(investor, isKYCVerified, isAccredited);
    }
    
    /**
     * @notice Check if investor can trade a listing
     */
    function canInvestorTrade(address investor, uint256 listingId) public view returns (bool) {
        AssetListing storage listing = listings[listingId];
        InvestorProfile storage profile = investors[investor];
        
        // Check listing exists and is active
        if (listing.listingId == 0 || listing.status != ListingStatus.Active) {
            return false;
        }
        
        // Check KYC requirement
        if (listing.requiresKYC) {
            if (!profile.isKYCVerified || block.timestamp > profile.kycExpiresAt) {
                return false;
            }
        }
        
        // Check accredited investor requirement
        if (listing.accreditedOnly && !profile.isAccredited) {
            return false;
        }
        
        // Check compliance status
        if (profile.complianceStatus == ComplianceStatus.Rejected) {
            return false;
        }
        
        return true;
    }
    
    // ============================================
    // ORDER MANAGEMENT
    // ============================================
    
    /**
     * @notice Place a buy or sell order
     */
    function placeOrder(
        uint256 listingId,
        OrderType orderType,
        uint256 quantity,
        uint256 pricePerToken,
        uint256 maxSlippageBps,
        uint256 expiresAt
    ) external nonReentrant whenNotPaused returns (uint256) {
        AssetListing storage listing = listings[listingId];
        require(listing.listingId != 0, "Listing not found");
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(canInvestorTrade(msg.sender, listingId), "Not eligible to trade");
        require(quantity > 0, "Invalid quantity");
        require(pricePerToken > 0, "Invalid price");  // No market orders
        require(pricePerToken * quantity >= minOrderSize, "Order below minimum");
        require(maxSlippageBps <= 1000, "Slippage too high");  // Max 10%
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiration");
        
        // Calculate required escrow amount
        uint256 escrowAmount;
        if (orderType == OrderType.Buy) {
            // Buyer must escrow payment (with max slippage buffer)
            uint256 maxPrice = pricePerToken + (pricePerToken * maxSlippageBps / BPS_DENOMINATOR);
            escrowAmount = quantity * maxPrice;
            require(escrowBalances[msg.sender][address(paymentToken)] >= escrowAmount, "Insufficient payment escrow");
            // Reserve payment tokens
            escrowBalances[msg.sender][address(paymentToken)] -= escrowAmount;
        } else {
            // Seller must escrow asset tokens
            escrowAmount = quantity;
            require(escrowBalances[msg.sender][listing.tokenAddress] >= escrowAmount, "Insufficient asset escrow");
            // Reserve asset tokens
            escrowBalances[msg.sender][listing.tokenAddress] -= escrowAmount;
        }
        
        totalOrders++;
        uint256 orderId = totalOrders;
        
        Order storage order = orders[orderId];
        order.orderId = orderId;
        order.listingId = listingId;
        order.trader = msg.sender;
        order.orderType = orderType;
        order.quantity = quantity;
        order.pricePerToken = pricePerToken;
        order.maxSlippageBps = maxSlippageBps;
        order.filledQuantity = 0;
        order.status = OrderStatus.Open;
        order.createdAt = block.timestamp;
        order.expiresAt = expiresAt;
        order.escrowedAmount = escrowAmount;
        
        // Add to user's orders
        userOrders[msg.sender].push(orderId);
        
        // CRITICAL FIX: Add to indexed order book
        if (orderType == OrderType.Buy) {
            OrderBook storage book = listingBuyBooks[listingId];
            book.indexOf[orderId] = book.orderIds.length;
            book.orderIds.push(orderId);
        } else {
            OrderBook storage book = listingSellBooks[listingId];
            book.indexOf[orderId] = book.orderIds.length;
            book.orderIds.push(orderId);
        }
        
        emit OrderPlaced(orderId, listingId, msg.sender, orderType, quantity, pricePerToken);
        
        // Try to match order immediately (starting from index 0)
        _matchOrder(orderId, 0);
        
        return orderId;
    }
    
    /**
     * @notice Continue matching an existing order from a specific index
     * @dev Allows paginated matching for deep order books
     */
    function continueMatching(uint256 orderId, uint256 startFrom) external nonReentrant whenNotPaused {
        Order storage order = orders[orderId];
        require(order.orderId != 0, "Order not found");
        require(order.trader == msg.sender || hasRole(MARKET_MAKER_ROLE, msg.sender), "Not authorized");
        require(
            order.status == OrderStatus.Open || order.status == OrderStatus.PartiallyFilled,
            "Order not open"
        );
        
        _matchOrder(orderId, startFrom);
    }
    
    /**
     * @notice Cancel an open order and release escrow
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.orderId != 0, "Order not found");
        require(order.trader == msg.sender, "Not your order");
        require(
            order.status == OrderStatus.Open || order.status == OrderStatus.PartiallyFilled,
            "Cannot cancel"
        );
        
        // CRITICAL FIX: Release remaining escrowed funds
        // escrowedAmount already tracks the remaining reserve after fills
        if (order.escrowedAmount > 0) {
            AssetListing storage listing = listings[order.listingId];
            
            if (order.orderType == OrderType.Buy) {
                // Release payment tokens
                escrowBalances[msg.sender][address(paymentToken)] += order.escrowedAmount;
            } else {
                // Release asset tokens
                escrowBalances[msg.sender][listing.tokenAddress] += order.escrowedAmount;
            }
            
            // Zero out escrow to prevent double-refund
            order.escrowedAmount = 0;
        }
        
        order.status = OrderStatus.Cancelled;
        
        // CRITICAL FIX: Remove cancelled order from order book
        _removeFromBook(order.listingId, order.orderType, orderId);
        
        emit OrderCancelled(orderId, msg.sender);
    }
    
    /**
     * @notice Match order against order book (gas-bounded with cursor support)
     * @param orderId The order to match
     * @param cursorIndex Starting index in opposite order book (for pagination)
     */
    function _matchOrder(uint256 orderId, uint256 cursorIndex) private {
        Order storage order = orders[orderId];
        
        // Skip if order is not open
        if (order.status != OrderStatus.Open && order.status != OrderStatus.PartiallyFilled) {
            return;
        }
        
        // CRITICAL FIX: Check expiration and refund escrow
        if (order.expiresAt != 0 && block.timestamp > order.expiresAt) {
            // Refund remaining escrowed funds before cancelling
            if (order.escrowedAmount > 0) {
                AssetListing storage listing = listings[order.listingId];
                
                if (order.orderType == OrderType.Buy) {
                    escrowBalances[order.trader][address(paymentToken)] += order.escrowedAmount;
                } else {
                    escrowBalances[order.trader][listing.tokenAddress] += order.escrowedAmount;
                }
                
                order.escrowedAmount = 0;
            }
            
            order.status = OrderStatus.Cancelled;
            _removeFromBook(order.listingId, order.orderType, orderId);
            return;
        }
        
        // CRITICAL FIX: Use indexed order book (dense array, only active orders)
        OrderBook storage oppositeBook = order.orderType == OrderType.Buy
            ? listingSellBooks[order.listingId]
            : listingBuyBooks[order.listingId];
        
        uint256 bookSize = oppositeBook.orderIds.length;
        if (bookSize == 0) return;  // Empty book, nothing to match
        if (cursorIndex >= bookSize) return;  // Cursor past end of book
        
        // CRITICAL FIX: Forward iteration with cursor support for pagination
        // This allows matching to continue across multiple transactions for deep books
        uint256 remainingOrders = bookSize - cursorIndex;
        uint256 maxIterations = remainingOrders < MAX_ITERATIONS_PER_MATCH
            ? remainingOrders
            : MAX_ITERATIONS_PER_MATCH;
        
        uint256 matchedCount = 0;
        uint256 i = cursorIndex;
        uint256 endIndex = cursorIndex + maxIterations;
        
        // Iterate forward through order book with removals handled correctly
        while (i < endIndex && i < oppositeBook.orderIds.length && matchedCount < MAX_ORDERS_PER_MATCH && order.filledQuantity < order.quantity) {
            uint256 oppositeOrderId = oppositeBook.orderIds[i];
            Order storage oppositeOrder = orders[oppositeOrderId];
            
            // Skip if opposite order is not open
            if (oppositeOrder.status != OrderStatus.Open && 
                oppositeOrder.status != OrderStatus.PartiallyFilled) {
                i++;  // Move to next order
                continue;
            }
            
            // CRITICAL FIX: Check expiration and refund escrow
            if (oppositeOrder.expiresAt != 0 && block.timestamp > oppositeOrder.expiresAt) {
                // Refund remaining escrowed funds before cancelling
                if (oppositeOrder.escrowedAmount > 0) {
                    AssetListing storage listing = listings[oppositeOrder.listingId];
                    
                    if (oppositeOrder.orderType == OrderType.Buy) {
                        escrowBalances[oppositeOrder.trader][address(paymentToken)] += oppositeOrder.escrowedAmount;
                    } else {
                        escrowBalances[oppositeOrder.trader][listing.tokenAddress] += oppositeOrder.escrowedAmount;
                    }
                    
                    oppositeOrder.escrowedAmount = 0;
                }
                
                oppositeOrder.status = OrderStatus.Cancelled;
                _removeFromBook(oppositeOrder.listingId, oppositeOrder.orderType, oppositeOrderId);
                // Note: removal shifts array, current index now has next order
                // Don't increment i, but adjust endIndex
                endIndex--;
                continue;
            }
            
            // Check price compatibility
            bool priceMatch = false;
            if (order.orderType == OrderType.Buy) {
                // Buy order: must be willing to pay at least sell price
                if (order.pricePerToken >= oppositeOrder.pricePerToken) {
                    // Check slippage for buyer
                    uint256 maxAcceptablePrice = order.pricePerToken + (order.pricePerToken * order.maxSlippageBps / BPS_DENOMINATOR);
                    if (oppositeOrder.pricePerToken <= maxAcceptablePrice) {
                        priceMatch = true;
                    }
                }
            } else {
                // Sell order: must accept at least order price
                if (order.pricePerToken <= oppositeOrder.pricePerToken) {
                    // Check slippage for seller
                    uint256 minAcceptablePrice = order.pricePerToken - (order.pricePerToken * order.maxSlippageBps / BPS_DENOMINATOR);
                    if (oppositeOrder.pricePerToken >= minAcceptablePrice) {
                        priceMatch = true;
                    }
                }
            }
            
            if (!priceMatch) {
                i++;  // Move to next order
                continue;
            }
            
            // CRITICAL FIX: Execute trade with correct parameter order (buyOrderId, sellOrderId)
            // Note: _executeTrade may remove orders from book via _removeFromBook
            // When an order is removed, the current index now points to what was the next order
            // So we DON'T increment i if a removal happened
            uint256 bookSizeBefore = oppositeBook.orderIds.length;
            
            if (order.orderType == OrderType.Buy) {
                _executeTrade(orderId, oppositeOrderId);  // orderId is buy, oppositeOrderId is sell
            } else {
                _executeTrade(oppositeOrderId, orderId);  // oppositeOrderId is buy, orderId is sell
            }
            
            matchedCount++;
            
            // Check if book shrunk (order was removed)
            if (oppositeBook.orderIds.length < bookSizeBefore) {
                // Order was removed, current index now has the next order
                // Don't increment i
                endIndex--;  // Adjust end since book shrunk
            } else {
                // Order still in book (partially filled), move to next
                i++;
            }
        }
    }
    
    /**
     * @notice Execute a trade between two orders with proper settlement
     */
    function _executeTrade(uint256 buyOrderId, uint256 sellOrderId) private {
        Order storage buyOrder = orders[buyOrderId];
        Order storage sellOrder = orders[sellOrderId];
        AssetListing storage listing = listings[buyOrder.listingId];
        
        // Determine trade quantity (minimum of remaining quantities)
        uint256 buyRemaining = buyOrder.quantity - buyOrder.filledQuantity;
        uint256 sellRemaining = sellOrder.quantity - sellOrder.filledQuantity;
        uint256 tradeQuantity = buyRemaining < sellRemaining ? buyRemaining : sellRemaining;
        
        // Determine trade price (use sell order price - seller's ask)
        uint256 tradePrice = sellOrder.pricePerToken;
        
        // Calculate settlement amounts
        uint256 tradeValue = tradeQuantity * tradePrice;
        uint256 feeAmount = (tradeValue * tradingFeeBps) / BPS_DENOMINATOR;
        uint256 sellerProceeds = tradeValue - feeAmount;
        
        // Update order filled quantities
        buyOrder.filledQuantity += tradeQuantity;
        sellOrder.filledQuantity += tradeQuantity;
        
        // Update order statuses and remove from book if filled
        if (buyOrder.filledQuantity == buyOrder.quantity) {
            buyOrder.status = OrderStatus.Filled;
            // CRITICAL FIX: Remove filled order from book
            _removeFromBook(buyOrder.listingId, OrderType.Buy, buyOrderId);
        } else {
            buyOrder.status = OrderStatus.PartiallyFilled;
            // Keep partially filled orders in book
        }
        
        if (sellOrder.filledQuantity == sellOrder.quantity) {
            sellOrder.status = OrderStatus.Filled;
            // CRITICAL FIX: Remove filled order from book
            _removeFromBook(sellOrder.listingId, OrderType.Sell, sellOrderId);
        } else {
            sellOrder.status = OrderStatus.PartiallyFilled;
            // Keep partially filled orders in book
        }
        
        // Record trade
        totalTrades++;
        Trade storage trade = trades[totalTrades];
        trade.tradeId = totalTrades;
        trade.listingId = buyOrder.listingId;
        trade.buyOrderId = buyOrderId;
        trade.sellOrderId = sellOrderId;
        trade.buyer = buyOrder.trader;
        trade.seller = sellOrder.trader;
        trade.quantity = tradeQuantity;
        trade.pricePerToken = tradePrice;
        trade.tradedAt = block.timestamp;
        trade.feeAmount = feeAmount;
        
        // Update investor profiles
        investors[buyOrder.trader].totalTradesCount++;
        investors[buyOrder.trader].totalVolumeUSD += tradeValue;
        investors[sellOrder.trader].totalTradesCount++;
        investors[sellOrder.trader].totalVolumeUSD += tradeValue;
        
        // CRITICAL FIX: Proper settlement with escrow and refunds
        // 1. Asset tokens: escrowed seller -> buyer
        escrowBalances[buyOrder.trader][listing.tokenAddress] += tradeQuantity;
        // (Seller's tokens already deducted from escrow when order placed)
        
        // 2. Payment tokens: buyer pays seller (minus fee)
        escrowBalances[sellOrder.trader][address(paymentToken)] += sellerProceeds;
        
        // 3. Trading fee: buyer pays fee
        escrowBalances[feeCollector][address(paymentToken)] += feeAmount;
        
        // 4. CRITICAL FIX: Refund unused escrow to buyer (slippage buffer)
        // Buyer escrowed: quantity * maxPrice (with slippage buffer)
        // Buyer actually paid: quantity * tradePrice
        // Refund: quantity * (maxPrice - tradePrice)
        uint256 maxPrice = buyOrder.pricePerToken + (buyOrder.pricePerToken * buyOrder.maxSlippageBps / BPS_DENOMINATOR);
        if (tradePrice < maxPrice) {
            uint256 refundPerToken = maxPrice - tradePrice;
            uint256 refundAmount = tradeQuantity * refundPerToken;
            escrowBalances[buyOrder.trader][address(paymentToken)] += refundAmount;
        }
        
        // 5. Update escrowedAmount for both orders (deduct what was used)
        uint256 buyerUsed = tradeQuantity * maxPrice;  // What was reserved from escrow
        buyOrder.escrowedAmount -= buyerUsed;
        
        uint256 sellerUsed = tradeQuantity;  // Asset tokens used
        sellOrder.escrowedAmount -= sellerUsed;
        
        emit TradeExecuted(
            totalTrades,
            buyOrder.listingId,
            buyOrder.trader,
            sellOrder.trader,
            tradeQuantity,
            tradePrice
        );
    }
    
    // ============================================
    // ORDER BOOK MANAGEMENT (INTERNAL)
    // ============================================
    
    /**
     * @notice Remove order from book using swap-and-pop (O(1) operation)
     */
    function _removeFromBook(
        uint256 listingId,
        OrderType orderType,
        uint256 orderId
    ) private {
        OrderBook storage book = orderType == OrderType.Buy
            ? listingBuyBooks[listingId]
            : listingSellBooks[listingId];
        
        // Get index of order to remove
        uint256 index = book.indexOf[orderId];
        uint256 lastIndex = book.orderIds.length - 1;
        
        // Swap with last element if not already last
        if (index != lastIndex) {
            uint256 lastOrderId = book.orderIds[lastIndex];
            book.orderIds[index] = lastOrderId;
            book.indexOf[lastOrderId] = index;
        }
        
        // Remove last element
        book.orderIds.pop();
        delete book.indexOf[orderId];
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update trading fee
     */
    function updateTradingFee(uint256 newFeeBps) external onlyRole(ADMIN_ROLE) {
        require(newFeeBps <= MAX_FEE_BPS, "Fee too high");
        tradingFeeBps = newFeeBps;
    }
    
    /**
     * @notice Update minimum order size
     */
    function updateMinOrderSize(uint256 newMinSize) external onlyRole(ADMIN_ROLE) {
        require(newMinSize > 0, "Invalid min size");
        minOrderSize = newMinSize;
    }
    
    /**
     * @notice Update fee collector
     */
    function updateFeeCollector(address newCollector) external onlyRole(ADMIN_ROLE) {
        require(newCollector != address(0), "Invalid collector");
        feeCollector = newCollector;
    }
    
    /**
     * @notice Pause trading
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause trading
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getListing(uint256 listingId) external view returns (AssetListing memory) {
        return listings[listingId];
    }
    
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
    
    function getTrade(uint256 tradeId) external view returns (Trade memory) {
        return trades[tradeId];
    }
    
    function getInvestorProfile(address investor) external view returns (InvestorProfile memory) {
        return investors[investor];
    }
    
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }
    
    function getListingBuyOrders(uint256 listingId) external view returns (uint256[] memory) {
        return listingBuyBooks[listingId].orderIds;
    }
    
    function getListingSellOrders(uint256 listingId) external view returns (uint256[] memory) {
        return listingSellBooks[listingId].orderIds;
    }
    
    function getOrderBookSize(uint256 listingId, OrderType orderType) external view returns (uint256) {
        if (orderType == OrderType.Buy) {
            return listingBuyBooks[listingId].orderIds.length;
        } else {
            return listingSellBooks[listingId].orderIds.length;
        }
    }
}
