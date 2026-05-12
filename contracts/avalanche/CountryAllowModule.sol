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
 * @notice ERC-3643 compliance module that restricts transfers to receivers
 *         whose investor country is on the per-compliance allowlist.
 *
 * Two modes:
 *   - allowAll (testnet default): all countries permitted for the compliance address.
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

    // ─── Admin setters ────────────────────────────────────────────────────────

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

    // ─── View helpers ─────────────────────────────────────────────────────────

    function isCountryAllowed(address _compliance, uint16 _country) external view returns (bool) {
        if (_allowAll[_compliance]) return true;
        return _allowedCountries[_compliance][_country];
    }

    // ─── Core compliance check ────────────────────────────────────────────────

    /**
     * @notice Returns true if the transfer is allowed under this module.
     *
     * Logic:
     *   1. Burns (to == address(0)) are always permitted.
     *   2. If allowAll is active for this compliance, permit.
     *   3. Resolve the bound token, then its IdentityRegistry.
     *   4. Look up the receiver's investor country from the IdentityRegistry.
     *   5. Permit only if that country code is in the allowlist.
     *
     * Reverts are deliberately avoided — moduleCheck must be pure view.
     * If the token or registry is not yet wired, fall back to deny.
     */
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
