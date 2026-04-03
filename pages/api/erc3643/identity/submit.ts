import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { t3KycSubmissions } from '../../../../shared/erc3643Schema';
import { eq, and, count } from 'drizzle-orm';
import { sendAxauEarlyAccessConfirmation } from '../../../../lib/email/resend';
import { AXAU_EARLY_ACCESS_CAP } from '../../../../lib/axauEarlyAccess';

const VALID_DOC_TYPES = ['passport', 'drivers_license', 'national_id', 'residence_permit'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const wallet = req.query.wallet as string;
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    try {
      const submissions = await db.select()
        .from(t3KycSubmissions)
        .where(eq(t3KycSubmissions.walletAddress, wallet.toLowerCase()))
        .orderBy(t3KycSubmissions.createdAt);
      return res.status(200).json({ success: true, data: submissions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, fullName, dateOfBirth, country, documentType, email } = req.body;

  if (!walletAddress || typeof walletAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required (0x...)' });
  }
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Full name required (minimum 2 characters)' });
  }
  if (!dateOfBirth || typeof dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return res.status(400).json({ error: 'Date of birth required (YYYY-MM-DD format)' });
  }
  if (!documentType || !VALID_DOC_TYPES.includes(documentType)) {
    return res.status(400).json({ error: `Document type required. Valid: ${VALID_DOC_TYPES.join(', ')}` });
  }

  const dob = new Date(dateOfBirth);
  const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 18) {
    return res.status(400).json({ error: 'Must be at least 18 years old' });
  }

  try {
    const [capRow] = await db
      .select({ total: count() })
      .from(t3KycSubmissions)
      .where(eq(t3KycSubmissions.status, 'approved'));
    const approvedCount = Number(capRow?.total ?? 0);
    if (approvedCount >= AXAU_EARLY_ACCESS_CAP) {
      return res.status(409).json({
        error: 'Early Access is full — 100 participants have been approved. No new submissions are being accepted at this time.',
        isFull: true,
      });
    }

    const existing = await db.select()
      .from(t3KycSubmissions)
      .where(
        and(
          eq(t3KycSubmissions.walletAddress, walletAddress.toLowerCase()),
          eq(t3KycSubmissions.status, 'submitted')
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'A pending KYC submission already exists for this wallet' });
    }

    const [inserted] = await db.insert(t3KycSubmissions).values({
      walletAddress: walletAddress.toLowerCase(),
      fullName: fullName.trim(),
      dateOfBirth,
      country: (country || 'US').toUpperCase().slice(0, 3),
      documentType,
      status: 'submitted',
    }).returning();

    let emailQueued = false;
    const emailValid = email && typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (emailValid) {
      try {
        await sendAxauEarlyAccessConfirmation({
          to: email,
          fullName: fullName.trim(),
          walletAddress: walletAddress.toLowerCase(),
          submissionId: inserted.id,
        });
        emailQueued = true;
      } catch {
        emailQueued = false;
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        id: inserted.id,
        walletAddress: inserted.walletAddress,
        status: inserted.status,
        createdAt: inserted.createdAt,
        emailQueued,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
