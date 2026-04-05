/**
 * GET /api/stellar/anchor/info
 *
 * Returns live Circle anchor information — stellar.toml parsed,
 * SEP-24 info endpoint queried, supported assets listed.
 * Public endpoint — no auth required.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter, fetchCircleToml } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';
import { ANCHOR_CANDIDATES, STELLAR_SEP_CAPABILITIES } from '../../../../lib/multichain/stellar/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  // Only Circle is integrated — reject unknown anchor IDs explicitly
  const anchorId = req.query.anchorId ?? 'circle-stellar';
  if (anchorId !== 'circle-stellar') {
    return res.status(400).json({
      error: `Anchor '${anchorId}' is not configured. Only 'circle-stellar' is currently integrated.`,
      supportedAnchors: ['circle-stellar'],
    });
  }

  const adapter = getStellarPaymentAdapter('mainnet');

  const [anchorStatus, toml] = await Promise.allSettled([
    adapter.getAnchorStatus(anchorId),
    fetchCircleToml(),
  ]);

  const circleCandidate = ANCHOR_CANDIDATES.find(a => a.anchorId === 'circle-stellar');

  // Fetch SEP-24 /info if we have the transfer server URL
  let sep24Info: unknown = null;
  if (toml.status === 'fulfilled' && toml.value.TRANSFER_SERVER_SEP0024) {
    try {
      const infoRes = await fetch(`${toml.value.TRANSFER_SERVER_SEP0024}/info`, {
        signal: AbortSignal.timeout(8000),
      });
      if (infoRes.ok) {
        sep24Info = await infoRes.json();
      }
    } catch {
      // Info endpoint unreachable
    }
  }

  return res.status(200).json({
    schemaVersion: 'stellar-anchor-info-v1',
    asOf: new Date().toISOString(),
    anchorId,
    selectedAnchor: circleCandidate ?? null,
    liveStatus: anchorStatus.status === 'fulfilled' ? anchorStatus.value : null,
    tomlEndpoints: toml.status === 'fulfilled' ? {
      TRANSFER_SERVER_SEP0024: toml.value.TRANSFER_SERVER_SEP0024 ?? null,
      WEB_AUTH_ENDPOINT: toml.value.WEB_AUTH_ENDPOINT ?? null,
      SIGNING_KEY: toml.value.SIGNING_KEY ?? null,
      VERSION: toml.value.VERSION ?? null,
    } : null,
    sep24Info,
    sepCapabilities: STELLAR_SEP_CAPABILITIES,
    usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    homeDomain: 'centre.io',
  });
}
