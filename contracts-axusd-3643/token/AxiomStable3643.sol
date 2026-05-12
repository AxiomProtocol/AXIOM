// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IERC3643.sol";
import "../interfaces/IIdentityRegistry.sol";
import "../interfaces/IModularCompliance.sol";
import "../interfaces/IIdentity.sol";

contract AxiomStable3643 is
    IERC3643,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    IIdentityRegistry internal _identityRegistry;
    IModularCompliance internal _compliance;
    address internal _onchainID;

    mapping(address => bool) internal _frozen;
    mapping(address => uint256) internal _frozenTokens;

    string internal _tokenName;
    string internal _tokenSymbol;
    uint8 internal _tokenDecimals;

    uint256 public constant GOVERNANCE_UPDATE_DELAY = 1 days;

    address internal _pendingIdentityRegistry;
    uint256 internal _pendingIdentityRegistryReadyAt;
    address internal _pendingCompliance;
    uint256 internal _pendingComplianceReadyAt;

    event IdentityRegistryUpdateProposed(address indexed identityRegistry, uint256 readyAt);
    event ComplianceUpdateProposed(address indexed compliance, uint256 readyAt);

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address identityRegistry_,
        address compliance_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address onchainID_
    ) external initializer {
        __ERC20_init(name_, symbol_);
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        require(identityRegistry_ != address(0), "ZERO_IDENTITY_REGISTRY");
        require(compliance_ != address(0), "ZERO_COMPLIANCE");

        _identityRegistry = IIdentityRegistry(identityRegistry_);
        _compliance = IModularCompliance(compliance_);
        _onchainID = onchainID_;
        _tokenName = name_;
        _tokenSymbol = symbol_;
        _tokenDecimals = decimals_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(AGENT_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    function name() public view override returns (string memory) {
        return _tokenName;
    }

    function symbol() public view override returns (string memory) {
        return _tokenSymbol;
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
        require(balanceOf(from) - _frozenTokens[from] >= amount, "INSUFFICIENT_UNFROZEN_BALANCE");
        require(_identityRegistry.isVerified(to), "RECEIVER_NOT_VERIFIED");
        require(_compliance.canTransfer(from, to, amount), "TRANSFER_NOT_COMPLIANT");

        super._update(from, to, amount);
        _compliance.transferred(from, to, amount);
    }

    function mint(address _to, uint256 _amount) external override onlyRole(MINTER_ROLE) {
        require(!paused(), "TOKEN_PAUSED");
        require(_identityRegistry.isVerified(_to), "RECEIVER_NOT_VERIFIED");
        require(_compliance.canTransfer(address(0), _to, _amount), "MINT_NOT_COMPLIANT");
        _mint(_to, _amount);
    }

    function burn(address _userAddress, uint256 _amount) external override onlyRole(BURNER_ROLE) {
        require(!paused(), "TOKEN_PAUSED");
        require(balanceOf(_userAddress) - _frozenTokens[_userAddress] >= _amount, "BURN_EXCEEDS_UNFROZEN");
        _burn(_userAddress, _amount);
    }

    function forcedTransfer(address _from, address _to, uint256 _amount) external override onlyRole(AGENT_ROLE) returns (bool) {
        require(balanceOf(_from) >= _amount, "INSUFFICIENT_BALANCE");
        uint256 frozenBefore = _frozenTokens[_from];
        if (frozenBefore > 0) {
            if (_amount > balanceOf(_from) - frozenBefore) {
                uint256 tokensToUnfreeze = _amount - (balanceOf(_from) - frozenBefore);
                _frozenTokens[_from] = frozenBefore - tokensToUnfreeze;
                emit TokensUnfrozen(_from, tokensToUnfreeze);
            }
        }

        bool senderFrozen = _frozen[_from];
        bool receiverFrozen = _frozen[_to];
        if (senderFrozen) _frozen[_from] = false;
        if (receiverFrozen) _frozen[_to] = false;

        _transfer(_from, _to, _amount);

        if (senderFrozen) _frozen[_from] = true;
        if (receiverFrozen) _frozen[_to] = true;

        return true;
    }

    function recoveryAddress(
        address _lostWallet,
        address _newWallet,
        address _investorOnchainID
    ) external override onlyRole(AGENT_ROLE) nonReentrant returns (bool) {
        require(balanceOf(_lostWallet) > 0, "NO_BALANCE");
        require(_identityRegistry.isVerified(_newWallet), "NEW_WALLET_NOT_VERIFIED");

        bool wasFrozen = _frozen[_lostWallet];
        if (wasFrozen) _frozen[_lostWallet] = false;

        uint256 amount = balanceOf(_lostWallet);
        uint256 frozenAmt = _frozenTokens[_lostWallet];
        if (frozenAmt > 0) {
            _frozenTokens[_lostWallet] = 0;
        }

        _transfer(_lostWallet, _newWallet, amount);

        if (frozenAmt > 0) {
            _frozenTokens[_newWallet] += frozenAmt;
        }
        if (wasFrozen) {
            _frozen[_newWallet] = true;
        }

        emit RecoverySuccess(_lostWallet, _newWallet, _investorOnchainID);
        return true;
    }

    function freezeAddress(address _userAddress, bool _freeze) external override onlyRole(AGENT_ROLE) {
        _frozen[_userAddress] = _freeze;
        emit AddressFrozen(_userAddress, _freeze, msg.sender);
    }

    function batchFreezeAddress(address[] calldata _userAddresses, bool[] calldata _freeze) external override onlyRole(AGENT_ROLE) {
        require(_userAddresses.length == _freeze.length, "LENGTH_MISMATCH");
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            _frozen[_userAddresses[i]] = _freeze[i];
            emit AddressFrozen(_userAddresses[i], _freeze[i], msg.sender);
        }
    }

    function freezePartialTokens(address _userAddress, uint256 _amount) external override onlyRole(AGENT_ROLE) {
        require(balanceOf(_userAddress) >= _frozenTokens[_userAddress] + _amount, "EXCEEDS_BALANCE");
        _frozenTokens[_userAddress] += _amount;
        emit TokensFrozen(_userAddress, _amount);
    }

    function unfreezePartialTokens(address _userAddress, uint256 _amount) external override onlyRole(AGENT_ROLE) {
        require(_frozenTokens[_userAddress] >= _amount, "EXCEEDS_FROZEN");
        _frozenTokens[_userAddress] -= _amount;
        emit TokensUnfrozen(_userAddress, _amount);
    }

    function setName(string calldata _name) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _tokenName = _name;
    }

    function setSymbol(string calldata _symbol) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _tokenSymbol = _symbol;
    }

    function setOnchainID(address _onchainIDAddr) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _onchainID = _onchainIDAddr;
    }

    function pause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit TokenPaused(msg.sender);
    }

    function unpause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit TokenUnpaused(msg.sender);
    }

    function setIdentityRegistry(address _identityRegistryAddr) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_identityRegistryAddr != address(0), "ZERO_IDENTITY_REGISTRY");
        require(_identityRegistryAddr.code.length > 0, "IDENTITY_REGISTRY_NOT_CONTRACT");
        _pendingIdentityRegistry = _identityRegistryAddr;
        _pendingIdentityRegistryReadyAt = block.timestamp + GOVERNANCE_UPDATE_DELAY;
        emit IdentityRegistryUpdateProposed(_identityRegistryAddr, _pendingIdentityRegistryReadyAt);
    }

    function acceptIdentityRegistry() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_pendingIdentityRegistry != address(0), "NO_PENDING_IDENTITY_REGISTRY");
        require(block.timestamp >= _pendingIdentityRegistryReadyAt, "IDENTITY_REGISTRY_DELAY_ACTIVE");
        address identityRegistry_ = _pendingIdentityRegistry;
        delete _pendingIdentityRegistry;
        delete _pendingIdentityRegistryReadyAt;
        _identityRegistry = IIdentityRegistry(identityRegistry_);
        emit IdentityRegistryAdded(identityRegistry_);
    }

    function pendingIdentityRegistry() external view returns (address pending, uint256 readyAt) {
        return (_pendingIdentityRegistry, _pendingIdentityRegistryReadyAt);
    }

    function setCompliance(address _complianceAddr) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_complianceAddr != address(0), "ZERO_COMPLIANCE");
        require(_complianceAddr.code.length > 0, "COMPLIANCE_NOT_CONTRACT");
        _pendingCompliance = _complianceAddr;
        _pendingComplianceReadyAt = block.timestamp + GOVERNANCE_UPDATE_DELAY;
        emit ComplianceUpdateProposed(_complianceAddr, _pendingComplianceReadyAt);
    }

    function acceptCompliance() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_pendingCompliance != address(0), "NO_PENDING_COMPLIANCE");
        require(block.timestamp >= _pendingComplianceReadyAt, "COMPLIANCE_DELAY_ACTIVE");
        address compliance_ = _pendingCompliance;
        delete _pendingCompliance;
        delete _pendingComplianceReadyAt;
        _compliance = IModularCompliance(compliance_);
        emit ComplianceAdded(compliance_);
    }

    function pendingCompliance() external view returns (address pending, uint256 readyAt) {
        return (_pendingCompliance, _pendingComplianceReadyAt);
    }

    function identityRegistry() external view override returns (IIdentityRegistry) {
        return _identityRegistry;
    }

    function compliance() external view override returns (IModularCompliance) {
        return _compliance;
    }

    function onchainID() external view override returns (address) {
        return _onchainID;
    }

    function isFrozen(address _userAddress) external view override returns (bool) {
        return _frozen[_userAddress];
    }

    function getFrozenTokens(address _userAddress) external view override returns (uint256) {
        return _frozenTokens[_userAddress];
    }
}
