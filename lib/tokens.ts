// Fix 9: Single source of truth for all canonical token addresses, decimals,
// and symbols. Import from here — do NOT hardcode addresses elsewhere.

export const CANONICAL_TOKENS = {
  USDC: {
    symbol: 'USDC',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
    coingeckoId: 'usd-coin',
  },
  AXUSD: {
    symbol: 'AXUSD',
    address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
    decimals: 18,
    coingeckoId: null, // Protocol stablecoin — no external CoinGecko listing
  },
  AXM: {
    symbol: 'AXM',
    address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
    decimals: 18,
    coingeckoId: null, // Governance token — price derived from on-chain pool
  },
} as const;

export type TokenSymbol = keyof typeof CANONICAL_TOKENS;

/** Look up token metadata by contract address (case-insensitive). */
export function getTokenByAddress(address: string) {
  const lower = address.toLowerCase();
  return Object.values(CANONICAL_TOKENS).find(t => t.address.toLowerCase() === lower) ?? null;
}

/** Look up a canonical address by token symbol. Returns '' if not found. */
export function getAddressBySymbol(symbol: string): string {
  return (CANONICAL_TOKENS as Record<string, { address: string }>)[symbol]?.address ?? '';
}

/** Look up decimals by token symbol. Returns 18 as safe default. */
export function getDecimalsBySymbol(symbol: string): number {
  return (CANONICAL_TOKENS as Record<string, { decimals: number }>)[symbol]?.decimals ?? 18;
}
