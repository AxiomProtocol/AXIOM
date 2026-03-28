import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
  isEulerSwapDeployed,
} from '../../../src/config/activeContracts.generated';

const AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'.toLowerCase();
const AXM   = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D'.toLowerCase();
const ZERO  = '0x0000000000000000000000000000000000000000';

const ALCHEMY_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const POOL_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
];

// Derive AXM/USD price from the on-chain AXM/AXUSD pool reserves.
// token0 = AXUSD (18 dec, $1 peg), token1 = AXM (18 dec)
// Spot price = reserve0 / reserve1  (AXUSD per AXM)
async function getAxmPriceFromPool(): Promise<string> {
  const poolAddress = EULER_SWAP_AXUSD_AXM_POOL_ADDRESS;
  if (!isEulerSwapDeployed() || poolAddress === ZERO) return '0';
  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC);
    const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
    const reserves = await pool.getReserves();
    const axusdReserve = Number(ethers.formatUnits(reserves[0], 18)); // token0 = AXUSD
    const axmReserve   = Number(ethers.formatUnits(reserves[1], 18)); // token1 = AXM
    if (axmReserve <= 0) return '0';
    const price = axusdReserve / axmReserve;
    return price.toFixed(6);
  } catch {
    return '0';
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token address' });

  const tokenLower = (token as string).toLowerCase();

  try {
    if (tokenLower === AXUSD) {
      // AXUSD is the protocol stablecoin, pegged to $1.00
      return res.status(200).json({ token, price: '1.000000', source: 'peg' });
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
