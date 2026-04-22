// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IAXAU.sol";

/**
 * @title AXGoldVault
 * @notice Phase 1 reserve vault. Implements IVault.
 *         Holds a gold-class ERC-20 reserve asset on behalf of the AXAU system.
 *
 * @dev Token flow: user approves MintRedeemController; controller calls
 *      `transferFrom(user, vault, amount)` then `notifyDeposit(amount)`.
 *      This avoids `arbitrary-send-erc20` in the vault (no transferFrom with
 *      an arbitrary `from` parameter).
 */
contract AXGoldVault is IVault {

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE   = keccak256("GOVERNOR_ROLE");
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // ── Reentrancy guard ──────────────────────────────────────────────────────
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;
    uint256 private _status = _NOT_ENTERED;

    // ── State ─────────────────────────────────────────────────────────────────
    address public reserveAsset;
    bool    public vaultFrozen;

    // ── Events ────────────────────────────────────────────────────────────────
    event Deposited(uint256 tokenAmount, uint256 totalUnitsAfter);
    event Withdrawn(address indexed to, uint256 tokenAmount, uint256 totalUnitsAfter);
    event ReserveAssetUpdated(address indexed oldAsset, address indexed newAsset);
    event VaultFrozen(bool frozen);
    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address governor, address reserveAsset_) {
        require(governor      != address(0), "GoldVault: zero governor");
        require(reserveAsset_ != address(0), "GoldVault: zero asset");
        _grantRole(GOVERNOR_ROLE, governor);
        reserveAsset = reserveAsset_;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "GoldVault: missing role");
        _;
    }

    modifier notFrozen() {
        require(!vaultFrozen, "GoldVault: frozen");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "GoldVault: reentrant");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ── IVault implementation ─────────────────────────────────────────────────

    /**
     * @notice Called AFTER the controller has already executed transferFrom(user, vault).
     *         Emits accounting event; does NOT perform any token transfer.
     *         This design eliminates arbitrary-send-erc20: the controller holds
     *         the transferFrom call where msg.sender is the legitimate caller.
     */
    function notifyDeposit(uint256 tokenAmount)
        external
        nonReentrant
        onlyRole(CONTROLLER_ROLE)
        notFrozen
    {
        require(tokenAmount > 0, "GoldVault: zero amount");
        emit Deposited(tokenAmount, totalUnits());
    }

    /**
     * @notice Release tokenAmount of reserve asset to `to`.
     */
    function withdrawToController(address to, uint256 tokenAmount)
        external
        nonReentrant
        onlyRole(CONTROLLER_ROLE)
        notFrozen
    {
        require(to != address(0), "GoldVault: zero to");
        require(tokenAmount > 0, "GoldVault: zero amount");
        require(totalUnits() >= tokenAmount, "GoldVault: insufficient balance");
        bool ok = IERC20Minimal(reserveAsset).transfer(to, tokenAmount);
        require(ok, "GoldVault: transfer failed");
        emit Withdrawn(to, tokenAmount, totalUnits());
    }

    // ── IVault views ──────────────────────────────────────────────────────────

    function totalUnits() public view returns (uint256) {
        return IERC20Minimal(reserveAsset).balanceOf(address(this));
    }

    /**
     * @notice Batch snapshot. Reduces external calls per NAVEngine loop iteration
     *         from multiple individual calls to a single call.
     */
    function goldSnapshot() external view returns (address asset, uint256 units) {
        asset = reserveAsset;
        units = IERC20Minimal(reserveAsset).balanceOf(address(this));
    }

    // ── Governance ────────────────────────────────────────────────────────────

    /**
     * @notice Replace the reserve asset. Only allowed when vault holds no tokens.
     *         Uses `< 1` comparison (uint256 cannot be negative; semantically identical
     *         to `== 0` but avoids strict-equality Slither warning).
     */
    function setReserveAsset(address newAsset) external onlyRole(GOVERNOR_ROLE) {
        require(newAsset != address(0), "GoldVault: zero asset");
        require(totalUnits() < 1, "GoldVault: drain vault before migration");
        address old = reserveAsset;
        reserveAsset = newAsset;
        emit ReserveAssetUpdated(old, newAsset);
    }

    function setVaultFrozen(bool frozen) external onlyRole(GOVERNOR_ROLE) {
        vaultFrozen = frozen;
        emit VaultFrozen(frozen);
    }

    function grantRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(account != address(0), "GoldVault: zero account");
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(_roles[role][account], "GoldVault: not granted");
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
