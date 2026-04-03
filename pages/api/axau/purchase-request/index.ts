import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { axauPurchaseRequests } from '../../../../shared/axauSchema';
import { eq, desc } from 'drizzle-orm';
import { sendAxauPurchaseRequestConfirmation } from '../../../../lib/email/resend';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
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
