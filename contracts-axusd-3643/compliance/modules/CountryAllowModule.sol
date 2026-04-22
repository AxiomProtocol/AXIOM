// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./AbstractModule.sol";
import "../../interfaces/IModularCompliance.sol";
import "../../interfaces/IERC3643.sol";
import "../../interfaces/IIdentityRegistry.sol";

contract CountryAllowModule is AbstractModule {
    mapping(address => mapping(uint16 => bool)) internal _allowedCountries;

    event CountryAllowed(address indexed compliance, uint16 indexed country);
    event CountryDisallowed(address indexed compliance, uint16 indexed country);

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

    function batchAllowCountries(address _compliance, uint16[] calldata _countries) external onlyOwner {
        require(_complianceBound[_compliance], "COMPLIANCE_NOT_BOUND");
        for (uint256 i = 0; i < _countries.length; i++) {
            _allowedCountries[_compliance][_countries[i]] = true;
            emit CountryAllowed(_compliance, _countries[i]);
        }
    }

    function isCountryAllowed(address _compliance, uint16 _country) external view returns (bool) {
        return _allowedCountries[_compliance][_country];
    }

    function moduleCheck(address, address _to, uint256, address _compliance) external view override returns (bool) {
        if (_to == address(0)) return true;
        address tokenAddr = IModularCompliance(_compliance).getTokenBound();
        IIdentityRegistry registry = IERC3643(tokenAddr).identityRegistry();
        uint16 country = registry.investorCountry(_to);
        if (country == 0) return true;
        return _allowedCountries[_compliance][country];
    }

    function name() external pure override returns (string memory) {
        return "CountryAllowModule";
    }
}
