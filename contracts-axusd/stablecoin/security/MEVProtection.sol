// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract MEVProtection {
    uint256 public constant MIN_DELAY_BLOCKS = 1;
    
    mapping(bytes32 => uint256) private _commitments;
    
    event CommitmentMade(bytes32 indexed commitHash, address indexed user);
    event CommitmentRevealed(bytes32 indexed commitHash);
    
    error CommitmentNotFound();
    error CommitmentTooRecent();
    error InvalidCommitment();
    
    function _commit(bytes32 commitHash) internal {
        _commitments[commitHash] = block.number;
        emit CommitmentMade(commitHash, msg.sender);
    }
    
    function _reveal(bytes32 commitHash) internal {
        uint256 commitBlock = _commitments[commitHash];
        if (commitBlock == 0) revert CommitmentNotFound();
        if (block.number <= commitBlock + MIN_DELAY_BLOCKS) revert CommitmentTooRecent();
        delete _commitments[commitHash];
        emit CommitmentRevealed(commitHash);
    }
    
    function _makeCommitHash(
        address user,
        bytes32 action,
        uint256 amount,
        bytes32 salt
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, action, amount, salt));
    }
    
    function getCommitmentBlock(bytes32 commitHash) external view returns (uint256) {
        return _commitments[commitHash];
    }
}
