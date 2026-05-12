// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IIdentityRegistryStorage.sol";

contract IdentityRegistryStorage is IIdentityRegistryStorage, OwnableUpgradeable, UUPSUpgradeable {
    mapping(address => IIdentity) internal _identities;
    mapping(address => uint16) internal _countries;
    mapping(address => bool) internal _boundRegistries;
    address[] internal _registryList;

    modifier onlyBoundRegistry() {
        require(_boundRegistries[msg.sender], "NOT_BOUND_REGISTRY");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function addIdentityToStorage(address _userAddress, IIdentity _identity, uint16 _country) external override onlyBoundRegistry {
        require(address(_identity) != address(0), "ZERO_IDENTITY");
        require(address(_identities[_userAddress]) == address(0), "IDENTITY_EXISTS");
        _identities[_userAddress] = _identity;
        _countries[_userAddress] = _country;
        emit IdentityStored(_userAddress, _identity);
    }

    function removeIdentityFromStorage(address _userAddress) external override onlyBoundRegistry {
        require(address(_identities[_userAddress]) != address(0), "IDENTITY_NOT_FOUND");
        IIdentity oldIdentity = _identities[_userAddress];
        delete _identities[_userAddress];
        delete _countries[_userAddress];
        emit IdentityUnstored(_userAddress, oldIdentity);
    }

    function modifyStoredInvestorCountry(address _userAddress, uint16 _country) external override onlyBoundRegistry {
        require(address(_identities[_userAddress]) != address(0), "IDENTITY_NOT_FOUND");
        _countries[_userAddress] = _country;
        emit CountryModified(_userAddress, _country);
    }

    function modifyStoredIdentity(address _userAddress, IIdentity _identity) external override onlyBoundRegistry {
        require(address(_identity) != address(0), "ZERO_IDENTITY");
        require(address(_identities[_userAddress]) != address(0), "IDENTITY_NOT_FOUND");
        IIdentity oldIdentity = _identities[_userAddress];
        _identities[_userAddress] = _identity;
        emit IdentityModified(oldIdentity, _identity);
    }

    function storedIdentity(address _userAddress) external view override returns (IIdentity) {
        return _identities[_userAddress];
    }

    function storedInvestorCountry(address _userAddress) external view override returns (uint16) {
        return _countries[_userAddress];
    }

    function bindIdentityRegistry(address _identityRegistry) external override onlyOwner {
        require(_identityRegistry != address(0), "ZERO_REGISTRY");
        require(!_boundRegistries[_identityRegistry], "ALREADY_BOUND");
        _boundRegistries[_identityRegistry] = true;
        _registryList.push(_identityRegistry);
        emit IdentityRegistryBound(_identityRegistry);
    }

    function unbindIdentityRegistry(address _identityRegistry) external override onlyOwner {
        require(_boundRegistries[_identityRegistry], "NOT_BOUND");
        _boundRegistries[_identityRegistry] = false;
        for (uint256 i = 0; i < _registryList.length; i++) {
            if (_registryList[i] == _identityRegistry) {
                _registryList[i] = _registryList[_registryList.length - 1];
                _registryList.pop();
                break;
            }
        }
        emit IdentityRegistryUnbound(_identityRegistry);
    }

    function linkedIdentityRegistries() external view override returns (address[] memory) {
        return _registryList;
    }
}
