// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

/**
 * @title  StrategyManager
 * @notice Registry and execution layer for Axiom treasury strategy adapters.
 *         Only strategies approved by STRATEGY_ADMIN may be called.
 *         The vault calls through this manager so that allocation logic is
 *         separated from the vault's custody role.
 *
 * Role hierarchy
 * ─────────────
 *   STRATEGY_ADMIN    — add/remove strategies; execute allocate/harvest
 *   SENTINEL_EXECUTOR — trigger cross-strategy rebalances
 */
contract StrategyManager is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant STRATEGY_ADMIN    = keccak256("STRATEGY_ADMIN");
    bytes32 public constant SENTINEL_EXECUTOR = keccak256("SENTINEL_EXECUTOR");

    struct StrategyInfo {
        bool     active;
        string   name;
        address  asset;
        uint256  allocatedPrincipal;
        uint256  harvestedYield;
        uint256  addedAt;
    }

    mapping(address => StrategyInfo) public strategyInfo;
    address[] public strategyAddresses;

    event StrategyRegistered(address indexed strategy, string name, address asset);
    event StrategyDeactivated(address indexed strategy);
    event Allocated(address indexed strategy, uint256 amount);
    event Recalled(address indexed strategy, uint256 amount);
    event Harvested(address indexed strategy, uint256 yieldAmount);
    event Rebalanced(address indexed from, address indexed to, uint256 amount);

    constructor(address admin, address sentinelExecutor) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(STRATEGY_ADMIN,    admin);
        _grantRole(SENTINEL_EXECUTOR, sentinelExecutor);
    }

    // ── Strategy registry ─────────────────────────────────────────────────────

    function addStrategy(address strategy, string calldata name) external onlyRole(STRATEGY_ADMIN) {
        require(!strategyInfo[strategy].active, "StrategyManager: already active");
        address asset = IStrategy(strategy).asset();
        strategyInfo[strategy] = StrategyInfo({
            active:             true,
            name:               name,
            asset:              asset,
            allocatedPrincipal: 0,
            harvestedYield:     0,
            addedAt:            block.timestamp
        });
        strategyAddresses.push(strategy);
        emit StrategyRegistered(strategy, name, asset);
    }

    function removeStrategy(address strategy) external onlyRole(STRATEGY_ADMIN) {
        require(strategyInfo[strategy].active, "StrategyManager: not active");
        require(IStrategy(strategy).currentValue() == 0, "StrategyManager: still deployed");
        strategyInfo[strategy].active = false;
        uint256 len = strategyAddresses.length;
        for (uint256 i = 0; i < len; i++) {
            if (strategyAddresses[i] == strategy) {
                strategyAddresses[i] = strategyAddresses[len - 1];
                strategyAddresses.pop();
                break;
            }
        }
        emit StrategyDeactivated(strategy);
    }

    // ── Execution ─────────────────────────────────────────────────────────────

    /**
     * @notice Allocate `amount` of asset to `strategy`.
     *         Caller must have already sent `amount` to this contract.
     */
    function allocate(address strategy, uint256 amount) external onlyRole(STRATEGY_ADMIN) nonReentrant {
        StrategyInfo storage info = strategyInfo[strategy];
        require(info.active, "StrategyManager: strategy not active");
        IERC20(info.asset).safeTransfer(strategy, amount);
        IStrategy(strategy).deploy(amount);
        info.allocatedPrincipal += amount;
        emit Allocated(strategy, amount);
    }

    /**
     * @notice Recall `amount` from a strategy back to this contract.
     */
    function recall(address strategy, uint256 amount) external onlyRole(STRATEGY_ADMIN) nonReentrant {
        StrategyInfo storage info = strategyInfo[strategy];
        require(info.active, "StrategyManager: strategy not active");
        uint256 received = IStrategy(strategy).withdraw(amount);
        if (info.allocatedPrincipal >= received) {
            info.allocatedPrincipal -= received;
        } else {
            info.allocatedPrincipal = 0;
        }
        emit Recalled(strategy, received);
    }

    /**
     * @notice Harvest yield from a strategy.
     */
    function harvest(address strategy) external onlyRole(STRATEGY_ADMIN) nonReentrant returns (uint256) {
        StrategyInfo storage info = strategyInfo[strategy];
        require(info.active, "StrategyManager: strategy not active");
        uint256 yieldAmount = IStrategy(strategy).harvest();
        info.harvestedYield += yieldAmount;
        emit Harvested(strategy, yieldAmount);
        return yieldAmount;
    }

    /**
     * @notice Sentinel-gated rebalance across two strategies.
     */
    function rebalance(address fromStrategy, address toStrategy, uint256 amount)
        external onlyRole(SENTINEL_EXECUTOR) nonReentrant
    {
        require(strategyInfo[fromStrategy].active, "StrategyManager: fromStrategy not active");
        require(strategyInfo[toStrategy].active,   "StrategyManager: toStrategy not active");
        require(
            strategyInfo[fromStrategy].asset == strategyInfo[toStrategy].asset,
            "StrategyManager: asset mismatch"
        );
        uint256 received = IStrategy(fromStrategy).withdraw(amount);
        strategyInfo[fromStrategy].allocatedPrincipal -= received;

        address asset = strategyInfo[toStrategy].asset;
        IERC20(asset).safeTransfer(toStrategy, received);
        IStrategy(toStrategy).deploy(received);
        strategyInfo[toStrategy].allocatedPrincipal += received;

        emit Rebalanced(fromStrategy, toStrategy, received);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function activeStrategyCount() external view returns (uint256) {
        return strategyAddresses.length;
    }

    function getStrategyAddresses() external view returns (address[] memory) {
        return strategyAddresses;
    }

    function totalDeployed(address asset) external view returns (uint256 total) {
        uint256 len = strategyAddresses.length;
        for (uint256 i = 0; i < len; i++) {
            if (strategyInfo[strategyAddresses[i]].asset == asset) {
                total += IStrategy(strategyAddresses[i]).currentValue();
            }
        }
    }
}
