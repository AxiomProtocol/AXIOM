// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title OracleAndMetricsRelay
 * @notice Price feed oracle and metrics relay system for Axiom Smart City
 * @dev Aggregates price data from multiple sources with deviation checks
 * 
 * Features:
 * - Multi-source price aggregation (Chainlink, API3, custom oracles)
 * - Median calculation for price accuracy
 * - Staleness checks and heartbeat monitoring
 * - Historical price tracking
 * - Custom metrics relay (occupancy, energy, traffic, etc.)
 * - Circuit breaker for extreme price movements
 * - TWAP (Time-Weighted Average Price) support
 */
contract OracleAndMetricsRelay is AccessControl, ReentrancyGuard, Pausable {

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // Price feed configuration
    uint256 public constant MAX_PRICE_DEVIATION = 1000;  // 10% max deviation
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_ORACLES_PER_ASSET = 20;  // Maximum 20 oracles per asset (prevents DOS)
    uint256 public priceValidityPeriod = 1 hours;  // Stale after 1 hour
    
    // Global counters
    uint256 public totalAssets;
    uint256 public totalPriceUpdates;
    uint256 public totalMetrics;
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum AssetType {
        Crypto,           // BTC, ETH, etc.
        Fiat,             // USD, EUR, etc.
        Commodity,        // Gold, Oil, etc.
        RealEstate,       // Property values
        Stock,            // Equity prices
        Custom            // Custom asset types
    }
    
    enum MetricType {
        Occupancy,        // Building occupancy rate
        Energy,           // Energy consumption/generation
        Traffic,          // Traffic flow metrics
        AirQuality,       // Air quality index
        Temperature,      // Temperature readings
        Humidity,         // Humidity levels
        Custom            // Custom metrics
    }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Asset {
        uint256 assetId;
        string symbol;              // e.g., "BTC/USD", "ETH/USD"
        string name;
        AssetType assetType;
        uint8 decimals;             // Price decimals (e.g., 8 for $12,345.67)
        bool isActive;
        uint256 registeredAt;
    }
    
    struct PriceData {
        uint256 price;              // Latest price
        uint256 timestamp;          // When price was updated
        address reporter;           // Who reported the price
        uint256 confidence;         // Confidence score (0-10000 bps)
    }
    
    struct PriceSubmission {
        uint256 assetId;
        uint256 price;
        uint256 timestamp;
        address oracle;
    }
    
    struct AggregatedPrice {
        uint256 price;              // Median price from all sources
        uint256 timestamp;          // Latest update time
        uint256 sourceCount;        // Number of sources used
        uint256 deviation;          // Price deviation in bps
        bool isValid;               // Whether price is valid
    }
    
    struct Metric {
        uint256 metricId;
        string name;
        MetricType metricType;
        uint256 value;
        uint256 timestamp;
        address reporter;
        string unit;                // e.g., "kWh", "PPM", "°C"
    }
    
    struct TWAP {
        uint256 assetId;
        uint256 cumulativePrice;    // Sum of prices
        uint256 sampleCount;        // Number of samples
        uint256 startTime;
        uint256 endTime;
        uint256 averagePrice;       // TWAP result
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => Asset) public assets;
    mapping(string => uint256) public symbolToAssetId;
    
    // Price data per asset per oracle
    mapping(uint256 => mapping(address => PriceData)) public assetPrices;
    
    // List of registered oracles per asset
    mapping(uint256 => address[]) public assetOracles;
    
    // Oracle registration tracking (assetId => oracle => isRegistered) for O(1) lookup
    mapping(uint256 => mapping(address => bool)) public isOracleRegistered;
    
    // Aggregated price per asset
    mapping(uint256 => AggregatedPrice) public aggregatedPrices;
    
    // Historical prices (assetId => timestamp => price)
    mapping(uint256 => mapping(uint256 => uint256)) public historicalPrices;
    
    // Metrics storage
    mapping(uint256 => Metric) public metrics;
    mapping(string => uint256) public metricNameToId;
    
    // TWAP tracking
    mapping(uint256 => TWAP) public twapData;
    
    // Oracle registration
    mapping(address => bool) public registeredOracles;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event AssetRegistered(
        uint256 indexed assetId,
        string symbol,
        AssetType assetType
    );
    
    event PriceUpdated(
        uint256 indexed assetId,
        address indexed oracle,
        uint256 price,
        uint256 timestamp
    );
    
    event PriceAggregated(
        uint256 indexed assetId,
        uint256 price,
        uint256 sourceCount,
        uint256 deviation
    );
    
    event MetricReported(
        uint256 indexed metricId,
        string name,
        uint256 value,
        address indexed reporter
    );
    
    event OracleRegistered(
        address indexed oracle,
        uint256 indexed assetId
    );
    
    event CircuitBreakerTriggered(
        uint256 indexed assetId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 deviation
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============================================
    // ASSET MANAGEMENT
    // ============================================
    
    /**
     * @notice Register a new asset for price tracking
     */
    function registerAsset(
        string calldata symbol,
        string calldata name,
        AssetType assetType,
        uint8 decimals
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(bytes(symbol).length > 0, "Invalid symbol");
        require(symbolToAssetId[symbol] == 0, "Asset exists");
        require(decimals <= 18, "Decimals too high");
        
        totalAssets++;
        uint256 assetId = totalAssets;
        
        Asset storage asset = assets[assetId];
        asset.assetId = assetId;
        asset.symbol = symbol;
        asset.name = name;
        asset.assetType = assetType;
        asset.decimals = decimals;
        asset.isActive = true;
        asset.registeredAt = block.timestamp;
        
        symbolToAssetId[symbol] = assetId;
        
        emit AssetRegistered(assetId, symbol, assetType);
        
        return assetId;
    }
    
    /**
     * @notice Register an oracle for an asset (max 20 per asset to prevent DOS)
     */
    function registerOracle(
        uint256 assetId,
        address oracle
    ) external onlyRole(ADMIN_ROLE) {
        require(assets[assetId].isActive, "Asset not active");
        require(oracle != address(0), "Invalid oracle");
        
        // CRITICAL FIX: Check max oracles limit to prevent DOS
        address[] storage oracles = assetOracles[assetId];
        require(oracles.length < MAX_ORACLES_PER_ASSET, "Max oracles reached");
        
        // CRITICAL FIX: O(1) duplicate check using mapping
        require(!isOracleRegistered[assetId][oracle], "Oracle already registered");
        
        oracles.push(oracle);
        isOracleRegistered[assetId][oracle] = true;
        registeredOracles[oracle] = true;
        _grantRole(ORACLE_ROLE, oracle);
        
        emit OracleRegistered(oracle, assetId);
    }
    
    /**
     * @notice Remove an oracle from an asset
     */
    function removeOracle(
        uint256 assetId,
        address oracle
    ) external onlyRole(ADMIN_ROLE) {
        require(isOracleRegistered[assetId][oracle], "Oracle not registered");
        
        address[] storage oracles = assetOracles[assetId];
        
        // Find and remove oracle (swap with last)
        for (uint256 i = 0; i < oracles.length; i++) {
            if (oracles[i] == oracle) {
                oracles[i] = oracles[oracles.length - 1];
                oracles.pop();
                break;
            }
        }
        
        isOracleRegistered[assetId][oracle] = false;
    }
    
    // ============================================
    // PRICE UPDATES
    // ============================================
    
    /**
     * @notice Submit price update from oracle
     */
    function updatePrice(
        uint256 assetId,
        uint256 price,
        uint256 confidence
    ) external onlyRole(ORACLE_ROLE) nonReentrant whenNotPaused {
        Asset storage asset = assets[assetId];
        require(asset.isActive, "Asset not active");
        require(price > 0, "Invalid price");
        require(confidence <= BPS_DENOMINATOR, "Invalid confidence");
        
        // CRITICAL FIX: O(1) oracle verification using mapping
        require(isOracleRegistered[assetId][msg.sender], "Oracle not registered for asset");
        
        // Store price data
        PriceData storage priceData = assetPrices[assetId][msg.sender];
        priceData.price = price;
        priceData.timestamp = block.timestamp;
        priceData.reporter = msg.sender;
        priceData.confidence = confidence;
        
        totalPriceUpdates++;
        
        emit PriceUpdated(assetId, msg.sender, price, block.timestamp);
        
        // Trigger aggregation
        _aggregatePrices(assetId);
    }
    
    /**
     * @notice Aggregate prices from multiple oracles
     */
    function _aggregatePrices(uint256 assetId) private {
        address[] storage oracles = assetOracles[assetId];
        require(oracles.length > 0, "No oracles");
        
        // Collect valid prices
        uint256[] memory prices = new uint256[](oracles.length);
        uint256 validCount = 0;
        
        for (uint256 i = 0; i < oracles.length; i++) {
            PriceData storage priceData = assetPrices[assetId][oracles[i]];
            
            // Check if price is not stale
            if (block.timestamp <= priceData.timestamp + priceValidityPeriod) {
                prices[validCount] = priceData.price;
                validCount++;
            }
        }
        
        require(validCount > 0, "No valid prices");
        
        // Calculate median price (using sorted array)
        uint256 medianPrice = _calculateMedian(prices, validCount);
        
        // Calculate price deviation
        uint256 deviation = _calculateDeviation(prices, validCount, medianPrice);
        
        // Circuit breaker: check for extreme price movements
        AggregatedPrice storage aggPrice = aggregatedPrices[assetId];
        if (aggPrice.price > 0) {
            uint256 priceChange = medianPrice > aggPrice.price
                ? ((medianPrice - aggPrice.price) * BPS_DENOMINATOR) / aggPrice.price
                : ((aggPrice.price - medianPrice) * BPS_DENOMINATOR) / aggPrice.price;
            
            if (priceChange > MAX_PRICE_DEVIATION) {
                emit CircuitBreakerTriggered(assetId, aggPrice.price, medianPrice, priceChange);
                // Still update but flag as potentially invalid
                aggPrice.isValid = false;
            } else {
                aggPrice.isValid = true;
            }
        } else {
            aggPrice.isValid = true;  // First price always valid
        }
        
        // Update aggregated price
        aggPrice.price = medianPrice;
        aggPrice.timestamp = block.timestamp;
        aggPrice.sourceCount = validCount;
        aggPrice.deviation = deviation;
        
        // Store in historical prices (rounded to hour)
        uint256 hourTimestamp = (block.timestamp / 1 hours) * 1 hours;
        historicalPrices[assetId][hourTimestamp] = medianPrice;
        
        // Update TWAP
        _updateTWAP(assetId, medianPrice);
        
        emit PriceAggregated(assetId, medianPrice, validCount, deviation);
    }
    
    /**
     * @notice Calculate median from array of prices
     */
    function _calculateMedian(
        uint256[] memory prices,
        uint256 count
    ) private pure returns (uint256) {
        require(count > 0, "Empty array");
        
        // Sort prices (simple bubble sort for small arrays)
        for (uint256 i = 0; i < count - 1; i++) {
            for (uint256 j = 0; j < count - i - 1; j++) {
                if (prices[j] > prices[j + 1]) {
                    uint256 temp = prices[j];
                    prices[j] = prices[j + 1];
                    prices[j + 1] = temp;
                }
            }
        }
        
        // Return median
        if (count % 2 == 0) {
            return (prices[count / 2 - 1] + prices[count / 2]) / 2;
        } else {
            return prices[count / 2];
        }
    }
    
    /**
     * @notice Calculate price deviation in basis points
     */
    function _calculateDeviation(
        uint256[] memory prices,
        uint256 count,
        uint256 median
    ) private pure returns (uint256) {
        if (count == 0 || median == 0) return 0;
        
        uint256 maxDeviation = 0;
        
        for (uint256 i = 0; i < count; i++) {
            uint256 deviation = prices[i] > median
                ? ((prices[i] - median) * BPS_DENOMINATOR) / median
                : ((median - prices[i]) * BPS_DENOMINATOR) / median;
            
            if (deviation > maxDeviation) {
                maxDeviation = deviation;
            }
        }
        
        return maxDeviation;
    }
    
    /**
     * @notice Update TWAP for an asset
     */
    function _updateTWAP(uint256 assetId, uint256 price) private {
        TWAP storage twap = twapData[assetId];
        
        if (twap.startTime == 0) {
            // Initialize TWAP
            twap.assetId = assetId;
            twap.cumulativePrice = price;
            twap.sampleCount = 1;
            twap.startTime = block.timestamp;
            twap.endTime = block.timestamp;
            twap.averagePrice = price;
        } else {
            // Update TWAP
            twap.cumulativePrice += price;
            twap.sampleCount++;
            twap.endTime = block.timestamp;
            twap.averagePrice = twap.cumulativePrice / twap.sampleCount;
        }
    }
    
    // ============================================
    // METRICS REPORTING
    // ============================================
    
    /**
     * @notice Report a metric (IoT, city data, etc.)
     */
    function reportMetric(
        string calldata name,
        MetricType metricType,
        uint256 value,
        string calldata unit
    ) external onlyRole(REPORTER_ROLE) nonReentrant returns (uint256) {
        require(bytes(name).length > 0, "Invalid name");
        
        totalMetrics++;
        uint256 metricId = totalMetrics;
        
        Metric storage metric = metrics[metricId];
        metric.metricId = metricId;
        metric.name = name;
        metric.metricType = metricType;
        metric.value = value;
        metric.timestamp = block.timestamp;
        metric.reporter = msg.sender;
        metric.unit = unit;
        
        metricNameToId[name] = metricId;
        
        emit MetricReported(metricId, name, value, msg.sender);
        
        return metricId;
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getPrice(uint256 assetId) external view returns (uint256, uint256, bool) {
        AggregatedPrice storage aggPrice = aggregatedPrices[assetId];
        return (aggPrice.price, aggPrice.timestamp, aggPrice.isValid);
    }
    
    function getAsset(uint256 assetId) external view returns (Asset memory) {
        return assets[assetId];
    }
    
    function getMetric(uint256 metricId) external view returns (Metric memory) {
        return metrics[metricId];
    }
    
    function getTWAP(uint256 assetId) external view returns (TWAP memory) {
        return twapData[assetId];
    }
    
    function getHistoricalPrice(
        uint256 assetId,
        uint256 timestamp
    ) external view returns (uint256) {
        uint256 hourTimestamp = (timestamp / 1 hours) * 1 hours;
        return historicalPrices[assetId][hourTimestamp];
    }
    
    function isPriceStale(uint256 assetId) external view returns (bool) {
        AggregatedPrice storage aggPrice = aggregatedPrices[assetId];
        return block.timestamp > aggPrice.timestamp + priceValidityPeriod;
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function updateValidityPeriod(uint256 newPeriod) external onlyRole(ADMIN_ROLE) {
        require(newPeriod >= 5 minutes && newPeriod <= 24 hours, "Invalid period");
        priceValidityPeriod = newPeriod;
    }
    
    function deactivateAsset(uint256 assetId) external onlyRole(ADMIN_ROLE) {
        assets[assetId].isActive = false;
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
