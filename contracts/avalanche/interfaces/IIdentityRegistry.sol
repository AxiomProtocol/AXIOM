// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

interface IIdentityRegistry {
    event IdentityRegistered(address indexed userAddress, address indexed identity);
    event IdentityRemoved(address indexed userAddress);
    event IdentityUpdated(address indexed userAddress, address indexed newIdentity);
    event CountryUpdated(address indexed userAddress, uint16 indexed country);
    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);

    function registerIdentity(address _userAddress, address _identity, uint16 _country) external;
    function deleteIdentity(address _userAddress) external;
    function updateIdentity(address _userAddress, address _identity) external;
    function updateCountry(address _userAddress, uint16 _country) external;
    function isVerified(address _userAddress) external view returns (bool);
    function contains(address _userAddress) external view returns (bool);
    function investorCountry(address _userAddress) external view returns (uint16);
    function identity(address _userAddress) external view returns (address);
    function addAgent(address _agent) external;
    function removeAgent(address _agent) external;
    function isAgent(address _agent) external view returns (bool);
}
