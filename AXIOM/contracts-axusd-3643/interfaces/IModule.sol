// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

interface IModule {
    event ComplianceBound(address indexed compliance);
    event ComplianceUnbound(address indexed compliance);

    function bindCompliance(address _compliance) external;
    function unbindCompliance(address _compliance) external;
    function isComplianceBound(address _compliance) external view returns (bool);
    function moduleCheck(address _from, address _to, uint256 _value, address _compliance) external view returns (bool);
    function moduleMintAction(address _to, uint256 _value, address _compliance) external;
    function moduleBurnAction(address _from, uint256 _value, address _compliance) external;
    function moduleTransferAction(address _from, address _to, uint256 _value, address _compliance) external;
    function name() external pure returns (string memory);
}
