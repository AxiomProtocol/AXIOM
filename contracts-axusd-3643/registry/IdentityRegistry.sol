// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../interfaces/IIdentityRegistry.sol";
import "../interfaces/IClaimIssuer.sol";

contract IdentityRegistry is IIdentityRegistry, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    IIdentityRegistryStorage internal _identityStorage;
    IClaimTopicsRegistry internal _claimTopicsRegistry;
    ITrustedIssuersRegistry internal _trustedIssuersRegistry;

    mapping(address => bool) internal _isAgent;

    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);

    modifier onlyAgent() {
        require(_isAgent[msg.sender] || msg.sender == owner(), "NOT_AGENT");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _identityStorageAddr,
        address _claimTopicsRegistryAddr,
        address _trustedIssuersRegistryAddr
    ) external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        require(_identityStorageAddr != address(0), "ZERO_STORAGE");
        require(_claimTopicsRegistryAddr != address(0), "ZERO_TOPICS");
        require(_trustedIssuersRegistryAddr != address(0), "ZERO_ISSUERS");
        _identityStorage = IIdentityRegistryStorage(_identityStorageAddr);
        _claimTopicsRegistry = IClaimTopicsRegistry(_claimTopicsRegistryAddr);
        _trustedIssuersRegistry = ITrustedIssuersRegistry(_trustedIssuersRegistryAddr);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function addAgent(address _agent) external onlyOwner {
        require(_agent != address(0), "ZERO_AGENT");
        require(!_isAgent[_agent], "ALREADY_AGENT");
        _isAgent[_agent] = true;
        emit AgentAdded(_agent);
    }

    function removeAgent(address _agent) external onlyOwner {
        require(_isAgent[_agent], "NOT_AGENT");
        _isAgent[_agent] = false;
        emit AgentRemoved(_agent);
    }

    function isAgent(address _agent) external view returns (bool) {
        return _isAgent[_agent];
    }

    function registerIdentity(address _userAddress, IIdentity _identity, uint16 _country) external override onlyAgent nonReentrant {
        require(_country != 0, "INVALID_COUNTRY");
        _identityStorage.addIdentityToStorage(_userAddress, _identity, _country);
        emit IdentityRegistered(_userAddress, _identity);
    }

    function deleteIdentity(address _userAddress) external override onlyAgent nonReentrant {
        IIdentity storedId = _identityStorage.storedIdentity(_userAddress);
        _identityStorage.removeIdentityFromStorage(_userAddress);
        emit IdentityRemoved(_userAddress, storedId);
    }

    function updateIdentity(address _userAddress, IIdentity _identity) external override onlyAgent nonReentrant {
        IIdentity oldIdentity = _identityStorage.storedIdentity(_userAddress);
        _identityStorage.modifyStoredIdentity(_userAddress, _identity);
        emit IdentityUpdated(oldIdentity, _identity);
    }

    function updateCountry(address _userAddress, uint16 _country) external override onlyAgent nonReentrant {
        require(_country != 0, "INVALID_COUNTRY");
        _identityStorage.modifyStoredInvestorCountry(_userAddress, _country);
        emit CountryUpdated(_userAddress, _country);
    }

    function isVerified(address _userAddress) external view override returns (bool) {
        IIdentity userIdentity = _identityStorage.storedIdentity(_userAddress);
        if (address(userIdentity) == address(0)) return false;

        uint256[] memory requiredTopics = _claimTopicsRegistry.getClaimTopics();
        if (requiredTopics.length == 0) return false;

        IClaimIssuer[] memory trustedIssuers = _trustedIssuersRegistry.getTrustedIssuers();

        for (uint256 t = 0; t < requiredTopics.length; t++) {
            bool topicSatisfied = false;
            bytes32[] memory claimIds = userIdentity.getClaimIdsByTopic(requiredTopics[t]);

            for (uint256 c = 0; c < claimIds.length && !topicSatisfied; c++) {
                (uint256 topic, , address issuer, bytes memory sig, bytes memory data, ) = userIdentity.getClaim(claimIds[c]);
                if (topic != requiredTopics[t]) continue;

                for (uint256 i = 0; i < trustedIssuers.length && !topicSatisfied; i++) {
                    if (address(trustedIssuers[i]) != issuer) continue;
                    if (!_trustedIssuersRegistry.hasClaimTopic(issuer, topic)) continue;

                    if (IClaimIssuer(issuer).isClaimValid(userIdentity, topic, sig, data)) {
                        topicSatisfied = true;
                    }
                }
            }
            if (!topicSatisfied) return false;
        }
        return true;
    }

    function identity(address _userAddress) external view override returns (IIdentity) {
        return _identityStorage.storedIdentity(_userAddress);
    }

    function investorCountry(address _userAddress) external view override returns (uint16) {
        return _identityStorage.storedInvestorCountry(_userAddress);
    }

    function identityStorage() external view override returns (IIdentityRegistryStorage) {
        return _identityStorage;
    }

    function issuersRegistry() external view override returns (ITrustedIssuersRegistry) {
        return _trustedIssuersRegistry;
    }

    function topicsRegistry() external view override returns (IClaimTopicsRegistry) {
        return _claimTopicsRegistry;
    }

    function setIdentityRegistryStorage(address _identityRegistryStorage) external override onlyOwner {
        require(_identityRegistryStorage != address(0), "ZERO_STORAGE");
        _identityStorage = IIdentityRegistryStorage(_identityRegistryStorage);
        emit IdentityStorageSet(_identityRegistryStorage);
    }

    function setClaimTopicsRegistry(address _claimTopicsRegistryAddr) external override onlyOwner {
        require(_claimTopicsRegistryAddr != address(0), "ZERO_TOPICS");
        _claimTopicsRegistry = IClaimTopicsRegistry(_claimTopicsRegistryAddr);
        emit ClaimTopicsRegistrySet(_claimTopicsRegistryAddr);
    }

    function setTrustedIssuersRegistry(address _trustedIssuersRegistryAddr) external override onlyOwner {
        require(_trustedIssuersRegistryAddr != address(0), "ZERO_ISSUERS");
        _trustedIssuersRegistry = ITrustedIssuersRegistry(_trustedIssuersRegistryAddr);
        emit TrustedIssuersRegistrySet(_trustedIssuersRegistryAddr);
    }

    function contains(address _userAddress) external view override returns (bool) {
        return address(_identityStorage.storedIdentity(_userAddress)) != address(0);
    }
}
