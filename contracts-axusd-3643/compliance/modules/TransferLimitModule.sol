// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./AbstractModule.sol";
import "../../interfaces/IModularCompliance.sol";
import "../../interfaces/IERC3643.sol";
import "../../interfaces/IIdentityRegistry.sol";
import "../../interfaces/IIdentity.sol";

contract TransferLimitModule is AbstractModule {
    uint256 public constant TIER_1_KYC = 1;
    uint256 public constant TIER_2_ACCREDITED = 2;
    uint256 public constant TIER_3_INSTITUTIONAL = 3;

    uint256 public constant ACCREDITED_TOPIC = 2;

    struct TransferCounter {
        uint256 dailyTotal;
        uint256 lastResetDay;
    }

    mapping(address => mapping(uint256 => uint256)) internal _tierLimits;
    mapping(address => mapping(address => TransferCounter)) internal _counters;
    mapping(address => mapping(address => bool)) internal _exempt;

    event TierLimitSet(address indexed compliance, uint256 tier, uint256 limit);
    event TransferExemptSet(address indexed compliance, address indexed wallet, bool exempt);

    function setTierLimit(address _compliance, uint256 _tier, uint256 _limit) external onlyOwner {
        require(_complianceBound[_compliance], "COMPLIANCE_NOT_BOUND");
        _tierLimits[_compliance][_tier] = _limit;
        emit TierLimitSet(_compliance, _tier, _limit);
    }

    function setExempt(address _compliance, address _wallet, bool _isExempt) external onlyOwner {
        _exempt[_compliance][_wallet] = _isExempt;
        emit TransferExemptSet(_compliance, _wallet, _isExempt);
    }

    function getTierLimit(address _compliance, uint256 _tier) external view returns (uint256) {
        return _tierLimits[_compliance][_tier];
    }

    function getDailyUsage(address _compliance, address _wallet) external view returns (uint256) {
        TransferCounter memory counter = _counters[_compliance][_wallet];
        uint256 today = block.timestamp / 1 days;
        if (counter.lastResetDay != today) return 0;
        return counter.dailyTotal;
    }

    function _getUserTier(address _compliance, address _user) internal view returns (uint256) {
        address tokenAddr = IModularCompliance(_compliance).getTokenBound();
        IIdentityRegistry registry = IERC3643(tokenAddr).identityRegistry();

        if (!registry.contains(_user)) return 0;

        IIdentity userIdentity = registry.identity(_user);
        bytes32[] memory accreditedClaims = userIdentity.getClaimIdsByTopic(ACCREDITED_TOPIC);
        if (accreditedClaims.length > 0) return TIER_2_ACCREDITED;

        return TIER_1_KYC;
    }

    function moduleCheck(address _from, address, uint256 _value, address _compliance) external view override returns (bool) {
        if (_from == address(0)) return true;
        if (_exempt[_compliance][_from]) return true;

        uint256 tier = _getUserTier(_compliance, _from);
        if (tier == 0) return false;
        if (tier >= TIER_3_INSTITUTIONAL) return true;

        uint256 limit = _tierLimits[_compliance][tier];
        if (limit == 0) return true;

        TransferCounter memory counter = _counters[_compliance][_from];
        uint256 today = block.timestamp / 1 days;
        uint256 dailyTotal = (counter.lastResetDay == today) ? counter.dailyTotal : 0;

        return (dailyTotal + _value) <= limit;
    }

    function moduleTransferAction(address _from, address, uint256 _value, address _compliance) external override onlyCompliance {
        if (_from == address(0)) return;
        if (_exempt[_compliance][_from]) return;

        uint256 today = block.timestamp / 1 days;
        TransferCounter storage counter = _counters[_compliance][_from];
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
