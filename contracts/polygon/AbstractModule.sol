// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IModule.sol";

/**
 * @dev Base module for Axiom compliance modules — Polygon PoS deployment.
 *
 * - isPlugAndPlay() returns true  → MC's addModule() skips canComplianceBind().
 * - canComplianceBind()           → provided for completeness; always true here.
 * - moduleTransferAction / moduleMintAction / moduleBurnAction have no compliance
 *   param; concrete overrides read msg.sender as the compliance address.
 */
abstract contract AbstractModule is IModule, Ownable {
    mapping(address => bool) internal _complianceBound;

    event ComplianceBound(address indexed compliance);
    event ComplianceUnbound(address indexed compliance);

    constructor() Ownable(msg.sender) {}

    function bindCompliance(address _compliance) external override {
        require(_compliance != address(0), "ZERO_COMPLIANCE");
        require(!_complianceBound[_compliance], "ALREADY_BOUND");
        _complianceBound[_compliance] = true;
        emit ComplianceBound(_compliance);
    }

    function unbindCompliance(address _compliance) external override {
        require(_complianceBound[_compliance], "NOT_BOUND");
        _complianceBound[_compliance] = false;
        emit ComplianceUnbound(_compliance);
    }

    function isComplianceBound(address _compliance) external view override returns (bool) {
        return _complianceBound[_compliance];
    }

    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }

    function canComplianceBind(address) external pure override returns (bool) {
        return true;
    }

    function moduleTransferAction(address, address, uint256) external virtual override {}
    function moduleMintAction(address, uint256) external virtual override {}
    function moduleBurnAction(address, uint256) external virtual override {}
}
