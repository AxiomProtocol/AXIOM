// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title IAxiomExchangeHub
 * @notice Interface for Axiom DEX to get live AXM/ETH pricing
 */
interface IAxiomExchangeHub {
    struct Pool {
        uint256 poolId;
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        uint256 lockedLiquidity;
        bool isActive;
        uint256 createdAt;
        uint256 totalVolume;
        uint256 totalFees;
    }
    
    function getPoolByPair(address tokenA, address tokenB) external view returns (uint256);
    function pools(uint256 poolId) external view returns (Pool memory);
    function getPool(uint256 poolId) external view returns (Pool memory);
}

/**
 * @title DePINNodeSales
 * @notice Handles both ETH and AXM payments for DePIN node purchases
 * @dev Supports dual payment with 15% discount for AXM purchases
 *      Integrates with AxiomExchangeHub DEX for live AXM/ETH pricing
 *      Includes manipulation protection: price bounds, liquidity requirements
 * 
 * Features:
 * - 5 node tiers with fixed ETH pricing
 * - AXM payments with 15% discount
 * - LIVE pricing from internal DEX (AxiomExchangeHub)
 * - PRICE MANIPULATION PROTECTION:
 *   - Minimum liquidity requirement (minPoolLiquidity)
 *   - Price bounds (minAxmPerEth, maxAxmPerEth)
 *   - DEX pricing disabled by default until admin verifies pool
 * - Fallback to manual rate if DEX unavailable or out of bounds
 * - Immediate forwarding to treasury (no trapped funds)
 */
contract DePINNodeSales is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PRICE_MANAGER_ROLE = keccak256("PRICE_MANAGER_ROLE");
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    address public treasurySafe;
    address public axmToken;
    address public wethToken;           // WETH for DEX pairing
    address public dexHub;              // AxiomExchangeHub address
    uint256 public totalNodesSold;
    uint256 public totalEthCollected;
    uint256 public totalAxmCollected;
    
    // AXM discount percentage (basis points, 1500 = 15%)
    uint256 public axmDiscountBps = 1500;
    
    // Fallback AXM price per ETH (used if DEX unavailable or price out of bounds)
    // e.g., 1 ETH = 3000 AXM means fallbackAxmPerEth = 3000 * 10^18
    uint256 public fallbackAxmPerEth = 3000 * 10**18;
    
    // DEX pool ID for AXM/WETH (set by admin after verifying pool)
    uint256 public axmWethPoolId;
    
    // Whether to use DEX pricing (DISABLED by default for safety)
    bool public useDexPricing = false;
    
    // ============================================
    // PRICE MANIPULATION PROTECTION
    // ============================================
    
    // Minimum pool liquidity required to trust DEX price (in WETH)
    // Default: 10 ETH minimum liquidity
    uint256 public minPoolLiquidity = 10 ether;
    
    // Price bounds to prevent manipulation
    // If DEX price is outside these bounds, fallback is used
    uint256 public minAxmPerEth = 100 * 10**18;      // Min: 1 ETH = 100 AXM
    uint256 public maxAxmPerEth = 100000 * 10**18;   // Max: 1 ETH = 100,000 AXM
    
    // Track if pool has been verified by admin
    bool public poolVerified = false;
    
    // Node Types
    enum NodeCategory { Lite, Standard }
    
    // Payment Type
    enum PaymentType { ETH, AXM }
    
    // Node Tier Pricing (in wei for ETH)
    struct NodeTier {
        uint256 tier;
        string name;
        uint256 priceEth;      // Price in ETH (wei)
        NodeCategory category;
        bool active;
    }
    
    // Tier catalog
    mapping(uint256 => NodeTier) public nodeTiers;
    uint256[] public activeTierIds;
    
    // Purchase tracking
    struct Purchase {
        address buyer;
        uint256 tierId;
        NodeCategory category;
        PaymentType paymentType;
        uint256 ethPaid;       // ETH amount (0 if paid in AXM)
        uint256 axmPaid;       // AXM amount (0 if paid in ETH)
        uint256 timestamp;
        string metadata;
    }
    
    mapping(address => Purchase[]) public userPurchases;
    Purchase[] public allPurchases;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event NodePurchasedWithETH(
        address indexed buyer,
        uint256 indexed tierId,
        NodeCategory indexed category,
        uint256 ethPaid,
        uint256 purchaseId,
        uint256 timestamp
    );
    
    event NodePurchasedWithAXM(
        address indexed buyer,
        uint256 indexed tierId,
        NodeCategory indexed category,
        uint256 axmPaid,
        uint256 discountApplied,
        uint256 purchaseId,
        uint256 timestamp
    );
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TierUpdated(uint256 indexed tierId, string name, uint256 price, NodeCategory category, bool active);
    event FallbackPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event AxmDiscountUpdated(uint256 oldDiscount, uint256 newDiscount);
    event DexHubUpdated(address indexed oldDex, address indexed newDex);
    event DexPricingEnabled(uint256 poolId, uint256 minLiquidity);
    event DexPricingDisabled();
    event PriceBoundsUpdated(uint256 minPrice, uint256 maxPrice);
    event MinLiquidityUpdated(uint256 oldMin, uint256 newMin);
    event PoolVerified(uint256 poolId, uint256 liquidity);
    event EmergencyWithdrawalETH(address indexed admin, uint256 amount);
    event EmergencyWithdrawalAXM(address indexed admin, uint256 amount);
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _treasurySafe, 
        address _axmToken,
        address _wethToken,
        address _dexHub
    ) {
        require(_treasurySafe != address(0), "Invalid treasury");
        require(_axmToken != address(0), "Invalid AXM token");
        require(_wethToken != address(0), "Invalid WETH token");
        require(_dexHub != address(0), "Invalid DEX hub");
        
        treasurySafe = _treasurySafe;
        axmToken = _axmToken;
        wethToken = _wethToken;
        dexHub = _dexHub;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PRICE_MANAGER_ROLE, msg.sender);
        
        // Initialize Lite Node Tiers (Browser-based)
        _setTier(1, "Mobile Light", 0.02 ether, NodeCategory.Lite, true);
        _setTier(2, "Desktop Standard", 0.05 ether, NodeCategory.Lite, true);
        _setTier(3, "Desktop Advanced", 0.08 ether, NodeCategory.Lite, true);
        
        // Initialize Standard Node Tiers (Hardware-based)
        _setTier(4, "Pro Infrastructure", 0.15 ether, NodeCategory.Standard, true);
        _setTier(5, "Enterprise Premium", 0.25 ether, NodeCategory.Standard, true);
        
        activeTierIds = [1, 2, 3, 4, 5];
        
        // DEX pricing is DISABLED by default
        // Admin must call verifyAndEnableDexPricing() after confirming pool is properly seeded
    }
    
    // ============================================
    // PURCHASE FUNCTIONS - ETH
    // ============================================
    
    /**
     * @notice Purchase a DePIN node with ETH
     * @param tierId Tier ID (1-5)
     * @param category Node category (Lite or Standard)
     * @param metadata Optional metadata (email, node name)
     */
    function purchaseNodeWithETH(
        uint256 tierId,
        NodeCategory category,
        string calldata metadata
    ) external payable nonReentrant whenNotPaused {
        NodeTier memory tier = nodeTiers[tierId];
        
        require(tier.active, "Tier not active");
        require(tier.category == category, "Category mismatch");
        require(msg.value >= tier.priceEth, "Insufficient ETH");
        
        // Record purchase
        Purchase memory purchase = Purchase({
            buyer: msg.sender,
            tierId: tierId,
            category: category,
            paymentType: PaymentType.ETH,
            ethPaid: msg.value,
            axmPaid: 0,
            timestamp: block.timestamp,
            metadata: metadata
        });
        
        userPurchases[msg.sender].push(purchase);
        allPurchases.push(purchase);
        
        uint256 purchaseId = allPurchases.length - 1;
        
        uint256 nodesSoldBefore = totalNodesSold;
        uint256 ethCollectedBefore = totalEthCollected;
        
        totalNodesSold++;
        totalEthCollected += msg.value;
        
        // Formal verification assertions
        assert(totalNodesSold == nodesSoldBefore + 1);
        assert(totalEthCollected == ethCollectedBefore + msg.value);
        assert(totalEthCollected >= msg.value); // No overflow
        
        // Forward 100% of ETH to treasury immediately
        (bool success, ) = treasurySafe.call{value: msg.value}("");
        require(success, "Treasury transfer failed");
        
        emit NodePurchasedWithETH(
            msg.sender,
            tierId,
            category,
            msg.value,
            purchaseId,
            block.timestamp
        );
    }
    
    /**
     * @notice Backward compatible ETH purchase function
     */
    function mintNode(uint256 nodeType, uint256 tierId) external payable nonReentrant whenNotPaused {
        NodeCategory category = nodeType == 0 ? NodeCategory.Lite : NodeCategory.Standard;
        NodeTier memory tier = nodeTiers[tierId];
        
        require(tier.active, "Tier not active");
        require(tier.category == category, "Category mismatch");
        require(msg.value >= tier.priceEth, "Insufficient ETH");
        
        // Record purchase
        Purchase memory purchase = Purchase({
            buyer: msg.sender,
            tierId: tierId,
            category: category,
            paymentType: PaymentType.ETH,
            ethPaid: msg.value,
            axmPaid: 0,
            timestamp: block.timestamp,
            metadata: ""
        });
        
        userPurchases[msg.sender].push(purchase);
        allPurchases.push(purchase);
        
        uint256 purchaseId = allPurchases.length - 1;
        
        totalNodesSold++;
        totalEthCollected += msg.value;
        
        // Forward 100% of ETH to treasury immediately
        (bool success, ) = treasurySafe.call{value: msg.value}("");
        require(success, "Treasury transfer failed");
        
        emit NodePurchasedWithETH(
            msg.sender,
            tierId,
            category,
            msg.value,
            purchaseId,
            block.timestamp
        );
    }
    
    // ============================================
    // PURCHASE FUNCTIONS - AXM (15% Discount)
    // ============================================
    
    /**
     * @notice Purchase a DePIN node with AXM tokens (15% discount!)
     * @param tierId Tier ID (1-5)
     * @param category Node category (Lite or Standard)
     * @param metadata Optional metadata (email, node name)
     */
    function purchaseNodeWithAXM(
        uint256 tierId,
        NodeCategory category,
        string calldata metadata
    ) external nonReentrant whenNotPaused {
        NodeTier memory tier = nodeTiers[tierId];
        
        require(tier.active, "Tier not active");
        require(tier.category == category, "Category mismatch");
        
        // Calculate AXM price with 15% discount (using safe price)
        uint256 axmPrice = getAxmPrice(tierId);
        require(axmPrice > 0, "Invalid AXM price");
        
        // Transfer AXM from buyer to treasury
        IERC20(axmToken).safeTransferFrom(msg.sender, treasurySafe, axmPrice);
        
        // Calculate discount amount for event
        uint256 axmPerEth = _getSafeAxmPerEth();
        uint256 fullAxmPrice = (tier.priceEth * axmPerEth) / 1 ether;
        uint256 discountAmount = fullAxmPrice - axmPrice;
        
        // Record purchase
        Purchase memory purchase = Purchase({
            buyer: msg.sender,
            tierId: tierId,
            category: category,
            paymentType: PaymentType.AXM,
            ethPaid: 0,
            axmPaid: axmPrice,
            timestamp: block.timestamp,
            metadata: metadata
        });
        
        userPurchases[msg.sender].push(purchase);
        allPurchases.push(purchase);
        
        uint256 purchaseId = allPurchases.length - 1;
        
        totalNodesSold++;
        totalAxmCollected += axmPrice;
        
        emit NodePurchasedWithAXM(
            msg.sender,
            tierId,
            category,
            axmPrice,
            discountAmount,
            purchaseId,
            block.timestamp
        );
    }
    
    // ============================================
    // SAFE PRICING FUNCTIONS (Manipulation Protected)
    // ============================================
    
    /**
     * @notice Get current AXM per ETH rate with manipulation protection
     * @return axmPerEth How many AXM tokens equal 1 ETH
     */
    function _getSafeAxmPerEth() internal view returns (uint256) {
        // If DEX pricing is disabled or not verified, use fallback
        if (!useDexPricing || !poolVerified || dexHub == address(0) || axmWethPoolId == 0) {
            return fallbackAxmPerEth;
        }
        
        // Try to get DEX price with safety checks
        (bool success, uint256 dexPrice, uint256 wethLiquidity) = _getDexPriceWithLiquidity();
        
        if (!success) {
            return fallbackAxmPerEth;
        }
        
        // SAFETY CHECK 1: Minimum liquidity requirement
        if (wethLiquidity < minPoolLiquidity) {
            return fallbackAxmPerEth;
        }
        
        // SAFETY CHECK 2: Price within bounds
        if (dexPrice < minAxmPerEth || dexPrice > maxAxmPerEth) {
            return fallbackAxmPerEth;
        }
        
        return dexPrice;
    }
    
    /**
     * @notice Get DEX price with liquidity info (internal)
     */
    function _getDexPriceWithLiquidity() internal view returns (bool success, uint256 price, uint256 wethLiquidity) {
        try IAxiomExchangeHub(dexHub).getPool(axmWethPoolId) returns (IAxiomExchangeHub.Pool memory pool) {
            if (!pool.isActive || pool.reserveA == 0 || pool.reserveB == 0) {
                return (false, 0, 0);
            }
            
            // Determine which token is WETH and calculate price
            if (pool.tokenA == wethToken) {
                // reserveA is WETH, reserveB is AXM
                // AXM per ETH = reserveB / reserveA
                price = (pool.reserveB * 1 ether) / pool.reserveA;
                wethLiquidity = pool.reserveA;
            } else if (pool.tokenB == wethToken) {
                // reserveB is WETH, reserveA is AXM  
                // AXM per ETH = reserveA / reserveB
                price = (pool.reserveA * 1 ether) / pool.reserveB;
                wethLiquidity = pool.reserveB;
            } else {
                return (false, 0, 0);
            }
            
            return (true, price, wethLiquidity);
        } catch {
            return (false, 0, 0);
        }
    }
    
    /**
     * @notice Get the AXM price for a tier (with discount applied)
     * @param tierId Tier ID
     * @return Discounted AXM price
     */
    function getAxmPrice(uint256 tierId) public view returns (uint256) {
        NodeTier memory tier = nodeTiers[tierId];
        require(tier.active, "Tier not active");
        
        // Get safe AXM/ETH rate (with manipulation protection)
        uint256 axmPerEth = _getSafeAxmPerEth();
        
        // Convert ETH price to AXM
        uint256 fullAxmPrice = (tier.priceEth * axmPerEth) / 1 ether;
        
        // Apply discount (15% off = 85% of price)
        uint256 discountedPrice = (fullAxmPrice * (10000 - axmDiscountBps)) / 10000;
        
        return discountedPrice;
    }
    
    /**
     * @notice Get both ETH and AXM prices for a tier
     */
    function getTierPricing(uint256 tierId) external view returns (
        uint256 ethPrice,
        uint256 axmPrice,
        uint256 axmFullPrice,
        uint256 discountPercent,
        string memory priceSource
    ) {
        NodeTier memory tier = nodeTiers[tierId];
        require(tier.active, "Tier not active");
        
        uint256 axmPerEth = _getSafeAxmPerEth();
        
        ethPrice = tier.priceEth;
        axmFullPrice = (tier.priceEth * axmPerEth) / 1 ether;
        axmPrice = (axmFullPrice * (10000 - axmDiscountBps)) / 10000;
        discountPercent = axmDiscountBps / 100;
        priceSource = _getPriceSource();
    }
    
    /**
     * @notice Get current price source description
     */
    function _getPriceSource() internal view returns (string memory) {
        if (!useDexPricing || !poolVerified || dexHub == address(0) || axmWethPoolId == 0) {
            return "Fallback (DEX disabled)";
        }
        
        (bool success, uint256 dexPrice, uint256 wethLiquidity) = _getDexPriceWithLiquidity();
        
        if (!success) {
            return "Fallback (DEX error)";
        }
        if (wethLiquidity < minPoolLiquidity) {
            return "Fallback (Low liquidity)";
        }
        if (dexPrice < minAxmPerEth || dexPrice > maxAxmPerEth) {
            return "Fallback (Price out of bounds)";
        }
        
        return "DEX Live";
    }
    
    // ============================================
    // ADMIN FUNCTIONS - DEX PRICING
    // ============================================
    
    /**
     * @notice Verify pool and enable DEX pricing (ADMIN ONLY)
     * @dev Admin must verify the pool is properly seeded before enabling
     * @param _poolId The verified pool ID
     */
    function verifyAndEnableDexPricing(uint256 _poolId) external onlyRole(ADMIN_ROLE) {
        require(_poolId > 0, "Invalid pool ID");
        require(dexHub != address(0), "DEX hub not set");
        
        // Verify pool exists and has sufficient liquidity
        IAxiomExchangeHub.Pool memory pool = IAxiomExchangeHub(dexHub).getPool(_poolId);
        require(pool.isActive, "Pool not active");
        require(pool.tokenA == wethToken || pool.tokenB == wethToken, "Pool must include WETH");
        require(pool.tokenA == axmToken || pool.tokenB == axmToken, "Pool must include AXM");
        
        // Check liquidity
        uint256 wethLiquidity = pool.tokenA == wethToken ? pool.reserveA : pool.reserveB;
        require(wethLiquidity >= minPoolLiquidity, "Insufficient pool liquidity");
        
        // Enable DEX pricing
        axmWethPoolId = _poolId;
        poolVerified = true;
        useDexPricing = true;
        
        emit PoolVerified(_poolId, wethLiquidity);
        emit DexPricingEnabled(_poolId, minPoolLiquidity);
    }
    
    /**
     * @notice Disable DEX pricing (use fallback only)
     */
    function disableDexPricing() external onlyRole(ADMIN_ROLE) {
        useDexPricing = false;
        emit DexPricingDisabled();
    }
    
    /**
     * @notice Update price bounds for manipulation protection
     */
    function updatePriceBounds(uint256 _minAxmPerEth, uint256 _maxAxmPerEth) external onlyRole(ADMIN_ROLE) {
        require(_minAxmPerEth > 0, "Min must be > 0");
        require(_maxAxmPerEth > _minAxmPerEth, "Max must be > min");
        
        minAxmPerEth = _minAxmPerEth;
        maxAxmPerEth = _maxAxmPerEth;
        
        emit PriceBoundsUpdated(_minAxmPerEth, _maxAxmPerEth);
    }
    
    /**
     * @notice Update minimum pool liquidity requirement
     */
    function updateMinPoolLiquidity(uint256 _minLiquidity) external onlyRole(ADMIN_ROLE) {
        uint256 oldMin = minPoolLiquidity;
        minPoolLiquidity = _minLiquidity;
        emit MinLiquidityUpdated(oldMin, _minLiquidity);
    }
    
    // ============================================
    // ADMIN FUNCTIONS - GENERAL
    // ============================================
    
    /**
     * @notice Update tier pricing and availability
     */
    function setTier(
        uint256 tierId,
        string calldata name,
        uint256 priceEth,
        NodeCategory category,
        bool active
    ) external onlyRole(ADMIN_ROLE) {
        _setTier(tierId, name, priceEth, category, active);
    }
    
    function _setTier(
        uint256 tierId,
        string memory name,
        uint256 priceEth,
        NodeCategory category,
        bool active
    ) internal {
        nodeTiers[tierId] = NodeTier({
            tier: tierId,
            name: name,
            priceEth: priceEth,
            category: category,
            active: active
        });
        
        emit TierUpdated(tierId, name, priceEth, category, active);
    }
    
    /**
     * @notice Update fallback AXM/ETH rate
     */
    function updateFallbackPrice(uint256 _fallbackAxmPerEth) external onlyRole(PRICE_MANAGER_ROLE) {
        require(_fallbackAxmPerEth > 0, "Invalid price");
        require(_fallbackAxmPerEth >= minAxmPerEth && _fallbackAxmPerEth <= maxAxmPerEth, "Price out of bounds");
        
        uint256 oldPrice = fallbackAxmPerEth;
        fallbackAxmPerEth = _fallbackAxmPerEth;
        emit FallbackPriceUpdated(oldPrice, _fallbackAxmPerEth);
    }
    
    /**
     * @notice Update AXM discount percentage
     */
    function updateAxmDiscount(uint256 _discountBps) external onlyRole(ADMIN_ROLE) {
        require(_discountBps <= 5000, "Discount too high"); // Max 50%
        uint256 oldDiscount = axmDiscountBps;
        axmDiscountBps = _discountBps;
        emit AxmDiscountUpdated(oldDiscount, _discountBps);
    }
    
    /**
     * @notice Update DEX hub address (resets pool verification)
     */
    function updateDexHub(address _newDexHub) external onlyRole(ADMIN_ROLE) {
        require(_newDexHub != address(0), "Invalid DEX hub");
        address oldDex = dexHub;
        dexHub = _newDexHub;
        
        // Reset pool verification when DEX changes
        poolVerified = false;
        useDexPricing = false;
        axmWethPoolId = 0;
        
        emit DexHubUpdated(oldDex, _newDexHub);
    }
    
    /**
     * @notice Update treasury safe address
     */
    function updateTreasury(address _newTreasury) external onlyRole(ADMIN_ROLE) {
        require(_newTreasury != address(0), "Invalid treasury");
        address oldTreasury = treasurySafe;
        treasurySafe = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }
    
    /**
     * @notice Emergency sweep of any residual ETH to treasury
     */
    function emergencyWithdrawETH() external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH balance");
        
        (bool success, ) = treasurySafe.call{value: balance}("");
        require(success, "ETH withdrawal failed");
        
        emit EmergencyWithdrawalETH(msg.sender, balance);
    }
    
    /**
     * @notice Emergency sweep of any residual AXM to treasury
     */
    function emergencyWithdrawAXM() external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 balance = IERC20(axmToken).balanceOf(address(this));
        require(balance > 0, "No AXM balance");
        
        IERC20(axmToken).safeTransfer(treasurySafe, balance);
        
        emit EmergencyWithdrawalAXM(msg.sender, balance);
    }
    
    /**
     * @notice Pause node sales
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause node sales
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Get user's purchase history
     */
    function getUserPurchases(address user) external view returns (Purchase[] memory) {
        return userPurchases[user];
    }
    
    /**
     * @notice Get purchase count for a user
     */
    function getUserPurchaseCount(address user) external view returns (uint256) {
        return userPurchases[user].length;
    }
    
    /**
     * @notice Get all active tiers with both ETH and AXM pricing
     */
    function getActiveTiersWithPricing() external view returns (
        NodeTier[] memory tiers,
        uint256[] memory axmPrices
    ) {
        uint256 count = 0;
        for (uint256 i = 0; i < activeTierIds.length; i++) {
            if (nodeTiers[activeTierIds[i]].active) {
                count++;
            }
        }
        
        tiers = new NodeTier[](count);
        axmPrices = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeTierIds.length; i++) {
            uint256 tierId = activeTierIds[i];
            if (nodeTiers[tierId].active) {
                tiers[index] = nodeTiers[tierId];
                axmPrices[index] = getAxmPrice(tierId);
                index++;
            }
        }
        
        return (tiers, axmPrices);
    }
    
    /**
     * @notice Get all active tiers
     */
    function getActiveTiers() external view returns (NodeTier[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < activeTierIds.length; i++) {
            if (nodeTiers[activeTierIds[i]].active) {
                count++;
            }
        }
        
        NodeTier[] memory tiers = new NodeTier[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeTierIds.length; i++) {
            uint256 tierId = activeTierIds[i];
            if (nodeTiers[tierId].active) {
                tiers[index] = nodeTiers[tierId];
                index++;
            }
        }
        
        return tiers;
    }
    
    /**
     * @notice Get total purchases
     */
    function getTotalPurchases() external view returns (uint256) {
        return allPurchases.length;
    }
    
    /**
     * @notice Get recent purchases (last N)
     */
    function getRecentPurchases(uint256 count) external view returns (Purchase[] memory) {
        uint256 total = allPurchases.length;
        if (count > total) count = total;
        
        Purchase[] memory recent = new Purchase[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = allPurchases[total - count + i];
        }
        
        return recent;
    }
    
    /**
     * @notice Get contract ETH balance (should normally be 0)
     */
    function getContractETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Get contract AXM balance (should normally be 0)
     */
    function getContractAXMBalance() external view returns (uint256) {
        return IERC20(axmToken).balanceOf(address(this));
    }
    
    /**
     * @notice Get sales summary
     */
    function getSalesSummary() external view returns (
        uint256 _totalNodesSold,
        uint256 _totalEthCollected,
        uint256 _totalAxmCollected,
        uint256 _currentAxmPerEth,
        uint256 _currentDiscountBps,
        string memory _priceSource
    ) {
        return (
            totalNodesSold,
            totalEthCollected,
            totalAxmCollected,
            _getSafeAxmPerEth(),
            axmDiscountBps,
            _getPriceSource()
        );
    }
    
    /**
     * @notice Get pricing configuration
     */
    function getPricingConfig() external view returns (
        address _dexHub,
        uint256 _poolId,
        bool _useDexPricing,
        bool _poolVerified,
        uint256 _fallbackAxmPerEth,
        uint256 _currentAxmPerEth,
        uint256 _minAxmPerEth,
        uint256 _maxAxmPerEth,
        uint256 _minPoolLiquidity,
        string memory _priceSource
    ) {
        return (
            dexHub,
            axmWethPoolId,
            useDexPricing,
            poolVerified,
            fallbackAxmPerEth,
            _getSafeAxmPerEth(),
            minAxmPerEth,
            maxAxmPerEth,
            minPoolLiquidity,
            _getPriceSource()
        );
    }
}
