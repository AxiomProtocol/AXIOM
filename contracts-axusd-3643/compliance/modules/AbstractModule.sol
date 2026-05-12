// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../../interfaces/IModule.sol";

abstract contract AbstractModule is IModule, Ownable {
    mapping(address => bool) internal _complianceBound;

    modifier onlyCompliance() {
        require(_complianceBound[msg.sender], "NOT_COMPLIANCE");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function bindCompliance(address _compliance) external override {
        require(_compliance != address(0), "ZERO_COMPLIANCE");
        require(msg.sender == _compliance, "ONLY_COMPLIANCE");
        require(!_complianceBound[_compliance], "ALREADY_BOUND");
        _complianceBound[_compliance] = true;
        emit ComplianceBound(_compliance);
    }

    function unbindCompliance(address _compliance) external override {
        require(msg.sender == _compliance, "ONLY_COMPLIANCE");
        require(_complianceBound[_compliance], "NOT_BOUND");
        _complianceBound[_compliance] = false;
        emit ComplianceUnbound(_compliance);
    }

    function isComplianceBound(address _compliance) external view override returns (bool) {
        return _complianceBound[_compliance];
    }

    function moduleMintAction(address, uint256, address) external virtual override onlyCompliance {}
    function moduleBurnAction(address, uint256, address) external virtual override onlyCompliance {}
    function moduleTransferAction(address, address, uint256, address) external virtual override onlyCompliance {}
}
