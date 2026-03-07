// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./IIdentityRegistry.sol";
import "./IModularCompliance.sol";
import "./IIdentity.sol";

interface IERC3643 {
    event UpdatedTokenInformation(string indexed newName, string indexed newSymbol, uint8 newDecimals, string newVersion, address indexed newOnchainID);
    event IdentityRegistryAdded(address indexed identityRegistry);
    event ComplianceAdded(address indexed compliance);
    event RecoverySuccess(address indexed lostWallet, address indexed newWallet, address indexed investorOnchainID);
    event AddressFrozen(address indexed addr, bool indexed isFrozen, address indexed owner);
    event TokensFrozen(address indexed addr, uint256 amount);
    event TokensUnfrozen(address indexed addr, uint256 amount);
    event TokenPaused(address indexed addr);
    event TokenUnpaused(address indexed addr);

    function setName(string calldata _name) external;
    function setSymbol(string calldata _symbol) external;
    function setOnchainID(address _onchainID) external;
    function pause() external;
    function unpause() external;
    function setIdentityRegistry(address _identityRegistry) external;
    function setCompliance(address _compliance) external;

    function forcedTransfer(address _from, address _to, uint256 _amount) external returns (bool);
    function mint(address _to, uint256 _amount) external;
    function burn(address _userAddress, uint256 _amount) external;
    function recoveryAddress(address _lostWallet, address _newWallet, address _investorOnchainID) external returns (bool);

    function freezeAddress(address _userAddress, bool _freeze) external;
    function batchFreezeAddress(address[] calldata _userAddresses, bool[] calldata _freeze) external;
    function freezePartialTokens(address _userAddress, uint256 _amount) external;
    function unfreezePartialTokens(address _userAddress, uint256 _amount) external;

    function identityRegistry() external view returns (IIdentityRegistry);
    function compliance() external view returns (IModularCompliance);
    function onchainID() external view returns (address);
    function isFrozen(address _userAddress) external view returns (bool);
    function getFrozenTokens(address _userAddress) external view returns (uint256);
}
