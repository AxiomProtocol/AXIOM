// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

/**
 * @dev Module interface aligned with @tokenysolutions/t-rex IModule (ERC-3643).
 *
 * Key differences from a naive implementation:
 *  - moduleTransferAction / moduleMintAction / moduleBurnAction receive NO
 *    compliance parameter — msg.sender IS the compliance, so modules read it
 *    from msg.sender when they need to key per-compliance state.
 *  - isPlugAndPlay()      — return true to skip canComplianceBind() check.
 *  - canComplianceBind()  — called by MC when isPlugAndPlay() is false.
 */
interface IModule {
    function moduleCheck(
        address _from,
        address _to,
        uint256 _value,
        address _compliance
    ) external view returns (bool);

    function moduleTransferAction(address _from, address _to, uint256 _value) external;
    function moduleMintAction(address _to, uint256 _value) external;
    function moduleBurnAction(address _from, uint256 _value) external;

    function bindCompliance(address _compliance) external;
    function unbindCompliance(address _compliance) external;
    function isComplianceBound(address _compliance) external view returns (bool);

    function isPlugAndPlay() external pure returns (bool);
    function canComplianceBind(address _compliance) external view returns (bool);

    function name() external pure returns (string memory);
}
