import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
  isEulerSwapDeployed,
} from '../../../src/config/activeContracts.generated';

// Canonical addresses for supported tokens
const AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'.toLowerCase();
const AXM   = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D'.toLowerCase();
const ZERO  = '0x0000000000000000000000000000000000000000';

// Fix 2 & 7: Use getAssets() to dynamically determine token ordering,
// eliminating any assumption about which token is reserve0/reserve1.
// Also add basic input validation.

const ALCHEMY_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const POOL_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function getAssets() view returns (address asset0, address asset1)',
];

async function getAxmPriceFromPool(): Promise<string> {
  const poolAddress = EULER_SWAP_AXUSD_AXM_POOL_ADDRESS;
  if (!isEulerSwapDeployed() || poolAddress === ZERO) return '0';
  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC);
    const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
    const [reserves, assets] = await Promise.all([pool.getReserves(), pool.getAssets()]);

    const asset0Lower = (assets[0] as string).toLowerCase();

    // Determine which reserve is AXM and which is AXUSD using on-chain asset list
    const axmIsAsset0 = asset0Lower === AXM;
    const axmReserve   = Number(ethers.formatUnits(axmIsAsset0 ? reserves[0] : reserves[1], 18));
    const axusdReserve = Number(ethers.formatUnits(axmIsAsset0 ? reserves[1] : reserves[0], 18));

    if (axmReserve <= 0) return '0';
    // AXM price in USD = AXUSD reserve / AXM reserve  (AXUSD is pegged to $1)
    const price = axusdReserve / axmReserve;
    return price.toFixed(6);
  } catch {
    return '0';
  }
}

// Fix 7: Validate that token looks like an Ethereum address
function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token address' });
  }

  // Fix 7: Reject obviously invalid inputs before hitting the RPC
  if (!isValidAddress(token)) {
    return res.status(400).json({ error: 'Invalid token address format' });
  }

  const tokenLower = token.toLowerCase();

  try {
    if (tokenLower === AXUSD) {
      return res.status(200).json({
        token,
        price: '1.000000',
        source: 'peg',
        note: 'AXUSD is the Axiom protocol stablecoin, maintained at $1.00 peg',
      });
    }

    if (tokenLower === AXM) {
      const price = await getAxmPriceFromPool();
      return res.status(200).json({
        token,
        price,
        source: price !== '0' ? 'pool:axusd_axm' : 'unavailable',
        note: price !== '0'
          ? 'Spot price derived from on-chain AXM/AXUSD pool reserve ratio — not an oracle price'
          : 'Price unavailable — pool not deployed or empty',
      });
    }

    return res.status(200).json({ token, price: '0', source: 'unknown_token' });
  } catch (error) {
    console.error('[dex/price] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch token price' });
  }
}
