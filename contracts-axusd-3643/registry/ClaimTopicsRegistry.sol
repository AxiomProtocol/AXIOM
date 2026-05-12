// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IClaimTopicsRegistry.sol";

contract ClaimTopicsRegistry is IClaimTopicsRegistry, OwnableUpgradeable, UUPSUpgradeable {
    uint256[] internal _claimTopics;
    mapping(uint256 => bool) internal _topicExists;

    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function addClaimTopic(uint256 _claimTopic) external override onlyOwner {
        require(!_topicExists[_claimTopic], "TOPIC_EXISTS");
        _claimTopics.push(_claimTopic);
        _topicExists[_claimTopic] = true;
        emit ClaimTopicAdded(_claimTopic);
    }

    function removeClaimTopic(uint256 _claimTopic) external override onlyOwner {
        require(_topicExists[_claimTopic], "TOPIC_NOT_FOUND");
        _topicExists[_claimTopic] = false;
        for (uint256 i = 0; i < _claimTopics.length; i++) {
            if (_claimTopics[i] == _claimTopic) {
                _claimTopics[i] = _claimTopics[_claimTopics.length - 1];
                _claimTopics.pop();
                break;
            }
        }
        emit ClaimTopicRemoved(_claimTopic);
    }

    function getClaimTopics() external view override returns (uint256[] memory) {
        return _claimTopics;
    }
}
