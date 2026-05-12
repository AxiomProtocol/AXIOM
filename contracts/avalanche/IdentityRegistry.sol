// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IdentityRegistryStorage.sol";
import "./ClaimTopicsRegistry.sol";
import "./TrustedIssuersRegistry.sol";
import "./interfaces/IIdentityRegistry.sol";

contract IdentityRegistry is IIdentityRegistry, Ownable {
    IdentityRegistryStorage public identityStorage;
    ClaimTopicsRegistry public claimTopicsRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;

    mapping(address => bool) private _agents;

    modifier onlyAgent() {
        require(_agents[msg.sender] || msg.sender == owner(), "NOT_AGENT");
        _;
    }

    constructor(
        address _identityStorage,
        address _trustedIssuersRegistry,
        address _claimTopicsRegistry
    ) Ownable(msg.sender) {
        require(_identityStorage != address(0), "ZERO_STORAGE");
        require(_trustedIssuersRegistry != address(0), "ZERO_TIR");
        require(_claimTopicsRegistry != address(0), "ZERO_CTR");

        identityStorage = IdentityRegistryStorage(_identityStorage);
        trustedIssuersRegistry = TrustedIssuersRegistry(_trustedIssuersRegistry);
        claimTopicsRegistry = ClaimTopicsRegistry(_claimTopicsRegistry);
    }

    function addAgent(address _agent) external override onlyOwner {
        require(_agent != address(0), "ZERO_AGENT");
        _agents[_agent] = true;
        emit AgentAdded(_agent);
    }

    function removeAgent(address _agent) external override onlyOwner {
        _agents[_agent] = false;
        emit AgentRemoved(_agent);
    }

    function isAgent(address _agent) external view override returns (bool) {
        return _agents[_agent];
    }

    function registerIdentity(
        address _userAddress,
        address _identity,
        uint16 _country
    ) external override onlyAgent {
        identityStorage.addIdentityToStorage(_userAddress, _identity, _country);
        emit IdentityRegistered(_userAddress, _identity);
    }

    function deleteIdentity(address _userAddress) external override onlyAgent {
        identityStorage.removeIdentityFromStorage(_userAddress);
        emit IdentityRemoved(_userAddress);
    }

    function updateIdentity(address _userAddress, address _newIdentity) external override onlyAgent {
        identityStorage.updateIdentityInStorage(_userAddress, _newIdentity);
        emit IdentityUpdated(_userAddress, _newIdentity);
    }

    function updateCountry(address _userAddress, uint16 _country) external override onlyAgent {
        identityStorage.updateCountryInStorage(_userAddress, _country);
        emit CountryUpdated(_userAddress, _country);
    }

    function isVerified(address _userAddress) external view override returns (bool) {
        return identityStorage.contains(_userAddress);
    }

    function contains(address _userAddress) external view override returns (bool) {
        return identityStorage.contains(_userAddress);
    }

    function investorCountry(address _userAddress) external view override returns (uint16) {
        return identityStorage.getInvestorCountry(_userAddress);
    }

    function identity(address _userAddress) external view override returns (address) {
        return identityStorage.getIdentity(_userAddress);
    }

    function setIdentityStorage(address _identityStorage) external onlyOwner {
        require(_identityStorage != address(0), "ZERO_STORAGE");
        identityStorage = IdentityRegistryStorage(_identityStorage);
    }

    function setClaimTopicsRegistry(address _claimTopicsRegistry) external onlyOwner {
        require(_claimTopicsRegistry != address(0), "ZERO_CTR");
        claimTopicsRegistry = ClaimTopicsRegistry(_claimTopicsRegistry);
    }

    function setTrustedIssuersRegistry(address _trustedIssuersRegistry) external onlyOwner {
        require(_trustedIssuersRegistry != address(0), "ZERO_TIR");
        trustedIssuersRegistry = TrustedIssuersRegistry(_trustedIssuersRegistry);
    }
}
