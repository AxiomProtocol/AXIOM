/**
 * Coinbase Developer Platform (CDP) SDK Client
 *
 * Authentication:
 *   COINBASE_API_KEY    → CDP API Key ID
 *   COINBASE_API_KEY2   → CDP API Key Secret (PEM EC private key)
 *   CDP_WALLET_SECRET   → Wallet Secret (required for creating/signing txns)
 *
 * Server-side only — never import this in client bundles.
 */

import { CdpClient } from '@coinbase/cdp-sdk';

let _client: CdpClient | null = null;

export function getCdpClient(): CdpClient {
  if (_client) return _client;

  const apiKeyId = process.env.COINBASE_API_KEY;
  const apiKeySecret = process.env.COINBASE_API_KEY2;

  if (!apiKeyId || !apiKeySecret) {
    throw new Error('CDP client not configured: COINBASE_API_KEY and COINBASE_API_KEY2 are required');
  }

  const walletSecret = process.env.CDP_WALLET_SECRET;

  _client = new CdpClient({
    apiKeyId,
    apiKeySecret,
    ...(walletSecret ? { walletSecret } : {}),
  });

  return _client;
}

export function isCdpConfigured(): boolean {
  return !!(process.env.COINBASE_API_KEY && process.env.COINBASE_API_KEY2);
}

export function canCreateWallets(): boolean {
  return isCdpConfigured() && !!process.env.CDP_WALLET_SECRET;
}
