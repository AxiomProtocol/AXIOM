// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

interface IIdentityRegistry {
    function isVerified(address user) external view returns (bool);
}

interface IComplianceModule {
    function canTransfer(
        address from,
        address to,
        uint256 amount
    ) external view returns (bool);
}

interface IReserveOracle {
    function getReserveIndex() external view returns (uint256);
}

/**
 * @title Axiom Protocol Token (Option C, OZ v5 compatible)
 *
 * Core governance + fee-routing token for the AXIOM ecosystem.
 * - 15B hard-capped supply
 * - Role-based access control
 * - Optional KYC / compliance hooks
 * - Dynamic fee routing to multiple vaults
 * - Anti-whale max-tx guard
 * - Demurrage hook controlled by treasury
 */
contract AxiomV2 is
    ERC20,
    ERC20Burnable,
    ERC20Permit,
    ERC20Votes,
    Pausable,
    AccessControl,
    ReentrancyGuard
{
    // ────────────────────────
    // Roles
    // ────────────────────────

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant RESCUER_ROLE = keccak256("RESCUER_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    // ────────────────────────
    // Supply + math constants
    // ────────────────────────

    // Max supply: 15 billion AXM with 18 decimals
    uint256 public constant MAX_SUPPLY = 15_000_000_000 ether;

    // Basis points denominator
    uint16 public constant BPS_DENOMINATOR = 10_000;

    // ────────────────────────
    // Vaults and system endpoints
    // ────────────────────────

    address public distributionVault;
    address public burnVault;
    address public stakingVault;
    address public liquidityVault;
    address public dividendVault;
    address public treasuryVault;

    // Routers for external real world revenue systems
    address public rentRouter;
    address public truckingRouter;

    // ────────────────────────
    // Compliance and identity
    // ────────────────────────

    IIdentityRegistry public identityRegistry;
    IComplianceModule public complianceModule;

    // Sovereign reserve oracle and backing index
    IReserveOracle public reserveOracle;
    uint256 public liquidBackingIndex; // abstract index representing reserves

    // ────────────────────────
    // Dynamic fee configuration
    // ────────────────────────

    struct FeeConfig {
        uint16 transferFeeBps; // total fee on transfers
        uint16 burnFeeBps; // portion of fee sent to burn
        uint16 stakingFeeBps; // portion sent to staking vault
        uint16 liquidityFeeBps; // portion sent to liquidity vault
        uint16 dividendFeeBps; // portion sent to dividend vault or distributor
        uint16 treasuryFeeBps; // portion sent to treasury vault
    }

    FeeConfig public feeConfig;

    // Exemptions from fees and transaction limits
    mapping(address => bool) public isFeeExempt;
    mapping(address => bool) public isTxLimitExempt;

    // Anti whale settings
    bool public maxTxEnabled;
    uint256 public maxTxAmount; // in token units (18 decimals)

    // Demurrage parameters (burn pressure controlled by treasury)
    bool public demurrageEnabled;
    uint16 public demurrageFeeBps; // applied when treasury triggers demurrage events

    // Internal flag to avoid re-entering fee logic on internal accounting transfers
    bool private _inFeeTransfer;

    // ────────────────────────
    // Events
    // ────────────────────────

    event DistributionVaultUpdated(address indexed previousVault, address indexed newVault);
    event BurnVaultUpdated(address indexed previousVault, address indexed newVault);
    event StakingVaultUpdated(address indexed previousVault, address indexed newVault);
    event LiquidityVaultUpdated(address indexed previousVault, address indexed newVault);
    event DividendVaultUpdated(address indexed previousVault, address indexed newVault);
    event TreasuryVaultUpdated(address indexed previousVault, address indexed newVault);

    event RentRouterUpdated(address indexed previousRouter, address indexed newRouter);
    event TruckingRouterUpdated(address indexed previousRouter, address indexed newRouter);

    event IdentityRegistryUpdated(address indexed previousRegistry, address indexed newRegistry);
    event ComplianceModuleUpdated(address indexed previousModule, address indexed newModule);
    event ReserveOracleUpdated(address indexed previousOracle, address indexed newOracle);
    event LiquidBackingIndexUpdated(uint256 newIndex);

    event FeeConfigUpdated(FeeConfig previousConfig, FeeConfig newConfig);
    event FeeExemptionUpdated(address indexed account, bool isExempt);
    event TxLimitExemptionUpdated(address indexed account, bool isExempt);
    event MaxTxSettingsUpdated(bool enabled, uint256 maxAmount);

    event DemurrageSettingsUpdated(bool enabled, uint16 feeBps);
    event DemurrageApplied(uint256 amountBurned);

    event TokensRescued(address indexed token, address indexed to, uint256 amount);

    // ────────────────────────
    // Constructor
    // ────────────────────────

    constructor(
        address admin_,
        address distributionVault_,
        address burnVault_,
        address stakingVault_,
        address liquidityVault_,
        address dividendVault_,
        address treasuryVault_
    )
        ERC20("Axiom Protocol Token", "AXM")
        ERC20Permit("Axiom Protocol Token")
    {
        require(admin_ != address(0), "Axiom: admin is zero");
        require(distributionVault_ != address(0), "Axiom: distribution vault zero");
        require(burnVault_ != address(0), "Axiom: burn vault zero");
        require(stakingVault_ != address(0), "Axiom: staking vault zero");
        require(liquidityVault_ != address(0), "Axiom: liquidity vault zero");
        require(dividendVault_ != address(0), "Axiom: dividend vault zero");
        require(treasuryVault_ != address(0), "Axiom: treasury vault zero");

        distributionVault = distributionVault_;
        burnVault = burnVault_;
        stakingVault = stakingVault_;
        liquidityVault = liquidityVault_;
        dividendVault = dividendVault_;
        treasuryVault = treasuryVault_;

        // Grant roles to admin
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(PAUSER_ROLE, admin_);
        _grantRole(MINTER_ROLE, admin_);
        _grantRole(COMPLIANCE_ROLE, admin_);
        _grantRole(RESCUER_ROLE, admin_);
        _grantRole(FEE_MANAGER_ROLE, admin_);
        _grantRole(ORACLE_MANAGER_ROLE, admin_);
        _grantRole(TREASURY_ROLE, admin_);

        // Default fee config is zero fees; can be set later
        feeConfig = FeeConfig({
            transferFeeBps: 0,
            burnFeeBps: 0,
            stakingFeeBps: 0,
            liquidityFeeBps: 0,
            dividendFeeBps: 0,
            treasuryFeeBps: 0
        });

        // Exempt core system addresses from fees and limits
        isFeeExempt[admin_] = true;
        isFeeExempt[distributionVault_] = true;
        isFeeExempt[burnVault_] = true;
        isFeeExempt[stakingVault_] = true;
        isFeeExempt[liquidityVault_] = true;
        isFeeExempt[dividendVault_] = true;
        isFeeExempt[treasuryVault_] = true;

        isTxLimitExempt[admin_] = true;
        isTxLimitExempt[distributionVault_] = true;
        isTxLimitExempt[burnVault_] = true;
        isTxLimitExempt[stakingVault_] = true;
        isTxLimitExempt[liquidityVault_] = true;
        isTxLimitExempt[dividendVault_] = true;
        isTxLimitExempt[treasuryVault_] = true;

        maxTxEnabled = false;
        maxTxAmount = 0;
    }

    // ────────────────────────
    // Admin and config functions
    // ────────────────────────

    function setDistributionVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newVault != address(0), "Axiom: vault is zero");
        address previous = distributionVault;
        distributionVault = newVault;
        emit DistributionVaultUpdated(previous, newVault);
    }

    function setBurnVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newVault != address(0), "Axiom: vault is zero");
        address previous = burnVault;
        burnVault = newVault;
        emit BurnVaultUpdated(previous, newVault);
    }

    function setStakingVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newVault != address(0), "Axiom: vault is zero");
        address previous = stakingVault;
        stakingVault = newVault;
        emit StakingVaultUpdated(previous, newVault);
    }

    function setLiquidityVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newVault != address(0), "Axiom: vault is zero");
        address previous = liquidityVault;
        liquidityVault = newVault;
        emit LiquidityVaultUpdated(previous, newVault);
    }

    function setDividendVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newVault != address(0), "Axiom: vault is zero");
        address previous = dividendVault;
        dividendVault = newVault;
        emit DividendVaultUpdated(previous, newVault);
    }

    function setTreasuryVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newVault != address(0), "Axiom: vault is zero");
        address previous = treasuryVault;
        treasuryVault = newVault;
        emit TreasuryVaultUpdated(previous, newVault);
    }

    function setRentRouter(address newRouter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address previous = rentRouter;
        rentRouter = newRouter;
        emit RentRouterUpdated(previous, newRouter);
    }

    function setTruckingRouter(address newRouter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address previous = truckingRouter;
        truckingRouter = newRouter;
        emit TruckingRouterUpdated(previous, newRouter);
    }

    function setIdentityRegistry(address newRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address previous = address(identityRegistry);
        identityRegistry = IIdentityRegistry(newRegistry);
        emit IdentityRegistryUpdated(previous, newRegistry);
    }

    function setComplianceModule(address newModule) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address previous = address(complianceModule);
        complianceModule = IComplianceModule(newModule);
        emit ComplianceModuleUpdated(previous, newModule);
    }

    function setReserveOracle(address newOracle) external onlyRole(ORACLE_MANAGER_ROLE) {
        address previous = address(reserveOracle);
        reserveOracle = IReserveOracle(newOracle);
        emit ReserveOracleUpdated(previous, newOracle);
    }

    function updateLiquidBackingIndex() external onlyRole(ORACLE_MANAGER_ROLE) {
        require(address(reserveOracle) != address(0), "Axiom: oracle not set");
        uint256 index = reserveOracle.getReserveIndex();
        liquidBackingIndex = index;
        emit LiquidBackingIndexUpdated(index);
    }

    function setFeeConfig(FeeConfig calldata newConfig) external onlyRole(FEE_MANAGER_ROLE) {
        require(newConfig.transferFeeBps <= BPS_DENOMINATOR, "Axiom: total fee too high");

        uint32 sumParts =
            uint32(newConfig.burnFeeBps) +
            uint32(newConfig.stakingFeeBps) +
            uint32(newConfig.liquidityFeeBps) +
            uint32(newConfig.dividendFeeBps) +
            uint32(newConfig.treasuryFeeBps);

        require(sumParts == newConfig.transferFeeBps, "Axiom: fee parts mismatch");

        FeeConfig memory previous = feeConfig;
        feeConfig = newConfig;
        emit FeeConfigUpdated(previous, newConfig);
    }

    function setFeeExempt(address account, bool exempt) external onlyRole(FEE_MANAGER_ROLE) {
        isFeeExempt[account] = exempt;
        emit FeeExemptionUpdated(account, exempt);
    }

    function setTxLimitExempt(address account, bool exempt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isTxLimitExempt[account] = exempt;
        emit TxLimitExemptionUpdated(account, exempt);
    }

    function setMaxTxSettings(bool enabled, uint256 maxAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxTxEnabled = enabled;
        maxTxAmount = maxAmount;
        emit MaxTxSettingsUpdated(enabled, maxAmount);
    }

    function setDemurrageSettings(bool enabled, uint16 feeBps) external onlyRole(TREASURY_ROLE) {
        require(feeBps <= BPS_DENOMINATOR, "Axiom: invalid demurrage");
        demurrageEnabled = enabled;
        demurrageFeeBps = feeBps;
        emit DemurrageSettingsUpdated(enabled, feeBps);
    }

    // Demurrage hook: treasury can burn its own holdings to simulate demurrage
    function applyDemurrage(uint256 amount) external onlyRole(TREASURY_ROLE) nonReentrant {
        require(demurrageEnabled, "Axiom: demurrage disabled");
        require(amount > 0, "Axiom: amount zero");
        _burn(treasuryVault, amount);
        emit DemurrageApplied(amount);
    }

    // ────────────────────────
    // Basic views
    // ────────────────────────

    function isVerified(address user) external view returns (bool) {
        if (address(identityRegistry) == address(0)) {
            return true;
        }
        return identityRegistry.isVerified(user);
    }

    // ────────────────────────
    // Pause and unpause
    // ────────────────────────

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ────────────────────────
    // Mint with supply cap
    // ────────────────────────

    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
        nonReentrant
    {
        require(to != address(0), "Axiom: mint to zero");
        require(totalSupply() + amount <= MAX_SUPPLY, "Axiom: max supply exceeded");
        
        uint256 supplyBefore = totalSupply();
        _mint(to, amount);
        
        // Formal verification assertions (SMTChecker will prove these mathematically)
        assert(totalSupply() == supplyBefore + amount);
        assert(totalSupply() <= MAX_SUPPLY);
        assert(balanceOf(to) >= amount);
    }

    // ────────────────────────
    // Rescue tokens mistakenly sent to this contract
    // ────────────────────────

    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(RESCUER_ROLE) nonReentrant {
        require(to != address(0), "Axiom: to is zero");
        require(amount > 0, "Axiom: amount is zero");

        if (token == address(this)) {
            _transfer(address(this), to, amount);
        } else {
            (bool ok, bytes memory data) =
                token.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
            require(ok, "Axiom: rescue failed");
            if (data.length > 0) {
                require(abi.decode(data, (bool)), "Axiom: rescue return false");
            }
        }

        emit TokensRescued(token, to, amount);
    }

    // ────────────────────────
    // Internal transfer + fee logic
    // ────────────────────────

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
        whenNotPaused
    {
        // If in internal accounting move, skip fees and checks
        if (_inFeeTransfer) {
            super._update(from, to, value);
            return;
        }

        bool isMint = from == address(0);
        bool isBurn = to == address(0);

        if (!isMint && !isBurn) {
            // Compliance checks if configured
            if (address(identityRegistry) != address(0)) {
                require(identityRegistry.isVerified(from), "Axiom: sender not verified");
                require(identityRegistry.isVerified(to), "Axiom: recipient not verified");
            }

            if (address(complianceModule) != address(0) && value > 0) {
                bool allowed = complianceModule.canTransfer(from, to, value);
                require(allowed, "Axiom: transfer blocked by compliance");
            }

            // Anti whale check
            if (maxTxEnabled && !isTxLimitExempt[from] && !isTxLimitExempt[to]) {
                require(value <= maxTxAmount, "Axiom: transfer exceeds max tx amount");
            }
        }

        // If no fee, or mint, or burn, or either party is fee exempt, do a simple transfer
        if (
            isMint ||
            isBurn ||
            feeConfig.transferFeeBps == 0 ||
            isFeeExempt[from] ||
            isFeeExempt[to]
        ) {
            super._update(from, to, value);
            return;
        }

        // Dynamic fee model
        uint256 feeAmount = (value * feeConfig.transferFeeBps) / BPS_DENOMINATOR;
        uint256 amountAfterFee = value - feeAmount;
        
        // Formal verification: fee calculations are correct
        assert(feeAmount + amountAfterFee <= value);
        assert(feeAmount <= value);
        assert(amountAfterFee <= value);

        _inFeeTransfer = true;

        // Main transfer to recipient
        super._update(from, to, amountAfterFee);

        if (feeAmount > 0) {
            uint256 remaining = feeAmount;

            // Burn portion
            if (feeConfig.burnFeeBps > 0 && burnVault != address(0)) {
                uint256 burnAmount = (feeAmount * feeConfig.burnFeeBps) / feeConfig.transferFeeBps;
                if (burnAmount > 0) {
                    remaining -= burnAmount;
                    // burn from sender
                    super._update(from, address(0), burnAmount);
                }
            }

            // Staking portion
            if (feeConfig.stakingFeeBps > 0 && stakingVault != address(0)) {
                uint256 stakingAmount =
                    (feeAmount * feeConfig.stakingFeeBps) / feeConfig.transferFeeBps;
                if (stakingAmount > 0) {
                    remaining -= stakingAmount;
                    super._update(from, stakingVault, stakingAmount);
                }
            }

            // Liquidity portion
            if (feeConfig.liquidityFeeBps > 0 && liquidityVault != address(0)) {
                uint256 liquidityAmount =
                    (feeAmount * feeConfig.liquidityFeeBps) / feeConfig.transferFeeBps;
                if (liquidityAmount > 0) {
                    remaining -= liquidityAmount;
                    super._update(from, liquidityVault, liquidityAmount);
                }
            }

            // Dividend portion
            if (feeConfig.dividendFeeBps > 0 && dividendVault != address(0)) {
                uint256 dividendAmount =
                    (feeAmount * feeConfig.dividendFeeBps) / feeConfig.transferFeeBps;
                if (dividendAmount > 0) {
                    remaining -= dividendAmount;
                    super._update(from, dividendVault, dividendAmount);
                }
            }

            // Treasury portion gets the remainder to absorb rounding
            if (treasuryVault != address(0) && remaining > 0) {
                super._update(from, treasuryVault, remaining);
            }
        }

        _inFeeTransfer = false;
    }

    // ────────────────────────
    // Overrides required by Solidity
    // ────────────────────────

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
