/**
 * GET /api/polygon/status
 *
 * Compact integration status for Polygon PoS — used by system map badges,
 * operator console headers, and homepage chain-status strips.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { isChainEnabled } from '../../../lib/chains/capabilities';
import { getPolygonRpcUrl } from '../../../lib/chains/providers';
import { POLYGON_CONTRACTS, AMOY_CONTRACTS, isPolygonContractsPopulated } from '../../../shared/contracts-polygon';

export interface PolygonStatusResponse {
  chain:              string;
  chainId:            number;
  enabled:            boolean;
  rpcConfigured:      boolean;
  mainnetDeployed:    boolean;
  testnetDeployed:    boolean;
  axusdAddress:       string | null;
  identityBridgeMode: string;
  phase:              string;
  nextStep:           string;
  checkedAt:          string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<PolygonStatusResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const enabled        = isChainEnabled('polygon');
  const rpcConfigured  = !!getPolygonRpcUrl();
  const mainnetDeployed = isPolygonContractsPopulated(POLYGON_CONTRACTS);
  const testnetDeployed = isPolygonContractsPopulated(AMOY_CONTRACTS);

  let phase    = 'Phase 2 — Amoy Testnet Pending';
  let nextStep = 'Run: POLYGON_AMOY_REAL_DEPLOY=true npm run deploy:polygon:amoy';

  if (testnetDeployed && !mainnetDeployed) {
    phase    = 'Phase 2 — Amoy Testnet Live';
    nextStep = 'Run: POLYGON_MAINNET_REAL_DEPLOY=true npm run deploy:polygon:mainnet';
  } else if (mainnetDeployed) {
    phase    = 'Phase 2 — Polygon Mainnet Live';
    nextStep = 'Transfer admin roles to multisig; verify on Polygonscan.';
  }

  return res.status(200).json({
    chain:              'Polygon PoS',
    chainId:            137,
    enabled,
    rpcConfigured,
    mainnetDeployed,
    testnetDeployed,
    axusdAddress:       mainnetDeployed ? POLYGON_CONTRACTS.AxiomStable3643 : testnetDeployed ? AMOY_CONTRACTS.AxiomStable3643 : null,
    identityBridgeMode: 'onchainid_mirror',
    phase,
    nextStep,
    checkedAt:          new Date().toISOString(),
  });
}
