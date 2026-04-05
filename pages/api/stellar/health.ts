/**
 * GET /api/stellar/health
 *
 * Returns live Stellar Horizon network health and Circle anchor connectivity.
 * Public endpoint — no auth required. Used by /stellar-payments UI.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter, fetchCircleToml } from '../../../lib/multichain/stellar/StellarPaymentAdapter';
import { STELLAR_ANCHOR_REGISTRY } from '../../../lib/multichain/stellar/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const activeKey = (process.env.STELLAR_ACTIVE_ANCHOR ?? 'moneygram').toLowerCase().trim();
  const activeEntry = STELLAR_ANCHOR_REGISTRY[activeKey] ?? STELLAR_ANCHOR_REGISTRY['moneygram'];
  const activeAnchorId = activeEntry.anchorId;

  const adapter = getStellarPaymentAdapter('mainnet');

  const [networkHealth, anchorStatus] = await Promise.allSettled([
    adapter.getNetworkHealth(),
    adapter.getAnchorStatus(activeAnchorId),
  ]);

  let tomlEndpoints: Record<string, string | undefined> = {};
  try {
    const toml = await fetchCircleToml();
    tomlEndpoints = {
      TRANSFER_SERVER_SEP0024: toml.TRANSFER_SERVER_SEP0024,
      WEB_AUTH_ENDPOINT: toml.WEB_AUTH_ENDPOINT,
      SIGNING_KEY: toml.SIGNING_KEY,
    };
  } catch {
    // ignore
  }

  return res.status(200).json({
    schemaVersion: 'stellar-health-v1',
    asOf: new Date().toISOString(),
    network: networkHealth.status === 'fulfilled' ? networkHealth.value : {
      networkId: 'mainnet',
      horizonReachable: false,
      latencyMs: null,
      currentLedger: null,
      currentFeeStroops: null,
      asOf: new Date().toISOString(),
    },
    anchor: anchorStatus.status === 'fulfilled' ? anchorStatus.value : {
      anchorId: activeAnchorId,
      anchorName: activeEntry.anchorName,
      isReachable: false,
      sep24Supported: true,
      sep31Supported: false,
      supportedAssets: [],
      corridors: [],
      lastCheckedAt: new Date().toISOString(),
    },
    tomlEndpoints,
    sdkVersion: '@stellar/stellar-sdk',
    selectedAnchor: activeAnchorId,
    activeAnchorKey: activeKey,
    activeAnchorHomeDomain: activeEntry.homeDomain,
  });
}
