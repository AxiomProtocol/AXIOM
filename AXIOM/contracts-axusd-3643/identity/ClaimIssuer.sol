// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../interfaces/IClaimIssuer.sol";
import "../interfaces/IIdentity.sol";

contract ClaimIssuer is IClaimIssuer, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    mapping(bytes => bool) public revokedClaims;

    uint256 public constant KYC_VERIFIED = 1;
    uint256 public constant ACCREDITED_INVESTOR = 2;
    uint256 public constant SANCTIONS_CLEAR = 3;

    constructor() Ownable(msg.sender) {}

    function revokeClaim(bytes32 _claimId, address _identity) external override onlyOwner returns (bool) {
        (uint256 topic, , address issuer, bytes memory sig, bytes memory data, ) = IIdentity(_identity).getClaim(_claimId);
        require(issuer == address(this), "NOT_OUR_CLAIM");
        require(topic > 0, "CLAIM_NOT_FOUND");
        revokedClaims[sig] = true;
        emit ClaimRevoked(sig);
        (data);
        return true;
    }

    function revokeClaimBySignature(bytes calldata signature) external override onlyOwner {
        require(!revokedClaims[signature], "ALREADY_REVOKED");
        revokedClaims[signature] = true;
        emit ClaimRevoked(signature);
    }

    function isClaimRevoked(bytes memory _sig) public view override returns (bool) {
        return revokedClaims[_sig];
    }

    function isClaimValid(
        IIdentity _identity,
        uint256 claimTopic,
        bytes memory sig,
        bytes memory data
    ) external view override returns (bool) {
        if (revokedClaims[sig]) return false;

        bytes32 dataHash = keccak256(abi.encode(address(_identity), claimTopic, data));
        bytes32 ethSignedHash = dataHash.toEthSignedMessageHash();

        address recovered = ethSignedHash.recover(sig);

        return recovered == owner();
    }

    function getClaimDataHash(
        address _identity,
        uint256 _topic,
        bytes memory _data
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(_identity, _topic, _data));
    }
}
