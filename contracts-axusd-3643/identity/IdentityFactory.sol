// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AxiomIdentity.sol";

contract IdentityFactory is Ownable, ReentrancyGuard {
    using Clones for address;

    address public identityImplementation;

    mapping(address => address) public walletToIdentity;
    mapping(address => bool) public isDeployer;
    address[] public deployedIdentities;

    event IdentityCreated(address indexed wallet, address indexed identity);
    event DeployerUpdated(address indexed deployer, bool authorized);
    event ImplementationUpdated(address indexed oldImpl, address indexed newImpl);

    modifier onlyDeployer() {
        require(isDeployer[msg.sender] || msg.sender == owner(), "NOT_AUTHORIZED_DEPLOYER");
        _;
    }

    constructor(address _implementation) Ownable(msg.sender) {
        require(_implementation != address(0), "ZERO_IMPLEMENTATION");
        identityImplementation = _implementation;
    }

    function createIdentity(address _wallet, address _managementKey) external onlyDeployer nonReentrant returns (address) {
        require(_wallet != address(0), "ZERO_WALLET");
        require(walletToIdentity[_wallet] == address(0), "IDENTITY_EXISTS");

        address identity = identityImplementation.clone();
        AxiomIdentity(identity).initialize(_managementKey);

        walletToIdentity[_wallet] = identity;
        deployedIdentities.push(identity);

        emit IdentityCreated(_wallet, identity);
        return identity;
    }

    function setDeployer(address _deployer, bool _authorized) external onlyOwner {
        isDeployer[_deployer] = _authorized;
        emit DeployerUpdated(_deployer, _authorized);
    }

    function setImplementation(address _implementation) external onlyOwner {
        require(_implementation != address(0), "ZERO_IMPLEMENTATION");
        address old = identityImplementation;
        identityImplementation = _implementation;
        emit ImplementationUpdated(old, _implementation);
    }

    function getDeployedCount() external view returns (uint256) {
        return deployedIdentities.length;
    }

    function getIdentity(address _wallet) external view returns (address) {
        return walletToIdentity[_wallet];
    }
}
