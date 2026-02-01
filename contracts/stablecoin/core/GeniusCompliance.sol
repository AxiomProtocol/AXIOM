// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GeniusCompliance
 * @notice GENIUS Act compliance module for AXUSD stablecoin
 * @dev Enforces reserve requirements per the Guiding and Establishing National 
 *      Innovation for U.S. Stablecoins Act (signed July 18, 2025)
 * 
 * Key Requirements:
 * - 100% reserve backing with eligible assets
 * - Eligible assets: USD, short-term US Treasuries, USDC
 * - No interest/yield distribution to stablecoin holders
 * - Monthly public disclosures of reserve composition
 */
contract GeniusCompliance is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    
    // Collateral classification
    enum CollateralType {
        NOT_APPROVED,      // Not eligible for GENIUS compliance
        STABLECOIN,        // USDC, USDT (approved stablecoins)
        TREASURY,          // Tokenized T-Bills (Ondo, Backed, etc.)
        BANK_DEPOSIT       // Tokenized bank deposits
    }
    
    // Approved collateral assets
    mapping(address => CollateralType) public approvedCollateral;
    mapping(address => string) public collateralNames;
    address[] public approvedCollateralList;
    
    // Reserve disclosure tracking
    struct ReserveDisclosure {
        uint256 timestamp;
        uint256 totalAXUSDSupply;
        uint256 usdcReserves;
        uint256 tbillReserves;
        uint256 otherReserves;
        uint256 totalReserves;
        uint256 reserveRatio; // In basis points (10000 = 100%)
        string ipfsHash; // Full attestation document
    }
    
    ReserveDisclosure[] public disclosures;
    uint256 public lastDisclosureTimestamp;
    uint256 public constant DISCLOSURE_INTERVAL = 30 days;
    
    // Yield distribution prevention
    bool public yieldDistributionBlocked;
    
    event CollateralApproved(address indexed token, CollateralType collateralType, string name);
    event CollateralRevoked(address indexed token);
    event DisclosurePublished(uint256 indexed index, uint256 reserveRatio, string ipfsHash);
    event YieldDistributionBlocked(bool blocked);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ADMIN, msg.sender);
        yieldDistributionBlocked = true; // GENIUS Act prohibits yield on stablecoins
    }
    
    /**
     * @notice Add an approved collateral asset
     * @param token The collateral token address
     * @param collateralType The type of collateral (stablecoin, treasury, bank deposit)
     * @param name Human-readable name for disclosures
     */
    function approveCollateral(
        address token,
        CollateralType collateralType,
        string calldata name
    ) external onlyRole(COMPLIANCE_ADMIN) {
        require(token != address(0), "GeniusCompliance: zero address");
        require(collateralType != CollateralType.NOT_APPROVED, "GeniusCompliance: invalid type");
        
        if (approvedCollateral[token] == CollateralType.NOT_APPROVED) {
            approvedCollateralList.push(token);
        }
        
        approvedCollateral[token] = collateralType;
        collateralNames[token] = name;
        
        emit CollateralApproved(token, collateralType, name);
    }
    
    /**
     * @notice Revoke approval for a collateral asset
     * @param token The collateral token to revoke
     */
    function revokeCollateral(address token) external onlyRole(COMPLIANCE_ADMIN) {
        require(approvedCollateral[token] != CollateralType.NOT_APPROVED, "GeniusCompliance: not approved");
        
        approvedCollateral[token] = CollateralType.NOT_APPROVED;
        delete collateralNames[token];
        
        emit CollateralRevoked(token);
    }
    
    /**
     * @notice Check if a collateral asset is GENIUS-compliant
     * @param token The collateral token to check
     * @return bool True if the collateral is approved
     */
    function isApprovedCollateral(address token) external view returns (bool) {
        return approvedCollateral[token] != CollateralType.NOT_APPROVED;
    }
    
    /**
     * @notice Get collateral type for an asset
     * @param token The collateral token
     * @return CollateralType The classification of the collateral
     */
    function getCollateralType(address token) external view returns (CollateralType) {
        return approvedCollateral[token];
    }
    
    /**
     * @notice Publish monthly reserve disclosure (required by GENIUS Act)
     * @param totalAXUSDSupply Total AXUSD tokens in circulation
     * @param usdcReserves USDC reserves in PSM
     * @param tbillReserves Value of T-Bill holdings
     * @param otherReserves Other approved reserves
     * @param ipfsHash IPFS hash of full attestation document
     */
    function publishDisclosure(
        uint256 totalAXUSDSupply,
        uint256 usdcReserves,
        uint256 tbillReserves,
        uint256 otherReserves,
        string calldata ipfsHash
    ) external onlyRole(COMPLIANCE_ADMIN) {
        uint256 totalReserves = usdcReserves + tbillReserves + otherReserves;
        uint256 reserveRatio = totalAXUSDSupply > 0 
            ? (totalReserves * 10000) / totalAXUSDSupply 
            : 0;
        
        disclosures.push(ReserveDisclosure({
            timestamp: block.timestamp,
            totalAXUSDSupply: totalAXUSDSupply,
            usdcReserves: usdcReserves,
            tbillReserves: tbillReserves,
            otherReserves: otherReserves,
            totalReserves: totalReserves,
            reserveRatio: reserveRatio,
            ipfsHash: ipfsHash
        }));
        
        lastDisclosureTimestamp = block.timestamp;
        
        emit DisclosurePublished(disclosures.length - 1, reserveRatio, ipfsHash);
    }
    
    /**
     * @notice Check if monthly disclosure is due
     * @return bool True if disclosure is overdue
     */
    function isDisclosureDue() external view returns (bool) {
        return block.timestamp >= lastDisclosureTimestamp + DISCLOSURE_INTERVAL;
    }
    
    /**
     * @notice Get the latest reserve disclosure
     * @return ReserveDisclosure The most recent disclosure
     */
    function getLatestDisclosure() external view returns (ReserveDisclosure memory) {
        require(disclosures.length > 0, "GeniusCompliance: no disclosures");
        return disclosures[disclosures.length - 1];
    }
    
    /**
     * @notice Get total number of disclosures
     * @return uint256 Number of published disclosures
     */
    function getDisclosureCount() external view returns (uint256) {
        return disclosures.length;
    }
    
    /**
     * @notice Toggle yield distribution blocking (GENIUS Act requires blocking to AXUSD holders)
     * @dev Note: Yield can still go to protocol treasury/insurance, just not token holders
     * @param blocked True to block yield distribution
     */
    function setYieldDistributionBlocked(bool blocked) external onlyRole(COMPLIANCE_ADMIN) {
        yieldDistributionBlocked = blocked;
        emit YieldDistributionBlocked(blocked);
    }
    
    /**
     * @notice Check if yield distribution is blocked (GENIUS Act requirement)
     * @return bool True if yield cannot be distributed to holders
     */
    function isYieldBlocked() external view returns (bool) {
        return yieldDistributionBlocked;
    }
    
    /**
     * @notice Get all approved collateral addresses
     * @return address[] Array of approved collateral tokens
     */
    function getApprovedCollateralList() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < approvedCollateralList.length; i++) {
            if (approvedCollateral[approvedCollateralList[i]] != CollateralType.NOT_APPROVED) {
                count++;
            }
        }
        
        address[] memory result = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < approvedCollateralList.length; i++) {
            if (approvedCollateral[approvedCollateralList[i]] != CollateralType.NOT_APPROVED) {
                result[index] = approvedCollateralList[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Get compliance status summary
     * @return isCompliant Whether system meets GENIUS requirements
     * @return reserveRatio Current reserve ratio (basis points)
     * @return disclosureUpToDate Whether monthly disclosure is current
     * @return yieldBlocked Whether yield distribution is blocked
     */
    function getComplianceStatus() external view returns (
        bool isCompliant,
        uint256 reserveRatio,
        bool disclosureUpToDate,
        bool yieldBlocked
    ) {
        disclosureUpToDate = block.timestamp < lastDisclosureTimestamp + DISCLOSURE_INTERVAL;
        yieldBlocked = yieldDistributionBlocked;
        
        if (disclosures.length > 0) {
            reserveRatio = disclosures[disclosures.length - 1].reserveRatio;
        }
        
        // Compliant if: 100%+ reserves, disclosure current, yield blocked
        isCompliant = reserveRatio >= 10000 && disclosureUpToDate && yieldBlocked;
    }
}
