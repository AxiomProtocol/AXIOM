// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IIdentityRegistry.sol";
import "./interfaces/IModularCompliance.sol";

/**
 * @title AxiomStable3643
 * @notice ERC-3643-compliant ERC-20 token for Avalanche C-Chain mainnet.
 *
 * Non-upgradeable. Wires to:
 *   - IdentityRegistry  (KYC / compliance gating)
 *   - ModularCompliance (CountryAllow + TransferLimit modules)
 *
 * Key properties:
 *   - Transfers blocked if receiver is not verified in the IdentityRegistry
 *   - Transfers blocked if ModularCompliance.canTransfer() returns false
 *   - Mint / burn gated by MINTER_ROLE / BURNER_ROLE
 *   - Address freeze and forced transfer via AGENT_ROLE
 *   - Pausable by DEFAULT_ADMIN_ROLE
 *
 * Mainnet deployment requirements (all must be completed before go-live):
 *   - DEFAULT_ADMIN_ROLE: transfer to Gnosis Safe (G03)
 *   - AGENT_ROLE: transfer to controlled operations address (G04)
 *   - MINTER_ROLE: transfer to multi-party authorized issuance process (G05)
 *   - Deployer EOA: renounce all roles after transfer (G06)
 */
contract AxiomStable3643 is ERC20, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant AGENT_ROLE  = keccak256("AGENT_ROLE");

    IIdentityRegistry  private _identityRegistry;
    IModularCompliance private _compliance;
    address            private _onchainID;

    uint8 private immutable _decimalsValue;

    mapping(address => bool)    private _frozen;
    mapping(address => uint256) private _frozenTokens;

    event IdentityRegistrySet(address indexed registry);
    event ComplianceSet(address indexed compliance);
    event OnchainIDSet(address indexed onchainID);
    event AddressFrozen(address indexed userAddress, bool indexed isFrozen, address indexed agentAddress);
    event TokensFrozen(address indexed userAddress, uint256 amount);
    event TokensUnfrozen(address indexed userAddress, uint256 amount);
    event TokenPaused(address indexed pausedBy);
    event TokenUnpaused(address indexed unpausedBy);
    event ForcedTransfer(address indexed from, address indexed to, uint256 amount, address indexed agent);
    event RecoverySuccess(address indexed lostWallet, address indexed newWallet, address indexed investorOnchainID);

    constructor(
        address identityRegistry_,
        address compliance_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address onchainID_
    ) ERC20(name_, symbol_) {
        require(identityRegistry_ != address(0), "ZERO_IDENTITY_REGISTRY");
        require(compliance_ != address(0), "ZERO_COMPLIANCE");

        _identityRegistry = IIdentityRegistry(identityRegistry_);
        _compliance       = IModularCompliance(compliance_);
        _onchainID        = onchainID_;
        _decimalsValue    = decimals_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE,        msg.sender);
        _grantRole(BURNER_ROLE,        msg.sender);
        _grantRole(AGENT_ROLE,         msg.sender);
    }

    function decimals() public view override returns (uint8) {
        return _decimalsValue;
    }

    function identityRegistry() external view returns (IIdentityRegistry) {
        return _identityRegistry;
    }

    function compliance() external view returns (IModularCompliance) {
        return _compliance;
    }

    function onchainID() external view returns (address) {
        return _onchainID;
    }

    function isFrozen(address _userAddress) external view returns (bool) {
        return _frozen[_userAddress];
    }

    function getFrozenTokens(address _userAddress) external view returns (uint256) {
        return _frozenTokens[_userAddress];
    }

    function setIdentityRegistry(address _registryAddr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_registryAddr != address(0), "ZERO_IDENTITY_REGISTRY");
        _identityRegistry = IIdentityRegistry(_registryAddr);
        emit IdentityRegistrySet(_registryAddr);
    }

    function setCompliance(address _complianceAddr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_complianceAddr != address(0), "ZERO_COMPLIANCE");
        _compliance = IModularCompliance(_complianceAddr);
        emit ComplianceSet(_complianceAddr);
    }

    function setOnchainID(address _onchainIDAddr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _onchainID = _onchainIDAddr;
        emit OnchainIDSet(_onchainIDAddr);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit TokenPaused(msg.sender);
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit TokenUnpaused(msg.sender);
    }

    function mint(address _to, uint256 _amount) external onlyRole(MINTER_ROLE) {
        require(_identityRegistry.isVerified(_to), "RECEIVER_NOT_VERIFIED");
        _mint(_to, _amount);
    }

    function burn(address _userAddress, uint256 _amount) external onlyRole(BURNER_ROLE) {
        _burn(_userAddress, _amount);
    }

    function forcedTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external onlyRole(AGENT_ROLE) returns (bool) {
        require(balanceOf(_from) >= _amount, "INSUFFICIENT_BALANCE");

        uint256 frozenBefore = _frozenTokens[_from];
        if (frozenBefore > 0) {
            uint256 unfrozen = balanceOf(_from) - frozenBefore;
            if (_amount > unfrozen) {
                uint256 tokensToUnfreeze = _amount - unfrozen;
                _frozenTokens[_from] = frozenBefore - tokensToUnfreeze;
                emit TokensUnfrozen(_from, tokensToUnfreeze);
            }
        }

        bool senderFrozen   = _frozen[_from];
        bool receiverFrozen = _frozen[_to];
        if (senderFrozen)   _frozen[_from] = false;
        if (receiverFrozen) _frozen[_to]   = false;

        _transfer(_from, _to, _amount);

        if (senderFrozen)   _frozen[_from] = true;
        if (receiverFrozen) _frozen[_to]   = true;

        emit ForcedTransfer(_from, _to, _amount, msg.sender);
        return true;
    }

    function recoveryAddress(
        address _lostWallet,
        address _newWallet,
        address _investorOnchainID
    ) external onlyRole(AGENT_ROLE) nonReentrant returns (bool) {
        require(balanceOf(_lostWallet) > 0, "NO_BALANCE");
        require(_identityRegistry.isVerified(_newWallet), "NEW_WALLET_NOT_VERIFIED");

        bool wasFrozen = _frozen[_lostWallet];
        if (wasFrozen) _frozen[_lostWallet] = false;

        uint256 amount     = balanceOf(_lostWallet);
        uint256 frozenAmt  = _frozenTokens[_lostWallet];

        _transfer(_lostWallet, _newWallet, amount);

        if (frozenAmt > 0) {
            _frozenTokens[_lostWallet] = 0;
            _frozenTokens[_newWallet] += frozenAmt;
        }
        if (wasFrozen) {
            _frozen[_newWallet] = true;
        }

        emit RecoverySuccess(_lostWallet, _newWallet, _investorOnchainID);
        return true;
    }

    function freezeAddress(address _userAddress, bool _freeze) external onlyRole(AGENT_ROLE) {
        _frozen[_userAddress] = _freeze;
        emit AddressFrozen(_userAddress, _freeze, msg.sender);
    }

    function freezePartialTokens(address _userAddress, uint256 _amount) external onlyRole(AGENT_ROLE) {
        require(balanceOf(_userAddress) >= _frozenTokens[_userAddress] + _amount, "EXCEEDS_BALANCE");
        _frozenTokens[_userAddress] += _amount;
        emit TokensFrozen(_userAddress, _amount);
    }

    function unfreezePartialTokens(address _userAddress, uint256 _amount) external onlyRole(AGENT_ROLE) {
        require(_frozenTokens[_userAddress] >= _amount, "EXCEEDS_FROZEN");
        _frozenTokens[_userAddress] -= _amount;
        emit TokensUnfrozen(_userAddress, _amount);
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from == address(0)) {
            super._update(from, to, amount);
            _compliance.created(to, amount);
            return;
        }

        if (to == address(0)) {
            super._update(from, to, amount);
            _compliance.destroyed(from, amount);
            return;
        }

        require(!paused(), "TOKEN_PAUSED");
        require(!_frozen[from], "SENDER_FROZEN");
        require(!_frozen[to], "RECEIVER_FROZEN");
        require(
            balanceOf(from) - _frozenTokens[from] >= amount,
            "INSUFFICIENT_UNFROZEN_BALANCE"
        );
        require(_identityRegistry.isVerified(to), "RECEIVER_NOT_VERIFIED");
        require(_compliance.canTransfer(from, to, amount), "TRANSFER_NOT_COMPLIANT");

        super._update(from, to, amount);
        _compliance.transferred(from, to, amount);
    }
}
