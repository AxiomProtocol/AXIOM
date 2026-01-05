// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IVaultEngine.sol";
import "../interfaces/IAxiomStable.sol";
import "../lib/VaultMath.sol";

contract Liquidator is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    IVaultEngine public immutable vaultEngine;
    IAxiomStable public immutable axusd;

    bool public permissionless;
    uint256 public keeperBonus;

    event LiquidationExecuted(
        address indexed owner,
        address indexed collateral,
        address indexed keeper,
        uint256 debtCovered,
        uint256 collateralSeized,
        uint256 bonus
    );
    event PermissionlessToggled(bool enabled);
    event KeeperBonusUpdated(uint256 newBonus);

    constructor(address _vaultEngine, address _axusd) {
        require(_vaultEngine != address(0), "Liquidator: zero vault engine");
        require(_axusd != address(0), "Liquidator: zero axusd");

        vaultEngine = IVaultEngine(_vaultEngine);
        axusd = IAxiomStable(_axusd);
        permissionless = true;
        keeperBonus = 50;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function liquidate(
        address owner,
        address collateral,
        uint256 maxDebtToCover
    ) external nonReentrant {
        if (!permissionless) {
            require(hasRole(KEEPER_ROLE, msg.sender), "Liquidator: not keeper");
        }

        require(vaultEngine.isLiquidatable(owner, collateral), "Liquidator: not liquidatable");

        IVaultEngine.Vault memory vault = vaultEngine.getVault(owner, collateral);
        require(vault.debtAmount > 0, "Liquidator: no debt");

        uint256 maxAllowed = (vault.debtAmount * 5000) / 10000;
        uint256 debtToCover = VaultMath.min(maxDebtToCover, maxAllowed);
        debtToCover = VaultMath.min(debtToCover, vault.debtAmount);

        require(IERC20(address(axusd)).balanceOf(msg.sender) >= debtToCover, "Liquidator: insufficient AXUSD");

        IERC20(address(axusd)).safeTransferFrom(msg.sender, address(this), debtToCover);
        IERC20(address(axusd)).approve(address(vaultEngine), debtToCover);

        IVaultEngine(address(vaultEngine)).liquidate(owner, collateral, debtToCover);

        uint256 collateralAfter = IERC20(collateral).balanceOf(address(this));
        uint256 collateralReceived = collateralAfter;

        IERC20(collateral).safeTransfer(msg.sender, collateralReceived);

        uint256 bonus = (collateralReceived * keeperBonus) / 10000;

        emit LiquidationExecuted(owner, collateral, msg.sender, debtToCover, collateralReceived, bonus);
    }

    function batchLiquidate(
        address[] calldata owners,
        address[] calldata collaterals,
        uint256[] calldata maxDebts
    ) external nonReentrant {
        require(owners.length == collaterals.length, "Liquidator: length mismatch");
        require(owners.length == maxDebts.length, "Liquidator: length mismatch");

        for (uint256 i = 0; i < owners.length; i++) {
            if (vaultEngine.isLiquidatable(owners[i], collaterals[i])) {
                try this.liquidateSingle(owners[i], collaterals[i], maxDebts[i]) {
                } catch {
                }
            }
        }
    }

    function liquidateSingle(
        address owner,
        address collateral,
        uint256 maxDebt
    ) external {
        require(msg.sender == address(this), "Liquidator: internal only");
        
        IVaultEngine.Vault memory vault = vaultEngine.getVault(owner, collateral);
        uint256 maxAllowed = (vault.debtAmount * 5000) / 10000;
        uint256 debtToCover = VaultMath.min(maxDebt, maxAllowed);

        IVaultEngine(address(vaultEngine)).liquidate(owner, collateral, debtToCover);
    }

    function setPermissionless(bool enabled) external onlyRole(ADMIN_ROLE) {
        permissionless = enabled;
        emit PermissionlessToggled(enabled);
    }

    function setKeeperBonus(uint256 newBonus) external onlyRole(ADMIN_ROLE) {
        require(newBonus <= 500, "Liquidator: bonus too high");
        keeperBonus = newBonus;
        emit KeeperBonusUpdated(newBonus);
    }

    function getLiquidatableVaults(
        address[] calldata owners,
        address[] calldata collaterals
    ) external view returns (bool[] memory) {
        require(owners.length == collaterals.length, "Liquidator: length mismatch");
        
        bool[] memory results = new bool[](owners.length);
        for (uint256 i = 0; i < owners.length; i++) {
            results[i] = vaultEngine.isLiquidatable(owners[i], collaterals[i]);
        }
        return results;
    }

    function rescueTokens(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
