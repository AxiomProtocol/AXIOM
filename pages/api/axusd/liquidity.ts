import type { NextApiRequest, NextApiResponse } from 'next';
import { AXUSD_GENIUS_CONTRACTS, STABLECOINS } from '../../../shared/contracts';

/**
 * GET /api/axusd/liquidity
 *
 * Returns the current AXUSD on-chain liquidity venue status.
 * EulerSwap has been removed (2026-05-17). Primary DEX venue is now Camelot (Arbitrum One).
 * Aave v3 market data is available at /api/aave/arbitrum/market.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    data: {
      primaryVenue: 'Camelot',
      primaryChain: 'arbitrum',
      chainId: 42161,
      eulerSwapStatus: 'REMOVED',
      eulerSwapRemovedAt: '2026-05-17',
      venues: [
        {
          id: 'camelot',
          name: 'Camelot DEX',
          role: 'Primary AXUSD/USDC liquidity pool',
          status: 'ACTIVE',
          chain: 'Arbitrum One',
          dataEndpoint: '/api/dex/pools',
          note: 'Camelot is the primary AXUSD/USDC AMM pool on Arbitrum One.',
        },
        {
          id: 'aave-v3-arbitrum',
          name: 'Aave v3',
          role: 'Yield and collateral market layer',
          status: 'READ_ONLY_MONITORING',
          chain: 'Arbitrum One',
          dataEndpoint: '/api/aave/arbitrum/market',
          note: 'Read-only market intelligence for USDC/WBTC/WETH/USDT/wstETH markets.',
        },
        {
          id: 'uniswap-v3-polygon',
          name: 'Uniswap v3',
          role: 'DEX layer — Polygon PoS',
          status: 'READ_ONLY_MONITORING',
          chain: 'Polygon PoS',
          dataEndpoint: '/api/uniswap/pools',
          note: 'AXUSD/USDC and USDC/POL pools on Polygon. AXUSD pool pending Polygon deployment.',
        },
      ],
      contracts: {
        axusd: AXUSD_GENIUS_CONTRACTS.AXUSD,
        usdc: STABLECOINS.USDC,
      },
      deprecatedVenues: [
        {
          id: 'eulerswap',
          name: 'EulerSwap',
          removedAt: '2026-05-17',
          replacedBy: 'Camelot (primary DEX) + Aave v3 (yield layer)',
        },
      ],
      timestamp: new Date().toISOString(),
    },
  });
}
