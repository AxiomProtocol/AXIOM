// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract FlashLoanGuard {
    mapping(address => uint256) private _lastActionBlock;
    
    error SameBlockAction();
    
    modifier noFlashLoan() {
        if (_lastActionBlock[msg.sender] == block.number) {
            revert SameBlockAction();
        }
        _lastActionBlock[msg.sender] = block.number;
        _;
    }
    
    modifier noFlashLoanFor(address account) {
        if (_lastActionBlock[account] == block.number) {
            revert SameBlockAction();
        }
        _lastActionBlock[account] = block.number;
        _;
    }
    
    function _recordAction(address account) internal {
        _lastActionBlock[account] = block.number;
    }
    
    function _checkNoFlashLoan(address account) internal view {
        if (_lastActionBlock[account] == block.number) {
            revert SameBlockAction();
        }
    }
}
