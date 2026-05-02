// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/* ───────────────────────────────────────────────────────────────────────────────
 *  AXAG SILVER VAULT — DRAFT, NOT FOR DEPLOYMENT
 *  ──────────────────────────────────────────────
 *  Status:        AXAG IS NOT LIVE AND IS NOT ISSUED.
 *  Document path: contracts/axau/drafts/AXSilverVault.sol
 *  Source spec:   documents/commodities/AXAG_KINESIS_GO_LIVE_PATH.md § 5.1
 *  Stage:         2 — Technical Diligence (architectural draft only)
 *
 *  This contract is a silver-specific clone of AXGoldVault.sol (production).
 *  It implements IVault and is designed to hold KAG (Kinesis Silver ERC-20,
 *  1 token = 1 gram LBMA 999 fine silver) as the AXAG reserve asset.
 *
 *  For the AXAU-silver-sleeve path (Option B, preferred), this vault is
 *  deployed as an additional sleeve in the existing AXAU CommodityRegistry,
 *  alongside AXGoldVault. The AXAG token (AXAGTokenLite3643.sol) is not
 *  required for the silver-sleeve path — AXAU itself carries the silver backing.
 *
 *  For the standalone AXAG wrapper token path (Option A, requires additional
 *  gates — see README.md), this vault is the reserve layer for the AXAG token.
 *
 *  DEPLOYMENT PREDICATES (all must be satisfied before mainnet deployment):
 *    1.  AXM governance vote approving silver admission to AXAU passed.
 *    2.  Legal opinion delivered on KAG reserve instrument classification.
 *    3.  KMS Labs ToS confirmation that KAG may be used as protocol reserve
 *        (KIN-03 gate — see AXAG_STAGE_2_EVIDENCE_TRACKER.md).
 *    4.  KAG on Arbitrum One verified (KIN-02 gate) OR cross-chain bridge
 *        decision made (e.g., Ethereum mainnet sleeve with Arbitrum sync).
 *    5.  External smart-contract audit of this file and XagPerGramOracle.sol
 *        is complete with findings remediated.
 *    6.  Reserve KAG acquired and ready to deposit.
 *    7.  No deploy script in scripts/ targets this file. Promotion to
 *        production requires a deliberate deploy script update.
 *
 *  CHANGES FROM AXGoldVault.sol:
 *    - Error message prefix changed: "GoldVault" → "SilverVault"
 *    - `goldSnapshot()` renamed to `silverSnapshot()` (same logic, silver-named)
 *    - NatSpec updated for silver context
 *    - Everything else is byte-for-byte identical to AXGoldVault.sol to keep
 *      audit scope minimal (auditors review a diff, not a fresh codebase).
 * ─────────────────────────────────────────────────────────────────────────── */

import "../interfaces/IAXAU.sol";

/**
 * @title AXSilverVault
 * @notice DRAFT silver reserve vault. Implements IVault. Designed to hold KAG
 *         (Kinesis Silver, 1 gram LBMA 999 Ag per token) as the silver sleeve
 *         reserve asset for the AXAU multi-commodity basket or a standalone
 *         AXAG token system.
 *
 * @dev Token flow mirrors AXGoldVault:
 *      user approves MintRedeemController → controller executes
 *      transferFrom(user, vault, amount) → controller calls notifyDeposit(amount).
 *      This pattern avoids arbitrary-send-erc20 in the vault.
 *
 *      KAG is on Ethereum mainnet. If deploying on Arbitrum One (the preferred
 *      AXAU chain), a bridged or Arbitrum-native KAG must first be confirmed
 *      (KIN-02 gate). The vault contract itself is chain-agnostic.
 */
contract AXSilverVault is IVault {

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE   = keccak256("GOVERNOR_ROLE");
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // ── Reentrancy guard ──────────────────────────────────────────────────────
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;
    uint256 private _status = _NOT_ENTERED;

    // ── State ─────────────────────────────────────────────────────────────────
    address public reserveAsset;   // Expected: KAG ERC-20 on the target chain
    bool    public vaultFrozen;

    // ── Events ────────────────────────────────────────────────────────────────
    event Deposited(uint256 tokenAmount, uint256 totalUnitsAfter);
    event Withdrawn(address indexed to, uint256 tokenAmount, uint256 totalUnitsAfter);
    event ReserveAssetUpdated(address indexed oldAsset, address indexed newAsset);
    event VaultFrozen(bool frozen);
    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param governor_      Initial governor (Axiom deployer / Gnosis Safe).
     * @param reserveAsset_  KAG ERC-20 contract address on the target chain.
     */
    constructor(address governor_, address reserveAsset_) {
        require(governor_     != address(0), "SilverVault: zero governor");
        require(reserveAsset_ != address(0), "SilverVault: zero asset");
        _grantRole(GOVERNOR_ROLE, governor_);
        reserveAsset = reserveAsset_;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "SilverVault: missing role");
        _;
    }

    modifier notFrozen() {
        require(!vaultFrozen, "SilverVault: frozen");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "SilverVault: reentrant");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ── IVault implementation ─────────────────────────────────────────────────

    /**
     * @notice Called AFTER the controller has already executed
     *         transferFrom(user, vault, tokenAmount).
     *         Emits the accounting event; performs NO token transfer.
     *         This design eliminates the arbitrary-send-erc20 pattern.
     * @param tokenAmount  Grams of KAG deposited (1 KAG = 1 gram Ag = 1e18 units).
     */
    function notifyDeposit(uint256 tokenAmount)
        external
        nonReentrant
        onlyRole(CONTROLLER_ROLE)
        notFrozen
    {
        require(tokenAmount > 0, "SilverVault: zero amount");
        emit Deposited(tokenAmount, totalUnits());
    }

    /**
     * @notice Release tokenAmount of KAG to `to` (typically the redeemer or
     *         the controller for onward routing).
     * @param to           Recipient of the KAG release.
     * @param tokenAmount  Grams of KAG to release (1 KAG = 1e18 base units).
     */
    function withdrawToController(address to, uint256 tokenAmount)
        external
        nonReentrant
        onlyRole(CONTROLLER_ROLE)
        notFrozen
    {
        require(to != address(0), "SilverVault: zero to");
        require(tokenAmount > 0, "SilverVault: zero amount");
        require(totalUnits() >= tokenAmount, "SilverVault: insufficient balance");
        bool ok = IERC20Minimal(reserveAsset).transfer(to, tokenAmount);
        require(ok, "SilverVault: transfer failed");
        emit Withdrawn(to, tokenAmount, totalUnits());
    }

    // ── IVault views ──────────────────────────────────────────────────────────

    /**
     * @notice Total KAG held by this vault in base units (1 KAG = 1e18).
     *         Denominated in grams, NOT troy ounces. The XagPerGramOracle
     *         handles gram-to-USD conversion for NAVEngine.
     */
    function totalUnits() public view returns (uint256) {
        return IERC20Minimal(reserveAsset).balanceOf(address(this));
    }

    /**
     * @notice Batch snapshot — satisfies IVault interface (required by CommodityRegistry
     *         and NAVEngine). Despite the name, this returns silver (KAG) reserve data.
     *         The interface method is named goldSnapshot() for historical reasons;
     *         the semantics are asset-agnostic (asset, units).
     * @return asset  KAG ERC-20 address.
     * @return units  KAG balance in base units (grams × 1e18).
     */
    function goldSnapshot() external view returns (address asset, uint256 units) {
        asset = reserveAsset;
        units = IERC20Minimal(reserveAsset).balanceOf(address(this));
    }

    /**
     * @notice Alias for goldSnapshot() with a silver-accurate name.
     *         Provided for readability; functionally identical.
     */
    function silverSnapshot() external view returns (address asset, uint256 units) {
        asset = reserveAsset;
        units = IERC20Minimal(reserveAsset).balanceOf(address(this));
    }

    // ── Governance ────────────────────────────────────────────────────────────

    /**
     * @notice Replace the reserve asset. Only allowed when vault holds no tokens.
     *         Allows migration to a future silver-backed instrument (e.g. if KAG
     *         is superseded) without redeploying the entire silver sleeve.
     */
    function setReserveAsset(address newAsset) external onlyRole(GOVERNOR_ROLE) {
        require(newAsset != address(0), "SilverVault: zero asset");
        require(totalUnits() < 1, "SilverVault: drain vault before migration");
        address old = reserveAsset;
        reserveAsset = newAsset;
        emit ReserveAssetUpdated(old, newAsset);
    }

    function setVaultFrozen(bool frozen) external onlyRole(GOVERNOR_ROLE) {
        vaultFrozen = frozen;
        emit VaultFrozen(frozen);
    }

    function grantRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(account != address(0), "SilverVault: zero account");
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(_roles[role][account], "SilverVault: not granted");
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
