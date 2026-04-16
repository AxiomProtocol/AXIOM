/**
 * /api/observer/cdp-balances
 *
 * Returns live ETH and USDC balances for all CDP server wallets
 * on Base mainnet, fetched via Alchemy JSON-RPC.
 *
 * Used by the Observer Treasury page.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { listEvmAccounts } from '../../../lib/cdp/walletService';

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BALANCEOF_SELECTOR = '0x70a08231';

export interface CdpWalletBalance {
  address: string;
  name: string | null;
  ethBalance: string;
  usdcBalance: string;
  network: 'base-mainnet';
  basescanUrl: string;
}

export interface CdpBalancesResponse {
  wallets: CdpWalletBalance[];
  fetchedAt: string;
  isLive: boolean;
  error?: string;
}

async function jsonRpc(url: string, method: string, params: unknown[]): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json() as { result?: string };
    return typeof json.result === 'string' ? json.result : null;
  } catch {
    return null;
  }
}

function weiToEth(hex: string): string {
  try {
    const wei = BigInt(hex);
    return (Number(wei) / 1e18).toFixed(6);
  } catch {
    return '0.000000';
  }
}

function rawToUsdc(hex: string): string {
  try {
    const raw = BigInt(hex);
    return (Number(raw) / 1e6).toFixed(2);
  } catch {
    return '0.00';
  }
}

function encodeBalanceOf(address: string): string {
  const clean = address.toLowerCase().replace('0x', '').padStart(64, '0');
  return `${BALANCEOF_SELECTOR}${clean}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CdpBalancesResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      wallets: [],
      fetchedAt: new Date().toISOString(),
      isLive: false,
      error: 'Method not allowed',
    });
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      wallets: [],
      fetchedAt: new Date().toISOString(),
      isLive: false,
      error: 'Alchemy not configured',
    });
  }

  const rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;

  const { accounts, isLive, error } = await listEvmAccounts();

  if (!isLive || accounts.length === 0) {
    return res.status(200).json({
      wallets: [],
      fetchedAt: new Date().toISOString(),
      isLive: false,
      error: error ?? 'No CDP wallets found',
    });
  }

  const wallets: CdpWalletBalance[] = await Promise.all(
    accounts.map(async (acc) => {
      const [ethHex, usdcHex] = await Promise.all([
        jsonRpc(rpcUrl, 'eth_getBalance', [acc.address, 'latest']),
        jsonRpc(rpcUrl, 'eth_call', [
          { to: USDC_BASE, data: encodeBalanceOf(acc.address) },
          'latest',
        ]),
      ]);

      return {
        address: acc.address,
        name: acc.name,
        ethBalance: ethHex ? weiToEth(ethHex) : '0.000000',
        usdcBalance: usdcHex ? rawToUsdc(usdcHex) : '0.00',
        network: 'base-mainnet' as const,
        basescanUrl: `https://basescan.org/address/${acc.address}`,
      };
    })
  );

  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).json({
    wallets,
    fetchedAt: new Date().toISOString(),
    isLive: true,
  });
}
