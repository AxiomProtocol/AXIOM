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
 * Rebalance control flow
 * ──────────────────────
 * Rebalances are orchestrated by the vault (not SM). The vault:
 *   1. Calls SM.recall(fromStrategy) → funds arrive at vault
 *   2. Transfers funds from vault to SM
 *   3. Calls SM.allocate(toStrategy) → SM deploys to destination
 * This avoids any vault→SM token approval requirement.
 *
 * Role hierarchy (on StrategyManager)
 * ────────────────────────────────────
 *   DEFAULT_ADMIN_ROLE — grant/revoke all roles
 *   STRATEGY_ADMIN     — add/remove strategies; allocate / recall / harvest
 *                        (granted to vault at deploy time)
 */
contract StrategyManager is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant STRATEGY_ADMIN = keccak256("STRATEGY_ADMIN");

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
    event Allocated(address indexed strategy, address indexed assetAddr, uint256 amount);
    event FundedPairedAsset(address indexed strategy, address indexed assetAddr, uint256 amount);
    event Recalled(address indexed strategy, uint256 amount);
    event Harvested(address indexed strategy, uint256 yieldAmount);

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param admin  Receives DEFAULT_ADMIN_ROLE + STRATEGY_ADMIN.
     *
     * After deploying the vault, the deployer must also call:
     *   grantRole(STRATEGY_ADMIN, vaultAddress)
     * so the vault can delegate allocate/recall/harvest/addStrategy/removeStrategy.
     */
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(STRATEGY_ADMIN,     admin);
    }

    // ── Strategy registry ─────────────────────────────────────────────────────

    function addStrategy(address strategy, string calldata name)
        external onlyRole(STRATEGY_ADMIN)
    {
        require(!strategyInfo[strategy].active, "StrategyManager: already active");
        address assetAddr = IStrategy(strategy).asset();
        strategyInfo[strategy] = StrategyInfo({
            active:             true,
            name:               name,
            asset:              assetAddr,
            allocatedPrincipal: 0,
            harvestedYield:     0,
            addedAt:            block.timestamp
        });
        strategyAddresses.push(strategy);
        emit StrategyRegistered(strategy, name, assetAddr);
    }

    function removeStrategy(address strategy) external onlyRole(STRATEGY_ADMIN) {
        require(strategyInfo[strategy].active,          "StrategyManager: not active");
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
     * @notice Deploy `amount` of `strategyInfo.asset` to `strategy`.
     *         Retained for backward-compatibility with single-asset strategies.
     *         Caller (vault) must transfer `amount` of the strategy's primary asset
     *         to this contract before calling.
     * @dev    For multi-asset strategies (e.g. Camelot LP), use fundPairedAsset()
     *         for the secondary asset first, then allocateAsset() with the primary.
     */
    function allocate(address strategy, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) nonReentrant
    {
        StrategyInfo storage info = strategyInfo[strategy];
        require(info.active, "StrategyManager: strategy not active");
        IERC20(info.asset).safeTransfer(strategy, amount);
        IStrategy(strategy).deploy(amount);
        info.allocatedPrincipal += amount;
        emit Allocated(strategy, info.asset, amount);
    }

    /**
     * @notice Deploy `amount` of the explicitly specified `assetAddr` to `strategy`.
     *         Enables multi-asset capital flows:
     *           - AXUSD → AaveV3Strategy configured with AXUSD as primary asset
     *           - USDC  → CamelotStrategy (primary side) after AXUSD is pre-funded
     *         Caller (vault) must transfer `amount` of `assetAddr` to this contract
     *         before calling. SM transfers `assetAddr` to strategy, then calls deploy().
     *
     * @param  strategy  Registered IStrategy adapter.
     * @param  assetAddr Token address to forward. Must match what strategy expects
     *                   for this deployment (USDC for CamelotStrategy primary call,
     *                   AXUSD for AaveV3StrategyAXUSD primary call).
     * @param  amount    Amount in token's native decimals.
     */
    function allocateAsset(address strategy, address assetAddr, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) nonReentrant
    {
        StrategyInfo storage info = strategyInfo[strategy];
        require(info.active, "StrategyManager: strategy not active");
        IERC20(assetAddr).safeTransfer(strategy, amount);
        IStrategy(strategy).deploy(amount);
        info.allocatedPrincipal += amount;
        emit Allocated(strategy, assetAddr, amount);
    }

    /**
     * @notice Transfer `assetAddr` to `strategy` WITHOUT calling deploy().
     *         Used to pre-fund the secondary (paired) asset of a multi-asset
     *         strategy before the primary allocation triggers deploy().
     *
     *         Camelot USDC+AXUSD LP flow:
     *           1. vault calls SM.fundPairedAsset(camelot, AXUSD, axusdAmt)
     *              → AXUSD arrives at CamelotStrategy
     *           2. vault calls SM.allocateAsset(camelot, USDC, usdcAmt)
     *              → USDC arrives at CamelotStrategy, then deploy() reads both balances
     *
     *         allocatedPrincipal is NOT updated here — the strategy's own principal
     *         tracking and the primary allocateAsset() call cover accounting.
     *
     * @param  strategy  Registered IStrategy adapter.
     * @param  assetAddr Secondary token to pre-fund (e.g. AXUSD).
     * @param  amount    Amount in token's native decimals.
     */
    function fundPairedAsset(address strategy, address assetAddr, uint256 amount)
        external onlyRole(STRATEGY_ADMIN) nonReentrant
    {
        StrategyInfo storage info = strategyInfo[strategy];
        require(info.active, "StrategyManager: strategy not active");
        IERC20(assetAddr).safeTransfer(strategy, amount);
        emit FundedPairedAsset(strategy, assetAddr, amount);
    }

    /**
     * @notice Withdraw `amount` from `strategy`.
     *         strategy.withdraw() sends funds directly to the vault address
     *         (the strategy's immutable `vault` var).
     *         Returns the actual amount received.
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
     *         strategy.harvest() sends yield directly to the vault address.
     *         Returns the yield amount.
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

    // ── View helpers ──────────────────────────────────────────────────────────

    function activeStrategyCount() external view returns (uint256) {
        return strategyAddresses.length;
    }

    function getStrategyAddresses() external view returns (address[] memory) {
        return strategyAddresses;
    }

    function totalDeployed(address assetAddr) external view returns (uint256 total) {
        uint256 len = strategyAddresses.length;
        for (uint256 i = 0; i < len; i++) {
            if (strategyInfo[strategyAddresses[i]].asset == assetAddr) {
                total += IStrategy(strategyAddresses[i]).currentValue();
            }
        }
    }
}
