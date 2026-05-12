// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract IdentityRegistryStorage is Ownable {
    struct IdentityData {
        address identityAddress;
        uint16 country;
    }

    mapping(address => IdentityData) private _identities;
    address[] private _investors;
    mapping(address => bool) private _exists;

    event IdentityStored(address indexed userAddress, address indexed identity, uint16 country);
    event IdentityRemoved(address indexed userAddress);
    event IdentityUpdated(address indexed userAddress, address indexed newIdentity);
    event CountryUpdated(address indexed userAddress, uint16 country);

    constructor() Ownable(msg.sender) {}

    function addIdentityToStorage(
        address _userAddress,
        address _identity,
        uint16 _country
    ) external onlyOwner {
        require(_userAddress != address(0), "ZERO_USER_ADDRESS");
        require(_identity != address(0), "ZERO_IDENTITY");
        require(!_exists[_userAddress], "ALREADY_REGISTERED");

        _identities[_userAddress] = IdentityData(_identity, _country);
        _exists[_userAddress] = true;
        _investors.push(_userAddress);

        emit IdentityStored(_userAddress, _identity, _country);
    }

    function removeIdentityFromStorage(address _userAddress) external onlyOwner {
        require(_exists[_userAddress], "NOT_REGISTERED");

        delete _identities[_userAddress];
        _exists[_userAddress] = false;

        emit IdentityRemoved(_userAddress);
    }

    function updateIdentityInStorage(address _userAddress, address _newIdentity) external onlyOwner {
        require(_exists[_userAddress], "NOT_REGISTERED");
        require(_newIdentity != address(0), "ZERO_IDENTITY");

        _identities[_userAddress].identityAddress = _newIdentity;
        emit IdentityUpdated(_userAddress, _newIdentity);
    }

    function updateCountryInStorage(address _userAddress, uint16 _country) external onlyOwner {
        require(_exists[_userAddress], "NOT_REGISTERED");

        _identities[_userAddress].country = _country;
        emit CountryUpdated(_userAddress, _country);
    }

    function getIdentity(address _userAddress) external view returns (address) {
        return _identities[_userAddress].identityAddress;
    }

    function getInvestorCountry(address _userAddress) external view returns (uint16) {
        return _identities[_userAddress].country;
    }

    function contains(address _userAddress) external view returns (bool) {
        return _exists[_userAddress];
    }

    function getInvestors() external view returns (address[] memory) {
        return _investors;
    }
}
