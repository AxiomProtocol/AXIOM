import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { propertyReports } from '../../../shared/propertySchema';
import { and, eq, ne } from 'drizzle-orm';
import { generateReport, TIER_CONFIG } from '../../../server/services/property/pipeline';
import { verifyOnchainPayment } from '../../../lib/property/onchainPayment';

/**
 * Task #230 — buyers POST the AXUSD transfer hash here. We verify on-chain,
 * mark the report paid, and trigger generation. Replaces the Stripe webhook
 * + checkout-status polling pair.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { reportId, txHash } = req.body ?? {};
  if (!reportId || typeof reportId !== 'string') {
    return res.status(400).json({ error: 'reportId is required' });
  }
  if (!txHash || typeof txHash !== 'string') {
    return res.status(400).json({ error: 'txHash is required' });
  }

  try {
    const [report] = await db.select().from(propertyReports)
      .where(eq(propertyReports.id, reportId)).limit(1);

    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.tier === 'free') {
      return res.status(400).json({ error: 'Free reports do not require payment.' });
    }

    // Idempotent: if we've already moved past pending for this report, just
    // return the current state.
    if (report.status !== 'pending') {
      return res.status(200).json({ reportId: report.id, status: report.status });
    }

    // Reject reuse of the same tx hash for a different report.
    const reused = await db.select({ id: propertyReports.id }).from(propertyReports)
      .where(and(
        eq(propertyReports.paymentTxHash, txHash.toLowerCase()),
        ne(propertyReports.id, report.id),
      )).limit(1);
    if (reused.length > 0) {
      return res.status(409).json({ error: 'This transaction has already been used to pay for another report.' });
    }

    const cfg = TIER_CONFIG[report.tier as 'base' | 'premium'];
    const verification = await verifyOnchainPayment(txHash, cfg.priceCents);
    if (!verification.ok) {
      return res.status(402).json({ error: verification.reason });
    }

    // Optional sender check — if a buyer wallet was recorded on intent creation,
    // require the transfer to come from it. Soft-match (case-insensitive).
    if (report.buyerWallet
        && verification.from
        && report.buyerWallet.toLowerCase() !== verification.from.toLowerCase()) {
      return res.status(403).json({
        error: `Payment must be sent from the wallet used to create the report (${report.buyerWallet}).`,
      });
    }

    await db.update(propertyReports).set({
      status: 'paid',
      paymentTxHash: txHash.toLowerCase(),
      paymentChainId: verification.chainId,
      paymentToken: verification.token,
      paymentFromAddress: verification.from.toLowerCase(),
      paymentConfirmedAt: new Date(),
      buyerWallet: report.buyerWallet || verification.from.toLowerCase(),
      updatedAt: new Date(),
    }).where(eq(propertyReports.id, report.id));

    try {
      await generateReport(report.id);
      return res.status(200).json({ reportId: report.id, status: 'ready' });
    } catch (genErr: any) {
      console.error('Property report generation failed:', genErr.message);
      return res.status(200).json({ reportId: report.id, status: 'failed' });
    }
  } catch (err: any) {
    console.error('Property confirm-payment error:', err.message);
    return res.status(500).json({ error: 'Could not confirm payment.' });
  }
}
