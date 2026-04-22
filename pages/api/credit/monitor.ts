/**
 * GET /api/credit/monitor
 *
 * Cron-compatible endpoint. Performs two jobs:
 *
 * 1. Collateral detection: For pending_collateral lines, polls BitGo
 *    wallet for confirmed deposits. On confirmation, activates the credit line
 *    using asset-specific LTV (BTC/ETH: 50%, AXUSD: 80%).
 *
 * 2. Health check: For all active/warning lines, fetches current collateral
 *    USD value via CoinGecko, updates LTV, sends email warnings at 70% LTV
 *    (to participant email from increaseParticipants), flags account at 85% LTV
 *    and notifies ops.
 *
 * Protected by CRON_SECRET or admin header.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { cryptoCreditLines } from '../../../shared/cryptoCreditSchema';
import { increaseParticipants } from '../../../shared/increaseParticipantSchema';
import { eq, inArray } from 'drizzle-orm';

const LTV_BY_ASSET: Record<string, number> = {
  BTC: 0.50,
  ETH: 0.50,
  AXUSD: 0.80,
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OPS_EMAIL = process.env.OPS_EMAIL ?? 'ops@axiomprotocol.io';
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'noreply@axiomprotocol.io';

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('[credit/monitor] RESEND_API_KEY not set — email not sent');
    return;
  }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}

async function getParticipantEmail(walletAddress: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ email: increaseParticipants.email })
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, walletAddress))
      .limit(1);
    return rows[0]?.email ?? null;
  } catch {
    return null;
  }
}

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
    return (data as Record<string, { usd?: number }>)[coinId]?.usd ?? null;
  } catch {
    return null;
  }
}

async function checkBitGoDeposit(
  walletId: string,
  depositAddress: string,
  asset: string,
): Promise<{ confirmed: boolean; amount?: number }> {
  const bitgoToken = process.env.BITGO_ACCESS_TOKEN;
  const bitgoEnv = process.env.BITGO_ENV === 'prod' ? 'www' : 'app';

  if (!bitgoToken || !walletId) {
    return { confirmed: false };
  }

  // BTC uses native BTC wallet; ETH and AXUSD both use eth-based wallets.
  // AXUSD is an ERC-20 token — BitGo token wallets use the eth coin family.
  // The dedicated BITGO_AXUSD_WALLET_ID wallet contains only AXUSD token transfers.
  const coin = asset === 'BTC' ? 'btc' : 'eth';
  try {
    const res = await fetch(
      `https://${bitgoEnv}.bitgo.com/api/v2/${coin}/wallet/${walletId}/transfer?address=${depositAddress}&state=confirmed&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${bitgoToken}`,
          Accept: 'application/json',
        },
      },
    );
    if (!res.ok) return { confirmed: false };
    const data = await res.json() as { transfers?: Array<{ valueString?: string; usdValue?: number }> };
    const transfers = data?.transfers ?? [];
    if (transfers.length > 0) {
      if (asset === 'AXUSD') {
        // For ERC-20 token transfers (AXUSD), use usdValue if available (already denominated)
        // or sum token amounts from valueString (18 decimal places for ERC-20)
        const totalValue = transfers.reduce(
          (sum, t) => sum + parseInt(t.valueString ?? '0'),
          0,
        );
        const amount = totalValue / 1e18;
        return { confirmed: true, amount };
      }
      const totalValue = transfers.reduce(
        (sum, t) => sum + parseInt(t.valueString ?? '0'),
        0,
      );
      const amount = asset === 'BTC' ? totalValue / 1e8 : totalValue / 1e18;
      return { confirmed: true, amount };
    }
    return { confirmed: false };
  } catch (err) {
    console.error('[credit/monitor] BitGo check error:', err);
    return { confirmed: false };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const adminHeader = req.headers['x-admin-key'];
  const adminKey = process.env.ADMIN_API_KEY;

  const isAuthorized =
    (cronSecret && req.headers.authorization === `Bearer ${cronSecret}`) ||
    (adminKey && adminHeader === adminKey) ||
    process.env.NODE_ENV === 'development';

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = {
    collateralChecked: 0,
    collateralActivated: 0,
    healthChecked: 0,
    warningsEmailed: 0,
    flagged: 0,
    errors: [] as string[],
  };

  // ─── Phase 1: Check pending collateral deposits ─────────────────────────────
  try {
    const pendingLines = await db
      .select()
      .from(cryptoCreditLines)
      .where(eq(cryptoCreditLines.status, 'pending_collateral'));

    for (const line of pendingLines) {
      result.collateralChecked++;
      if (!line.depositAddress || !line.bitgoWalletId) continue;

      try {
        const deposit = await checkBitGoDeposit(
          line.bitgoWalletId,
          line.depositAddress,
          line.collateralAsset,
        );

        if (deposit.confirmed) {
          const priceUsd = await getCoinGeckoPrice(line.collateralAsset);
          const collateralAmount = deposit.amount ?? parseFloat(line.collateralAmountRaw);
          const collateralUsdValue =
            priceUsd !== null ? (collateralAmount * priceUsd).toFixed(2) : null;

          // Use asset-specific LTV: BTC/ETH 50%, AXUSD 80%
          const ltvRatio = LTV_BY_ASSET[line.collateralAsset] ?? 0.50;
          const creditLimit = priceUsd !== null
            ? (collateralAmount * priceUsd * ltvRatio).toFixed(2)
            : line.creditLimitUsd;

          await db
            .update(cryptoCreditLines)
            .set({
              status: 'active',
              collateralAmountRaw: collateralAmount.toString(),
              collateralUsdValueAtOpen: collateralUsdValue ?? undefined,
              creditLimitUsd: creditLimit ?? undefined,
              openedAt: new Date(),
              lastHealthCheckAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(cryptoCreditLines.id, line.id));

          result.collateralActivated++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Collateral check ${line.id}: ${msg}`);
      }
    }
  } catch (err) {
    result.errors.push(`Phase1 scan: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ─── Phase 2: Health check all active lines ─────────────────────────────────
  try {
    const activeLines = await db
      .select()
      .from(cryptoCreditLines)
      .where(inArray(cryptoCreditLines.status, ['active', 'warning']));

    for (const line of activeLines) {
      result.healthChecked++;
      try {
        const priceUsd = await getCoinGeckoPrice(line.collateralAsset);
        if (priceUsd === null) continue;

        const collateralAmount = parseFloat(line.collateralAmountRaw);
        const collateralValueUsd = collateralAmount * priceUsd;
        const drawnAmountUsd = parseFloat(line.drawnAmountUsd ?? '0');

        if (collateralValueUsd === 0) continue;

        const ltvRatio = (drawnAmountUsd / collateralValueUsd) * 100;

        if (ltvRatio >= 85) {
          await db
            .update(cryptoCreditLines)
            .set({
              status: 'flagged',
              lastHealthCheckAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(cryptoCreditLines.id, line.id));

          result.flagged++;

          await sendEmail(
            OPS_EMAIL,
            `[URGENT] Crypto Credit Line Liquidation Alert — ${line.participantWallet.slice(0, 10)}...`,
            `<p>Credit line <strong>${line.id}</strong> for wallet <strong>${line.participantWallet}</strong> has reached <strong>${ltvRatio.toFixed(1)}% LTV</strong> (threshold: 85%).</p>
            <p><strong>Collateral:</strong> ${line.collateralAmountRaw} ${line.collateralAsset} (~$${collateralValueUsd.toFixed(2)})</p>
            <p><strong>Outstanding:</strong> $${drawnAmountUsd.toFixed(2)}</p>
            <p>This account has been flagged for manual liquidation review.</p>`,
          );
        } else if (ltvRatio >= 70 && line.status !== 'warning') {
          await db
            .update(cryptoCreditLines)
            .set({
              status: 'warning',
              lastHealthCheckAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(cryptoCreditLines.id, line.id));

          result.warningsEmailed++;

          // Resolve participant email from increaseParticipants profile
          const participantEmail = await getParticipantEmail(line.participantWallet);
          if (participantEmail) {
            await sendEmail(
              participantEmail,
              'Action Required: Your Axiom Credit Line Is Approaching Liquidation',
              `<p>Your crypto-backed credit line is at <strong>${ltvRatio.toFixed(1)}% LTV</strong>.</p>
              <p>If your LTV reaches 85%, your account will be flagged for liquidation review.</p>
              <p><strong>Collateral:</strong> ${line.collateralAmountRaw} ${line.collateralAsset} (~$${collateralValueUsd.toFixed(2)})</p>
              <p><strong>Outstanding balance:</strong> $${drawnAmountUsd.toFixed(2)}</p>
              <p>To avoid liquidation, please <a href="https://axiomprotocol.io/credit">add collateral or repay part of your balance</a>.</p>`,
            );
          } else {
            console.warn(`[credit/monitor] No email found for wallet ${line.participantWallet} — warning not sent`);
            result.errors.push(`Warning email skipped for ${line.id}: no participant email on file`);
          }
        } else {
          await db
            .update(cryptoCreditLines)
            .set({
              lastHealthCheckAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(cryptoCreditLines.id, line.id));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Health check ${line.id}: ${msg}`);
      }
    }
  } catch (err) {
    result.errors.push(`Phase2 scan: ${err instanceof Error ? err.message : String(err)}`);
  }

  return res.status(200).json(result);
}
