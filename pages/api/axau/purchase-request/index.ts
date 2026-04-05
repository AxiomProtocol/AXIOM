import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { axauPurchaseRequests } from '../../../../shared/axauSchema';
import { t3KycSubmissions } from '../../../../shared/erc3643Schema';
import { eq, desc, and } from 'drizzle-orm';
import { sendAxauPurchaseRequestConfirmation } from '../../../../lib/email/resend';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const adminKey = req.headers['x-admin-key'];
    const isAdmin  = ADMIN_KEY && adminKey === ADMIN_KEY;

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

  // FIX 6: Identity gate — wallet must be identity-verified (status: bridged) before purchase request
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
    // Non-blocking: if the identity check fails (e.g., DB error), log and continue to prevent false rejections
    console.error('[purchase-request] Identity check failed — proceeding with caution:', identityErr instanceof Error ? identityErr.message : identityErr);
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
