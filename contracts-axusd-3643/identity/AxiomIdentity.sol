// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interfaces/IIdentity.sol";

contract AxiomIdentity is IIdentity, Initializable {
    uint256 public constant MANAGEMENT_KEY = 1;
    uint256 public constant ACTION_KEY = 2;
    uint256 public constant CLAIM_SIGNER_KEY = 3;
    uint256 public constant ECDSA_TYPE = 1;

    struct Key {
        uint256[] purposes;
        uint256 keyType;
        bytes32 key;
    }

    struct Claim {
        uint256 topic;
        uint256 scheme;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
    }

    mapping(bytes32 => Key) internal _keys;
    mapping(uint256 => bytes32[]) internal _keysByPurpose;
    mapping(bytes32 => Claim) internal _claims;
    mapping(uint256 => bytes32[]) internal _claimsByTopic;

    modifier onlyManager() {
        require(keyHasPurpose(keccak256(abi.encode(msg.sender)), MANAGEMENT_KEY), "NOT_MANAGEMENT_KEY");
        _;
    }

    modifier onlyClaimKey() {
        require(
            keyHasPurpose(keccak256(abi.encode(msg.sender)), CLAIM_SIGNER_KEY) ||
            keyHasPurpose(keccak256(abi.encode(msg.sender)), MANAGEMENT_KEY),
            "NOT_CLAIM_KEY"
        );
        _;
    }

    function initialize(address _initialManagementKey) external initializer {
        bytes32 managementKey = keccak256(abi.encode(_initialManagementKey));
        _keys[managementKey].key = managementKey;
        _keys[managementKey].purposes = new uint256[](1);
        _keys[managementKey].purposes[0] = MANAGEMENT_KEY;
        _keys[managementKey].keyType = ECDSA_TYPE;
        _keysByPurpose[MANAGEMENT_KEY].push(managementKey);
        emit KeyAdded(managementKey, MANAGEMENT_KEY, ECDSA_TYPE);
    }

    function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) external override onlyManager returns (bool) {
        if (_keys[_key].key == _key) {
            uint256[] memory purposes = _keys[_key].purposes;
            for (uint256 i = 0; i < purposes.length; i++) {
                if (purposes[i] == _purpose) revert("KEY_PURPOSE_EXISTS");
            }
            _keys[_key].purposes.push(_purpose);
        } else {
            _keys[_key].key = _key;
            _keys[_key].purposes = new uint256[](1);
            _keys[_key].purposes[0] = _purpose;
            _keys[_key].keyType = _keyType;
        }
        _keysByPurpose[_purpose].push(_key);
        emit KeyAdded(_key, _purpose, _keyType);
        return true;
    }

    function removeKey(bytes32 _key, uint256 _purpose) external override onlyManager returns (bool) {
        require(_keys[_key].key == _key, "KEY_NOT_FOUND");
        uint256[] storage purposes = _keys[_key].purposes;
        for (uint256 i = 0; i < purposes.length; i++) {
            if (purposes[i] == _purpose) {
                purposes[i] = purposes[purposes.length - 1];
                purposes.pop();
                break;
            }
        }
        bytes32[] storage keysByPurpose = _keysByPurpose[_purpose];
        for (uint256 i = 0; i < keysByPurpose.length; i++) {
            if (keysByPurpose[i] == _key) {
                keysByPurpose[i] = keysByPurpose[keysByPurpose.length - 1];
                keysByPurpose.pop();
                break;
            }
        }
        if (_keys[_key].purposes.length == 0) {
            delete _keys[_key];
        }
        emit KeyRemoved(_key, _purpose, ECDSA_TYPE);
        return true;
    }

    function getKey(bytes32 _key) external view override returns (uint256[] memory purposes, uint256 keyType, bytes32 key) {
        return (_keys[_key].purposes, _keys[_key].keyType, _keys[_key].key);
    }

    function getKeyPurposes(bytes32 _key) external view override returns (uint256[] memory _purposes) {
        return _keys[_key].purposes;
    }

    function getKeysByPurpose(uint256 _purpose) external view override returns (bytes32[] memory keys) {
        return _keysByPurpose[_purpose];
    }

    function keyHasPurpose(bytes32 _key, uint256 _purpose) public view override returns (bool) {
        if (_keys[_key].key == bytes32(0)) return false;
        uint256[] memory purposes = _keys[_key].purposes;
        for (uint256 i = 0; i < purposes.length; i++) {
            if (purposes[i] == _purpose) return true;
        }
        return false;
    }

    function addClaim(
        uint256 _topic,
        uint256 _scheme,
        address _issuer,
        bytes memory _signature,
        bytes memory _data,
        string memory _uri
    ) external override onlyClaimKey returns (bytes32 claimRequestId) {
        bytes32 claimId = keccak256(abi.encode(_issuer, _topic));
        if (_claims[claimId].issuer != address(0)) {
            _claims[claimId] = Claim(_topic, _scheme, _issuer, _signature, _data, _uri);
            emit ClaimChanged(claimId, _topic, _scheme, _issuer, _signature, _data, _uri);
        } else {
            _claims[claimId] = Claim(_topic, _scheme, _issuer, _signature, _data, _uri);
            _claimsByTopic[_topic].push(claimId);
            emit ClaimAdded(claimId, _topic, _scheme, _issuer, _signature, _data, _uri);
        }
        return claimId;
    }

    function removeClaim(bytes32 _claimId) external override onlyClaimKey returns (bool) {
        require(_claims[_claimId].issuer != address(0), "CLAIM_NOT_FOUND");
        uint256 topic = _claims[_claimId].topic;
        bytes32[] storage topicClaims = _claimsByTopic[topic];
        for (uint256 i = 0; i < topicClaims.length; i++) {
            if (topicClaims[i] == _claimId) {
                topicClaims[i] = topicClaims[topicClaims.length - 1];
                topicClaims.pop();
                break;
            }
        }
        emit ClaimRemoved(
            _claimId,
            _claims[_claimId].topic,
            _claims[_claimId].scheme,
            _claims[_claimId].issuer,
            _claims[_claimId].signature,
            _claims[_claimId].data,
            _claims[_claimId].uri
        );
        delete _claims[_claimId];
        return true;
    }

    function getClaim(bytes32 _claimId) external view override returns (
        uint256 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri
    ) {
        Claim memory c = _claims[_claimId];
        return (c.topic, c.scheme, c.issuer, c.signature, c.data, c.uri);
    }

    function getClaimIdsByTopic(uint256 _topic) external view override returns (bytes32[] memory claimIds) {
        return _claimsByTopic[_topic];
    }
}
