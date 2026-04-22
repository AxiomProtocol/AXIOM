// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IAXAU.sol";

/**
 * @title CommodityRegistry
 * @notice Governance-managed registry of reserve components for the AXAU system.
 *         Implements ICommodityRegistry — provides both individual and batch
 *         component access to minimize external calls in NAVEngine.
 *
 *         Asset decimals are cached at registration time to eliminate per-NAV-loop
 *         IERC20.decimals() external calls.
 */
contract CommodityRegistry is ICommodityRegistry {

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant MAX_COMPONENTS  = 20;
    uint256 public constant MAX_HAIRCUT_BPS = 5000;
    uint256 public constant BPS             = 10_000;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // ── State ─────────────────────────────────────────────────────────────────
    bytes32[] public componentIds;
    mapping(bytes32 => Component) private _components;

    // ── Events ────────────────────────────────────────────────────────────────
    event ComponentAdded(bytes32 indexed id, string symbol, address vault, address oracle, uint8 phase);
    event ComponentUpdated(bytes32 indexed id, address vault, address oracle, uint256 haircutBps);
    event ComponentDisabled(bytes32 indexed id, string reason);
    event ComponentEnabled(bytes32 indexed id);
    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address governor) {
        require(governor != address(0), "Registry: zero governor");
        _grantRole(GOVERNOR_ROLE, governor);
    }

    // ── Modifier ──────────────────────────────────────────────────────────────
    modifier onlyGovernor() {
        require(_roles[GOVERNOR_ROLE][msg.sender], "Registry: not governor");
        _;
    }

    // ── Write ──────────────────────────────────────────────────────────────────

    function addComponent(
        string  calldata sym,
        address vault,
        address oracle,
        uint256 haircutBps,
        uint256 maxWeightBps,
        bool    isLiquid,
        uint8   phase
    ) external onlyGovernor {
        require(componentIds.length < MAX_COMPONENTS, "Registry: too many components");
        require(vault != address(0), "Registry: zero vault");
        require(haircutBps <= MAX_HAIRCUT_BPS, "Registry: haircut too high");
        require(maxWeightBps <= BPS, "Registry: maxWeight > 100%");
        require(bytes(sym).length > 0, "Registry: empty symbol");

        bytes32 id = keccak256(abi.encodePacked(sym));
        require(_components[id].vault == address(0), "Registry: duplicate symbol");

        uint8 oracleDec = 0;
        if (oracle != address(0)) {
            oracleDec = AggregatorV3Interface(oracle).decimals();
            require(oracleDec > 0 && oracleDec <= 18, "Registry: bad oracle decimals");
        }

        // Cache asset decimals from the vault's reserve asset (eliminates per-NAV call)
        uint8 assetDec = 0;
        if (isLiquid && oracle != address(0)) {
            address asset = IVault(vault).reserveAsset();
            require(asset != address(0), "Registry: liquid vault has no reserve asset");
            assetDec = IERC20Minimal(asset).decimals();
            require(assetDec <= 18, "Registry: asset decimals > 18");
        }

        _components[id] = Component({
            id:             id,
            vault:          vault,
            oracle:         oracle,
            haircutBps:     haircutBps,
            maxWeightBps:   maxWeightBps,
            isLiquid:       isLiquid,
            enabled:        true,
            symbol:         sym,
            oracleDecimals: oracleDec,
            assetDecimals:  assetDec,
            phase:          phase
        });
        componentIds.push(id);

        emit ComponentAdded(id, sym, vault, oracle, phase);
    }

    function updateComponent(
        bytes32 id,
        address vault,
        address oracle,
        uint256 haircutBps
    ) external onlyGovernor {
        require(_components[id].vault != address(0), "Registry: not found");
        require(vault != address(0), "Registry: zero vault");
        require(haircutBps <= MAX_HAIRCUT_BPS, "Registry: haircut too high");

        uint8 oracleDec = 0;
        if (oracle != address(0)) {
            oracleDec = AggregatorV3Interface(oracle).decimals();
        }

        uint8 assetDec = 0;
        if (_components[id].isLiquid && oracle != address(0)) {
            address asset = IVault(vault).reserveAsset();
            if (asset != address(0)) {
                assetDec = IERC20Minimal(asset).decimals();
            }
        }

        _components[id].vault          = vault;
        _components[id].oracle         = oracle;
        _components[id].haircutBps     = haircutBps;
        _components[id].oracleDecimals = oracleDec;
        _components[id].assetDecimals  = assetDec;

        emit ComponentUpdated(id, vault, oracle, haircutBps);
    }

    function disableComponent(bytes32 id, string calldata reason) external onlyGovernor {
        require(_components[id].vault != address(0), "Registry: not found");
        _components[id].enabled = false;
        emit ComponentDisabled(id, reason);
    }

    function enableComponent(bytes32 id) external onlyGovernor {
        require(_components[id].vault != address(0), "Registry: not found");
        _components[id].enabled = true;
        emit ComponentEnabled(id);
    }

    // ── Read ───────────────────────────────────────────────────────────────────

    function getComponent(bytes32 id) external view returns (Component memory) {
        return _components[id];
    }

    function getAllComponentIds() external view returns (bytes32[] memory) {
        return componentIds;
    }

    /**
     * @notice Returns all components in a single call to eliminate per-component
     *         external calls in NAVEngine's valuation loop.
     */
    function getAllComponents() external view returns (Component[] memory all) {
        uint256 len = componentIds.length;
        all = new Component[](len);
        for (uint256 i = 0; i < len; i++) {
            all[i] = _components[componentIds[i]];
        }
    }

    function componentCount() external view returns (uint256) {
        return componentIds.length;
    }

    // ── Role management ───────────────────────────────────────────────────────

    function grantRole(bytes32 role, address account) external onlyGovernor {
        require(account != address(0), "Registry: zero account");
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyGovernor {
        require(_roles[role][account], "Registry: not granted");
        _roles[role][account] = false;
        emit RoleRevoked(role, account);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function _grantRole(bytes32 role, address account) internal {
        _roles[role][account] = true;
        emit RoleGranted(role, account);
    }
}
