// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

interface IModularCompliance {
    event TokenBound(address indexed token);
    event TokenUnbound(address indexed token);
    event ModuleAdded(address indexed module);
    event ModuleRemoved(address indexed module);

    function bindToken(address _token) external;
    function unbindToken(address _token) external;
    function addModule(address _module) external;
    function removeModule(address _module) external;
    function getModules() external view returns (address[] memory);
    function isModuleBound(address _module) external view returns (bool);
    function canTransfer(address _from, address _to, uint256 _value) external view returns (bool);
    function transferred(address _from, address _to, uint256 _value) external;
    function created(address _to, uint256 _value) external;
    function destroyed(address _from, uint256 _value) external;
    function getTokenBound() external view returns (address);
}
