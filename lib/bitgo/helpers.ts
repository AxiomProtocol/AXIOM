export function satoshiToUnit(satoshi: number, decimals = 8): number {
  return satoshi / Math.pow(10, decimals);
}

export function unitToSatoshi(amount: number, decimals = 8): number {
  return Math.round(amount * Math.pow(10, decimals));
}

export function formatCryptoAmount(amount: number, symbol: string, decimals = 8): string {
  const value = satoshiToUnit(amount, decimals);
  return `${value.toFixed(6)} ${symbol}`;
}

const ARBITRUM_CHAIN_MAP: Record<string, string> = {
  '42161': 'arbitrum',
  arbitrum: 'arbitrum',
  'arbitrum one': 'arbitrum',
};

const ARBITRUM_TESTNET_MAP: Record<string, string> = {
  '42161': 'tarbitrum',
  arbitrum: 'tarbitrum',
  'arbitrum one': 'tarbitrum',
};

export function mapChainId(chainIdOrName: string | number, testnet = false): string {
  const key = String(chainIdOrName).toLowerCase();
  const map = testnet ? ARBITRUM_TESTNET_MAP : ARBITRUM_CHAIN_MAP;
  return map[key] ?? (testnet ? 'tarbitrum' : 'arbitrum');
}

export const AXIOM_SUPPORTED_COINS = {
  ETH: { coin: 'eth', testCoin: 'teth', decimals: 18, symbol: 'ETH' },
  AXM: { coin: 'arbitrum:0xYOUR_AXM_ADDRESS', testCoin: 'tarbitrum:0xYOUR_AXM_ADDRESS', decimals: 18, symbol: 'AXM' },
  AXUSD: { coin: 'arbitrum:0xYOUR_AXUSD_ADDRESS', testCoin: 'tarbitrum:0xYOUR_AXUSD_ADDRESS', decimals: 6, symbol: 'AXUSD' },
  USDC: { coin: 'arbitrum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', testCoin: 'tarbitrum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, symbol: 'USDC' },
} as const;

export type SupportedCoin = keyof typeof AXIOM_SUPPORTED_COINS;

export function getCoinId(symbol: SupportedCoin, testnet = false): string {
  const entry = AXIOM_SUPPORTED_COINS[symbol];
  return testnet ? entry.testCoin : entry.coin;
}

export function isValidEthAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export function isValidBitGoWalletId(id: string): boolean {
  return /^[a-f0-9]{32}$/.test(id);
}

export function formatBitGoTxStatus(state: string): string {
  const map: Record<string, string> = {
    signed: 'Signed',
    unconfirmed: 'Pending',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
    pendingApproval: 'Pending Approval',
    removed: 'Removed',
  };
  return map[state] ?? state;
}
