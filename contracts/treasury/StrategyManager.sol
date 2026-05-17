// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

/**
 * @title  StrategyManager
 * @notice Authorisation and execution layer for Axiom treasury strategy adapters.
 *
 * Architecture role
 * ─────────────────
 * StrategyManager holds MANAGER_ROLE on every registered strategy adapter.
 * AxiomTreasuryVault (granted STRATEGY_ADMIN here at deploy time) delegates
 * all strategy operations through this contract. This enforces a single
 * control plane:
 *
 *   Vault (STRATEGY_ADMIN on SM) → StrategyManager → Strategy
 *
 * Role hierarchy (on StrategyManager)
 * ────────────────────────────────────
 *   DEFAULT_ADMIN_ROLE — grant/revoke all other roles
 *   STRATEGY_ADMIN     — add/remove strategies; execute allocate / recall / harvest
 *                        (granted to vault at deploy time so vault delegates through SM)
 *   SENTINEL_EXECUTOR  — trigger cross-strategy rebalances
 *                        (granted to vault + off-chain Sentinel API signer at deploy time)
 *
 * Deploy order (no circular dependency)
 * ──────────────────────────────────────
 *   1. Deploy StrategyManager(admin, sentinelExecutor)
 *   2. Deploy AxiomTreasuryVault(admin, strategyAdmin, sentinelExecutor, SM_address, …)
 *   3. Grant vault STRATEGY_ADMIN on SM
 *   4. Grant vault SENTINEL_EXECUTOR on SM  (so vault.rebalance → SM.rebalance works)
 */
contract StrategyManager is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant STRATEGY_ADMIN    = keccak256("STRATEGY_ADMIN");
    bytes32 public constant SENTINEL_EXECUTOR = keccak256("SENTINEL_EXECUTOR");

    // ── Strategy registry ─────────────────────────────────────────────────────
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

    // ── Events ────────────────────────────────────────────────────────────────
    event StrategyRegistered(address indexed strategy, string name, address asset);
    event StrategyDeactivated(address indexed strategy);
    event Allocated(address indexed strategy, uint256 amount);
    event Recalled(address indexed strategy, uint256 amount);
    event Harvested(address indexed strategy, uint256 yieldAmount);
    event Rebalanced(address indexed from, address indexed to, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param admin            Receives DEFAULT_ADMIN_ROLE + STRATEGY_ADMIN.
     * @param sentinelExecutor Receives SENTINEL_EXECUTOR.
     *
     * After deploying the vault, the deployer must also call:
     *   grantRole(STRATEGY_ADMIN, vaultAddress)
     *   grantRole(SENTINEL_EXECUTOR, vaultAddress)
     * so the vault can delegate execution through this contract.
     */
    constructor(address admin, address sentinelExecutor) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(STRATEGY_ADMIN,     admin);
        _grantRole(SENTINEL_EXECUTOR,  sentinelExecutor);
    }

    // ── Strategy registry (STRATEGY_ADMIN — vault delegates here) ─────────────

    function addStrategy(address strategy, string calldata name)
        external onlyRole(STRATEGY_ADMIN)
    {
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
        require(strategyInfo[strategy].active,         "StrategyManager: not active");
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

    // ── Execution (STRATEGY_ADMIN — vault delegates here) ────────────────────

    /**
     * @notice Deploy `amount` to `strategy`.
     *         Caller (vault) must transfer `amount` to this contract before calling.
     *         StrategyManager forwards the tokens to strategy then calls deploy().
     */
    function allocate(address strategy, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) nonReentrant
    {
        StrategyInfo storage info = strategyInfo[strategy];
        require(info.active, "StrategyManager: strategy not active");
        IERC20(info.asset).safeTransfer(strategy, amount);
        IStrategy(strategy).deploy(amount);
        info.allocatedPrincipal += amount;
        emit Allocated(strategy, amount);
    }

    /**
     * @notice Withdraw `amount` from `strategy`.
     *         strategy.withdraw() sends the funds directly to the vault's address
     *         (the strategy's immutable `vault` var).
     *         Returns the actual amount received by the vault.
     */
    function recall(address strategy, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) nonReentrant returns (uint256 received)
    {
        StrategyInfo storage info = strategyInfo[strategy];
        require(info.active, "StrategyManager: strategy not active");
        received = IStrategy(strategy).withdraw(amount);
        if (info.allocatedPrincipal >= received) {
            info.allocatedPrincipal -= received;
        } else {
            info.allocatedPrincipal = 0;
        }
        emit Recalled(strategy, received);
    }

    /**
     * @notice Harvest yield from `strategy`.
     *         strategy.harvest() sends yield directly to the vault's address.
     *         Returns the yield amount harvested.
     */
    function harvest(address strategy)
        external onlyRole(STRATEGY_ADMIN) nonReentrant returns (uint256 yieldAmount)
    {
        StrategyInfo storage info = strategyInfo[strategy];
        require(info.active, "StrategyManager: strategy not active");
        yieldAmount = IStrategy(strategy).harvest();
        info.harvestedYield += yieldAmount;
        emit Harvested(strategy, yieldAmount);
    }

    // ── Rebalance (SENTINEL_EXECUTOR) ─────────────────────────────────────────

    /**
     * @notice Sentinel-gated cross-strategy rebalance.
     *
     *         Withdraw from `fromStrategy` (funds go to vault), then pull from
     *         vault back to this contract and forward to `toStrategy`.
     *
     *         Requires the caller to hold SENTINEL_EXECUTOR.  Both the vault
     *         (granted at deploy time) and the off-chain Sentinel API signer
     *         (deployer, also granted at deploy time) are valid callers.
     *
     * @dev    The vault must have pre-approved this contract to spend its tokens
     *         (or the vault must call approve before rebalancing).  In practice
     *         the vault grants a max-approval during the setup step to keep the
     *         gas path clean; this is acceptable because SM is a trusted
     *         protocol-owned contract.
     */
    function rebalance(address fromStrategy, address toStrategy, uint256 amount)
        external onlyRole(SENTINEL_EXECUTOR) nonReentrant
    {
        StrategyInfo storage fromInfo = strategyInfo[fromStrategy];
        StrategyInfo storage toInfo   = strategyInfo[toStrategy];
        require(fromInfo.active, "StrategyManager: fromStrategy not active");
        require(toInfo.active,   "StrategyManager: toStrategy not active");
        require(fromInfo.asset == toInfo.asset, "StrategyManager: asset mismatch");

        // Step 1: withdraw from source — funds land at vault (strategy's vault immutable)
        uint256 received = IStrategy(fromStrategy).withdraw(amount);
        if (fromInfo.allocatedPrincipal >= received) {
            fromInfo.allocatedPrincipal -= received;
        } else {
            fromInfo.allocatedPrincipal = 0;
        }

        // Step 2: pull those tokens from vault to here, then forward to destination
        address asset = fromInfo.asset;
        address vaultAddr = IStrategy(fromStrategy).vault();
        IERC20(asset).safeTransferFrom(vaultAddr, address(this), received);
        IERC20(asset).safeTransfer(toStrategy, received);
        IStrategy(toStrategy).deploy(received);
        toInfo.allocatedPrincipal += received;

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
