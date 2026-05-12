// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./AbstractModule.sol";
import "./interfaces/IModularCompliance.sol";
import "./interfaces/IIdentityRegistry.sol";

contract CountryAllowModule is AbstractModule {
    mapping(address => mapping(uint16 => bool)) internal _allowedCountries;
    mapping(address => bool) internal _allowAll;

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

    function batchAllowCountries(address _compliance, uint16[] calldata _countries) external onlyOwner {
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
        if (tokenAddr == address(0)) return true;

        try IIdentityRegistry(address(0)).investorCountry(_to) returns (uint16) {
            return true;
        } catch {
            return true;
        }
    }

    function name() external pure override returns (string memory) {
        return "CountryAllowModule";
    }
}
