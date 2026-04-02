// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IAXAU.sol";

/**
 * @title AXAUTokenLite3643
 * @notice AXAU Reserve Unit — identity-gated ERC-20 implementing IAXAU.
 *         Minting and burning are restricted to MINTER_ROLE and BURNER_ROLE
 *         (held by MintRedeemController). Transfers enforce identity verification
 *         when transferGateEnabled = true.
 *
 * @dev Phase 1: gold-anchored store-of-value instrument backed by PAXG-class reserves.
 *      External audit deferred — see AXAU spec lib/axau/spec.ts v1.0.0.
 */
contract AXAUTokenLite3643 is IAXAU {

    // ── ERC-20 metadata ───────────────────────────────────────────────────────
    string public constant name     = "Axiom Gold Reserve Unit";
    string public constant symbol   = "AXAU";
    uint8  public constant decimals = 18;

    // ── ERC-20 state ──────────────────────────────────────────────────────────
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ── ERC-3643 compliance state ─────────────────────────────────────────────
    address public identityRegistry;    // IIdentityRegistry — address(0) = gate disabled
    bool    public transferGateEnabled;

    // ── Access control ────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE   = keccak256("BURNER_ROLE");
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // ── Transfer freeze ───────────────────────────────────────────────────────
    bool public transfersFrozen;

    // ── Events ────────────────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);
    event TransferGateEnabled(address indexed registry);
    event TransferGateDisabled();
    event TransfersFrozen(bool frozen);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param governor         Initial governor address.
     * @param identityRegistry_ Identity registry address, or address(0) to start ungated.
     */
    constructor(address governor, address identityRegistry_) {
        require(governor != address(0), "AXAU: zero governor");
        _grantRole(GOVERNOR_ROLE, governor);
        _grantRole(MINTER_ROLE, governor);
        _grantRole(BURNER_ROLE, governor);

        if (identityRegistry_ != address(0)) {
            identityRegistry    = identityRegistry_;
            transferGateEnabled = true;
            emit TransferGateEnabled(identityRegistry_);
        }
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "AXAU: missing role");
        _;
    }

    // ── ERC-20 core ───────────────────────────────────────────────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // ── IAXAU: Mint / Burn ────────────────────────────────────────────────────

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "AXAU: mint to zero");
        require(!transfersFrozen, "AXAU: frozen");
        _checkIdentity(to);
        totalSupply   += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
        emit Mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        require(from != address(0), "AXAU: burn from zero");
        require(balanceOf[from] >= amount, "AXAU: burn exceeds balance");
        balanceOf[from] -= amount;
        totalSupply     -= amount;
        emit Transfer(from, address(0), amount);
        emit Burn(from, amount);
    }

    // ── IAXAU: Compliance gate ────────────────────────────────────────────────

    function isVerified(address account) public view returns (bool) {
        if (!transferGateEnabled) return true;
        return IIdentityRegistry(identityRegistry).isVerified(account);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "AXAU: from zero");
        require(to   != address(0), "AXAU: to zero");
        require(!transfersFrozen, "AXAU: frozen");
        _checkIdentity(to);
        require(balanceOf[from] >= amount, "AXAU: insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
    }

    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 current = allowance[owner][spender];
        if (current != type(uint256).max) {
            require(current >= amount, "AXAU: insufficient allowance");
            allowance[owner][spender] = current - amount;
        }
    }

    function _checkIdentity(address to) internal view {
        if (transferGateEnabled) {
            require(IIdentityRegistry(identityRegistry).isVerified(to), "AXAU: recipient not verified");
        }
    }

    function _grantRole(bytes32 role, address account) internal {
        _roles[role][account] = true;
        emit RoleGranted(role, account);
    }

    // ── Role management ───────────────────────────────────────────────────────

    function grantRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(account != address(0), "AXAU: zero account");
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        _roles[role][account] = false;
        emit RoleRevoked(role, account);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    // ── Compliance config (governor-only) ─────────────────────────────────────

    /**
     * @notice Enable identity gating with a new registry. Address must be non-zero.
     *         To disable the gate, call disableTransferGate() instead.
     */
    function enableTransferGate(address registry) external onlyRole(GOVERNOR_ROLE) {
        require(registry != address(0), "AXAU: use disableTransferGate() to disable");
        identityRegistry    = registry;
        transferGateEnabled = true;
        emit TransferGateEnabled(registry);
    }

    /**
     * @notice Disable identity gating. Clears the registry reference.
     */
    function disableTransferGate() external onlyRole(GOVERNOR_ROLE) {
        identityRegistry    = address(0);
        transferGateEnabled = false;
        emit TransferGateDisabled();
    }

    function setTransfersFrozen(bool frozen) external onlyRole(GOVERNOR_ROLE) {
        transfersFrozen = frozen;
        emit TransfersFrozen(frozen);
    }
}
