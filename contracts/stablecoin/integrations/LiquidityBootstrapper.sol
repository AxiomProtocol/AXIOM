// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUniswapV2Router {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address);
}

contract LiquidityBootstrapper is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant LIQUIDITY_MANAGER_ROLE = keccak256("LIQUIDITY_MANAGER_ROLE");

    IERC20 public axusd;
    address public treasuryVault;
    IUniswapV2Router public router;
    IUniswapV2Factory public factory;

    uint256 public constant MIN_SEED_AMOUNT = 1000 * 10**18;
    uint256 public totalLiquiditySeeded;
    uint256 public totalPoolsCreated;

    enum PoolStatus { Pending, Active, Closed }

    struct LiquidityPool {
        uint256 poolId;
        address tokenA;
        address tokenB;
        address lpToken;
        uint256 axusdSeeded;
        uint256 pairedTokenSeeded;
        uint256 lpTokensReceived;
        uint256 createdAt;
        PoolStatus status;
        string name;
    }

    struct PoolStats {
        uint256 currentAXUSDBalance;
        uint256 currentPairedBalance;
        uint256 protocolLPBalance;
    }

    mapping(uint256 => LiquidityPool) public pools;
    mapping(address => mapping(address => uint256)) public pairToPoolId;

    event PoolSeeded(
        uint256 indexed poolId,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 lpTokens
    );
    event LiquidityAdded(uint256 indexed poolId, uint256 axusdAmount, uint256 pairedAmount, uint256 lpTokens);
    event LiquidityRemoved(uint256 indexed poolId, uint256 lpTokens, uint256 axusdReceived, uint256 pairedReceived);
    event PoolClosed(uint256 indexed poolId);

    constructor(
        address _axusd,
        address _router,
        address _factory,
        address _treasuryVault
    ) {
        require(_axusd != address(0), "Invalid AXUSD");
        require(_router != address(0), "Invalid router");
        require(_factory != address(0), "Invalid factory");
        require(_treasuryVault != address(0), "Invalid treasury");

        axusd = IERC20(_axusd);
        router = IUniswapV2Router(_router);
        factory = IUniswapV2Factory(_factory);
        treasuryVault = _treasuryVault;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function seedPool(
        address pairedToken,
        uint256 axusdAmount,
        uint256 pairedAmount,
        string calldata poolName
    ) external onlyRole(LIQUIDITY_MANAGER_ROLE) nonReentrant returns (uint256) {
        require(pairedToken != address(0), "Invalid paired token");
        require(axusdAmount >= MIN_SEED_AMOUNT, "Below minimum seed");
        require(pairedAmount > 0, "Zero paired amount");

        axusd.safeTransferFrom(msg.sender, address(this), axusdAmount);
        IERC20(pairedToken).safeTransferFrom(msg.sender, address(this), pairedAmount);

        axusd.approve(address(router), axusdAmount);
        IERC20(pairedToken).approve(address(router), pairedAmount);

        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            address(axusd),
            pairedToken,
            axusdAmount,
            pairedAmount,
            (axusdAmount * 95) / 100,
            (pairedAmount * 95) / 100,
            address(this),
            block.timestamp + 300
        );

        totalPoolsCreated++;
        uint256 poolId = totalPoolsCreated;

        address lpToken = factory.getPair(address(axusd), pairedToken);

        pools[poolId] = LiquidityPool({
            poolId: poolId,
            tokenA: address(axusd),
            tokenB: pairedToken,
            lpToken: lpToken,
            axusdSeeded: amountA,
            pairedTokenSeeded: amountB,
            lpTokensReceived: liquidity,
            createdAt: block.timestamp,
            status: PoolStatus.Active,
            name: poolName
        });

        pairToPoolId[address(axusd)][pairedToken] = poolId;
        totalLiquiditySeeded += amountA;

        emit PoolSeeded(poolId, address(axusd), pairedToken, amountA, amountB, liquidity);
        return poolId;
    }

    function addLiquidity(
        uint256 poolId,
        uint256 axusdAmount,
        uint256 pairedAmount
    ) external onlyRole(LIQUIDITY_MANAGER_ROLE) nonReentrant {
        LiquidityPool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Active, "Pool not active");

        axusd.safeTransferFrom(msg.sender, address(this), axusdAmount);
        IERC20(pool.tokenB).safeTransferFrom(msg.sender, address(this), pairedAmount);

        axusd.approve(address(router), axusdAmount);
        IERC20(pool.tokenB).approve(address(router), pairedAmount);

        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            address(axusd),
            pool.tokenB,
            axusdAmount,
            pairedAmount,
            (axusdAmount * 95) / 100,
            (pairedAmount * 95) / 100,
            address(this),
            block.timestamp + 300
        );

        pool.axusdSeeded += amountA;
        pool.pairedTokenSeeded += amountB;
        pool.lpTokensReceived += liquidity;
        totalLiquiditySeeded += amountA;

        emit LiquidityAdded(poolId, amountA, amountB, liquidity);
    }

    function removeLiquidity(
        uint256 poolId,
        uint256 lpTokenAmount
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
        LiquidityPool storage pool = pools[poolId];
        require(pool.lpTokensReceived >= lpTokenAmount, "Insufficient LP tokens");

        IERC20(pool.lpToken).approve(address(router), lpTokenAmount);

        (uint256 amountA, uint256 amountB) = router.removeLiquidity(
            address(axusd),
            pool.tokenB,
            lpTokenAmount,
            0,
            0,
            treasuryVault,
            block.timestamp + 300
        );

        pool.lpTokensReceived -= lpTokenAmount;

        emit LiquidityRemoved(poolId, lpTokenAmount, amountA, amountB);
    }

    function closePool(uint256 poolId) external onlyRole(ADMIN_ROLE) nonReentrant {
        LiquidityPool storage pool = pools[poolId];
        require(pool.status == PoolStatus.Active, "Pool not active");

        if (pool.lpTokensReceived > 0) {
            IERC20(pool.lpToken).approve(address(router), pool.lpTokensReceived);
            router.removeLiquidity(
                address(axusd),
                pool.tokenB,
                pool.lpTokensReceived,
                0,
                0,
                treasuryVault,
                block.timestamp + 300
            );
            pool.lpTokensReceived = 0;
        }

        pool.status = PoolStatus.Closed;
        emit PoolClosed(poolId);
    }

    function getPoolInfo(uint256 poolId) external view returns (
        address tokenA,
        address tokenB,
        address lpToken,
        uint256 axusdSeeded,
        uint256 pairedSeeded,
        uint256 lpTokens,
        PoolStatus status,
        string memory name
    ) {
        LiquidityPool storage pool = pools[poolId];
        return (
            pool.tokenA,
            pool.tokenB,
            pool.lpToken,
            pool.axusdSeeded,
            pool.pairedTokenSeeded,
            pool.lpTokensReceived,
            pool.status,
            pool.name
        );
    }

    function getProtocolLPBalance(uint256 poolId) external view returns (uint256) {
        return pools[poolId].lpTokensReceived;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        IERC20(token).safeTransfer(treasuryVault, amount);
    }
}
