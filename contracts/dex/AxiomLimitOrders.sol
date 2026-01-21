// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAxiomExchangeHubOrders {
    function swap(uint256 poolId, address tokenIn, uint256 amountIn, uint256 minAmountOut, uint256 deadline) external returns (uint256);
    function getAmountOut(uint256 poolId, address tokenIn, uint256 amountIn) external view returns (uint256);
    function getPoolCore(uint256 poolId) external view returns (
        address tokenA, address tokenB, uint256 reserveA, uint256 reserveB,
        uint256 totalLiquidity, uint256 lockedLiquidity, bool isActive
    );
    function pairToPoolId(address tokenA, address tokenB) external view returns (uint256);
}

interface IAxiomOracleAdapter {
    function getPrice(address token) external view returns (uint256 price, uint256 timestamp);
    function getTWAP(address token, uint256 period) external view returns (uint256);
}

/**
 * @title AxiomLimitOrders
 * @author Axiom Protocol
 * @notice On-chain limit order book with oracle price validation
 * @dev Orders are stored on-chain and executed by keepers when price conditions are met
 */
contract AxiomLimitOrders is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant PRECISION = 1e18;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_ORDERS_PER_USER = 20;

    enum OrderType { LIMIT_BUY, LIMIT_SELL, STOP_LOSS, TAKE_PROFIT }
    enum OrderStatus { PENDING, FILLED, CANCELLED, EXPIRED }

    struct Order {
        uint256 orderId;
        address owner;
        uint256 poolId;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 targetPrice;
        uint256 minAmountOut;
        OrderType orderType;
        OrderStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 filledAt;
        uint256 amountReceived;
    }

    address public exchangeHub;
    address public oracleAdapter;
    address public treasurySafe;

    uint256 public nextOrderId;
    uint256 public executionFee;
    uint256 public maxPriceDeviation;
    uint256 public minOrderDuration;
    uint256 public maxOrderDuration;

    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(address => uint256) public userActiveOrderCount;

    uint256[] public pendingOrderIds;
    mapping(uint256 => uint256) public pendingOrderIndex;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed owner,
        OrderType orderType,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 targetPrice
    );
    event OrderFilled(uint256 indexed orderId, address indexed owner, uint256 amountIn, uint256 amountReceived);
    event OrderCancelled(uint256 indexed orderId, address indexed owner);
    event OrderExpired(uint256 indexed orderId);
    event ExecutionFeeUpdated(uint256 oldFee, uint256 newFee);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _exchangeHub,
        address _oracleAdapter,
        address _treasurySafe,
        uint256 _executionFee
    ) public initializer {
        require(_exchangeHub != address(0) && _treasurySafe != address(0), "Zero addr");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        exchangeHub = _exchangeHub;
        oracleAdapter = _oracleAdapter;
        treasurySafe = _treasurySafe;
        executionFee = _executionFee;
        
        maxPriceDeviation = 500;
        minOrderDuration = 5 minutes;
        maxOrderDuration = 30 days;
        nextOrderId = 1;

        _grantRole(DEFAULT_ADMIN_ROLE, _treasurySafe);
        _grantRole(ADMIN_ROLE, _treasurySafe);
        _grantRole(UPGRADER_ROLE, _treasurySafe);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
    }

    function createOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 targetPrice,
        uint256 minAmountOut,
        OrderType orderType,
        uint256 duration
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        require(msg.value >= executionFee, "Insufficient fee");
        require(amountIn > 0, "Zero amount");
        require(targetPrice > 0, "Zero price");
        require(duration >= minOrderDuration && duration <= maxOrderDuration, "Invalid duration");
        require(userActiveOrderCount[msg.sender] < MAX_ORDERS_PER_USER, "Too many orders");

        uint256 poolId = IAxiomExchangeHubOrders(exchangeHub).pairToPoolId(tokenIn, tokenOut);
        require(poolId > 0, "Pool not found");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 orderId = nextOrderId++;
        
        orders[orderId] = Order({
            orderId: orderId,
            owner: msg.sender,
            poolId: poolId,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            targetPrice: targetPrice,
            minAmountOut: minAmountOut,
            orderType: orderType,
            status: OrderStatus.PENDING,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + duration,
            filledAt: 0,
            amountReceived: 0
        });

        userOrders[msg.sender].push(orderId);
        userActiveOrderCount[msg.sender]++;

        pendingOrderIndex[orderId] = pendingOrderIds.length;
        pendingOrderIds.push(orderId);

        if (msg.value > executionFee) {
            payable(msg.sender).transfer(msg.value - executionFee);
        }

        emit OrderCreated(orderId, msg.sender, orderType, tokenIn, tokenOut, amountIn, targetPrice);

        return orderId;
    }

    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.owner == msg.sender, "Not owner");
        require(order.status == OrderStatus.PENDING, "Not pending");

        order.status = OrderStatus.CANCELLED;
        userActiveOrderCount[msg.sender]--;

        _removePendingOrder(orderId);

        IERC20(order.tokenIn).safeTransfer(msg.sender, order.amountIn);

        emit OrderCancelled(orderId, msg.sender);
    }

    function executeOrder(uint256 orderId) external nonReentrant onlyRole(KEEPER_ROLE) {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PENDING, "Not pending");

        if (block.timestamp > order.expiresAt) {
            order.status = OrderStatus.EXPIRED;
            userActiveOrderCount[order.owner]--;
            _removePendingOrder(orderId);
            
            IERC20(order.tokenIn).safeTransfer(order.owner, order.amountIn);
            emit OrderExpired(orderId);
            return;
        }

        require(_checkPriceCondition(order), "Price condition not met");

        IERC20(order.tokenIn).forceApprove(exchangeHub, order.amountIn);
        
        uint256 amountReceived = IAxiomExchangeHubOrders(exchangeHub).swap(
            order.poolId,
            order.tokenIn,
            order.amountIn,
            order.minAmountOut,
            block.timestamp + 60
        );

        order.status = OrderStatus.FILLED;
        order.filledAt = block.timestamp;
        order.amountReceived = amountReceived;
        userActiveOrderCount[order.owner]--;

        _removePendingOrder(orderId);

        IERC20(order.tokenOut).safeTransfer(order.owner, amountReceived);

        payable(msg.sender).transfer(executionFee);

        emit OrderFilled(orderId, order.owner, order.amountIn, amountReceived);
    }

    function batchExecuteOrders(uint256[] calldata orderIds) external nonReentrant onlyRole(KEEPER_ROLE) {
        uint256 executedCount = 0;
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            
            if (order.status != OrderStatus.PENDING) continue;

            if (block.timestamp > order.expiresAt) {
                order.status = OrderStatus.EXPIRED;
                userActiveOrderCount[order.owner]--;
                _removePendingOrder(orderIds[i]);
                IERC20(order.tokenIn).safeTransfer(order.owner, order.amountIn);
                emit OrderExpired(orderIds[i]);
                continue;
            }

            if (!_checkPriceCondition(order)) continue;

            IERC20(order.tokenIn).forceApprove(exchangeHub, order.amountIn);
            
            try IAxiomExchangeHubOrders(exchangeHub).swap(
                order.poolId,
                order.tokenIn,
                order.amountIn,
                order.minAmountOut,
                block.timestamp + 60
            ) returns (uint256 amountReceived) {
                order.status = OrderStatus.FILLED;
                order.filledAt = block.timestamp;
                order.amountReceived = amountReceived;
                userActiveOrderCount[order.owner]--;
                executedCount++;

                _removePendingOrder(orderIds[i]);

                IERC20(order.tokenOut).safeTransfer(order.owner, amountReceived);

                emit OrderFilled(orderIds[i], order.owner, order.amountIn, amountReceived);
            } catch {
                continue;
            }
        }

        uint256 totalFee = executionFee * executedCount;
        if (executedCount > 0 && address(this).balance >= totalFee) {
            payable(msg.sender).transfer(totalFee);
        }
    }

    function _checkPriceCondition(Order storage order) internal view returns (bool) {
        uint256 currentOutput = IAxiomExchangeHubOrders(exchangeHub).getAmountOut(
            order.poolId,
            order.tokenIn,
            order.amountIn
        );
        
        uint256 currentPrice = (currentOutput * PRECISION) / order.amountIn;

        if (oracleAdapter != address(0)) {
            (uint256 oraclePriceIn,) = IAxiomOracleAdapter(oracleAdapter).getPrice(order.tokenIn);
            (uint256 oraclePriceOut,) = IAxiomOracleAdapter(oracleAdapter).getPrice(order.tokenOut);
            
            if (oraclePriceIn > 0 && oraclePriceOut > 0) {
                uint256 oracleRatio = (oraclePriceOut * PRECISION) / oraclePriceIn;
                uint256 ammRatio = currentPrice;
                
                uint256 deviation = ammRatio > oracleRatio 
                    ? ((ammRatio - oracleRatio) * BASIS_POINTS) / oracleRatio
                    : ((oracleRatio - ammRatio) * BASIS_POINTS) / oracleRatio;
                
                if (deviation > maxPriceDeviation) {
                    return false;
                }
            }
        }

        if (order.orderType == OrderType.LIMIT_BUY || order.orderType == OrderType.TAKE_PROFIT) {
            return currentPrice >= order.targetPrice;
        } else if (order.orderType == OrderType.LIMIT_SELL || order.orderType == OrderType.STOP_LOSS) {
            return currentPrice <= order.targetPrice;
        }

        return false;
    }

    function _removePendingOrder(uint256 orderId) internal {
        uint256 index = pendingOrderIndex[orderId];
        uint256 lastIndex = pendingOrderIds.length - 1;

        if (index != lastIndex) {
            uint256 lastOrderId = pendingOrderIds[lastIndex];
            pendingOrderIds[index] = lastOrderId;
            pendingOrderIndex[lastOrderId] = index;
        }

        pendingOrderIds.pop();
        delete pendingOrderIndex[orderId];
    }

    function setExecutionFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        emit ExecutionFeeUpdated(executionFee, newFee);
        executionFee = newFee;
    }

    function setOracleAdapter(address newOracle) external onlyRole(ADMIN_ROLE) {
        oracleAdapter = newOracle;
    }

    function setMaxPriceDeviation(uint256 deviation) external onlyRole(ADMIN_ROLE) {
        require(deviation <= 2000, "Too high");
        maxPriceDeviation = deviation;
    }

    function setOrderDurationLimits(uint256 minDuration, uint256 maxDuration) external onlyRole(ADMIN_ROLE) {
        minOrderDuration = minDuration;
        maxOrderDuration = maxDuration;
    }

    function grantKeeperRole(address keeper) external onlyRole(ADMIN_ROLE) {
        _grantRole(KEEPER_ROLE, keeper);
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }

    function getPendingOrders() external view returns (uint256[] memory) {
        return pendingOrderIds;
    }

    function getExecutableOrders(uint256 limit) external view returns (uint256[] memory) {
        uint256[] memory executable = new uint256[](limit);
        uint256 count = 0;

        for (uint256 i = 0; i < pendingOrderIds.length && count < limit; i++) {
            uint256 orderId = pendingOrderIds[i];
            Order storage order = orders[orderId];

            if (order.status == OrderStatus.PENDING && block.timestamp <= order.expiresAt) {
                if (_checkPriceCondition(order)) {
                    executable[count++] = orderId;
                }
            }
        }

        assembly { mstore(executable, count) }
        return executable;
    }

    function withdrawFees() external onlyRole(ADMIN_ROLE) {
        payable(treasurySafe).transfer(address(this).balance);
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    receive() external payable {}

    uint256[40] private __gap;
}
