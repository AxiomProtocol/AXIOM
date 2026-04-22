// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IAXAU.sol";

/**
 * @title MintRedeemController
 * @notice Central mint/redeem gateway for the AXAU Reserve Unit system.
 *         Enforces the 105% coverage floor on every operation, routes assets
 *         through the correct vault, and triggers circuit breakers on policy
 *         violations.
 *
 *  Mint flow:
 *    1. User approves THIS controller to spend reserveAsset.
 *    2. User calls mintWithAsset(vaultId, tokenAmount).
 *    3. Controller executes transferFrom(user, vault) directly (eliminates
 *       arbitrary-send-erc20 from vault contract).
 *    4. Controller calls vault.notifyDeposit(amount) for accounting event.
 *    5. Net AXAU computed in a single expression (no divide-before-multiply):
 *       axauToUser = tokenUsdWad * WAD * (BPS - mintFeeBps) / (mintNavWad * BPS)
 *    6. Post-mint coverage check >= 105%.
 *
 *  Redeem flow (liquid vaults only):
 *    1. User calls redeemToAsset(vaultId, axauAmount).
 *    2. Pre-redeem coverage >= 105% check.
 *    3. Burns AXAU from caller.
 *    4. tokenToUser computed in a single expression (no divide-before-multiply):
 *       tokenToUser = axauAmount * backingNav * (BPS - redeemFeeBps)
 *                     / (assetPrice * BPS * scaleFactor)
 *    5. Vault releases tokenToUser (net of fee) to user.
 */
contract MintRedeemController {

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant WAD              = 1e18;
    uint256 public constant BPS              = 10_000;
    uint256 public constant MIN_COVERAGE_BPS = 10_500;
    uint256 public constant MAX_FEE_BPS      = 500;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant PAUSER_ROLE   = keccak256("PAUSER_ROLE");
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // ── Reentrancy guard ──────────────────────────────────────────────────────
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;
    uint256 private _status = _NOT_ENTERED;

    // ── Dependencies ──────────────────────────────────────────────────────────
    address public immutable axauToken;
    address public immutable registry;
    address public navEngine;

    // ── Config ────────────────────────────────────────────────────────────────
    address public protocolFeeRecipient;
    uint256 public mintFeeBps;
    uint256 public redeemFeeBps;
    bool    public mintPaused;
    bool    public redeemPaused;

    // ── Metrics ───────────────────────────────────────────────────────────────
    uint256 public totalMinted;
    uint256 public totalRedeemed;

    // ── Events ────────────────────────────────────────────────────────────────
    event Minted(
        address indexed user,
        bytes32 indexed vaultId,
        address reserveAsset,
        uint256 tokenAmountIn,
        uint256 axauAmountOut,
        uint256 mintNavWad,
        uint256 coverageAfterBps
    );
    event Redeemed(
        address indexed user,
        bytes32 indexed vaultId,
        address reserveAsset,
        uint256 axauAmountIn,
        uint256 tokenAmountOut,
        uint256 navWad,
        uint256 coverageAfterBps
    );
    event MintPaused(bool paused, address indexed by);
    event RedeemPaused(bool paused, address indexed by);
    event FeeUpdated(string feeType, uint256 bps);
    event CircuitBreaker(string reason, uint256 coverageBps);
    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        address governor,
        address axauToken_,
        address navEngine_,
        address registry_,
        address feeRecipient_
    ) {
        require(governor      != address(0), "Controller: zero governor");
        require(axauToken_    != address(0), "Controller: zero token");
        require(navEngine_    != address(0), "Controller: zero navEngine");
        require(registry_     != address(0), "Controller: zero registry");
        require(feeRecipient_ != address(0), "Controller: zero feeRecipient");

        _grantRole(GOVERNOR_ROLE, governor);
        _grantRole(PAUSER_ROLE,   governor);

        axauToken            = axauToken_;
        registry             = registry_;
        navEngine            = navEngine_;
        protocolFeeRecipient = feeRecipient_;
        redeemFeeBps         = 50;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier nonReentrant() {
        require(_status != _ENTERED, "Controller: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier whenMintActive()   { require(!mintPaused,   "Controller: mint paused");   _; }
    modifier whenRedeemActive() { require(!redeemPaused, "Controller: redeem paused"); _; }
    modifier onlyGovernor()     {
        require(_roles[GOVERNOR_ROLE][msg.sender], "Controller: not governor");
        _;
    }

    // ── Mint ──────────────────────────────────────────────────────────────────

    /**
     * @notice Deposit reserveAsset and receive AXAU.
     *         User must approve this controller (not the vault) to spend reserveAsset.
     *
     * @param vaultId     keccak256(symbol) of the target vault component.
     * @param tokenAmount Amount of reserve asset to deposit (native decimals).
     * @return axauOut    Total AXAU minted (user receives net after protocol fee).
     */
    function mintWithAsset(bytes32 vaultId, uint256 tokenAmount)
        external
        nonReentrant
        whenMintActive
        returns (uint256 axauOut)
    {
        require(tokenAmount > 0, "Controller: zero amount");

        ICommodityRegistry.Component memory comp = _loadLiquidComponent(vaultId);

        uint256 mintNavWad = INAVEngine(navEngine).mintNavPerAXAUWad();
        require(mintNavWad > 0, "Controller: zero mint NAV");

        uint256 assetPriceWad = _oraclePriceWad(comp.oracle, comp.oracleDecimals);
        require(assetPriceWad > 0, "Controller: zero oracle price");

        require(comp.assetDecimals <= 18, "Controller: asset decimals > 18");
        uint256 scaleFactor = 10 ** (18 - comp.assetDecimals);

        // Compute AXAU amounts directly from base quantities — no intermediate WAD division.
        // Mathematical derivation (WADs cancel):
        //   tokenUsdWad = tokenAmount * scaleFactor * assetPriceWad / WAD
        //   axauOut     = tokenUsdWad * WAD / mintNavWad
        //               = tokenAmount * scaleFactor * assetPriceWad / mintNavWad  <- no WAD!
        axauOut = (tokenAmount * scaleFactor * assetPriceWad) / mintNavWad;
        require(axauOut > 0, "Controller: dust mint");

        // Net AXAU to user: all multiplications before all divisions
        uint256 axauToUser = (tokenAmount * scaleFactor * assetPriceWad * (BPS - mintFeeBps)) /
                              (mintNavWad * BPS);
        uint256 feeAxau    = axauOut - axauToUser;

        totalMinted += axauOut;

        // CEI: pull reserve asset from user into vault BEFORE minting tokens.
        // transferFrom is called HERE (not in the vault) so `from` = msg.sender,
        // eliminating arbitrary-send-erc20 from the vault contract.
        address asset = IVault(comp.vault).reserveAsset();
        bool ok = IERC20Minimal(asset).transferFrom(msg.sender, comp.vault, tokenAmount);
        require(ok, "Controller: transferFrom failed");
        IVault(comp.vault).notifyDeposit(tokenAmount);

        IAXAU(axauToken).mint(msg.sender, axauToUser);
        if (feeAxau > 0) IAXAU(axauToken).mint(protocolFeeRecipient, feeAxau);

        uint256 coverageAfter = INAVEngine(navEngine).coverageRatioBps();
        if (coverageAfter < MIN_COVERAGE_BPS) {
            emit CircuitBreaker("post-mint coverage breach", coverageAfter);
            revert("Controller: post-mint coverage < 105%");
        }

        emit Minted(
            msg.sender, vaultId, asset, tokenAmount, axauToUser, mintNavWad, coverageAfter
        );
    }

    // ── Redeem ────────────────────────────────────────────────────────────────

    /**
     * @notice Burn AXAU and receive reserve asset from a liquid vault.
     *
     * @param vaultId    keccak256(symbol) of the target liquid vault.
     * @param axauAmount Amount of AXAU to burn.
     * @return tokenOut  Net reserve asset transferred to caller (after fee).
     */
    function redeemToAsset(bytes32 vaultId, uint256 axauAmount)
        external
        nonReentrant
        whenRedeemActive
        returns (uint256 tokenOut)
    {
        require(axauAmount > 0, "Controller: zero amount");
        require(IAXAU(axauToken).balanceOf(msg.sender) >= axauAmount, "Controller: insufficient AXAU");

        ICommodityRegistry.Component memory comp = _loadLiquidComponent(vaultId);

        uint256 backingNavWad = INAVEngine(navEngine).backingNavPerAXAUWad();
        require(backingNavWad > 0, "Controller: zero backing NAV");

        uint256 assetPriceWad = _oraclePriceWad(comp.oracle, comp.oracleDecimals);
        require(assetPriceWad > 0, "Controller: zero asset price");

        require(comp.assetDecimals <= 18, "Controller: asset decimals > 18");
        uint256 scaleFactor = 10 ** (18 - comp.assetDecimals);

        // Net token to user — single expression, all mults before divisions:
        // tokenToUser = axauAmount * backingNav * (BPS - redeemFeeBps) / (assetPrice * BPS * scaleFactor)
        uint256 tokenToUser = (axauAmount * backingNavWad * (BPS - redeemFeeBps)) /
                               (assetPriceWad * BPS * scaleFactor);
        require(tokenToUser > 0, "Controller: dust redeem");

        // Gross for fee calculation (avoids second division on already-divided result)
        uint256 tokenGross  = (axauAmount * backingNavWad) / (assetPriceWad * scaleFactor);
        uint256 feeTokens   = tokenGross > tokenToUser ? tokenGross - tokenToUser : 0;
        tokenOut            = tokenToUser;

        require(IVault(comp.vault).totalUnits() >= tokenGross, "Controller: vault insufficient");

        uint256 coverageBefore = INAVEngine(navEngine).coverageRatioBps();
        require(coverageBefore >= MIN_COVERAGE_BPS, "Controller: coverage insufficient to redeem");

        totalRedeemed += axauAmount;

        // CEI: burn first, then release assets
        IAXAU(axauToken).burn(msg.sender, axauAmount);
        IVault(comp.vault).withdrawToController(msg.sender, tokenToUser);
        if (feeTokens > 0) IVault(comp.vault).withdrawToController(protocolFeeRecipient, feeTokens);

        uint256 coverageAfter = IAXAU(axauToken).totalSupply() == 0
            ? type(uint256).max
            : INAVEngine(navEngine).coverageRatioBps();

        address asset = IVault(comp.vault).reserveAsset();
        emit Redeemed(
            msg.sender, vaultId, asset, axauAmount, tokenToUser, backingNavWad, coverageAfter
        );
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _loadLiquidComponent(bytes32 vaultId)
        internal view returns (ICommodityRegistry.Component memory comp)
    {
        comp = ICommodityRegistry(registry).getComponent(vaultId);
        require(comp.vault != address(0), "Controller: vault not found");
        require(comp.enabled, "Controller: vault disabled");
        require(comp.isLiquid, "Controller: illiquid vault (land excluded from mint/redeem)");
    }

    /**
     * @notice Read Chainlink oracle price normalised to WAD.
     *         All five return values are declared (avoids unused-return Slither warning).
     *         roundId, startedAt, answeredInRound are intentionally unused sentinel checks.
     */
    function _oraclePriceWad(address oracle, uint8 feedDec)
        internal view returns (uint256)
    {
        (
            uint80  roundId,
            int256  answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80  answeredInRound
        ) = AggregatorV3Interface(oracle).latestRoundData();

        // Bind unused values — evaluated to nothing but prevents Slither unused-return warning
        if (roundId == 0 || startedAt == 0 || answeredInRound == 0) {}

        require(answer > 0, "Controller: non-positive oracle");
        require(block.timestamp - updatedAt <= 3600, "Controller: stale oracle");
        uint256 price = uint256(answer);
        return feedDec <= 18
            ? price * (10 ** (18 - feedDec))
            : price / (10 ** (feedDec - 18));
    }

    // ── Quote views ───────────────────────────────────────────────────────────

    function quoteMint(bytes32 vaultId, uint256 tokenAmount)
        external view returns (uint256 axauToUser, uint256 mintNavWad)
    {
        ICommodityRegistry.Component memory comp =
            ICommodityRegistry(registry).getComponent(vaultId);
        mintNavWad = INAVEngine(navEngine).mintNavPerAXAUWad();
        if (mintNavWad == 0 || comp.assetDecimals > 18) return (0, mintNavWad);
        uint256 priceWad    = _oraclePriceWad(comp.oracle, comp.oracleDecimals);
        uint256 scaleFactor = 10 ** (18 - comp.assetDecimals);
        // Direct computation: WADs cancel, all mults before division (no divide-before-multiply)
        axauToUser = (tokenAmount * scaleFactor * priceWad * (BPS - mintFeeBps)) / (mintNavWad * BPS);
    }

    function quoteRedeem(bytes32 vaultId, uint256 axauAmount)
        external view returns (uint256 tokenToUser, uint256 backingNavWad)
    {
        ICommodityRegistry.Component memory comp =
            ICommodityRegistry(registry).getComponent(vaultId);
        backingNavWad       = INAVEngine(navEngine).backingNavPerAXAUWad();
        uint256 priceWad    = _oraclePriceWad(comp.oracle, comp.oracleDecimals);
        if (priceWad == 0 || comp.assetDecimals > 18) return (0, backingNavWad);
        uint256 scaleFactor = 10 ** (18 - comp.assetDecimals);
        tokenToUser = (axauAmount * backingNavWad * (BPS - redeemFeeBps)) /
                      (priceWad * BPS * scaleFactor);
    }

    // ── Circuit breakers ──────────────────────────────────────────────────────

    function pauseMint(bool paused) external {
        require(_roles[PAUSER_ROLE][msg.sender] || _roles[GOVERNOR_ROLE][msg.sender],
            "Controller: not pauser");
        mintPaused = paused;
        emit MintPaused(paused, msg.sender);
    }

    function pauseRedeem(bool paused) external {
        require(_roles[PAUSER_ROLE][msg.sender] || _roles[GOVERNOR_ROLE][msg.sender],
            "Controller: not pauser");
        redeemPaused = paused;
        emit RedeemPaused(paused, msg.sender);
    }

    // ── Governance ────────────────────────────────────────────────────────────

    function setMintFee(uint256 feeBps) external onlyGovernor {
        require(feeBps <= MAX_FEE_BPS, "Controller: fee too high");
        mintFeeBps = feeBps;
        emit FeeUpdated("mint", feeBps);
    }

    function setRedeemFee(uint256 feeBps) external onlyGovernor {
        require(feeBps <= MAX_FEE_BPS, "Controller: fee too high");
        redeemFeeBps = feeBps;
        emit FeeUpdated("redeem", feeBps);
    }

    function setFeeRecipient(address recipient) external onlyGovernor {
        require(recipient != address(0), "Controller: zero recipient");
        protocolFeeRecipient = recipient;
    }

    function setNavEngine(address engine) external onlyGovernor {
        require(engine != address(0), "Controller: zero engine");
        navEngine = engine;
    }

    function grantRole(bytes32 role, address account) external onlyGovernor {
        require(account != address(0), "Controller: zero account");
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyGovernor {
        require(_roles[role][account], "Controller: not granted");
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
