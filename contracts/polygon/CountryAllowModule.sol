// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./AbstractModule.sol";
import "./interfaces/IModularCompliance.sol";
import "./interfaces/IIdentityRegistry.sol";

/**
 * @dev Minimal token interface used to retrieve the IdentityRegistry address
 *      from a bound ERC-3643 token without importing the full token contract.
 */
interface ITokenRegistryProvider {
    function identityRegistry() external view returns (IIdentityRegistry);
}

/**
 * @title CountryAllowModule
 * @notice ERC-3643 compliance module — Polygon PoS deployment.
 *
 * Restricts transfers to receivers whose investor country is on the
 * per-compliance allowlist.
 *
 * Two modes:
 *   - allowAll (testnet / open-access launch): all countries permitted.
 *   - per-country allowlist: only receivers whose country code appears in
 *     _allowedCountries[compliance] may receive transfers.
 *
 * Country codes are uint16 values returned by IIdentityRegistry.investorCountry().
 * Code 0 means "unset" — treated as not allowed unless allowAll is active.
 */
contract CountryAllowModule is AbstractModule {
    mapping(address => mapping(uint16 => bool)) internal _allowedCountries;
    mapping(address => bool)                    internal _allowAll;

    event CountryAllowed(address indexed compliance, uint16 indexed country);
    event CountryDisallowed(address indexed compliance, uint16 indexed country);
    event AllowAllSet(address indexed compliance, bool allowAll);

    function setAllowAll(address _compliance, bool _allow) external onlyOwner {
        _allowAll[_compliance] = _allow;
        emit AllowAllSet(_compliance, _allow);
    }

    function addAllowedCountry(address _compliance, uint16 _country) external onlyOwner {
        require(_complianceBound[_compliance], "COMPLIANCE_NOT_BOUND");
        _allowedCountries[_compliance][_country] = true;
        emit CountryAllowed(_compliance, _country);
    }

    function removeAllowedCountry(address _compliance, uint16 _country) external onlyOwner {
        require(_complianceBound[_compliance], "COMPLIANCE_NOT_BOUND");
        _allowedCountries[_compliance][_country] = false;
        emit CountryDisallowed(_compliance, _country);
    }

    function batchAllowCountries(
        address _compliance,
        uint16[] calldata _countries
    ) external onlyOwner {
        require(_complianceBound[_compliance], "COMPLIANCE_NOT_BOUND");
        for (uint256 i = 0; i < _countries.length; i++) {
            _allowedCountries[_compliance][_countries[i]] = true;
            emit CountryAllowed(_compliance, _countries[i]);
        }
    }

    function isCountryAllowed(address _compliance, uint16 _country) external view returns (bool) {
        if (_allowAll[_compliance]) return true;
        return _allowedCountries[_compliance][_country];
    }

    function moduleCheck(
        address,
        address _to,
        uint256,
        address _compliance
    ) external view override returns (bool) {
        if (_to == address(0)) return true;
        if (_allowAll[_compliance]) return true;

        address tokenAddr = IModularCompliance(_compliance).getTokenBound();
        if (tokenAddr == address(0)) return false;

        IIdentityRegistry ir = ITokenRegistryProvider(tokenAddr).identityRegistry();
        if (address(ir) == address(0)) return false;

        uint16 country = ir.investorCountry(_to);
        return _allowedCountries[_compliance][country];
    }

    function name() external pure override returns (string memory) {
        return "CountryAllowModule";
    }
}
