// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ClaimTopicsRegistry is Ownable {
    uint256[] private _claimTopics;
    mapping(uint256 => bool) private _topicExists;

    event ClaimTopicAdded(uint256 indexed claimTopic);
    event ClaimTopicRemoved(uint256 indexed claimTopic);

    constructor() Ownable(msg.sender) {}

    function addClaimTopic(uint256 _claimTopic) external onlyOwner {
        require(!_topicExists[_claimTopic], "ALREADY_EXISTS");
        _claimTopics.push(_claimTopic);
        _topicExists[_claimTopic] = true;
        emit ClaimTopicAdded(_claimTopic);
    }

    function removeClaimTopic(uint256 _claimTopic) external onlyOwner {
        require(_topicExists[_claimTopic], "NOT_EXISTS");

        for (uint256 i = 0; i < _claimTopics.length; i++) {
            if (_claimTopics[i] == _claimTopic) {
                _claimTopics[i] = _claimTopics[_claimTopics.length - 1];
                _claimTopics.pop();
                break;
            }
        }
        _topicExists[_claimTopic] = false;
        emit ClaimTopicRemoved(_claimTopic);
    }

    function getClaimTopics() external view returns (uint256[] memory) {
        return _claimTopics;
    }

    function isClaimTopic(uint256 _claimTopic) external view returns (bool) {
        return _topicExists[_claimTopic];
    }
}
