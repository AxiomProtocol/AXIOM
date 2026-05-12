// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/ITrustedIssuersRegistry.sol";

contract TrustedIssuersRegistry is ITrustedIssuersRegistry, OwnableUpgradeable, UUPSUpgradeable {
    IClaimIssuer[] internal _trustedIssuers;
    mapping(address => bool) internal _isTrusted;
    mapping(address => uint256[]) internal _issuerClaimTopics;

    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function addTrustedIssuer(IClaimIssuer _trustedIssuer, uint256[] calldata _claimTopics) external override onlyOwner {
        require(address(_trustedIssuer) != address(0), "ZERO_ADDRESS");
        require(!_isTrusted[address(_trustedIssuer)], "ALREADY_TRUSTED");
        require(_claimTopics.length > 0, "EMPTY_TOPICS");
        _trustedIssuers.push(_trustedIssuer);
        _isTrusted[address(_trustedIssuer)] = true;
        _issuerClaimTopics[address(_trustedIssuer)] = _claimTopics;
        emit TrustedIssuerAdded(_trustedIssuer, _claimTopics);
    }

    function removeTrustedIssuer(IClaimIssuer _trustedIssuer) external override onlyOwner {
        require(_isTrusted[address(_trustedIssuer)], "NOT_TRUSTED");
        _isTrusted[address(_trustedIssuer)] = false;
        delete _issuerClaimTopics[address(_trustedIssuer)];
        for (uint256 i = 0; i < _trustedIssuers.length; i++) {
            if (address(_trustedIssuers[i]) == address(_trustedIssuer)) {
                _trustedIssuers[i] = _trustedIssuers[_trustedIssuers.length - 1];
                _trustedIssuers.pop();
                break;
            }
        }
        emit TrustedIssuerRemoved(_trustedIssuer);
    }

    function updateIssuerClaimTopics(IClaimIssuer _trustedIssuer, uint256[] calldata _claimTopics) external override onlyOwner {
        require(_isTrusted[address(_trustedIssuer)], "NOT_TRUSTED");
        require(_claimTopics.length > 0, "EMPTY_TOPICS");
        _issuerClaimTopics[address(_trustedIssuer)] = _claimTopics;
        emit ClaimTopicsUpdated(_trustedIssuer, _claimTopics);
    }

    function getTrustedIssuers() external view override returns (IClaimIssuer[] memory) {
        return _trustedIssuers;
    }

    function isTrustedIssuer(address _issuer) external view override returns (bool) {
        return _isTrusted[_issuer];
    }

    function getTrustedIssuerClaimTopics(IClaimIssuer _trustedIssuer) external view override returns (uint256[] memory) {
        require(_isTrusted[address(_trustedIssuer)], "NOT_TRUSTED");
        return _issuerClaimTopics[address(_trustedIssuer)];
    }

    function hasClaimTopic(address _issuer, uint256 _claimTopic) external view override returns (bool) {
        uint256[] memory topics = _issuerClaimTopics[_issuer];
        for (uint256 i = 0; i < topics.length; i++) {
            if (topics[i] == _claimTopic) return true;
        }
        return false;
    }
}
