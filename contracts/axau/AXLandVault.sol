// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IAXAU.sol";

/**
 * @title AXLandVault
 * @notice Phase 3 illiquid reserve vault. Implements IAXLandVault.
 *         Tracks Axiom land pipeline assets as off-chain USD NAV attested monthly
 *         via LandNAVOracleMultiSig. No transferable on-chain token.
 *
 * @dev Safety mechanisms:
 *      - Monthly NAV cadence enforced via NAV_STALE_WINDOW (35 days).
 *      - Land assets excluded from redemption (isLiquid = false in registry).
 *      - 40% haircut applied by NAVEngine on the raw USD value returned here.
 *      - 10% max weight enforced by NAVEngine.
 */
contract AXLandVault is IAXLandVault {

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant NAV_STALE_WINDOW = 35 days;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE    = keccak256("GOVERNOR_ROLE");
    bytes32 public constant NAV_UPDATER_ROLE = keccak256("NAV_UPDATER_ROLE");
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // ── Reentrancy guard ──────────────────────────────────────────────────────
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;
    uint256 private _status = _NOT_ENTERED;

    // ── State ─────────────────────────────────────────────────────────────────
    address public navOracle;
    bool    public vaultFrozen;

    uint256 public landUnits;        // USD-denominated unit count (18-dec WAD)
    uint256 public lastNavUsdWad;    // most recent NAV per unit (18-dec WAD)
    uint256 public lastNavTimestamp; // block.timestamp of last accepted NAV

    struct LandAsset {
        bytes32 assetId;
        string  description;
        uint256 unitsBooked;
        uint256 bookedAt;
        bool    active;
    }

    bytes32[] public assetIds;
    mapping(bytes32 => LandAsset) public assets;

    // ── Events ────────────────────────────────────────────────────────────────
    event LandAssetBooked(bytes32 indexed assetId, string description, uint256 unitsBooked, uint256 totalLandUnits);
    event LandAssetDeactivated(bytes32 indexed assetId, uint256 totalLandUnits);
    event NAVApplied(uint256 navUsdWad, uint256 totalLandUnits, uint256 totalValueUsd, uint256 timestamp);
    event VaultFrozen(bool frozen, string reason);
    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address governor, address navOracle_) {
        require(governor   != address(0), "LandVault: zero governor");
        require(navOracle_ != address(0), "LandVault: zero oracle");
        _grantRole(GOVERNOR_ROLE, governor);
        _grantRole(NAV_UPDATER_ROLE, navOracle_);
        navOracle = navOracle_;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "LandVault: missing role");
        _;
    }

    modifier notFrozen() {
        require(!vaultFrozen, "LandVault: frozen");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "LandVault: reentrant");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ── NAV update ────────────────────────────────────────────────────────────

    /**
     * @notice Pull the approved NAV from the multi-sig oracle and apply it.
     *         Follows strict CEI order:
     *           1. View oracle (no state change on oracle side).
     *           2. Update vault state.
     *           3. Emit event.
     *           4. Call markConsumed() on oracle (state change last).
     *         nonReentrant prevents re-entry through markConsumed().
     */
    function applyApprovedNAV() external nonReentrant notFrozen {
        // Step 1: Read approved NAV via view function (no oracle state change yet)
        uint256 newNav = ILandNAVOracle(navOracle).getApprovedNAV();
        require(newNav > 0, "LandVault: zero nav or not ready");

        // Step 2-3: Update local state and emit BEFORE external state change
        lastNavUsdWad    = newNav;
        lastNavTimestamp = block.timestamp;
        emit NAVApplied(newNav, landUnits, (landUnits * newNav) / 1e18, block.timestamp);

        // Step 4: External state change last (oracle marks proposal consumed)
        ILandNAVOracle(navOracle).markConsumed();
    }

    /**
     * @notice Emergency governance NAV override (e.g. during oracle dispute).
     */
    function overrideNAV(uint256 navUsdWad) external onlyRole(GOVERNOR_ROLE) {
        require(navUsdWad > 0, "LandVault: zero nav");
        lastNavUsdWad    = navUsdWad;
        lastNavTimestamp = block.timestamp;
        emit NAVApplied(navUsdWad, landUnits, (landUnits * navUsdWad) / 1e18, block.timestamp);
    }

    // ── Asset bookkeeping ─────────────────────────────────────────────────────

    function bookAsset(
        bytes32 assetId,
        string calldata description,
        uint256 unitsBooked
    ) external onlyRole(GOVERNOR_ROLE) notFrozen {
        require(assetId != bytes32(0), "LandVault: zero assetId");
        require(!assets[assetId].active, "LandVault: already active");
        require(unitsBooked > 0, "LandVault: zero units");

        assets[assetId] = LandAsset({
            assetId:     assetId,
            description: description,
            unitsBooked: unitsBooked,
            bookedAt:    block.timestamp,
            active:      true
        });
        assetIds.push(assetId);
        landUnits += unitsBooked;

        emit LandAssetBooked(assetId, description, unitsBooked, landUnits);
    }

    function deactivateAsset(bytes32 assetId) external onlyRole(GOVERNOR_ROLE) {
        require(assets[assetId].active, "LandVault: not active");
        uint256 units = assets[assetId].unitsBooked;
        assets[assetId].active = false;
        landUnits = landUnits >= units ? landUnits - units : 0;
        emit LandAssetDeactivated(assetId, landUnits);
    }

    // ── IAXLandVault implementation ───────────────────────────────────────────

    /**
     * @notice Current total USD value of land holdings (raw, before haircut). WAD.
     */
    function totalValueUsdWad() public view returns (uint256) {
        if (lastNavUsdWad == 0) return 0;
        return (landUnits * lastNavUsdWad) / 1e18;
    }

    /**
     * @notice Returns true if the land NAV is stale.
     *         Uses `< 1` for initial-state check to avoid strict-equality warning.
     */
    function isNavStale() public view returns (bool) {
        if (landUnits < 1) return false;
        return lastNavTimestamp < 1 || block.timestamp > lastNavTimestamp + NAV_STALE_WINDOW;
    }

    /**
     * @notice Batch snapshot — fetches both values in a single call.
     *         Used by NAVEngine to reduce external calls per loop iteration.
     */
    function landSnapshot() external view returns (uint256 valueUsdWad, bool stale) {
        valueUsdWad = totalValueUsdWad();
        stale       = isNavStale();
    }

    // ── IVault partial stubs (illiquid — no deposit/withdraw) ────────────────

    function reserveAsset() external pure returns (address) {
        return address(0);
    }

    function totalUnits() external view returns (uint256) {
        return landUnits;
    }

    // ── Governance ────────────────────────────────────────────────────────────

    function setVaultFrozen(bool frozen, string calldata reason) external onlyRole(GOVERNOR_ROLE) {
        vaultFrozen = frozen;
        emit VaultFrozen(frozen, reason);
    }

    function setNavOracle(address oracle) external onlyRole(GOVERNOR_ROLE) {
        require(oracle != address(0), "LandVault: zero oracle");
        navOracle = oracle;
        _grantRole(NAV_UPDATER_ROLE, oracle);
    }

    function grantRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(account != address(0), "LandVault: zero account");
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(_roles[role][account], "LandVault: not granted");
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
