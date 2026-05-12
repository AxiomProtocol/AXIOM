// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./AxiomStable3643.sol";

/**
 * Fuji-specific artifact name for the Phase 2 Avalanche test deployment.
 *
 * The implementation intentionally inherits the reduced ERC-3643 token without
 * changing behavior. Arbitrum remains canonical; this contract is for Fuji
 * testnet deployment artifacts only.
 */
contract AxiomStable3643Fuji is AxiomStable3643 {}
