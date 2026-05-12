// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract TrustedIssuersRegistry is Ownable {
    mapping(address => uint256[]) private _issuerClaimTopics;
    address[] private _trustedIssuers;
    mapping(address => bool) private _isTrusted;
    mapping(address => uint256) private _issuerIndex;

    event TrustedIssuerAdded(address indexed issuer, uint256[] claimTopics);
    event TrustedIssuerRemoved(address indexed issuer);
    event ClaimTopicsUpdated(address indexed issuer, uint256[] claimTopics);

    constructor() Ownable(msg.sender) {}

    function addTrustedIssuer(address _issuer, uint256[] calldata _claimTopics) external onlyOwner {
        require(_issuer != address(0), "ZERO_ISSUER");
        require(!_isTrusted[_issuer], "ALREADY_TRUSTED");

        _issuerIndex[_issuer] = _trustedIssuers.length;
        _trustedIssuers.push(_issuer);
        _isTrusted[_issuer] = true;
        _issuerClaimTopics[_issuer] = _claimTopics;

        emit TrustedIssuerAdded(_issuer, _claimTopics);
    }

    function removeTrustedIssuer(address _issuer) external onlyOwner {
        require(_isTrusted[_issuer], "NOT_TRUSTED");

        uint256 idx = _issuerIndex[_issuer];
        uint256 last = _trustedIssuers.length - 1;
        if (idx != last) {
            address lastIssuer = _trustedIssuers[last];
            _trustedIssuers[idx] = lastIssuer;
            _issuerIndex[lastIssuer] = idx;
        }
        _trustedIssuers.pop();

        _isTrusted[_issuer] = false;
        delete _issuerClaimTopics[_issuer];
        delete _issuerIndex[_issuer];

        emit TrustedIssuerRemoved(_issuer);
    }

    function updateIssuerClaimTopics(address _issuer, uint256[] calldata _claimTopics) external onlyOwner {
        require(_isTrusted[_issuer], "NOT_TRUSTED");
        _issuerClaimTopics[_issuer] = _claimTopics;
        emit ClaimTopicsUpdated(_issuer, _claimTopics);
    }

    function isTrustedIssuer(address _issuer) external view returns (bool) {
        return _isTrusted[_issuer];
    }

    function getTrustedIssuers() external view returns (address[] memory) {
        return _trustedIssuers;
    }

    function getTrustedIssuerClaimTopics(address _issuer) external view returns (uint256[] memory) {
        require(_isTrusted[_issuer], "NOT_TRUSTED");
        return _issuerClaimTopics[_issuer];
    }

    function hasClaimTopic(address _issuer, uint256 _claimTopic) external view returns (bool) {
        uint256[] memory topics = _issuerClaimTopics[_issuer];
        for (uint256 i = 0; i < topics.length; i++) {
            if (topics[i] == _claimTopic) return true;
        }
        return false;
    }
}
