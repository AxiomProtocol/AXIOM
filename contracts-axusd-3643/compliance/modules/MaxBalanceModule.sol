// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./AbstractModule.sol";
import "../../interfaces/IModularCompliance.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MaxBalanceModule is AbstractModule {
    mapping(address => uint256) internal _maxBalance;
    mapping(address => mapping(address => bool)) internal _presetExempt;

    event MaxBalanceSet(address indexed compliance, uint256 maxBalance);
    event ExemptAdded(address indexed compliance, address indexed wallet);
    event ExemptRemoved(address indexed compliance, address indexed wallet);

    function setMaxBalance(address _compliance, uint256 _max) external onlyOwner {
        require(_complianceBound[_compliance], "COMPLIANCE_NOT_BOUND");
        require(_max > 0, "ZERO_MAX");
        _maxBalance[_compliance] = _max;
        emit MaxBalanceSet(_compliance, _max);
    }

    function addExempt(address _compliance, address _wallet) external onlyOwner {
        _presetExempt[_compliance][_wallet] = true;
        emit ExemptAdded(_compliance, _wallet);
    }

    function removeExempt(address _compliance, address _wallet) external onlyOwner {
        _presetExempt[_compliance][_wallet] = false;
        emit ExemptRemoved(_compliance, _wallet);
    }

    function getMaxBalance(address _compliance) external view returns (uint256) {
        return _maxBalance[_compliance];
    }

    function isExempt(address _compliance, address _wallet) external view returns (bool) {
        return _presetExempt[_compliance][_wallet];
    }

    function moduleCheck(address, address _to, uint256 _value, address _compliance) external view override returns (bool) {
        if (_to == address(0)) return true;
        if (_presetExempt[_compliance][_to]) return true;
        uint256 max = _maxBalance[_compliance];
        if (max == 0) return true;
        address token = IModularCompliance(_compliance).getTokenBound();
        uint256 currentBalance = IERC20(token).balanceOf(_to);
        return (currentBalance + _value) <= max;
    }

    function name() external pure override returns (string memory) {
        return "MaxBalanceModule";
    }
}
