// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IRateLimiter.sol";

contract RateLimiter is AccessControl, IRateLimiter {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    uint256 public dailyMintLimit;
    uint256 public perAddressDailyLimit;
    uint256 public currentDayMinted;
    uint256 public lastResetTimestamp;

    mapping(address => uint256) public addressDailyMinted;
    mapping(address => uint256) public addressLastReset;

    event DailyLimitUpdated(uint256 newLimit);
    event PerAddressLimitUpdated(uint256 newLimit);
    event MintRecorded(address indexed user, uint256 amount, uint256 userTotal, uint256 globalTotal);
    event DailyReset(uint256 timestamp);

    constructor(uint256 _dailyMintLimit, uint256 _perAddressDailyLimit) {
        require(_dailyMintLimit > 0, "RateLimiter: zero daily limit");
        require(_perAddressDailyLimit > 0, "RateLimiter: zero per-address limit");
        require(_perAddressDailyLimit <= _dailyMintLimit, "RateLimiter: per-address exceeds daily");

        dailyMintLimit = _dailyMintLimit;
        perAddressDailyLimit = _perAddressDailyLimit;
        lastResetTimestamp = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function _resetIfNeeded() internal {
        if (block.timestamp >= lastResetTimestamp + 1 days) {
            currentDayMinted = 0;
            lastResetTimestamp = block.timestamp;
            emit DailyReset(block.timestamp);
        }
    }

    function _resetAddressIfNeeded(address user) internal {
        if (block.timestamp >= addressLastReset[user] + 1 days) {
            addressDailyMinted[user] = 0;
            addressLastReset[user] = block.timestamp;
        }
    }

    function checkMintLimit(address user, uint256 amount) external view override returns (bool) {
        uint256 effectiveGlobalMinted = currentDayMinted;
        if (block.timestamp >= lastResetTimestamp + 1 days) {
            effectiveGlobalMinted = 0;
        }

        uint256 effectiveUserMinted = addressDailyMinted[user];
        if (block.timestamp >= addressLastReset[user] + 1 days) {
            effectiveUserMinted = 0;
        }

        if (effectiveGlobalMinted + amount > dailyMintLimit) return false;
        if (effectiveUserMinted + amount > perAddressDailyLimit) return false;
        
        return true;
    }

    function recordMint(address user, uint256 amount) external override onlyRole(RECORDER_ROLE) {
        _resetIfNeeded();
        _resetAddressIfNeeded(user);

        require(currentDayMinted + amount <= dailyMintLimit, "RateLimiter: global limit exceeded");
        require(addressDailyMinted[user] + amount <= perAddressDailyLimit, "RateLimiter: address limit exceeded");

        currentDayMinted += amount;
        addressDailyMinted[user] += amount;

        emit MintRecorded(user, amount, addressDailyMinted[user], currentDayMinted);
    }

    function resetDailyLimits() external override onlyRole(ADMIN_ROLE) {
        currentDayMinted = 0;
        lastResetTimestamp = block.timestamp;
        emit DailyReset(block.timestamp);
    }

    function setDailyMintLimit(uint256 newLimit) external onlyRole(ADMIN_ROLE) {
        require(newLimit > 0, "RateLimiter: zero limit");
        require(newLimit >= perAddressDailyLimit, "RateLimiter: less than per-address");
        dailyMintLimit = newLimit;
        emit DailyLimitUpdated(newLimit);
    }

    function setPerAddressDailyLimit(uint256 newLimit) external onlyRole(ADMIN_ROLE) {
        require(newLimit > 0, "RateLimiter: zero limit");
        require(newLimit <= dailyMintLimit, "RateLimiter: exceeds daily limit");
        perAddressDailyLimit = newLimit;
        emit PerAddressLimitUpdated(newLimit);
    }

    function getRemainingGlobalLimit() external view returns (uint256) {
        uint256 effectiveMinted = currentDayMinted;
        if (block.timestamp >= lastResetTimestamp + 1 days) {
            effectiveMinted = 0;
        }
        return dailyMintLimit > effectiveMinted ? dailyMintLimit - effectiveMinted : 0;
    }

    function getRemainingAddressLimit(address user) external view returns (uint256) {
        uint256 effectiveMinted = addressDailyMinted[user];
        if (block.timestamp >= addressLastReset[user] + 1 days) {
            effectiveMinted = 0;
        }
        return perAddressDailyLimit > effectiveMinted ? perAddressDailyLimit - effectiveMinted : 0;
    }
}
