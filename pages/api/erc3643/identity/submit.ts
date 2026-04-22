import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { t3KycSubmissions, t3ComplianceOpsLog } from '../../../../shared/erc3643Schema';
import { eq, and, count, or, inArray } from 'drizzle-orm';
import { sendAxauEarlyAccessConfirmation } from '../../../../lib/email/resend';
import { AXAU_EARLY_ACCESS_CAP } from '../../../../lib/axauEarlyAccess';

const VALID_DOC_TYPES = ['passport', 'drivers_license', 'national_id', 'residence_permit'];
const ACTIVE_STATUSES = ['submitted', 'approved', 'activated'] as const;

// R-6: Simple in-memory IP rate limiter — max 3 POST submissions per IP per hour
// Resets on server restart; sufficient for a 100-slot gated early access program
const ipRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (ipRateLimitMap.get(ip) ?? []).filter(t => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return false; // rate limited
  }
  ipRateLimitMap.set(ip, [...timestamps, now]);
  return true; // allowed
}

const VALID_COUNTRIES = new Set([
  'US','CA','GB','AU','DE','FR','NL','CH','SG','AE',
  'NG','GH','KE','ZA','JM','TT','BB','BS','BM','BR',
  'MX','JP','KR','IN','OTHER',
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const wallet = req.query.wallet as string;
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    try {
      const submissions = await db.select({
        id: t3KycSubmissions.id,
        walletAddress: t3KycSubmissions.walletAddress,
        status: t3KycSubmissions.status,
        country: t3KycSubmissions.country,
        createdAt: t3KycSubmissions.createdAt,
      })
        .from(t3KycSubmissions)
        .where(eq(t3KycSubmissions.walletAddress, wallet.toLowerCase()))
        .orderBy(t3KycSubmissions.createdAt);
      return res.status(200).json({ success: true, data: submissions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // R-6: IP rate limit — max 3 submissions per IP per hour
  const clientIp = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
  if (!checkIpRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Too many applications from this network. Please wait before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

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

  const countryUpper = (country || 'US').toUpperCase().slice(0, 5);
  if (!VALID_COUNTRIES.has(countryUpper)) {
    return res.status(400).json({ error: 'Invalid country code. Please select a supported jurisdiction.' });
  }

  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) {
    return res.status(400).json({ error: 'Invalid date of birth.' });
  }
  const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 18) {
    return res.status(400).json({ error: 'Must be at least 18 years old' });
  }

  try {
    const [capRow] = await db
      .select({ total: count() })
      .from(t3KycSubmissions)
      .where(inArray(t3KycSubmissions.status, [...ACTIVE_STATUSES]));
    const activeCount = Number(capRow?.total ?? 0);
    if (activeCount >= AXAU_EARLY_ACCESS_CAP) {
      return res.status(409).json({
        error: 'Early Access is full — 100 applications have been received. No new submissions are being accepted at this time.',
        isFull: true,
      });
    }

    try {
      const { complianceService } = await import('../../../../lib/circle/compositeComplianceService');
      const screening = await complianceService.screen(walletAddress, 'ARB');

      // FIX 7: Log Circle screening result to t3ComplianceOpsLog
      await db.insert(t3ComplianceOpsLog).values({
        wallet: walletAddress.toLowerCase(),
        action: 'circle_screening',
        result: screening.result.toLowerCase(),
        notes: `Circle compliance screening result: ${screening.result}. Risk score: ${screening.riskScore}. Categories: ${screening.riskCategories.join(', ') || 'none'}`,
        metadata: {
          riskScore: screening.riskScore,
          riskCategories: screening.riskCategories,
          source: screening.source,
          screenedAt: screening.screenedAt,
          chain: 'ARB',
        },
      }).catch((logErr: unknown) => {
        console.error('[erc3643/submit] Failed to write compliance ops log:', logErr instanceof Error ? logErr.message : logErr);
      });

      if (screening.result === 'DENIED') {
        console.warn(`[erc3643/submit] Circle screening DENIED wallet=${walletAddress} categories=${screening.riskCategories.join(',')}`);
        return res.status(403).json({
          error: 'This wallet address has been flagged by our compliance screening and cannot be credentialed at this time.',
          code: 'COMPLIANCE_DENIED',
        });
      }
    } catch (screenErr: any) {
      console.error('[erc3643/submit] compliance screening error (non-blocking):', screenErr.message);
      // FIX 7: Log screening error to t3ComplianceOpsLog
      await db.insert(t3ComplianceOpsLog).values({
        wallet: walletAddress.toLowerCase(),
        action: 'circle_screening',
        result: 'error',
        notes: `Circle compliance screening failed (non-blocking): ${screenErr.message}`,
        metadata: { error: screenErr.message, chain: 'ARB' },
      }).catch(() => {});
    }

    const existing = await db.select()
      .from(t3KycSubmissions)
      .where(
        and(
          eq(t3KycSubmissions.walletAddress, walletAddress.toLowerCase()),
          or(
            eq(t3KycSubmissions.status, 'submitted'),
            eq(t3KycSubmissions.status, 'approved'),
            eq(t3KycSubmissions.status, 'activated')
          )
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'This wallet has already submitted an early access application' });
    }

    const normalizedEmail =
      email && typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? email.toLowerCase().trim()
        : null;

    const [inserted] = await db.insert(t3KycSubmissions).values({
      walletAddress: walletAddress.toLowerCase(),
      email: normalizedEmail,
      fullName: fullName.trim(),
      dateOfBirth,
      country: countryUpper,
      documentType,
      status: 'submitted',
    }).returning();

    let emailQueued = false;
    if (normalizedEmail) {
      try {
        await sendAxauEarlyAccessConfirmation({
          to: normalizedEmail,
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
