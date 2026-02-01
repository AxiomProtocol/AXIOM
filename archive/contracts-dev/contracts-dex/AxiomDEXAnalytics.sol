// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IAxiomExchangeHubAnalytics {
    function getPoolCore(uint256 poolId) external view returns (
        address tokenA, address tokenB, uint256 reserveA, uint256 reserveB,
        uint256 totalLiquidity, uint256 lockedLiquidity, bool isActive
    );
    function getPoolMeta(uint256 poolId) external view returns (
        uint256 createdAt, uint256 totalVolume, uint256 totalFees, uint256 poolFee
    );
    function totalPools() external view returns (uint256);
    function totalSwaps() external view returns (uint256);
    function poolFeeReserveA(uint256 poolId) external view returns (uint256);
    function poolFeeReserveB(uint256 poolId) external view returns (uint256);
}

/**
 * @title AxiomDEXAnalytics
 * @author Axiom Protocol
 * @notice On-chain analytics for DEX metrics (TVL, volume, fees)
 * @dev Aggregates data from ExchangeHub for dashboards and monitoring
 */
contract AxiomDEXAnalytics is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant PRECISION = 1e18;

    struct DailySnapshot {
        uint256 timestamp;
        uint256 totalTVL;
        uint256 totalVolume24h;
        uint256 totalFees24h;
        uint256 activePools;
        uint256 totalSwaps;
    }

    struct PoolSnapshot {
        uint256 timestamp;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        uint256 volume24h;
        uint256 fees24h;
        uint256 apr;
    }

    struct GlobalMetrics {
        uint256 totalTVL;
        uint256 activePools;
        uint256 totalVolume24h;
        uint256 totalFees24h;
        uint256 totalSwaps;
        uint256 historicalVolume;
        uint256 historicalFees;
    }

    struct PoolMetrics {
        uint256 tvl;
        uint256 volume24h;
        uint256 fees24h;
        uint256 apr;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
    }

    address public exchangeHub;
    address public treasurySafe;

    mapping(address => uint256) public tokenPrices;
    mapping(uint256 => DailySnapshot[]) public dailySnapshots;
    mapping(uint256 => mapping(uint256 => PoolSnapshot[])) public poolSnapshots;

    uint256 public lastGlobalSnapshotTime;
    uint256 public snapshotInterval;

    uint256 public totalHistoricalVolume;
    uint256 public totalHistoricalFees;

    mapping(uint256 => uint256) public poolVolumeLast24h;
    mapping(uint256 => uint256) public poolFeesLast24h;
    mapping(uint256 => uint256) public poolLastVolumeUpdate;

    event GlobalSnapshotTaken(uint256 indexed day, uint256 totalTVL, uint256 volume24h, uint256 fees24h);
    event PoolSnapshotTaken(uint256 indexed poolId, uint256 indexed day, uint256 tvl, uint256 volume24h);
    event VolumeRecorded(uint256 indexed poolId, uint256 volume, uint256 fees);
    event TokenPriceUpdated(address indexed token, uint256 price);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _exchangeHub,
        address _treasurySafe
    ) public initializer {
        require(_exchangeHub != address(0) && _treasurySafe != address(0), "Zero addr");

        __AccessControl_init();
        __UUPSUpgradeable_init();

        exchangeHub = _exchangeHub;
        treasurySafe = _treasurySafe;
        snapshotInterval = 1 days;

        _grantRole(DEFAULT_ADMIN_ROLE, _treasurySafe);
        _grantRole(ADMIN_ROLE, _treasurySafe);
        _grantRole(UPGRADER_ROLE, _treasurySafe);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    function recordSwapVolume(uint256 poolId, uint256 volume, uint256 fees) external onlyRole(OPERATOR_ROLE) {
        if (block.timestamp >= poolLastVolumeUpdate[poolId] + 24 hours) {
            poolVolumeLast24h[poolId] = 0;
            poolFeesLast24h[poolId] = 0;
        }

        poolVolumeLast24h[poolId] += volume;
        poolFeesLast24h[poolId] += fees;
        poolLastVolumeUpdate[poolId] = block.timestamp;

        totalHistoricalVolume += volume;
        totalHistoricalFees += fees;

        emit VolumeRecorded(poolId, volume, fees);
    }

    function takeGlobalSnapshot() external onlyRole(OPERATOR_ROLE) {
        require(block.timestamp >= lastGlobalSnapshotTime + snapshotInterval, "Too soon");

        uint256 day = block.timestamp / 1 days;
        
        (uint256 totalTVL, uint256 activePools) = _calculateTotalTVL();
        uint256 totalVolume24h = _calculateTotalVolume24h();
        uint256 totalFees24h = _calculateTotalFees24h();
        uint256 totalSwaps = IAxiomExchangeHubAnalytics(exchangeHub).totalSwaps();

        DailySnapshot memory snapshot = DailySnapshot({
            timestamp: block.timestamp,
            totalTVL: totalTVL,
            totalVolume24h: totalVolume24h,
            totalFees24h: totalFees24h,
            activePools: activePools,
            totalSwaps: totalSwaps
        });

        dailySnapshots[day].push(snapshot);
        lastGlobalSnapshotTime = block.timestamp;

        emit GlobalSnapshotTaken(day, totalTVL, totalVolume24h, totalFees24h);
    }

    function takePoolSnapshot(uint256 poolId) external onlyRole(OPERATOR_ROLE) {
        uint256 day = block.timestamp / 1 days;

        (address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, 
         uint256 totalLiquidity,, bool isActive) = IAxiomExchangeHubAnalytics(exchangeHub).getPoolCore(poolId);
        
        require(isActive, "Pool not active");

        uint256 tvl = _calculatePoolTVL(tokenA, tokenB, reserveA, reserveB);
        uint256 volume24h = poolVolumeLast24h[poolId];
        uint256 fees24h = poolFeesLast24h[poolId];
        uint256 apr = _calculateAPR(tvl, fees24h);

        PoolSnapshot memory snapshot = PoolSnapshot({
            timestamp: block.timestamp,
            reserveA: reserveA,
            reserveB: reserveB,
            totalLiquidity: totalLiquidity,
            volume24h: volume24h,
            fees24h: fees24h,
            apr: apr
        });

        poolSnapshots[poolId][day].push(snapshot);

        emit PoolSnapshotTaken(poolId, day, tvl, volume24h);
    }

    function setTokenPrice(address token, uint256 price) external onlyRole(OPERATOR_ROLE) {
        tokenPrices[token] = price;
        emit TokenPriceUpdated(token, price);
    }

    function setTokenPrices(address[] calldata tokens, uint256[] calldata prices) external onlyRole(OPERATOR_ROLE) {
        require(tokens.length == prices.length, "Length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenPrices[tokens[i]] = prices[i];
            emit TokenPriceUpdated(tokens[i], prices[i]);
        }
    }

    function setSnapshotInterval(uint256 interval) external onlyRole(ADMIN_ROLE) {
        snapshotInterval = interval;
    }

    function getTotalTVL() external view returns (uint256 tvl, uint256 activePools) {
        return _calculateTotalTVL();
    }

    function getPoolTVL(uint256 poolId) external view returns (uint256) {
        (address tokenA, address tokenB, uint256 reserveA, uint256 reserveB,,, bool isActive) = 
            IAxiomExchangeHubAnalytics(exchangeHub).getPoolCore(poolId);
        
        if (!isActive) return 0;
        return _calculatePoolTVL(tokenA, tokenB, reserveA, reserveB);
    }

    function getPoolAPR(uint256 poolId) external view returns (uint256) {
        (address tokenA, address tokenB, uint256 reserveA, uint256 reserveB,,, bool isActive) = 
            IAxiomExchangeHubAnalytics(exchangeHub).getPoolCore(poolId);
        
        if (!isActive) return 0;

        uint256 tvl = _calculatePoolTVL(tokenA, tokenB, reserveA, reserveB);
        uint256 fees24h = poolFeesLast24h[poolId];
        
        return _calculateAPR(tvl, fees24h);
    }

    function getGlobalMetrics() external view returns (GlobalMetrics memory metrics) {
        (metrics.totalTVL, metrics.activePools) = _calculateTotalTVL();
        metrics.totalVolume24h = _calculateTotalVolume24h();
        metrics.totalFees24h = _calculateTotalFees24h();
        metrics.totalSwaps = IAxiomExchangeHubAnalytics(exchangeHub).totalSwaps();
        metrics.historicalVolume = totalHistoricalVolume;
        metrics.historicalFees = totalHistoricalFees;
    }

    function getPoolMetrics(uint256 poolId) external view returns (PoolMetrics memory metrics) {
        (address tokenA, address tokenB, uint256 resA, uint256 resB, 
         uint256 liq,, bool isActive) = IAxiomExchangeHubAnalytics(exchangeHub).getPoolCore(poolId);
        
        if (!isActive) return metrics;

        metrics.reserveA = resA;
        metrics.reserveB = resB;
        metrics.totalLiquidity = liq;
        metrics.tvl = _calculatePoolTVL(tokenA, tokenB, resA, resB);
        metrics.volume24h = poolVolumeLast24h[poolId];
        metrics.fees24h = poolFeesLast24h[poolId];
        metrics.apr = _calculateAPR(metrics.tvl, metrics.fees24h);
    }

    function getDailySnapshots(uint256 day) external view returns (DailySnapshot[] memory) {
        return dailySnapshots[day];
    }

    function getPoolSnapshots(uint256 poolId, uint256 day) external view returns (PoolSnapshot[] memory) {
        return poolSnapshots[poolId][day];
    }

    function _calculateTotalTVL() internal view returns (uint256 totalTVL, uint256 activePools) {
        uint256 numPools = IAxiomExchangeHubAnalytics(exchangeHub).totalPools();
        
        for (uint256 i = 1; i <= numPools; i++) {
            (address tokenA, address tokenB, uint256 reserveA, uint256 reserveB,,, bool isActive) = 
                IAxiomExchangeHubAnalytics(exchangeHub).getPoolCore(i);
            
            if (isActive) {
                activePools++;
                totalTVL += _calculatePoolTVL(tokenA, tokenB, reserveA, reserveB);
            }
        }
    }

    function _calculatePoolTVL(
        address tokenA,
        address tokenB,
        uint256 reserveA,
        uint256 reserveB
    ) internal view returns (uint256) {
        uint256 priceA = tokenPrices[tokenA];
        uint256 priceB = tokenPrices[tokenB];
        
        uint256 valueA = priceA > 0 ? (reserveA * priceA) / PRECISION : 0;
        uint256 valueB = priceB > 0 ? (reserveB * priceB) / PRECISION : 0;
        
        return valueA + valueB;
    }

    function _calculateTotalVolume24h() internal view returns (uint256 total) {
        uint256 numPools = IAxiomExchangeHubAnalytics(exchangeHub).totalPools();
        
        for (uint256 i = 1; i <= numPools; i++) {
            if (block.timestamp < poolLastVolumeUpdate[i] + 24 hours) {
                total += poolVolumeLast24h[i];
            }
        }
    }

    function _calculateTotalFees24h() internal view returns (uint256 total) {
        uint256 numPools = IAxiomExchangeHubAnalytics(exchangeHub).totalPools();
        
        for (uint256 i = 1; i <= numPools; i++) {
            if (block.timestamp < poolLastVolumeUpdate[i] + 24 hours) {
                total += poolFeesLast24h[i];
            }
        }
    }

    function _calculateAPR(uint256 tvl, uint256 fees24h) internal pure returns (uint256) {
        if (tvl == 0) return 0;
        return (fees24h * 365 * PRECISION) / tvl;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    uint256[40] private __gap;
}
