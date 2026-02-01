// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Interfaces.sol";

contract ProductRegistry is AccessControl, IProductRegistry {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    mapping(uint256 => address) private _managers;
    uint256[] private _productIds;

    event ProductDeregistered(uint256 indexed productId);
    event ProductManagerUpdated(uint256 indexed productId, address indexed oldManager, address indexed newManager);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function registerProduct(
        uint256 productId,
        address manager
    ) external override onlyRole(ADMIN_ROLE) {
        require(manager != address(0), "ProductRegistry: invalid manager");
        require(!isRegistered(productId), "ProductRegistry: already registered");

        _managers[productId] = manager;
        _productIds.push(productId);

        emit ProductRegistered(productId, manager);
    }

    function updateManager(
        uint256 productId,
        address newManager
    ) external onlyRole(ADMIN_ROLE) {
        require(newManager != address(0), "ProductRegistry: invalid manager");
        require(isRegistered(productId), "ProductRegistry: not registered");

        address old = _managers[productId];
        _managers[productId] = newManager;

        emit ProductManagerUpdated(productId, old, newManager);
    }

    function deregisterProduct(uint256 productId) external onlyRole(ADMIN_ROLE) {
        require(isRegistered(productId), "ProductRegistry: not registered");

        delete _managers[productId];

        for (uint256 i = 0; i < _productIds.length; i++) {
            if (_productIds[i] == productId) {
                _productIds[i] = _productIds[_productIds.length - 1];
                _productIds.pop();
                break;
            }
        }

        emit ProductDeregistered(productId);
    }

    function getManager(uint256 productId) external view override returns (address) {
        return _managers[productId];
    }

    function isRegistered(uint256 productId) public view override returns (bool) {
        return _managers[productId] != address(0);
    }

    function getAllProducts() external view returns (uint256[] memory) {
        return _productIds;
    }

    function getProductCount() external view returns (uint256) {
        return _productIds.length;
    }

    function getProductInfo(uint256 productId) external view returns (
        address manager,
        bool registered,
        bool active
    ) {
        manager = _managers[productId];
        registered = manager != address(0);

        if (registered) {
            try IProductManager(manager).isActive() returns (bool _active) {
                active = _active;
            } catch {
                active = false;
            }
        }
    }
}
