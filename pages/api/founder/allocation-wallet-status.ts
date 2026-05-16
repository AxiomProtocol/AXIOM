/**
 * GET /api/founder/allocation-wallet-status
 *
 * Admin-key gated. Reads the live PAXG, USDC, and ETH (gas) balances of
 * the DEPLOYER_EOA on Arbitrum One so the allocation panel can show a
 * balance strip before the operator clicks Execute.
 *
 * All reads are view-only — no signing, no state changes.
 *
 * Response:
 *   { success, address, paxg, paxgUsd, paxgPricePerOz,
 *     usdc, eth, fetchedAt, warning? }
 *
 *   paxg / usdc / eth  — float, token units (not wei)
 *   paxgUsd            — float, USD value of the PAXG balance
 *   paxgPricePerOz     — float, PAXG/USD spot price (CoinGecko) or null
 *   warning            — present when balances could not be fetched (returns
 *                         last-known zeroes so UI degrades gracefully)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { validateAdminKey } from '@/src/config/adminRoles';

const PAXG_ARBITRUM = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARBITRUM_CHAIN_ID = 42161;

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
] as const;

/** Fetch PAXG/USD spot from CoinGecko; returns null on failure. */
async function fetchPaxgPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd',
      { signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return null;
    const json = await res.json() as { 'pax-gold'?: { usd?: number } };
    const p = json['pax-gold']?.usd;
    return typeof p === 'number' && p > 0 ? p : null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized — x-admin-key required' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    return res.status(200).json({
      success: true,
      address: null,
      paxg: 0, paxgUsd: 0, paxgPricePerOz: null,
      usdc: 0, eth: 0,
      fetchedAt: new Date().toISOString(),
      warning: 'DEPLOYER_PRIVATE_KEY not set — cannot derive deployer address',
    });
  }

  const alchemyKey  = process.env.ALCHEMY_API_KEY ?? '';
  const arbitrumRpc = alchemyKey
    ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : 'https://arb1.arbitrum.io/rpc';

  try {
    const provider = new ethers.JsonRpcProvider(arbitrumRpc, ARBITRUM_CHAIN_ID);
    const wallet   = new ethers.Wallet(pk);               // read-only: no provider needed for address
    const address  = wallet.address;

    const paxg = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, provider);
    const usdc = new ethers.Contract(USDC_ARBITRUM, ERC20_ABI, provider);

    const [paxgWei, usdcWei, ethWei, paxgPricePerOz] = await Promise.all([
      paxg.balanceOf(address) as Promise<bigint>,
      usdc.balanceOf(address) as Promise<bigint>,
      provider.getBalance(address),
      fetchPaxgPrice(),
    ]);

    const paxgFloat = parseFloat(ethers.formatUnits(paxgWei, 18));
    const usdcFloat = parseFloat(ethers.formatUnits(usdcWei, 6));   // USDC is 6 decimals
    const ethFloat  = parseFloat(ethers.formatUnits(ethWei,  18));
    const paxgUsd   = paxgPricePerOz != null ? paxgFloat * paxgPricePerOz : 0;

    return res.status(200).json({
      success:        true,
      address,
      paxg:           paxgFloat,
      paxgUsd,
      paxgPricePerOz,
      usdc:           usdcFloat,
      eth:            ethFloat,
      fetchedAt:      new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'RPC call failed';
    return res.status(200).json({
      success: true,
      address: null,
      paxg: 0, paxgUsd: 0, paxgPricePerOz: null,
      usdc: 0, eth: 0,
      fetchedAt: new Date().toISOString(),
      warning: `Balance fetch failed: ${msg.slice(0, 200)}`,
    });
  }
}
