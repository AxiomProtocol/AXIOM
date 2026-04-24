// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

interface IIdentity {
    event ClaimAdded(bytes32 indexed claimId, uint256 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri);
    event ClaimRemoved(bytes32 indexed claimId, uint256 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri);
    event ClaimChanged(bytes32 indexed claimId, uint256 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri);
    event KeyAdded(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);
    event KeyRemoved(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);

    function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) external returns (bool);
    function removeKey(bytes32 _key, uint256 _purpose) external returns (bool);
    function getKey(bytes32 _key) external view returns (uint256[] memory purposes, uint256 keyType, bytes32 key);
    function getKeyPurposes(bytes32 _key) external view returns (uint256[] memory _purposes);
    function getKeysByPurpose(uint256 _purpose) external view returns (bytes32[] memory keys);
    function keyHasPurpose(bytes32 _key, uint256 _purpose) external view returns (bool);

    function addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes memory _signature, bytes memory _data, string memory _uri) external returns (bytes32 claimRequestId);
    function removeClaim(bytes32 _claimId) external returns (bool);
    function getClaim(bytes32 _claimId) external view returns (uint256 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri);
    function getClaimIdsByTopic(uint256 _topic) external view returns (bytes32[] memory claimIds);
}
