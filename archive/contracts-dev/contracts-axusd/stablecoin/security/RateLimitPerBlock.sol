// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract RateLimitPerBlock {
    struct BlockLimit {
        uint256 limit;
        uint256 used;
        uint256 lastBlock;
    }
    
    mapping(bytes32 => BlockLimit) private _blockLimits;
    
    error BlockLimitExceeded(bytes32 operation, uint256 limit, uint256 requested);
    
    function _setBlockLimit(bytes32 operation, uint256 limit) internal {
        _blockLimits[operation].limit = limit;
    }
    
    function _checkAndUseBlockLimit(bytes32 operation, uint256 amount) internal {
        BlockLimit storage bl = _blockLimits[operation];
        
        if (block.number > bl.lastBlock) {
            bl.used = 0;
            bl.lastBlock = block.number;
        }
        
        if (bl.used + amount > bl.limit) {
            revert BlockLimitExceeded(operation, bl.limit, amount);
        }
        
        bl.used += amount;
    }
    
    function getRemainingBlockLimit(bytes32 operation) external view returns (uint256) {
        BlockLimit storage bl = _blockLimits[operation];
        
        if (block.number > bl.lastBlock) {
            return bl.limit;
        }
        
        return bl.limit > bl.used ? bl.limit - bl.used : 0;
    }
    
    function getBlockLimitInfo(bytes32 operation) external view returns (
        uint256 limit,
        uint256 used,
        uint256 remaining
    ) {
        BlockLimit storage bl = _blockLimits[operation];
        limit = bl.limit;
        
        if (block.number > bl.lastBlock) {
            used = 0;
            remaining = limit;
        } else {
            used = bl.used;
            remaining = limit > used ? limit - used : 0;
        }
    }
}
