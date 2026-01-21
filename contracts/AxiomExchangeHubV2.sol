// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AxiomExchangeHubV2
 * @notice Secure, upgradeable DEX for Axiom Smart City ecosystem
 * @dev AMM with enhanced security features:
 *      - Multi-sig admin (Safe) + backup EOA
 *      - 48-hour timelock for sensitive operations
 *      - Operator-only pool creation
 *      - Per-block swap limits (flash loan protection)
 *      - Swap deadlines (MEV protection)
 *      - LP withdrawal cooldown for large exits
 *      - Emergency withdrawal (always available)
 *      - Rebasing token ban
 *      - Max price impact protection
 */
contract AxiomExchangeHubV2 is 
    Initializable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ============================================
    // CONSTANTS
    // ============================================
    uint256 public constant MIN_SWAP_FEE = 10;       // 0.1% minimum
    uint256 public constant MAX_SWAP_FEE = 1000;     // 10% maximum
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant TIMELOCK_DURATION = 48 hours;
    uint256 public constant LARGE_WITHDRAWAL_THRESHOLD = 5000; // 50% of pool
    uint256 public constant WITHDRAWAL_COOLDOWN = 1 hours;
    uint256 public constant MAX_PRICE_IMPACT = 1000; // 10% max price impact
    uint256 public constant BASIS_POINTS = 10000;

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    address public treasurySafe;
    address public backupAdmin;
    
    uint256 public swapFee;
    uint256 public totalPools;
    uint256 public totalSwaps;
    
    // Per-block flash loan protection
    uint256 public maxSwapPerBlock;
    mapping(uint256 => mapping(uint256 => uint256)) public blockSwapVolume; // poolId => blockNumber => volume
    
    // Banned tokens (rebasing, etc.)
    mapping(address => bool) public bannedTokens;
    
    // Timelock for pending operations
    struct TimelockOperation {
        bytes32 operationHash;
        uint256 executeAfter;
        bool executed;
    }
    mapping(bytes32 => TimelockOperation) public timelockOperations;
    
    // Withdrawal cooldown tracking
    mapping(uint256 => mapping(address => uint256)) public lastWithdrawalTime;
    
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
        uint256 lockedLiquidity;
        bool isActive;
        uint256 createdAt;
        uint256 totalVolume;
        uint256 totalFees;
        uint256 poolFee; // Per-pool fee override (0 = use global)
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
    mapping(address => mapping(address => uint256)) public pairToPoolId;
    mapping(uint256 => mapping(address => uint256)) public liquidityBalances;
    mapping(uint256 => SwapRecord) public swaps;
    mapping(address => uint256[]) public userSwaps;
    mapping(address => uint256[]) public userPools;
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
        uint256 initialLiquidityB,
        address creator
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
    
    event SwapFeeUpdated(uint256 oldFee, uint256 newFee);
    event PoolFeeUpdated(uint256 indexed poolId, uint256 oldFee, uint256 newFee);
    event TokenBanned(address indexed token, bool banned);
    event TimelockScheduled(bytes32 indexed operationHash, uint256 executeAfter);
    event TimelockExecuted(bytes32 indexed operationHash);
    event TimelockCancelled(bytes32 indexed operationHash);
    event EmergencyWithdrawal(uint256 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB);
    event BackupAdminUpdated(address indexed oldBackup, address indexed newBackup);
    event MaxSwapPerBlockUpdated(uint256 oldLimit, uint256 newLimit);
    event FeesCollected(uint256 indexed poolId, uint256 feeA, uint256 feeB);

    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier notBannedTokens(address tokenA, address tokenB) {
        require(!bannedTokens[tokenA], "Token A is banned");
        require(!bannedTokens[tokenB], "Token B is banned");
        _;
    }
    
    modifier withinDeadline(uint256 deadline) {
        require(block.timestamp <= deadline, "Transaction expired");
        _;
    }
    
    modifier withinBlockLimit(uint256 poolId, uint256 amount) {
        if (maxSwapPerBlock > 0) {
            uint256 currentVolume = blockSwapVolume[poolId][block.number];
            require(currentVolume + amount <= maxSwapPerBlock, "Block swap limit exceeded");
            blockSwapVolume[poolId][block.number] = currentVolume + amount;
        }
        _;
    }

    // ============================================
    // INITIALIZER (replaces constructor for proxy)
    // ============================================
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _treasurySafe,
        address _backupAdmin,
        uint256 _initialFee
    ) public initializer {
        require(_treasurySafe != address(0), "Invalid treasury safe");
        require(_backupAdmin != address(0), "Invalid backup admin");
        require(_initialFee >= MIN_SWAP_FEE && _initialFee <= MAX_SWAP_FEE, "Invalid fee");
        
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        treasurySafe = _treasurySafe;
        backupAdmin = _backupAdmin;
        swapFee = _initialFee;
        maxSwapPerBlock = 0; // Disabled by default
        
        // Treasury Safe is the primary admin
        _grantRole(DEFAULT_ADMIN_ROLE, _treasurySafe);
        _grantRole(ADMIN_ROLE, _treasurySafe);
        _grantRole(UPGRADER_ROLE, _treasurySafe);
        
        // Backup admin has admin role but not DEFAULT_ADMIN
        _grantRole(ADMIN_ROLE, _backupAdmin);
        
        // Deployer gets operator role initially
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    // ============================================
    // POOL MANAGEMENT (OPERATOR ONLY)
    // ============================================
    
    function createPool(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant whenNotPaused onlyRole(OPERATOR_ROLE) notBannedTokens(tokenA, tokenB) returns (uint256) {
        require(tokenA != address(0) && tokenB != address(0), "Invalid tokens");
        require(tokenA != tokenB, "Identical tokens");
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        
        (address token0, address token1, uint256 amount0, uint256 amount1) = 
            tokenA < tokenB ? (tokenA, tokenB, amountA, amountB) : (tokenB, tokenA, amountB, amountA);
        
        require(pairToPoolId[token0][token1] == 0, "Pool already exists");
        
        totalPools++;
        uint256 poolId = totalPools;
        
        // Transfer tokens with balance check (handles fee-on-transfer)
        uint256 balance0Before = IERC20(token0).balanceOf(address(this));
        uint256 balance1Before = IERC20(token1).balanceOf(address(this));
        
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        
        uint256 actualAmount0 = IERC20(token0).balanceOf(address(this)) - balance0Before;
        uint256 actualAmount1 = IERC20(token1).balanceOf(address(this)) - balance1Before;
        
        require(actualAmount0 > 0 && actualAmount1 > 0, "Zero tokens received");
        
        uint256 liquidity = sqrt(actualAmount0 * actualAmount1);
        require(liquidity > MINIMUM_LIQUIDITY, "Insufficient initial liquidity");
        
        Pool storage pool = pools[poolId];
        pool.poolId = poolId;
        pool.tokenA = token0;
        pool.tokenB = token1;
        pool.reserveA = actualAmount0;
        pool.reserveB = actualAmount1;
        pool.totalLiquidity = liquidity;
        pool.lockedLiquidity = MINIMUM_LIQUIDITY;
        pool.isActive = true;
        pool.createdAt = block.timestamp;
        pool.poolFee = 0; // Use global fee
        
        pairToPoolId[token0][token1] = poolId;
        pairToPoolId[token1][token0] = poolId;
        
        uint256 providerLiquidity = liquidity - MINIMUM_LIQUIDITY;
        liquidityBalances[poolId][msg.sender] = providerLiquidity;
        userPools[msg.sender].push(poolId);
        
        emit PoolCreated(poolId, token0, token1, actualAmount0, actualAmount1, msg.sender);
        emit LiquidityAdded(poolId, msg.sender, actualAmount0, actualAmount1, providerLiquidity);
        
        return poolId;
    }
    
    // ============================================
    // LIQUIDITY FUNCTIONS (PUBLIC)
    // ============================================
    
    function addLiquidity(
        uint256 poolId,
        uint256 amountA,
        uint256 amountB,
        uint256 minLiquidity,
        uint256 deadline
    ) external nonReentrant whenNotPaused withinDeadline(deadline) returns (uint256) {
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(!bannedTokens[pool.tokenA] && !bannedTokens[pool.tokenB], "Pool contains banned token");
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        require(pool.reserveA > 0 && pool.reserveB > 0, "Pool has no liquidity");
        
        uint256 receivedAmountA;
        uint256 receivedAmountB;
        
        {
            uint256 optimalAmountB = (amountA * pool.reserveB) / pool.reserveA;
            uint256 actualAmountA = amountA;
            uint256 actualAmountB = optimalAmountB;
            
            if (optimalAmountB > amountB) {
                actualAmountA = (amountB * pool.reserveA) / pool.reserveB;
                actualAmountB = amountB;
            }
            
            uint256 balanceBefore = IERC20(pool.tokenA).balanceOf(address(this));
            IERC20(pool.tokenA).safeTransferFrom(msg.sender, address(this), actualAmountA);
            receivedAmountA = IERC20(pool.tokenA).balanceOf(address(this)) - balanceBefore;
            
            balanceBefore = IERC20(pool.tokenB).balanceOf(address(this));
            IERC20(pool.tokenB).safeTransferFrom(msg.sender, address(this), actualAmountB);
            receivedAmountB = IERC20(pool.tokenB).balanceOf(address(this)) - balanceBefore;
        }
        
        require(receivedAmountA > 0 && receivedAmountB > 0, "Zero tokens received");
        
        uint256 liquidity = (receivedAmountA * pool.totalLiquidity) / pool.reserveA;
        require(liquidity >= minLiquidity, "Insufficient liquidity minted");
        
        pool.reserveA += receivedAmountA;
        pool.reserveB += receivedAmountB;
        pool.totalLiquidity += liquidity;
        
        if (liquidityBalances[poolId][msg.sender] == 0) {
            userPools[msg.sender].push(poolId);
        }
        liquidityBalances[poolId][msg.sender] += liquidity;
        
        emit LiquidityAdded(poolId, msg.sender, receivedAmountA, receivedAmountB, liquidity);
        
        return liquidity;
    }
    
    function removeLiquidity(
        uint256 poolId,
        uint256 liquidity,
        uint256 minAmountA,
        uint256 minAmountB,
        uint256 deadline
    ) external nonReentrant withinDeadline(deadline) returns (uint256, uint256) {
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(liquidity > 0, "Invalid liquidity");
        require(liquidityBalances[poolId][msg.sender] >= liquidity, "Insufficient liquidity balance");
        require(pool.totalLiquidity > 0, "No liquidity in pool");
        
        // Check for large withdrawal cooldown
        uint256 userLiquidity = liquidityBalances[poolId][msg.sender];
        uint256 withdrawalPercent = (liquidity * BASIS_POINTS) / pool.totalLiquidity;
        
        if (withdrawalPercent >= LARGE_WITHDRAWAL_THRESHOLD) {
            require(
                block.timestamp >= lastWithdrawalTime[poolId][msg.sender] + WITHDRAWAL_COOLDOWN,
                "Large withdrawal cooldown active"
            );
        }
        
        lastWithdrawalTime[poolId][msg.sender] = block.timestamp;
        
        uint256 amountA = (liquidity * pool.reserveA) / pool.totalLiquidity;
        uint256 amountB = (liquidity * pool.reserveB) / pool.totalLiquidity;
        
        require(amountA >= minAmountA && amountB >= minAmountB, "Slippage exceeded");
        
        liquidityBalances[poolId][msg.sender] -= liquidity;
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalLiquidity -= liquidity;
        
        IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
        IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);
        
        emit LiquidityRemoved(poolId, msg.sender, amountA, amountB, liquidity);
        
        return (amountA, amountB);
    }
    
    /**
     * @notice Emergency withdrawal - always available, even when paused
     * @dev No slippage protection, no cooldown - for emergencies only
     */
    function emergencyWithdraw(uint256 poolId) external nonReentrant returns (uint256, uint256) {
        Pool storage pool = pools[poolId];
        uint256 liquidity = liquidityBalances[poolId][msg.sender];
        require(liquidity > 0, "No liquidity to withdraw");
        require(pool.totalLiquidity > 0, "No liquidity in pool");
        
        uint256 amountA = (liquidity * pool.reserveA) / pool.totalLiquidity;
        uint256 amountB = (liquidity * pool.reserveB) / pool.totalLiquidity;
        
        liquidityBalances[poolId][msg.sender] = 0;
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalLiquidity -= liquidity;
        
        IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
        IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);
        
        emit EmergencyWithdrawal(poolId, msg.sender, amountA, amountB);
        
        return (amountA, amountB);
    }
    
    // ============================================
    // SWAP FUNCTIONS
    // ============================================
    
    function swap(
        uint256 poolId,
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external nonReentrant whenNotPaused withinDeadline(deadline) withinBlockLimit(poolId, amountIn) returns (uint256) {
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(amountIn > 0, "Invalid amount");
        require(tokenIn == pool.tokenA || tokenIn == pool.tokenB, "Invalid token");
        require(!bannedTokens[tokenIn], "Token is banned");
        
        bool isAtoB = tokenIn == pool.tokenA;
        address tokenOut = isAtoB ? pool.tokenB : pool.tokenA;
        
        // Transfer tokenIn and measure actual received
        uint256 balanceInBefore = IERC20(tokenIn).balanceOf(address(this));
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 actualAmountIn = IERC20(tokenIn).balanceOf(address(this)) - balanceInBefore;
        require(actualAmountIn > 0, "Zero tokens received");
        
        // Calculate fee (use pool fee if set, otherwise global)
        uint256 feeRate = pool.poolFee > 0 ? pool.poolFee : swapFee;
        uint256 fee = (actualAmountIn * feeRate) / BASIS_POINTS;
        uint256 amountInAfterFee = actualAmountIn - fee;
        
        // Calculate output
        uint256 reserveIn = isAtoB ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isAtoB ? pool.reserveB : pool.reserveA;
        uint256 amountOut = (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee);
        
        // Check price impact
        uint256 priceImpact = _calculatePriceImpact(reserveIn, reserveOut, amountInAfterFee, amountOut);
        require(priceImpact <= MAX_PRICE_IMPACT, "Price impact too high");
        
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(amountOut > 0, "Insufficient output amount");
        
        // Transfer tokenOut
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        // Update reserves
        if (isAtoB) {
            pool.reserveA += amountInAfterFee;
            pool.reserveB -= amountOut;
            poolFeeReserveA[poolId] += fee;
        } else {
            pool.reserveB += amountInAfterFee;
            pool.reserveA -= amountOut;
            poolFeeReserveB[poolId] += fee;
        }
        
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
        
        emit Swap(swapId, poolId, msg.sender, tokenIn, tokenOut, actualAmountIn, amountOut, fee);
        
        return amountOut;
    }
    
    // ============================================
    // ADMIN FUNCTIONS (TIMELOCKED)
    // ============================================
    
    function scheduleSwapFeeUpdate(uint256 newFee) external onlyRole(ADMIN_ROLE) returns (bytes32) {
        require(newFee >= MIN_SWAP_FEE && newFee <= MAX_SWAP_FEE, "Fee out of range");
        
        bytes32 opHash = keccak256(abi.encode("UPDATE_SWAP_FEE", newFee, block.timestamp));
        
        timelockOperations[opHash] = TimelockOperation({
            operationHash: opHash,
            executeAfter: block.timestamp + TIMELOCK_DURATION,
            executed: false
        });
        
        emit TimelockScheduled(opHash, block.timestamp + TIMELOCK_DURATION);
        return opHash;
    }
    
    function executeSwapFeeUpdate(uint256 newFee, uint256 scheduledTimestamp) external onlyRole(ADMIN_ROLE) {
        bytes32 opHash = keccak256(abi.encode("UPDATE_SWAP_FEE", newFee, scheduledTimestamp));
        TimelockOperation storage op = timelockOperations[opHash];
        
        require(op.executeAfter > 0, "Operation not scheduled");
        require(!op.executed, "Already executed");
        require(block.timestamp >= op.executeAfter, "Timelock not expired");
        
        op.executed = true;
        
        uint256 oldFee = swapFee;
        swapFee = newFee;
        
        emit TimelockExecuted(opHash);
        emit SwapFeeUpdated(oldFee, newFee);
    }
    
    function cancelTimelockOperation(bytes32 opHash) external onlyRole(ADMIN_ROLE) {
        TimelockOperation storage op = timelockOperations[opHash];
        require(op.executeAfter > 0, "Operation not scheduled");
        require(!op.executed, "Already executed");
        
        delete timelockOperations[opHash];
        
        emit TimelockCancelled(opHash);
    }
    
    // ============================================
    // ADMIN FUNCTIONS (IMMEDIATE)
    // ============================================
    
    function setPoolFee(uint256 poolId, uint256 newFee) external onlyRole(ADMIN_ROLE) {
        require(newFee >= MIN_SWAP_FEE && newFee <= MAX_SWAP_FEE, "Fee out of range");
        
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        
        uint256 oldFee = pool.poolFee;
        pool.poolFee = newFee;
        
        emit PoolFeeUpdated(poolId, oldFee, newFee);
    }
    
    function banToken(address token, bool banned) external onlyRole(ADMIN_ROLE) {
        bannedTokens[token] = banned;
        emit TokenBanned(token, banned);
    }
    
    function setMaxSwapPerBlock(uint256 newLimit) external onlyRole(ADMIN_ROLE) {
        uint256 oldLimit = maxSwapPerBlock;
        maxSwapPerBlock = newLimit;
        emit MaxSwapPerBlockUpdated(oldLimit, newLimit);
    }
    
    function updateBackupAdmin(address newBackup) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newBackup != address(0), "Invalid backup admin");
        
        address oldBackup = backupAdmin;
        _revokeRole(ADMIN_ROLE, oldBackup);
        
        backupAdmin = newBackup;
        _grantRole(ADMIN_ROLE, newBackup);
        
        emit BackupAdminUpdated(oldBackup, newBackup);
    }
    
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
        
        emit FeesCollected(poolId, feeA, feeB);
    }
    
    function setPoolActive(uint256 poolId, bool active) external onlyRole(OPERATOR_ROLE) {
        Pool storage pool = pools[poolId];
        require(pool.poolId > 0, "Pool does not exist");
        pool.isActive = active;
    }
    
    // ============================================
    // PAUSER FUNCTIONS
    // ============================================
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
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
        
        uint256 feeRate = pool.poolFee > 0 ? pool.poolFee : swapFee;
        uint256 amountInAfterFee = amountIn - ((amountIn * feeRate) / BASIS_POINTS);
        
        return (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee);
    }
    
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
        
        uint256 feeRate = pool.poolFee > 0 ? pool.poolFee : swapFee;
        uint256 amountInAfterFee = amountIn - ((amountIn * feeRate) / BASIS_POINTS);
        uint256 amountOut = getAmountOut(poolId, tokenIn, amountIn);
        
        return _calculatePriceImpact(reserveIn, reserveOut, amountInAfterFee, amountOut);
    }
    
    function getEffectiveFee(uint256 poolId) external view returns (uint256) {
        Pool storage pool = pools[poolId];
        return pool.poolFee > 0 ? pool.poolFee : swapFee;
    }
    
    function canWithdrawLarge(uint256 poolId, address user) external view returns (bool) {
        return block.timestamp >= lastWithdrawalTime[poolId][user] + WITHDRAWAL_COOLDOWN;
    }
    
    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================
    
    function _calculatePriceImpact(
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 amountIn,
        uint256 amountOut
    ) internal pure returns (uint256) {
        uint256 currentPrice = (reserveOut * 1e18) / reserveIn;
        uint256 newReserveIn = reserveIn + amountIn;
        uint256 newReserveOut = reserveOut - amountOut;
        uint256 newPrice = (newReserveOut * 1e18) / newReserveIn;
        
        uint256 priceImpact = currentPrice > newPrice 
            ? ((currentPrice - newPrice) * BASIS_POINTS) / currentPrice
            : ((newPrice - currentPrice) * BASIS_POINTS) / newPrice;
        
        return priceImpact;
    }
    
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
    
    // ============================================
    // UPGRADE AUTHORIZATION
    // ============================================
    
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
    
    // ============================================
    // STORAGE GAP (for future upgrades)
    // ============================================
    
    uint256[50] private __gap;
}
