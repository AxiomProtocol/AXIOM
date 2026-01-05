// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IAxiomStable.sol";

contract AxiomStable is ERC20, ERC20Permit, AccessControl, Pausable, IAxiomStable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    constructor() ERC20("Axiom Stable Dollar", "AXUSD") ERC20Permit("Axiom Stable Dollar") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external override onlyRole(MINTER_ROLE) whenNotPaused {
        require(to != address(0), "AxiomStable: mint to zero address");
        require(amount > 0, "AxiomStable: mint zero amount");
        _mint(to, amount);
        emit Mint(to, amount);
    }

    function burn(address from, uint256 amount) external override onlyRole(BURNER_ROLE) whenNotPaused {
        require(from != address(0), "AxiomStable: burn from zero address");
        require(amount > 0, "AxiomStable: burn zero amount");
        _burn(from, amount);
        emit Burn(from, amount);
    }

    function pause() external override onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external override onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override whenNotPaused {
        super._update(from, to, value);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
