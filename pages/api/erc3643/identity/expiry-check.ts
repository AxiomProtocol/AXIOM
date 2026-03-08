import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { t3Claims, t3Identities, CLAIM_VALIDITY_DAYS, CLAIM_REFRESH_WARNING_DAYS } from '../../../../shared/erc3643Schema';
import { eq, and } from 'drizzle-orm';

const TOPIC_NAMES: Record<number, string> = {
  1: 'KYC_VERIFIED',
  2: 'ACCREDITED_INVESTOR',
  3: 'SANCTIONS_CLEAR',
};

function getExpiryStatus(expiresAt: Date | null): 'valid' | 'expiring_soon' | 'expired' {
  if (!expiresAt) return 'valid';
  const now = new Date();
  if (expiresAt <= now) return 'expired';
  const warningDate = new Date(now.getTime() + CLAIM_REFRESH_WARNING_DAYS * 24 * 3600 * 1000);
  if (expiresAt <= warningDate) return 'expiring_soon';
  return 'valid';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const wallet = req.query.wallet as string | undefined;

  try {
    let query;
    if (wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      query = db.select({
        claim: t3Claims,
        wallet: t3Identities.wallet,
      })
        .from(t3Claims)
        .innerJoin(t3Identities, eq(t3Claims.identityId, t3Identities.id))
        .where(
          and(
            eq(t3Identities.wallet, wallet.toLowerCase()),
            eq(t3Claims.revoked, false)
          )
        );
    } else {
      query = db.select({
        claim: t3Claims,
        wallet: t3Identities.wallet,
      })
        .from(t3Claims)
        .innerJoin(t3Identities, eq(t3Claims.identityId, t3Identities.id))
        .where(eq(t3Claims.revoked, false));
    }

    const results = await query;

    const claims = results.map(r => {
      const status = getExpiryStatus(r.claim.expiresAt);
      return {
        id: r.claim.id,
        wallet: r.wallet,
        topic: r.claim.topic,
        topicName: TOPIC_NAMES[r.claim.topic] || `TOPIC_${r.claim.topic}`,
        validFrom: r.claim.validFrom,
        expiresAt: r.claim.expiresAt,
        refreshRequiredBy: r.claim.refreshRequiredBy,
        validityDays: CLAIM_VALIDITY_DAYS[r.claim.topic] || 365,
        expiryStatus: status,
        daysRemaining: r.claim.expiresAt
          ? Math.max(0, Math.ceil((r.claim.expiresAt.getTime() - Date.now()) / (24 * 3600 * 1000)))
          : null,
      };
    });

    const expiring = claims.filter(c => c.expiryStatus === 'expiring_soon');
    const expired = claims.filter(c => c.expiryStatus === 'expired');
    const valid = claims.filter(c => c.expiryStatus === 'valid');

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total: claims.length,
          valid: valid.length,
          expiringSoon: expiring.length,
          expired: expired.length,
        },
        claims,
        expiring,
        expired,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
