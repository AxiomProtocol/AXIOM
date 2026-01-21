// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title AxiomOracleAdapter
 * @author Axiom Protocol
 * @notice Chainlink oracle adapter for price feeds
 * @dev Supports multiple price feeds with staleness checks and fallback logic
 */
contract AxiomOracleAdapter is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_STALENESS = 24 hours;

    struct PriceFeed {
        address feedAddress;
        uint8 decimals;
        uint256 heartbeat;
        bool active;
        string description;
    }

    struct TWAPData {
        uint256[] prices;
        uint256[] timestamps;
        uint256 head;
        uint256 size;
        uint256 maxSize;
    }

    address public treasurySafe;
    uint256 public defaultHeartbeat;

    mapping(address => PriceFeed) public priceFeeds;
    mapping(address => TWAPData) public twapData;
    mapping(address => uint256) public fallbackPrices;
    mapping(address => uint256) public fallbackTimestamps;

    address[] public supportedTokens;
    mapping(address => bool) public isSupported;

    event PriceFeedSet(address indexed token, address indexed feed, uint256 heartbeat);
    event PriceFeedRemoved(address indexed token);
    event FallbackPriceSet(address indexed token, uint256 price);
    event TWAPUpdated(address indexed token, uint256 price, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _treasurySafe) public initializer {
        require(_treasurySafe != address(0), "Zero addr");

        __AccessControl_init();
        __UUPSUpgradeable_init();

        treasurySafe = _treasurySafe;
        defaultHeartbeat = 1 hours;

        _grantRole(DEFAULT_ADMIN_ROLE, _treasurySafe);
        _grantRole(ADMIN_ROLE, _treasurySafe);
        _grantRole(UPGRADER_ROLE, _treasurySafe);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    function setPriceFeed(
        address token,
        address feed,
        uint256 heartbeat,
        string calldata description
    ) external onlyRole(OPERATOR_ROLE) {
        require(token != address(0) && feed != address(0), "Zero addr");

        uint8 decimals = AggregatorV3Interface(feed).decimals();

        priceFeeds[token] = PriceFeed({
            feedAddress: feed,
            decimals: decimals,
            heartbeat: heartbeat > 0 ? heartbeat : defaultHeartbeat,
            active: true,
            description: description
        });

        if (!isSupported[token]) {
            supportedTokens.push(token);
            isSupported[token] = true;
        }

        twapData[token] = TWAPData({
            prices: new uint256[](24),
            timestamps: new uint256[](24),
            head: 0,
            size: 0,
            maxSize: 24
        });

        emit PriceFeedSet(token, feed, heartbeat);
    }

    function removePriceFeed(address token) external onlyRole(OPERATOR_ROLE) {
        require(priceFeeds[token].active, "Feed not active");
        
        priceFeeds[token].active = false;
        
        emit PriceFeedRemoved(token);
    }

    uint256 public minTWAPUpdateInterval;
    mapping(address => uint256) public lastTWAPUpdate;

    function setFallbackPrice(address token, uint256 price) external onlyRole(OPERATOR_ROLE) {
        fallbackPrices[token] = price;
        fallbackTimestamps[token] = block.timestamp;
        
        emit FallbackPriceSet(token, price);
    }

    function setMinTWAPUpdateInterval(uint256 interval) external onlyRole(ADMIN_ROLE) {
        minTWAPUpdateInterval = interval;
    }

    function getPrice(address token) external view returns (uint256 price, uint256 timestamp) {
        PriceFeed storage feed = priceFeeds[token];

        if (feed.active && feed.feedAddress != address(0)) {
            try AggregatorV3Interface(feed.feedAddress).latestRoundData() returns (
                uint80,
                int256 answer,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                if (answer > 0 && block.timestamp - updatedAt <= feed.heartbeat) {
                    price = _normalizePrice(uint256(answer), feed.decimals);
                    timestamp = updatedAt;
                    return (price, timestamp);
                }
            } catch {}
        }

        if (fallbackPrices[token] > 0 && 
            block.timestamp - fallbackTimestamps[token] <= MAX_STALENESS) {
            return (fallbackPrices[token], fallbackTimestamps[token]);
        }

        return (0, 0);
    }

    function getPriceUnsafe(address token) external view returns (uint256 price, uint256 timestamp) {
        PriceFeed storage feed = priceFeeds[token];

        if (feed.active && feed.feedAddress != address(0)) {
            try AggregatorV3Interface(feed.feedAddress).latestRoundData() returns (
                uint80,
                int256 answer,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                if (answer > 0) {
                    price = _normalizePrice(uint256(answer), feed.decimals);
                    timestamp = updatedAt;
                    return (price, timestamp);
                }
            } catch {}
        }

        return (fallbackPrices[token], fallbackTimestamps[token]);
    }

    function updateTWAP(address token) external onlyRole(OPERATOR_ROLE) {
        require(block.timestamp >= lastTWAPUpdate[token] + minTWAPUpdateInterval, "Update too frequent");
        
        (uint256 price, uint256 timestamp) = this.getPrice(token);
        require(price > 0, "No price");

        TWAPData storage data = twapData[token];

        data.prices[data.head] = price;
        data.timestamps[data.head] = timestamp;
        data.head = (data.head + 1) % data.maxSize;
        
        if (data.size < data.maxSize) {
            data.size++;
        }

        lastTWAPUpdate[token] = block.timestamp;

        emit TWAPUpdated(token, price, timestamp);
    }

    function getTWAP(address token, uint256 period) external view returns (uint256) {
        TWAPData storage data = twapData[token];
        
        if (data.size == 0) {
            (uint256 currentPrice,) = this.getPrice(token);
            return currentPrice;
        }

        uint256 sum = 0;
        uint256 count = 0;
        uint256 cutoff = block.timestamp > period ? block.timestamp - period : 0;

        for (uint256 i = 0; i < data.size; i++) {
            uint256 idx = (data.head + data.maxSize - 1 - i) % data.maxSize;
            
            if (data.timestamps[idx] >= cutoff) {
                sum += data.prices[idx];
                count++;
            } else {
                break;
            }
        }

        if (count == 0) {
            (uint256 currentPrice,) = this.getPrice(token);
            return currentPrice;
        }

        return sum / count;
    }

    function getMultiplePrices(address[] calldata tokens) external view returns (
        uint256[] memory prices,
        uint256[] memory timestamps
    ) {
        prices = new uint256[](tokens.length);
        timestamps = new uint256[](tokens.length);

        for (uint256 i = 0; i < tokens.length; i++) {
            (prices[i], timestamps[i]) = this.getPrice(tokens[i]);
        }
    }

    function isPriceValid(address token) external view returns (bool) {
        PriceFeed storage feed = priceFeeds[token];

        if (!feed.active || feed.feedAddress == address(0)) {
            return fallbackPrices[token] > 0 && 
                   block.timestamp - fallbackTimestamps[token] <= MAX_STALENESS;
        }

        try AggregatorV3Interface(feed.feedAddress).latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            return answer > 0 && block.timestamp - updatedAt <= feed.heartbeat;
        } catch {
            return false;
        }
    }

    function _normalizePrice(uint256 price, uint8 decimals) internal pure returns (uint256) {
        if (decimals < 18) {
            return price * (10 ** (18 - decimals));
        } else if (decimals > 18) {
            return price / (10 ** (decimals - 18));
        }
        return price;
    }

    function setDefaultHeartbeat(uint256 heartbeat) external onlyRole(ADMIN_ROLE) {
        defaultHeartbeat = heartbeat;
    }

    function getPriceFeed(address token) external view returns (PriceFeed memory) {
        return priceFeeds[token];
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    function getTWAPData(address token) external view returns (
        uint256[] memory prices,
        uint256[] memory timestamps,
        uint256 size
    ) {
        TWAPData storage data = twapData[token];
        return (data.prices, data.timestamps, data.size);
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    uint256[40] private __gap;
}
