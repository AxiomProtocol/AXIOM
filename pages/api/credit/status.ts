/**
 * GET /api/credit/status?walletAddress=0x...
 *
 * Returns the current credit line state for a participant:
 * - No line: { hasLine: false }
 * - Active/pending: { hasLine: true, line: {...}, ltvRatio, healthStatus }
 *
 * SIWE-authenticated.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { cryptoCreditLines } from '../../../shared/cryptoCreditSchema';
import { getSiweWallet } from '../../../lib/server/banking/siweHelper';
import { eq, and, inArray } from 'drizzle-orm';

async function getCoinGeckoPrice(asset: string): Promise<number | null> {
  if (asset === 'AXUSD') return 1.0;

  const coinIds: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
  };

  const coinId = coinIds[asset];
  if (!coinId) return null;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[coinId]?.usd ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress query param required' });
  }

  const wallet = walletAddress.toLowerCase();

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only access your own credit line' });
  }

  const lines = await db
    .select()
    .from(cryptoCreditLines)
    .where(
      and(
        eq(cryptoCreditLines.participantWallet, wallet),
        inArray(cryptoCreditLines.status, ['pending_collateral', 'active', 'warning', 'flagged']),
      ),
    )
    .limit(1);

  if (lines.length === 0) {
    return res.status(200).json({ hasLine: false });
  }

  const line = lines[0];
  const collateralAmount = parseFloat(line.collateralAmountRaw ?? '0');
  const priceUsd = await getCoinGeckoPrice(line.collateralAsset);
  const collateralValueUsd = priceUsd !== null ? collateralAmount * priceUsd : null;
  const drawnAmountUsd = parseFloat(line.drawnAmountUsd ?? '0');
  const creditLimitUsd = parseFloat(line.creditLimitUsd ?? '0');
  const availableCreditUsd = Math.max(0, creditLimitUsd - drawnAmountUsd);

  let ltvRatio: number | null = null;
  let healthStatus: 'safe' | 'warning' | 'critical' | null = null;

  if (collateralValueUsd !== null && collateralValueUsd > 0) {
    ltvRatio = (drawnAmountUsd / collateralValueUsd) * 100;
    if (ltvRatio >= 85) healthStatus = 'critical';
    else if (ltvRatio >= 70) healthStatus = 'warning';
    else healthStatus = 'safe';
  }

  return res.status(200).json({
    hasLine: true,
    line: {
      id: line.id,
      participantWallet: line.participantWallet,
      collateralAsset: line.collateralAsset,
      collateralAmountRaw: line.collateralAmountRaw,
      collateralUsdValueAtOpen: line.collateralUsdValueAtOpen,
      creditLimitUsd: line.creditLimitUsd,
      drawnAmountUsd: line.drawnAmountUsd,
      availableCreditUsd: availableCreditUsd.toFixed(2),
      interestRatePct: line.interestRatePct,
      status: line.status,
      depositAddress: line.depositAddress,
      openedAt: line.openedAt,
    },
    collateralValueUsd: collateralValueUsd?.toFixed(2) ?? null,
    priceUsd: priceUsd?.toFixed(2) ?? null,
    ltvRatio: ltvRatio !== null ? parseFloat(ltvRatio.toFixed(2)) : null,
    healthStatus,
  });
}
