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
 * @author Axiom Protocol
 * @notice Institutional-grade secure DEX for Axiom Smart City ecosystem
 */
contract AxiomExchangeHubV2 is 
    Initializable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant MIN_SWAP_FEE = 10;
    uint256 public constant MAX_SWAP_FEE = 1000;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant TIMELOCK_DURATION = 48 hours;
    uint256 public constant WITHDRAWAL_WINDOW = 24 hours;
    uint256 public constant MAX_WITHDRAWAL_PER_WINDOW = 5000;
    uint256 public constant MAX_PRICE_IMPACT = 1000;
    uint256 public constant BASIS_POINTS = 10000;

    enum TimelockOpType { UPDATE_SWAP_FEE, UPDATE_POOL_FEE, BAN_TOKEN, UPDATE_MAX_SWAP, UPDATE_BACKUP, SET_POOL_ACTIVE }

    address public treasurySafe;
    address public backupAdmin;
    uint256 public swapFee;
    uint256 public totalPools;
    uint256 public totalSwaps;
    uint256 public timelockNonce;
    uint256 public maxSwapPerBlock;

    mapping(uint256 => mapping(uint256 => uint256)) public blockSwapVolume;
    mapping(address => bool) public bannedTokens;

    struct TimelockOp {
        TimelockOpType opType;
        bytes params;
        uint256 executeAfter;
        bool executed;
        bool cancelled;
    }
    mapping(uint256 => TimelockOp) public timelockQueue;

    struct WithdrawWindow {
        uint256 windowStart;
        uint256 cumWithdrawn;
        uint256 poolLiqAtStart;
    }
    mapping(uint256 => mapping(address => WithdrawWindow)) public withdrawTracking;

    struct PoolCore {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        uint256 lockedLiquidity;
        bool isActive;
    }
    
    struct PoolMeta {
        uint256 createdAt;
        uint256 totalVolume;
        uint256 totalFees;
        uint256 poolFee;
    }

    mapping(uint256 => PoolCore) public poolCore;
    mapping(uint256 => PoolMeta) public poolMeta;
    mapping(address => mapping(address => uint256)) public pairToPoolId;
    mapping(uint256 => mapping(address => uint256)) public liquidityBalances;
    mapping(uint256 => uint256) public poolFeeReserveA;
    mapping(uint256 => uint256) public poolFeeReserveB;

    struct SwapRec {
        uint256 poolId;
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 fee;
        uint256 timestamp;
    }
    mapping(uint256 => SwapRec) public swaps;

    struct SwapVars {
        bool isAtoB;
        address tokenOut;
        uint256 actualIn;
        uint256 feeRate;
        uint256 fee;
        uint256 inAfterFee;
        uint256 resIn;
        uint256 resOut;
        uint256 amtOut;
        uint256 impact;
    }

    struct LiqVars {
        uint256 actA;
        uint256 actB;
        uint256 recvA;
        uint256 recvB;
        uint256 liq;
    }

    event PoolCreated(uint256 indexed poolId, address indexed tokenA, address indexed tokenB, uint256 amtA, uint256 amtB, address creator);
    event LiquidityAdded(uint256 indexed poolId, address indexed provider, uint256 amtA, uint256 amtB, uint256 liq);
    event LiquidityRemoved(uint256 indexed poolId, address indexed provider, uint256 amtA, uint256 amtB, uint256 liq);
    event Swap(uint256 indexed swapId, uint256 indexed poolId, address indexed trader, address tokenIn, address tokenOut, uint256 amtIn, uint256 amtOut, uint256 fee);
    event SwapFeeUpdated(uint256 oldFee, uint256 newFee);
    event PoolFeeUpdated(uint256 indexed poolId, uint256 oldFee, uint256 newFee);
    event TokenBanned(address indexed token, bool banned);
    event TimelockScheduled(uint256 indexed nonce, TimelockOpType opType, uint256 executeAfter);
    event TimelockExecuted(uint256 indexed nonce, TimelockOpType opType);
    event TimelockCancelled(uint256 indexed nonce);
    event EmergencyWithdrawal(uint256 indexed poolId, address indexed provider, uint256 amtA, uint256 amtB);
    event BackupAdminUpdated(address indexed oldBackup, address indexed newBackup);
    event MaxSwapPerBlockUpdated(uint256 oldLimit, uint256 newLimit);
    event FeesCollected(uint256 indexed poolId, uint256 feeA, uint256 feeB);
    event PoolActiveChanged(uint256 indexed poolId, bool active);

    modifier notBanned(address a, address b) {
        require(!bannedTokens[a] && !bannedTokens[b], "Banned token");
        _;
    }

    modifier withinDeadline(uint256 d) {
        require(block.timestamp <= d, "Expired");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _treasury, address _backup, uint256 _fee) public initializer {
        require(_treasury != address(0) && _backup != address(0), "Invalid addr");
        require(_fee >= MIN_SWAP_FEE && _fee <= MAX_SWAP_FEE, "Invalid fee");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        treasurySafe = _treasury;
        backupAdmin = _backup;
        swapFee = _fee;

        _grantRole(DEFAULT_ADMIN_ROLE, _treasury);
        _grantRole(ADMIN_ROLE, _treasury);
        _grantRole(UPGRADER_ROLE, _treasury);
        _grantRole(ADMIN_ROLE, _backup);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function createPool(address tokenA, address tokenB, uint256 amtA, uint256 amtB) 
        external nonReentrant whenNotPaused onlyRole(OPERATOR_ROLE) notBanned(tokenA, tokenB) returns (uint256) 
    {
        require(tokenA != address(0) && tokenB != address(0) && tokenA != tokenB, "Invalid tokens");
        require(amtA > 0 && amtB > 0, "Invalid amounts");

        (address t0, address t1, uint256 a0, uint256 a1) = tokenA < tokenB 
            ? (tokenA, tokenB, amtA, amtB) 
            : (tokenB, tokenA, amtB, amtA);

        require(pairToPoolId[t0][t1] == 0, "Pool exists");

        totalPools++;
        uint256 pid = totalPools;

        uint256 bal0 = IERC20(t0).balanceOf(address(this));
        uint256 bal1 = IERC20(t1).balanceOf(address(this));
        IERC20(t0).safeTransferFrom(msg.sender, address(this), a0);
        IERC20(t1).safeTransferFrom(msg.sender, address(this), a1);
        uint256 recv0 = IERC20(t0).balanceOf(address(this)) - bal0;
        uint256 recv1 = IERC20(t1).balanceOf(address(this)) - bal1;
        require(recv0 > 0 && recv1 > 0, "Zero received");

        uint256 liq = _sqrt(recv0 * recv1);
        require(liq > MINIMUM_LIQUIDITY, "Low liquidity");

        poolCore[pid] = PoolCore(t0, t1, recv0, recv1, liq, MINIMUM_LIQUIDITY, true);
        poolMeta[pid] = PoolMeta(block.timestamp, 0, 0, 0);
        pairToPoolId[t0][t1] = pid;
        pairToPoolId[t1][t0] = pid;

        uint256 provLiq = liq - MINIMUM_LIQUIDITY;
        liquidityBalances[pid][msg.sender] = provLiq;

        emit PoolCreated(pid, t0, t1, recv0, recv1, msg.sender);
        emit LiquidityAdded(pid, msg.sender, recv0, recv1, provLiq);
        return pid;
    }

    function addLiquidity(uint256 pid, uint256 amtA, uint256 amtB, uint256 minLiq, uint256 deadline) 
        external nonReentrant whenNotPaused withinDeadline(deadline) returns (uint256) 
    {
        PoolCore storage pc = poolCore[pid];
        require(pc.isActive, "Inactive");
        require(!bannedTokens[pc.tokenA] && !bannedTokens[pc.tokenB], "Banned");
        require(amtA > 0 && amtB > 0 && pc.reserveA > 0, "Invalid");

        LiqVars memory v;
        (v.actA, v.actB) = _calcOptimalAmounts(pid, amtA, amtB);
        (v.recvA, v.recvB) = _transferLiquidity(pid, v.actA, v.actB);
        v.liq = (v.recvA * pc.totalLiquidity) / pc.reserveA;
        require(v.liq >= minLiq, "Slippage");

        _applyLiquidityAdd(pid, v.recvA, v.recvB, v.liq);
        emit LiquidityAdded(pid, msg.sender, v.recvA, v.recvB, v.liq);
        return v.liq;
    }

    function _calcOptimalAmounts(uint256 pid, uint256 amtA, uint256 amtB) internal view returns (uint256 actA, uint256 actB) {
        PoolCore storage pc = poolCore[pid];
        uint256 optB = (amtA * pc.reserveB) / pc.reserveA;
        if (optB > amtB) {
            actA = (amtB * pc.reserveA) / pc.reserveB;
            actB = amtB;
        } else {
            actA = amtA;
            actB = optB;
        }
    }

    function _transferLiquidity(uint256 pid, uint256 actA, uint256 actB) internal returns (uint256 recvA, uint256 recvB) {
        PoolCore storage pc = poolCore[pid];
        uint256 b0 = IERC20(pc.tokenA).balanceOf(address(this));
        IERC20(pc.tokenA).safeTransferFrom(msg.sender, address(this), actA);
        recvA = IERC20(pc.tokenA).balanceOf(address(this)) - b0;

        b0 = IERC20(pc.tokenB).balanceOf(address(this));
        IERC20(pc.tokenB).safeTransferFrom(msg.sender, address(this), actB);
        recvB = IERC20(pc.tokenB).balanceOf(address(this)) - b0;
        require(recvA > 0 && recvB > 0, "Zero");
    }

    function _applyLiquidityAdd(uint256 pid, uint256 recvA, uint256 recvB, uint256 liq) internal {
        PoolCore storage pc = poolCore[pid];
        pc.reserveA += recvA;
        pc.reserveB += recvB;
        pc.totalLiquidity += liq;
        liquidityBalances[pid][msg.sender] += liq;
    }

    function removeLiquidity(uint256 pid, uint256 liq, uint256 minA, uint256 minB, uint256 deadline) 
        external nonReentrant withinDeadline(deadline) returns (uint256, uint256) 
    {
        PoolCore storage pc = poolCore[pid];
        require(pc.isActive && liq > 0, "Invalid");
        require(liquidityBalances[pid][msg.sender] >= liq, "Insufficient");

        uint256 avail = pc.totalLiquidity - pc.lockedLiquidity;
        require(liq <= avail, "Locked");

        _checkWithdrawWindow(pid, msg.sender, liq, pc.totalLiquidity);

        uint256 amtA = (liq * pc.reserveA) / pc.totalLiquidity;
        uint256 amtB = (liq * pc.reserveB) / pc.totalLiquidity;
        require(amtA >= minA && amtB >= minB, "Slippage");

        liquidityBalances[pid][msg.sender] -= liq;
        pc.reserveA -= amtA;
        pc.reserveB -= amtB;
        pc.totalLiquidity -= liq;

        IERC20(pc.tokenA).safeTransfer(msg.sender, amtA);
        IERC20(pc.tokenB).safeTransfer(msg.sender, amtB);

        emit LiquidityRemoved(pid, msg.sender, amtA, amtB, liq);
        return (amtA, amtB);
    }

    function emergencyWithdraw(uint256 pid) external nonReentrant returns (uint256, uint256) {
        PoolCore storage pc = poolCore[pid];
        uint256 userLiq = liquidityBalances[pid][msg.sender];
        require(userLiq > 0 && pc.totalLiquidity > 0, "None");

        uint256 avail = pc.totalLiquidity - pc.lockedLiquidity;
        uint256 withdrawLiq = userLiq > avail ? avail : userLiq;
        require(withdrawLiq > 0, "Locked");

        uint256 amtA = (withdrawLiq * pc.reserveA) / pc.totalLiquidity;
        uint256 amtB = (withdrawLiq * pc.reserveB) / pc.totalLiquidity;

        liquidityBalances[pid][msg.sender] -= withdrawLiq;
        pc.reserveA -= amtA;
        pc.reserveB -= amtB;
        pc.totalLiquidity -= withdrawLiq;

        IERC20(pc.tokenA).safeTransfer(msg.sender, amtA);
        IERC20(pc.tokenB).safeTransfer(msg.sender, amtB);

        emit EmergencyWithdrawal(pid, msg.sender, amtA, amtB);
        return (amtA, amtB);
    }

    function _checkWithdrawWindow(uint256 pid, address user, uint256 liq, uint256 totalLiq) internal {
        WithdrawWindow storage w = withdrawTracking[pid][user];
        
        // Initialize or reset window if expired or first use
        // Note: For first-time users, windowStart=0 means condition is always true
        // since block.timestamp > WITHDRAWAL_WINDOW (24h = 86400s << Unix timestamp)
        if (w.windowStart == 0 || block.timestamp >= w.windowStart + WITHDRAWAL_WINDOW) {
            w.windowStart = block.timestamp;
            w.cumWithdrawn = 0;
            w.poolLiqAtStart = totalLiq;
        }
        
        // Safety check to prevent division by zero
        require(w.poolLiqAtStart > 0, "Invalid window state");
        
        uint256 bps = (liq * BASIS_POINTS) / w.poolLiqAtStart;
        uint256 newCum = w.cumWithdrawn + bps;
        require(newCum <= MAX_WITHDRAWAL_PER_WINDOW, "24h limit");
        w.cumWithdrawn = newCum;
    }

    function swap(uint256 pid, address tokenIn, uint256 amtIn, uint256 minOut, uint256 deadline) 
        external nonReentrant whenNotPaused withinDeadline(deadline) returns (uint256) 
    {
        PoolCore storage pc = poolCore[pid];
        require(pc.isActive && amtIn > 0, "Invalid");
        require(tokenIn == pc.tokenA || tokenIn == pc.tokenB, "Wrong token");
        require(!bannedTokens[tokenIn], "Banned");

        SwapVars memory v;
        v.isAtoB = tokenIn == pc.tokenA;
        v.tokenOut = v.isAtoB ? pc.tokenB : pc.tokenA;

        v.actualIn = _transferIn(tokenIn, amtIn);
        _checkBlockLimit(pid, v.actualIn);

        (v.fee, v.inAfterFee, v.amtOut, v.impact) = _calcSwapAmounts(pid, v.isAtoB, v.actualIn);
        require(v.impact <= MAX_PRICE_IMPACT, "High impact");
        require(v.amtOut >= minOut && v.amtOut > 0, "Slippage");

        _applySwapState(pid, v.isAtoB, v.inAfterFee, v.amtOut, v.fee, v.actualIn);
        _recordSwap(pid, tokenIn, v.tokenOut, v.actualIn, v.amtOut, v.fee);

        IERC20(v.tokenOut).safeTransfer(msg.sender, v.amtOut);
        emit Swap(totalSwaps, pid, msg.sender, tokenIn, v.tokenOut, v.actualIn, v.amtOut, v.fee);
        return v.amtOut;
    }

    function _transferIn(address tokenIn, uint256 amtIn) internal returns (uint256) {
        uint256 balBefore = IERC20(tokenIn).balanceOf(address(this));
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amtIn);
        uint256 actualIn = IERC20(tokenIn).balanceOf(address(this)) - balBefore;
        require(actualIn > 0, "Zero");
        return actualIn;
    }

    function _checkBlockLimit(uint256 pid, uint256 actualIn) internal {
        if (maxSwapPerBlock > 0) {
            uint256 vol = blockSwapVolume[pid][block.number];
            require(vol + actualIn <= maxSwapPerBlock, "Block limit");
            blockSwapVolume[pid][block.number] = vol + actualIn;
        }
    }

    function _calcSwapAmounts(uint256 pid, bool isAtoB, uint256 actualIn) internal view returns (uint256 fee, uint256 inAfterFee, uint256 amtOut, uint256 impact) {
        PoolCore storage pc = poolCore[pid];
        PoolMeta storage pm = poolMeta[pid];
        uint256 feeRate = pm.poolFee > 0 ? pm.poolFee : swapFee;
        fee = (actualIn * feeRate) / BASIS_POINTS;
        inAfterFee = actualIn - fee;

        uint256 resIn = isAtoB ? pc.reserveA : pc.reserveB;
        uint256 resOut = isAtoB ? pc.reserveB : pc.reserveA;
        amtOut = (resOut * inAfterFee) / (resIn + inAfterFee);
        impact = _calcPriceImpact(resIn, resOut, inAfterFee, amtOut);
    }

    function _applySwapState(uint256 pid, bool isAtoB, uint256 inAfterFee, uint256 amtOut, uint256 fee, uint256 actualIn) internal {
        PoolCore storage pc = poolCore[pid];
        PoolMeta storage pm = poolMeta[pid];
        if (isAtoB) {
            pc.reserveA += inAfterFee;
            pc.reserveB -= amtOut;
            poolFeeReserveA[pid] += fee;
        } else {
            pc.reserveB += inAfterFee;
            pc.reserveA -= amtOut;
            poolFeeReserveB[pid] += fee;
        }
        pm.totalVolume += actualIn;
        pm.totalFees += fee;
    }

    function _recordSwap(uint256 pid, address tokenIn, address tokenOut, uint256 actualIn, uint256 amtOut, uint256 fee) internal {
        totalSwaps++;
        swaps[totalSwaps] = SwapRec(pid, msg.sender, tokenIn, tokenOut, actualIn, amtOut, fee, block.timestamp);
    }

    function scheduleTimelock(TimelockOpType opType, bytes calldata params) external onlyRole(ADMIN_ROLE) returns (uint256) {
        timelockNonce++;
        timelockQueue[timelockNonce] = TimelockOp(opType, params, block.timestamp + TIMELOCK_DURATION, false, false);
        emit TimelockScheduled(timelockNonce, opType, block.timestamp + TIMELOCK_DURATION);
        return timelockNonce;
    }

    function executeTimelock(uint256 nonce) external onlyRole(ADMIN_ROLE) {
        TimelockOp storage op = timelockQueue[nonce];
        require(op.executeAfter > 0 && !op.executed && !op.cancelled, "Invalid");
        require(block.timestamp >= op.executeAfter, "Too early");

        op.executed = true;

        if (op.opType == TimelockOpType.UPDATE_SWAP_FEE) {
            uint256 newFee = abi.decode(op.params, (uint256));
            require(newFee >= MIN_SWAP_FEE && newFee <= MAX_SWAP_FEE, "Range");
            emit SwapFeeUpdated(swapFee, newFee);
            swapFee = newFee;
        } else if (op.opType == TimelockOpType.UPDATE_POOL_FEE) {
            (uint256 pid, uint256 newFee) = abi.decode(op.params, (uint256, uint256));
            require(newFee >= MIN_SWAP_FEE && newFee <= MAX_SWAP_FEE, "Range");
            emit PoolFeeUpdated(pid, poolMeta[pid].poolFee, newFee);
            poolMeta[pid].poolFee = newFee;
        } else if (op.opType == TimelockOpType.BAN_TOKEN) {
            (address token, bool banned) = abi.decode(op.params, (address, bool));
            bannedTokens[token] = banned;
            emit TokenBanned(token, banned);
        } else if (op.opType == TimelockOpType.UPDATE_MAX_SWAP) {
            uint256 newLimit = abi.decode(op.params, (uint256));
            emit MaxSwapPerBlockUpdated(maxSwapPerBlock, newLimit);
            maxSwapPerBlock = newLimit;
        } else if (op.opType == TimelockOpType.UPDATE_BACKUP) {
            address newBackup = abi.decode(op.params, (address));
            require(newBackup != address(0), "Zero");
            emit BackupAdminUpdated(backupAdmin, newBackup);
            _revokeRole(ADMIN_ROLE, backupAdmin);
            backupAdmin = newBackup;
            _grantRole(ADMIN_ROLE, newBackup);
        } else if (op.opType == TimelockOpType.SET_POOL_ACTIVE) {
            (uint256 pid, bool active) = abi.decode(op.params, (uint256, bool));
            poolCore[pid].isActive = active;
            emit PoolActiveChanged(pid, active);
        }

        emit TimelockExecuted(nonce, op.opType);
    }

    function cancelTimelock(uint256 nonce) external onlyRole(ADMIN_ROLE) {
        TimelockOp storage op = timelockQueue[nonce];
        require(op.executeAfter > 0 && !op.executed && !op.cancelled, "Invalid");
        op.cancelled = true;
        emit TimelockCancelled(nonce);
    }

    function collectPoolFees(uint256 pid) external onlyRole(ADMIN_ROLE) {
        PoolCore storage pc = poolCore[pid];
        require(pc.isActive, "Inactive");

        uint256 feeA = poolFeeReserveA[pid];
        uint256 feeB = poolFeeReserveB[pid];
        poolFeeReserveA[pid] = 0;
        poolFeeReserveB[pid] = 0;

        if (feeA > 0) IERC20(pc.tokenA).safeTransfer(treasurySafe, feeA);
        if (feeB > 0) IERC20(pc.tokenB).safeTransfer(treasurySafe, feeB);

        emit FeesCollected(pid, feeA, feeB);
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function getPoolCore(uint256 pid) external view returns (PoolCore memory) { return poolCore[pid]; }
    function getPoolMeta(uint256 pid) external view returns (PoolMeta memory) { return poolMeta[pid]; }
    function getUserLiquidity(uint256 pid, address user) external view returns (uint256) { return liquidityBalances[pid][user]; }
    function getSwap(uint256 sid) external view returns (SwapRec memory) { return swaps[sid]; }
    function getTimelockOp(uint256 nonce) external view returns (TimelockOp memory) { return timelockQueue[nonce]; }

    function getAmountOut(uint256 pid, address tokenIn, uint256 amtIn) public view returns (uint256) {
        PoolCore storage pc = poolCore[pid];
        require(pc.isActive && pc.reserveA > 0 && amtIn > 0, "Invalid");
        bool isAtoB = tokenIn == pc.tokenA;
        uint256 resIn = isAtoB ? pc.reserveA : pc.reserveB;
        uint256 resOut = isAtoB ? pc.reserveB : pc.reserveA;
        uint256 feeRate = poolMeta[pid].poolFee > 0 ? poolMeta[pid].poolFee : swapFee;
        uint256 inAfterFee = amtIn - ((amtIn * feeRate) / BASIS_POINTS);
        return (resOut * inAfterFee) / (resIn + inAfterFee);
    }

    function getEffectiveFee(uint256 pid) external view returns (uint256) {
        return poolMeta[pid].poolFee > 0 ? poolMeta[pid].poolFee : swapFee;
    }

    function _calcPriceImpact(uint256 resIn, uint256 resOut, uint256 amtIn, uint256 amtOut) internal pure returns (uint256) {
        if (resIn == 0 || resOut == 0) return 0;
        uint256 curPrice = (resOut * 1e18) / resIn;
        uint256 newResIn = resIn + amtIn;
        uint256 newResOut = resOut - amtOut;
        if (newResIn == 0) return BASIS_POINTS;
        uint256 newPrice = (newResOut * 1e18) / newResIn;
        return curPrice > newPrice 
            ? ((curPrice - newPrice) * BASIS_POINTS) / curPrice
            : ((newPrice - curPrice) * BASIS_POINTS) / newPrice;
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) { z = x; x = (y / x + x) / 2; }
        } else if (y != 0) { z = 1; }
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    uint256[40] private __gap;
}
