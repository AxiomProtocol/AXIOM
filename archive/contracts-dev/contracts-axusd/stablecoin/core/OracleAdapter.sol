// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IOracleAdapter.sol";

interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

contract OracleAdapter is AccessControl, IOracleAdapter {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct FeedConfig {
        address feed;
        uint256 staleThreshold;
        uint8 decimals;
    }

    mapping(address => FeedConfig) public feeds;
    uint256 public constant TARGET_DECIMALS = 18;

    event FeedSet(address indexed collateral, address indexed feed, uint256 staleThreshold);
    event FeedRemoved(address indexed collateral);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function setFeed(
        address collateral,
        address feed,
        uint256 staleThreshold
    ) external override onlyRole(ADMIN_ROLE) {
        require(collateral != address(0), "OracleAdapter: zero collateral address");
        require(feed != address(0), "OracleAdapter: zero feed address");
        require(staleThreshold > 0, "OracleAdapter: zero stale threshold");

        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        require(roundId > 0, "OracleAdapter: invalid round");
        require(answer > 0, "OracleAdapter: invalid price");
        require(answeredInRound >= roundId, "OracleAdapter: stale round");
        require(block.timestamp - updatedAt <= staleThreshold, "OracleAdapter: stale price");

        uint8 feedDecimals = priceFeed.decimals();

        feeds[collateral] = FeedConfig({
            feed: feed,
            staleThreshold: staleThreshold,
            decimals: feedDecimals
        });

        emit FeedSet(collateral, feed, staleThreshold);
    }

    function removeFeed(address collateral) external onlyRole(ADMIN_ROLE) {
        require(feeds[collateral].feed != address(0), "OracleAdapter: feed not set");
        delete feeds[collateral];
        emit FeedRemoved(collateral);
    }

    function getPrice(address collateral) external view override returns (uint256) {
        FeedConfig memory config = feeds[collateral];
        require(config.feed != address(0), "OracleAdapter: feed not configured");

        AggregatorV3Interface priceFeed = AggregatorV3Interface(config.feed);
        
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        require(roundId > 0, "OracleAdapter: invalid round");
        require(answer > 0, "OracleAdapter: zero or negative price");
        require(answeredInRound >= roundId, "OracleAdapter: stale round");
        require(block.timestamp - updatedAt <= config.staleThreshold, "OracleAdapter: stale price");

        if (config.decimals < TARGET_DECIMALS) {
            return uint256(answer) * (10 ** (TARGET_DECIMALS - config.decimals));
        } else if (config.decimals > TARGET_DECIMALS) {
            return uint256(answer) / (10 ** (config.decimals - TARGET_DECIMALS));
        }
        return uint256(answer);
    }

    function isFeedValid(address collateral) external view override returns (bool) {
        FeedConfig memory config = feeds[collateral];
        if (config.feed == address(0)) return false;

        try AggregatorV3Interface(config.feed).latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            if (roundId == 0) return false;
            if (answer <= 0) return false;
            if (answeredInRound < roundId) return false;
            if (block.timestamp - updatedAt > config.staleThreshold) return false;
            return true;
        } catch {
            return false;
        }
    }

    function getFeedConfig(address collateral) external view returns (FeedConfig memory) {
        return feeds[collateral];
    }
}
