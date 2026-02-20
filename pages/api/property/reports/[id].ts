import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { propertyReports } from '../../../../shared/propertySchema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, email, wallet } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Report ID required' });

  try {
    const [report] = await db.select().from(propertyReports).where(eq(propertyReports.id, id)).limit(1);

    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (report.status !== 'ready') {
      return res.status(200).json({
        id: report.id,
        status: report.status,
        tier: report.tier,
        addressRaw: report.addressRaw,
        errorMessage: report.errorMessage,
      });
    }

    if (report.tier !== 'free') {
      const reqEmail = email as string;
      const reqWallet = wallet as string;
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';

      const isOwner =
        (report.buyerEmail && reqEmail && report.buyerEmail.toLowerCase() === reqEmail.toLowerCase()) ||
        (report.buyerWallet && reqWallet && report.buyerWallet.toLowerCase() === reqWallet.toLowerCase()) ||
        (report.ipAddress && report.ipAddress === ip);

      if (!isOwner) {
        return res.status(200).json({
          id: report.id,
          status: report.status,
          tier: report.tier,
          addressRaw: report.addressRaw,
          valueMid: report.valueMid,
          confidenceScore: report.confidenceScore,
          dealGrade: report.dealGrade,
          accessRestricted: true,
          message: 'Full report requires ownership verification. Provide your email or wallet address.',
        });
      }
    }

    res.setHeader('Cache-Control', 'no-cache, no-store');
    return res.status(200).json(report);
  } catch (err: any) {
    console.error('Report fetch error:', err.message);
    return res.status(500).json({ error: 'Could not fetch report' });
  }
}
