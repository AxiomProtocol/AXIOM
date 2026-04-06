/**
 * GET /api/stellar/anchor/info
 *
 * Returns live Circle anchor information — stellar.toml parsed,
 * SEP-24 info endpoint queried, supported assets listed.
 * Public endpoint — no auth required.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';
import { fetchAnchorToml } from '../../../../lib/multichain/stellar/anchorUtils';
import { ANCHOR_CANDIDATES, STELLAR_SEP_CAPABILITIES, STELLAR_ANCHOR_REGISTRY } from '../../../../lib/multichain/stellar/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const activeKey = (process.env.STELLAR_ACTIVE_ANCHOR ?? 'moneygram').toLowerCase().trim();
  const activeEntry = STELLAR_ANCHOR_REGISTRY[activeKey] ?? STELLAR_ANCHOR_REGISTRY['moneygram'];
  const defaultAnchorId = activeEntry.anchorId;

  const rawAnchorId = req.query.anchorId;
  const anchorId = (typeof rawAnchorId === 'string' ? rawAnchorId : null) ?? defaultAnchorId;

  // Validate: only registered anchors are supported
  const registeredIds = Object.values(STELLAR_ANCHOR_REGISTRY).map(e => e.anchorId);
  if (!registeredIds.includes(anchorId)) {
    return res.status(400).json({
      error: `Anchor '${anchorId}' is not in the registry. Use one of: ${registeredIds.join(', ')}.`,
      supportedAnchors: registeredIds,
      activeAnchor: defaultAnchorId,
    });
  }

  const adapter = getStellarPaymentAdapter('mainnet');

  const [anchorStatus, toml] = await Promise.allSettled([
    adapter.getAnchorStatus(anchorId),
    fetchAnchorToml(),
  ]);

  const anchorCandidate = ANCHOR_CANDIDATES.find(a => a.anchorId === anchorId);
  const registryEntry = Object.values(STELLAR_ANCHOR_REGISTRY).find(e => e.anchorId === anchorId);

  // Fetch SEP-24 /info if we have the transfer server URL
  let sep24Info: unknown = null;
  const sep24Url = (toml.status === 'fulfilled' ? toml.value.TRANSFER_SERVER_SEP0024 : null)
    ?? registryEntry?.transferServerSep24;
  if (sep24Url) {
    try {
      const infoRes = await fetch(`${sep24Url}/info`, {
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
    activeAnchorKey: activeKey,
    selectedAnchor: anchorCandidate ?? null,
    registryEntry: registryEntry ?? null,
    liveStatus: anchorStatus.status === 'fulfilled' ? anchorStatus.value : null,
    tomlEndpoints: toml.status === 'fulfilled' ? {
      TRANSFER_SERVER_SEP0024: toml.value.TRANSFER_SERVER_SEP0024 ?? registryEntry?.transferServerSep24 ?? null,
      WEB_AUTH_ENDPOINT: toml.value.WEB_AUTH_ENDPOINT ?? registryEntry?.webAuthEndpoint ?? null,
      SIGNING_KEY: toml.value.SIGNING_KEY ?? null,
      VERSION: toml.value.VERSION ?? null,
    } : {
      TRANSFER_SERVER_SEP0024: registryEntry?.transferServerSep24 ?? null,
      WEB_AUTH_ENDPOINT: registryEntry?.webAuthEndpoint ?? null,
      SIGNING_KEY: null,
      VERSION: null,
    },
    sep24Info,
    sepCapabilities: STELLAR_SEP_CAPABILITIES,
    usdcIssuer: registryEntry?.usdcIssuer ?? 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    homeDomain: registryEntry?.homeDomain ?? activeEntry.homeDomain,
  });
}
