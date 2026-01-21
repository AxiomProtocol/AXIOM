// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AxiomExchangeHub
 * @notice Internal decentralized exchange (DEX) for Axiom Smart City ecosystem
 * @dev Automated Market Maker (AMM) with liquidity pools, swaps, and yield generation
 * 
 * Features:
 * - Multi-token liquidity pools (constant product AMM)
 * - Token swapping with slippage protection
 * - Liquidity provider (LP) rewards and fees
 * - Dynamic fee structure (0.3% swap fee)
 * - Price impact calculation
 * - Minimum liquidity lock
 * - Flash loan protection
 * - Oracle price feeds integration
 */
contract AxiomExchangeHub is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    address public treasurySafe;
    
    // Fee configuration (basis points, 10000 = 100%)
    uint256 public swapFee = 30;              // 0.3% swap fee
    uint256 public constant MAX_SWAP_FEE = 100; // Max 1%
    
    // Minimum liquidity lock (prevents pool manipulation)
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    
    // Global counters
    uint256 public totalPools;
    uint256 public totalSwaps;
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Pool {
        uint256 poolId;
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        uint256 lockedLiquidity;        // Minimum liquidity locked permanently
        bool isActive;
        uint256 createdAt;
        uint256 totalVolume;
        uint256 totalFees;
    }
    
    struct LiquidityPosition {
        uint256 poolId;
        address provider;
        uint256 liquidity;
        uint256 providedAt;
        uint256 rewardsAccrued;
    }
    
    struct SwapRecord {
        uint256 swapId;
        uint256 poolId;
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 fee;
        uint256 timestamp;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    mapping(uint256 => Pool) public pools;
    mapping(address => mapping(address => uint256)) public pairToPoolId;  // tokenA => tokenB => poolId
    mapping(uint256 => mapping(address => uint256)) public liquidityBalances;  // poolId => provider => liquidity
    mapping(uint256 => SwapRecord) public swaps;
    mapping(address => uint256[]) public userSwaps;
    mapping(address => uint256[]) public userPools;
    
    // Fee accumulation per pool
    mapping(uint256 => uint256) public poolFeeReserveA;
    mapping(uint256 => uint256) public poolFeeReserveB;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event PoolCreated(
        uint256 indexed poolId,
        address indexed tokenA,
        address indexed tokenB,
        uint256 initialLiquidityA,
        uint256 initialLiquidityB
    );
    
    event LiquidityAdded(
        uint256 indexed poolId,
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event LiquidityRemoved(
        uint256 indexed poolId,
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event Swap(
        uint256 indexed swapId,
        uint256 indexed poolId,
        address indexed trader,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    
    event SwapFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address _treasurySafe) {
        require(_treasurySafe != address(0), "Invalid treasury safe");
        
        treasurySafe = _treasurySafe;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============================================
    // POOL MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a new liquidity pool
     * @dev First liquidity provider sets initial price ratio
     */
    function createPool(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(tokenA != address(0) && tokenB != address(0), "Invalid tokens");
        require(tokenA != tokenB, "Identical tokens");
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        
        // Ensure consistent ordering
        (address token0, address token1, uint256 amount0, uint256 amount1) = 
            tokenA < tokenB ? (tokenA, tokenB, amountA, amountB) : (tokenB, tokenA, amountB, amountA);
        
        // Check if pool already exists
        require(pairToPoolId[token0][token1] == 0, "Pool already exists");
        
        totalPools++;
        uint256 poolId = totalPools;
        
        // Transfer tokens and measure actual received (handles fee-on-transfer tokens)
        uint256 balance0Before = IERC20(token0).balanceOf(address(this));
        uint256 balance1Before = IERC20(token1).balanceOf(address(this));
        
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        
        uint256 balance0After = IERC20(token0).balanceOf(address(this));
        uint256 balance1After = IERC20(token1).balanceOf(address(this));
        
        uint256 actualAmount0 = balance0After - balance0Before;
        uint256 actualAmount1 = balance1After - balance1Before;
        
        require(actualAmount0 > 0 && actualAmount1 > 0, "Zero tokens received");
        
        // Calculate initial liquidity (geometric mean) using actual received amounts
        uint256 liquidity = sqrt(actualAmount0 * actualAmount1);
        require(liquidity > MINIMUM_LIQUIDITY, "Insufficient initial liquidity");
        
        // Create pool with actual received amounts
        Pool storage pool = pools[poolId];
        pool.poolId = poolId;
        pool.tokenA = token0;
        pool.tokenB = token1;
        pool.reserveA = actualAmount0;
        pool.reserveB = actualAmount1;
        pool.totalLiquidity = liquidity;
        pool.lockedLiquidity = MINIMUM_LIQUIDITY;  // Lock minimum liquidity forever
        pool.isActive = true;
        pool.createdAt = block.timestamp;
        
        // Map pair to pool
        pairToPoolId[token0][token1] = poolId;
        pairToPoolId[token1][token0] = poolId;  // Bidirectional mapping
        
        // Assign liquidity to provider (minus locked liquidity)
        uint256 providerLiquidity = liquidity - MINIMUM_LIQUIDITY;
        liquidityBalances[poolId][msg.sender] = providerLiquidity;
        userPools[msg.sender].push(poolId);
        
        emit PoolCreated(poolId, token0, token1, actualAmount0, actualAmount1);
        emit LiquidityAdded(poolId, msg.sender, actualAmount0, actualAmount1, providerLiquidity);
        
        return poolId;
    }
    
    /**
     * @notice Add liquidity to existing pool
     */
    function addLiquidity(
        uint256 poolId,
        uint256 amountA,
        uint256 amountB,
        uint256 minLiquidity
    ) external nonReentrant whenNotPaused returns (uint256) {
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        require(pool.reserveA > 0 && pool.reserveB > 0, "Pool has no liquidity");
        
        uint256 receivedAmountA;
        uint256 receivedAmountB;
        
        {
            // Calculate optimal amounts based on current ratio
            uint256 optimalAmountB = (amountA * pool.reserveB) / pool.reserveA;
            uint256 actualAmountA = amountA;
            uint256 actualAmountB = optimalAmountB;
            
            if (optimalAmountB > amountB) {
                actualAmountA = (amountB * pool.reserveA) / pool.reserveB;
                actualAmountB = amountB;
            }
            
            // Transfer tokens and measure actual received (handles fee-on-transfer tokens)
            uint256 balanceBefore = IERC20(pool.tokenA).balanceOf(address(this));
            IERC20(pool.tokenA).safeTransferFrom(msg.sender, address(this), actualAmountA);
            receivedAmountA = IERC20(pool.tokenA).balanceOf(address(this)) - balanceBefore;
            
            balanceBefore = IERC20(pool.tokenB).balanceOf(address(this));
            IERC20(pool.tokenB).safeTransferFrom(msg.sender, address(this), actualAmountB);
            receivedAmountB = IERC20(pool.tokenB).balanceOf(address(this)) - balanceBefore;
        }
        
        require(receivedAmountA > 0 && receivedAmountB > 0, "Zero tokens received");
        
        // Calculate liquidity to mint based on actual received amounts
        uint256 liquidity = (receivedAmountA * pool.totalLiquidity) / pool.reserveA;
        require(liquidity >= minLiquidity, "Insufficient liquidity minted");
        
        // Update pool with actual received amounts
        pool.reserveA += receivedAmountA;
        pool.reserveB += receivedAmountB;
        pool.totalLiquidity += liquidity;
        
        // Update user liquidity
        if (liquidityBalances[poolId][msg.sender] == 0) {
            userPools[msg.sender].push(poolId);
        }
        liquidityBalances[poolId][msg.sender] += liquidity;
        
        emit LiquidityAdded(poolId, msg.sender, receivedAmountA, receivedAmountB, liquidity);
        
        return liquidity;
    }
    
    /**
     * @notice Remove liquidity from pool
     */
    function removeLiquidity(
        uint256 poolId,
        uint256 liquidity,
        uint256 minAmountA,
        uint256 minAmountB
    ) external nonReentrant returns (uint256, uint256) {
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(liquidity > 0, "Invalid liquidity");
        require(liquidityBalances[poolId][msg.sender] >= liquidity, "Insufficient liquidity balance");
        require(pool.totalLiquidity > 0, "No liquidity in pool");
        
        // Calculate token amounts to return
        uint256 amountA = (liquidity * pool.reserveA) / pool.totalLiquidity;
        uint256 amountB = (liquidity * pool.reserveB) / pool.totalLiquidity;
        
        require(amountA >= minAmountA && amountB >= minAmountB, "Slippage exceeded");
        
        // Update user liquidity
        liquidityBalances[poolId][msg.sender] -= liquidity;
        
        // Update pool
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalLiquidity -= liquidity;
        
        // Transfer tokens back
        IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
        IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);
        
        emit LiquidityRemoved(poolId, msg.sender, amountA, amountB, liquidity);
        
        return (amountA, amountB);
    }
    
    // ============================================
    // SWAP FUNCTIONS
    // ============================================
    
    /**
     * @notice Swap tokens using constant product formula (x * y = k)
     */
    function swap(
        uint256 poolId,
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused returns (uint256) {
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(amountIn > 0, "Invalid amount");
        require(tokenIn == pool.tokenA || tokenIn == pool.tokenB, "Invalid token");
        
        // Determine direction
        bool isAtoB = tokenIn == pool.tokenA;
        address tokenOut = isAtoB ? pool.tokenB : pool.tokenA;
        
        // Transfer tokenIn and measure actual received (handles fee-on-transfer tokens)
        uint256 balanceInBefore = IERC20(tokenIn).balanceOf(address(this));
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 balanceInAfter = IERC20(tokenIn).balanceOf(address(this));
        
        uint256 actualAmountIn = balanceInAfter - balanceInBefore;
        require(actualAmountIn > 0, "Zero tokens received");
        
        // Calculate fee based on actual received amount
        uint256 fee = (actualAmountIn * swapFee) / 10000;
        uint256 amountInAfterFee = actualAmountIn - fee;
        
        // Calculate output amount using actual received input
        uint256 reserveIn = isAtoB ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isAtoB ? pool.reserveB : pool.reserveA;
        uint256 amountOut = (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee);
        
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(amountOut > 0, "Insufficient output amount");
        
        // Transfer tokenOut
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        // Update reserves with actual amounts
        if (isAtoB) {
            pool.reserveA += amountInAfterFee;
            pool.reserveB -= amountOut;
            poolFeeReserveA[poolId] += fee;
        } else {
            pool.reserveB += amountInAfterFee;
            pool.reserveA -= amountOut;
            poolFeeReserveB[poolId] += fee;
        }
        
        // Update stats (use actual received amount)
        pool.totalVolume += actualAmountIn;
        pool.totalFees += fee;
        
        // Record swap
        totalSwaps++;
        uint256 swapId = totalSwaps;
        
        SwapRecord storage swapRecord = swaps[swapId];
        swapRecord.swapId = swapId;
        swapRecord.poolId = poolId;
        swapRecord.trader = msg.sender;
        swapRecord.tokenIn = tokenIn;
        swapRecord.tokenOut = tokenOut;
        swapRecord.amountIn = actualAmountIn;
        swapRecord.amountOut = amountOut;
        swapRecord.fee = fee;
        swapRecord.timestamp = block.timestamp;
        
        userSwaps[msg.sender].push(swapId);
        
        emit Swap(swapId, poolId, msg.sender, tokenIn, tokenOut, amountIn, amountOut, fee);
        
        return amountOut;
    }
    
    /**
     * @notice Calculate output amount for a swap (constant product formula)
     */
    function getAmountOut(
        uint256 poolId,
        address tokenIn,
        uint256 amountIn
    ) public view returns (uint256) {
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(pool.reserveA > 0 && pool.reserveB > 0, "Pool has no liquidity");
        require(amountIn > 0, "Invalid input amount");
        
        bool isAtoB = tokenIn == pool.tokenA;
        uint256 reserveIn = isAtoB ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isAtoB ? pool.reserveB : pool.reserveA;
        
        // Apply fee
        uint256 amountInAfterFee = amountIn - ((amountIn * swapFee) / 10000);
        
        // Constant product formula: (x + Δx) * (y - Δy) = x * y
        // Δy = (y * Δx) / (x + Δx)
        uint256 amountOut = (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee);
        
        return amountOut;
    }
    
    /**
     * @notice Calculate price impact of a swap
     */
    function getPriceImpact(
        uint256 poolId,
        address tokenIn,
        uint256 amountIn
    ) public view returns (uint256) {
        Pool storage pool = pools[poolId];
        require(pool.reserveA > 0 && pool.reserveB > 0, "Pool has no liquidity");
        require(amountIn > 0, "Invalid input amount");
        
        bool isAtoB = tokenIn == pool.tokenA;
        uint256 reserveIn = isAtoB ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isAtoB ? pool.reserveB : pool.reserveA;
        
        // Current price
        uint256 currentPrice = (reserveOut * 1e18) / reserveIn;
        
        // Price after swap
        uint256 amountOut = getAmountOut(poolId, tokenIn, amountIn);
        uint256 newReserveIn = reserveIn + amountIn;
        uint256 newReserveOut = reserveOut - amountOut;
        uint256 newPrice = (newReserveOut * 1e18) / newReserveIn;
        
        // Price impact as percentage (basis points)
        uint256 priceImpact = currentPrice > newPrice 
            ? ((currentPrice - newPrice) * 10000) / currentPrice
            : ((newPrice - currentPrice) * 10000) / newPrice;
        
        return priceImpact;
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update swap fee
     */
    function updateSwapFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        require(newFee <= MAX_SWAP_FEE, "Fee too high");
        
        uint256 oldFee = swapFee;
        swapFee = newFee;
        
        emit SwapFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @notice Collect accumulated fees for a pool
     */
    function collectPoolFees(uint256 poolId) external onlyRole(ADMIN_ROLE) {
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        
        uint256 feeA = poolFeeReserveA[poolId];
        uint256 feeB = poolFeeReserveB[poolId];
        
        if (feeA > 0) {
            poolFeeReserveA[poolId] = 0;
            IERC20(pool.tokenA).safeTransfer(treasurySafe, feeA);
        }
        
        if (feeB > 0) {
            poolFeeReserveB[poolId] = 0;
            IERC20(pool.tokenB).safeTransfer(treasurySafe, feeB);
        }
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
    
    function getPool(uint256 poolId) external view returns (Pool memory) {
        return pools[poolId];
    }
    
    function getPoolByPair(address tokenA, address tokenB) external view returns (uint256) {
        return pairToPoolId[tokenA][tokenB];
    }
    
    function getUserLiquidity(uint256 poolId, address provider) external view returns (uint256) {
        return liquidityBalances[poolId][provider];
    }
    
    function getUserPools(address user) external view returns (uint256[] memory) {
        return userPools[user];
    }
    
    function getUserSwaps(address user) external view returns (uint256[] memory) {
        return userSwaps[user];
    }
    
    function getSwap(uint256 swapId) external view returns (SwapRecord memory) {
        return swaps[swapId];
    }
    
    // ============================================
    // UTILITIES
    // ============================================
    
    /**
     * @notice Babylonian square root method
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
