// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEVC {
    function call(
        address targetContract,
        address onBehalfOfAccount,
        uint256 value,
        bytes calldata data
    ) external payable returns (bytes memory result);
}

interface IEVault {
    function setCaps(uint16 supplyCap, uint16 borrowCap) external;
    function setGovernorAdmin(address newGovernorAdmin) external;
    function governorAdmin() external view returns (address);
    function EVC() external view returns (address);
}

contract AxiomVaultGovernorV2 {
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function setCapsViaEVC(address vault, uint16 supplyCap, uint16 borrowCap) external onlyOwner {
        address evc = IEVault(vault).EVC();
        bytes memory data = abi.encodeWithSelector(IEVault.setCaps.selector, supplyCap, borrowCap);
        IEVC(evc).call(vault, address(this), 0, data);
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
    
    function executeCallViaEVC(address vault, bytes calldata data) external onlyOwner returns (bytes memory) {
        address evc = IEVault(vault).EVC();
        return IEVC(evc).call(vault, address(this), 0, data);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
