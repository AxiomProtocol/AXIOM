/**
 * POST /api/credit/open
 *
 * Opens a new crypto-backed credit line for a participant.
 * SIWE-authenticated. Validates collateral, calls BitGo to generate
 * a deposit address, stores the record in pending_collateral state.
 *
 * Returns the deposit address and credit limit.
 *
 * SECURITY: If BitGo is not configured, the request fails closed with a 503.
 * Mock or placeholder deposit addresses are never returned to avoid fund loss.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { cryptoCreditLines } from '../../../shared/cryptoCreditSchema';
import { getSiweWallet } from '../../../lib/server/banking/siweHelper';
import { eq, and, inArray } from 'drizzle-orm';

const LTV_RATIOS: Record<string, number> = {
  BTC: 0.50,
  ETH: 0.50,
  AXUSD: 0.80,
};

const INTEREST_RATE_PCT = 8.0;

async function getLivePrice(asset: string): Promise<number | null> {
  if (asset === 'AXUSD') return 1.0;
  const coinIds: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum' };
  const coinId = coinIds[asset];
  if (!coinId) return null;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = await res.json() as Record<string, { usd?: number }>;
    return data[coinId]?.usd ?? null;
  } catch {
    return null;
  }
}

async function getBitGoDepositAddress(asset: string, walletId: string): Promise<{
  address: string;
  bitgoAddressId: string;
  bitgoWalletId: string;
}> {
  const bitgoToken = process.env.BITGO_ACCESS_TOKEN;
  const bitgoEnv = process.env.BITGO_ENV === 'prod' ? 'www' : 'app';

  if (!bitgoToken) {
    throw new Error('BITGO_ACCESS_TOKEN is not configured — cannot generate deposit address');
  }
  if (!walletId) {
    throw new Error(`BitGo wallet ID for ${asset} is not configured`);
  }

  const coin = asset === 'BTC' ? 'btc' : 'eth';
  const url = `https://${bitgoEnv}.bitgo.com/api/v2/${coin}/wallet/${walletId}/address`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bitgoToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ label: `Credit Line Collateral — ${Date.now()}` }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(`BitGo address generation failed: ${err?.error ?? res.status}`);
  }

  const data = await res.json() as { address: string; id: string };
  return {
    address: data.address,
    bitgoAddressId: data.id,
    bitgoWalletId: walletId,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });

  const { walletAddress, collateralAsset, collateralAmount } = req.body as {
    walletAddress?: string;
    collateralAsset?: string;
    collateralAmount?: string;
  };

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress is required' });
  }

  const wallet = walletAddress.toLowerCase();
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only open a credit line for your own wallet' });
  }

  if (!collateralAsset || !['BTC', 'ETH', 'AXUSD'].includes(collateralAsset)) {
    return res.status(400).json({ error: 'collateralAsset must be BTC, ETH, or AXUSD' });
  }

  const amount = parseFloat(collateralAmount ?? '0');
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'collateralAmount must be a positive number' });
  }

  const existingLines = await db
    .select()
    .from(cryptoCreditLines)
    .where(
      and(
        eq(cryptoCreditLines.participantWallet, wallet),
        inArray(cryptoCreditLines.status, ['pending_collateral', 'active', 'warning', 'flagged']),
      ),
    )
    .limit(1);

  if (existingLines.length > 0) {
    return res.status(409).json({
      error: 'You already have an active or pending credit line',
      existingLineId: existingLines[0].id,
      status: existingLines[0].status,
    });
  }

  // Each asset uses a dedicated BitGo wallet:
  // BTC → BITGO_BTC_WALLET_ID (native BTC wallet)
  // ETH → BITGO_ETH_WALLET_ID (native ETH wallet)
  // AXUSD → BITGO_AXUSD_WALLET_ID (ERC-20 token wallet on ETH mainnet)
  const bitgoWalletId =
    collateralAsset === 'BTC'
      ? (process.env.BITGO_BTC_WALLET_ID ?? '')
      : collateralAsset === 'ETH'
        ? (process.env.BITGO_ETH_WALLET_ID ?? '')
        : (process.env.BITGO_AXUSD_WALLET_ID ?? '');

  let depositInfo: { address: string; bitgoAddressId: string; bitgoWalletId: string };
  try {
    depositInfo = await getBitGoDepositAddress(collateralAsset, bitgoWalletId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[credit/open] BitGo error:', msg);
    return res.status(503).json({
      error: 'Collateral deposit address could not be generated. Please try again later or contact support.',
      detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
    });
  }

  const ltvRatio = LTV_RATIOS[collateralAsset] ?? 0.50;

  // Fetch live price to compute a meaningful USD credit limit estimate at open time.
  // AXUSD is always $1.00. For BTC/ETH, null price means we store null and recompute at activation.
  const priceUsd = await getLivePrice(collateralAsset);
  const collateralUsdValue = priceUsd !== null ? amount * priceUsd : null;
  const creditLimitUsd = collateralUsdValue !== null
    ? (collateralUsdValue * ltvRatio).toFixed(2)
    : null;

  const [line] = await db
    .insert(cryptoCreditLines)
    .values({
      participantWallet: wallet,
      collateralAsset: collateralAsset as 'BTC' | 'ETH' | 'AXUSD',
      collateralAmountRaw: amount.toString(),
      creditLimitUsd,
      drawnAmountUsd: '0',
      interestRatePct: INTEREST_RATE_PCT.toString(),
      status: 'pending_collateral',
      bitgoWalletId: depositInfo.bitgoWalletId,
      bitgoAddressId: depositInfo.bitgoAddressId,
      depositAddress: depositInfo.address,
    })
    .returning();

  return res.status(201).json({
    creditLineId: line.id,
    depositAddress: depositInfo.address,
    collateralAsset,
    collateralAmount: amount,
    priceUsd: priceUsd?.toFixed(2) ?? null,
    collateralUsdValue: collateralUsdValue?.toFixed(2) ?? null,
    creditLimitUsd,
    ltvRatio: ltvRatio * 100,
    interestRatePct: INTEREST_RATE_PCT,
    status: 'pending_collateral',
    message: `Send ${amount} ${collateralAsset} to the deposit address to activate your credit line.`,
  });
}
