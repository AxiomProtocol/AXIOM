import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { t3Claims, t3Identities, CLAIM_VALIDITY_DAYS, CLAIM_REFRESH_WARNING_DAYS } from '../../../../shared/erc3643Schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { claimId } = req.body;

  if (!claimId || typeof claimId !== 'string') {
    return res.status(400).json({ error: 'claimId required' });
  }

  try {
    const [existing] = await db.select()
      .from(t3Claims)
      .where(eq(t3Claims.id, claimId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (existing.revoked) {
      return res.status(400).json({ error: 'Cannot renew a revoked claim' });
    }

    const [identity] = await db.select()
      .from(t3Identities)
      .where(eq(t3Identities.id, existing.identityId))
      .limit(1);

    if (!identity) {
      return res.status(404).json({ error: 'Identity not found for this claim' });
    }

    await db.update(t3Claims)
      .set({ revoked: true })
      .where(eq(t3Claims.id, claimId));

    const validityDays = CLAIM_VALIDITY_DAYS[existing.topic] || 365;
    const validityMs = validityDays * 24 * 3600 * 1000;
    const refreshWarningMs = CLAIM_REFRESH_WARNING_DAYS * 24 * 3600 * 1000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + validityMs);
    const refreshRequiredBy = new Date(expiresAt.getTime() - refreshWarningMs);

    const [newClaim] = await db.insert(t3Claims).values({
      identityId: existing.identityId,
      topic: existing.topic,
      issuerAddress: existing.issuerAddress,
      claimData: existing.claimData,
      signature: existing.signature,
      validFrom: now,
      validUntil: expiresAt,
      expiresAt,
      refreshRequiredBy,
      revoked: false,
    }).returning();

    return res.status(200).json({
      success: true,
      data: {
        oldClaimId: claimId,
        newClaimId: newClaim.id,
        topic: existing.topic,
        wallet: identity.wallet,
        expiresAt,
        refreshRequiredBy,
        validityDays,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
