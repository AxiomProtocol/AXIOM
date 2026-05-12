// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./AbstractModule.sol";

contract TransferLimitModule is AbstractModule {
    struct TransferCounter {
        uint256 dailyTotal;
        uint256 lastResetDay;
    }

    mapping(address => uint256) internal _transferLimits;
    mapping(address => mapping(address => TransferCounter)) internal _counters;
    mapping(address => mapping(address => bool)) internal _exempt;

    event TransferLimitSet(address indexed compliance, uint256 limit);
    event ExemptionSet(address indexed compliance, address indexed wallet, bool exempt);

    function setTransferLimit(address _compliance, uint256 _limit) external onlyOwner {
        require(_complianceBound[_compliance], "COMPLIANCE_NOT_BOUND");
        _transferLimits[_compliance] = _limit;
        emit TransferLimitSet(_compliance, _limit);
    }

    function setExempt(address _compliance, address _wallet, bool _isExempt) external onlyOwner {
        _exempt[_compliance][_wallet] = _isExempt;
        emit ExemptionSet(_compliance, _wallet, _isExempt);
    }

    function getTransferLimit(address _compliance) external view returns (uint256) {
        return _transferLimits[_compliance];
    }

    function getDailyUsage(address _compliance, address _wallet) external view returns (uint256) {
        TransferCounter memory counter = _counters[_compliance][_wallet];
        uint256 today = block.timestamp / 1 days;
        if (counter.lastResetDay != today) return 0;
        return counter.dailyTotal;
    }

    function isExempt(address _compliance, address _wallet) external view returns (bool) {
        return _exempt[_compliance][_wallet];
    }

    function moduleCheck(
        address _from,
        address,
        uint256 _value,
        address _compliance
    ) external view override returns (bool) {
        uint256 limit = _transferLimits[_compliance];
        if (limit == 0) return true;
        if (_exempt[_compliance][_from]) return true;

        TransferCounter memory counter = _counters[_compliance][_from];
        uint256 today = block.timestamp / 1 days;
        uint256 dailyUsed = (counter.lastResetDay == today) ? counter.dailyTotal : 0;

        return (dailyUsed + _value) <= limit;
    }

    function moduleTransferAction(
        address _from,
        address,
        uint256 _value,
        address _compliance
    ) external override {
        uint256 limit = _transferLimits[_compliance];
        if (limit == 0) return;
        if (_exempt[_compliance][_from]) return;

        TransferCounter storage counter = _counters[_compliance][_from];
        uint256 today = block.timestamp / 1 days;

        if (counter.lastResetDay != today) {
            counter.dailyTotal = _value;
            counter.lastResetDay = today;
        } else {
            counter.dailyTotal += _value;
        }
    }

    function name() external pure override returns (string memory) {
        return "TransferLimitModule";
    }
}
