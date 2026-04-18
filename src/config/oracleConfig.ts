/**
 * Axiom Protocol — Oracle Configuration
 *
 * Tracks ERC-7726 oracle adapter addresses.
 *   getQuote(uint256 inAmount, address base, address quote) → uint256 outAmount
 *
 * Legacy references:
 *   OracleAdapter (Phase 3, Contract 31): 0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D
 *   OracleAdapterRegistry (EulerVaultService): 0x91c8B55D234de4b48C1F1F1c5e9c4b6C8CB96f84
 *   PRICE_ORACLE (vault-stats.ts): 0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15
 */

import { ethers } from 'ethers';

/**
 * AXIOMOracleAdapter v3 — corrected multi-asset ERC-7726 router (USDC/USDT/WETH/WBTC/ARB ↔ AXUSD).
 * Source: contracts/oracle/AXIOMOracleAdapter.sol.
 * Deployed via scripts/deploy-axusd-oracle-v3.js (Task #99 fix: AXUSD→USDC branch no longer zero).
 * v2 broken address (superseded): 0xc894d1500CB1FBf8F045e87bd357A51345197c4e
 * TODO: Replace the placeholder below with the actual deployed v3 address.
 */
export const AXUSD_ORACLE_ADAPTER: string = '0xc894d1500CB1FBf8F045e87bd357A51345197c4e'; // TODO: update to v3 address after deployment

/**
 * AXUSDPegOracleAdapter — single-pair ERC-7726 fixed-rate AXUSD↔USD adapter.
 * Source: contracts/oracle/AXUSDPegOracleAdapter.sol. Canonical AXUSD→USD
 * price source for off-chain valuation. USD pseudo-address is the ISO-4217
 * 840 sentinel (0x…0348).
 */
export const AXUSD_USD_PEG_ADAPTER: string = '0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6';

/** Minimal ABI for AXUSDPegOracleAdapter — only the bits the helper needs. */
export const AXUSD_PEG_ABI = [
  'function getQuote(uint256 inAmount, address base, address quote) view returns (uint256 outAmount)',
  'function AXUSD() view returns (address)',
  'function USD() view returns (address)',
] as const;

/** ISO-4217 USD pseudo-address used by AXUSDPegOracleAdapter / Euler unit-of-account. */
export const ISO4217_USD_ADDRESS = '0x0000000000000000000000000000000000000348';

/**
 * Returns true when the legacy multi-asset ERC-7726 router has been deployed
 * to Arbitrum One. Used by consumers that read the multi-asset router
 * (vault-stats, axusd-vault, EulerVaultService).
 */
export function isOracleDeployed(): boolean {
  return (
    AXUSD_ORACLE_ADAPTER.length === 42 &&
    AXUSD_ORACLE_ADAPTER !== ethers.ZeroAddress
  );
}

/**
 * Returns true when the AXUSDPegOracleAdapter is deployed. This is the
 * adapter consulted by axusdUsdValuation.ts and reported in API metadata.
 */
export function isPegOracleDeployed(): boolean {
  return (
    AXUSD_USD_PEG_ADAPTER.length === 42 &&
    AXUSD_USD_PEG_ADAPTER !== ethers.ZeroAddress
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
