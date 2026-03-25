/**
 * Axiom Protocol — Oracle Configuration
 *
 * This file tracks the ERC-7726 compatible oracle adapter addresses.
 * AXIOMOracleAdapter implements ERC-7726:
 *   getQuote(uint256 inAmount, address base, address quote) → uint256 outAmount
 *
 * Deployment status: DEPLOYED ✓ (AXIOMOracleAdapter v2)
 * Source: contracts/oracle/AXIOMOracleAdapter.sol
 * Deployed via: scripts/deploy-axusd-oracle-v2.js
 * primaryAxusd: 0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7 (ERC-3643 AXUSD)
 *
 * Verified on-chain:
 *   getQuote(1e18, ERC3643_AXUSD, USDC) = 1,000,000 ✓  (peg = $1.00)
 *
 * Legacy references (kept for compatibility):
 *   Legacy OracleAdapter (Phase 3, Contract 31): 0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D
 *   Legacy OracleAdapterRegistry (EulerVaultService): 0x91c8B55D234de4b48C1F1F1c5e9c4b6C8CB96f84
 *   Legacy PRICE_ORACLE (vault-stats.ts): 0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15
 */

import { ethers } from 'ethers';

/**
 * AXIOMOracleAdapter v2 — ERC-7726 compliant oracle for AXUSD/USD, USDC→AXUSD,
 * ETH→AXUSD, ARB→AXUSD pricing on Arbitrum One.
 * Status: DEPLOYED ✓ | Source: contracts/oracle/AXIOMOracleAdapter.sol
 * Also serves as immutable oracle in eAXUSD-6 EVK vault (MetaProxy trailing data).
 */
export const AXUSD_ORACLE_ADAPTER: string = '0xc894d1500CB1FBf8F045e87bd357A51345197c4e';

/**
 * Returns true when the ERC-7726 oracle has been deployed to Arbitrum One.
 */
export function isOracleDeployed(): boolean {
  return (
    AXUSD_ORACLE_ADAPTER.length === 42 &&
    AXUSD_ORACLE_ADAPTER !== ethers.ZeroAddress
  );
}

/**
 * Chainlink price feed addresses on Arbitrum One.
 * All feeds return 8-decimal prices.
 */
export const CHAINLINK_FEEDS = {
  ETH_USD:  '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
  BTC_USD:  '0x6ce185539ad4fdEED739C0a210dCA8BF0D66E8F2',
  ARB_USD:  '0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6',
  USDC_USD: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
  USDT_USD: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
} as const;

/**
 * ERC-7726 interface ABI — for reading the deployed oracle adapter.
 */
export const ERC7726_ABI = [
  'function getQuote(uint256 inAmount, address base, address quote) external view returns (uint256 outAmount)',
  'function axusdUsdPrice() external view returns (uint256 priceWad, uint8 source)',
  'function ethUsdPrice() external view returns (uint256)',
  'function governor() external view returns (address)',
  'function primaryAxusd() external view returns (address)',
  'function eulerAxusd() external view returns (address)',
] as const;

/**
 * Legacy oracle addresses (pre-ERC-7726 deployment).
 * These remain active until AXIOMOracleAdapter is deployed.
 */
export const LEGACY_ORACLE = {
  ORACLE_ADAPTER:          '0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D',
  ORACLE_ADAPTER_REGISTRY: '0x91c8B55D234de4b48C1F1F1c5e9c4b6C8CB96f84',
  PRICE_ORACLE:            '0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15',
} as const;
