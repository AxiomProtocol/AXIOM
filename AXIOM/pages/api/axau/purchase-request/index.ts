import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { axauPurchaseRequests } from '../../../../shared/axauSchema';
import { t3KycSubmissions } from '../../../../shared/erc3643Schema';
import { eq, desc, and, count, inArray } from 'drizzle-orm';
import { sendAxauPurchaseRequestConfirmation } from '../../../../lib/email/resend';
import { safeCompare } from '../../../../lib/solvency/ame/utils';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const adminKey = req.headers['x-admin-key'];
    const isAdmin  = ADMIN_KEY && typeof adminKey === 'string' && safeCompare(adminKey, ADMIN_KEY);

    // Admin: return all orders
    if (isAdmin) {
      try {
        const rows = await db
          .select()
          .from(axauPurchaseRequests)
          .orderBy(desc(axauPurchaseRequests.createdAt));
        return res.status(200).json({ success: true, data: rows });
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Public: wallet-scoped query
    const { wallet } = req.query;
    if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    try {
      const rows = await db
        .select()
        .from(axauPurchaseRequests)
        .where(eq(axauPurchaseRequests.walletAddress, wallet.toLowerCase()))
        .orderBy(desc(axauPurchaseRequests.createdAt));
      return res.status(200).json({ success: true, data: rows });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, email, axusdAmount, axauQuoted, xauUsdPrice } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }
  const axusdNum = parseFloat(axusdAmount);
  if (isNaN(axusdNum) || axusdNum <= 0) {
    return res.status(400).json({ error: 'axusdAmount must be a positive number' });
  }
  const axauNum = parseFloat(axauQuoted);
  if (isNaN(axauNum) || axauNum <= 0) {
    return res.status(400).json({ error: 'axauQuoted must be a positive number' });
  }

  // FIX 6 / R-2: Identity gate — wallet must be identity-verified (status: bridged)
  // R-2 hardening: DB failure returns HTTP 503 instead of proceeding permissively
  try {
    const [kycRow] = await db
      .select({ id: t3KycSubmissions.id, status: t3KycSubmissions.status })
      .from(t3KycSubmissions)
      .where(
        and(
          eq(t3KycSubmissions.walletAddress, walletAddress.toLowerCase()),
          eq(t3KycSubmissions.status, 'bridged'),
        ),
      )
      .limit(1);

    if (!kycRow) {
      return res.status(403).json({
        error: 'Wallet is not identity-verified. An ERC-3643 identity credential is required to submit a purchase request. Apply for early access first.',
        code: 'IDENTITY_NOT_VERIFIED',
      });
    }
  } catch (identityErr: unknown) {
    // R-2: On DB failure, reject the request — do not bypass the identity gate
    console.error('[purchase-request] Identity check DB error:', identityErr instanceof Error ? identityErr.message : identityErr);
    return res.status(503).json({
      error: 'Identity verification service temporarily unavailable. Please try again in a moment.',
      code: 'IDENTITY_SERVICE_UNAVAILABLE',
    });
  }

  // R-6b: Per-wallet pending-order cap — max 5 pending or processing orders per wallet
  try {
    const [pendingRow] = await db
      .select({ total: count() })
      .from(axauPurchaseRequests)
      .where(
        and(
          eq(axauPurchaseRequests.walletAddress, walletAddress.toLowerCase()),
          inArray(axauPurchaseRequests.status, ['pending', 'processing']),
        ),
      );
    const pendingCount = Number(pendingRow?.total ?? 0);
    if (pendingCount >= 5) {
      return res.status(429).json({
        error: 'You have 5 or more pending purchase requests. Please wait for existing requests to be processed before submitting new ones.',
        code: 'PENDING_LIMIT_REACHED',
        pendingCount,
      });
    }
  } catch (capErr: unknown) {
    console.error('[purchase-request] Pending cap check failed:', capErr instanceof Error ? capErr.message : capErr);
  }

  try {
    const [inserted] = await db
      .insert(axauPurchaseRequests)
      .values({
        walletAddress: walletAddress.toLowerCase(),
        email: email || null,
        axusdAmount: axusdNum.toFixed(6),
        axauQuoted: axauNum.toFixed(6),
        xauUsdPrice: xauUsdPrice ? parseFloat(xauUsdPrice).toFixed(2) : null,
        status: 'pending',
      })
      .returning();

    if (email && typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendAxauPurchaseRequestConfirmation({
        to: email,
        walletAddress: walletAddress.toLowerCase(),
        requestId: inserted.id,
        axusdAmount: axusdNum.toFixed(2),
        axauQuoted: axauNum.toFixed(6),
        xauUsdPrice: xauUsdPrice || null,
      }).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      data: {
        id: inserted.id,
        walletAddress: inserted.walletAddress,
        axusdAmount: inserted.axusdAmount,
        axauQuoted: inserted.axauQuoted,
        status: inserted.status,
        createdAt: inserted.createdAt,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
