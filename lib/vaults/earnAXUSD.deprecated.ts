/**
 * lib/vaults/earnAXUSD.deprecated.ts
 *
 * DEPRECATED — 2026-05-17
 *
 * This file is the archived version of the Euler Earn AXUSD vault
 * configuration. The Euler Finance integration has been removed from
 * Axiom Protocol as part of the migration to the multi-chain DeFi stack.
 *
 * Do NOT import from this file in new code.
 * Historical reference only — retained for audit trail.
 *
 * Replacement integrations:
 *   - Aave v3 Arbitrum: lib/defi/aave/arbitrumService.ts
 *   - Aave v3 Polygon:  lib/defi/aave/polygonService.ts
 *   - Benqi (Avalanche): lib/defi/benqi/service.ts
 *   - Navi Protocol (Sui): lib/defi/navi/service.ts
 *   - Aftermath Finance (Sui): lib/defi/aftermath/service.ts
 */

export const EARN_AXUSD_VAULT_DEPRECATED = {
  name:    'Axiom Earn AXUSD',
  symbol:  'earnAXUSD',
  address: '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B' as `0x${string}`,
  chainId: 42161,
  standard: 'ERC-4626 (Euler Earn wrapper)',
  factory: '0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d' as `0x${string}`,
  status: 'deprecated' as const,
  deprecatedAt: '2026-05-17',
  reason: 'Euler Finance integration removed. Migrated to multi-chain DeFi stack.',
} as const;
