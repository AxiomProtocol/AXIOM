// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/* ───────────────────────────────────────────────────────────────────────────────
 *  AXAG SILVER RESERVE UNIT — DRAFT, NOT FOR DEPLOYMENT
 *  ───────────────────────────────────────────────────────
 *  Status:        AXAG IS NOT LIVE AND IS NOT ISSUED.
 *  Document path: contracts/axau/drafts/AXAGTokenLite3643.sol
 *  Source spec:   documents/commodities/AXAG_KINESIS_GO_LIVE_PATH.md
 *  Stage:         2 — Technical Diligence (architectural draft only)
 *
 *  This file is a design-sketch ERC-3643 token contract for the planned
 *  Axiom Silver Reserve Unit (AXAG). It mirrors AXAUTokenLite3643.sol
 *  field-for-field. The only differences from AXAU are the public ERC-20
 *  metadata strings (name, symbol). All access control, mint/burn, identity
 *  gating, and freeze semantics are identical to AXAU.
 *
 *  This contract MUST NOT be deployed to any mainnet or testnet until the
 *  following predicates are satisfied (see drafts/README.md for the full
 *  deployment playbook):
 *
 *    1.  AXM governance vote authorising AXAG admission has passed.
 *    2.  Outside legal opinion (REG-01..REG-04) is delivered and reviewed.
 *    3.  KMS Labs Terms of Service confirm wrapper-token use of KAG is
 *        permitted (KIN-03).
 *    4.  Custodian / KAG-source path is finalised (C-03).
 *    5.  External smart-contract audit of this file, AXSilverVault.sol, and
 *        XagPerGramOracle.sol is complete and findings remediated.
 *    6.  Reserve KAG has been acquired and is ready to deposit.
 *    7.  Identity registry update extends AXAG eligibility to verified
 *        holders.
 *    8.  Coordinated disclosure flip across all 18 surfaces inventoried in
 *        the AXAG research report is staged.
 *
 *  No script in scripts/ deploys this file. No CI job promotes drafts/.
 * ─────────────────────────────────────────────────────────────────────────── */

import "../interfaces/IAXAU.sol";

/**
 * @title AXAGTokenLite3643
 * @notice DRAFT silver-anchored counterpart to AXAUTokenLite3643. Identity-gated
 *         ERC-20 implementing IAXAU. Minting and burning restricted to
 *         MINTER_ROLE / BURNER_ROLE held by the AXAG MintRedeemController.
 * @dev    Reuses the IAXAU interface intentionally — the AXAG MintRedeemController
 *         instance can be a fresh deployment of the existing controller bytecode,
 *         pointed at this token + AXSilverVault + AXAG NAV registry. This avoids
 *         creating a second interface surface and keeps audit scope minimal.
 */
contract AXAGTokenLite3643 is IAXAU {

    // ── ERC-20 metadata ───────────────────────────────────────────────────────
    string public constant name     = "Axiom Silver Reserve Unit";
    string public constant symbol   = "AXAG";
    uint8  public constant decimals = 18;

    // ── ERC-20 state ──────────────────────────────────────────────────────────
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ── ERC-3643 compliance state ─────────────────────────────────────────────
    address public identityRegistry;
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
    constructor(address governor, address identityRegistry_) {
        require(governor != address(0), "AXAG: zero governor");
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
        require(_roles[role][msg.sender], "AXAG: missing role");
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
        require(to != address(0), "AXAG: mint to zero");
        require(!transfersFrozen, "AXAG: frozen");
        _checkIdentity(to);
        totalSupply   += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
        emit Mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        require(from != address(0), "AXAG: burn from zero");
        require(balanceOf[from] >= amount, "AXAG: burn exceeds balance");
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
        require(from != address(0), "AXAG: from zero");
        require(to   != address(0), "AXAG: to zero");
        require(!transfersFrozen, "AXAG: frozen");
        _checkIdentity(to);
        require(balanceOf[from] >= amount, "AXAG: insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
    }

    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 current = allowance[owner][spender];
        if (current != type(uint256).max) {
            require(current >= amount, "AXAG: insufficient allowance");
            allowance[owner][spender] = current - amount;
        }
    }

    function _checkIdentity(address to) internal view {
        if (transferGateEnabled) {
            require(IIdentityRegistry(identityRegistry).isVerified(to), "AXAG: recipient not verified");
        }
    }

    function _grantRole(bytes32 role, address account) internal {
        _roles[role][account] = true;
        emit RoleGranted(role, account);
    }

    // ── Role management ───────────────────────────────────────────────────────

    function grantRole(bytes32 role, address account) external onlyRole(GOVERNOR_ROLE) {
        require(account != address(0), "AXAG: zero account");
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

    function enableTransferGate(address registry) external onlyRole(GOVERNOR_ROLE) {
        require(registry != address(0), "AXAG: use disableTransferGate() to disable");
        identityRegistry    = registry;
        transferGateEnabled = true;
        emit TransferGateEnabled(registry);
    }

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
