/**
 * Block-explorer URL helpers for AXUSD property-report receipts.
 *
 * Kept in its own file (separate from `onchainPayment.ts`, which pulls in
 * `ethers`) so client bundles can import the link builders without dragging
 * the full ethers/contracts surface in.
 */

export const ARBITRUM_ONE_CHAIN_ID = 42161;
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

function explorerBase(chainId: number | null | undefined): string {
  // Default to Arbitrum One — that is the chain task #230 settled the AXUSD
  // payment flow on, and is what every production receipt will use.
  if (chainId === ARBITRUM_SEPOLIA_CHAIN_ID) return 'https://sepolia.arbiscan.io';
  return 'https://arbiscan.io';
}

function ensure0x(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}

export function getArbiscanTxUrl(chainId: number | null | undefined, txHash: string): string {
  return `${explorerBase(chainId)}/tx/${ensure0x(txHash)}`;
}

export function getArbiscanAddressUrl(chainId: number | null | undefined, address: string): string {
  return `${explorerBase(chainId)}/address/${ensure0x(address)}`;
}
