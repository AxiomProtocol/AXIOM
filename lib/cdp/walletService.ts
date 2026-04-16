/**
 * CDP Server Wallet Service
 *
 * Wraps CDP SDK for creating and managing server-side EVM wallets.
 * Uses COINBASE_API_KEY (key ID) + COINBASE_API_KEY2 (key secret).
 *
 * Server-side only.
 */

import { getCdpClient, isCdpConfigured } from './client';

export interface CdpWalletAccount {
  address: string;
  name: string | null;
  network: string;
}

export interface CdpWalletListResult {
  accounts: CdpWalletAccount[];
  isLive: boolean;
  error?: string;
}

export interface CdpCreateAccountResult {
  account: CdpWalletAccount | null;
  error?: string;
}

/**
 * List EVM server wallet accounts associated with this CDP project (up to 50).
 */
export async function listEvmAccounts(): Promise<CdpWalletListResult> {
  if (!isCdpConfigured()) {
    return { accounts: [], isLive: false, error: 'CDP not configured' };
  }

  try {
    const cdp = getCdpClient();
    const page = await cdp.evm.listAccounts({ pageSize: 50 });
    const accounts: CdpWalletAccount[] = page.accounts.map(acc => ({
      address: acc.address,
      name: acc.name ?? null,
      network: 'base-mainnet',
    }));

    return { accounts, isLive: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list CDP accounts';
    return { accounts: [], isLive: false, error: msg };
  }
}

/**
 * Create a new named EVM server wallet account.
 */
export async function createEvmAccount(name?: string): Promise<CdpCreateAccountResult> {
  if (!isCdpConfigured()) {
    return { account: null, error: 'CDP not configured' };
  }

  try {
    const cdp = getCdpClient();
    const account = await cdp.evm.createAccount(name ? { name } : undefined);

    return {
      account: {
        address: account.address,
        name: account.name ?? null,
        network: 'base-mainnet',
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create CDP account';
    return { account: null, error: msg };
  }
}
