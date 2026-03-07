// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./AbstractModule.sol";

contract LendingPlatformModule is AbstractModule {
    mapping(address => mapping(address => bool)) internal _whitelistedPlatforms;
    mapping(address => address[]) internal _platformList;

    event PlatformAdded(address indexed compliance, address indexed platform);
    event PlatformRemoved(address indexed compliance, address indexed platform);

    function addPlatform(address _compliance, address _platform) external onlyOwner {
        require(_complianceBound[_compliance], "COMPLIANCE_NOT_BOUND");
        require(_platform != address(0), "ZERO_PLATFORM");
        require(!_whitelistedPlatforms[_compliance][_platform], "ALREADY_WHITELISTED");
        _whitelistedPlatforms[_compliance][_platform] = true;
        _platformList[_compliance].push(_platform);
        emit PlatformAdded(_compliance, _platform);
    }

    function removePlatform(address _compliance, address _platform) external onlyOwner {
        require(_whitelistedPlatforms[_compliance][_platform], "NOT_WHITELISTED");
        _whitelistedPlatforms[_compliance][_platform] = false;
        address[] storage platforms = _platformList[_compliance];
        for (uint256 i = 0; i < platforms.length; i++) {
            if (platforms[i] == _platform) {
                platforms[i] = platforms[platforms.length - 1];
                platforms.pop();
                break;
            }
        }
        emit PlatformRemoved(_compliance, _platform);
    }

    function isPlatformWhitelisted(address _compliance, address _platform) external view returns (bool) {
        return _whitelistedPlatforms[_compliance][_platform];
    }

    function getPlatforms(address _compliance) external view returns (address[] memory) {
        return _platformList[_compliance];
    }

    function moduleCheck(address _from, address _to, uint256, address _compliance) external view override returns (bool) {
        if (_whitelistedPlatforms[_compliance][_from] || _whitelistedPlatforms[_compliance][_to]) {
            return true;
        }
        return true;
    }

    function name() external pure override returns (string memory) {
        return "LendingPlatformModule";
    }
}
