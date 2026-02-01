// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Interfaces.sol";

contract RiskConfig is AccessControl, IRiskConfig {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");

    uint256 public constant MAX_LTV_CAP = 9000;
    uint256 public constant MAX_TERM_CAP = 365;
    uint256 public constant BASIS_POINTS = 10000;

    mapping(uint256 => ProductRisk) private _productRisks;
    uint256[] public productIds;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(RISK_MANAGER_ROLE, msg.sender);
    }

    function setProductRisk(
        uint256 productId,
        ProductRisk calldata config
    ) external override onlyRole(RISK_MANAGER_ROLE) {
        require(config.maxLtvBps > 0 && config.maxLtvBps <= MAX_LTV_CAP, "RiskConfig: invalid LTV");
        require(config.maxTermDays > 0 && config.maxTermDays <= MAX_TERM_CAP, "RiskConfig: invalid term");
        require(config.maxLoanSize > config.minLoanSize, "RiskConfig: invalid loan size range");
        require(config.interestRateBps > 0, "RiskConfig: zero interest rate");
        require(
            config.insuranceReserveBps + config.protocolFeeBps <= BASIS_POINTS,
            "RiskConfig: fee split exceeds 100%"
        );

        bool isNew = _productRisks[productId].productId == 0;
        _productRisks[productId] = config;
        _productRisks[productId].productId = productId;

        if (isNew) {
            productIds.push(productId);
        }

        emit ProductRiskUpdated(
            productId,
            config.maxLtvBps,
            config.maxTermDays,
            config.maxLoanSize
        );
    }

    function getProductRisk(uint256 productId) external view override returns (ProductRisk memory) {
        require(_productRisks[productId].productId != 0, "RiskConfig: product not found");
        return _productRisks[productId];
    }

    function isProductActive(uint256 productId) external view override returns (bool) {
        return _productRisks[productId].active;
    }

    function deactivateProduct(uint256 productId) external onlyRole(ADMIN_ROLE) {
        require(_productRisks[productId].productId != 0, "RiskConfig: product not found");
        _productRisks[productId].active = false;
        emit ProductRiskUpdated(productId, 0, 0, 0);
    }

    function activateProduct(uint256 productId) external onlyRole(ADMIN_ROLE) {
        require(_productRisks[productId].productId != 0, "RiskConfig: product not found");
        _productRisks[productId].active = true;
        emit ProductRiskUpdated(
            productId,
            _productRisks[productId].maxLtvBps,
            _productRisks[productId].maxTermDays,
            _productRisks[productId].maxLoanSize
        );
    }

    function getProductCount() external view returns (uint256) {
        return productIds.length;
    }

    function getAllProductIds() external view returns (uint256[] memory) {
        return productIds;
    }
}
