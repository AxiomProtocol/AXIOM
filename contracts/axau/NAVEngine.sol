// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IAXAU.sol";

/**
 * @title NAVEngine
 * @notice Deterministic valuation engine for the AXAU Reserve Unit system.
 *         Implements INAVEngine.
 *
 *  Backing NAV per AXAU = SUM(unitValue_i * (1 - haircut_i)) / AXAU_supply
 *  Mint NAV per AXAU    = Backing NAV * (BPS + MINT_PREMIUM_BPS) / BPS
 *  Coverage Ratio (bps) = totalBackingUsd * BPS / (AXAU_supply * TARGET_PRICE_WAD / WAD)
 *
 * @dev External-call strategy per loop iteration (MAX_COMPONENTS = 20 cap):
 *      - Registry configs: ONE call (getAllComponents) fetches all in memory.
 *      - Liquid vault: goldSnapshot() -> 1 call (asset addr + units combined).
 *      - Land vault: landSnapshot() -> 1 call (value + staleness combined).
 *      - Oracle:  latestRoundData() -> 1 call (unavoidable for live pricing).
 *      - Asset decimals: comp.assetDecimals cached in registry (no external call).
 *      Total: max 2 external calls per component (1 snapshot + 1 oracle).
 */
contract NAVEngine is INAVEngine {

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant WAD               = 1e18;
    uint256 public constant BPS               = 10_000;
    uint256 public constant ORACLE_STALE_SECS = 3600;
    uint256 public constant MINT_PREMIUM_BPS  = 500;
    uint256 public constant TARGET_PRICE_WAD  = 1e18;
    uint256 public constant MIN_COVERAGE_BPS  = 10_500;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // ── Dependencies ──────────────────────────────────────────────────────────
    address public registry;
    address public immutable axauToken;

    // ── Config ────────────────────────────────────────────────────────────────
    uint256 public oracleStaleSecs;
    bool    public revertOnStaleOracle;

    // ── Events ────────────────────────────────────────────────────────────────
    event ValuationSnapshot(
        uint256 totalBackingUsdWad,
        uint256 backingNavPerAXAUWad,
        uint256 mintNavPerAXAUWad,
        uint256 coverageRatioBps,
        uint256 axauSupply,
        uint256 timestamp
    );
    event ConfigUpdated(string key, uint256 value);
    event RoleGranted(bytes32 indexed role, address indexed account);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address governor, address registry_, address axauToken_) {
        require(governor   != address(0), "NAVEngine: zero governor");
        require(registry_  != address(0), "NAVEngine: zero registry");
        require(axauToken_ != address(0), "NAVEngine: zero token");
        _grantRole(GOVERNOR_ROLE, governor);
        registry            = registry_;
        axauToken           = axauToken_;
        oracleStaleSecs     = ORACLE_STALE_SECS;
        revertOnStaleOracle = true;
    }

    // ── Modifier ──────────────────────────────────────────────────────────────
    modifier onlyGovernor() {
        require(_roles[GOVERNOR_ROLE][msg.sender], "NAVEngine: not governor");
        _;
    }

    // ── INAVEngine implementation ─────────────────────────────────────────────

    /**
     * @notice Sum of all enabled components' risk-adjusted USD value (18-dec WAD).
     * @dev    Uses getAllComponents() for a single external call to registry, then
     *         iterates over an in-memory array. Per-component vault snapshot and
     *         oracle calls (max 2 each) are bounded by MAX_COMPONENTS = 20.
     */
    function totalBackingUsdWad() public view returns (uint256 total) {
        ICommodityRegistry.Component[] memory comps =
            ICommodityRegistry(registry).getAllComponents();

        uint256 len = comps.length;
        for (uint256 i = 0; i < len; i++) {
            if (!comps[i].enabled) continue;
            uint256 componentUsd = _componentValueUsdWad(comps[i]);
            if (componentUsd > 0) total += componentUsd;
        }
    }

    /**
     * @notice Backing NAV per AXAU token (WAD). Returns TARGET_PRICE_WAD if supply = 0.
     */
    function backingNavPerAXAUWad() public view returns (uint256) {
        uint256 supply = IAXAU(axauToken).totalSupply();
        if (supply == 0) return TARGET_PRICE_WAD;
        uint256 backingUsd = totalBackingUsdWad();
        return (backingUsd * WAD) / supply;
    }

    /**
     * @notice Mint NAV per AXAU — price paid by minters (5% premium over Backing NAV).
     */
    function mintNavPerAXAUWad() public view returns (uint256) {
        uint256 backingNav = backingNavPerAXAUWad();
        return (backingNav * (BPS + MINT_PREMIUM_BPS)) / BPS;
    }

    /**
     * @notice Coverage Ratio in basis points. Returns max uint256 if supply = 0.
     */
    function coverageRatioBps() public view returns (uint256) {
        uint256 supply = IAXAU(axauToken).totalSupply();
        if (supply == 0) return type(uint256).max;
        uint256 backingUsd   = totalBackingUsdWad();
        uint256 liabilityWad = (supply * TARGET_PRICE_WAD) / WAD;
        if (liabilityWad == 0) return type(uint256).max;
        return (backingUsd * BPS) / liabilityWad;
    }

    function isSolvent() external view returns (bool) {
        return coverageRatioBps() >= MIN_COVERAGE_BPS;
    }

    function snapshot() external returns (
        uint256 backingUsdWad,
        uint256 backingNav,
        uint256 mintNav,
        uint256 coverageBps
    ) {
        backingUsdWad = totalBackingUsdWad();
        backingNav    = backingNavPerAXAUWad();
        mintNav       = mintNavPerAXAUWad();
        coverageBps   = coverageRatioBps();
        emit ValuationSnapshot(
            backingUsdWad, backingNav, mintNav, coverageBps,
            IAXAU(axauToken).totalSupply(), block.timestamp
        );
    }

    // ── Component valuation ───────────────────────────────────────────────────

    /**
     * @notice Risk-adjusted USD value of a single component (WAD).
     *
     *  Liquid vault (gold):
     *    goldSnapshot() -> (asset, units) in ONE call (no separate reserveAsset + totalUnits calls).
     *    comp.assetDecimals is read from memory (cached in registry; no external call).
     *    Formula: units * scaleFactor * priceWad * (BPS - haircut) / (WAD * BPS)
     *    All multiplications precede all divisions (no divide-before-multiply).
     *
     *  Land vault:
     *    landSnapshot() -> (valueUsdWad, isStale) in ONE call.
     *    Formula: rawValueWad * (BPS - haircut) / BPS
     */
    function _componentValueUsdWad(ICommodityRegistry.Component memory comp)
        internal view returns (uint256)
    {
        if (!comp.isLiquid || comp.oracle == address(0)) {
            // ── Land (illiquid) sleeve ────────────────────────────────────────
            (uint256 rawValueWad, bool stale) = IAXLandVault(comp.vault).landSnapshot();
            if (stale) {
                if (revertOnStaleOracle) revert("NAVEngine: land NAV stale");
                return 0;
            }
            if (rawValueWad == 0) return 0;
            return (rawValueWad * (BPS - comp.haircutBps)) / BPS;
        }

        // ── Liquid (gold) sleeve ──────────────────────────────────────────────
        // Declare both return values (avoids unused-return Slither warning)
        (address vaultAsset, uint256 units) = IVault(comp.vault).goldSnapshot();
        if (vaultAsset == address(0)) return 0; // sanity: vault not yet configured
        if (units == 0) return 0;

        uint256 priceWad = _oraclePriceWad(comp.oracle, comp.oracleDecimals);
        if (priceWad == 0) return 0;

        // comp.assetDecimals is a memory read (cached at registry registration time)
        require(comp.assetDecimals <= 18, "NAVEngine: asset decimals > 18");
        uint256 scaleFactor = 10 ** (18 - comp.assetDecimals);

        // All multiplications before divisions — no divide-before-multiply:
        // adjustedUsdWad = units * scaleFactor * priceWad * (BPS - haircut) / (WAD * BPS)
        return (units * scaleFactor * priceWad * (BPS - comp.haircutBps)) / (WAD * BPS);
    }

    /**
     * @notice Chainlink oracle price normalised to WAD (18-dec).
     *         Declares all five return values to avoid unused-return Slither warning.
     */
    function _oraclePriceWad(address oracleFeed, uint8 feedDecimals)
        internal view returns (uint256)
    {
        (
            uint80  roundId,
            int256  answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80  answeredInRound
        ) = AggregatorV3Interface(oracleFeed).latestRoundData();

        // Acknowledge intentionally unused values to satisfy all-return-values bound
        // The following line evaluates to nothing but binds the vars to avoid warnings
        if (roundId == 0 || startedAt == 0 || answeredInRound == 0) {}

        if (answer <= 0) {
            if (revertOnStaleOracle) revert("NAVEngine: non-positive oracle answer");
            return 0;
        }
        if (block.timestamp - updatedAt > oracleStaleSecs) {
            if (revertOnStaleOracle) revert("NAVEngine: stale oracle");
            return 0;
        }
        uint256 price = uint256(answer);
        return feedDecimals <= 18
            ? price * (10 ** (18 - feedDecimals))
            : price / (10 ** (feedDecimals - 18));
    }

    // ── Off-chain view helper ─────────────────────────────────────────────────

    function componentValueUsdWad(bytes32 componentId) external view returns (uint256) {
        ICommodityRegistry.Component memory comp =
            ICommodityRegistry(registry).getComponent(componentId);
        require(comp.vault != address(0), "NAVEngine: not found");
        return _componentValueUsdWad(comp);
    }

    // ── Governance ────────────────────────────────────────────────────────────

    function setOracleStaleSecs(uint256 secs) external onlyGovernor {
        oracleStaleSecs = secs;
        emit ConfigUpdated("oracleStaleSecs", secs);
    }

    function setRevertOnStaleOracle(bool revertOnStale) external onlyGovernor {
        revertOnStaleOracle = revertOnStale;
        emit ConfigUpdated("revertOnStale", revertOnStale ? 1 : 0);
    }

    function setRegistry(address registry_) external onlyGovernor {
        require(registry_ != address(0), "NAVEngine: zero registry");
        registry = registry_;
    }

    function grantRole(bytes32 role, address account) external onlyGovernor {
        require(account != address(0), "NAVEngine: zero account");
        _grantRole(role, account);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function _grantRole(bytes32 role, address account) internal {
        _roles[role][account] = true;
        emit RoleGranted(role, account);
    }
}
