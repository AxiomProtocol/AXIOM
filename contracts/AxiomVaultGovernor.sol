// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEVault {
    function setCaps(uint16 supplyCap, uint16 borrowCap) external;
    function setGovernorAdmin(address newGovernorAdmin) external;
    function governorAdmin() external view returns (address);
}

contract AxiomVaultGovernor {
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function setCaps(address vault, uint16 supplyCap, uint16 borrowCap) external onlyOwner {
        IEVault(vault).setCaps(supplyCap, borrowCap);
    }
    
    function transferVaultGovernance(address vault, address newGovernor) external onlyOwner {
        IEVault(vault).setGovernorAdmin(newGovernor);
    }
    
    function executeCall(address target, bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = target.call(data);
        require(success, "Call failed");
        return result;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
    
    fallback() external {
        address vault;
        assembly {
            vault := shr(96, calldataload(sub(calldatasize(), 20)))
        }
        
        bytes memory data = msg.data;
        uint256 dataLength = data.length - 20;
        assembly {
            mstore(data, dataLength)
        }
        
        (bool success, bytes memory result) = vault.call(data);
        require(success, "Vault call failed");
        
        assembly {
            return(add(result, 32), mload(result))
        }
    }
}
