// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAxiomExchangeHubFees {
    function getUserLiquidity(uint256 poolId, address user) external view returns (uint256);
    function getPoolCore(uint256 poolId) external view returns (
        address tokenA, address tokenB, uint256 reserveA, uint256 reserveB,
        uint256 totalLiquidity, uint256 lockedLiquidity, bool isActive
    );
    function poolFeeReserveA(uint256 poolId) external view returns (uint256);
    function poolFeeReserveB(uint256 poolId) external view returns (uint256);
}

/**
 * @title AxiomFeeDistributor
 * @author Axiom Protocol
 * @notice Distributes trading fees to LP holders proportionally
 * @dev Uses accumulator pattern for gas-efficient fee distribution
 */
contract AxiomFeeDistributor is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant PRECISION = 1e18;
    uint256 public constant BASIS_POINTS = 10000;

    struct PoolFeeInfo {
        address tokenA;
        address tokenB;
        uint256 accFeePerShareA;
        uint256 accFeePerShareB;
        uint256 lastDistributionTime;
        uint256 totalDistributedA;
        uint256 totalDistributedB;
        bool active;
    }

    struct UserFeeInfo {
        uint256 rewardDebtA;
        uint256 rewardDebtB;
        uint256 pendingA;
        uint256 pendingB;
        uint256 lastClaimTime;
    }

    address public exchangeHub;
    address public treasurySafe;
    
    uint256 public protocolFeeShare;
    uint256 public minDistributionInterval;

    mapping(uint256 => PoolFeeInfo) public poolFeeInfo;
    mapping(uint256 => mapping(address => UserFeeInfo)) public userFeeInfo;
    mapping(address => uint256[]) public userPools;

    event FeesDistributed(uint256 indexed poolId, uint256 amountA, uint256 amountB, uint256 timestamp);
    event FeesClaimed(address indexed user, uint256 indexed poolId, address tokenA, uint256 amountA, address tokenB, uint256 amountB);
    event PoolRegistered(uint256 indexed poolId, address tokenA, address tokenB);
    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _exchangeHub,
        address _treasurySafe,
        uint256 _protocolFeeShare
    ) public initializer {
        require(_exchangeHub != address(0) && _treasurySafe != address(0), "Zero addr");
        require(_protocolFeeShare <= 5000, "Fee too high");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        exchangeHub = _exchangeHub;
        treasurySafe = _treasurySafe;
        protocolFeeShare = _protocolFeeShare;
        minDistributionInterval = 1 hours;

        _grantRole(DEFAULT_ADMIN_ROLE, _treasurySafe);
        _grantRole(ADMIN_ROLE, _treasurySafe);
        _grantRole(UPGRADER_ROLE, _treasurySafe);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    function registerPool(uint256 poolId) external onlyRole(OPERATOR_ROLE) {
        require(!poolFeeInfo[poolId].active, "Already registered");

        (address tokenA, address tokenB,,,,,bool isActive) = IAxiomExchangeHubFees(exchangeHub).getPoolCore(poolId);
        require(isActive, "Pool not active");

        poolFeeInfo[poolId] = PoolFeeInfo({
            tokenA: tokenA,
            tokenB: tokenB,
            accFeePerShareA: 0,
            accFeePerShareB: 0,
            lastDistributionTime: block.timestamp,
            totalDistributedA: 0,
            totalDistributedB: 0,
            active: true
        });

        emit PoolRegistered(poolId, tokenA, tokenB);
    }

    function distributeFees(uint256 poolId, uint256 feeAmountA, uint256 feeAmountB) external onlyRole(OPERATOR_ROLE) {
        PoolFeeInfo storage pool = poolFeeInfo[poolId];
        require(pool.active, "Pool not registered");
        require(block.timestamp >= pool.lastDistributionTime + minDistributionInterval, "Too soon");

        (,,,, uint256 totalLiquidity, uint256 lockedLiquidity,) = IAxiomExchangeHubFees(exchangeHub).getPoolCore(poolId);
        uint256 activeLiquidity = totalLiquidity - lockedLiquidity;
        require(activeLiquidity > 0, "No liquidity");

        uint256 protocolShareA = (feeAmountA * protocolFeeShare) / BASIS_POINTS;
        uint256 protocolShareB = (feeAmountB * protocolFeeShare) / BASIS_POINTS;
        uint256 lpShareA = feeAmountA - protocolShareA;
        uint256 lpShareB = feeAmountB - protocolShareB;

        if (protocolShareA > 0) {
            IERC20(pool.tokenA).safeTransferFrom(msg.sender, treasurySafe, protocolShareA);
        }
        if (protocolShareB > 0) {
            IERC20(pool.tokenB).safeTransferFrom(msg.sender, treasurySafe, protocolShareB);
        }
        if (lpShareA > 0) {
            IERC20(pool.tokenA).safeTransferFrom(msg.sender, address(this), lpShareA);
            pool.accFeePerShareA += (lpShareA * PRECISION) / activeLiquidity;
            pool.totalDistributedA += lpShareA;
        }
        if (lpShareB > 0) {
            IERC20(pool.tokenB).safeTransferFrom(msg.sender, address(this), lpShareB);
            pool.accFeePerShareB += (lpShareB * PRECISION) / activeLiquidity;
            pool.totalDistributedB += lpShareB;
        }

        pool.lastDistributionTime = block.timestamp;

        emit FeesDistributed(poolId, lpShareA, lpShareB, block.timestamp);
    }

    function updateUserPosition(uint256 poolId, address user) external {
        _updateUserPosition(poolId, user);
    }

    function claimFees(uint256 poolId) external nonReentrant {
        _updateUserPosition(poolId, msg.sender);

        UserFeeInfo storage userInfo = userFeeInfo[poolId][msg.sender];
        PoolFeeInfo storage pool = poolFeeInfo[poolId];

        uint256 amountA = userInfo.pendingA;
        uint256 amountB = userInfo.pendingB;

        require(amountA > 0 || amountB > 0, "No fees to claim");

        userInfo.pendingA = 0;
        userInfo.pendingB = 0;
        userInfo.lastClaimTime = block.timestamp;

        if (amountA > 0) {
            IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
        }
        if (amountB > 0) {
            IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);
        }

        emit FeesClaimed(msg.sender, poolId, pool.tokenA, amountA, pool.tokenB, amountB);
    }

    function claimAllFees() external nonReentrant {
        uint256[] memory pools = userPools[msg.sender];
        
        for (uint256 i = 0; i < pools.length; i++) {
            uint256 poolId = pools[i];
            _updateUserPosition(poolId, msg.sender);

            UserFeeInfo storage userInfo = userFeeInfo[poolId][msg.sender];
            PoolFeeInfo storage pool = poolFeeInfo[poolId];

            uint256 amountA = userInfo.pendingA;
            uint256 amountB = userInfo.pendingB;

            if (amountA > 0 || amountB > 0) {
                userInfo.pendingA = 0;
                userInfo.pendingB = 0;
                userInfo.lastClaimTime = block.timestamp;

                if (amountA > 0) {
                    IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
                }
                if (amountB > 0) {
                    IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);
                }

                emit FeesClaimed(msg.sender, poolId, pool.tokenA, amountA, pool.tokenB, amountB);
            }
        }
    }

    function _updateUserPosition(uint256 poolId, address user) internal {
        PoolFeeInfo storage pool = poolFeeInfo[poolId];
        if (!pool.active) return;

        UserFeeInfo storage userInfo = userFeeInfo[poolId][user];
        uint256 userLiquidity = IAxiomExchangeHubFees(exchangeHub).getUserLiquidity(poolId, user);

        if (userLiquidity > 0) {
            uint256 pendingA = (userLiquidity * pool.accFeePerShareA / PRECISION) - userInfo.rewardDebtA;
            uint256 pendingB = (userLiquidity * pool.accFeePerShareB / PRECISION) - userInfo.rewardDebtB;

            userInfo.pendingA += pendingA;
            userInfo.pendingB += pendingB;
        }

        userInfo.rewardDebtA = userLiquidity * pool.accFeePerShareA / PRECISION;
        userInfo.rewardDebtB = userLiquidity * pool.accFeePerShareB / PRECISION;

        bool found = false;
        uint256[] storage pools = userPools[user];
        for (uint256 i = 0; i < pools.length; i++) {
            if (pools[i] == poolId) {
                found = true;
                break;
            }
        }
        if (!found && userLiquidity > 0) {
            pools.push(poolId);
        }
    }

    function setProtocolFeeShare(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        require(newFee <= 5000, "Fee too high");
        emit ProtocolFeeUpdated(protocolFeeShare, newFee);
        protocolFeeShare = newFee;
    }

    function setMinDistributionInterval(uint256 interval) external onlyRole(ADMIN_ROLE) {
        minDistributionInterval = interval;
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function pendingFees(uint256 poolId, address user) external view returns (uint256 amountA, uint256 amountB) {
        PoolFeeInfo storage pool = poolFeeInfo[poolId];
        UserFeeInfo storage userInfo = userFeeInfo[poolId][user];
        
        uint256 userLiquidity = IAxiomExchangeHubFees(exchangeHub).getUserLiquidity(poolId, user);
        
        if (userLiquidity > 0) {
            amountA = userInfo.pendingA + (userLiquidity * pool.accFeePerShareA / PRECISION) - userInfo.rewardDebtA;
            amountB = userInfo.pendingB + (userLiquidity * pool.accFeePerShareB / PRECISION) - userInfo.rewardDebtB;
        } else {
            amountA = userInfo.pendingA;
            amountB = userInfo.pendingB;
        }
    }

    function getPoolFeeInfo(uint256 poolId) external view returns (PoolFeeInfo memory) {
        return poolFeeInfo[poolId];
    }

    function getUserFeeInfo(uint256 poolId, address user) external view returns (UserFeeInfo memory) {
        return userFeeInfo[poolId][user];
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    uint256[40] private __gap;
}
