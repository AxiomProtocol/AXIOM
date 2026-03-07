// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./IIdentity.sol";

interface IClaimIssuer {
    event ClaimRevoked(bytes signature);

    function revokeClaim(bytes32 _claimId, address _identity) external returns (bool);
    function revokeClaimBySignature(bytes calldata signature) external;
    function isClaimRevoked(bytes memory _sig) external view returns (bool);
    function isClaimValid(IIdentity _identity, uint256 claimTopic, bytes memory sig, bytes memory data) external view returns (bool);
}
