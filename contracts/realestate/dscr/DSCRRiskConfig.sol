// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IDSCRInterfaces.sol";

contract DSCRRiskConfig is AccessControl, IDSCRRiskConfig {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");

    uint256 public constant MAX_LTV_CAP = 8000;
    uint256 public constant MIN_DSCR_FLOOR = 10000;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_TERM_MONTHS = 360;

    mapping(uint256 => DSCRProductRisk) private _productRisks;
    uint256[] public productIds;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(RISK_MANAGER_ROLE, msg.sender);
    }

    function setDSCRProductRisk(
        uint256 productId,
        DSCRProductRisk calldata config
    ) external override onlyRole(RISK_MANAGER_ROLE) {
        require(config.maxLtvBps > 0 && config.maxLtvBps <= MAX_LTV_CAP, "DSCRRiskConfig: invalid LTV");
        require(config.minDscrBps >= MIN_DSCR_FLOOR, "DSCRRiskConfig: DSCR too low");
        require(config.termMonths > 0 && config.termMonths <= MAX_TERM_MONTHS, "DSCRRiskConfig: invalid term");
        require(config.maxLoanSize > config.minLoanSize, "DSCRRiskConfig: invalid loan size range");
        require(config.interestRateBps > 0 && config.interestRateBps <= 2000, "DSCRRiskConfig: invalid interest rate");
        require(config.originationFeeBps <= 500, "DSCRRiskConfig: origination fee too high");
        require(
            config.insuranceReserveBps + config.protocolFeeBps <= BASIS_POINTS,
            "DSCRRiskConfig: fee split exceeds 100%"
        );

        bool isNew = _productRisks[productId].productId == 0;
        _productRisks[productId] = config;
        _productRisks[productId].productId = productId;

        if (isNew) {
            productIds.push(productId);
        }

        emit DSCRProductRiskUpdated(
            productId,
            config.maxLtvBps,
            config.minDscrBps,
            config.interestRateBps,
            config.termMonths
        );
    }

    function getDSCRProductRisk(uint256 productId) external view override returns (DSCRProductRisk memory) {
        require(_productRisks[productId].productId != 0, "DSCRRiskConfig: product not found");
        return _productRisks[productId];
    }

    function isDSCRProductActive(uint256 productId) external view override returns (bool) {
        return _productRisks[productId].active;
    }

    function deactivateProduct(uint256 productId) external onlyRole(ADMIN_ROLE) {
        require(_productRisks[productId].productId != 0, "DSCRRiskConfig: product not found");
        _productRisks[productId].active = false;
        emit DSCRProductRiskUpdated(productId, 0, 0, 0, 0);
    }

    function activateProduct(uint256 productId) external onlyRole(ADMIN_ROLE) {
        require(_productRisks[productId].productId != 0, "DSCRRiskConfig: product not found");
        _productRisks[productId].active = true;
        emit DSCRProductRiskUpdated(
            productId,
            _productRisks[productId].maxLtvBps,
            _productRisks[productId].minDscrBps,
            _productRisks[productId].interestRateBps,
            _productRisks[productId].termMonths
        );
    }

    function getProductCount() external view returns (uint256) {
        return productIds.length;
    }

    function getAllProductIds() external view returns (uint256[] memory) {
        return productIds;
    }
}
