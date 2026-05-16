/**
 * GET /api/polygon/contracts
 *
 * Returns deployed contract addresses for Polygon PoS mainnet and Amoy testnet.
 * Empty strings indicate contracts not yet deployed to that network.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  POLYGON_CONTRACTS,
  AMOY_CONTRACTS,
  POLYGON_CHAIN_ID,
  AMOY_CHAIN_ID,
  isPolygonContractsPopulated,
} from '../../../shared/contracts-polygon';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  return res.status(200).json({
    mainnet: {
      chainId:    POLYGON_CHAIN_ID,
      network:    'polygon-pos',
      deployed:   isPolygonContractsPopulated(POLYGON_CONTRACTS),
      contracts:  POLYGON_CONTRACTS,
      explorer:   'https://polygonscan.com',
    },
    amoy: {
      chainId:    AMOY_CHAIN_ID,
      network:    'polygon-amoy',
      deployed:   isPolygonContractsPopulated(AMOY_CONTRACTS),
      contracts:  AMOY_CONTRACTS,
      explorer:   'https://amoy.polygonscan.com',
    },
    retrievedAt: new Date().toISOString(),
  });
}
